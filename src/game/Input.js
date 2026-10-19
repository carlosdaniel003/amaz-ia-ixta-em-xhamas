export class Input {
  constructor(canvas, joystick, joystickKnob, sprayButton, onPause) {
    this.canvas = canvas;
    this.keys = new Set();
    this.sprayHeld = false;
    this.buttonHeld = false;
    this.aim = { x: 0, y: 0 };
    this.hasPointerAim = false;
    this.joystick = { x: 0, y: 0 };
    this.joystickPointer = null;
    this.onPause = onPause;
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;
    this.knob = joystickKnob;
    this.listen(canvas, joystick, sprayButton);
  }

  listen(canvas, joystick, sprayButton) {
    window.addEventListener('keydown', (event) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if (event.repeat && (event.code === 'Escape' || event.code === 'KeyP')) return;
      this.keys.add(event.code);
      if (event.code === 'Escape' || event.code === 'KeyP') this.onPause();
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.clear());

    const point = (event) => {
      if (event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      this.aim.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.aim.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.hasPointerAim = true;
    };
    canvas.addEventListener('pointermove', point);
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || this.isTouch) return;
      point(event);
      this.sprayHeld = true;
    });
    window.addEventListener('pointerup', () => { this.sprayHeld = false; });
    window.addEventListener('pointercancel', () => { this.sprayHeld = false; this.buttonHeld = false; });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    const moveStick = (event) => {
      if (event.pointerId !== this.joystickPointer) return;
      const rect = joystick.getBoundingClientRect();
      const x = event.clientX - (rect.left + rect.width / 2);
      const y = event.clientY - (rect.top + rect.height / 2);
      const length = Math.hypot(x, y);
      const scale = length > 39 ? 39 / length : 1;
      this.joystick.x = x * scale / 39;
      this.joystick.y = y * scale / 39;
      this.knob.style.transform = `translate(${x * scale}px, ${y * scale}px)`;
    };
    joystick.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.joystickPointer = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      moveStick(event);
    });
    joystick.addEventListener('pointermove', moveStick);
    const endStick = (event) => {
      if (event.pointerId !== this.joystickPointer) return;
      this.joystickPointer = null;
      this.joystick.x = 0;
      this.joystick.y = 0;
      this.knob.style.transform = 'translate(0, 0)';
    };
    joystick.addEventListener('pointerup', endStick);
    joystick.addEventListener('pointercancel', endStick);
    joystick.addEventListener('lostpointercapture', endStick);

    const releaseButton = () => {
      this.buttonHeld = false;
      sprayButton.classList.remove('pressed');
    };
    sprayButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.buttonHeld = true;
      sprayButton.classList.add('pressed');
      sprayButton.setPointerCapture(event.pointerId);
    });
    sprayButton.addEventListener('pointerup', releaseButton);
    sprayButton.addEventListener('pointercancel', releaseButton);
    sprayButton.addEventListener('lostpointercapture', releaseButton);
  }

  move() {
    let x = this.joystick.x;
    let z = this.joystick.y;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    const distance = Math.hypot(x, z);
    return distance > 1 ? { x: x / distance, z: z / distance } : { x, z };
  }

  get spraying() { return this.sprayHeld || this.buttonHeld || this.keys.has('Space') || this.keys.has('KeyF'); }

  clear() {
    this.keys.clear();
    this.sprayHeld = false;
    this.buttonHeld = false;
    this.joystick.x = 0;
    this.joystick.y = 0;
    this.knob.style.transform = 'translate(0, 0)';
    this.joystickPointer = null;
  }
}
