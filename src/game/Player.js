import * as THREE from 'three';

const COLORS = { coat: 0xe27d45, coatDark: 0xaf512b, skin: 0xb57a57, pants: 0x27433c, helmet: 0xf3c866, boot: 0x24312b, hair: 0x202723, accent: 0xeaf3b2 };
const lambert = (hex) => new THREE.MeshLambertMaterial({ color: hex, flatShading: true });

function part(group, geometry, material, position, rotation) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  group.add(mesh);
  return mesh;
}

export class Player {
  constructor(scene) {
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.root.position.set(0, 0, 10);
    scene.add(this.root);
    this.createCharacter();
    this.animationTime = 0;
    this.yaw = 0;
    this._forward = new THREE.Vector3(0, 0, -1);
  }

  createCharacter() {
    const mat = Object.fromEntries(Object.entries(COLORS).map(([key, value]) => [key, lambert(value)]));
    const cylinder = (radiusTop, radiusBottom, length, segments = 8) => new THREE.CylinderGeometry(radiusTop, radiusBottom, length, segments);
    part(this.body, cylinder(.45, .54, .94), mat.coat, [0, 1.43, 0]);
    part(this.body, new THREE.BoxGeometry(.94, .12, .15), mat.accent, [0, 1.24, -.33]);
    part(this.body, new THREE.BoxGeometry(.21, .7, .13), mat.coatDark, [0, 1.5, -.46]);
    part(this.body, cylinder(.31, .30, .18), mat.skin, [0, 1.97, 0]);
    part(this.body, new THREE.IcosahedronGeometry(.42, 1), mat.skin, [0, 2.31, -.03]);
    part(this.body, new THREE.SphereGeometry(.4, 9, 6, 0, Math.PI * 2, 0, Math.PI * .43), mat.hair, [0, 2.40, -.018]);
    part(this.body, cylinder(.48, .54, .2, 12), mat.helmet, [0, 2.66, -.03]);
    part(this.body, new THREE.CylinderGeometry(.56, .56, .06, 12), mat.helmet, [0, 2.55, -.1]);
    part(this.body, new THREE.BoxGeometry(.25, .07, .06), mat.accent, [0, 2.67, -.49]);
    for (const x of [-.15, .15]) part(this.body, new THREE.SphereGeometry(.035, 6, 4), mat.hair, [x, 2.33, -.4]);

    this.legs = [];
    for (const side of [-1, 1]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * .23, 1.02, 0);
      this.body.add(legGroup);
      part(legGroup, cylinder(.21, .17, .72), mat.pants, [0, -.37, 0]);
      part(legGroup, new THREE.BoxGeometry(.31, .25, .52), mat.boot, [0, -.77, -.11]);
      this.legs.push(legGroup);
    }

    this.arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * .56, 1.81, 0);
      this.body.add(arm);
      part(arm, cylinder(.19, .16, .58), mat.coat, [side * .035, -.31, -.10], [side * -.11, 0, side * -.17]);
      part(arm, new THREE.IcosahedronGeometry(.17, 0), mat.skin, [side * .06, -.65, -.20]);
      this.arms.push(arm);
    }
    // Hose/nozzle held with the right hand and visually aimed along the forward axis (-Z).
    part(this.body, new THREE.CylinderGeometry(.10, .13, .6, 9), mat.boot, [.52, 1.27, -.54], [Math.PI / 2, 0, 0]);
    part(this.body, new THREE.CylinderGeometry(.14, .10, .14, 9), mat.accent, [.52, 1.27, -.84], [Math.PI / 2, 0, 0]);
    const hose = new THREE.Mesh(new THREE.TorusGeometry(.54, .095, 6, 14, Math.PI * 1.3), mat.coatDark);
    hose.position.set(.56, .88, .16);
    hose.rotation.y = Math.PI / 2;
    this.body.add(hose);
    part(this.body, new THREE.CylinderGeometry(.11, .11, .63, 7), mat.boot, [.35, 1.48, .52], [0, 0, -.25]);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 20), new THREE.MeshBasicMaterial({ color: 0x0e3828, opacity: .24, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = .006;
    this.root.add(shadow);
  }

  get position() { return this.root.position; }
  get forward() { return this._forward; }

  nozzleWorldPosition(target = new THREE.Vector3()) {
    return this.body.localToWorld(target.set(.52, 1.27, -.97));
  }

  face(x, z) {
    const dx = x - this.position.x;
    const dz = z - this.position.z;
    if (dx * dx + dz * dz < .001) return;
    this.yaw = Math.atan2(-dx, -dz);
    this.body.rotation.y = this.yaw;
    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  update(delta, moving) {
    this.animationTime += delta * (moving ? 10 : 2);
    const sway = Math.sin(this.animationTime);
    this.legs[0].rotation.x = moving ? sway * .36 : 0;
    this.legs[1].rotation.x = moving ? -sway * .36 : 0;
    this.arms[0].rotation.x = moving ? -sway * .15 : 0;
    this.body.position.y = moving ? Math.abs(sway) * .065 : Math.sin(this.animationTime) * .014;
  }

  reset() {
    this.position.set(0, 0, 10);
    this.face(0, 0);
  }
}
