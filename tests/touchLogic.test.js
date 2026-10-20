import test from 'node:test';
import assert from 'node:assert/strict';
import { joystickVector, joystickOffset, touchLook } from '../src/game/TouchLogic.js';
import { worldMovement } from '../src/game/FirstPersonLogic.js';

test('virtual stick has neutral center and correct WASD axes', () => {
  assert.deepEqual(joystickVector(50, 50, 50, 50, 40), { x: 0, z: 0 });
  const forward = joystickVector(50, 10, 50, 50, 40);
  assert.equal(forward.z, -1);
  const left = joystickVector(10, 50, 50, 50, 40);
  assert.equal(left.x, -1);
});

test('diagonal stick is limited to unit magnitude', () => {
  const { x, z } = joystickVector(300, 200, 0, 0, 40);
  assert.ok(Math.abs(Math.hypot(x, z) - 1) < 1e-9);
  const out = joystickOffset({ x, z }, 40);
  assert.ok(Math.hypot(out.x, out.y) <= 40.0000001);
});

test('touch camera look uses deltas and clamps vertical movement', () => {
  assert.ok(touchLook(0, 0, 20, 0).yaw < 0);
  assert.equal(touchLook(0, 0, 0, -1000).pitch, 1.1);
  assert.equal(touchLook(0, 0, 0, 1000).pitch, -1.1);
});

test('mobile forward direction matches first-person heading', () => {
  const stick = joystickVector(50, 10, 50, 50, 40);
  const world = worldMovement(stick, Math.PI / 2);
  assert.ok(Math.abs(world.x + 1) < 1e-9);
  assert.ok(Math.abs(world.z) < 1e-9);
});
