import test from 'node:test';
import assert from 'node:assert/strict';
import { joystickVector, shapedJoystick, smoothControl, touchLook } from '../src/game/TouchLogic.js';

test('tiny thumb movements do not walk the player', () => {
  const raw = joystickVector(52, 49, 50, 50, 40);
  assert.deepEqual(shapedJoystick(raw), {x:0,z:0});
});

test('analog joystick supports slow walking without losing full speed', () => {
  const slow = shapedJoystick(joystickVector(50, 35, 50, 50, 40));
  const full = shapedJoystick(joystickVector(50, 10, 50, 50, 40));
  assert.ok(slow.z < 0 && slow.z > -0.5);
  assert.ok(Math.abs(full.z + 1) < 1e-9);
});

test('movement smoothing converges with stable time across frame rates', () => {
  let low = 0, high = 0;
  for (let i=0;i<24;i++) low=smoothControl(low,1,1/24,15);
  for (let i=0;i<60;i++) high=smoothControl(high,1,1/60,15);
  assert.ok(Math.abs(low-high)<1e-9);
  assert.ok(low>0.99);
});

test('look follows gestures without exceeding pitch clamp', () => {
  const fast=touchLook(0,0,80,-400,.0035);
  assert.ok(fast.yaw<0);
  assert.equal(fast.pitch,1.1);
  assert.ok(smoothControl(0,fast.yaw,1/24,24)<0);
});

test('zero delta time does not cause phantom movement', () => {
  assert.equal(smoothControl(0,1,0,15),0);
});
