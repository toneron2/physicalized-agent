import { test } from "node:test";
import assert from "node:assert/strict";
import { connect, callJson } from "./helpers.mjs";

test("simulation tools validate input and report unimplemented tools", async (t) => {
  const { client, close } = await connect();
  try {
    await t.test("calculates a BOM for the reference design", async () => {
      const { result, json } = await callJson(client, "calculate_bom", {
        disk_count: 6, backbone_length_mm: 100,
      });
      assert.notEqual(result.isError, true);
      assert.equal(json.summary.within_budget, true);
      assert.equal(json.summary.target_budget_usd, 225);
    });

    await t.test("rejects a zero disk count", async () => {
      const { result } = await callJson(client, "calculate_bom", { disk_count: 0, backbone_length_mm: 100 });
      assert.equal(result.isError, true);
    });

    await t.test("generate_stl reports itself as unimplemented instead of a fake path", async () => {
      const { result, text } = await callJson(client, "generate_stl", { component: "spacer_disk" });
      assert.equal(result.isError, true);
      assert.match(text, /not implemented/);
    });

    await t.test("render_3d reports itself as unimplemented", async () => {
      const { result } = await callJson(client, "render_3d", {});
      assert.equal(result.isError, true);
    });
  } finally {
    await close();
  }
});
