import { applyLookDelta } from './FirstPersonLogic.js';
import { joystickVector, joystickOffset, touchLook } from './TouchLogic.js';

/** Mouse + keyboard and independent multi-touch joystick, camera and water controls. */
export class Input {
  constructor(canvas, onPause, onUnlock) {
    this.canvas = canvas;
    this.onPause = onPause;
    this.onUnlock = onUnlock;
    this.platform = 'desktop';
    this.enabled = false;
    this.keys = new Set();
    this.sprayHeld = false;
    this.touchSprayHeld = false;
    this.joystick = { x: 0, z: 0 };
    this.yaw = 0;
    this.pitch = 0;
    this.locked = false;
    this.canLook = true;
    this.stickPointerId = null;
    this.lookPointerId = null;
    this.sprayPointerId = null;
    this.lastLookX = 0;
    this.lastLookY = 0;
    this.stick = document.getElementById('touch-stick');
    this.stickThumb = document.getElementById('touch-stick-thumb');
    this.sprayButton = document.getElementById('touch-spray');
    this.installListeners();
  }

  setPlatform(platform) {
    if (platform !== 'desktop' && platform !== 'mobile') throw new Error('Plataforma inválida');
    this.releaseLock();
    this.clear();
    this.platform = platform;
    this.canvas.style.touchAction = platform === 'mobile' ? 'none' : '';
  }

  installListeners() {
    window.addEventListener('keydown', event => {
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select')) return;
      if (!this.enabled) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if (event.code === 'Escape' && this.locked) return; // Browser unlocks the cursor.
      this.keys.add(event.code);
      if (!event.repeat && (event.code === 'Escape' || event.code === 'KeyP')) this.onPause();
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('pointerlockchange', () => {
      const wasLocked = this.locked;
      this.locked = document.pointerLockElement === this.canvas;
      this.sprayHeld = false;
      if (wasLocked && !this.locked && this.platform === 'desktop') this.onUnlock?.();
    });
    document.addEventListener('pointerlockerror', () => { this.locked = false; });
    document.addEventListener('mousemove', event => {
      if (!this.enabled || !this.locked || !this.canLook || this.platform !== 'desktop') return;
      const next = applyLookDelta(this.yaw, this.pitch, event.movementX || 0, event.movementY || 0);
      this.yaw = next.yaw;
      this.pitch = next.pitch;
    });

    this.canvas.addEventListener('pointerdown', event => {
      if (!this.enabled || !this.canLook) return;
      if (this.platform === 'mobile') {
        if (event.pointerType === 'mouse') return;
        if (this.lookPointerId !== null) return;
        event.preventDefault();
        this.lookPointerId = event.pointerId;
        this.lastLookX = event.clientX;
        this.lastLookY = event.clientY;
        this.canvas.setPointerCapture?.(event.pointerId);
        return;
      }
      if (event.button !== 0 || event.pointerType === 'touch') return;
      this.requestLock();
      this.sprayHeld = true;
    });
    this.canvas.addEventListener('pointermove', event => {
      if (!this.enabled || this.platform !== 'mobile' || event.pointerId !== this.lookPointerId) return;
      event.preventDefault();
      const result = touchLook(this.yaw, this.pitch, event.clientX - this.lastLookX, event.clientY - this.lastLookY);
      this.yaw = result.yaw;
      this.pitch = result.pitch;
      this.lastLookX = event.clientX;
      this.lastLookY = event.clientY;
    });
    const finishLook = event => {
      if (this.lookPointerId !== event.pointerId) return;
      this.lookPointerId = null;
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    };
    this.canvas.addEventListener('pointerup', finishLook);
    this.canvas.addEventListener('pointercancel', finishLook);
    this.canvas.addEventListener('lostpointercapture', finishLook);

    this.stick?.addEventListener('pointerdown', event => {
      if (!this.enabled || this.platform !== 'mobile' || this.stickPointerId !== null) return;
      event.preventDefault();
      this.stickPointerId = event.pointerId;
      this.stick.setPointerCapture?.(event.pointerId);
      this.updateStick(event);
    });
    this.stick?.addEventListener('pointermove', event => {
      if (event.pointerId !== this.stickPointerId) return;
      event.preventDefault();
      this.updateStick(event);
    });
    const finishStick = event => {
      if (this.stickPointerId !== event.pointerId) return;
      this.stickPointerId = null;
      this.joystick = { x: 0, z: 0 };
      this.stickThumb.style.transform = 'translate3d(0,0,0)';
      if (this.stick.hasPointerCapture?.(event.pointerId)) this.stick.releasePointerCapture(event.pointerId);
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.stick?.addEventListener(type, finishStick);

    this.sprayButton?.addEventListener('pointerdown', event => {
      if (!this.enabled || this.platform !== 'mobile' || this.sprayPointerId !== null) return;
      event.preventDefault();
      this.sprayPointerId = event.pointerId;
      this.touchSprayHeld = true;
      this.sprayButton.classList.add('pressed');
      this.sprayButton.setPointerCapture?.(event.pointerId);
    });
    const finishSpray = event => {
      if (this.sprayPointerId !== event.pointerId) return;
      this.sprayPointerId = null;
      this.touchSprayHeld = false;
      this.sprayButton.classList.remove('pressed');
      if (this.sprayButton.hasPointerCapture?.(event.pointerId)) this.sprayButton.releasePointerCapture(event.pointerId);
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.sprayButton?.addEventListener(type, finishSpray);

    window.addEventListener('pointerup', event => {
      if (event.pointerType !== 'touch') this.sprayHeld = false;
    });
    window.addEventListener('pointercancel', event => {
      if (event.pointerType !== 'touch') this.sprayHeld = false;
    });
    this.canvas.addEventListener('contextmenu', event => event.preventDefault());
  }

  updateStick(event) {
    const rect = this.stick.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) * .34;
    this.joystick = joystickVector(event.clientX, event.clientY, rect.left + rect.width / 2, rect.top + rect.height / 2, radius);
    const offset = joystickOffset(this.joystick, radius);
    this.stickThumb.style.transform = `translate3d(${offset.x}px,${offset.y}px,0)`;
  }

  requestLock() {
    if (this.platform !== 'desktop' || !this.enabled || !this.canLook || document.pointerLockElement === this.canvas) return;
    try {
      const result = this.canvas.requestPointerLock?.();
      if (result?.catch) result.catch(() => {});
    } catch { /* Player may retry by clicking inside the scene. */ }
  }

  releaseLock() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
  }

  resetLook() { this.yaw = 0; this.pitch = 0; }

  move() {
    if (!this.enabled) return { x: 0, z: 0 };
    if (this.platform === 'mobile') return this.joystick;
    let x = 0, z = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x--;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x++;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z--;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z++;
    const length = Math.hypot(x, z);
    return length > 1 ? { x: x / length, z: z / length } : { x, z };
  }

  get spraying() {
    return this.enabled && (this.touchSprayHeld || this.sprayHeld || this.keys.has('Space') || this.keys.has('KeyF'));
  }

  clear() {
    this.keys.clear();
    this.sprayHeld = false;
    this.touchSprayHeld = false;
    this.joystick = { x: 0, z: 0 };
    this.stickPointerId = null;
    this.lookPointerId = null;
    this.sprayPointerId = null;
    if (this.stickThumb) this.stickThumb.style.transform = 'translate3d(0,0,0)';
    this.sprayButton?.classList.remove('pressed');
  }
}
