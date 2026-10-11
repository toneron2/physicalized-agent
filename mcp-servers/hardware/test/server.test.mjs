import { test } from "node:test";
import assert from "node:assert/strict";
import { connect } from "./helpers.mjs";

test("hardware server starts and lists its tools", async () => {
  const { client, close } = await connect();
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(
      tools.map((t) => t.name).sort(),
      ["configure_camera", "configure_microphone", "generate_dsp_pipeline", "generate_stepper_driver"]
    );
  } finally {
    await close();
  }
});
