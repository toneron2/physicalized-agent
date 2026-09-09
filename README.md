# Physicalized Agent
> A Claude Code-native autonomous framework for designing healthcare sensor heads with continuum robot articulation

[![Claude Code](https://img.shields.io/badge/Claude%20Code-Native-blueviolet)](https://claude.ai/code)
[![MCP](https://img.shields.io/badge/MCP-1.0-green)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

![Concept render of the Physicalized Agent: a white ovoid sensor head with a dark horizontal vision strip and a conical acoustic horn on its flank, carried on a segmented tendon-driven neck rising from a circular base](docs/sensor-head-concept.jpg)

*Concept render, not a built device. Three features in it drive the rest of the design:
the **horn** on the flank is the acoustic geometry that makes vertical sound localisation
possible from two microphones, the **segmented neck** is the tendon-driven continuum spine
this scaffold designs, and the **vision strip** carries the stereo pair. The frozen first
specification is simpler than this — a two-axis gimbal outside the head — and the articulated
form is the target it builds toward.*

> **Relationship to OpenCR-Hardware.** This repository is a software scaffold, not a
> hardware fork. It contains no third-party source. The mechanical and electronic designs
> it targets are published separately by the Continuum Robotics Laboratory as
> [OpenCR-Hardware](https://github.com/ContinuumRoboticsLab/OpenCR-Hardware) under the
> BSD 3-Clause License. Clone theirs alongside this one; nothing here redistributes it.
> Their papers are cited under [Reference Documentation](#reference-documentation).

## Where This Fits

This repository is the **design system**. The thing it designs is a sensor head, and that
head is the first physical device in a governance architecture that until now existed only
as software.

```
        ┌──────────────────────────────────────────────┐
        │  BROAD  —  healthcare agentic ERP in cloud    │
        │  FHIR R4 · clinical pathways · access layer   │
        │  governed by URGE, the formal policy engine   │
        └──────────────────────────────────────────────┘
                          ▲   │
   Stream 0  heartbeat +  │   │  governance control     bidirectional, critical
   Stream 1  XYZ vector map (JSON-LD)                   high, drop old frames
   Stream 2  diagnostic audio (AAC)                     medium
   Stream 3  high-res video (H.264 / JPEG)              low, yields to the rest
                          │   ▼
              WebTransport over HTTP/3  (QUIC + TLS 1.3)
                          │   ▲
        ┌──────────────────────────────────────────────┐
        │  Physicalized Agent  —  the sensor head       │
        │  stereo vision · binaural MEMS in horns       │
        │  local governance state machine (overrides)   │
        └──────────────────────────────────────────────┘
```

**Determinism over probability.** The head calculates vectors, not guesses. Audio arrives as
an azimuth, elevation and intensity derived from interaural time and level differences and a
spectral notch cut by the horn geometry. Vision arrives as a rectified centroid with an
estimated depth. Fusing the two produces a 3D logic map, and a rule over that map — floor-level
audio source, intensity above threshold — is a governance decision the device can make on its
own, without a model and without the network.

That is what makes it inexpensive. Deterministic signal processing on an
off-the-shelf [RISC-V microcontroller](#compute--control) replaces the neural accelerator an
equivalent AI camera needs, and the cost target is the product requirement, not an optimisation: the goal is
a device you can afford to give to the patient rather than sell to the building. Connected, it
acts as the patient's advocate — the head answers to the person in front of it, and the
reasoning behind every decision it forwards is auditable upstream.

**The transport is deliberate.** WebTransport over HTTP/3 is Chromium's QUIC stack, which
means bidirectional streams and datagrams over UDP with TLS 1.3, independent stream
prioritisation, and no head-of-line blocking. A dropped video frame cannot delay a governance
heartbeat. The cloud endpoint scales to zero while the heartbeat stays nominal.

**Two halves, bound not merged.** The software half is here. The mechanical half — acoustic
horn geometry, the concha mount, the head shell, the articulated neck — is a coordinated
industrial design effort tracked separately, because a shared interface document beats a
shared repository. The continuum-robot articulation this scaffold targets is the advanced
variant; the frozen first specification uses a two-axis pan/tilt gimbal outside the head, with
servo power never entering it.

---

## Table of Contents

- [Where This Fits](#where-this-fits)
- [Executive Summary](#executive-summary)
- [The Innovation: Continuum Robot Sensor Head](#the-innovation-continuum-robot-sensor-head)
- [Claude Code-Native Architecture](#claude-code-native-architecture)
- [Hardware Architecture](#hardware-architecture)
- [The 5-Phase Pipeline](#the-5-phase-pipeline)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Bill of Materials](#bill-of-materials)
- [Reference Documentation](#reference-documentation)
- [Roadmap](#roadmap)

---

## Executive Summary

The Physicalized Agent represents a new approach to healthcare sensing: **an articulated sensor head that can track and respond to its environment** using bio-inspired continuum robot mechanics.

### The Product: Articulated Healthcare Sensor Head

Traditional camera mounts use rigid pan/tilt mechanisms. The Physicalized Agent uses a **Tendon-Driven Continuum Robot (TDCR) spine** — a flexible, segmented neck that moves like a biological structure:

- **Smooth, natural motion** via differential tendon tension
- **Infinite poses** within the workspace (vs. discrete pan/tilt angles)
- **Compliant interaction** — safe near patients
- **Bio-mimetic aesthetics** — less intimidating in healthcare settings

### The Process: Claude Code-Native Agentic System

Physicalized Agent doesn't wrap Claude in Python — **it makes Claude Code the runtime**:

| Traditional Approach | Physicalized Agent Approach |
|---------------------|----------------------------|
| Python agent classes | Claude Code Skills (SKILL.md) |
| Custom orchestrator | Conductor skill orchestrates natively |
| Stub tool functions | Real MCP servers (TypeScript) |
| Pydantic models | JSON Schemas validated by Claude |
| ROS dependency | ESP32 edge computing (standalone) |

---

## The Innovation: Continuum Robot Sensor Head

### The Articulation Problem

A sensor head needs to track audio/visual targets. Traditional approaches:

| Approach | Pros | Cons |
|----------|------|------|
| Fixed mount | Simple, cheap | No tracking |
| Pan/tilt servo | Tracking, cheap | Jerky motion, noise, uncanny |
| **TDCR spine** | Smooth, bio-mimetic, compliant | Complex control math |

### Tendon-Driven Continuum Robot Architecture

The TDCR uses:

```
                    SENSOR HEAD
                        │
                        ▼
    ╭─────╮  ← Spacer Disk (3D printed)
    ╭─────╮  ← NiTi backbone through center
    ╭─────╮  ← Tendons through disk holes (3x at 120°)
    ╭─────╮  ← Differential tension = bending
    ╭─────╮
        │
    ═══════  ← BASE (Actuation + Electronics)
```

**Key components:**
- **NiTi Backbone**: Superelastic nickel-titanium tube (1.0-1.4mm)
- **Spacer Disks**: 3D printed rings that maintain spacing and route tendons
- **Tendons**: Spectra fiber (high strength, low stretch)
- **Actuation**: 3x stepper motors with rack-and-pinion linear drives

### Piecewise Constant Curvature Model

The control mathematics use the **PCC model** — tractable for real-time ESP32 computation:

```
Segment curvature: κ, φ, s (curvature, bending plane, arc length)

Forward kinematics:
  T = Rz(φ) · Arc(κ, s) · Rz(-φ)

Tendon length mapping:
  ΔL_i = -κ · s · r · cos(φ - θ_i)

Where θ_i = tendon angular position (0°, 120°, 240°)
```

This maps desired head pose → tendon displacements → stepper positions.

---

## Claude Code-Native Architecture

### Skills ARE the Agents

Each sub-agent is defined as a Claude Code Skill with SKILL.md:

```
.claude/skills/
├── pa-conductor/      # The Conductor - orchestration intelligence
│   └── SKILL.md
├── pa-kinematics/     # Continuum robot mathematics
│   ├── SKILL.md
│   └── pcc-theory.md  # Domain knowledge
├── pa-firmware/       # ESP32 firmware development
│   └── SKILL.md
├── pa-mechanical/     # CAD and mechanical design
│   └── SKILL.md
├── pa-sensors/        # Camera + microphone integration
│   └── SKILL.md
└── pa-viz/            # Visualization
    └── SKILL.md
```

### MCP Servers ARE the Tools

Real TypeScript MCP servers provide capabilities:

```
mcp-servers/
├── kinematics/        # FK/IK computation, tendon mapping
├── hardware/          # ESP32 code generation, GPIO config
└── simulation/        # Motion simulation, workspace analysis
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLAUDE CODE RUNTIME                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    pa-conductor SKILL                        │   │
│   │        (Orchestration, State Management, Conflicts)          │   │
│   └─────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│         ┌───────────────────┼───────────────────┐                   │
│         ▼                   ▼                   ▼                   │
│   ┌───────────┐       ┌───────────┐       ┌───────────┐            │
│   │pa-kinemat │       │pa-firmware│       │pa-mechanic│   ...      │
│   │   SKILL   │       │   SKILL   │       │   SKILL   │            │
│   └─────┬─────┘       └─────┬─────┘       └─────┬─────┘            │
│         │                   │                   │                   │
├─────────┼───────────────────┼───────────────────┼───────────────────┤
│         ▼                   ▼                   ▼                   │
│   ┌───────────┐       ┌───────────┐       ┌───────────┐            │
│   │kinematics │       │ hardware  │       │simulation │            │
│   │MCP Server │       │MCP Server │       │MCP Server │   ...      │
│   └───────────┘       └───────────┘       └───────────┘            │
│                                                                     │
│                      MCP TOOL LAYER                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Hardware Architecture

### Compute & Control

```
┌─────────────────────────────────────────────────────────────────────┐
│                  ESP32-P4-WIFI6-M (Primary MCU)                     │
├─────────────────────────────────────────────────────────────────────┤
│  • Dual-Core RISC-V @ 400MHz                                        │
│  • 32MB PSRAM (critical for buffering)                             │
│  • MIPI-CSI → OV5647 (5MP Primary Camera)                          │
│  • DVP → OV2640 (2MP Secondary Camera)                             │
│  • I2S → INMP441 MEMS Microphones (x2)                             │
│  • GPIO → A4988/TMC2209 Stepper Drivers (x3)                       │
│  • SDIO 3.0 → ESP32-C6 (Wi-Fi 6 Coprocessor)                       │
│      └── WebTransport/QUIC → Cloud (GCP Cloud Run)                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Actuation (Low-Cost Stepper Approach)

```
Tendon Actuation via Rack-and-Pinion:
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────┐      ┌─────────┐      ┌─────────┐                 │
│  │ NEMA 17 │      │ NEMA 17 │      │ NEMA 17 │                 │
│  │ Stepper │      │ Stepper │      │ Stepper │                 │
│  └────┬────┘      └────┬────┘      └────┬────┘                 │
│       │                │                │                       │
│       ▼                ▼                ▼                       │
│    [Pinion]         [Pinion]         [Pinion]                  │
│       │                │                │                       │
│    ═══╪════         ═══╪════         ═══╪════  ← Racks         │
│       │                │                │                       │
│       ▼                ▼                ▼                       │
│    Tendon A         Tendon B         Tendon C                  │
│       │                │                │                       │
│       └────────────────┼────────────────┘                      │
│                        ▼                                        │
│              ┌─────────────────┐                               │
│              │  TDCR SPINE     │                               │
│              │  (5-7 disks)    │                               │
│              └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘

Cost: ~$54-69 (vs $270-360 for OpenCR brushless motors)
```

---

## The 5-Phase Pipeline

```
     User: "Design a sensor head with 45° bending range"
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: MECHANICAL DESIGN (pa-mechanical)                         │
│                                                                     │
│  • Spacer disk geometry (OD, ID, tendon holes)                     │
│  • Backbone selection (NiTi diameter, length)                      │
│  • Disk count and spacing                                          │
│  • Base platform and actuation housing                             │
│  • Sensor head shell with camera/mic mounts                        │
│                                                                     │
│  Output: STL files, BOM, assembly instructions                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 2: KINEMATICS VALIDATION (pa-kinematics)                     │
│                                                                     │
│  • Workspace analysis (reachable poses)                            │
│  • Forward kinematics verification                                 │
│  • Inverse kinematics for target poses                             │
│  • Tendon length limits and safety margins                         │
│                                                                     │
│  Output: Kinematic parameters, workspace visualization             │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 3: FIRMWARE DEVELOPMENT (pa-firmware)                        │
│                                                                     │
│  • Stepper control code (step/dir GPIO)                            │
│  • PCC kinematics implementation (ArduinoEigen)                    │
│  • Sensor integration (I2S mics, MIPI/DVP cameras)                 │
│  • DSP pipeline (FFT, audio localization)                          │
│  • WebTransport telemetry                                          │
│                                                                     │
│  Output: ESP-IDF project, flashable firmware                       │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 4: FABRICATION & ASSEMBLY                                    │
│                                                                     │
│  • 3D print spacer disks and base                                  │
│  • Assemble NiTi backbone with disks                               │
│  • Route and tension tendons                                       │
│  • Mount steppers with rack-and-pinion                             │
│  • Wire electronics, flash firmware                                │
│                                                                     │
│  Output: Physical prototype                                        │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 5: TESTING & CALIBRATION (pa-sensors)                        │
│                                                                     │
│  • Motion range verification                                       │
│  • Audio localization accuracy                                     │
│  • Visual tracking performance                                     │
│  • Governance logic validation                                     │
│                                                                     │
│  Decision: PASS → Production Package                               │
│            FAIL → Iterate with learned constraints                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Claude Code** with MCP support
- **Node.js** 20+ (for MCP servers)
- **ESP-IDF** 5.0+ (for firmware development)
- **FreeCAD** 0.21+ (optional, for mechanical design)
- **Anthropic API key**

### Installation

```bash
# Clone repository
git clone https://github.com/toneron2/physicalized-agent.git
cd physicalized-agent

# Install MCP servers
for server in kinematics hardware simulation; do
  cd mcp-servers/$server && npm install && npm run build && cd ../..
done

# Configure Claude Code to use skills
# The .claude/ directory is auto-detected
```

### Usage

Open Claude Code in the physicalized-agent directory. The skills are automatically available:

```
You: Design a TDCR sensor head with 6 spacer disks and 45° bending range

Claude: [Invokes pa-conductor skill]
        [Conductor orchestrates pa-mechanical → pa-kinematics → pa-firmware]
        [Generates STLs, firmware, assembly instructions]
        [Produces production package]
```

Or invoke skills directly:

```
You: /pa-kinematics Calculate tendon lengths for 30° bend at φ=45°

You: /pa-firmware Generate ESP32 stepper control for 3 tendons
```

---

## Project Structure

```
physicalized-agent/
├── .claude/
│   ├── skills/
│   │   ├── pa-conductor/SKILL.md    # Orchestration
│   │   ├── pa-kinematics/           # Continuum robot math
│   │   │   ├── SKILL.md
│   │   │   └── pcc-theory.md
│   │   ├── pa-firmware/SKILL.md     # ESP32 development
│   │   ├── pa-mechanical/SKILL.md   # CAD design
│   │   ├── pa-sensors/SKILL.md      # Sensor integration
│   │   └── pa-viz/SKILL.md          # Visualization
│   ├── settings.json                 # MCP server config
│   └── hooks/                        # Pipeline automation
├── mcp-servers/
│   ├── kinematics/                   # FK/IK computation
│   ├── hardware/                     # ESP32 code generation
│   └── simulation/                   # Motion simulation
├── schemas/
│   ├── request.schema.json
│   ├── constraint.schema.json
│   └── result.schema.json
├── artifacts/                        # Generated outputs
│   ├── geometry/
│   ├── firmware/
│   ├── simulation/
│   └── visualization/
├── docs/                             # Additional documentation
├── CLAUDE.md                         # Claude Code guidance
└── README.md
```

---

## Bill of Materials

### Target: ~$225 Total System

| Category | Component | Qty | Est. Cost |
|----------|-----------|-----|-----------|
| **Mechanical** | NiTi Backbone Tube (1.4mm) | 1 | ~$15 |
| | Spectra Tendon (McMaster 9442T4) | 1 roll | ~$10 |
| | V-Groove Pulleys | 6 | ~$8 |
| | Ball Bearings | 11 | ~$15 |
| | M6 Hardware | assorted | ~$10 |
| | 3D Printed Parts | - | ~$20 |
| **Actuation** | NEMA 17 Stepper Motor | 3 | ~$30 |
| | A4988/TMC2209 Driver | 3 | ~$9 |
| | Rack-and-Pinion Sets | 3 | ~$15 |
| | Linear Rails (MGN9) | 3 | ~$15 |
| **Electronics** | ESP32-P4-WIFI6-M | 1 | ~$25 |
| | OV5647 Camera (MIPI) | 1 | ~$15 |
| | OV2640 Camera (DVP) | 1 | ~$10 |
| | INMP441 MEMS Mic | 2 | ~$8 |
| **Acoustic** | Custom Horn Elements | - | ~$20 |
| | | | |
| **TOTAL** | | | **~$225** |

### Cost Comparison

| Approach | Actuation Cost | Total System |
|----------|---------------|--------------|
| OpenCR Original (T-Motor + encoders) | $270-360 | $400+ |
| **This Design (Stepper + rack-pinion)** | **$54-69** | **~$225** |

---

## Reference Documentation

### OpenCR-Hardware Analysis

Detailed applicability analysis of the OpenCR-Hardware repository for this project:
- **Analysis Document**: [`PROJECT_GREENFIELD_APPLICABILITY_ANALYSIS.md`](PROJECT_GREENFIELD_APPLICABILITY_ANALYSIS.md)
- **OpenCR Repository**: https://github.com/ContinuumRoboticsLab/OpenCR-Hardware

### Control Mathematics

- **tdcr-modeling** (C++ FK/IK): https://github.com/SvenLilge/tdcr-modeling
- **ArduinoEigen** (ESP32 matrix ops): https://github.com/hideakitai/ArduinoEigen
- **ESP-DSP** (signal processing): Part of ESP-IDF

### Key Publications

```bibtex
@article{GrassmannBurgner-Kahrs_et_al_Frontiers_2024,
    title   = {Open Continuum Robotics – One Actuation Module to Create them All},
    author  = {Grassmann, Reinhard M. and others},
    journal = {Frontiers in Robotics and AI},
    year    = {2024},
    doi     = {10.3389/frobt.2024.1272403}
}

@article{RaoBurgnerKahrs_Frontiers_2021,
    title   = {How to Model Tendon-Driven Continuum Robots and
               Benchmark Modelling Performance},
    author  = {Rao, Priyanka and others},
    journal = {Frontiers in Robotics and AI},
    year    = {2021},
    doi     = {10.3389/frobt.2020.630245}
}
```

---

## Roadmap

### Phase 1: Foundation (Current)
- [x] Project scaffolding with Claude Code skills
- [x] Applicability analysis for OpenCR-Hardware
- [x] Low-cost actuation design
- [ ] MCP server interfaces
- [ ] JSON schemas for manifests

### Phase 2: Core Implementation
- [ ] Kinematics skill with PCC model
- [ ] Mechanical design skill with parametric STLs
- [ ] Firmware skill with ESP32 code generation
- [ ] Stepper control implementation

### Phase 3: Hardware Integration
- [ ] 3D print and assemble first prototype
- [ ] ESP32 firmware flashing and testing
- [ ] Motion range calibration
- [ ] Sensor integration (cameras, mics)

### Phase 4: Advanced Features
- [ ] Audio source localization (ITD/ILD)
- [ ] Visual tracking integration
- [ ] Governance Engine state machine
- [ ] WebTransport cloud telemetry

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Bio-Mimetic Motion × Edge Computing × Agentic Design</b><br>
  <i>A sensor head that moves like nature intended</i>
</p>
