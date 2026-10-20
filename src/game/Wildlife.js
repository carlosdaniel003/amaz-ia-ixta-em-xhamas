import * as THREE from 'three';
import { exposureAt } from './SurvivalLogic.js';
import { SPECIES, closestFire, escapeDirection } from './WildlifeLogic.js';

// Deterministic wildlife placement near burning and safer areas.
const SPOTS = [
  [-14,-13],[11,-17],[-26,12],[1,26],[26,12],[24,-26],[-12,28],
  [-31,-22],[36,-8],[30,27],[-20,22],[2,-34],[-35,19],[18,29],
  [33,17],[-34,-7],[7,-23],[16,3],[-7,-25],[8,35],[-28,30],
  [32,-26],[-18,-5],[12,17],[-32,-35],[28,-4],[1,-4],[-22,8],
];
const TEXTURE_SIZE = 128;

function animalTexture(species) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  const color = species.color;
  function ellipse(x,y,w,h,fill=color) {
    ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,Math.PI*2);ctx.fill();
  }
  function line(x,y,xx,yy,width,fill=color) {
    ctx.strokeStyle=fill;ctx.lineWidth=width;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();
  }
  const kind = species.kind;
  if (kind === 'snake') {
    ctx.strokeStyle=color;ctx.lineWidth=17;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(19,93);ctx.bezierCurveTo(18,48,99,92,88,55);
    ctx.bezierCurveTo(79,21,104,28,107,42);ctx.stroke();
    ellipse(106,42,13,9);ellipse(112,39,2.6,2.6,'#f4c78b');
  } else if (species.flying || kind === 'curassow') {
    ellipse(64,67,20,27);
    ctx.fillStyle=kind==='parrot'?'#376f90':'#272e2a';
    ctx.beginPath();ctx.moveTo(57,68);ctx.lineTo(17,43);ctx.lineTo(35,93);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(72,68);ctx.lineTo(111,44);ctx.lineTo(91,91);ctx.closePath();ctx.fill();
    line(68,86,62,118,7,kind==='parrot'?'#2b7da0':'#41493a');
    ellipse(69,37,12,15);
    ctx.fillStyle=kind==='toucan'?'#d8a33e':'#f0b45e';
    ctx.beginPath();ctx.moveTo(78,33);ctx.lineTo(kind==='toucan'?114:95,40);ctx.lineTo(78,48);ctx.closePath();ctx.fill();
    ellipse(74,35,3,3,'#f8f4cf');
    if(kind==='curassow') {line(65,20,59,12,4,'#343a39');}
  } else {
    // Silhouette variants use shared textures, one Sprite per animal.
    const bodyX=60,bodyY=72;
    const bodyR=kind==='tapir'?35:kind==='cat'?32:kind==='monkey'?25:29;
    ellipse(bodyX,bodyY,bodyR,kind==='sloth'?30:24);
    for (const x of [40,77]) {line(x,82,x+(x===40?-4:4),108,kind==='sloth'?10:9);}
    if(kind==='cat') {
      line(36,68,18,53,9);line(18,53,21,35,7);
    } else if(kind==='monkey') {
      ctx.strokeStyle=color;ctx.lineWidth=7;
      ctx.beginPath();ctx.moveTo(36,72);ctx.bezierCurveTo(8,72,12,35,28,33);ctx.stroke();
    }
    ellipse(91,59,kind==='tapir'?19:17,kind==='sloth'?19:15);
    if(kind==='tapir') {
      line(101,66,105,92,11);
    } else if(kind==='pig') {
      ellipse(107,63,10,7,'#b59b83');
    } else if(kind==='rodent') {
      ellipse(105,65,9,6);
    }
    for (const x of [83,98]) ellipse(x,45,kind==='sloth'?7:6,8);
    ellipse(98,56,3.1,3.1,'#f1e9bb');
    ellipse(99,56,1.4,1.4,'#22251e');
    if(kind==='cat'||kind==='rodent') {
      ctx.fillStyle=kind==='cat'?'#45362a':'#f0d8a1';
      for(let i=0;i<8;i++) ellipse(42+(i%4)*12,67+Math.floor(i/4)*13,2.7,2.9,ctx.fillStyle);
    }
    if(kind==='monkey') ellipse(94,64,11,9,'#bba17d');
    if(kind==='sloth') {
      line(43,88,25,112,9);line(75,88,92,111,9);
    }
  }
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}

