import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldBeginFlyby, flightCameraPose, advanceFlybyTime, FLYBY_SECONDS } from '../src/game/AirCinematicLogic.js';

test('cinematic starts only when a real aircraft drops water over the forest', () => {
  assert.equal(shouldBeginFlyby(null), false);
  assert.equal(shouldBeginFlyby({x:-30,raining:false}), false);
  assert.equal(shouldBeginFlyby({x:-41,raining:true}), false);
  assert.equal(shouldBeginFlyby({x:-32,raining:true}), true);
});

test('cinematic camera stays in WORLD coordinates near aircraft, framing forest below', () => {
  const flight={x:0,z:7,altitude:29,large:false};
  const pose=flightCameraPose(flight);
  assert.ok(Math.abs(pose.camera.x-flight.x)<18);
  assert.ok(pose.camera.y>flight.altitude);
  assert.ok(pose.target.y<flight.altitude);
  assert.equal(pose.target.z,flight.z);
  flight.x=20;
  const after=flightCameraPose(flight);
  assert.equal(after.camera.x-pose.camera.x,20);
  assert.equal(after.target.x-pose.target.x,20);
});

test('camera framing is proportional for both airplane types', () => {
  for(const large of [false,true]){
    const plane={x:12,z:5,altitude:large?33:29,large};
    const pose=flightCameraPose(plane);
    assert.ok(pose.camera.z-plane.z>15);
    assert.ok(pose.camera.y-pose.target.y>15);
  }
});

test('flyover time is capped and nonnegative', () => {
  assert.equal(advanceFlybyTime(0,-1),0);
  assert.equal(advanceFlybyTime(0,.5),.5);
  assert.equal(advanceFlybyTime(5.5,1),FLYBY_SECONDS);
});
