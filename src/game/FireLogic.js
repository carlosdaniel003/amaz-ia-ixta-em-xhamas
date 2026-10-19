/** Pure gameplay rules, independent from the 3D renderer. */
export const FIRE_HEALTH = 100;
export const WATER_DAMAGE_PER_SECOND = 48;
export const HOSE_RANGE = 12;

export function applyWater(fires, position, direction, delta) {
  const extinguished = [];
  if (delta <= 0) return extinguished;
  for (const fire of fires) {
    if (!fire.active) continue;
    const dx = fire.x - position.x;
    const dz = fire.z - position.z;
    const forward = dx * direction.x + dz * direction.z;
    if (forward < 0 || forward > HOSE_RANGE) continue;
    const side = Math.abs(dx * direction.z - dz * direction.x);
    if (side > 1.35 + forward * .075) continue;
    fire.health = Math.max(0, fire.health - WATER_DAMAGE_PER_SECOND * delta);
    if (fire.health === 0) {
      fire.active = false;
      extinguished.push(fire);
    }
  }
  return extinguished;
}

export function findNearestFire(fires, position, maxRange = 18) {
  let best = null;
  let shortest = maxRange * maxRange;
  for (const fire of fires) {
    if (!fire.active) continue;
    const distance = (fire.x - position.x) ** 2 + (fire.z - position.z) ** 2;
    if (distance < shortest) { shortest = distance; best = fire; }
  }
  return best;
}
