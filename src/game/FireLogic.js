/** Pure gameplay rules, independent from the 3D renderer. */
export const FIRE_HEALTH = 100;
export const WATER_DAMAGE_PER_SECOND = 48;
export const HOSE_RANGE = 12;

/** Single shared FPS hit test: the reticle, water stream and fire damage use this ray. */
export function findAimedFire(fires, position, direction, maxRange = HOSE_RANGE) {
  if (!Number.isFinite(position.y) || !Number.isFinite(direction.y)) return null;
  let best = null;
  let bestDistance = maxRange + 1;
  for (const fire of fires) {
    if (!fire.active) continue;
    const dx = fire.x - position.x;
    const dy = 1.45 - position.y;
    const dz = fire.z - position.z;
    const forward = dx * direction.x + dy * direction.y + dz * direction.z;
    if (forward <= 0 || forward > maxRange || forward >= bestDistance) continue;
    const perpendicularSq = Math.max(0, dx * dx + dy * dy + dz * dz - forward * forward);
    const tolerance = 1.1 + forward * .075;
    if (perpendicularSq <= tolerance * tolerance) {
      best = fire;
      bestDistance = forward;
    }
  }
  return best ? { fire: best, distance: bestDistance } : null;
}

export function applyWater(fires, position, direction, delta, multiplier = 1) {
  if (delta <= 0) return [];
  const extinguished = [];

  if (Number.isFinite(position.y) && Number.isFinite(direction.y)) {
    // Only the closest focus under the central reticle receives player water.
    const hit = findAimedFire(fires, position, direction);
    if (!hit) return extinguished;
    const fire = hit.fire;
    fire.health = Math.max(0, fire.health - WATER_DAMAGE_PER_SECOND * delta * multiplier);
    if (fire.health === 0) { fire.active = false; extinguished.push(fire); }
    return extinguished;
  }

  // Keep autonomous allies' existing ground-plane hose behavior.
  for (const fire of fires) {
    if (!fire.active) continue;
    const dx = fire.x - position.x;
    const dz = fire.z - position.z;
    const forward = dx * direction.x + dz * direction.z;
    if (forward < 0 || forward > HOSE_RANGE) continue;
    const side = Math.abs(dx * direction.z - dz * direction.x);
    if (side > 1.35 + forward * .075) continue;
    fire.health = Math.max(0, fire.health - WATER_DAMAGE_PER_SECOND * delta * multiplier);
    if (fire.health === 0) { fire.active = false; extinguished.push(fire); }
  }
  return extinguished;
}

export function applyWaterArea(fires, x, z, radius, damage) {
  const extinguished = [];
  if (radius <= 0 || damage <= 0) return extinguished;
  for (const fire of fires) {
    if (!fire.active) continue;
    const distance = Math.hypot(fire.x - x, fire.z - z);
    if (distance > radius) continue;
    fire.health = Math.max(0, fire.health - damage * Math.max(.25, 1 - distance / (radius * 1.25)));
    if (fire.health === 0) { fire.active = false; extinguished.push(fire); }
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
