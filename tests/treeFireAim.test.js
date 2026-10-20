import test from 'node:test';
import assert from 'node:assert/strict';
import { FIRE_HEALTH, HOSE_RANGE, findAimedFire } from '../src/game/FireLogic.js';
import { burningTrees, treeFlamePositions, findAimedTreeFire, applyWaterToTreeFire } from '../src/game/TreeFireLogic.js';
import { waterImpactPoint } from '../src/game/WaterAim.js';

const eye={x:0,y:1.85,z:0};
const tree={x:0,z:-7,height:14,width:3.1,seed:.3};
const focus={x:0,z:-9,active:true,health:FIRE_HEALTH};
const aimAt=(target)=>{
  const v={x:target.x-eye.x,y:target.y-eye.y,z:target.z-eye.z};
  const m=Math.hypot(v.x,v.y,v.z);
  return {x:v.x/m,y:v.y/m,z:v.z/m};
};

test('burning trees are connected to actual active fires and within hose reach',()=>{
  const burning=burningTrees([tree],[focus],12,eye);
  assert.equal(burning.length,1);
  assert.equal(burning[0].fire,focus);
  const flame=treeFlamePositions(tree)[0];
  assert.ok(Math.hypot(flame.x-eye.x,flame.y-eye.y,flame.z-eye.z)<HOSE_RANGE);
  const hit=findAimedTreeFire(burning,eye,aimAt(flame));
  assert.equal(hit?.fire,focus);
  assert.deepEqual(waterImpactPoint(eye,aimAt(flame),hit),flame);
});

test('holding water over a tree flame extinguishes its linked ground fire',()=>{
  const target={...focus};
  const burning=burningTrees([tree],[target],12,eye);
  const hit=findAimedTreeFire(burning,eye,aimAt(treeFlamePositions(tree)[0]));
  assert.deepEqual(applyWaterToTreeFire(hit,1),[]);
  assert.equal(target.health,52);
  assert.deepEqual(applyWaterToTreeFire(hit,1.1),[target]);
  assert.equal(target.active,false);
  assert.deepEqual(applyWaterToTreeFire(hit,1),[]);
  assert.equal(burningTrees([tree],[target],12,eye).length,0);
});

test('fire on tree cannot be hit through the back or outside hose range',()=>{
  const target={...focus};
  const burning=burningTrees([tree],[target],12,eye);
  assert.equal(findAimedTreeFire(burning,eye,{x:0,y:0,z:1}),null);
  assert.equal(findAimedTreeFire(burning,{x:0,y:1.85,z:30},{x:0,y:0,z:-1}),null);
  const off={x:0,y:0,z:-1};
  assert.equal(findAimedTreeFire(burning,eye,off),null);
});

test('nearby tree fires use a strict instance budget',()=>{
  const trees=Array.from({length:35},(_,i)=>({x:i*.12,z:-5,height:15,width:3,seed:0}));
  const fires=[{x:0,z:-5,active:true}];
  assert.equal(burningTrees(trees,fires,12,eye).length,12);
  assert.equal(burningTrees(trees,fires,22,eye).length,22);
  assert.equal(findAimedFire([focus],eye,aimAt(treeFlamePositions(tree)[1])),null);
});
