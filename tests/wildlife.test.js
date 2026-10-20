import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES, SPECIES_NAMES, closestFire, escapeDirection } from '../src/game/WildlifeLogic.js';

test('only the explicitly curated Amazon forest species are spawned',()=>{
  assert.equal(SPECIES.length,14);
  assert.equal(new Set(SPECIES_NAMES).size,SPECIES_NAMES.length);
  for(const name of ['onça-pintada','anta','queixada','caititu','paca','cutia','macaco-aranha','macaco-guariba','preguiça-de-três-dedos','arara-vermelha','arara-canindé','tucano-de-papo-branco','mutum-cavalo','sucuri-verde']) {
    assert.ok(SPECIES_NAMES.includes(name));
  }
});

test('animals flee away from actual nearby active fires',()=>{
  const position={x:3,z:0};
  const fire={x:1,z:0,active:true};
  assert.equal(closestFire([fire],position),fire);
  assert.deepEqual(escapeDirection(position,[fire]),{x:1,z:0});
  assert.equal(closestFire([{...fire,active:false}],position),null);
});

test('escape direction remains finite when an animal starts on a fire',()=>{
  const direction=escapeDirection({x:0,z:0},[{x:0,z:0,active:true}]);
  assert.ok(Number.isFinite(direction.x) && Number.isFinite(direction.z));
});

test('species sizes are bounded for lightweight mobile 3D models',()=>{
  assert.ok(SPECIES.every(s=>s.scale>=1 && s.scale<=2.1));
  assert.equal(SPECIES.filter(s=>s.flying).length,3);
});
