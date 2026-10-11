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

    await t.test("inverse_kinematics solves a reachable target", async () => {
      const fk = (await callJson(client, "forward_kinematics", { kappa: 8, phi: 0.5, s: 0.1 })).json;
      const { result, json } = await callJson(client, "inverse_kinematics", {
        target_x: fk.position[0], target_y: fk.position[1], target_z: fk.position[2], s: 0.1,
      });
      assert.notEqual(result.isError, true);
      assert.ok(Math.abs(json.kappa - 8) < 1e-4);
      assert.ok(Math.abs(json.phi - 0.5) < 1e-4);
      assert.equal(json.reachable, true);
      assert.equal(typeof json.bend_angle_deg, "number");
    });

    await t.test("inverse_kinematics flags a target beyond the curvature limit", async () => {
      const { json } = await callJson(client, "inverse_kinematics", {
        target_x: 0.06, target_y: 0, target_z: 0.02, s: 0.1, kappa_max: 10,
      });
      assert.equal(json.within_curvature_limit, false);
      assert.equal(json.reachable, false);
    });

    await t.test("tendon_mapping accepts a configurable tendon count", async () => {
      const { json } = await callJson(client, "tendon_mapping", {
        kappa: 10, phi: 0, s: 0.1, tendon_radius: 0.01, num_tendons: 4,
      });
      assert.equal(json.tendon_deltas_mm.length, 4);
      assert.deepEqual(json.tendon_angles_deg, [0, 90, 180, 270]);
      assert.ok(Math.abs(json.tendon_deltas_mm[0] + 10) < 1e-6);
      assert.ok(Math.abs(json.tendon_deltas_mm[2] - 10) < 1e-6);
    });

  } finally {
    await close();
  }
});
