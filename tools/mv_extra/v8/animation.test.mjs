import test from 'node:test';
import assert from 'node:assert/strict';
import {CAST,frameAt,drawCharacter} from './animation.mjs';
import {createCanvas} from './actors.mjs';
import {directionFor} from './direction.mjs';

function sample(name,state,t){const c=createCanvas(400,450);drawCharacter(c.getContext('2d'),name,state,t,{x:200,y:425,h:390,noShadow:true});return c.data();}
function changed(a,b){let n=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])+Math.abs(a[i+3]-b[i+3])>36)n++;return n;}

test('every actor uses a fixed-cell atlas with valid frame durations',()=>{
  for(const [name,{metadata:m,image}] of Object.entries(CAST)){
    assert.equal(image.width,m.cell_width*m.columns);assert.equal(image.height,m.cell_height*m.rows);
    for(const [state,s] of Object.entries(m.states)){
      assert.equal(s.durations_ms.length,s.frames);assert.ok(s.frames<=m.columns);
      assert.ok(s.durations_ms.every(ms=>ms>0));
      if(!s.loop)assert.deepEqual(frameAt(name,state,100),{row:s.row,column:s.frames-1});
    }
  }
});

test('every character changes its actual rendered pose for greetings and memory gestures',()=>{
  for(const name of Object.keys(CAST)){
    assert.ok(changed(sample(name,'wave',0.01),sample(name,'wave',0.65))>350,`${name}: greeting`);
    assert.ok(changed(sample(name,'offer',0.01),sample(name,'offer',0.75))>350,`${name}: memory`);
  }
});

test('lyrics are assigned distinct actions and stage cues',()=>{
  assert.equal(directionFor(2,'whale').state,'walk');assert.equal(directionFor(13,'whale').state,'comfort');
  assert.equal(directionFor(17,'whale').state,'offer');assert.equal(directionFor(22,'whale').state,'sparkler');
  assert.equal(directionFor(22,'claude').state,'dance');assert.equal(directionFor(31,'gpt').state,'dance');
});
