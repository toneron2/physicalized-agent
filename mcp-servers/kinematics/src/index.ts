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
import { pccPose, pccPosition, pccInverse, tendonDeltas, tendonAngles, round } from "./pcc.js";

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
    description:
      "Compute end-effector pose from curvature parameters (κ, φ, s). Base at the origin, backbone along +Z, bend toward (cos φ, sin φ).",
    inputSchema: { kappa, phi, s: arcLength },
  },
  async ({ kappa, phi, s }) => {
    const pose = pccPose(kappa, phi, s);
    return jsonResult({
      position: pose.position.map((v) => round(v, 9)),
      rotation: pose.rotation.map((row) => row.map((v) => round(v, 6))),
      bend_angle_deg: round((pose.bend_angle_rad * 180) / Math.PI, 2),
    });
  }
);

server.registerTool(
  "inverse_kinematics",
  {
    description:
      "Compute curvature parameters (κ, φ) for a single segment of length s to point its tip at a target position. A fixed-length segment reaches a surface, so `reachable` is false and `residual_mm` non-zero when the target is off that surface.",
    inputSchema: {
      target_x: z.number().finite().describe("Target X position in meters"),
      target_y: z.number().finite().describe("Target Y position in meters"),
      target_z: z.number().finite().describe("Target Z position in meters"),
      s: arcLength.describe("Arc length (robot length) in meters"),
      kappa_max: z
        .number()
        .positive()
        .finite()
        .optional()
        .describe("Optional curvature limit in 1/m; the result flags solutions that exceed it"),
      tolerance_mm: z
        .number()
        .positive()
        .finite()
        .default(0.5)
        .describe("Residual below which the target counts as reachable"),
    },
  },
  async ({ target_x, target_y, target_z, s, kappa_max, tolerance_mm }) => {
    const sol = pccInverse([target_x, target_y, target_z], s);
    const residual_mm = sol.residual_m * 1000;
    const within_curvature_limit = kappa_max === undefined ? true : Math.abs(sol.kappa) <= kappa_max;
    return jsonResult({
      kappa: round(sol.kappa, 6),
      phi: round(sol.phi, 6),
      bend_angle_deg: round((sol.bend_angle_rad * 180) / Math.PI, 2),
      achieved_position: sol.achieved_position.map((v) => round(v, 9)),
      residual_mm: round(residual_mm, 3),
      reachable: residual_mm <= tolerance_mm && within_curvature_limit,
      within_curvature_limit,
    });
  }
);

server.registerTool(
  "tendon_mapping",
  {
    description:
      "Convert curvature to tendon length changes for n tendons spaced evenly around the backbone (tendon 0 at +X). Negative = tendon shortens (pulls).",
    inputSchema: {
      kappa,
      phi,
      s: arcLength,
      tendon_radius: z
        .number()
        .positive()
        .finite()
        .describe("Distance from backbone to tendons in meters"),
      num_tendons: z
        .number()
        .int()
        .min(3)
        .max(6)
        .default(3)
        .describe("Number of tendons, evenly spaced"),
    },
  },
  async ({ kappa, phi, s, tendon_radius, num_tendons }) => {
    const deltas_mm = tendonDeltas(kappa, phi, s, tendon_radius, num_tendons).map((d) =>
      round(d * 1000, 3)
    );
    return jsonResult({
      tendon_deltas_mm: deltas_mm,
      tendon_angles_deg: tendonAngles(num_tendons).map((a) => round((a * 180) / Math.PI, 3)),
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

        points.push(pccPosition(kappa, phi, s));
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
