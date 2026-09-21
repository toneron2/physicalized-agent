# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Physicalized Agent is the design system for a healthcare sensor head, built on Claude Code: skills are the agents, MCP servers are the tools. The articulated target is a tendon-driven continuum robot (TDCR) neck; the frozen first specification is a two-axis gimbal outside the head.

**Target Hardware:**
- ESP32-P4-WIFI6-M primary MCU (edge computing, not ROS)
- Tendon-Driven Continuum Robot (TDCR) spine architecture — the articulated target; the frozen first specification (`docs/functional-spec-2026-02.md`) is a two-axis gimbal outside the head
- Low-cost stepper + rack-and-pinion actuation (~$54-69)
- Camera + microphone sensor payload
- Target total BOM: ~$225

## Architecture Principles

1. **Skills ARE the agents** — Each sub-agent is a `.claude/skills/*/SKILL.md` file
2. **MCP servers ARE the tools** — Real TypeScript servers in `mcp-servers/`
3. **Claude Code IS the runtime** — No custom Python orchestrator needed
4. **JSON schemas for validation** — `schemas/*.schema.json` for manifests

## Skills (Agents)

| Skill | Purpose | Key Tools |
|-------|---------|-----------|
| `pa-conductor` | Orchestrate pipeline, manage state, resolve conflicts | All skills |
| `pa-kinematics` | Continuum robot FK/IK, PCC model, tendon length mapping | `mcp__kinematics__*` |
| `pa-firmware` | ESP32 firmware development, stepper control, sensor integration | `mcp__hardware__*` |
| `pa-mechanical` | CAD design for spacer disks, tendons, actuation, enclosures | `mcp__simulation__*` |
| `pa-sensors` | Camera/microphone integration, DSP pipeline | `mcp__hardware__*` |
| `pa-viz` | Generate visualizations, kinematics animations | `mcp__simulation__*` |

## Key Files

- `.claude/skills/*/SKILL.md` — Agent definitions with domain expertise
- `.claude/settings.json` — MCP server configuration
- `schemas/*.schema.json` — Manifest validation schemas
- `mcp-servers/*/src/index.ts` — MCP tool implementations

## Reference Documentation

The detailed applicability analysis linking OpenCR-Hardware to this project is available at:
- **In this repo**: `PROJECT_GREENFIELD_APPLICABILITY_ANALYSIS.md`
- **Original repo**: https://github.com/ContinuumRoboticsLab/OpenCR-Hardware

Key external repositories for control mathematics:
- **tdcr-modeling**: https://github.com/SvenLilge/tdcr-modeling (C++ FK/IK algorithms)
- **ArduinoEigen**: https://github.com/hideakitai/ArduinoEigen (Matrix ops for ESP32)

## Working with This Project

**To invoke the full pipeline:**
```
Design a TDCR sensor head with [X] spacer disks and [Y] degree bending range
```

**To invoke individual skills:**
```
/pa-kinematics Calculate tendon lengths for 30° bend in XZ plane
/pa-firmware Generate stepper control code for 3-tendon actuation
/pa-mechanical Design spacer disk with 25mm OD and 3 tendon channels
```

## Development

**Building MCP servers:**
```bash
cd mcp-servers/<server> && npm install && npm run build
```

**Adding new tools:**
1. Add tool definition in `mcp-servers/<server>/src/index.ts`
2. Register in server's tool list
3. Add to appropriate skill's `allowed-tools` in SKILL.md

**Adding new skills:**
1. Create `.claude/skills/<skill-name>/SKILL.md`
2. Include YAML frontmatter with `name`, `description`, `allowed-tools`
3. Write domain expertise as natural language instructions

## Manifest Schemas

All agent communication uses JSON validated against:
- `schemas/request.schema.json` — Goals and specifications
- `schemas/constraint.schema.json` — Boundaries and limits (cost, size, etc.)
- `schemas/result.schema.json` — Outputs with scores and artifacts

## State Management

State is stored in `artifacts/state.json` (not SQLite). The Conductor reads/writes this file directly. Format:

```json
{
  "project_id": "uuid",
  "phase": "design|simulation|fabrication|assembly|testing",
  "iteration": 1,
  "best_score": 0.0,
  "bom_cost_usd": 0.0,
  "target_bom_usd": 225.0,
  "history": [...]
}
```

## Hardware Constraints

- **Cost ceiling**: ~$225 total BOM
- **Actuation budget**: ~$54-69 (3x NEMA 17 + drivers + rack-and-pinion)
- **Compute**: ESP32-P4-WIFI6-M (~$25)
- **Sensors**: OV5647 + OV2640 + 2x Knowles SPH645LM4H (the frozen BOM; the PRD says INMP441) (~$33)
- **Mechanical**: NiTi backbone + Spectra tendons + 3D printed disks (~$78)
