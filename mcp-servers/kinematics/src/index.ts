/**
 * MCP Server: Kinematics
 *
 * Provides tools for TDCR (Tendon-Driven Continuum Robot) kinematics:
 * - Forward kinematics (configuration → pose)
 * - Inverse kinematics (pose → configuration)
 * - Tendon length mapping (curvature → tendon displacements)
 * - Workspace analysis
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "kinematics-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "forward_kinematics",
        description:
          "Compute end-effector pose from curvature parameters (κ, φ, s)",
        inputSchema: {
          type: "object",
          properties: {
            kappa: {
              type: "number",
              description: "Curvature in 1/m",
            },
            phi: {
              type: "number",
              description: "Bending plane angle in radians",
            },
            s: {
              type: "number",
              description: "Arc length in meters",
            },
          },
          required: ["kappa", "phi", "s"],
        },
      },
      {
        name: "inverse_kinematics",
        description:
          "Compute curvature parameters to reach desired tip position",
        inputSchema: {
          type: "object",
          properties: {
            target_x: {
              type: "number",
              description: "Target X position in meters",
            },
            target_y: {
              type: "number",
              description: "Target Y position in meters",
            },
            target_z: {
              type: "number",
              description: "Target Z position in meters",
            },
            s: {
              type: "number",
              description: "Arc length (robot length) in meters",
            },
          },
          required: ["target_x", "target_y", "target_z", "s"],
        },
      },
      {
        name: "tendon_mapping",
        description:
          "Convert curvature to tendon length changes for 3-tendon system",
        inputSchema: {
          type: "object",
          properties: {
            kappa: {
              type: "number",
              description: "Curvature in 1/m",
            },
            phi: {
              type: "number",
              description: "Bending plane angle in radians",
            },
            s: {
              type: "number",
              description: "Arc length in meters",
            },
            tendon_radius: {
              type: "number",
              description: "Distance from backbone to tendons in meters",
            },
          },
          required: ["kappa", "phi", "s", "tendon_radius"],
        },
      },
      {
        name: "workspace_analysis",
        description: "Analyze reachable workspace for given parameters",
        inputSchema: {
          type: "object",
          properties: {
            s: {
              type: "number",
              description: "Arc length in meters",
            },
            kappa_max: {
              type: "number",
              description: "Maximum curvature in 1/m",
            },
            resolution: {
              type: "integer",
              description: "Number of sample points per dimension",
              default: 20,
            },
          },
          required: ["s", "kappa_max"],
        },
      },
    ],
  };
});

// Tool implementations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "forward_kinematics": {
      const { kappa, phi, s } = args as {
        kappa: number;
        phi: number;
        s: number;
      };

      // PCC forward kinematics
      let position: [number, number, number];
      let rotation: number[][];

      if (Math.abs(kappa) < 1e-6) {
        // Straight segment
        position = [0, 0, s];
        rotation = [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ];
      } else {
        const c_ks = Math.cos(kappa * s);
        const s_ks = Math.sin(kappa * s);
        const c_p = Math.cos(phi);
        const s_p = Math.sin(phi);

        position = [
          (c_p * (1 - c_ks)) / kappa,
          (s_p * (1 - c_ks)) / kappa,
          s_ks / kappa,
        ];

        // Simplified rotation (full matrix in production)
        rotation = [
          [c_p * c_p * (c_ks - 1) + 1, s_p * c_p * (c_ks - 1), c_p * s_ks],
          [s_p * c_p * (c_ks - 1), c_p * c_p * (1 - c_ks) + c_ks, s_p * s_ks],
          [-c_p * s_ks, -s_p * s_ks, c_ks],
        ];
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                position,
                rotation,
                bend_angle_deg: ((kappa * s * 180) / Math.PI).toFixed(2),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "tendon_mapping": {
      const { kappa, phi, s, tendon_radius } = args as {
        kappa: number;
        phi: number;
        s: number;
        tendon_radius: number;
      };

      // 3 tendons at 120° intervals
      const tendon_lengths: number[] = [];
      for (let i = 0; i < 3; i++) {
        const theta_i = (i * 2 * Math.PI) / 3;
        const delta_L = -kappa * s * tendon_radius * Math.cos(phi - theta_i);
        tendon_lengths.push(delta_L * 1000); // Convert to mm
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                tendon_0_mm: tendon_lengths[0].toFixed(3),
                tendon_1_mm: tendon_lengths[1].toFixed(3),
                tendon_2_mm: tendon_lengths[2].toFixed(3),
                note: "Negative = tendon shortens (pulls)",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "workspace_analysis": {
      const { s, kappa_max, resolution = 20 } = args as {
        s: number;
        kappa_max: number;
        resolution?: number;
      };

      // Sample workspace
      const points: [number, number, number][] = [];
      for (let ki = 0; ki <= resolution; ki++) {
        const kappa = (ki / resolution) * kappa_max;
        for (let pi = 0; pi < resolution * 2; pi++) {
          const phi = (pi / resolution) * Math.PI;

          if (Math.abs(kappa) < 1e-6) {
            points.push([0, 0, s]);
          } else {
            const c_ks = Math.cos(kappa * s);
            const s_ks = Math.sin(kappa * s);
            const c_p = Math.cos(phi);
            const s_p = Math.sin(phi);

            points.push([
              (c_p * (1 - c_ks)) / kappa,
              (s_p * (1 - c_ks)) / kappa,
              s_ks / kappa,
            ]);
          }
        }
      }

      // Calculate bounds
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      const zs = points.map((p) => p[2]);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                num_points: points.length,
                bounds: {
                  x: [Math.min(...xs) * 1000, Math.max(...xs) * 1000],
                  y: [Math.min(...ys) * 1000, Math.max(...ys) * 1000],
                  z: [Math.min(...zs) * 1000, Math.max(...zs) * 1000],
                },
                max_reach_mm: (s * 1000).toFixed(1),
                max_lateral_deflection_mm: (
                  Math.max(Math.max(...xs), Math.max(...ys)) * 1000
                ).toFixed(1),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Kinematics MCP server running");
}

main().catch(console.error);
