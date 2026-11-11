import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,atlas,meta,frameAt} from './player.mjs';

function area(state,col,rect=[0,0,meta.cell_width,meta.cell_height]) {
  const s=meta.states[state],c=createCanvas(meta.cell_width,meta.cell_height),ctx=c.getContext('2d');
  ctx.drawImage(atlas,col*meta.cell_width,s.row*meta.cell_height,meta.cell_width,meta.cell_height,0,0,meta.cell_width,meta.cell_height);
  return ctx.getImageData(...rect).data;
}
function diff(a,b){let count=0;for(let i=0;i<a.length;i+=4) if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])+Math.abs(a[i+3]-b[i+3])>40)count++;return count;}

test('atlas uses fixed cells with valid timings and transparent unused cells',()=>{
  assert.deepEqual([atlas.width,atlas.height],[3072,2912]);
  for(const [name,s] of Object.entries(meta.states)) {
    assert.equal(s.frames,s.durations_ms.length);assert.ok(s.durations_ms.every(x=>x>0));
    const period=s.durations_ms.reduce((a,b)=>a+b,0)/1000;
    assert.deepEqual(frameAt(name,0.017),frameAt(name,period+0.017));
    for(let col=s.frames;col<meta.columns;col++) assert.ok(area(name,col).every(x=>x===0),`${name}:${col}`);
  }
});

test('blink and tail have visible differences in their separate regions',()=>{
  assert.ok(diff(area('idle',0,[90,90,190,120]),area('idle',2,[90,90,190,120]))>100);
  assert.ok(diff(area('idle',0,[270,250,114,150]),area('idle',4,[270,250,114,150]))>50);
});

test('wave, eating, jumping and empty bowl have distinct frames',()=>{
  assert.ok(diff(area('waving',0),area('waving',1))>100);
  assert.ok(diff(area('working',1),area('working',3))>500);
  assert.ok(diff(area('jumping',0),area('jumping',2))>500);
  assert.ok(diff(area('idle',0),area('failed',2))>500);
});
