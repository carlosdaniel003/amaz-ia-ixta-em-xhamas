import test from 'node:test';
import assert from 'node:assert/strict';
import { exposureAt, advanceSurvival, isEncircled, extinguishReward, canBuy, validSpreadPosition, HIRE_COST, MUNICIPAL_COST, STATE_COST } from '../src/game/SurvivalLogic.js';
import { applyWaterArea } from '../src/game/FireLogic.js';

const fire = (x, z) => ({ x, z, health: 100, active: true });
const clear = { directFire: false, smoke: 0 };

test('contact with flame removes health, and resting safely permits recovery', () => {
  const damaged = advanceSurvival({ health: 100, smoke: 0, safeTime: 0 }, { directFire: true, smoke: .5 }, 1);
  assert.ok(damaged.health < 100);
  assert.equal(damaged.safeTime, 0);
  const recovered = advanceSurvival({ health: 70, smoke: 0, safeTime: 2.5 }, clear, 2);
  assert.ok(recovered.health > 70);
  assert.equal(advanceSurvival({ health: 0, smoke: 0, safeTime: 0 }, clear, 10).health, 0);
});

test('smoke accumulates near active flames and dissipates away from danger', () => {
  const exposure = exposureAt([fire(0, 4), fire(2, 5)], { x: 0, z: 0 });
  assert.ok(exposure.smoke > 0);
  assert.equal(exposure.directFire, false);
  const intoxicated = advanceSurvival({ health: 100, smoke: 80, safeTime: 0 }, exposure, 1);
  assert.ok(intoxicated.health < 100);
  const clearing = advanceSurvival(intoxicated, clear, 2);
  assert.ok(clearing.smoke < intoxicated.smoke);
});

test('surrounding fires are dangerous, one nearby fire is not a trap', () => {
  const circle = Array.from({ length: 8 }, (_, i) => fire(Math.cos(i * Math.PI / 4) * 6, Math.sin(i * Math.PI / 4) * 6));
  assert.equal(isEncircled(circle, { x: 0, z: 0 }), true);
  assert.equal(isEncircled(circle.slice(0, 2), { x: 0, z: 0 }), false);
  const hurt = advanceSurvival({ health: 50, smoke: 0, safeTime: 0 }, clear, 1, true);
  assert.equal(hurt.health, 10);
});

test('shop never allows overspending and helper capacity is limited', () => {
  assert.equal(canBuy(109, HIRE_COST, 0), false);
  assert.equal(canBuy(110, HIRE_COST, 0), true);
  assert.equal(canBuy(200, HIRE_COST, 3), false);
  assert.equal(canBuy(219, MUNICIPAL_COST, 0, 'municipal'), false);
  assert.equal(canBuy(460, STATE_COST, 3, 'state'), true);
});

test('reward combo increases and resets after inactivity', () => {
  assert.deepEqual(extinguishReward(0, 100), { combo: 1, coins: 30 });
  assert.deepEqual(extinguishReward(1, 4), { combo: 2, coins: 36 });
  assert.deepEqual(extinguishReward(5, 2), { combo: 5, coins: 54 });
});

test('fire spreading respects borders, occupancy, and minimum spacing', () => {
  const fires = [fire(0, 0)];
  assert.equal(validSpreadPosition(fires, 3, 0, () => true), false);
  assert.equal(validSpreadPosition(fires, 5, 0, () => true), true);
  assert.equal(validSpreadPosition(fires, 41, 0, () => true), false);
  assert.equal(validSpreadPosition(fires, 5, 0, () => false), false);
});

test('area water extinguishes fires at most once', () => {
  const targets = [fire(0, 0), fire(30, 0)];
  assert.deepEqual(applyWaterArea(targets, 0, 0, 8, 120), [targets[0]]);
  assert.deepEqual(applyWaterArea(targets, 0, 0, 8, 120), []);
  assert.equal(targets[1].active, true);
});
