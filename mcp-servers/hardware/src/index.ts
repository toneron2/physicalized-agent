/**
 * MCP Server: Hardware
 *
 * Provides tools for ESP32 firmware development:
 * - Stepper driver code generation
 * - Sensor configuration
 * - GPIO assignment
 * - DSP pipeline setup
 *
 * Inputs are validated with zod before any code is generated; invalid input
 * and unimplemented tools come back as `isError` results.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "hardware-server", version: "0.1.0" });

function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

// ESP32-P4 exposes GPIO0..GPIO54.
const gpio = z.number().int().min(0).max(54);

function hasDuplicates(pins: number[]): boolean {
  return new Set(pins).size !== pins.length;
}

// Default pin assignments when the caller does not provide any.
const DEFAULT_STEP_PINS = [4, 6, 8];
const DEFAULT_DIR_PINS = [5, 7, 9];

server.registerTool(
  "generate_stepper_driver",
  {
    description: "Generate ESP-IDF stepper motor driver code",
    inputSchema: {
      num_steppers: z
        .number()
        .int()
        .min(1)
        .max(8)
        .default(3)
        .describe("Number of stepper motors"),
      step_pins: z
        .array(gpio)
        .optional()
        .describe("GPIO pins for step signals (one per stepper)"),
      dir_pins: z
        .array(gpio)
        .optional()
        .describe("GPIO pins for direction signals (one per stepper)"),
      steps_per_mm: z
        .number()
        .positive()
        .finite()
        .default(80)
        .describe("Steps per millimeter of tendon travel"),
    },
  },
  async ({ num_steppers, step_pins, dir_pins, steps_per_mm }) => {
    if (!step_pins !== !dir_pins) {
      return errorResult("step_pins and dir_pins must be provided together.");
    }
    if (!step_pins && num_steppers > DEFAULT_STEP_PINS.length) {
      return errorResult(
        `Default pin assignments cover ${DEFAULT_STEP_PINS.length} steppers; pass step_pins and dir_pins for ${num_steppers}.`
      );
    }

    const stepPins = step_pins ?? DEFAULT_STEP_PINS.slice(0, num_steppers);
    const dirPins = dir_pins ?? DEFAULT_DIR_PINS.slice(0, num_steppers);

    if (stepPins.length !== num_steppers || dirPins.length !== num_steppers) {
      return errorResult(
        `Expected ${num_steppers} step_pins and ${num_steppers} dir_pins, got ${stepPins.length} and ${dirPins.length}.`
      );
    }
    if (hasDuplicates([...stepPins, ...dirPins])) {
      return errorResult("step_pins and dir_pins must all be distinct GPIO numbers.");
    }

    const code = `
// Auto-generated stepper driver for ${num_steppers} motors
// Steps per mm: ${steps_per_mm}

#include "stepper_driver.h"
#include "driver/gpio.h"

#define NUM_STEPPERS ${num_steppers}
#define STEPS_PER_MM ${steps_per_mm}

static stepper_t steppers[NUM_STEPPERS] = {
${stepPins
  .map(
    (stepPin, i) => `    {
        .step_pin = GPIO_NUM_${stepPin},
        .dir_pin = GPIO_NUM_${dirPins[i]},
        .position = 0,
        .step_delay_us = 500
    }`
  )
  .join(",\n")}
};

void steppers_init(void) {
    for (int i = 0; i < NUM_STEPPERS; i++) {
        stepper_init(&steppers[i]);
    }
}

void steppers_move_tendon_mm(int index, float mm) {
    int32_t steps = (int32_t)(mm * STEPS_PER_MM);
    stepper_move_relative(&steppers[index], steps);
}
`;

    return jsonResult({
      code,
      gpio_assignments: { step_pins: stepPins, dir_pins: dirPins },
    });
  }
);

server.registerTool(
  "configure_camera",
  {
    description: "Generate camera configuration code for OV5647/OV2640",
    inputSchema: {
      camera_type: z.enum(["OV5647", "OV2640"]).describe("Camera sensor model"),
      interface: z.enum(["MIPI-CSI", "DVP"]).describe("Camera interface type"),
      resolution: z
        .enum(["VGA", "SVGA", "HD", "FHD", "5MP"])
        .optional()
        .describe("Target resolution"),
    },
  },
  async () =>
    errorResult(
      "configure_camera is not implemented yet: no esp_cam / CSI configuration generator exists."
    )
);

server.registerTool(
  "configure_microphone",
  {
    description: "Generate I2S microphone configuration for INMP441",
    inputSchema: {
      num_mics: z
        .number()
        .int()
        .min(1)
        .max(2)
        .default(2)
        .describe("Number of microphones on the I2S bus (one stereo bus, max 2)"),
      sample_rate: z
        .number()
        .int()
        .positive()
        .default(16000)
        .describe("Sample rate in Hz"),
      ws_pin: gpio.default(10).describe("Word select GPIO pin"),
      bclk_pin: gpio.default(11).describe("Bit clock GPIO pin"),
      din_pin: gpio.default(12).describe("Data input GPIO pin"),
    },
  },
  async ({ num_mics, sample_rate, ws_pin, bclk_pin, din_pin }) => {
    if (hasDuplicates([ws_pin, bclk_pin, din_pin])) {
      return errorResult("ws_pin, bclk_pin and din_pin must be distinct GPIO numbers.");
    }

    const config = `
// I2S configuration for ${num_mics}x INMP441 microphones
#include "driver/i2s_std.h"

#define SAMPLE_RATE ${sample_rate}
#define I2S_WS_PIN GPIO_NUM_${ws_pin}
#define I2S_BCLK_PIN GPIO_NUM_${bclk_pin}
#define I2S_DIN_PIN GPIO_NUM_${din_pin}

i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);

i2s_std_config_t std_cfg = {
    .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(SAMPLE_RATE),
    .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_32BIT, I2S_SLOT_MODE_STEREO),
    .gpio_cfg = {
        .mclk = I2S_GPIO_UNUSED,
        .bclk = I2S_BCLK_PIN,
        .ws = I2S_WS_PIN,
        .dout = I2S_GPIO_UNUSED,
        .din = I2S_DIN_PIN,
    },
};
`;

    return jsonResult({ config, sample_rate, num_mics });
  }
);

server.registerTool(
  "generate_dsp_pipeline",
  {
    description: "Generate audio DSP pipeline for source localization",
    inputSchema: {
      sample_rate: z.number().int().positive().default(16000).describe("Sample rate in Hz"),
      fft_size: z.number().int().positive().default(512).describe("FFT window size"),
      enable_itd: z.boolean().default(true).describe("Enable Interaural Time Difference"),
      enable_ild: z.boolean().default(true).describe("Enable Interaural Level Difference"),
    },
  },
  async () =>
    errorResult(
      "generate_dsp_pipeline is not implemented yet: no ITD/ILD pipeline generator exists."
    )
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Hardware MCP server running");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
