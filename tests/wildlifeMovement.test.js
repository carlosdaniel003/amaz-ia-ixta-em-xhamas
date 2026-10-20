import test from 'node:test';
import assert from 'node:assert/strict';
import {SPECIES,roamDirection} from '../src/game/WildlifeLogic.js';

test('the Amazonian species list includes three flying birds',()=>{
  assert.equal(SPECIES.filter(s=>s.flying).length,3);
  assert.ok(SPECIES.some(s=>s.kind==='cat'));
  assert.ok(SPECIES.some(s=>s.kind==='tapir'));
});

test('birds always have a finite nonzero movement vector while calm',()=>{
  for(let elapsed=0;elapsed<30;elapsed+=.25){
    const vec=roamDirection({x:5,z:7},elapsed,2.4,5,7);
    assert.ok(Math.abs(Math.hypot(vec.x,vec.z)-1)<1e-9);
  }
});

test('calm animal returns to territory and steers away from map limits',()=>{
  assert.deepEqual(roamDirection({x:19,z:0},0,1,0,0),{x:-1,z:0});
  assert.ok(roamDirection({x:39,z:0},0,0,0,0).x<0);
});
