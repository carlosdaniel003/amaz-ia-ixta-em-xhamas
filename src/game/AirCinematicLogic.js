/** World-space aerial camera framing. The aircraft is NEVER parented to the camera. */
export const FLYBY_SECONDS = 5.7;
export const FLYBY_ENTRY_X = -33;

export function shouldBeginFlyby(flight) {
  return Boolean(flight && flight.raining && flight.x >= FLYBY_ENTRY_X);
}

export function flightCameraPose(flight) {
  // Keep aircraft in the upper part of the view, with the canopy and real
  // water drop below it. The chase camera travels through WORLD coordinates.
  return {
    camera: {
      x: flight.x - (flight.large ? 13 : 11),
      y: flight.altitude + 11,
      z: flight.z + (flight.large ? 25 : 22),
    },
    target: {
      x: flight.x + 3,
      y: flight.altitude * .52,
      z: flight.z,
    },
  };
}

export function advanceFlybyTime(elapsed, dt) {
  return Math.min(FLYBY_SECONDS, elapsed + Math.max(0, dt));
}
