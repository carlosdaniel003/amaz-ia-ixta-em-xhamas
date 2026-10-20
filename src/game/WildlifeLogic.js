/** Amazon-forest wildlife only; escape and survival decisions are renderer independent. */
export const SPECIES = Object.freeze([
  { name:'onça-pintada', kind:'cat', color:'#cfa452', scale:1.65 },
  { name:'anta', kind:'tapir', color:'#74685f', scale:2.05 },
  { name:'queixada', kind:'pig', color:'#6e6254', scale:1.55 },
  { name:'caititu', kind:'pig', color:'#8a7660', scale:1.35 },
  { name:'paca', kind:'rodent', color:'#7c583f', scale:1.15 },
  { name:'cutia', kind:'rodent', color:'#ab7852', scale:1.10 },
  { name:'macaco-aranha', kind:'monkey', color:'#4b3930', scale:1.35 },
  { name:'macaco-guariba', kind:'monkey', color:'#a45c40', scale:1.45 },
  { name:'preguiça-de-três-dedos', kind:'sloth', color:'#887963', scale:1.1 },
  { name:'arara-vermelha', kind:'parrot', color:'#c93f32', scale:1.35, flying:true },
  { name:'arara-canindé', kind:'parrot', color:'#ddad32', scale:1.35, flying:true },
  { name:'tucano-de-papo-branco', kind:'toucan', color:'#343933', scale:1.15, flying:true },
  { name:'mutum-cavalo', kind:'curassow', color:'#2e3235', scale:1.3 },
  { name:'sucuri-verde', kind:'snake', color:'#64734d', scale:1.65 },
]);
export const SPECIES_NAMES = SPECIES.map(species=>species.name);

export function closestFire(fires, position, radius = 18) {
  let best = null, shortest = radius*radius;
  for (const fire of fires) {
    if (!fire.active) continue;
    const distance=(fire.x-position.x)**2+(fire.z-position.z)**2;
    if (distance < shortest) { shortest=distance; best=fire; }
  }
  return best;
}

export function escapeDirection(animal, fires) {
  const fire=closestFire(fires,animal,24);
  if (fire) {
    const dx=animal.x-fire.x, dz=animal.z-fire.z, distance=Math.max(.01,Math.hypot(dx,dz));
    return { x:dx/distance, z:dz/distance };
  }
  // Wildlife without a nearby fire heads toward the safer outer understory.
  const dx=animal.x||1, dz=animal.z||1, distance=Math.max(.01,Math.hypot(dx,dz));
  return {x:dx/distance,z:dz/distance};
}

/** A calm animal wanders around a small home area; birds never hover in place. */
export function roamDirection(position, elapsed, phase, homeX, homeZ) {
  const toHomeX=homeX-position.x;
  const toHomeZ=homeZ-position.z;
  const distance=Math.hypot(toHomeX,toHomeZ);
  let angle=elapsed*.38+phase;
  let dx=Math.cos(angle),dz=Math.sin(angle);
  if(distance>7){dx=toHomeX/distance;dz=toHomeZ/distance;}
  // The soft boundary prevents wandering wildlife from getting stuck at the edge.
  if(Math.abs(position.x)>38) dx=-Math.sign(position.x);
  if(Math.abs(position.z)>38) dz=-Math.sign(position.z);
  const length=Math.max(.001,Math.hypot(dx,dz));
  return {x:dx/length,z:dz/length};
}


/**
 * Stratified locations cover the entire playable map instead of gathering
 * wildlife around the initial player position (0, 10). 6 x 5 cells, one
 * animal per cell; deterministic offsets keep the scene varied.
 */
export function wildlifeSpawnPoints(count, canOccupy = () => true) {
  const result = [];
  const totalCells = 30;
  const used = new Set();
  for (let i = 0; i < Math.min(count, totalCells); i++) {
    const cell = (i * 13 + 7) % totalCells; // 13 and 30 are coprime.
    const col = cell % 6;
    const row = Math.floor(cell / 6);
    const cx = -32 + col * 12.8;
    const cz = -31 + row * 15.5;
    const shifts = [
      [Math.sin(i * 5.31) * 2, Math.cos(i * 4.07) * 2],
      [-3.2, 2.4], [2.8, -2.5], [-1.3, -3.1], [0, 0],
    ];
    let position = { x: cx, z: cz };
    for (const [sx, sz] of shifts) {
      const candidate = {x: cx + sx, z: cz + sz};
      if (canOccupy(candidate.x, candidate.z)) {
        position = candidate;
        break;
      }
    }
    used.add(cell);
    result.push(position);
  }
  return result;
}
