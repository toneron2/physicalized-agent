import { test } from "node:test";
import assert from "node:assert/strict";
import { connect, callJson } from "./helpers.mjs";

test("kinematics tools validate input and report unimplemented tools", async (t) => {
  const { client, close } = await connect();
  try {
    await t.test("rejects a non-numeric curvature instead of returning NaN", async () => {
      const { result } = await callJson(client, "forward_kinematics", { kappa: "abc", phi: 0, s: 0.1 });
      assert.equal(result.isError, true);
    });

    await t.test("rejects a non-positive arc length", async () => {
      const { result } = await callJson(client, "forward_kinematics", { kappa: 8, phi: 0, s: -0.1 });
      assert.equal(result.isError, true);
    });

    await t.test("rejects a non-positive tendon radius", async () => {
      const { result } = await callJson(client, "tendon_mapping", { kappa: 8, phi: 0, s: 0.1, tendon_radius: 0 });
      assert.equal(result.isError, true);
    });

    await t.test("accepts valid forward kinematics input", async () => {
      const { result, json } = await callJson(client, "forward_kinematics", { kappa: 8, phi: 0, s: 0.1 });
      assert.notEqual(result.isError, true);
      assert.equal(json.position.length, 3);
      assert.ok(Math.abs(json.position[2] - Math.sin(0.8) / 8) < 1e-9);
    });

    await t.test("inverse_kinematics reports itself as unimplemented", async () => {
      const { result, text } = await callJson(client, "inverse_kinematics", {
        target_x: 0.03, target_y: 0, target_z: 0.09, s: 0.1,
      });
      assert.equal(result.isError, true);
      assert.match(text, /not implemented/);
    });
  } finally {
    await close();
  }
});
