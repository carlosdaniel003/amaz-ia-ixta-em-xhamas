/** Screen-space red flash only on real health loss; avoids reflow during continuous damage. */
export class DamageFeedback {
  constructor(element) {
    this.element = element;
    this.cooldown = 0;
  }
  reset() {
    this.cooldown = 0;
    this.element.classList.remove('is-active', 'is-fire', 'is-smoke');
  }
  update(dt) { this.cooldown = Math.max(0, this.cooldown - dt); }
  hit(amount, directFire) {
    if (amount <= 0 || this.cooldown > 0) return;
    this.cooldown = directFire ? .67 : 1.2;
    this.element.classList.remove('is-active', 'is-fire', 'is-smoke');
    // Force a reflow at most once per hit interval, never per render frame.
    void this.element.offsetWidth;
    this.element.classList.add(directFire ? 'is-fire' : 'is-smoke', 'is-active');
  }
}
