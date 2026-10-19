/** Desktop input, isolated from gameplay rules. Mobile controls will be implemented separately. */
export class Input {
  constructor(canvas, onPause) {
    this.keys = new Set();
    this.sprayHeld = false;
    this.aim = { x: 0, y: 0 };
    this.hasPointerAim = false;
    window.addEventListener('keydown', event => {
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select')) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      if (!event.repeat && (event.code === 'Escape' || event.code === 'KeyP')) onPause();
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.clear());
    const point = event => {
      if (event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      this.aim.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.aim.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.hasPointerAim = true;
    };
    canvas.addEventListener('pointermove', point);
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.pointerType === 'touch') return;
      point(event);
      this.sprayHeld = true;
    });
    window.addEventListener('pointerup', () => { this.sprayHeld = false; });
    window.addEventListener('pointercancel', () => { this.sprayHeld = false; });
    canvas.addEventListener('contextmenu', event => event.preventDefault());
  }

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
