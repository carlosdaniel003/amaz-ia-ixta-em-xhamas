import { HOSE_RANGE } from './FireLogic.js';

/** The spray always ends on the same first-person ray used to damage fires. */
export function jetEndPoint(eye, direction, hitDistance = null, maxRange = HOSE_RANGE) {
  let distance = Number.isFinite(hitDistance)
    ? Math.max(0, Math.min(maxRange, hitDistance))
    : maxRange;
  // When aiming below the horizon, end the water visually at ground level.
  // A fire hit is in front of ground contact so keep the first collision.
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
