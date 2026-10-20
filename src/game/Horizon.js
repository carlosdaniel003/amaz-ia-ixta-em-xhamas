import * as THREE from 'three';

/**
 * Single static 2D texture on the inside of one distant cylindrical surface.
 * The player never collides with it: it replaces the grey empty horizon
 * without allocating additional forest geometry or per-frame GPU work.
 */
export function createSmokeHorizon(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#534d49');
  sky.addColorStop(.32,'#777268');
  sky.addColorStop(.58,'#999288');
  sky.addColorStop(.78,'#aaa195');
  sky.addColorStop(1,'#413d33');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);

  // Layered smoke bands, baked once on startup.
  for(let layer=0;layer<7;layer++){
    ctx.fillStyle=['#88807730','#aca69e38','#b2a99f29','#524d4644'][layer%4];
    const y=70+layer*20;
    for(let i=-1;i<17;i++){
      const x=i*68 + Math.sin(i*4.78+layer*2.5)*19;
      ctx.beginPath();
      ctx.ellipse(x,y + Math.sin(i*7.37+layer)*14,90+layer*7,17+layer*2,0,0,Math.PI*2);
      ctx.fill();
    }
  }
  // Multiple overlapping silhouettes of tall Amazon forest canopies.
  for(let layer=0;layer<3;layer++){
    const base=174+layer*16;
    ctx.fillStyle=['#494e40','#383d33','#292f2a'][layer];
    ctx.beginPath();ctx.moveTo(0,H);
    for(let x=0;x<=W;x+=8){
      const wave=Math.sin(x*.057 + layer)*9 + Math.sin(x*.14+layer*2)*5;
      const crown=base-17-wave-((Math.sin(x*.19+layer*7)+1)*8);
      ctx.lineTo(x,crown);
    }
    ctx.lineTo(W,H);ctx.closePath();ctx.fill();
    for(let i=0;i<34;i++){
      const x=(i*37+layer*22)%W, h=18+((i*29+layer*11)%30);
      ctx.fillRect(x,base-h*.3,2,H-base);
      ctx.beginPath();
      ctx.ellipse(x,base-h*.7,10+(i%5)*4,h*.52,0,0,Math.PI*2);ctx.fill();
    }
  }
  const ash=ctx.createLinearGradient(0,130,0,H);
  ash.addColorStop(0,'#aaa09500');ash.addColorStop(.58,'#958a7660');ash.addColorStop(1,'#8b8070d0');
  ctx.fillStyle=ash;ctx.fillRect(0,130,W,H-130);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=THREE.RepeatWrapping;
  const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.BackSide,fog:false,depthWrite:false});
  const cylinder=new THREE.Mesh(new THREE.CylinderGeometry(72,72,88,32,1,true),material);
  cylinder.position.y=24;
  cylinder.renderOrder=-2;
  scene.add(cylinder);
  return cylinder;
}
