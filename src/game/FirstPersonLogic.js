/** First-person camera mathematics with no renderer dependency. */
export function applyLookDelta(yaw, pitch, dx, dy, sensitivity = .0023) {
  return {
    yaw: yaw - dx * sensitivity,
    pitch: Math.max(-1.10, Math.min(1.10, pitch - dy * sensitivity)),
  };
}

export function worldMovement(move, yaw) {
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  return {
    x: move.x * cos + move.z * sin,
    z: move.z * cos - move.x * sin,
  };
}
