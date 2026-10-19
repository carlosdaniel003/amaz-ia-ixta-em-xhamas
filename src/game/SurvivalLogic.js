/** Deterministic rules shared by the simulation and the unit tests. */
export const MAX_HEALTH = 100;
export const MAX_SMOKE = 100;
export const FIRE_CONTACT_RADIUS = 2.35;
export const SMOKE_RADIUS = 8;
export const RECOVERY_DELAY = 3;
export const FIRE_DAMAGE_RATE = 25;
export const SMOKE_DAMAGE_RATE = 11;
export const SMOKE_BUILD_RATE = 19;
export const SMOKE_CLEAR_RATE = 24;
export const HEAL_RATE = 6;
export const FIRE_REWARD = 30;
export const COMBO_BONUS = 6;
export const COMBO_LIMIT = 5;
export const COMBO_TIME = 14;
export const HIRE_COST = 110;
export const MUNICIPAL_COST = 220;
export const STATE_COST = 460;
export const MAX_HELPERS = 3;

export function exposureAt(fires, position) {
  let directFire = false;
  let smoke = 0;
  for (const fire of fires) {
    if (!fire.active) continue;
    const distance = Math.hypot(fire.x - position.x, fire.z - position.z);
    if (distance < FIRE_CONTACT_RADIUS) directFire = true;
    if (distance < SMOKE_RADIUS) smoke += (1 - distance / SMOKE_RADIUS) * 1.2;
  }
  return { directFire, smoke: Math.min(2.5, smoke) };
}

/** Enclosure requires substantial fire coverage in every direction, not just a nearby cluster. */
export function isEncircled(fires, position, radius = 6, sectors = 8) {
  let occupied = 0;
  for (let sector = 0; sector < sectors; sector++) {
    const angle = Math.PI * 2 * sector / sectors;
    const px = position.x + Math.cos(angle) * radius;
    const pz = position.z + Math.sin(angle) * radius;
    if (fires.some(fire => fire.active && Math.hypot(fire.x - px, fire.z - pz) < 4.2)) occupied++;
  }
  return occupied >= sectors - 1;
}

export function advanceSurvival(state, exposure, dt, surrounded = false) {
  const result = { ...state };
  if (dt <= 0 || result.health <= 0) return result;
  const unsafe = exposure.directFire || exposure.smoke > .12 || surrounded;
  result.safeTime = unsafe ? 0 : result.safeTime + dt;
  result.smoke = Math.max(0, Math.min(MAX_SMOKE, result.smoke + (exposure.smoke > .12 ? exposure.smoke * SMOKE_BUILD_RATE : -SMOKE_CLEAR_RATE) * dt));
  const fireDamage = exposure.directFire ? FIRE_DAMAGE_RATE * dt : 0;
  const smokeDamage = result.smoke >= 48 ? SMOKE_DAMAGE_RATE * (result.smoke / MAX_SMOKE) * dt : 0;
  const surroundDamage = surrounded ? 40 * dt : 0;
  result.health = Math.max(0, Math.min(MAX_HEALTH, result.health - fireDamage - smokeDamage - surroundDamage));
  if (result.safeTime >= RECOVERY_DELAY && result.smoke < 25) result.health = Math.min(MAX_HEALTH, result.health + HEAL_RATE * dt);
  return result;
}

export function extinguishReward(combo, secondsSinceLast) {
  const nextCombo = secondsSinceLast < COMBO_TIME ? Math.min(COMBO_LIMIT, combo + 1) : 1;
  return { combo: nextCombo, coins: FIRE_REWARD + (nextCombo - 1) * COMBO_BONUS };
}

export function canBuy(coins, cost, helpers = 0, type = 'hire') {
  return coins >= cost && (type !== 'hire' || helpers < MAX_HELPERS);
}

export function validSpreadPosition(fires, x, z, canOccupy, radius = 40) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > radius || Math.abs(z) > radius || !canOccupy(x, z)) return false;
  return !fires.some(fire => fire.active && (fire.x - x) ** 2 + (fire.z - z) ** 2 < 18);
}
