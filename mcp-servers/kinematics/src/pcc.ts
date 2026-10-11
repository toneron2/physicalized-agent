/**
 * Piecewise Constant Curvature (PCC) model for a single TDCR segment.
 *
 * Conventions (match .claude/skills/pa-kinematics/pcc-theory.md):
 * - The segment base is at the origin with the backbone along +Z.
 * - κ is curvature in 1/m, φ the bending-plane angle in radians measured
 *   from +X, s the arc length in metres.
 * - T(κ, φ, s) = Rz(φ) · T_arc(κ, s) · Rz(−φ), so the tip bends toward the
 *   direction (cos φ, sin φ) in the XY plane.
 */

export type Vec3 = [number, number, number];
export type Mat3 = [Vec3, Vec3, Vec3];

/**
 * Below this curvature the arc offsets use their Taylor series: the exact
 * (1 − cos κs)/κ loses digits to cancellation long before κ reaches zero,
 * while the series is accurate to ~1e-16 relative at this threshold.
 */
export const STRAIGHT_EPSILON = 1e-4;

export interface Pose {
  position: Vec3;
  rotation: Mat3;
  /** Total bend angle θ = κ·s in radians. */
  bend_angle_rad: number;
}

/** Lateral offset (1 − cos κs)/κ and axial advance sin(κs)/κ, with Taylor forms near κ = 0. */
function arcOffsets(kappa: number, s: number): { lateral: number; axial: number } {
  if (Math.abs(kappa) < STRAIGHT_EPSILON) {
    const ks = kappa * s;
    return {
      lateral: (s * ks) / 2 - (s * ks * ks * ks) / 24,
      axial: s - (s * ks * ks) / 6 + (s * ks * ks * ks * ks) / 120,
    };
  }
  const theta = kappa * s;
  return {
    lateral: (1 - Math.cos(theta)) / kappa,
    axial: Math.sin(theta) / kappa,
  };
}

/** Tip position of a single PCC segment. */
export function pccPosition(kappa: number, phi: number, s: number): Vec3 {
  const { lateral, axial } = arcOffsets(kappa, s);
  return [Math.cos(phi) * lateral, Math.sin(phi) * lateral, axial];
}

/** Tip pose of a single PCC segment: position plus the full Rz(φ)·Ry(κs)·Rz(−φ) rotation. */
export function pccPose(kappa: number, phi: number, s: number): Pose {
  const position = pccPosition(kappa, phi, s);
  const theta = kappa * s;
  const c_t = Math.cos(theta);
  const s_t = Math.sin(theta);
  const c_p = Math.cos(phi);
  const s_p = Math.sin(phi);

  const rotation: Mat3 = [
    [c_p * c_p * (c_t - 1) + 1, s_p * c_p * (c_t - 1), c_p * s_t],
    [s_p * c_p * (c_t - 1), s_p * s_p * (c_t - 1) + 1, s_p * s_t],
    [-c_p * s_t, -s_p * s_t, c_t],
  ];

  return { position, rotation, bend_angle_rad: theta };
}

export interface InverseSolution {
  kappa: number;
  phi: number;
  bend_angle_rad: number;
  /** Where the tip actually lands for (κ, φ, s). */
  achieved_position: Vec3;
  /** Distance between the target and the achieved tip position, in metres. */
  residual_m: number;
}

/**
 * Closed-form single-segment inverse kinematics.
 *
 * A fixed-length PCC segment reaches a surface, not a volume, so the solver
 * returns the configuration whose tip lies along the target's direction from
 * the base: θ = 2·atan2(r, z) with r = √(x² + y²), κ = θ/s, φ = atan2(y, x).
 * When the target is on the reachable surface the residual is zero; otherwise
 * the tip points at the target but at the segment's own reach, and the caller
 * decides from `residual_m` whether that is acceptable.
 */
export function pccInverse(target: Vec3, s: number): InverseSolution {
  const [x, y, z] = target;
  const r = Math.hypot(x, y);
  const phi = r < STRAIGHT_EPSILON ? 0 : Math.atan2(y, x);
  const theta = 2 * Math.atan2(r, z);
  const kappa = theta / s;

  const achieved = pccPosition(kappa, phi, s);
  const residual = Math.hypot(achieved[0] - x, achieved[1] - y, achieved[2] - z);

  return { kappa, phi, bend_angle_rad: theta, achieved_position: achieved, residual_m: residual };
}

/** Angular positions of n tendons spaced evenly around the backbone, tendon 0 at +X. */
export function tendonAngles(n: number): number[] {
  return Array.from({ length: n }, (_, i) => (i * 2 * Math.PI) / n);
}

/**
 * Tendon length changes ΔL_i = −κ·s·r·cos(φ − θ_i) in metres.
 * Negative means the tendon shortens (is pulled).
 */
export function tendonDeltas(
  kappa: number,
  phi: number,
  s: number,
  radius: number,
  n: number
): number[] {
  return tendonAngles(n).map((theta_i) => -kappa * s * radius * Math.cos(phi - theta_i));
}

/** Round to a fixed number of decimals, returning a number rather than a string. */
export function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