export class Wildlife {
  constructor(scene, { mobile=false } = {}) {
    this.mobile=mobile;
    this.scene=scene;
    this.textures=SPECIES.map(animalTexture);
    this.animals=[];
    const count=mobile?22:28;
    for(let i=0;i<count;i++){
      const species=SPECIES[(i*9+i%5)%SPECIES.length];
      const kind=(i*9+i%5)%SPECIES.length;
      const [px,pz]=SPOTS[i];
      const x=px+Math.sin(i*8.1)*1.4, z=pz+Math.cos(i*5.3)*1.6;
      const material=new THREE.SpriteMaterial({map:this.textures[kind],transparent:true,alphaTest:.06,depthWrite:false});
      const sprite=new THREE.Sprite(material);
      const baseScale=species.scale * (species.flying?1.4:1);
      sprite.scale.set(baseScale*1.35,baseScale*1.45,1);
      sprite.position.set(x,species.flying?2.3:baseScale*.62,z);
      scene.add(sprite);
      this.animals.push({
        model:sprite,species,kind,x,z,baseScale,
        smoke:0,life:1,phase:i*2.8,speed:species.flying?4.9:2.4+(i%4)*.5,
        state:'trapped',cause:'',escaped:false,
      });
    }
    this.reset();
  }

  reset() {
    this.rescued=0;
    this.lost=0;
    this.animals.forEach((a,i)=>{
      a.state=i<4?'dead':'trapped';
      a.cause=i%2?'smoke':'fire';
      a.life=1;a.smoke=0;a.escaped=false;
      a.model.position.set(a.x,a.species.flying?2.3:a.baseScale*.62,a.z);
      a.model.scale.set(a.baseScale*1.35,a.baseScale*1.45,1);
      a.model.material.color.setHex(0xffffff);
      a.model.material.rotation=0;
      a.model.visible=true;
      if(a.state==='dead') { this.lost++;this.markDead(a); }
    });
  }

  markDead(animal) {
    animal.model.position.y=.2;
    animal.model.scale.y*=.42;
    animal.model.material.color.setHex(animal.cause==='fire'?0x55504a:0x8c8981);
    animal.model.material.rotation=-.5;
  }

  releaseNear(fire) {
    let saved=0;
    for(const animal of this.animals){
      if(animal.state!=='trapped'&&animal.state!=='fleeing') continue;
      const pos=animal.model.position;
      if(Math.hypot(pos.x-fire.x,pos.z-fire.z)>13) continue;
      animal.state='rescued';
      this.rescued++;
      saved++;
    }
    return saved;
  }

  update(dt,elapsed,fires) {
    let deaths=0;
    const active=fires.fires;
    for(const animal of this.animals) {
      if(animal.state==='dead'||animal.state==='escaped') continue;
      const pos=animal.model.position;
      const exposure=exposureAt(active,pos);
      if(animal.state!=='rescued'){
        animal.smoke=Math.max(0,animal.smoke+(exposure.smoke*.85-.11)*dt*6);
        if(exposure.directFire) animal.life-=dt*.42;
        else if(animal.smoke>6) animal.life-=dt*(.025+Math.min(.12,exposure.smoke*.05));
        if(animal.life<=0){
          animal.state='dead';
          animal.cause=exposure.directFire?'fire':'smoke';
          this.markDead(animal);
          this.lost++;deaths++;continue;
        }
        if(closestFire(active,pos,15)||animal.smoke>1.5) animal.state='fleeing';
      }
      if(animal.state==='fleeing'||animal.state==='rescued'){
        const v=escapeDirection(pos,active);
        const speed=animal.speed*(animal.state==='rescued'?1.15:1);
        const nextX=pos.x+v.x*speed*dt, nextZ=pos.z+v.z*speed*dt;
        // Perimeter is only a simulated horizon: wildlife disappears into the forest.
        if(Math.abs(nextX)>41||Math.abs(nextZ)>41){
          animal.state='escaped';animal.model.visible=false;continue;
        }
        pos.x=nextX;pos.z=nextZ;
        pos.y=(animal.species.flying?2.5:animal.baseScale*.62)+Math.abs(Math.sin(elapsed*animal.speed*2+animal.phase))*.15;
      }else{
        pos.y=(animal.species.flying?2.3:animal.baseScale*.62)+Math.sin(elapsed*2+animal.phase)*.045;
      }
    }
    return deaths;
  }
}
