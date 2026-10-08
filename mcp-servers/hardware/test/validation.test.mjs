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
      assert.match(json.config, /GPIO_NUM_12/);
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
