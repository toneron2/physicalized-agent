import { test } from "node:test";
import assert from "node:assert/strict";
import { connect } from "./helpers.mjs";

test("kinematics server starts and lists its tools", async () => {
  const { client, close } = await connect();
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(
      tools.map((t) => t.name).sort(),
      ["forward_kinematics", "inverse_kinematics", "tendon_mapping", "workspace_analysis"]
    );
  } finally {
    await close();
  }
});
