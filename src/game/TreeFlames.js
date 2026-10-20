import * as THREE from 'three';
import { burningTrees, treeFlamePositions, findAimedTreeFire } from './TreeFireLogic.js';

/** Batched flames on actual burning trees; each flame can be aimed at. */
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
    this.targets=[];
  }

  reset() {
    this.elapsed=0;
    this.targets=[];
    for(const mesh of this.meshes)mesh.count=0;
  }

  aimedFire(position, direction) {
    return findAimedTreeFire(this.targets, position, direction);
  }

  update(dt, elapsed, fires, player = null) {
    this.elapsed+=dt;
    if(this.elapsed<.16)return;
    this.elapsed=0;
    this.targets = burningTrees(this.trees, fires, this.limit, player);
    const matrix = this.object;
    let index = 0;
    for (const {tree, fire} of this.targets) {
      if (!fire.active) continue;
      const anchors = treeFlamePositions(tree);
      for (let layer=0;layer<2;layer++) {
        const mesh=this.meshes[layer];
        for (let part=0;part<2;part++) {
          const anchor=anchors[part];
          const flicker=1+.14*Math.sin(elapsed*8+index*3+part);
          matrix.position.set(anchor.x,anchor.y,anchor.z);
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
