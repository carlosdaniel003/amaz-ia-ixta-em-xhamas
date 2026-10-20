import { applyLookDelta } from './FirstPersonLogic.js';

/** Desktop first-person input. Pointer lock keeps the crosshair at screen center. */
export class Input {
  constructor(canvas, onPause, onUnlock) {
    this.canvas = canvas;
    this.onPause = onPause;
    this.onUnlock = onUnlock;
    this.keys = new Set();
    this.sprayHeld = false;
    this.yaw = 0;
    this.pitch = 0;
    this.locked = false;
    this.canLook = true;
    this.installListeners();
  }

  installListeners() {
    window.addEventListener('keydown', event => {
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select')) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if (event.code === 'Escape' && this.locked) return; // Browser releases pointer lock.
      this.keys.add(event.code);
      if (!event.repeat && (event.code === 'Escape' || event.code === 'KeyP')) this.onPause();
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.clear());

    document.addEventListener('pointerlockchange', () => {
      const wasLocked = this.locked;
      this.locked = document.pointerLockElement === this.canvas;
      this.sprayHeld = false;
      if (wasLocked && !this.locked) this.onUnlock?.();
    });
    document.addEventListener('pointerlockerror', () => { this.locked = false; });

    document.addEventListener('mousemove', event => {
      if (!this.locked || !this.canLook) return;
      const next = applyLookDelta(this.yaw, this.pitch, event.movementX || 0, event.movementY || 0);
      this.yaw = next.yaw;
      this.pitch = next.pitch;
    });
    this.canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.pointerType === 'touch' || !this.canLook) return;
      this.requestLock();
      this.sprayHeld = true;
    });
    window.addEventListener('pointerup', () => { this.sprayHeld = false; });
    window.addEventListener('pointercancel', () => { this.sprayHeld = false; });
    this.canvas.addEventListener('contextmenu', event => event.preventDefault());
  }

  requestLock() {
    if (!this.canLook || document.pointerLockElement === this.canvas) return;
    try {
      const result = this.canvas.requestPointerLock?.();
      if (result?.catch) result.catch(() => {});
    } catch { /* A click inside the canvas can retry. */ }
  }

  releaseLock() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
  }

  resetLook() { this.yaw = 0; this.pitch = 0; }

  move() {
    let x = 0, z = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x--;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x++;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z--;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z++;
    const length = Math.hypot(x, z);
    return length > 1 ? { x: x / length, z: z / length } : { x, z };
  }

  get spraying() { return this.sprayHeld || this.keys.has('Space') || this.keys.has('KeyF'); }
  clear() { this.keys.clear(); this.sprayHeld = false; }
}
