import { HOSE_RANGE } from './FireLogic.js';

/** The center reticle still decides whether fire is struck. */
export function jetEndPoint(eye, direction, hitDistance = null, maxRange = HOSE_RANGE) {
  let distance = Number.isFinite(hitDistance)
    ? Math.max(0, Math.min(maxRange, hitDistance))
    : maxRange;
  if (direction.y < -0.001) {
    const groundDistance = (0.20 - eye.y) / direction.y;
    if (groundDistance > 0) distance = Math.min(distance, groundDistance);
  }
  return {
    x: eye.x + direction.x * distance,
    y: eye.y + direction.y * distance,
    z: eye.z + direction.z * distance,
    distance,
  };
}

/** The active target is the real fire; the jet must visually reach that same fire. */
export function waterImpactPoint(eye, direction, hit = null) {
  if (hit?.fire) return { x: hit.fire.x, y: 1.45, z: hit.fire.z };
  return jetEndPoint(eye, direction);
}

/**
 * Gravity-like trajectory that passes through the nozzle and the impact.
 * Its arc is equivalent to constant downward acceleration with an adjusted
 * launch angle; an aimed target is never missed by decorative particles.
 */
export function curvedWaterPoint(nozzle, impact, progress) {
  const t = Math.max(0, Math.min(1, progress));
  const distance = Math.hypot(impact.x - nozzle.x, impact.z - nozzle.z);
  const arc = Math.min(1.05, .12 + distance * .07);
  return {
    x: nozzle.x + (impact.x - nozzle.x) * t,
    y: nozzle.y + (impact.y - nozzle.y) * t + 4 * arc * t * (1 - t),
    z: nozzle.z + (impact.z - nozzle.z) * t,
  };
}
