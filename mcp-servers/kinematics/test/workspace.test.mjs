import { test } from "node:test";
import assert from "node:assert/strict";
import { connect, callJson } from "./helpers.mjs";
import { pccPosition } from "../dist/pcc.js";

test("workspace_analysis", async (t) => {
  const { client, close } = await connect();
  try {
    await t.test("matches a brute-force φ/κ sweep", async () => {
      const s = 0.1, kappa_max = 30, resolution = 25;
      const { result, json } = await callJson(client, "workspace_analysis", { s, kappa_max, resolution });
      assert.notEqual(result.isError, true);

      let maxX = -Infinity, minX = Infinity, minZ = Infinity, maxZ = -Infinity, maxR = 0;
      for (let ki = 0; ki <= resolution; ki++) {
        const kappa = (ki / resolution) * kappa_max;
        for (let pi = 0; pi < 720; pi++) {
          const [x, y, z] = pccPosition(kappa, (pi / 360) * Math.PI, s);
          maxX = Math.max(maxX, x); minX = Math.min(minX, x);
          minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
          maxR = Math.max(maxR, Math.hypot(x, y));
        }
      }
      assert.ok(Math.abs(json.bounds_mm.x[1] - maxX * 1000) < 1e-3);
      assert.ok(Math.abs(json.bounds_mm.x[0] - minX * 1000) < 1e-3);
      assert.ok(Math.abs(json.bounds_mm.z[0] - minZ * 1000) < 1e-3);
      assert.ok(Math.abs(json.bounds_mm.z[1] - maxZ * 1000) < 1e-3);
      assert.ok(Math.abs(json.max_lateral_deflection_mm - maxR * 1000) < 1e-3);
      assert.equal(json.max_reach_mm, 100);
      assert.equal(json.samples, resolution + 1);
      assert.equal(json.profile, undefined);
    });

    await t.test("handles a large resolution without exhausting the stack", async () => {
      const { result, json } = await callJson(client, "workspace_analysis", {
        s: 0.1, kappa_max: 80, resolution: 10000,
      });
      assert.notEqual(result.isError, true);
      assert.equal(json.samples, 10001);
    });

    await t.test("rejects a resolution above the cap", async () => {
      const { result } = await callJson(client, "workspace_analysis", {
        s: 0.1, kappa_max: 80, resolution: 10001,
      });
      assert.equal(result.isError, true);
    });

    await t.test("returns the bend profile on request and warns past 180°", async () => {
      const { json } = await callJson(client, "workspace_analysis", {
        s: 0.1, kappa_max: 40, resolution: 4, include_profile: true,
      });
      assert.equal(json.profile.length, 5);
      assert.equal(json.profile[0].lateral_mm, 0);
      assert.equal(json.profile[4].bend_angle_deg, 229.18);
      assert.match(json.warning, /180°/);
    });
  } finally {
    await close();
  }
});
