import test from 'node:test';
import assert from 'node:assert/strict';
import { wildlifeSpawnPoints, SPECIES } from '../src/game/WildlifeLogic.js';

test('22 mobile animals cover all quadrants of the forest, not just the start', () => {
  const positions = wildlifeSpawnPoints(22);
  assert.equal(positions.length, 22);
  const quadrants = [0, 0, 0, 0];
  for (const point of positions) quadrants[Number(point.x > 0) + 2 * Number(point.z > 0)]++;
  assert.ok(quadrants.every(count => count >= 4), 'each quadrant needs several animals');
  assert.ok(Math.min(...positions.map(p=>p.x)) < -27);
  assert.ok(Math.max(...positions.map(p=>p.x)) > 27);
  assert.ok(Math.min(...positions.map(p=>p.z)) < -27);
  assert.ok(Math.max(...positions.map(p=>p.z)) > 27);
});

test('wildlife spawn cells maintain a clear separation between neighbors', () => {
  for (const count of [22,28]) {
    const points = wildlifeSpawnPoints(count);
    for(let i=0;i<points.length;i++) {
      assert.ok(Math.abs(points[i].x)<40 && Math.abs(points[i].z)<40);
      for(let j=0;j<i;j++)
        assert.ok(Math.hypot(points[i].x-points[j].x,points[i].z-points[j].z)>8.5);
    }
  }
});

test('spawn positions are deterministic and respect tree collision checks', () => {
  const original=wildlifeSpawnPoints(22);
  const blocked=original[0];
  const permitted=(x,z)=>Math.hypot(x-blocked.x,z-blocked.z)>1.5;
  const shifted=wildlifeSpawnPoints(22,permitted);
  const repeat=wildlifeSpawnPoints(22,permitted);
  assert.deepEqual(shifted,repeat);
  assert.ok(shifted.every(({x,z})=>permitted(x,z)));
  assert.notDeepEqual(shifted[0],blocked);
  assert.equal(new Set(shifted.map(p=>JSON.stringify(p))).size,shifted.length);
});

test('mobile wildlife uses real species and includes birds and terrestrial animals', () => {
  const species=Array.from({length:22},(_,i)=>SPECIES[i%SPECIES.length]);
  assert.equal(new Set(species.map(s=>s.name)).size,14);
  assert.ok(species.some(s=>s.flying));
  assert.ok(species.some(s=>s.kind==='snake'));
  assert.ok(species.some(s=>s.kind==='tapir'));
});
