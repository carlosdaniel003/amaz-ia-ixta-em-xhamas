import * as THREE from 'three';
import { selectFlyoverLane, advanceFlight } from './AirSupportLogic.js';

// Aircraft and falling water stay in one cheap draw call each; no heavy shaders.
const RAIN_COUNT = 48;
const matte = color => new THREE.MeshBasicMaterial({ color, fog: false });

function planeModel(large) {
  const root = new THREE.Group();
  const white = matte(large ? 0xf3eed8 : 0xe5f4ee);
  const stripe = matte(large ? 0xf4a744 : 0x64c6dc);
  const scale = large ? 1.55 : 1;
  const mesh = (geometry, material, x, y, z) => {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(x * scale, y * scale, z * scale);
    root.add(item);
    return item;
  };
  const body = mesh(new THREE.CylinderGeometry(.65 * scale, .55 * scale, 7.2 * scale, 7), white, 0, 0, 0);
  body.rotation.z = Math.PI / 2;
  mesh(new THREE.BoxGeometry(2.25 * scale, .15 * scale, 11.5 * scale), white, 0, 0, 0);
  mesh(new THREE.BoxGeometry(1.3 * scale, .12 * scale, 4.9 * scale), stripe, -3, .35, 0);
  mesh(new THREE.BoxGeometry(.8 * scale, 1.5 * scale, .13 * scale), stripe, -3, .95, 0);
  mesh(new THREE.BoxGeometry(.95 * scale, .55 * scale, 1.25 * scale), stripe, 2.25, .22, 0);
  root.rotation.y = Math.PI;
  return root;
}

function waterCurtain(scene, large) {
  const positions = new Float32Array(RAIN_COUNT * 3);
  positions.fill(-1000);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const mesh = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: large ? 0xa2e6ff : 0x87d9fc,
    size: large ? .56 : .37, transparent: true, opacity: .86,
    depthWrite: false, sizeAttenuation: true, fog: false,
  }));
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  return {mesh, positions, attribute: geometry.attributes.position};
}

export class AirSupport {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
  }

  dispatch(type, fires) {
    const large = type === 'state';
    const targets = fires.fires.filter(f => f.active);
    if (!targets.length) return false;

    // Choose a lane through the highest concentration of actual active fires.
    const radius = large ? 15 : 9;
    const best = selectFlyoverLane(targets, radius);

    const altitude = large ? 41 : 35; // Above the tallest canopy.
    const model = planeModel(large);
    model.position.set(-56, altitude, best.z);
    this.scene.add(model);
    const rain = waterCurtain(this.scene, large);
    this.active.push({
      model, rain, x:-56, z:best.z, altitude, large, type,
      raining:false, lastDrench:-60, flightTime:0, extinguished:0,
    });
    return true;
  }

  disposeFlight(flight) {
    this.scene.remove(flight.model, flight.rain.mesh);
    const materials = new Set();
    flight.model.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach(material => materials.add(material));
      else materials.add(object.material);
    });
    for (const material of materials) material.dispose();
    flight.rain.mesh.geometry.dispose();
    flight.rain.mesh.material.dispose();
  }

  reset() {
    for (const flight of this.active) this.disposeFlight(flight);
    this.active.length = 0;
  }

  update(dt, fires) {
    const completed = [];
    for (let i = this.active.length - 1; i >= 0; i--) {
      const flight = this.active[i];
      const shouldDrench = advanceFlight(flight, dt);
      flight.model.position.x = flight.x;
      flight.model.position.y = flight.altitude + Math.sin(flight.flightTime * 2.1) * .22;
      flight.model.rotation.z = Math.sin(flight.flightTime * 1.65) * .025;
      flight.rain.mesh.visible = flight.raining;

      if (flight.raining) {
        const positions = flight.rain.positions;
        const spread = flight.large ? 10 : 6;
        const dropPhase = flight.flightTime * 1.5;
        for (let j=0; j<RAIN_COUNT; j++) {
          const progress = (j / RAIN_COUNT + dropPhase) % 1;
          const angle = j * 2.399963; // Even low-count distribution.
          const size = Math.sqrt(progress) * spread;
          const offset = j * 3;
          positions[offset] = flight.x - progress * 4 + Math.cos(angle) * size * .23;
          positions[offset+1] = flight.altitude - progress * (flight.altitude-.55);
          positions[offset+2] = flight.z + Math.sin(angle) * size;
        }
        flight.rain.attribute.needsUpdate = true;

        // This is the real damage event. The tactical preview displays these fires.
        if (shouldDrench) {
          flight.lastDrench = flight.x;
          const extinguished = fires.drench(flight.x, flight.z, flight.large ? 15 : 9, flight.large ? 95 : 62);
          flight.extinguished += extinguished.length;
          completed.push(...extinguished);
        }
      }
      if (flight.x > 60) {
        this.disposeFlight(flight);
        this.active.splice(i,1);
      }
    }
    return completed;
  }
}
