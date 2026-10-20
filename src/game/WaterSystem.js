import * as THREE from 'three';
import { waterImpactPoint } from './WaterAim.js';

// A single Points draw call: no per-particle physics bodies, textures or new meshes.
const MAX_DROPLETS = 78;

export class WaterSystem {
  constructor(scene) {
    this.positions = new Float32Array(MAX_DROPLETS * 3);
    this.positions.fill(-1000);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: 0xb7eaff, size: .14, transparent: true, opacity: .92,
      depthWrite: false, sizeAttenuation: true,
    }));
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.flow = 0;
    this.spraying = false;
  }

  reset() {
    this.flow = 0;
    this.spraying = false;
    this.positions.fill(-1000);
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }

  /** Water visually arcs with gravity but lands on the target used by the hit test. */
  update(dt, spraying, eye, nozzle, direction, hit = null) {
    if (!spraying) {
      if (this.spraying) {
        this.spraying = false;
        this.positions.fill(-1000);
        this.mesh.geometry.attributes.position.needsUpdate = true;
      }
      return;
    }
    this.spraying = true;
    this.flow = (this.flow + dt * 2.35) % 1;
    const end = waterImpactPoint(eye, direction, hit);
    const dx = end.x - nozzle.x;
    const dy = end.y - nozzle.y;
    const dz = end.z - nozzle.z;
    const arc = Math.min(1.05, .12 + Math.hypot(dx, dz) * .07);

    for (let i = 0; i < MAX_DROPLETS; i++) {
      const progress = (i / MAX_DROPLETS + this.flow) % 1;
      const curve = 4 * arc * progress * (1 - progress);
      const offset = i * 3;
      const swirl = .035 * Math.sin(i * 5.31 + this.flow * 22) * (1 - progress);
      this.positions[offset] = nozzle.x + dx * progress + swirl;
      this.positions[offset + 1] = nozzle.y + dy * progress + curve + swirl * .3;
      this.positions[offset + 2] = nozzle.z + dz * progress;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}
