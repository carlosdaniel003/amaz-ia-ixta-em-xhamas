import { exposureAt } from './SurvivalLogic.js';
import { SPECIES, closestFire, escapeDirection, roamDirection, wildlifeSpawnPoints } from './WildlifeLogic.js';
import { createWildlifeAssets } from './Wildlife3D.js';

/** Real low-poly 3D Amazon wildlife; positions span the entire forest. */
export class Wildlife {
  constructor(scene, { mobile = false, world = null } = {}) {
    this.mobile = mobile;
    this.canOccupy = world ? (x,z) => world.canOccupy(x,z) : () => true;
    this.animals = [];
    this.assets = createWildlifeAssets(SPECIES);
    const count = mobile ? 22 : 28;
    const spots = wildlifeSpawnPoints(count, this.canOccupy);

    for (let i = 0; i < count; i++) {
      const kind = i % SPECIES.length;
      const species = SPECIES[kind];
      const [x,z] = [spots[i].x,spots[i].z];
      const {root,wings} = this.assets.create(kind);
      root.position.set(x,species.flying?4.8:0,z);
      scene.add(root);
      this.animals.push({
        model:root,wings,species,kind,x,z,
        phase:i*2.8,speed:species.flying?4.9:2.4+(i%4)*.5,
        smoke:0,life:1,state:'trapped',cause:'',
        homeX:x,homeZ:z,
      });
    }
    this.reset();
  }

  reset() {
    this.rescued = 0;
    this.lost = 0;
    for (let i=0;i<this.animals.length;i++) {
      const animal=this.animals[i];
      animal.state=[2,8,15,21].includes(i)?'dead':'trapped';
      animal.cause=i%2?'smoke':'fire';
      animal.life=1;
      animal.smoke=0;
      animal.model.position.set(animal.x,animal.species.flying?4.8:0,animal.z);
      animal.model.rotation.set(0,(i*2.37)%(Math.PI*2),0);
      animal.model.scale.setScalar(animal.species.scale);
      animal.model.visible=true;
      for(const wing of animal.wings) wing.pivot.rotation.z=0;
      if(animal.state==='dead'){this.markDead(animal);this.lost++;}
    }
  }

  markDead(animal) {
    // Grounded body, not a sprite flattened in midair.
    if(animal.species.flying) {
      animal.model.position.y=.1;
      animal.model.rotation.x=Math.PI*.5;
    } else if(animal.species.kind==='snake') {
      animal.model.position.y=0;
    } else {
      animal.model.position.y=.38;
      animal.model.rotation.z=-1.20;
    }
    animal.model.scale.multiplyScalar(.86);
  }

  releaseNear(fire) {
    let saved=0;
    for(const animal of this.animals) {
      if(animal.state!=='trapped' && animal.state!=='fleeing') continue;
      const pos=animal.model.position;
      if(Math.hypot(pos.x-fire.x,pos.z-fire.z)>13)continue;
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
      if(animal.state==='dead'||animal.state==='escaped')continue;
      const pos=animal.model.position;
      const exposure=exposureAt(active,pos);
      const danger=closestFire(active,pos,10);
      if(animal.state!=='rescued'){
        animal.smoke=Math.max(0,animal.smoke+(exposure.smoke*.85-.11)*dt*6);
        if(exposure.directFire) animal.life-=dt*.42;
        else if(animal.smoke>6) animal.life-=dt*(.025+Math.min(.12,exposure.smoke*.05));
        if(animal.life<=0){
          animal.state='dead';
          animal.cause=exposure.directFire?'fire':'smoke';
          this.markDead(animal);
          this.lost++;
          deaths++;
          continue;
        }
        // Once out of danger, the animal settles into a new safe spot.
        if(danger||animal.smoke>1.5) animal.state='fleeing';
        else if(animal.state==='fleeing'){
          animal.state='trapped';
          animal.homeX=pos.x;
          animal.homeZ=pos.z;
        }
      }

      const flying=Boolean(animal.species.flying);
      const fleeing=animal.state==='fleeing'||animal.state==='rescued';
      const roaming=!fleeing && (flying||Math.sin(elapsed*.65+animal.phase)>.18);
      if(fleeing||roaming){
        const direction=fleeing
          ? escapeDirection(pos,active)
          : roamDirection(pos,elapsed,animal.phase,animal.homeX,animal.homeZ);
        const speed=fleeing
          ? animal.speed*(animal.state==='rescued'?1.15:1)
          : flying ? animal.speed*.66 : animal.speed*.18;
        const x=pos.x+direction.x*speed*dt;
        const z=pos.z+direction.z*speed*dt;
        if(Math.abs(x)>40||Math.abs(z)>40) {
          if(animal.state==='rescued') {
            animal.state='escaped';
            animal.model.visible=false;
            continue;
          }
          // Wild animals re-enter the forest rather than disappearing en masse.
          animal.homeX=Math.max(-27,Math.min(27,-pos.x*.55));
          animal.homeZ=Math.max(-27,Math.min(27,-pos.z*.55));
        }else if(flying||this.canOccupy(x,z)){
          const dx=x-pos.x,dz=z-pos.z;
          pos.x=x;
          pos.z=z;
          if(Math.hypot(dx,dz)>.0001){
            const targetYaw=Math.atan2(dx,dz);
            let turn=targetYaw-animal.model.rotation.y;
            turn=Math.atan2(Math.sin(turn),Math.cos(turn));
            animal.model.rotation.y+=turn*Math.min(1,dt*8);
          }
        }else{
          animal.phase+=dt*2.3; // Steer around a trunk on the next step.
        }
      }

      if(flying){
        pos.y=4.8+Math.sin(elapsed*2.1+animal.phase)*.36;
        for(const wing of animal.wings)
          wing.pivot.rotation.z=wing.side*(.12+Math.sin(elapsed*12+animal.phase)*.64);
      }else{
        pos.y=fleeing?Math.abs(Math.sin(elapsed*animal.speed*3+animal.phase))*.042:0;
      }
    }
    return deaths;
  }
}
