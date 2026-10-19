import * as THREE from 'three';

const matte = color => new THREE.MeshLambertMaterial({ color, flatShading: true });

function planeModel(large) {
  const root = new THREE.Group();
  const white = matte(large ? 0xf2f4ef : 0xe3e9da);
  const stripe = matte(large ? 0xf6aa40 : 0x58a9c7);
  const size = large ? 1.55 : 1;
  const mesh = (geometry, material, x, y, z) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x * size, y * size, z * size);
    root.add(object); return object;
  };
  const fuselage = mesh(new THREE.CylinderGeometry(.68 * size, .56 * size, 7.2 * size, 7), white, 0, 0, 0);
  fuselage.rotation.z = Math.PI / 2;
  const wing = mesh(new THREE.BoxGeometry(2.25 * size, .15 * size, 11.5 * size), white, 0, 0, 0);
  const tail = mesh(new THREE.BoxGeometry(1.3 * size, .12 * size, 4.9 * size), stripe, -3, .35, 0);
  mesh(new THREE.BoxGeometry(.8 * size, 1.5 * size, .13 * size), stripe, -3, .95, 0);
  mesh(new THREE.BoxGeometry(.95 * size, .55 * size, 1.25 * size), stripe, 2.25, .22, 0);
  root.rotation.y = Math.PI;
  return root;
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
    // Aim at the densest active cluster rather than dropping water in empty terrain.
    const center = targets.reduce((best, fire) => {
      const neighbors = targets.filter(other => Math.abs(other.z - fire.z) < (large ? 16 : 9)).length;
      return neighbors > best.count ? { count: neighbors, z: fire.z } : best;
    }, { count: 0, z: 0 });
    const model = planeModel(large);
    model.position.set(-56, large ? 20 : 15, center.z);
    this.scene.add(model);
    const drop = new THREE.Mesh(new THREE.CylinderGeometry(large ? 10 : 6, large ? 15 : 8, large ? 14 : 10, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x7acff0, opacity: .18, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    drop.position.set(0, -(large ? 10 : 7.5), 0);
    model.add(drop);
    this.active.push({ model, x: -56, z: center.z, large, raining: false, lastDrench: -60 });
    return true;
  }
  disposeFlight(flight) {
    this.scene.remove(flight.model);
    const materials = new Set();
    flight.model.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach(material => materials.add(material));
      else materials.add(object.material);
    });
    for (const material of materials) material.dispose();
  }
  reset() { for (const flight of this.active) this.disposeFlight(flight); this.active.length = 0; }
  update(dt, fires) {
    const completed = [];
    for (let i = this.active.length - 1; i >= 0; i--) {
      const flight = this.active[i];
      flight.x += (flight.large ? 14 : 12) * dt;
      flight.model.position.x = flight.x;
      const stream = flight.model.children.at(-1);
      flight.raining = flight.x > -40 && flight.x < 42;
      stream.visible = flight.raining;
      if (flight.raining && flight.x - flight.lastDrench > 1.6) {
        flight.lastDrench = flight.x;
        completed.push(...fires.drench(flight.x, flight.z, flight.large ? 15 : 9, flight.large ? 95 : 62));
      }
      if (flight.x > 60) { this.disposeFlight(flight); this.active.splice(i, 1); }
    }
    return completed;
  }
}
