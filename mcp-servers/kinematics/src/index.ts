/**
 * MCP Server: Kinematics
 *
 * Provides tools for TDCR (Tendon-Driven Continuum Robot) kinematics:
 * - Forward kinematics (configuration → pose)
 * - Inverse kinematics (pose → configuration)
 * - Tendon length mapping (curvature → tendon displacements)
 * - Workspace analysis
 *
 * Inputs are validated with zod before any math runs; invalid input and
 * unimplemented tools come back as `isError` results, never as NaN payloads.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "kinematics-server", version: "0.1.0" });

function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

// Shared parameter schemas
const kappa = z.number().finite().describe("Curvature in 1/m");
const phi = z.number().finite().describe("Bending plane angle in radians");
const arcLength = z.number().positive().finite().describe("Arc length in meters");

server.registerTool(
  "forward_kinematics",
  {
    description: "Compute end-effector pose from curvature parameters (κ, φ, s)",
    inputSchema: { kappa, phi, s: arcLength },
  },
  async ({ kappa, phi, s }) => {
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

    return jsonResult({
      position,
      rotation,
      bend_angle_deg: ((kappa * s * 180) / Math.PI).toFixed(2),
    });
  }
);

server.registerTool(
  "inverse_kinematics",
  {
    description: "Compute curvature parameters to reach desired tip position",
    inputSchema: {
      target_x: z.number().finite().describe("Target X position in meters"),
      target_y: z.number().finite().describe("Target Y position in meters"),
      target_z: z.number().finite().describe("Target Z position in meters"),
      s: arcLength.describe("Arc length (robot length) in meters"),
    },
  },
  async () =>
    errorResult(
      "inverse_kinematics is not implemented yet: the single-segment PCC inverse solve has not been written."
    )
);

server.registerTool(
  "tendon_mapping",
  {
    description: "Convert curvature to tendon length changes for 3-tendon system",
    inputSchema: {
      kappa,
      phi,
      s: arcLength,
      tendon_radius: z
        .number()
        .positive()
        .finite()
        .describe("Distance from backbone to tendons in meters"),
    },
  },
  async ({ kappa, phi, s, tendon_radius }) => {
    // 3 tendons at 120° intervals
    const tendon_lengths: number[] = [];
    for (let i = 0; i < 3; i++) {
      const theta_i = (i * 2 * Math.PI) / 3;
      const delta_L = -kappa * s * tendon_radius * Math.cos(phi - theta_i);
      tendon_lengths.push(delta_L * 1000); // Convert to mm
    }

    return jsonResult({
      tendon_0_mm: tendon_lengths[0].toFixed(3),
      tendon_1_mm: tendon_lengths[1].toFixed(3),
      tendon_2_mm: tendon_lengths[2].toFixed(3),
      note: "Negative = tendon shortens (pulls)",
    });
  }
);

server.registerTool(
  "workspace_analysis",
  {
    description: "Analyze reachable workspace for given parameters",
    inputSchema: {
      s: arcLength,
      kappa_max: z.number().positive().finite().describe("Maximum curvature in 1/m"),
      resolution: z
        .number()
        .int()
        .min(1)
        .default(20)
        .describe("Number of sample points per dimension"),
    },
  },
  async ({ s, kappa_max, resolution }) => {
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

    return jsonResult({
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
    });
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Kinematics MCP server running");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
