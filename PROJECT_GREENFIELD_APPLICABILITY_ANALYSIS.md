# OpenCR-Hardware Applicability Analysis for Project Greenfield
**Date:** January 2026 (Revised)
**Analysis Type:** Technical Feasibility Assessment
**Target:** "Physicalized Agent" Healthcare Sensor Head

---

## Executive Summary

**Revision note.** The first version of this analysis assessed the concept as a rigid two-axis pan/tilt mechanism. The concept sketch shows a segmented, spine-like neck, which maps to OpenCR's tendon-driven continuum robot (TDCR) architecture; the applicability figures below are for that reading. The frozen first specification (February 2026) nevertheless uses the two-axis gimbal; the neck is the articulated target.

The OpenCR-Hardware repository provides a **well-documented, open-source platform for modular continuum robotics** developed by the Continuum Robotics Laboratory at the University of Toronto. Combined with adjacent control mathematics repositories, this provides most of the mechanical and control foundation for the Physicalized Agent's articulated neck.

| Subsystem | Applicability | Reuse Potential | Notes |
|-----------|---------------|-----------------|-------|
| **Mechanical (Spine/Neck)** | Very high | 85-95% | TDCR spacer disks, backbone, tendon routing directly applicable |
| **Actuation** | High | 70-80% | Tendon actuation pattern reusable; motors replaceable with low-cost steppers |
| **Control Mathematics** | High | 60-70% | `tdcr-modeling` C++ library portable to ESP32 via ArduinoEigen |
| **Electronics** | Low | 20-30% | Different MCU ecosystem; patterns transferable |
| **Sensors** | None | 0% | No camera/microphone components |
| **Communication** | None | 0% | CAN bus vs. WebTransport; software adaptation required |

---

## The neck is a continuum robot

The concept sketch shows a **segmented, articulated neck** composed of ring-like segments, which is a continuum robot structure:

