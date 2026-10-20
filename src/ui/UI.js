const $ = id => document.getElementById(id);

export class UI {
  constructor(actions) {
    this.elements = {
      device: $('device-screen'), mobileNotice: $('mobile-notice'), loading: $('loading-screen'), hud: $('hud'), progress: $('progress-wrap'),
      start: $('start-screen'), pause: $('pause-screen'), win: $('win-screen'), lost: $('lost-screen'),
      tip: $('game-tip'), bottom: $('bottom-caption'),
      count: $('fire-count'), coins: $('coin-count'), progressLabel: $('progress-label'), progressFill: $('progress-fill'),
      health: $('health-value'), healthFill: $('health-fill'), smoke: $('smoke-value'), smokeFill: $('smoke-fill'),
      saved: $('rescued-count'), lostAnimals: $('lost-count'), helpers: $('helper-count'),
      hire: $('hire-button'), municipal: $('municipal-button'), state: $('state-button'),
      finalCoins: $('final-coins'), finalSaved: $('final-saved'), finalLost: $('final-lost'),
      lostCoins: $('lost-coins'), lostSaved: $('lost-saved'), toast: $('toast'),
    };
    $('desktop-button').addEventListener('click', actions.selectDesktop);
    $('cell-button').addEventListener('click', actions.selectMobile);
    $('back-device-button').addEventListener('click', actions.backToDevice);
    $('back-start-button').addEventListener('click', actions.backToDevice);
    $('start-button').addEventListener('click', actions.start);
    $('pause-button').addEventListener('click', actions.pause);
    $('resume-button').addEventListener('click', actions.resume);
    $('restart-button').addEventListener('click', actions.restart);
    $('retry-button').addEventListener('click', actions.restart);
    this.elements.hire.addEventListener('click', actions.hire);
    this.elements.municipal.addEventListener('click', actions.municipal);
    this.elements.state.addEventListener('click', actions.state);
    this.toastTimer = null;
    this.state = 'device';
    this.tutorialCompleted = false;
    this.renderState();
  }

  setState(state) { this.state = state; this.renderState(); }
  renderState() {
    const e = this.elements;
    const playing = this.state === 'playing';
    e.device.hidden = this.state !== 'device';
    e.loading.hidden = this.state !== 'loading';
    $('crosshair').hidden = !playing;
    e.mobileNotice.hidden = this.state !== 'mobile';
    e.start.hidden = this.state !== 'start';
    e.pause.hidden = this.state !== 'paused';
    e.win.hidden = this.state !== 'won';
    e.lost.hidden = this.state !== 'lost';
    e.hud.hidden = ['device', 'mobile', 'start', 'loading'].includes(this.state);
    $('survival-hud').hidden = !playing && this.state !== 'paused';
    $('support-shop').hidden = !playing;
    e.progress.hidden = !playing && this.state !== 'paused';
    e.tip.hidden = !playing || this.tutorialCompleted;
    e.bottom.hidden = this.state !== 'start' && this.state !== 'device';
  }
  setProgress(remaining, total, coins) {
    const completed = total - remaining;
    const percentage = total ? Math.round(completed / total * 100) : 100;
    this.elements.count.textContent = String(remaining);
    this.elements.coins.textContent = String(coins);
    this.elements.progressLabel.textContent = `${percentage}%`;
    this.elements.progressFill.style.width = `${percentage}%`;
  }
  setStatus(health, smoke, rescued, lost, helpers, availability) {
    const e = this.elements;
    e.health.textContent = String(Math.ceil(health));
    e.healthFill.style.width = `${Math.max(0, health)}%`;
    e.healthFill.classList.toggle('critical', health < 30);
    e.smoke.textContent = `${Math.floor(smoke)}%`;
    e.smokeFill.style.width = `${smoke}%`;
    e.saved.textContent = String(rescued);
    e.lostAnimals.textContent = String(lost);
    e.helpers.textContent = String(helpers);
    e.hire.disabled = !availability.hire;
    e.municipal.disabled = !availability.municipal;
    e.state.disabled = !availability.state;
  }
  setFinal(coins, rescued, lost, fireCount) {
    this.elements.finalCoins.textContent = `◈ ${coins}`;
    this.elements.finalSaved.textContent = `${rescued} salvos · ${lost} perdidos · ${fireCount} focos enfrentados`;
    this.elements.finalLost.textContent = String(lost);
    this.elements.lostCoins.textContent = `◈ ${coins}`;
    this.elements.lostSaved.textContent = `${rescued} animais salvos`;
  }
  extinguished(earned, rescued, combo) {
    this.tutorialCompleted = true;
    this.elements.tip.hidden = true;
    this.notify(`+${earned} moedas${combo > 1 ? ` · combo ×${combo}` : ''}${rescued ? ` · ${rescued} animal(is) salvo(s)` : ''}`);
  }
  notify(message) {
    const toast = this.elements.toast;
    toast.textContent = message;
    toast.classList.add('visible');
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2600);
  }
  reset() {
    this.tutorialCompleted = false;
    this.elements.toast.classList.remove('visible');
    this.setProgress(12, 12, 0);
  }
}
