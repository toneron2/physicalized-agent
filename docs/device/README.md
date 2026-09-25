# The prototype's device

**The prototype sensor head runs on a Raspberry Pi 5 (4 GB) instead of the frozen
specification's ESP32-P4, because the contract's transport is WebTransport and no
WebTransport client exists for the ESP32-P4 today.** September 2026. The parts list is
[`BOM-prototype-2026-09-24.csv`](BOM-prototype-2026-09-24.csv).

| | |
|---|---|
| **Status** | Procurement in process. |
| **Board** | Raspberry Pi 5, 4 GB, active cooler, 27 W supply |
| **Cameras** | Camera Module 3 Wide (context, 120°) and Camera Module 3 (detail, autofocus), both MIPI-CSI |
| **Microphones** | two SPH0645 I²S MEMS microphones, stereo on one bus |
| **Servos** | two MG90S metal-gear micro servos in the base, driven by the board's hardware PWM, powered separately |
| **Presence** | one VL53L1X time-of-flight sensor |
| **Links** | WiFi 2.4 and 5 GHz, gigabit ethernet |
| **Cost** | about $300 in September 2026 |
| **Licence** | This directory: all rights reserved; patent pending. See [`NOTICE`](NOTICE). The rest of the repository is MIT |

## The choice

| Criterion | ESP32-P4 (frozen) | Raspberry Pi 5 | RK3588 board |
|---|---|---|---|
| Transport (deciding) | no WebTransport client; ESP-IDF has no native QUIC | Rust and Python WebTransport clients exist | as the Pi |
| Sensors | CSI, DVP and I²S on chip | two CSI ports, I²S; no DVP | CSI through vendor kernels; I²S |
| Compute | hardware H.264; URGE's embedded build unmeasured | URGE builds as published; video encoded in software | hardware encoder and NPU |
| Power and heat | about 1 W | 3–7 W, 5 V up to 5 A | 5–10 W |
| Cost | about $25 | $130 | more |

The Pi 5 also has the mainline camera stack, a production form on the same chip
(Compute Module 5), and is the family the ride-along igent uses, so one client serves the
head, the ride-along and a drone's companion computer. The RK3588's encoder and NPU matter
when a local model runs on the head; the question reopens then.

## What changes from the frozen specification

| Frozen | Prototype |
|---|---|
| ESP32-P4, the only compute in the head | Raspberry Pi 5 |
| Camera B on a parallel (DVP) interface | a second CSI camera |
| 3.3 V made on the head | the board takes 5 V; the microphones and the ToF sensor use its 3.3 V rail |
| no proximity sensing | a time-of-flight sensor, so the articulation gate's presence and hazard inputs are measured |
| the rest: two I²S microphones, PWM originating at the head, servos in the base on their own power, logic power alone entering the head | unchanged |

The board may sit in the head or in the base with the cameras on 500 mm cables; the second
keeps the head's mass and heat at the frozen design's scale.

## Bench wiring

| Part | Raspberry Pi 5 header |
|---|---|
| microphones, 3V and GND | pin 1 (3.3 V), pin 6 (GND) |
| microphones, BCLK / LRCL / DOUT | GPIO18 pin 12, GPIO19 pin 35, GPIO20 pin 38 |
| microphone SEL | left to GND, right to 3.3 V |
| servo 1 (pan) signal | GPIO12 pin 32 (hardware PWM channel 0) |
| servo 2 (tilt) signal | GPIO13 pin 33 (hardware PWM channel 1) |
| servo power | a separate 5 V 2 A supply; its ground joined to pin 34 |
| ToF sensor | 3.3 V pin 17, GND pin 9, SDA GPIO2 pin 3, SCL GPIO3 pin 5 |
| cameras | CAM/DISP 0 and 1, each with a 22-pin to 15-pin camera cable |
