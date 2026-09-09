# Piecewise Constant Curvature (PCC) Theory

Reference document for continuum robot kinematics in the Physicalized Agent.

## Mathematical Foundation

### Configuration Space

A single TDCR segment is parameterized by:

| Parameter | Symbol | Units | Description |
|-----------|--------|-------|-------------|
| Curvature | κ | 1/m | Inverse of bend radius |
| Bending plane | φ | rad | Angle of bending direction |
| Arc length | s | m | Length of the segment |

**Alternative parameterization (used in some papers):**
- θ = κ·s (total bend angle)
- φ (same bending plane)
- s (same arc length)

### Forward Kinematics

The transformation matrix for a single PCC segment:

```
T(κ, φ, s) = Rz(φ) · T_arc(κ, s) · Rz(-φ)
```

Where T_arc is the arc transformation:

```
         ⎡ cos(κs)   0   sin(κs)    (1-cos(κs))/κ ⎤
T_arc =  ⎢    0      1      0             0       ⎥
         ⎢-sin(κs)   0   cos(κs)      sin(κs)/κ   ⎥
         ⎣    0      0      0             1       ⎦
```

**Special case (κ → 0, straight segment):**
```
         ⎡ 1  0  0  0 ⎤
T_arc =  ⎢ 0  1  0  0 ⎥
         ⎢ 0  0  1  s ⎥
         ⎣ 0  0  0  1 ⎦
```

### Tendon Length Mapping

For n tendons arranged at radius r from the backbone:

```
ΔL_i = -κ · s · r · cos(φ - θ_i)
```

Where θ_i is the angular position of tendon i.

**For 3 tendons at 120° intervals:**
- Tendon 0: θ₀ = 0°
- Tendon 1: θ₁ = 120°
- Tendon 2: θ₂ = 240°

**Matrix form:**
```
⎡ ΔL₀ ⎤       ⎡ cos(φ - 0°)   ⎤
⎢ ΔL₁ ⎥ = -κsr⎢ cos(φ - 120°) ⎥
⎣ ΔL₂ ⎦       ⎣ cos(φ - 240°) ⎦
```

### Inverse Mapping (Tendon → Curvature)

Given tendon length changes, solve for κ and φ:

**For 3 tendons:**
```
A = ΔL₁ - ΔL₀
B = ΔL₂ - ΔL₀

φ = atan2(√3 · (ΔL₂ - ΔL₁), 2·ΔL₀ - ΔL₁ - ΔL₂)
κ = (2/3) · (ΔL₀·cos(φ) + ΔL₁·cos(φ-120°) + ΔL₂·cos(φ-240°)) / (s·r)
```

## Physical Constraints

### Curvature Limits

**NiTi backbone strain limit:**
- Yield strain: ~8% (superelastic region)
- Max curvature: κ_max = ε_yield / (d/2)
- For d = 1.4mm: κ_max ≈ 114 /m

**Operating margin:**
- Use κ_operating = 0.7 × κ_max for safety
- κ_operating ≈ 80 /m for 1.4mm NiTi

### Tendon Constraints

**No slack condition:**
- All tendons must maintain positive tension
- At least one tendon shortens (ΔL < 0) for any bend

**Stretch limit (Spectra fiber):**
- Max elongation: ~3%
- For 100mm tendon: max stretch ~3mm

### Workspace

**Single segment workspace:**
- Hemispherical shell
- Inner radius: s × cos(κ_max × s)
- Outer radius: s

**Effective reach:**
- For s = 100mm, κ_max = 80/m
- Max tip deflection: ~37mm from straight axis

## Implementation Notes

### Numerical Stability

**Near-zero curvature:**
```c
if (fabs(kappa) < 1e-6f) {
    // Use Taylor series approximation
    // sin(κs)/κ ≈ s - κ²s³/6
    // (1-cos(κs))/κ ≈ κs²/2
}
```

**Matrix operations:**
- Use ArduinoEigen for ESP32
- Single precision (float) sufficient for control
- Avoid matrix inversion; use pseudo-inverse

### Control Loop

**Typical update rate:** 50-100 Hz

```
1. Read desired pose (from sensor fusion)
2. Compute inverse kinematics → (κ, φ)
3. Compute tendon lengths → ΔL[3]
4. Convert to stepper steps
5. Command steppers
6. Read encoder feedback (if available)
7. Repeat
```

## References

1. Rao, P., et al. "How to Model Tendon-Driven Continuum Robots and Benchmark Modelling Performance." *Frontiers in Robotics and AI*, 2021.

2. Webster, R.J., Jones, B.A. "Design and Kinematic Modeling of Constant Curvature Continuum Robots: A Review." *Int. J. Robotics Research*, 2010.

3. Grassmann, R.M., et al. "Open Continuum Robotics – One Actuation Module to Create them All." *Frontiers in Robotics and AI*, 2024.
