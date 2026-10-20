import * as THREE from 'three';

/** Batched orange flames on trees near active fires; purely decorative. */
export class TreeFlames {
  constructor(scene, trees=[], {mobile=false}={}) {
    this.trees=trees;
    this.limit=mobile?12:22;
    this.group=new THREE.Group();
    scene.add(this.group);
    this.meshes=[0xff5a23,0xffad42].map((color,j)=>{
      const mesh=new THREE.InstancedMesh(
        new THREE.ConeGeometry(j?.55:.85,j?2.1:3.1,5),
        new THREE.MeshBasicMaterial({color,transparent:true,opacity:j?.86:.89,depthWrite:false}),
        this.limit*2
      );
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled=false;
      mesh.count=0;
      this.group.add(mesh);
      return mesh;
    });
    this.object=new THREE.Object3D();
    this.elapsed=0;
  }

  reset() {
    this.elapsed=0;
    for(const mesh of this.meshes)mesh.count=0;
  }

  update(dt, elapsed, fires) {
    this.elapsed+=dt;
    if(this.elapsed<.16)return;
    this.elapsed=0;
    const burning=fires.filter(f=>f.active);
    let index=0;
    const matrix=this.object;
    for(const tree of this.trees){
      if(index>=this.limit)break;
      const hit=burning.some(f=>(f.x-tree.x)**2+(f.z-tree.z)**2<100);
      if(!hit)continue;
      for(let layer=0;layer<2;layer++){
        const mesh=this.meshes[layer];
        for(let part=0;part<2;part++){
          const base=tree.height*(part===0?.30:.72);
          const flicker=1+.14*Math.sin(elapsed*8+index*3+part);
          matrix.position.set(tree.x + (part?tree.width*.31:.35),base,tree.z+.2*part);
          matrix.rotation.set(0,tree.seed*6+elapsed*.27,0);
          matrix.scale.set(flicker*(part?1.2:.7),flicker*(part?1.6:1.2),flicker*(part?1.2:.7));
          matrix.updateMatrix();
          mesh.setMatrixAt(index*2+part,matrix.matrix);
        }
      }
      index++;
    }
    for(const mesh of this.meshes){mesh.count=index*2;mesh.instanceMatrix.needsUpdate=true;}
  }
}
