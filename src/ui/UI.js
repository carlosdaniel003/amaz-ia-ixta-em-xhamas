const $ = (id) => document.getElementById(id);

export class UI {
  constructor(actions) {
    this.elements = {
      hud: $('hud'), progress: $('progress-wrap'), start: $('start-screen'), pause: $('pause-screen'), win: $('win-screen'),
      tip: $('game-tip'), bottom: $('bottom-caption'), mobile: $('mobile-controls'),
      count: $('fire-count'), coins: $('coin-count'), progressLabel: $('progress-label'), progressFill: $('progress-fill'),
      finalCoins: $('final-coins'), toast: $('toast'),
    };
    $('start-button').addEventListener('click', actions.start);
    $('pause-button').addEventListener('click', actions.pause);
    $('resume-button').addEventListener('click', actions.resume);
    $('restart-button').addEventListener('click', actions.restart);
    this.toastTimer = null;
    this.state = 'start';
    this.renderState();
  }

  setState(state) { this.state = state; this.renderState(); }

  renderState() {
    const { start, pause, win, hud, progress, tip, mobile, bottom } = this.elements;
    const playing = this.state === 'playing';
    start.hidden = this.state !== 'start';
    pause.hidden = this.state !== 'paused';
    win.hidden = this.state !== 'won';
    hud.hidden = this.state === 'start';
    progress.hidden = this.state === 'start' || this.state === 'won';
    tip.hidden = !playing || this.tutorialCompleted;
    mobile.hidden = !playing || !window.matchMedia('(pointer: coarse)').matches;
    bottom.hidden = this.state !== 'start';
  }

  setProgress(remaining, total, coins) {
    const completed = total - remaining;
    const percentage = Math.round(completed / total * 100);
    this.elements.count.textContent = String(remaining);
    this.elements.coins.textContent = String(coins);
    this.elements.finalCoins.textContent = `◈ ${coins}`;
    this.elements.progressLabel.textContent = `${percentage}%`;
    this.elements.progressFill.style.width = `${percentage}%`;
  }

  extinguished(coins) {
    this.tutorialCompleted = true;
    this.elements.tip.hidden = true;
    this.notify(`+25 MOEDAS  ·  TOTAL ${coins}`);
  }

  notify(message) {
    const toast = this.elements.toast;
    toast.textContent = message;
    toast.classList.add('visible');
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2100);
  }

  reset() {
    this.tutorialCompleted = false;
    this.elements.toast.classList.remove('visible');
    this.setProgress(12, 12, 0);
  }
}
