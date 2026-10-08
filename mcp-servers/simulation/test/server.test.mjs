import { test } from "node:test";
import assert from "node:assert/strict";
import { connect } from "./helpers.mjs";

test("simulation server starts and lists its tools", async () => {
  const { client, close } = await connect();
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(
      tools.map((t) => t.name).sort(),
      ["analyze_printability", "animate_motion", "calculate_bom", "generate_stl", "render_3d"]
    );
  } finally {
    await close();
  }
});
