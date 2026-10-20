import * as THREE from 'three';
import { getSmokeTexture } from './Atmosphere.js';
import { nearbySmokeFires, denseSmokePosition, DENSE_SMOKE_PER_FIRE, DENSE_SMOKE_UPDATE_INTERVAL } from './SmokeHazardLogic.js';

/**
 * Additional visible low, dark smoke for dangerous areas only.
 * Deliberately does NOT modify ambient Atmosphere, fog or survival damage.
 * One pooled Points draw call with a shared 64x64 smoke texture.
 */
export class DenseSmoke {
  constructor(scene, { mobile = false } = {}) {
    this.fireLimit = mobile ? 12 : 18;
    this.capacity = this.fireLimit * DENSE_SMOKE_PER_FIRE;
    this.positions = new Float32Array(this.capacity * 3);
    const geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.positionAttribute);
    geometry.setDrawRange(0, 0);
    const material = new THREE.PointsMaterial({
      map: getSmokeTexture(),
      color: 0x55524f,
      size: mobile ? 6.4 : 7.1,
      opacity: .57,
      transparent: true,
      alphaTest: .012,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.mesh = new THREE.Points(geometry, material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.elapsedSinceUpdate = DENSE_SMOKE_UPDATE_INTERVAL;
    this.visibleCount = 0;
  }

  reset() {
    this.elapsedSinceUpdate = DENSE_SMOKE_UPDATE_INTERVAL;
    this.visibleCount = 0;
    this.mesh.geometry.setDrawRange(0, 0);
  }

  update(dt, fires, player, time) {
    this.elapsedSinceUpdate += dt;
    if (this.elapsedSinceUpdate < DENSE_SMOKE_UPDATE_INTERVAL) return;
    this.elapsedSinceUpdate = 0;

    // Prioritize clouds in sight of the player; no dense cloud appears after
    // its fire has been extinguished. The existing atmosphere is untouched.
    const selected = nearbySmokeFires(fires, player, this.fireLimit);
    let index = 0;
    for (const fire of selected) {
      for (let wisp = 0; wisp < DENSE_SMOKE_PER_FIRE; wisp++) {
        const position = denseSmokePosition(fire, wisp, time);
        const at = index++ * 3;
        this.positions[at] = position.x;
        this.positions[at + 1] = position.y;
        this.positions[at + 2] = position.z;
      }
    }
    this.visibleCount = index;
    this.mesh.geometry.setDrawRange(0, index);
    if (index) this.positionAttribute.needsUpdate = true;
  }
}
