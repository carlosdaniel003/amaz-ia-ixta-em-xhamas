import * as THREE from 'three';
import { FIRE_POSITIONS } from './World.js';
import { FIRE_HEALTH, applyWater, applyWaterArea, findNearestFire } from './FireLogic.js';
import { validSpreadPosition } from './SurvivalLogic.js';
import { getSmokeTexture } from './Atmosphere.js';
import { TreeFlames } from './TreeFlames.js';

const CAPACITY = 48;
const dummy = new THREE.Object3D();
const RAND_OFFSETS = [.15, 2.35, 4.5, 1.1, 5.3, 3.4, .8, 4.1];

export class FireSystem {
  constructor(scene, trees = [], mobile = false) {
    this.fires = [];
    this.group = new THREE.Group();
    this.activeCount = 0;
    scene.add(this.group);
    this.layers = [];
    this.createVisuals();
    this.treeFlames=new TreeFlames(scene,trees,{mobile});
    this.reset();
  }

  createVisuals() {
    const scorch = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 14), new THREE.MeshBasicMaterial({ color: 0x382f28, transparent: true, opacity: .77, depthWrite: false }), CAPACITY);
    this.scorch = scorch;
    this.group.add(scorch);
    const colors = [0xff5a32, 0xff9c3b, 0xffdc69];
    for (let layer = 0; layer < 3; layer++) {
      const mesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 2.25, 5), new THREE.MeshBasicMaterial({ color: colors[layer], transparent: true, opacity: layer === 2 ? .86 : .97, depthWrite: false }), CAPACITY * 3);
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.layers.push(mesh);
      this.group.add(mesh);
    }
    this.smokePositions = new Float32Array(CAPACITY * 6 * 3);
    this.smoke = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: getSmokeTexture(), color: 0x736a63, size: 4.7, transparent: true, opacity: .6, depthWrite: false, alphaTest: .008, sizeAttenuation: true }));
    this.smoke.geometry.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3).setUsage(THREE.DynamicDrawUsage));
    this.smoke.frustumCulled = false;
    this.group.add(this.smoke);
  }

  addFire(x, z, generation = 0) {
    if (this.fires.length >= CAPACITY) return false;
    const fire = { x, z, health: FIRE_HEALTH, active: true, generation, age: 0, spreadAt: 11 + (this.fires.length * 7 % 9), attempts: 0 };
    this.fires.push(fire);
    this.activeCount++;
    return fire;
  }

  reset() {
    this.fires.length = 0;
    this.activeCount = 0;
    FIRE_POSITIONS.forEach(([x, z]) => this.addFire(x, z));
    this.treeFlames.reset();
    this.update(0, 0);
  }

  spray(position, direction, dt, multiplier = 1) {
    const completed = applyWater(this.fires, position, direction, dt, multiplier);
    this.activeCount -= completed.length;
    return completed;
  }

  drench(x, z, radius, damage) {
    const completed = applyWaterArea(this.fires, x, z, radius, damage);
    this.activeCount -= completed.length;
    return completed;
  }

  nearest(position, maxRange = 18) { return findNearestFire(this.fires, position, maxRange); }

  spread(dt, canOccupy) {
    const newFires = [];
    const priorLength = this.fires.length;
    for (let index = 0; index < priorLength && this.fires.length < CAPACITY; index++) {
      const fire = this.fires[index];
      if (!fire.active || fire.generation >= 3) continue;
      fire.age += dt;
      if (fire.age < fire.spreadAt) continue;
      fire.age = 0;
      fire.spreadAt = 17 + (index * 3 % 9);
      for (let attempt = 0; attempt < RAND_OFFSETS.length; attempt++) {
        const angle = RAND_OFFSETS[(attempt + fire.attempts) % RAND_OFFSETS.length] + index * .71;
        const radius = 5.2 + (attempt % 3) * 1.1;
        const x = fire.x + Math.cos(angle) * radius;
        const z = fire.z + Math.sin(angle) * radius;
        if (validSpreadPosition(this.fires, x, z, canOccupy)) {
          const next = this.addFire(x, z, fire.generation + 1);
          if (next) newFires.push(next);
          break;
        }
      }
      fire.attempts++;
    }
    return newFires;
  }

  update(delta, elapsed) {
    this.smokePositions.fill(-100);
    for (let f = 0; f < CAPACITY; f++) {
      const fire = this.fires[f];
      const health = fire?.active ? .4 + fire.health / FIRE_HEALTH * .6 : 0;
      if (fire) {
        dummy.position.set(fire.x, -.018, fire.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(2.65, 2.25, 1);
      } else { dummy.position.set(0, -100, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(0, 0, 0); }
      dummy.updateMatrix();
      this.scorch.setMatrixAt(f, dummy.matrix);
      for (let layer = 0; layer < this.layers.length; layer++) {
        for (let flame = 0; flame < 3; flame++) {
          const index = f * 3 + flame;
          if (fire?.active) {
            const phase = f * 1.7 + layer * 2.8 + flame * 3.1;
            const size = health * (1 + .12 * Math.sin(elapsed * 8 + phase));
            const x = fire.x + Math.sin(phase) * .7 * health + .14 * Math.sin(elapsed * 3 + phase);
            const z = fire.z + Math.cos(phase) * .7 * health;
            const h = (1.15 + layer * -.2 + flame * .12) * size;
            dummy.position.set(x, Math.max(0, h), z);
            dummy.rotation.set(.06 * Math.sin(elapsed * 4 + phase), phase + elapsed * .15, -.10 * Math.sin(elapsed * 3.2 + phase));
            dummy.scale.set((.86 - layer * .2) * size, h, (.86 - layer * .2) * size);
          } else { dummy.position.set(0, -100, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(0, 0, 0); }
          dummy.updateMatrix();
          this.layers[layer].setMatrixAt(index, dummy.matrix);
        }
      }
      if (!fire?.active) continue;
      for (let p = 0; p < 6; p++) {
        const index = (f * 6 + p) * 3;
        const cycle = (elapsed * (.22 + p * .01) + p / 6 + f * .138) % 1;
        this.smokePositions[index] = fire.x + Math.sin(p * 4.37 + cycle * 7) * (.3 + cycle * 2) * health;
        this.smokePositions[index + 1] = 1.8 + cycle * 6.5;
        this.smokePositions[index + 2] = fire.z + Math.cos(p * 3.26 + cycle * 6) * (.3 + cycle * 2) * health;
      }
    }
    this.scorch.instanceMatrix.needsUpdate = true;
    for (const mesh of this.layers) mesh.instanceMatrix.needsUpdate = true;
    this.smoke.geometry.attributes.position.needsUpdate = true;
    this.treeFlames.update(delta,elapsed,this.fires);
  }
}