```
Concept Sketch Analysis:
┌─────────────────────────────────────────────────────────────┐
│  SENSOR HEAD (Oval)                                         │
│      │                                                      │
│      ▼                                                      │
│  ╭─────╮  ← Ring segment (= OpenCR "spacer disk")          │
│  ╭─────╮  ← Ring segment                                    │
│  ╭─────╮  ← Ring segment                                    │
│  ╭─────╮  ← Ring segment                                    │
│  ╭─────╮  ← Ring segment                                    │
│      │                                                      │
│  ═══════  ← BASE (Actuation housing)                       │
│                                                             │
│  MAPS DIRECTLY TO: OpenCR LOTR_TDCR-spatial                │
│  - NiTi flexible backbone through center                    │
│  - Tendons routed through disk holes                        │
│  - 3-DOF: 2-axis bending + rotation                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Mechanical Subsystem: TDCR Spine Architecture

### 1.1 Direct Component Mapping

| OpenCR Component | Greenfield Application | Reuse Level |
|------------------|------------------------|-------------|
| **Spacer Disks** (`FSD_20mm_bearing.stl`) | Neck ring segments | **DIRECT** - resize for aesthetic |
| **NiTi Backbone** (1.0-1.4mm tube) | Central spine flexibility | **DIRECT** |
| **Tendon Routing** (3x tendons through disks) | Articulation control | **DIRECT** |
| **Pulley System** | Tendon path optimization | **DIRECT** |
| **Base Platform** | Actuation housing | **ADAPT** for sensor head mount |
| **End Disk** (`FSDzero_20mm.stl`) | Head attachment point | **DIRECT** |

### 1.2 OpenCR TDCR-Spatial Specifications

From `mechanics/LOTR_TDCR-spatial/`:
- **Backbone**: NiTi tube (superelastic, biocompatible)
- **Spacer Disks**: 10-11 disks with bearing inserts for low-friction tendon routing
- **Tendons**: McMaster-Carr P/N 9442T4 (Spectra fiber, high strength-to-weight)
- **DOF**: 3 (2-axis bending via differential tendon tension + backbone rotation)

### 1.3 Adaptation for Greenfield

**Minimal Modifications Required:**
1. Scale disk diameter for aesthetic proportions (~25-35mm vs 20mm)
2. Add sensor head mounting interface to end disk
3. Design base enclosure to house actuation + ESP32-P4 electronics
4. Integrate acoustic elements into head shell

**STL Files Directly Reusable:**
- `FSD_20mm_bearing.stl` → Neck ring segments
- `FSD_bearing_inner.stl` → Bearing inserts
- `FSD_20mm_bearing_withoutDent.stl` → Base attachment disk
- `FSDzero_20mm.stl` → Head attachment disk
- `BasePlatform_PullyHolder.stl` → Tendon routing
- `BasePlatform_PulleyShaft.stl` → Pulley mounting

---

## 2. Actuation Subsystem: Low-Cost Stepper Alternative

### 2.1 OpenCR Original Design (Reference Only - Cost Prohibitive)

| Component | Qty | Unit Cost | Total | Notes |
|-----------|-----|-----------|-------|-------|
| T-Motor MN4004 | 3-4 | ~$30 | $90-120 | Brushless, high precision |
| Gear Motor (2662N313) | 3-4 | ~$10 | $30-40 | McMaster-Carr |
| Gear Encoder (2662N321) | 3-4 | ~$10 | $30-40 | McMaster-Carr |
| Avago AEDM-5810 | 3-4 | ~$40 | $120-160 | Optical encoder |
| **Total (OpenCR approach)** | | | **$270-360** | **Cost prohibitive** |

### 2.2 Recommended: Stepper + Rack-and-Pinion Linear Actuation

**Rationale:** Tendon actuation requires **linear displacement** (pulling tendons). A rack-and-pinion mechanism driven by stepper motors provides:
- Precise position control (steppers are inherently position-aware via step counting)
- No encoder required (open-loop sufficient for tendon tension)
- Lower cost
- ESP32 native control via step/direction GPIO

| Component | Qty | Unit Cost | Total | Source |
|-----------|-----|-----------|-------|--------|
| NEMA 17 Stepper Motor | 3 | ~$10 | $30 | Generic |
| Rack and Pinion Set | 3 | ~$5 | $15 | 3D printed rack + metal pinion |
| A4988/TMC2209 Driver | 3 | ~$3 | $9 | Generic stepper driver |
| Linear Rail (optional) | 3 | ~$5 | $15 | MGN9/MGN12 mini rail |
| **Total (Low-cost approach)** | | | **$54-69** | **~80% cost reduction** |

### 2.3 Stepper-Based Actuation Architecture

```
Tendon Actuation via Rack-and-Pinion:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐             │
│  │ NEMA 17 │      │ NEMA 17 │      │ NEMA 17 │             │
│  │ Stepper │      │ Stepper │      │ Stepper │             │
│  └────┬────┘      └────┬────┘      └────┬────┘             │
│       │                │                │                   │
│       ▼                ▼                ▼                   │
│    ╔══════╗         ╔══════╗         ╔══════╗              │
│    ║Pinion║         ║Pinion║         ║Pinion║              │
│    ╚══╤═══╝         ╚══╤═══╝         ╚══╤═══╝              │
│       │                │                │                   │
│    ═══╪════         ═══╪════         ═══╪════  ← Racks     │
│       │                │                │                   │
│       ▼                ▼                ▼                   │
│    Tendon A         Tendon B         Tendon C              │
│       │                │                │                   │
│       └────────────────┼────────────────┘                  │
│                        │                                    │
│                        ▼                                    │
│              ┌─────────────────┐                           │
│              │  SPINE SEGMENT  │                           │
│              │  (TDCR Disks)   │                           │
│              └─────────────────┘                           │
│                                                             │
│  ESP32-P4 Control:                                         │
│  └── GPIO Step/Dir → A4988/TMC2209 → NEMA 17              │
│  └── Position = Step Count (no encoder needed)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 ESP32-P4 Stepper Control Implementation

```c
// ESP-IDF stepper control (conceptual)
// Uses GPIO for step/direction - no MCPWM complexity

typedef struct {
    gpio_num_t step_pin;
    gpio_num_t dir_pin;
    int32_t position;  // Current step count
} stepper_t;

void stepper_move(stepper_t* s, int32_t steps) {
    gpio_set_level(s->dir_pin, steps > 0 ? 1 : 0);
    for (int i = 0; i < abs(steps); i++) {
        gpio_set_level(s->step_pin, 1);
        esp_rom_delay_us(100);  // Step pulse
        gpio_set_level(s->step_pin, 0);
        esp_rom_delay_us(100);
        s->position += (steps > 0) ? 1 : -1;
    }
}
```

---

## 3. Control Mathematics: ContinuumRoboticsLab Software

### 3.1 Adjacent Repositories

The ContinuumRoboticsLab GitHub organization provides essential control software:

