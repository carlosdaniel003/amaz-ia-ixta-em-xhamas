import * as THREE from 'three';

// A single feathered smoke texture shared by the forest haze and fire columns.
let texture;
export function getSmokeTexture() {
  if (texture) return texture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,.76)');
  gradient.addColorStop(.4, 'rgba(255,255,255,.48)');
  gradient.addColorStop(.8, 'rgba(255,255,255,.14)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function makeClouds(count, material) {
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const mesh = new THREE.Points(geometry, material);
  mesh.frustumCulled = false;
  return { positions, mesh, attribute: geometry.attributes.position };
}

// Low-cost smoke sprites and drifting embers: no postprocessing and no new per-frame objects.
export class Atmosphere {
  constructor(scene) {
    this.scene = scene;
    this.elapsed = 0;
    this.clouds = makeClouds(112, new THREE.PointsMaterial({
      map: getSmokeTexture(), color: 0x81796e, size: 8.5, opacity: .43,
      transparent: true, depthWrite: false, alphaTest: .01, sizeAttenuation: true,
    }));
    this.embers = makeClouds(84, new THREE.PointsMaterial({
      color: 0xff9d59, size: .15, opacity: .66, transparent: true,
      depthWrite: false, sizeAttenuation: true,
    }));
    this.glow = new THREE.PointLight(0xff673b, 2.1, 13, 2);
    scene.add(this.clouds.mesh, this.embers.mesh, this.glow);
    // Stable procedural offsets, with no random allocation in the render loop.
    this.cloudData = Array.from({ length: 112 }, (_, i) => ({
      anchor: i % 12, x: Math.sin(i * 5.31) * 7, z: Math.cos(i * 4.17) * 7,
      height: (i * 3.7) % 17, rate: .45 + (i % 7) * .19,
    }));
    this.emberData = Array.from({ length: 84 }, (_, i) => ({
      anchor: i % 12, x: Math.sin(i * 8.17) * 5, z: Math.cos(i * 7.33) * 5,
      height: (i * 2.7) % 8, rate: .6 + (i % 6) * .15,
    }));
    this.reset();
  }

  reset() {
    this.elapsed = 0;
    this.glow.intensity = 0;
    this.clouds.positions.fill(-100);
    this.embers.positions.fill(-100);
    this.clouds.attribute.needsUpdate = true;
    this.embers.attribute.needsUpdate = true;
  }

  update(dt, fires, player) {
    this.elapsed += dt;
    const active = fires.fires.filter(fire => fire.active);
    const strength = Math.min(1, active.length / 12);
    const targetDensity = .019 + strength * .016;
    this.scene.fog.density += (targetDensity - this.scene.fog.density) * Math.min(1, dt * .7);
    this.clouds.mesh.material.opacity = .12 + strength * .33;
    this.embers.mesh.material.opacity = .08 + strength * .58;
    const t = this.elapsed;
    for (let i = 0; i < this.cloudData.length; i++) {
      const p = this.cloudData[i];
      const target = active.length ? active[p.anchor % active.length] : player;
      const at = i * 3;
      this.clouds.positions[at] = target.x + p.x + Math.sin(t * .2 + i) * 2.2;
      this.clouds.positions[at + 1] = 1.5 + (p.height + t * p.rate) % 18;
      this.clouds.positions[at + 2] = target.z + p.z + Math.cos(t * .13 + i) * 1.7;
    }
    this.clouds.attribute.needsUpdate = true;
    for (let i = 0; i < this.emberData.length; i++) {
      const p = this.emberData[i], target = active.length ? active[p.anchor % active.length] : null, at = i * 3;
      this.embers.positions[at] = target ? target.x + p.x + Math.sin(t * .55 + i) : -100;
      this.embers.positions[at + 1] = 1 + (p.height + t * p.rate) % 10;
      this.embers.positions[at + 2] = target ? target.z + p.z + Math.cos(t * .3 + i) : -100;
    }
    this.embers.attribute.needsUpdate = true;
    let nearest = null, closest = 15 * 15;
    for (const fire of active) {
      const distance = (player.x - fire.x) ** 2 + (player.z - fire.z) ** 2;
      if (distance < closest) { nearest = fire; closest = distance; }
    }
    this.glow.intensity = nearest ? 1.3 + strength * .85 : 0;
    if (nearest) this.glow.position.set(nearest.x, 2.6, nearest.z);
  }
}
