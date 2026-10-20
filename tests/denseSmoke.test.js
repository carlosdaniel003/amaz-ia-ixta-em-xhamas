import test from 'node:test';
import assert from 'node:assert/strict';
import { exposureAt, SMOKE_RADIUS } from '../src/game/SurvivalLogic.js';
import { nearbySmokeFires, denseSmokePosition, smokePositionWithinHazard, DENSE_SMOKE_PER_FIRE } from '../src/game/SmokeHazardLogic.js';

const fire = (x, z, active = true) => ({ x, z, active });

test('dense smoke is drawn only for active nearby fires, prioritizing player proximity', () => {
  const player = { x: 0, z: 0 };
  const fires = [fire(2, 0), fire(10, 0), fire(100, 0), fire(1, 0, false)];
  assert.deepEqual(nearbySmokeFires(fires, player, 2), [fires[0], fires[1]]);
  assert.deepEqual(nearbySmokeFires(fires, player, 1), [fires[0]]);
  assert.deepEqual(nearbySmokeFires(fires, player, 0), []);
  fires[0].active = false;
  assert.deepEqual(nearbySmokeFires(fires, player, 3), [fires[1]]);
});

test('every dark smoke wisp lies inside an existing smoke-exposure area', () => {
  const center = fire(11, -7);
  for (const elapsed of [0, 1.3, 12, 75, 340]) {
    for (let i = 0; i < DENSE_SMOKE_PER_FIRE; i++) {
      const point = denseSmokePosition(center, i, elapsed);
      assert.equal(smokePositionWithinHazard(center, point), true);
      assert.ok(Math.hypot(point.x - center.x, point.z - center.z) < SMOKE_RADIUS);
      assert.ok(exposureAt([center], point).smoke > 0);
      assert.ok(point.y > .5 && point.y < 3.5);
    }
  }
});

test('no visible plume or smoke exposure remains after a fire is extinguished', () => {
  const center = fire(0, 0);
  assert.ok(nearbySmokeFires([center], {x:0,z:0}, 12).length);
  center.active = false;
  assert.deepEqual(nearbySmokeFires([center], {x:0,z:0}, 12), []);
  assert.equal(exposureAt([center], {x:0,z:0}).smoke, 0);
});

test('the capped mobile particle budget uses only 72 reused points', () => {
  assert.equal(12 * DENSE_SMOKE_PER_FIRE, 72);
  assert.equal(18 * DENSE_SMOKE_PER_FIRE, 108);
});
