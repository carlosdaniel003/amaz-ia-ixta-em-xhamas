/** Deterministic scheduling shared by flight movement and tactical display. */
export function selectFlyoverLane(fires, radius) {
  const targets = fires.filter(fire => fire.active);
  if (!targets.length) return null;
  return targets.reduce((selected, fire) => {
    const count = targets.filter(other => Math.abs(other.z - fire.z) <= radius).length;
    return count > selected.count ? {count, z:fire.z} : selected;
  }, {count:0,z:0});
}

export function advanceFlight(flight, dt) {
  const step = Math.max(0,dt);
  flight.flightTime += step;
  flight.x += (flight.large ? 14 : 12) * step;
  flight.raining = flight.x > -40 && flight.x < 42;
  return flight.raining && flight.x - flight.lastDrench > 1.6;
}
