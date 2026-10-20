import test from 'node:test';
import assert from 'node:assert/strict';
import { selectFlyoverLane, advanceFlight } from '../src/game/AirSupportLogic.js';
import { applyWaterArea } from '../src/game/FireLogic.js';

const fire=(x,z)=>({x,z,health:100,active:true});

test('municipal and state flyovers pick real active fire lanes',()=>{
  const fires=[fire(-12,4),fire(1,4),fire(15,8),fire(25,-30)];
  const municipal=selectFlyoverLane(fires,9);
  const state=selectFlyoverLane(fires,15);
  assert.equal(municipal.count,3);
  assert.equal(state.count,3);
  assert.equal(selectFlyoverLane(fires.map(f=>({...f,active:false})),15),null);
});

test('small flyover animates, drenches and extinguishes actual fires',()=>{
  const fires=[fire(-10,5),fire(-2,5),fire(8,5),fire(0,-34)];
  const flight={large:false,x:-56,z:5,flightTime:0,raining:false,lastDrench:-60};
  let watered=0;
  for(let i=0;i<180;i++) {
    if(advanceFlight(flight,1/20)) {
      const done=applyWaterArea(fires,flight.x,flight.z,9,62);
      watered+=done.length;
      flight.lastDrench=flight.x;
    }
  }
  assert.ok(flight.x>42);
  assert.ok(watered>=3);
  assert.equal(fires[0].active,false);
  assert.equal(fires[1].active,false);
  assert.equal(fires[2].active,false);
  assert.equal(fires[3].active,true);
});

test('state water drop covers a wider area than municipal plane',()=>{
  const small=fire(0,13),large=fire(0,13);
  assert.equal(applyWaterArea([small],0,0,9,95).length,0);
  assert.ok(large.health===100);
  const first=applyWaterArea([large],0,0,15,95);
  assert.equal(first.length,0); // Wider water footprint damages this outer fire.
  assert.ok(large.health<100);
});
