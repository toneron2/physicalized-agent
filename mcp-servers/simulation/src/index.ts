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

interface BomLine {
  description: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

/** A BOM line whose total is always quantity × unit cost. */
function line(description: string, quantity: number, unit_cost: number): BomLine {
  return { description, quantity, unit_cost, total: round2(quantity * unit_cost) };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sectionTotal(section: Record<string, BomLine>): number {
  return round2(Object.values(section).reduce((sum, item) => sum + item.total, 0));
}

server.registerTool(
  "calculate_bom",
  {
    description: "Calculate bill of materials and cost for the TDCR spine reference design",
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
      target_budget_usd: z
        .number()
        .positive()
        .finite()
        .default(225)
        .describe("Budget the total is checked against"),
    },
  },
  async ({ disk_count, backbone_length_mm, include_electronics, target_budget_usd }) => {
    const printed_grams = disk_count * 8 + 150;

    const mechanical: Record<string, BomLine> = {
      niti_backbone: line(`NiTi tube 1.4mm OD x ${backbone_length_mm}mm`, 1, 15.0),
      spectra_tendon: line("Spectra fiber (McMaster 9442T4)", 1, 10.0),
      v_groove_pulleys: line("V-groove pulleys V623ZZ", 6, 1.33),
      ball_bearings: line("Ball bearings for disks", disk_count + 5, 1.36),
      hardware: line("M3 hardware kit", 1, 10.0),
      printed_parts: line(`3D printed parts (~${printed_grams}g PLA)`, printed_grams, 0.1),
    };
    const actuation: Record<string, BomLine> = {
      nema17_steppers: line("NEMA 17 stepper motors", 3, 10.0),
      stepper_drivers: line("A4988/TMC2209 drivers", 3, 3.0),
      rack_pinion: line("Rack and pinion sets", 3, 5.0),
      linear_rails: line("MGN9 linear rails", 3, 5.0),
    };
    const electronics: Record<string, BomLine> = include_electronics
      ? {
          esp32_p4: line("ESP32-P4-WIFI6-M", 1, 25.0),
          ov5647_camera: line("OV5647 5MP MIPI camera", 1, 15.0),
          ov2640_camera: line("OV2640 2MP DVP camera", 1, 10.0),
          inmp441_mics: line("INMP441 MEMS microphones", 2, 4.0),
        }
      : {};
    const acoustic: Record<string, BomLine> = {
      horn_elements: line("Custom acoustic horn material", 1, 20.0),
    };

    const mechanical_usd = sectionTotal(mechanical);
    const actuation_usd = sectionTotal(actuation);
    const electronics_usd = sectionTotal(electronics);
    const acoustic_usd = sectionTotal(acoustic);
    const total_usd = round2(mechanical_usd + actuation_usd + electronics_usd + acoustic_usd);

    return jsonResult({
      bom: { mechanical, actuation, electronics, acoustic },
      summary: {
        mechanical_usd,
        actuation_usd,
        electronics_usd,
        acoustic_usd,
        total_usd,
        target_budget_usd,
        within_budget: total_usd <= target_budget_usd,
        margin_usd: round2(target_budget_usd - total_usd),
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
