import test from 'node:test';
import assert from 'node:assert/strict';
import { applyWater, findNearestFire, FIRE_HEALTH } from '../src/game/FireLogic.js';

function makeFire(x, z) { return { x, z, health: FIRE_HEALTH, active: true }; }
const origin = { x: 0, z: 0 };
const forward = { x: 0, z: -1 };

test('water must be aimed toward an active fire in range', () => {
  const target = makeFire(0, -8);
  const behind = makeFire(0, 5);
  const outOfRange = makeFire(0, -15);
  const offAxis = makeFire(8, -8);
  const extinguished = applyWater([target, behind, outOfRange, offAxis], origin, forward, 1);
  assert.deepEqual(extinguished, []);
  assert.equal(target.health, 52);
  for (const fire of [behind, outOfRange, offAxis]) assert.equal(fire.health, FIRE_HEALTH);
});

test('a sustained stream extinguishes a fire once and never gives duplicate rewards', () => {
  const target = makeFire(0, -8);
  assert.deepEqual(applyWater([target], origin, forward, 1), []);
  assert.deepEqual(applyWater([target], origin, forward, 1), []);
  assert.deepEqual(applyWater([target], origin, forward, 1), [target]);
  assert.equal(target.active, false);
  assert.equal(target.health, 0);
  assert.deepEqual(applyWater([target], origin, forward, 10), []);
});

test('zero or negative delta cannot cause damage', () => {
  const fire = makeFire(0, -4);
  applyWater([fire], origin, forward, 0);
  applyWater([fire], origin, forward, -1);
  assert.equal(fire.health, FIRE_HEALTH);
});

test('nearest target considers only active fires inside range', () => {
  const fires = [makeFire(3, 3), makeFire(1, 1), makeFire(30, 30)];
  fires[1].active = false;
  assert.equal(findNearestFire(fires, origin, 10), fires[0]);
  assert.equal(findNearestFire(fires, origin, 3), null);
});
