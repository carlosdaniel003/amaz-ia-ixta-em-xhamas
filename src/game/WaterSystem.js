import * as THREE from 'three';
import { jetEndPoint } from './WaterAim.js';

// The jet is visual-only. Every droplet is aligned with the authoritative
// central aim ray from FireLogic, rather than following independent ballistics.
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

  /**
   * The hose starts on the right side of the view and converges to the reticle.
   * A target under the reticle shortens the stream to its hit distance.
   * No gravity curve: the rendered trajectory and hit test never disagree.
   */
  update(dt, spraying, eye, nozzle, direction, hitDistance = null) {
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
    const end = jetEndPoint(eye, direction, hitDistance);
    const vx = end.x - nozzle.x;
    const vy = end.y - nozzle.y;
    const vz = end.z - nozzle.z;

    for (let i = 0; i < MAX_DROPLETS; i++) {
      const progress = (i / MAX_DROPLETS + this.flow) % 1;
      const offset = i * 3;
      // Narrow spray near the nozzle; almost no scatter near the hit point.
      const swirl = .035 * Math.sin(i * 5.31 + this.flow * 22) * (1 - progress);
      this.positions[offset] = nozzle.x + vx * progress + swirl;
      this.positions[offset + 1] = nozzle.y + vy * progress + swirl * .3;
      this.positions[offset + 2] = nozzle.z + vz * progress;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}
