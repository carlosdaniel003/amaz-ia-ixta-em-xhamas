import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLookDelta, worldMovement } from '../src/game/FirstPersonLogic.js';
import { applyWater, FIRE_HEALTH } from '../src/game/FireLogic.js';

test('walking forward respects yaw in first-person view', () => {
  const front = worldMovement({ x: 0, z: -1 }, 0);
  assert.deepEqual(front, { x: 0, z: -1 });
  const turned = worldMovement({ x: 0, z: -1 }, Math.PI / 2);
  assert.ok(Math.abs(turned.x + 1) < 1e-10);
  assert.ok(Math.abs(turned.z) < 1e-10);
});

test('mouse look clamps camera pitch', () => {
  assert.equal(applyLookDelta(0, 0, 0, -10000).pitch, 1.10);
  assert.equal(applyLookDelta(0, 0, 0, 10000).pitch, -1.10);
  assert.ok(applyLookDelta(0, 0, 200, 0).yaw < 0);
});

test('first-person hose respects aim height, range and forward direction', () => {
  const fire = { x: 0, z: -8, health: FIRE_HEALTH, active: true };
  const origin = { x: 0, y: 1.7, z: 0 };
  applyWater([fire], origin, { x: 0, y: 0, z: -1 }, 1);
  assert.equal(fire.health, FIRE_HEALTH - 48);
  fire.health = FIRE_HEALTH;
  applyWater([fire], origin, { x: 0, y: 1, z: 0 }, 1);
  assert.equal(fire.health, FIRE_HEALTH);
});