| Repository | Language | Applicability | ESP32 Portable? |
|------------|----------|---------------|-----------------|
| **[tdcr-modeling](https://github.com/SvenLilge/tdcr-modeling)** | C++ (70%) | **HIGH** - FK/IK algorithms | Yes, via ArduinoEigen |
| **[CRVisToolkit](https://github.com/ContinuumRoboticsLab/CRVisToolkit)** | Python/MATLAB | LOW - Visualization | No |
| **[OpenTDCRContactModel](https://github.com/ContinuumRoboticsLab/OpenTDCRContactModel)** | Python/C++ | MODERATE - Contact modeling | Partial |

### 3.2 Piecewise Constant Curvature (PCC) Model

The **PCC model** is most suitable for embedded ESP32 implementation:

**Key Concept:** Robot backbone divided into arc segments of constant curvature.

**Parameters per segment:**
- κ (kappa): Curvature magnitude
- s: Arc length
- φ (phi): Bending plane angle

**Forward Kinematics (Closed-form, ESP32-suitable):**

```
For each segment:
  Transformation T = Rz(φ) · Arc(κ, s) · Rz(-φ)

Where Arc transform:
  Position: [sin(κs)/κ, 0, (1-cos(κs))/κ]
  Rotation: About bending axis by angle κs
```

**Tendon Length Mapping:**
```
For n tendons at radius r from backbone:
  ΔL_i = -κ · s · r · cos(φ - θ_i)

Where θ_i = tendon angular position (120° apart for 3 tendons)
```

### 3.3 ESP32 Implementation Strategy

**Dependencies:**
- **[ArduinoEigen](https://github.com/hideakitai/ArduinoEigen)**: Matrix operations on ESP32
- **ESP-DSP**: FFT and signal processing (already in Greenfield spec)

**Porting tdcr-modeling to ESP32:**

```cpp
// Simplified PCC Forward Kinematics for ESP32
#include <ArduinoEigen.h>

using namespace Eigen;

struct CurvatureParams {
    float kappa;  // Curvature
    float phi;    // Bending plane angle
    float s;      // Arc length
};

Matrix4f pcc_forward_kinematics(const CurvatureParams& params) {
    float k = params.kappa;
    float p = params.phi;
    float s = params.s;

    // Avoid division by zero for straight segments
    if (abs(k) < 1e-6f) {
        Matrix4f T = Matrix4f::Identity();
        T(2, 3) = s;  // Pure translation along z
        return T;
    }

    // Arc transformation
    float c_ks = cos(k * s);
    float s_ks = sin(k * s);
    float c_p = cos(p);
    float s_p = sin(p);

    Matrix4f T;
    T << c_p*c_p*(c_ks-1)+1,  s_p*c_p*(c_ks-1),    c_p*s_ks,  c_p*(1-c_ks)/k,
         s_p*c_p*(c_ks-1),    c_p*c_p*(1-c_ks)+c_ks, s_p*s_ks,  s_p*(1-c_ks)/k,
         -c_p*s_ks,           -s_p*s_ks,             c_ks,      s_ks/k,
         0,                   0,                     0,         1;

    return T;
}

// Convert desired curvature to tendon displacements
void curvature_to_tendon_lengths(
    const CurvatureParams& params,
    float tendon_radius,
    float* delta_L  // Output: 3 tendon length changes
) {
    float k = params.kappa;
    float p = params.phi;
    float s = params.s;

    // 3 tendons at 120° intervals
    for (int i = 0; i < 3; i++) {
        float theta_i = i * 2.0f * M_PI / 3.0f;
        delta_L[i] = -k * s * tendon_radius * cos(p - theta_i);
    }
}
```

### 3.4 Reference Publications

```bibtex
@article{RaoBurgnerKahrs_Frontiers_2021,
    title   = {How to Model Tendon-Driven Continuum Robots and
               Benchmark Modelling Performance},
    author  = {Rao, Priyanka and Peyron, Quentin and Lilge, Sven and
               Burgner-Kahrs, Jessica},
    journal = {Frontiers in Robotics and AI},
    volume  = {7},
    pages   = {630245},
    year    = {2021},
    doi     = {10.3389/frobt.2020.630245}
}
```

---

## 4. Sensor Integration (Unchanged - Greenfield Required)

OpenCR provides no sensor components. The following require custom development:

| Component | Interface | Custom CAD Required |
|-----------|-----------|---------------------|
| OV5647 Camera | MIPI-CSI | Head shell mount |
| OV2640 Camera | DVP | Head shell mount (stereo offset) |
| INMP441 Microphones (x2) | I2S | Acoustic horn enclosures |

**Integration Point:** End disk (`FSDzero_20mm.stl`) provides attachment interface for sensor head shell.

---

## 5. Communication Architecture Adaptation

### 5.1 OpenCR Original: CAN Bus to Host PC

```
OpenCR:  Actuators ←CAN→ TI LaunchPad ←CAN→ Host PC (ROS)
```

### 5.2 Greenfield Adaptation: ESP32 Edge + Cloud

```
Greenfield:  Actuators ←GPIO→ ESP32-P4 ←SDIO→ ESP32-C6 ←WiFi6→ Cloud
                              │
                              ├── Local Governance Engine
                              └── Kinematics (PCC model)
```

**Key Adaptation:** Move control logic from host PC to ESP32-P4 edge device.

The kinematics code from `tdcr-modeling` runs locally, enabling:
- Real-time spine articulation for audio/visual tracking
- Local "Safety Override" decisions
- Cloud receives telemetry vectors, not raw control commands

---

## 6. Revised Bill of Materials

### 6.1 Mechanical Components (from OpenCR + custom)

| Component | Qty | Est. Cost | Source |
|-----------|-----|-----------|--------|
| NiTi Backbone Tube (1.4mm) | 1 | ~$15 | Medical supply |
| Spectra Tendon (9442T4) | 1 roll | ~$10 | McMaster-Carr |
| V-Groove Pulleys | 6 | ~$8 | Amazon |
| Ball Bearings (57155K438) | 11 | ~$15 | McMaster-Carr |
| M6 Hardware | assorted | ~$10 | McMaster-Carr |
| 3D Printed Disks/Base | - | ~$20 | In-house FDM |
| **Subtotal (Mechanical)** | | **~$78** | |

### 6.2 Actuation (Low-Cost Stepper Approach)

| Component | Qty | Est. Cost | Source |
|-----------|-----|-----------|--------|
| NEMA 17 Stepper Motor | 3 | ~$30 | Generic |
| A4988/TMC2209 Driver | 3 | ~$9 | Generic |
| Rack-and-Pinion Sets | 3 | ~$15 | 3D printed + pinion |
| Linear Rails (MGN9) | 3 | ~$15 | Generic |
| **Subtotal (Actuation)** | | **~$69** | |

### 6.3 Electronics & Sensors

| Component | Qty | Est. Cost | Source |
|-----------|-----|-----------|--------|
| ESP32-P4-WIFI6-M | 1 | ~$25 | Waveshare |
| OV5647 Camera | 1 | ~$15 | Arducam |
| OV2640 Camera | 1 | ~$10 | Generic |
| INMP441 MEMS Mic | 2 | ~$8 | Generic |
| **Subtotal (Electronics)** | | **~$58** | |

### 6.4 Total Estimated BOM

| Category | Cost |
|----------|------|
| Mechanical (Spine) | $78 |
| Actuation (Steppers) | $69 |
| Electronics/Sensors | $58 |
| Acoustic Elements (custom) | ~$20 |
| **TOTAL** | **~$225** |

**Cost Comparison:**
- OpenCR original actuation: ~$270-360 (actuation alone)
- Greenfield low-cost approach: **~$225 (complete system)**

---

## 7. Revised Integration Path

### Phase 1: Spine Prototype

```
Tasks:
├── Procure NiTi backbone tube + Spectra tendons
├── 3D print spacer disks from OpenCR STLs (scale as needed)
├── Assemble 5-7 disk spine segment manually
├── Validate flexibility and tendon routing
└── Deliverable: Passive articulating spine
```

### Phase 2: Low-Cost Actuation Integration

```
Tasks:
├── Design/print rack-and-pinion linear actuators
├── Integrate NEMA 17 steppers with A4988 drivers
├── Wire steppers to ESP32-P4 GPIO
├── Implement basic step control firmware
├── Connect tendons to rack carriages
└── Deliverable: Motorized spine with manual commands
```

### Phase 3: Kinematics & Control

```
Tasks:
├── Port PCC forward kinematics to ESP32 (ArduinoEigen)
├── Implement tendon length mapping
├── Create inverse mapping (desired pose → tendon lengths)
├── Integrate with audio/visual tracking vectors
└── Deliverable: Autonomous spine tracking
```

### Phase 4: Sensor Head & Integration

```
Tasks:
├── Design sensor head shell with camera/mic mounts
├── Integrate acoustic horn enclosures
├── Attach head to spine end disk
├── Full system integration test
└── Deliverable: Complete Physicalized Agent prototype
```

---

## 8. Risk Assessment (Revised)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| NiTi backbone fatigue | Low | Medium | Use medical-grade tube; limit bend radius |
| Stepper missed steps | Medium | Low | Use TMC2209 (stealthChop); add limit switches |
| PCC model inaccuracy | Medium | Medium | Calibrate with real measurements; add correction |
| Tendon slip/stretch | Low | Medium | Use Spectra fiber; pre-tension during assembly |
| Head payload too heavy | Low | High | Minimize head mass; increase backbone diameter |

---

## 9. Conclusion (Revised)

The OpenCR-Hardware repository provides an **excellent foundation** for the Physicalized Agent's articulated spine/neck structure. The TDCR (Tendon-Driven Continuum Robot) designs map directly to the concept's segmented neck, with:

- **85-95% mechanical reuse** (spacer disks, backbone, tendon routing)
- **60-70% control software reuse** via `tdcr-modeling` C++ library
- **~80% cost reduction** by replacing expensive brushless motors with steppers

**Key Insight:** The concept sketch depicts a **continuum robot**, not a rigid pan/tilt mechanism. This insight transforms OpenCR from "partially applicable" to "highly applicable."

**Recommendation:** Proceed with OpenCR TDCR-spatial design as the primary mechanical reference, adapting actuation to low-cost steppers and porting kinematics to ESP32-P4.

---

## Appendix A: OpenCR Repository Structure (Prioritized)

```
OpenCR-Hardware/
├── mechanics/
│   ├── LOTR_TDCR-spatial/         ← PRIMARY REFERENCE
│   │   ├── stl_files/             (9 STL: disks, platform, pulleys)
│   │   ├── drawings/              (9 PDF technical drawings)
│   │   └── README.md              (Full BOM + step-by-step assembly)
│   ├── LearningKit_TDCR/          ← SECONDARY REFERENCE
│   │   ├── stl_files/             (17 STL: enhanced casing design)
│   │   └── README.md              (Assembly video link)
│   ├── actuation_module/          ← REFERENCE ONLY (cost prohibitive)
│   └── auxiliary_hardware/        ← USEFUL (stands, mounts)
├── electronics/
│   └── Ti_LaunchPad/              ← REFERENCE ONLY (different ecosystem)
└── README.md
```

## Appendix B: ContinuumRoboticsLab Software Repositories

| Repository | URL | Purpose |
|------------|-----|---------|
| **tdcr-modeling** | https://github.com/SvenLilge/tdcr-modeling | FK/IK algorithms (C++) |
| **CRVisToolkit** | https://github.com/ContinuumRoboticsLab/CRVisToolkit | Visualization |
| **OpenCR-Hardware** | https://github.com/ContinuumRoboticsLab/OpenCR-Hardware | This repo |

## Appendix C: Key Component Sources

- **NiTi Tube**: Medical supply (Euroflex, Fort Wayne Metals)
- **Spectra Tendon**: McMaster-Carr P/N 9442T4
- **V-Groove Pulleys**: Amazon (V623ZZ bearing type)
- **NEMA 17 Steppers**: Generic (42mm, 1.8°/step)
- **TMC2209 Drivers**: Generic (silent operation, stall detection)

## Appendix D: Reference Publications

```bibtex
@article{GrassmannBurgner-Kahrs_et_al_Frontiers_2024,
    title   = {Open Continuum Robotics – One Actuation Module to Create them All},
    author  = {Grassmann, Reinhard M. and Shentu, Chengnan and Hamoda, Taqi
               and Triana Dewi, Puspita and Burgner-Kahrs, Jessica},
    journal = {Frontiers in Robotics and AI},
    volume  = {11},
    pages   = {1272403},
    year    = {2024},
    doi     = {10.3389/frobt.2024.1272403}
}

@article{RaoBurgnerKahrs_Frontiers_2021,
    title   = {How to Model Tendon-Driven Continuum Robots and
               Benchmark Modelling Performance},
    author  = {Rao, Priyanka and Peyron, Quentin and Lilge, Sven and
               Burgner-Kahrs, Jessica},
    journal = {Frontiers in Robotics and AI},
    volume  = {7},
    pages   = {630245},
    year    = {2021},
    doi     = {10.3389/frobt.2020.630245}
}

@article{GrassmannFRobt2022,
    title   = {FAS—A Fully Actuated Segment for Tendon-Driven Continuum Robots},
    author  = {Grassmann, Reinhard M. and others},
    journal = {Frontiers in Robotics and AI},
    volume  = {9},
    pages   = {873446},
    year    = {2022},
    doi     = {10.3389/frobt.2022.873446}
}
```

---

*Analysis revised January 2026 to reflect continuum robot architecture insight.*
