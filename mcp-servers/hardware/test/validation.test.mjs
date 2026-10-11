import { test } from "node:test";
import assert from "node:assert/strict";
import { connect, callJson } from "./helpers.mjs";

test("hardware tools validate input and report unimplemented tools", async (t) => {
  const { client, close } = await connect();
  try {
    await t.test("generates a driver for the default three steppers", async () => {
      const { result, json } = await callJson(client, "generate_stepper_driver", {});
      assert.notEqual(result.isError, true);
      assert.deepEqual(json.gpio_assignments, { step_pins: [4, 6, 8], dir_pins: [5, 7, 9] });
      assert.match(json.code, /GPIO_NUM_8/);
      assert.doesNotMatch(json.code, /undefined/);
    });

    await t.test("emits the header the driver source includes", async () => {
      const { json } = await callJson(client, "generate_stepper_driver", {});
      assert.ok(json.files["stepper_driver.h"].includes("typedef struct"));
      for (const fn of ["stepper_init", "stepper_move_relative", "stepper_move_absolute", "steppers_move_tendon_mm"]) {
        assert.ok(json.files["stepper_driver.h"].includes(`esp_err_t ${fn}(`), `${fn} declared`);
        assert.ok(json.files["stepper_driver.c"].includes(`esp_err_t ${fn}(`), `${fn} defined`);
      }
      assert.ok(json.files["stepper_driver.c"].includes(".enable_pin = GPIO_NUM_NC"));
      assert.equal(json.files["stepper_driver.c"], json.code);
    });

    await t.test("refuses more steppers than default pins without explicit pins", async () => {
      const { result, text } = await callJson(client, "generate_stepper_driver", { num_steppers: 4 });
      assert.equal(result.isError, true);
      assert.match(text, /step_pins/);
    });

    await t.test("refuses pin arrays that do not match num_steppers", async () => {
      const { result } = await callJson(client, "generate_stepper_driver", {
        num_steppers: 2, step_pins: [4], dir_pins: [5, 7],
      });
      assert.equal(result.isError, true);
    });

    await t.test("refuses duplicate pins", async () => {
      const { result } = await callJson(client, "generate_stepper_driver", {
        num_steppers: 2, step_pins: [4, 6], dir_pins: [6, 7],
      });
      assert.equal(result.isError, true);
    });

    await t.test("refuses out-of-range GPIO numbers", async () => {
      const { result } = await callJson(client, "generate_stepper_driver", {
        num_steppers: 1, step_pins: [99], dir_pins: [5],
      });
      assert.equal(result.isError, true);
    });

    await t.test("configures the microphones with defaults", async () => {
      const { result, json } = await callJson(client, "configure_microphone", {});
      assert.notEqual(result.isError, true);
      assert.equal(json.num_mics, 2);
      assert.equal(json.part, "INMP441");
      assert.equal(json.data_bits, 24);
      assert.match(json.config, /GPIO_NUM_12/);
      assert.match(json.config, /#define MIC_DATA_BITS 24/);
      assert.match(json.config, /L\/R pin low/);
    });

    await t.test("configures the Knowles part from the frozen BOM", async () => {
      const { result, json } = await callJson(client, "configure_microphone", { part: "SPH645LM4H", num_mics: 1 });
      assert.notEqual(result.isError, true);
      assert.equal(json.part, "SPH645LM4H");
      assert.equal(json.data_bits, 18);
      assert.equal(json.select_pin, "SELECT");
      assert.match(json.config, /#define MIC_DATA_BITS 18/);
      assert.match(json.config, /SELECT pin low to place it in the left slot/);
    });

    await t.test("rejects an unknown microphone part", async () => {
      const { result } = await callJson(client, "configure_microphone", { part: "ICS43434" });
      assert.equal(result.isError, true);
    });

    await t.test("configure_camera reports itself as unimplemented", async () => {
      const { result, text } = await callJson(client, "configure_camera", {
        camera_type: "OV5647", interface: "MIPI-CSI",
      });
      assert.equal(result.isError, true);
      assert.match(text, /not implemented/);
    });
  } finally {
    await close();
  }
});
