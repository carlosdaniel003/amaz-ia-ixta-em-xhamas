import { HOSE_RANGE, WATER_DAMAGE_PER_SECOND } from './FireLogic.js';

/**
 * A tree is ablaze while an actual nearby ground fire remains active.
 * Prefer the trees nearest the player, keeping the low-poly effect useful
 * without increasing the instance count on mobile.
 */
export function burningTrees(trees, fires, limit, player = null) {
  const candidates = [];
  for (const tree of trees) {
    let nearest = null;
    let distanceSq = 100; // Fire actually reaches the tree within ten world units.
    for (const fire of fires) {
      if (!fire.active) continue;
      const d = (fire.x-tree.x)**2 + (fire.z-tree.z)**2;
      if (d < distanceSq) { distanceSq = d; nearest = fire; }
    }
    if (nearest) {
      const dPlayer = player
        ? (tree.x-player.x)**2 + (tree.z-player.z)**2
        : distanceSq;
      candidates.push({tree, fire:nearest, distanceSq:dPlayer});
    }
  }
  candidates.sort((a,b)=>a.distanceSq-b.distanceSq);
  return candidates.slice(0,limit);
}

export function treeFlamePositions(tree) {
  return [
    {x:tree.x+.35, y:Math.min(4.2,tree.height*.24), z:tree.z},
    {x:tree.x+tree.width*.31, y:tree.height*.72, z:tree.z+.2},
  ];
}

/**
 * Aimed water is the same central ray as the existing ground-fire hit.
 * The actual fire linked to the tree gets damaged; no decorative-only fires.
 */
export function findAimedTreeFire(targets, position, direction, maxRange=HOSE_RANGE) {
  if(!Number.isFinite(position.y)||!Number.isFinite(direction.y)) return null;
  let best=null, bestDistance=maxRange+1;
  for(const target of targets){
    if(!target.fire.active) continue;
    for(const impact of treeFlamePositions(target.tree)){
      const dx=impact.x-position.x,dy=impact.y-position.y,dz=impact.z-position.z;
      const forward=dx*direction.x+dy*direction.y+dz*direction.z;
      if(forward<=0||forward>maxRange||forward>=bestDistance)continue;
      const perpendicularSq=Math.max(0,dx*dx+dy*dy+dz*dz-forward*forward);
      const tolerance=.83+forward*.048;
      if(perpendicularSq>tolerance*tolerance)continue;
      best={fire:target.fire,tree:target.tree,impact,distance:forward};
      bestDistance=forward;
    }
  }
  return best;
}

/** Extinguish the underlying active focus when its visible tree flame is hit. */
export function applyWaterToTreeFire(hit, delta, multiplier = 1) {
  if (!hit?.tree || !hit.fire?.active || delta <= 0) return [];
  const fire=hit.fire;
  fire.health=Math.max(0,fire.health-WATER_DAMAGE_PER_SECOND*delta*multiplier);
  if (fire.health>0) return [];
  fire.active=false;
  return [fire];
}
