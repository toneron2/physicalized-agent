/**
 * MCP Server: Hardware
 *
 * Provides tools for ESP32 firmware development:
 * - Stepper driver code generation
 * - Sensor configuration
 * - GPIO assignment
 * - DSP pipeline setup
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "hardware-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_stepper_driver",
        description: "Generate ESP-IDF stepper motor driver code",
        inputSchema: {
          type: "object",
          properties: {
            num_steppers: {
              type: "integer",
              description: "Number of stepper motors",
              default: 3,
            },
            step_pins: {
              type: "array",
              items: { type: "integer" },
              description: "GPIO pins for step signals",
            },
            dir_pins: {
              type: "array",
              items: { type: "integer" },
              description: "GPIO pins for direction signals",
            },
            steps_per_mm: {
              type: "number",
              description: "Steps per millimeter of tendon travel",
              default: 80,
            },
          },
          required: ["num_steppers"],
        },
      },
      {
        name: "configure_camera",
        description: "Generate camera configuration code for OV5647/OV2640",
        inputSchema: {
          type: "object",
          properties: {
            camera_type: {
              type: "string",
              enum: ["OV5647", "OV2640"],
              description: "Camera sensor model",
            },
            interface: {
              type: "string",
              enum: ["MIPI-CSI", "DVP"],
              description: "Camera interface type",
            },
            resolution: {
              type: "string",
              enum: ["VGA", "SVGA", "HD", "FHD", "5MP"],
              description: "Target resolution",
            },
          },
          required: ["camera_type", "interface"],
        },
      },
      {
        name: "configure_microphone",
        description: "Generate I2S microphone configuration for INMP441",
        inputSchema: {
          type: "object",
          properties: {
            num_mics: {
              type: "integer",
              description: "Number of microphones",
              default: 2,
            },
            sample_rate: {
              type: "integer",
              description: "Sample rate in Hz",
              default: 16000,
            },
            ws_pin: {
              type: "integer",
              description: "Word select GPIO pin",
            },
            bclk_pin: {
              type: "integer",
              description: "Bit clock GPIO pin",
            },
            din_pin: {
              type: "integer",
              description: "Data input GPIO pin",
            },
          },
          required: ["num_mics"],
        },
      },
      {
        name: "generate_dsp_pipeline",
        description: "Generate audio DSP pipeline for source localization",
        inputSchema: {
          type: "object",
          properties: {
            sample_rate: {
              type: "integer",
              description: "Sample rate in Hz",
              default: 16000,
            },
            fft_size: {
              type: "integer",
              description: "FFT window size",
              default: 512,
            },
            enable_itd: {
              type: "boolean",
              description: "Enable Interaural Time Difference",
              default: true,
            },
            enable_ild: {
              type: "boolean",
              description: "Enable Interaural Level Difference",
              default: true,
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "generate_stepper_driver": {
      const { num_steppers, step_pins, dir_pins, steps_per_mm = 80 } = args as {
        num_steppers: number;
        step_pins?: number[];
        dir_pins?: number[];
        steps_per_mm?: number;
      };

      // Default pin assignments if not provided
      const defaultStepPins = [4, 6, 8];
      const defaultDirPins = [5, 7, 9];

      const code = `
// Auto-generated stepper driver for ${num_steppers} motors
// Steps per mm: ${steps_per_mm}

#include "stepper_driver.h"
#include "driver/gpio.h"

#define NUM_STEPPERS ${num_steppers}
#define STEPS_PER_MM ${steps_per_mm}

static stepper_t steppers[NUM_STEPPERS] = {
${Array(num_steppers)
  .fill(0)
  .map(
    (_, i) => `    {
        .step_pin = GPIO_NUM_${(step_pins || defaultStepPins)[i]},
        .dir_pin = GPIO_NUM_${(dir_pins || defaultDirPins)[i]},
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

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                code,
                gpio_assignments: {
                  step_pins: step_pins || defaultStepPins.slice(0, num_steppers),
                  dir_pins: dir_pins || defaultDirPins.slice(0, num_steppers),
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "configure_microphone": {
      const { num_mics, sample_rate = 16000, ws_pin = 10, bclk_pin = 11, din_pin = 12 } = args as {
        num_mics: number;
        sample_rate?: number;
        ws_pin?: number;
        bclk_pin?: number;
        din_pin?: number;
      };

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

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ config, sample_rate, num_mics }, null, 2),
          },
        ],
      };
    }

    default:
      return {
        content: [
          {
            type: "text",
            text: `Tool '${name}' not yet implemented`,
          },
        ],
      };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Hardware MCP server running");
}

main().catch(console.error);
