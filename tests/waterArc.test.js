import test from 'node:test';
import assert from 'node:assert/strict';
import { waterImpactPoint, curvedWaterPoint } from '../src/game/WaterAim.js';
import { findAimedFire, applyWater } from '../src/game/FireLogic.js';

const eye = {x:0,y:1.85,z:0};
const nozzle = {x:.32,y:1.53,z:-.9};
const direction = {x:0,y:0,z:-1};

test('water curves upward mid-flight and lands exactly on fire center', () => {
  const fire={x:0,z:-8,health:100,active:true};
  const hit=findAimedFire([fire],eye,direction);
  const impact=waterImpactPoint(eye,direction,hit);
  const first=curvedWaterPoint(nozzle,impact,0);
  const mid=curvedWaterPoint(nozzle,impact,.5);
  const end=curvedWaterPoint(nozzle,impact,1);
  assert.deepEqual(first,nozzle);
  assert.equal(end.x,fire.x);
  assert.equal(end.z,fire.z);
  assert.equal(end.y,1.45);
  assert.ok(mid.y>(first.y+end.y)/2+.2);
  applyWater([fire],eye,direction,1);
  assert.equal(fire.health,52);
});

test('the stream does not magically target an off-axis fire',()=>{
  const fire={x:6,z:-8,health:100,active:true};
  assert.equal(findAimedFire([fire],eye,direction),null);
  const impact=waterImpactPoint(eye,direction);
  assert.equal(impact.z,-12);
  applyWater([fire],eye,direction,1);
  assert.equal(fire.health,100);
});

test('curved stream preserves precise endpoints and bounds progress',()=>{
  const impact={x:3,y:1.4,z:-7};
  assert.deepEqual(curvedWaterPoint(nozzle,impact,-3),nozzle);
  assert.deepEqual(curvedWaterPoint(nozzle,impact,8),impact);
});
