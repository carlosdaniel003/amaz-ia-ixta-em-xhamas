import { SMOKE_RADIUS } from './SurvivalLogic.js';

// Six low-lying smoke wisps per fire, all inside the same exposure radius
// used by the survival system. They reveal the hazard rather than inventing one.
export const DENSE_SMOKE_PER_FIRE = 6;
export const DENSE_SMOKE_UPDATE_INTERVAL = 0.14;

export function nearbySmokeFires(fires, player, limit, visibilityRange = 34) {
  const maxDistanceSq = visibilityRange * visibilityRange;
  const nearby = [];
  for (const fire of fires) {
    if (!fire.active) continue;
    const dx = fire.x - player.x;
    const dz = fire.z - player.z;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq <= maxDistanceSq) nearby.push({ fire, distanceSq });
  }
  nearby.sort((a, b) => a.distanceSq - b.distanceSq);
  return nearby.slice(0, Math.max(0, limit)).map(entry => entry.fire);
}

/** Produces gentle motion without shifting wisps outside actual smoke zones. */
export function denseSmokePosition(fire, index, time) {
  const slot = index % DENSE_SMOKE_PER_FIRE;
  const distance = [0.65, 2.0, 3.4, 4.7, 5.8, 6.65][slot];
  const angle = slot * 2.39996 + fire.x * .53 + fire.z * .31 + time * .095;
  const position = {
    x: fire.x + Math.cos(angle) * distance,
    y: 1.2 + (slot % 3) * .72 + Math.sin(time * .6 + slot) * .18,
    z: fire.z + Math.sin(angle) * distance,
  };
  // Kept by construction within the smoke-exposure radius, regardless of wind.
  return position;
}

export function smokePositionWithinHazard(fire, position) {
  return Math.hypot(position.x - fire.x, position.z - fire.z) < SMOKE_RADIUS;
}
