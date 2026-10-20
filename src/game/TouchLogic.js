/** Small deterministic helpers for touch controls, independent of the DOM. */
export function joystickVector(clientX, clientY, centerX, centerY, radius) {
  const safeRadius = Math.max(1, radius);
  const dx = (clientX - centerX) / safeRadius;
  const dy = (clientY - centerY) / safeRadius;
  const magnitude = Math.hypot(dx, dy);
  const scale = magnitude > 1 ? 1 / magnitude : 1;
  return { x: dx * scale, z: dy * scale };
}

export function joystickOffset(vector, radius) {
  return { x: vector.x * radius, y: vector.z * radius };
}

export function touchLook(yaw, pitch, deltaX, deltaY, sensitivity = 0.004) {
  const nextYaw = yaw - deltaX * sensitivity;
  const nextPitch = pitch - deltaY * sensitivity;
  return {
    yaw: nextYaw,
    pitch: Math.max(-1.10, Math.min(1.10, nextPitch)),
  };
}

/** Ignore microdrifts, but keep analog speed for fine positioning. */
export function shapedJoystick(vector, deadZone = 0.075) {
  const length = Math.min(1, Math.hypot(vector.x, vector.z));
  if (length <= deadZone) return { x: 0, z: 0 };
  const strength = Math.pow((length - deadZone) / (1 - deadZone), 1.1);
  return { x: vector.x / length * strength, z: vector.z / length * strength };
}

/** Time-based smoothing, independent of phone refresh rate. */
export function smoothControl(current, target, deltaSeconds, response = 14) {
  const factor = 1 - Math.exp(-Math.max(0, deltaSeconds) * response);
  return current + (target - current) * factor;
}
