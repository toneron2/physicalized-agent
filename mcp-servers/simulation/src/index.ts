/**
 * MCP Server: Simulation
 *
 * Provides tools for motion simulation and visualization:
 * - STL generation for 3D printing
 * - Motion simulation
 * - Workspace visualization
 * - BOM calculation
 *
 * Inputs are validated with zod; tools that still need a CAD or rendering
 * backend return `isError` instead of pretending to succeed.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "simulation-server", version: "0.1.0" });

function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

server.registerTool(
  "generate_stl",
  {
    description: "Generate parametric STL file for 3D printing",
    inputSchema: {
      component: z
        .enum(["spacer_disk", "base_platform", "head_shell", "rack_mount"])
        .describe("Component type to generate"),
      parameters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Component-specific parameters"),
      output_path: z.string().optional().describe("Output file path"),
    },
  },
  async ({ component }) =>
    errorResult(
      `generate_stl is not implemented yet: generating ${component} requires an OpenSCAD (or similar) CAD backend.`
    )
);

server.registerTool(
  "analyze_printability",
  {
    description: "Analyze STL for 3D printability issues",
    inputSchema: {
      stl_path: z.string().describe("Path to STL file"),
      layer_height: z
        .number()
        .positive()
        .finite()
        .default(0.2)
        .describe("Target layer height in mm"),
    },
  },
  async () =>
    errorResult("analyze_printability is not implemented yet: no STL mesh analysis exists.")
);

server.registerTool(
  "calculate_bom",
  {
    description: "Calculate bill of materials and cost",
    inputSchema: {
      disk_count: z.number().int().min(1).describe("Number of spacer disks"),
      backbone_length_mm: z
        .number()
        .positive()
        .finite()
        .describe("NiTi backbone length"),
      include_electronics: z
        .boolean()
        .default(true)
        .describe("Include electronics in BOM"),
    },
  },
  async ({ disk_count, backbone_length_mm, include_electronics }) => {
    const bom = {
      mechanical: {
        niti_backbone: {
          description: `NiTi tube 1.4mm OD x ${backbone_length_mm}mm`,
          quantity: 1,
          unit_cost: 15.0,
          total: 15.0,
        },
        spectra_tendon: {
          description: "Spectra fiber (McMaster 9442T4)",
          quantity: 1,
          unit_cost: 10.0,
          total: 10.0,
        },
        v_groove_pulleys: {
          description: "V-groove pulleys V623ZZ",
          quantity: 6,
          unit_cost: 1.33,
          total: 8.0,
        },
        ball_bearings: {
          description: "Ball bearings for disks",
          quantity: disk_count + 5,
          unit_cost: 1.36,
          total: (disk_count + 5) * 1.36,
        },
        hardware: {
          description: "M3 hardware kit",
          quantity: 1,
          unit_cost: 10.0,
          total: 10.0,
        },
        printed_parts: {
          description: `3D printed parts (~${disk_count * 8 + 150}g PLA)`,
          quantity: 1,
          unit_cost: 0.1 * (disk_count * 8 + 150),
          total: 0.1 * (disk_count * 8 + 150),
        },
      },
      actuation: {
        nema17_steppers: {
          description: "NEMA 17 stepper motors",
          quantity: 3,
          unit_cost: 10.0,
          total: 30.0,
        },
        stepper_drivers: {
          description: "A4988/TMC2209 drivers",
          quantity: 3,
          unit_cost: 3.0,
          total: 9.0,
        },
        rack_pinion: {
          description: "Rack and pinion sets",
          quantity: 3,
          unit_cost: 5.0,
          total: 15.0,
        },
        linear_rails: {
          description: "MGN9 linear rails",
          quantity: 3,
          unit_cost: 5.0,
          total: 15.0,
        },
      },
      electronics: include_electronics
        ? {
            esp32_p4: {
              description: "ESP32-P4-WIFI6-M",
              quantity: 1,
              unit_cost: 25.0,
              total: 25.0,
            },
            ov5647_camera: {
              description: "OV5647 5MP MIPI camera",
              quantity: 1,
              unit_cost: 15.0,
              total: 15.0,
            },
            ov2640_camera: {
              description: "OV2640 2MP DVP camera",
              quantity: 1,
              unit_cost: 10.0,
              total: 10.0,
            },
            inmp441_mics: {
              description: "INMP441 MEMS microphones",
              quantity: 2,
              unit_cost: 4.0,
              total: 8.0,
            },
          }
        : {},
      acoustic: {
        horn_elements: {
          description: "Custom acoustic horn material",
          quantity: 1,
          unit_cost: 20.0,
          total: 20.0,
        },
      },
    };

    // Calculate totals
    const mechanical_total = Object.values(bom.mechanical).reduce(
      (sum: number, item: any) => sum + item.total,
      0
    );
    const actuation_total = Object.values(bom.actuation).reduce(
      (sum: number, item: any) => sum + item.total,
      0
    );
    const electronics_total = include_electronics
      ? Object.values(bom.electronics).reduce(
          (sum: number, item: any) => sum + item.total,
          0
        )
      : 0;
    const acoustic_total = Object.values(bom.acoustic).reduce(
      (sum: number, item: any) => sum + item.total,
      0
    );

    const grand_total = mechanical_total + actuation_total + electronics_total + acoustic_total;

    return jsonResult({
      bom,
      summary: {
        mechanical_usd: mechanical_total.toFixed(2),
        actuation_usd: actuation_total.toFixed(2),
        electronics_usd: electronics_total.toFixed(2),
        acoustic_usd: acoustic_total.toFixed(2),
        total_usd: grand_total.toFixed(2),
        within_budget: grand_total <= 225,
        target_budget_usd: 225,
      },
    });
  }
);

server.registerTool(
  "render_3d",
  {
    description: "Render 3D visualization of assembly",
    inputSchema: {
      view: z
        .enum(["isometric", "front", "side", "top", "exploded"])
        .default("isometric")
        .describe("View type"),
      kappa: z.number().finite().default(0).describe("Curvature for pose (0 = straight)"),
      phi: z.number().finite().default(0).describe("Bending plane angle"),
    },
  },
  async () => errorResult("render_3d is not implemented yet: no rendering backend exists.")
);

server.registerTool(
  "animate_motion",
  {
    description: "Generate motion animation",
    inputSchema: {
      motion_type: z
        .enum(["bend_x", "bend_y", "full_sweep", "tracking"])
        .describe("Type of motion to animate"),
      duration_sec: z.number().positive().finite().default(3).describe("Animation duration"),
      fps: z.number().int().positive().default(30).describe("Frames per second"),
    },
  },
  async () => errorResult("animate_motion is not implemented yet: no rendering backend exists.")
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Simulation MCP server running");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
