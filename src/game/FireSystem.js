import * as THREE from 'three';
import { FIRE_POSITIONS } from './World.js';
import { FIRE_HEALTH, applyWater, findNearestFire } from './FireLogic.js';
const dummy = new THREE.Object3D();

export class FireSystem {
  constructor(scene) {
    this.fires = FIRE_POSITIONS.map(([x, z]) => ({ x, z, health: FIRE_HEALTH, active: true }));
    this.activeCount = this.fires.length;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.layers = [];
    this.createVisuals();
  }

  createVisuals() {
    const scorch = new THREE.InstancedMesh(
      new THREE.CircleGeometry(1, 18),
      new THREE.MeshBasicMaterial({ color: 0x382f28, transparent: true, opacity: .75, depthWrite: false }),
      this.fires.length,
    );
    this.fires.forEach((fire, i) => {
      dummy.position.set(fire.x, -.018, fire.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(2.65, 2.25, 1);
      dummy.updateMatrix();
      scorch.setMatrixAt(i, dummy.matrix);
    });
    scorch.instanceMatrix.needsUpdate = true;
    this.group.add(scorch);

    const colors = [0xff5a32, 0xff9c3b, 0xffdc69];
    for (let layer = 0; layer < 3; layer++) {
      const mesh = new THREE.InstancedMesh(
        new THREE.ConeGeometry(1, 2.25, 5),
        new THREE.MeshBasicMaterial({ color: colors[layer], transparent: true, opacity: layer === 2 ? .86 : .97, depthWrite: false }),
        this.fires.length * 3,
      );
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.layers.push(mesh);
      this.group.add(mesh);
    }
    this.smokeCount = this.fires.length * 6;
    this.smokePositions = new Float32Array(this.smokeCount * 3);
    this.smoke = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ color: 0x5b6659, size: 1.14, transparent: true, opacity: .31, depthWrite: false, sizeAttenuation: true }),
    );
    this.smoke.geometry.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    this.smoke.frustumCulled = false;
    this.group.add(this.smoke);
  }

  reset() {
    this.activeCount = this.fires.length;
    for (const fire of this.fires) { fire.active = true; fire.health = FIRE_HEALTH; }
    this.update(0, 0);
  }

  spray(position, direction, delta) {
    const completed = applyWater(this.fires, position, direction, delta);
    this.activeCount -= completed.length;
    return completed;
  }

  nearest(position, maxRange = 18) {
    return findNearestFire(this.fires, position, maxRange);
  }

  update(delta, elapsed) {
    let smokeIndex = 0;
    for (let f = 0; f < this.fires.length; f++) {
      const fire = this.fires[f];
      const health = fire.active ? .4 + fire.health / FIRE_HEALTH * .6 : 0;
      for (let layer = 0; layer < this.layers.length; layer++) {
        for (let flame = 0; flame < 3; flame++) {
          const index = f * 3 + flame;
          const phase = f * 1.7 + layer * 2.8 + flame * 3.1;
          const size = health * (1 + .12 * Math.sin(elapsed * 8 + phase));
          const x = fire.x + Math.sin(phase) * .7 * health + .14 * Math.sin(elapsed * 3 + phase);
          const z = fire.z + Math.cos(phase) * .7 * health;
          const h = (1.15 + layer * -.2 + flame * .12) * size;
          dummy.position.set(x, Math.max(0, h), z);
          dummy.rotation.set(.06 * Math.sin(elapsed * 4 + phase), phase + elapsed * .15, -.10 * Math.sin(elapsed * 3.2 + phase));
          dummy.scale.set((.86 - layer * .2) * size, h, (.86 - layer * .2) * size);
          dummy.updateMatrix();
          this.layers[layer].setMatrixAt(index, dummy.matrix);
        }
      }
      for (let p = 0; p < 6; p++) {
        const index = smokeIndex++ * 3;
        const cycle = (elapsed * (.22 + p * .01) + p / 6 + f * .138) % 1;
        this.smokePositions[index] = fire.x + (Math.sin(p * 4.37 + cycle * 7) * (0.3 + cycle * 2)) * health;
        this.smokePositions[index + 1] = fire.active ? 1.8 + cycle * 6.5 : -100;
        this.smokePositions[index + 2] = fire.z + (Math.cos(p * 3.26 + cycle * 6) * (0.3 + cycle * 2)) * health;
      }
    }
    for (const mesh of this.layers) mesh.instanceMatrix.needsUpdate = true;
    this.smoke.geometry.attributes.position.needsUpdate = true;
  }
}
