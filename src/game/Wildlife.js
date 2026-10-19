import * as THREE from 'three';
import { exposureAt } from './SurvivalLogic.js';

const SPOTS = [[-13,-13],[9,-17],[-26,12],[1,26],[26,12],[24,-26],[-12,28],[-31,-22],[36,-8],[30,27],[-20,22],[2,-34]];
const brown = new THREE.MeshLambertMaterial({ color: 0xad7950, flatShading: true });
const dark = new THREE.MeshLambertMaterial({ color: 0x473e32, flatShading: true });
const tan = new THREE.MeshLambertMaterial({ color: 0xc49e6d, flatShading: true });
const grey = new THREE.MeshLambertMaterial({ color: 0x6a6a65, flatShading: true });

function creature(index) {
  const root = new THREE.Group();
  const group = new THREE.Group();
  root.add(group);
  const mat = index % 3 === 0 ? tan : brown;
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(.68, 0), mat);
  body.scale.set(.95, .67, 1.5);
  body.position.y = .75;
  group.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.4, 0), mat);
  head.position.set(0, .98, -.84);
  group.add(head);
  for (const x of [-.46, .46]) {
    const ear = new THREE.Mesh(new THREE.IcosahedronGeometry(.19, 0), mat);
    ear.position.set(x, 1.21, -.75); group.add(ear);
  }
  for (const x of [-.4, .4]) for (const z of [-.56, .57]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.23, .56, .23), dark);
    leg.position.set(x, .3, z); group.add(leg);
  }
  const nose = new THREE.Mesh(new THREE.IcosahedronGeometry(.14, 0), dark);
  nose.position.set(0, .83, -1.17); group.add(nose);
  root.userData.body = body;
  root.userData.group = group;
  return root;
}

export class Wildlife {
  constructor(scene) {
    this.scene = scene;
    this.animals = SPOTS.map(([x, z], i) => {
      const model = creature(i);
      model.position.set(x + ((i % 3) - 1) * 2.2, 0, z + (i % 2 ? 3 : -3));
      scene.add(model);
      return { model, x: model.position.x, z: model.position.z, state: 'trapped', smoke: 0, cause: '', life: 1, speed: 3 + i % 3 };
    });
    this.reset();
  }
  reset() {
    this.animals.forEach((a, i) => {
      a.state = i < 2 ? 'dead' : 'trapped';
      a.cause = i === 0 ? 'fire' : i === 1 ? 'smoke' : '';
      a.smoke = 0; a.life = 1;
      a.model.position.set(a.x, 0, a.z);
      a.model.rotation.set(0, 0, 0);
      a.model.userData.group.rotation.set(0, 0, a.state === 'dead' ? Math.PI / 2 : 0);
      a.model.userData.body.material = a.state === 'dead' ? grey : i % 3 === 0 ? tan : brown;
      a.model.visible = true;
    });
    this.rescued = 0;
    this.lost = 2;
  }
  releaseNear(fire) {
    let released = 0;
    for (const animal of this.animals) {
      if (animal.state !== 'trapped') continue;
      if (Math.hypot(animal.x - fire.x, animal.z - fire.z) <= 13) {
        animal.state = 'rescued'; this.rescued++; released++;
      }
    }
    return released;
  }
  update(dt, elapsed, fires) {
    let lostNow = 0;
    for (const animal of this.animals) {
      if (animal.state === 'dead') continue;
      const exposure = exposureAt(fires.fires, animal.model.position);
      if (animal.state === 'trapped') {
        animal.smoke += exposure.smoke * dt * 5;
        if (exposure.directFire) animal.life -= dt * .37;
        else if (animal.smoke > 20) animal.life -= dt * .08;
        if (animal.life <= 0) {
          animal.state = 'dead'; animal.cause = exposure.directFire ? 'fire' : 'smoke';
          animal.model.userData.group.rotation.z = Math.PI / 2;
          animal.model.userData.body.material = grey;
          this.lost++; lostNow++; continue;
        }
        animal.model.position.y = Math.sin(elapsed * 2 + animal.x) * .02;
      } else {
        const targetX = 0, targetZ = 42;
        const dx = targetX - animal.model.position.x, dz = targetZ - animal.model.position.z;
        const distance = Math.hypot(dx, dz);
        if (distance > 1.2) {
          animal.model.position.x += dx / distance * animal.speed * dt;
          animal.model.position.z += dz / distance * animal.speed * dt;
          animal.model.rotation.y = Math.atan2(-dx, -dz);
          animal.model.position.y = Math.abs(Math.sin(elapsed * 9 + animal.x)) * .07;
        } else animal.model.visible = false;
      }
    }
    return lostNow;
  }
}
