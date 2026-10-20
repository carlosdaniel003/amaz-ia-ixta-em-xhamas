import test from 'node:test';
import assert from 'node:assert/strict';
import { findAimedFire, applyWater, FIRE_HEALTH, HOSE_RANGE } from '../src/game/FireLogic.js';
import { jetEndPoint } from '../src/game/WaterAim.js';

const eye = { x: 0, y: 1.85, z: 0 };
const straight = { x: 0, y: 0, z: -1 };
const fire = (x,z)=>({x,z,active:true,health:FIRE_HEALTH});

test('target at the reticle is the same point where water jet ends', () => {
  const target = fire(0,-8);
  const hit = findAimedFire([target],eye,straight);
  assert.equal(hit?.fire,target);
  assert.ok(Math.abs(hit.distance-8)<1e-6);
  const end=jetEndPoint(eye,straight,hit.distance);
  assert.ok(Math.abs(end.z+8)<1e-6);
  applyWater([target],eye,straight,1);
  assert.equal(target.health,52);
});

test('off-axis fires are not watered and stream travels straight',()=>{
  const other=fire(4,-8);
  assert.equal(findAimedFire([other],eye,straight),null);
  applyWater([other],eye,straight,1);
  assert.equal(other.health,FIRE_HEALTH);
  assert.equal(jetEndPoint(eye,straight).z,-HOSE_RANGE);
});

test('closest fire gets player jet when two are lined up',()=>{
  const near=fire(0,-6),far=fire(0,-9);
  const hit=findAimedFire([far,near],eye,straight);
  assert.equal(hit.fire,near);
  applyWater([far,near],eye,straight,1);
  assert.equal(near.health,52);
  assert.equal(far.health,FIRE_HEALTH);
});

test('when aiming down, water stops at ground rather than curving past it',()=>{
  const aim={x:0,y:-0.5,z:-Math.sqrt(.75)};
  const end=jetEndPoint(eye,aim);
  assert.ok(Math.abs(end.y-0.2)<1e-6);
  assert.ok(end.distance<HOSE_RANGE);
});

test('when aiming up and out of range, no fire can be extinguished',()=>{
  const target=fire(0,-8),up={x:0,y:1,z:0};
  assert.equal(findAimedFire([target],eye,up),null);
  applyWater([target],eye,up,1);
  assert.equal(target.health,FIRE_HEALTH);
});
