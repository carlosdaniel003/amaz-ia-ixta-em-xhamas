import * as THREE from 'three';

export const MAP_RADIUS = 43;
export const FIRE_POSITIONS = Object.freeze([
  [-12, -10], [11, -14], [-24, 8], [3, 23], [23, 10], [23, -23],
  [-9, 25], [-27, -21], [33, -7], [-23, 29], [32, 28], [0, -32],
]);

const dummy = new THREE.Object3D();
function randomGenerator(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function instance(mesh, index, x, y, z, sx, sy, sz, rotation = 0) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(0, rotation, 0);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

export class World {
  constructor(scene) {
    this.group = new THREE.Group();
    this.obstacles = [];
    scene.add(this.group);
    this.generate();
  }

  generate() {
    const rng = randomGenerator(8531);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(115, 115),
      new THREE.MeshLambertMaterial({ color: 0x56865a }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.07;
    this.group.add(ground);

    // Keep scenery procedural and batched: a handful of draw calls, even with hundreds of props.
    const patches = new THREE.InstancedMesh(
      new THREE.CircleGeometry(1, 9),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, depthWrite: false }),
      95,
    );
    for (let i = 0; i < patches.count; i++) {
      const x = (rng() - 0.5) * 105;
      const z = (rng() - 0.5) * 105;
      dummy.position.set(x, -0.045, z);
      dummy.rotation.set(-Math.PI / 2, 0, rng() * Math.PI);
      dummy.scale.set(1.1 + rng() * 4, 0.8 + rng() * 3, 1);
      dummy.updateMatrix();
      patches.setMatrixAt(i, dummy.matrix);
      patches.setColorAt(i, new THREE.Color().setHSL(0.18 + rng() * 0.19, 0.42, 0.17 + rng() * 0.35));
    }
    patches.instanceMatrix.needsUpdate = true;
    this.group.add(patches);

    const trees = [];
    let attempts = 0;
    while (trees.length < 126 && attempts++ < 2500) {
      const x = (rng() - 0.5) * 103;
      const z = (rng() - 0.5) * 103;
      if (Math.hypot(x, z - 10) < 7.5 || Math.hypot(x, z) < 6) continue;
      if (FIRE_POSITIONS.some(([fx, fz]) => Math.hypot(x - fx, z - fz) < 3.6)) continue;
      if (trees.some((tree) => Math.hypot(x - tree.x, z - tree.z) < 2.6)) continue;
      trees.push({ x, z, height: 3 + rng() * 3.6, width: 1.5 + rng() * 1.6, seed: rng() });
      this.obstacles.push({ x, z, radius: 0.75 });
    }

    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.62, 1, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), trees.length);
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), trees.length * 2);
    const shadows = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10), new THREE.MeshBasicMaterial({ color: 0x123e2a, transparent: true, opacity: 0.15, depthWrite: false }), trees.length);
    trees.forEach((tree, i) => {
      instance(trunk, i, tree.x, tree.height * .35, tree.z, .73, tree.height * .7, .73, tree.seed * 5);
      instance(crown, i * 2, tree.x, tree.height * .77, tree.z, tree.width, tree.height * .36, tree.width, tree.seed * 4);
      instance(crown, i * 2 + 1, tree.x + .35, tree.height * 1.02, tree.z - .25, tree.width * .75, tree.height * .24, tree.width * .75, tree.seed * 6);
      dummy.position.set(tree.x, -0.038, tree.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(tree.width * 1.15, tree.width * .85, 1);
      dummy.updateMatrix();
      shadows.setMatrixAt(i, dummy.matrix);
      trunk.setColorAt(i, new THREE.Color().setHSL(.073 + tree.seed * .023, .33, .23 + tree.seed * .12));
      const color = new THREE.Color().setHSL(.31 + tree.seed * .09, .48 + tree.seed * .25, .23 + tree.seed * .17);
      crown.setColorAt(i * 2, color);
      crown.setColorAt(i * 2 + 1, color.clone().multiplyScalar(1.08));
    });
    for (const mesh of [trunk, crown, shadows]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    }

    const shrubs = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), 250);
    for (let i = 0; i < shrubs.count; i++) {
      const x = (rng() - .5) * 105;
      const z = (rng() - .5) * 105;
      const size = .25 + rng() * .62;
      instance(shrubs, i, x, size * .50, z, size * 1.5, size, size * 1.1, rng() * 6);
      shrubs.setColorAt(i, new THREE.Color().setHSL(.28 + rng() * .14, .5, .22 + rng() * .18));
    }
    shrubs.instanceMatrix.needsUpdate = true;
    shrubs.computeBoundingSphere();
    this.group.add(shrubs);

    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), 60);
    for (let i = 0; i < rocks.count; i++) {
      const x = (rng() - .5) * 97;
      const z = (rng() - .5) * 97;
      const size = .22 + rng() * .62;
      instance(rocks, i, x, size * .27, z, size * 1.5, size * .53, size, rng() * 6);
      rocks.setColorAt(i, new THREE.Color().setHSL(.14 + rng() * .05, .09, .28 + rng() * .15));
    }
    rocks.instanceMatrix.needsUpdate = true;
    rocks.computeBoundingSphere();
    this.group.add(rocks);

    // A clear starting area helps players understand the character and first objective.
    const startingCircle = new THREE.Mesh(new THREE.CircleGeometry(5.7, 48), new THREE.MeshBasicMaterial({ color: 0x93af6a, transparent: true, opacity: 0.17, depthWrite: false }));
    startingCircle.rotation.x = -Math.PI / 2;
    startingCircle.position.set(0, -0.025, 10);
    this.group.add(startingCircle);
  }

  canOccupy(x, z) {
    if (Math.abs(x) > MAP_RADIUS || Math.abs(z) > MAP_RADIUS) return false;
    return !this.obstacles.some((tree) => (tree.x - x) ** 2 + (tree.z - z) ** 2 < (tree.radius + .40) ** 2);
  }
}
