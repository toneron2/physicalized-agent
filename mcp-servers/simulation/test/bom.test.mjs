import { test } from "node:test";
import assert from "node:assert/strict";
import { connect, callJson } from "./helpers.mjs";

test("calculate_bom", async (t) => {
  const { client, close } = await connect();
  try {
    await t.test("derives every total from quantity × unit cost", async () => {
      const { json } = await callJson(client, "calculate_bom", { disk_count: 6, backbone_length_mm: 100 });
      for (const section of Object.values(json.bom)) {
        for (const item of Object.values(section)) {
          assert.ok(Math.abs(item.total - item.quantity * item.unit_cost) < 0.005, item.description);
        }
      }
      assert.equal(json.bom.mechanical.v_groove_pulleys.total, 7.98);
    });

    await t.test("section and grand totals add up and are numbers", async () => {
      const { json } = await callJson(client, "calculate_bom", { disk_count: 6, backbone_length_mm: 100 });
      const { summary, bom } = json;
      const sum = (section) => Object.values(section).reduce((a, i) => a + i.total, 0);
      assert.ok(Math.abs(summary.mechanical_usd - sum(bom.mechanical)) < 0.005);
      assert.ok(Math.abs(summary.actuation_usd - sum(bom.actuation)) < 0.005);
      assert.ok(Math.abs(summary.electronics_usd - sum(bom.electronics)) < 0.005);
      assert.ok(Math.abs(summary.total_usd - (summary.mechanical_usd + summary.actuation_usd + summary.electronics_usd + summary.acoustic_usd)) < 0.005);
      assert.equal(typeof summary.total_usd, "number");
      assert.equal(summary.within_budget, true);
      assert.ok(Math.abs(summary.margin_usd - (225 - summary.total_usd)) < 0.005);
    });

    await t.test("respects include_electronics and a custom budget", async () => {
      const { json } = await callJson(client, "calculate_bom", {
        disk_count: 6, backbone_length_mm: 100, include_electronics: false, target_budget_usd: 100,
      });
      assert.equal(json.summary.electronics_usd, 0);
      assert.deepEqual(json.bom.electronics, {});
      assert.equal(json.summary.within_budget, false);
    });
  } finally {
    await close();
  }
});
