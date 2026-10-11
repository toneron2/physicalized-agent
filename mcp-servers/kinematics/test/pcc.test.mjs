import { test } from "node:test";
import assert from "node:assert/strict";
import { pccPose, pccPosition, pccInverse, tendonDeltas, STRAIGHT_EPSILON } from "../dist/pcc.js";

const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

test("forward kinematics matches the PCC arc formulas", () => {
  const { position, rotation, bend_angle_rad } = pccPose(8, 0, 0.1);
  assert.ok(close(position[0], (1 - Math.cos(0.8)) / 8));
  assert.ok(close(position[1], 0));
  assert.ok(close(position[2], Math.sin(0.8) / 8));
  assert.ok(close(bend_angle_rad, 0.8));
  // Rotation is Ry(θ) when φ = 0
  assert.ok(close(rotation[0][2], Math.sin(0.8)));
  assert.ok(close(rotation[2][2], Math.cos(0.8)));
});

test("rotation is a proper rotation for every bending plane", () => {
  for (const phi of [0, 0.7, Math.PI / 2, 2.3, -1.1]) {
    const { rotation: R } = pccPose(20, phi, 0.1);
    // R·Rᵀ = I
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const dot = R[i][0] * R[j][0] + R[i][1] * R[j][1] + R[i][2] * R[j][2];
        assert.ok(close(dot, i === j ? 1 : 0), `R·Rᵀ[${i}][${j}] at φ=${phi}`);
      }
    }
    // The rotated Z axis must point along the arc tangent at the tip
    const tangent = [Math.cos(phi) * Math.sin(2), Math.sin(phi) * Math.sin(2), Math.cos(2)];
    for (let i = 0; i < 3; i++) assert.ok(close(R[i][2], tangent[i]), `tangent[${i}] at φ=${phi}`);
  }
});

test("position is continuous across the straight-segment threshold", () => {
  // Series branch just below the threshold, exact branch just above it.
  const below = pccPosition(STRAIGHT_EPSILON * (1 - 1e-9), 0.3, 0.1);
  const above = pccPosition(STRAIGHT_EPSILON * (1 + 1e-9), 0.3, 0.1);
  for (let i = 0; i < 3; i++) assert.ok(close(below[i], above[i], 1e-13), `axis ${i}`);
  assert.deepEqual(pccPosition(0, 1.2, 0.1), [0, 0, 0.1]);
});

test("inverse kinematics round-trips forward kinematics", () => {
  const s = 0.1;
  // Bend angles up to π (κ·s ≤ π); beyond that the tip direction wraps and the
  // closed form cannot distinguish a 200° bend from a −160° one.
  for (const kappa of [0, 0.5, 5, 20, 30]) {
    for (const phi of [0, 0.4, 1.5, 3.0, -2.2]) {
      const target = pccPosition(kappa, phi, s);
      const sol = pccInverse(target, s);
      assert.ok(close(sol.kappa, kappa, 1e-7), `κ for (${kappa}, ${phi})`);
      if (kappa > 0) {
        const dphi = Math.atan2(Math.sin(sol.phi - phi), Math.cos(sol.phi - phi));
        assert.ok(close(dphi, 0, 1e-7), `φ for (${kappa}, ${phi})`);
      }
      assert.ok(sol.residual_m < 1e-9, `residual for (${kappa}, ${phi})`);
    }
  }
});

test("inverse kinematics reports a residual for an unreachable target", () => {
  // Straight ahead but shorter than the segment: direction is reachable, distance is not.
  const sol = pccInverse([0, 0, 0.05], 0.1);
  assert.ok(close(sol.kappa, 0));
  assert.ok(close(sol.residual_m, 0.05));
});

test("tendon deltas sum to zero and match the skill's worked example", () => {
  // κ=10, φ=45°, s=0.1, r=0.01 → [-7.07, -2.59, +9.66] mm
  const mm = tendonDeltas(10, Math.PI / 4, 0.1, 0.01, 3).map((d) => d * 1000);
  assert.ok(close(mm[0], -7.071, 1e-3));
  assert.ok(close(mm[1], -2.588, 1e-3));
  assert.ok(close(mm[2], 9.659, 1e-3));
  for (const n of [3, 4, 5, 6]) {
    const sum = tendonDeltas(30, 1.1, 0.1, 0.01, n).reduce((a, b) => a + b, 0);
    assert.ok(close(sum, 0, 1e-12), `sum for n=${n}`);
  }
});
