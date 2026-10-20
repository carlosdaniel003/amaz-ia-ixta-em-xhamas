import test from 'node:test';
import assert from 'node:assert/strict';
import { AirSupportView } from '../src/ui/AirSupportView.js';

function makeCanvas() {
  const calls=[];
  const ctx={
    beginPath(){calls.push('begin')},arc(){calls.push('arc')},
    fillRect(){calls.push('rect')},strokeRect(){calls.push('border')},
    fill(){calls.push('fill')},moveTo(){},lineTo(){},
    stroke(){calls.push('stroke')},save(){},restore(){},
    translate(){},closePath(){},
  };
  return { canvas:{width:250,height:116,getContext(){return ctx}}, calls };
}

test('aerial preview only runs while actual aircraft are present',()=>{
  const {canvas,calls}=makeCanvas();
  const label={textContent:''},count={textContent:''};
  const element={hidden:true,querySelector(key){return key==='[data-air-label]'?label:count}};
  const view=new AirSupportView(element,canvas);
  const municipal={x:-14,z:5,large:false,raining:true,extinguished:2};
  const fires=[{x:-11,z:5,active:true,health:100}];
  view.update(.11,[municipal],fires,true);
  assert.equal(element.hidden,false);
  assert.match(label.textContent,/PREFEITURA/);
  assert.equal(count.textContent,'2 FOCOS APAGADOS');
  assert.ok(calls.includes('arc'));
  const renderCount=calls.length;
  view.update(.02,[municipal],fires,true);
  assert.equal(calls.length,renderCount); // Capped to roughly 11 FPS.
  view.update(.11,[],fires,true);
  assert.equal(element.hidden,true);
});

test('two simultaneous aircraft are shown without additional WebGL passes',()=>{
  const {canvas}=makeCanvas();
  const label={textContent:''},count={textContent:''};
  const element={hidden:true,querySelector(key){return key==='[data-air-label]'?label:count}};
  const view=new AirSupportView(element,canvas);
  view.update(.11,[{x:0,z:0,large:false,raining:true,extinguished:1},
                   {x:5,z:10,large:true,raining:true,extinguished:3}],[],true);
  assert.match(label.textContent,/2 AVIÕES/);
  assert.equal(count.textContent,'4 FOCOS APAGADOS');
  view.update(.11,[{x:7,z:8,large:true,raining:true,extinguished:3}],[],false);
  assert.equal(element.hidden,true); // Hide when mobile purchase panel is open.
});
