import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from './actors.mjs';
import { PETS, petFrame, drawPet } from './pet.mjs';

function pixels(name, state, column, region) {
  const {image, metadata:m} = PETS[name], row=m.states[state].row;
  const c=createCanvas(m.cell_width,m.cell_height), ctx=c.getContext('2d');
  ctx.drawImage(image,column*m.cell_width,row*m.cell_height,m.cell_width,m.cell_height,0,0,m.cell_width,m.cell_height);
  const [x,y,w,h]=region;
  return ctx.getImageData(x,y,w,h).data;
}
function different(a,b) {
  let count=0; for(let i=0;i<a.length;i+=4) if (Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])+Math.abs(a[i+3]-b[i+3])>40) count++;
  return count;
}

test('atlas durations, rows, frame counts and transparent unused cells are valid', () => {
  for(const [name,{image,metadata:m}] of Object.entries(PETS)) {
    assert.equal(image.width,m.columns*m.cell_width); assert.equal(image.height,m.rows*m.cell_height);
    for(const [state,s] of Object.entries(m.states)) {
      assert.equal(s.frames,s.durations_ms.length); assert.ok(s.frames <= m.columns);
      const total=s.durations_ms.reduce((a,b)=>a+b,0)/1000;
      assert.deepEqual(petFrame(name,state,0.017),petFrame(name,state,total+0.017));
      // 只检查"第一个没用到的格子"是透明的；eating 现在正好 8 帧，没有空格子。
      if (s.frames < m.columns) {
        const blank=pixels(name,state,s.frames,[0,0,m.cell_width,m.cell_height]);
        assert.ok(blank.every(x=>x===0),`${name}/${state} unused cell`);
      }
    }
  }
});

test('eyes and tail change independently in actual atlas pixels', () => {
  for (const name of ['dragon','whale']) {
    const eyes=[90,100,190,95];
    const tail=name==='dragon'?[0,290,110,110]:[270,250,114,150];
    assert.ok(different(pixels(name,'idle',0,eyes),pixels(name,'idle',2,eyes))>100,`${name} eyes`);
    assert.ok(different(pixels(name,'idle',0,tail),pixels(name,'idle',2,tail))>50,`${name} tail`);
  }
});

test('whale eating is a dedicated eight-pose action, not three repeated poses', () => {
  const m=PETS.whale.metadata, upper=[60,150,260,175];
  assert.equal(m.states.eating.frames,8);
  for (const [a,b] of [[0,2],[2,4],[4,6],[6,7]]) {
    assert.ok(different(pixels('whale','eating',a,upper),pixels('whale','eating',b,upper))>300,
      `eating frame ${a} 与 ${b} 应明显不同`);
  }
});

test('whale scoop, mouth and empty bowl are visibly different fixed cells', () => {
  const upper=[60,150,260,175];
  assert.ok(different(pixels('whale','eating',1,upper),pixels('whale','eating',3,upper))>500);
  assert.ok(different(pixels('whale','idle',0,upper),pixels('whale','empty',0,upper))>500);
  const c=createCanvas(500,500); drawPet(c.getContext('2d'),'whale','eating',0.3,{x:250,y:450,h:400});
  assert.ok(c.data().some(x=>x!==0));
});
