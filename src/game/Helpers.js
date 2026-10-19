import { Player } from './Player.js';
import { MAX_HELPERS } from './SurvivalLogic.js';

export class Helpers {
  constructor(scene) { this.scene = scene; this.units = []; }
  hire(spawn) {
    if (this.units.length >= MAX_HELPERS) return false;
    const model = new Player(this.scene);
    const index = this.units.length;
    model.position.set(spawn.x + 1.8 + index * .8, 0, spawn.z + 1.7);
    this.units.push({ model, target: null });
    return true;
  }
  reset() {
    for (const unit of this.units) {
      this.scene.remove(unit.model.root);
      const materials = new Set();
      unit.model.root.traverse(object => {
        if (!object.isMesh) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach(material => materials.add(material));
        else materials.add(object.material);
      });
      for (const material of materials) material.dispose();
    }
    this.units.length = 0;
  }
  update(dt, fires, world) {
    const completed = [];
    const usedTargets = new Set();
    for (const unit of this.units) {
      const pos = unit.model.position;
      if (!unit.target?.active || usedTargets.has(unit.target)) unit.target = null;
      if (!unit.target) {
        const candidates = fires.fires.filter(fire => fire.active && !usedTargets.has(fire));
        candidates.sort((a, b) => (a.x - pos.x) ** 2 + (a.z - pos.z) ** 2 - ((b.x - pos.x) ** 2 + (b.z - pos.z) ** 2));
        unit.target = candidates[0] ?? null;
      }
      if (!unit.target) continue;
      usedTargets.add(unit.target);
      const dx = unit.target.x - pos.x, dz = unit.target.z - pos.z;
      const distance = Math.hypot(dx, dz);
      let moving = false;
      if (distance > 7 && distance > .001) {
        const vx = dx / distance * dt * 5.2, vz = dz / distance * dt * 5.2;
        if (world.canOccupy(pos.x + vx, pos.z) && !fires.fires.some(f => f.active && Math.hypot(f.x - pos.x - vx, f.z - pos.z) < 2.8)) { pos.x += vx; moving = true; }
        if (world.canOccupy(pos.x, pos.z + vz) && !fires.fires.some(f => f.active && Math.hypot(f.x - pos.x, f.z - pos.z - vz) < 2.8)) { pos.z += vz; moving = true; }
      }
      unit.model.face(unit.target.x, unit.target.z);
      unit.model.update(dt, moving);
      if (distance <= 10.8) completed.push(...fires.spray(pos, unit.model.forward, dt, .75));
    }
    return completed;
  }
}
