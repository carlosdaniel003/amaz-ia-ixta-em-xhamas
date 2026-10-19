import * as THREE from 'three';

const MAX_DROPLETS = 220;
const PARTICLE_LIFE = .58;

export class WaterSystem {
  constructor(scene) {
    this.droplets = Array.from({ length: MAX_DROPLETS }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }));
    this.positions = new Float32Array(MAX_DROPLETS * 3);
    this.positions.fill(-1000);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xb5eeff, size: .25, transparent: true, opacity: .91, depthWrite: false, sizeAttenuation: true }));
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.cursor = 0;
    this.emission = 0;
  }

  reset() {
    for (const drop of this.droplets) drop.life = 0;
    this.positions.fill(-1000);
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.emission = 0;
  }

  update(delta, spraying, origin, direction) {
    if (spraying) {
      this.emission = Math.min(this.emission + delta * 260, 30);
      while (this.emission >= 1) {
        this.emission -= 1;
        const drop = this.droplets[this.cursor];
        this.cursor = (this.cursor + 1) % MAX_DROPLETS;
        drop.life = PARTICLE_LIFE * (.8 + Math.random() * .35);
        drop.x = origin.x;
        drop.y = origin.y;
        drop.z = origin.z;
        drop.vx = direction.x * (19 + Math.random() * 4) + (Math.random() - .5) * 1.6;
        drop.vy = 3 + Math.random() * 3;
        drop.vz = direction.z * (19 + Math.random() * 4) + (Math.random() - .5) * 1.6;
      }
    } else this.emission = 0;

    for (let i = 0; i < MAX_DROPLETS; i++) {
      const drop = this.droplets[i];
      const offset = i * 3;
      if (drop.life <= 0) { this.positions[offset] = -1000; continue; }
      drop.life -= delta;
      drop.x += drop.vx * delta;
      drop.y += drop.vy * delta;
      drop.z += drop.vz * delta;
      drop.vy -= 19 * delta;
      if (drop.y < .05 || drop.life <= 0) { drop.life = 0; this.positions[offset] = -1000; continue; }
      this.positions[offset] = drop.x;
      this.positions[offset + 1] = drop.y;
      this.positions[offset + 2] = drop.z;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}
