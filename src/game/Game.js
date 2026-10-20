import * as THREE from 'three';
import { World } from './World.js';
import { Player } from './Player.js';
import { FireSystem } from './FireSystem.js';
import { WaterSystem } from './WaterSystem.js';
import { Input } from './Input.js';
import { UI } from '../ui/UI.js';
import { Helpers } from './Helpers.js';
import { AirSupport } from './AirSupport.js';
import { Wildlife } from './Wildlife.js';
import { Atmosphere } from './Atmosphere.js';
import { DamageFeedback } from '../ui/DamageFeedback.js';
import { AirSupportView } from '../ui/AirSupportView.js';
import { worldMovement } from './FirstPersonLogic.js';
import { findGraphicsContext } from './GraphicsSupport.js';
import { findAimedFire } from './FireLogic.js';
import { MAX_HEALTH, HIRE_COST, MUNICIPAL_COST, STATE_COST, MAX_HELPERS, exposureAt, isEncircled, advanceSurvival, extinguishReward, canBuy } from './SurvivalLogic.js';

const MOVE_SPEED = 8.5;
const EYE_HEIGHT = 1.85;
const RENDER_FPS = 30; // Conservative default for integrated GPUs.

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.platform = 'desktop';
    // Do not allocate a GPU context or procedural forest on the device-selection page.
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.world = null;
    this.active = false;
    this.gpuLost = false;
    this.startupStage = 'Aguardando início';
    this.diagnostics = {};
    this.loopStarted = false;
    this.renderScale = 1;
    this.lastRenderTime = 0;
    this.damageFeedback = new DamageFeedback(document.getElementById('damage-flash'));
    this.airView = new AirSupportView(document.getElementById('air-support-view'), document.getElementById('air-support-map'));
    this.aimDirection = new THREE.Vector3(0, 0, -1);
    this.tempNozzle = new THREE.Vector3();
    this.input = new Input(canvas, () => this.togglePause(), () => this.onPointerUnlock());
    this.ui = new UI({ selectDesktop: () => this.chooseDesktop(), selectMobile: () => this.chooseMobile(), backToDevice: () => this.chooseDevice(), start: () => this.start(), pause: () => this.togglePause(), resume: () => this.resume(), restart: () => this.start(), hire: () => this.purchase('hire'), municipal: () => this.purchase('municipal'), state: () => this.purchase('state') });
    this.mode = 'device';
    this.coins = 0;
    this.elapsed = 0;
    this.previousTime = 0;
    this.active = false;
    this.healthState = { health: MAX_HEALTH, smoke: 0, safeTime: 0 };
    this.lastExtinguishedAt = -100;
    this.combo = 0;
    this.lastAirlift = { municipal: -100, state: -100 };
    this.hudClock = 0;
    this.ui.setState('device');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (event) => {
      if (event.repeat || this.mode !== 'playing' || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.code === 'Digit1') this.purchase('hire');
      if (event.code === 'Digit2') this.purchase('municipal');
      if (event.code === 'Digit3') this.purchase('state');
    });
    document.addEventListener('visibilitychange', () => {
      this.input.clear();
      if (document.hidden && this.mode === 'playing') this.togglePause();
    });
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.startupStage = 'Contexto WebGL perdido durante ' + this.startupStage;
      this.gpuLost = true;
      this.active = false;
      this.loopStarted = false;
      if (this.mode === 'playing') this.togglePause();
      this.input.releaseLock();
      this.ui.notify('A GPU interrompeu a renderização. Aguardando recuperação.');
      if (this.mode === 'loading') this.showFatal(new Error('O navegador perdeu o contexto WebGL durante a inicialização.'));
    });
    canvas.addEventListener('webglcontextrestored', () => {
      if (!this.renderer) return;
      this.gpuLost = false;
      this.renderScale = .65;
      this.active = true;
      this.previousTime = 0;
      this.lastRenderTime = 0;
      this.resize();
      this.ui.notify('Vídeo recuperado com qualidade reduzida. Clique em CONTINUAR.');
      if (!this.loopStarted) {
        this.loopStarted = true;
        requestAnimationFrame(time => this.frame(time));
      }
    });
  }

  /** Allow the browser to paint the loading UI between expensive stages. */
  async nextLoadStage(message) {
    this.startupStage = message;
    const element = document.getElementById('loading-message');
    if (element) element.textContent = message;
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (this.gpuLost) throw new Error('O contexto WebGL foi perdido durante o carregamento.');
  }

  /** Test WebGL2 on the game canvas before allocating all the geometry. */
  createRenderer() {
    const { context: gl, type, attempts } = findGraphicsContext(this.canvas, {
      alpha: false, antialias: false, stencil: false, depth: true,
      powerPreference: 'low-power', preserveDrawingBuffer: false,
    });
    this.diagnostics.contextType = type;
    this.diagnostics.webglAttempts = attempts.join('; ') || 'WebGL2 disponível';
    this.diagnostics.webgl = String(gl.getParameter(gl.VERSION) || type);
    this.diagnostics.maxTextureSize = String(gl.getParameter(gl.MAX_TEXTURE_SIZE) || 'desconhecido');
    // WebGL1 paths are especially sensitive to fill rate and texture allocations.
    if (type === 'WebGL1') this.renderScale = .7;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, context: gl, antialias: false,
      alpha: false, stencil: false, powerPreference: 'low-power',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .97;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x504940);
    this.scene.fog = new THREE.FogExp2(0x504940, .035);
    this.scene.add(new THREE.HemisphereLight(0xb9b6a0, 0x1c2920, 1.4));
    const sun = new THREE.DirectionalLight(0xf1ad7c, .85);
    sun.position.set(-14, 27, 10);
    this.scene.add(sun);
    this.camera = new THREE.PerspectiveCamera(75, 1, .08, 115);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.createFirstPersonHose();
    this.resize();
  }

  /** Build the world over multiple paints instead of blocking the tab in one callback. */
  async initializeGraphics() {
    if (this.renderer && this.world && this.atmosphere) return;
    await this.nextLoadStage('Verificando WebGL2 e preparando a câmera...');
    this.createRenderer();
    await this.nextLoadStage('Construindo árvores e caminhos da floresta...');
    this.world = new World(this.scene, { lowPerformance: true, mobile: this.platform === 'mobile' });
    await this.nextLoadStage('Preparando personagem, focos e mangueira...');
    this.player = new Player(this.scene);
    this.player.root.visible = false;
    this.fires = new FireSystem(this.scene);
    this.water = new WaterSystem(this.scene);
    await this.nextLoadStage('Preparando bombeiros, aeronaves e animais...');
    this.helpers = new Helpers(this.scene);
    this.support = new AirSupport(this.scene);
    this.wildlife = new Wildlife(this.scene);
    await this.nextLoadStage('Configurando fumaça e finalizando a missão...');
    this.atmosphere = new Atmosphere(this.scene, { lowPerformance: true, mobile: this.platform === 'mobile' });
    await this.nextLoadStage('Entrando na floresta...');
  }

  /** Small camera-attached hose, rendered as geometry rather than a heavy model. */
  createFirstPersonHose() {
    const hose = new THREE.Group();
    hose.position.set(.32, -.27, -.57);
    const metal = new THREE.MeshBasicMaterial({ color: 0x303f3b });
    const tip = new THREE.MeshBasicMaterial({ color: 0xd7bb81 });
    const sleeve = new THREE.MeshBasicMaterial({ color: 0xd08046 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.064, .083, .52, 8), metal);
    barrel.rotation.x = Math.PI / 2;
    hose.add(barrel);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.082, .066, .13, 8), tip);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.z = -.31;
    hose.add(nozzle);
    const glove = new THREE.Mesh(new THREE.BoxGeometry(.19, .14, .34), sleeve);
    glove.position.set(.09, -.12, .20);
    hose.add(glove);
    this.camera.add(hose);
  }

  onPointerUnlock() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.input.clear();
    this.airView.hide();
    this.ui.setState('paused');
  }

  showFatal(error) {
    console.error('Falha na etapa: ' + this.startupStage, error);
    this.active = false;
    this.loopStarted = false;
    this.input.enabled = false;
    this.input.clear();
    this.input.releaseLock();
    this.mode = 'error';
    this.startupError = error;
    this.airView.hide();
    this.ui.setState('error');

    const message = error instanceof Error ? error.message : String(error);
    const diagnostics = [
      'Etapa: ' + this.startupStage,
      'Erro: ' + message,
      'API gráfica: ' + (this.diagnostics.contextType || 'nenhuma'),
      'WebGL: ' + (this.diagnostics.webgl || 'não inicializado'),
      'Tentativas: ' + (this.diagnostics.webglAttempts || 'sem contexto'),
      'Tamanho máximo de textura: ' + (this.diagnostics.maxTextureSize || 'não verificado'),
      'Contexto perdido: ' + (this.gpuLost ? 'sim' : 'não'),
      'Navegador: ' + navigator.userAgent,
    ].join('\n');

    const banner = document.getElementById('fatal-error');
    banner.replaceChildren();
    const panel = document.createElement('div');
    panel.className = 'graphics-error-panel';
    const title = document.createElement('h2');
    title.textContent = 'Não foi possível iniciar os gráficos 3D';
    const details = document.createElement('p');
    details.textContent = this.gpuLost
      ? 'O navegador perdeu o contexto gráfico. O jogo foi interrompido para evitar novos travamentos.'
      : 'Uma etapa da inicialização falhou. O erro técnico está indicado abaixo — isso não significa necessariamente que a placa de vídeo esteja com defeito.';
    const code = document.createElement('pre');
    code.textContent = diagnostics;
    const actions = document.createElement('div');
    actions.className = 'graphics-error-actions';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'RECARREGAR JOGO';
    retry.addEventListener('click', () => window.location.reload());
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'COPIAR DIAGNÓSTICO';
    copy.addEventListener('click', () => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(diagnostics).then(() => { copy.textContent = 'DIAGNÓSTICO COPIADO'; }).catch(() => { copy.textContent = 'SELECIONE E COPIE O TEXTO ACIMA'; });
      } else copy.textContent = 'SELECIONE E COPIE O TEXTO ACIMA';
    });
    actions.append(retry, copy);
    panel.append(title, details, code, actions);
    banner.append(panel);
    banner.hidden = false;
  }

  selectPlatform(platform) {
    if (this.mode === 'playing' || this.mode === 'loading') return;
    this.platform = platform;
    this.input.setPlatform(platform);
    this.ui.setPlatform(platform);
    this.mode = 'start';
    this.ui.setState('start');
  }
  chooseDesktop() { this.selectPlatform('desktop'); }
  chooseMobile() { this.selectPlatform('mobile'); }
  chooseDevice() {
    this.input.enabled = false;
    this.input.clear();
    this.mode = 'device';
    this.ui.setState('device');
  }

  async start() {
    if (this.mode === 'loading') return;
    this.mode = 'loading';
    this.input.enabled = false;
    this.ui.setState('loading');
    this.input.clear();
    this.input.resetLook();
    try {
      await this.initializeGraphics();
      if (this.gpuLost) throw new Error('O navegador perdeu o contexto WebGL.');
      this.beginSession();
    } catch (error) {
      this.showFatal(error);
    }
  }

  beginSession() {
    this.mode = 'playing';
    this.coins = 0;
    this.elapsed = 0;
    this.hudClock = 0;
    this.lastExtinguishedAt = -100;
    this.combo = 0;
    this.lastAirlift = { municipal: -100, state: -100 };
    this.healthState = { health: MAX_HEALTH, smoke: 0, safeTime: 0 };
    this.input.clear();
    this.input.enabled = true;
    this.player.reset();
    this.fires.reset();
    this.water.reset();
    this.helpers.reset();
    this.support.reset();
    this.airView.hide();
    this.wildlife.reset();
    this.atmosphere.reset();
    this.damageFeedback.reset();
    this.ui.reset();
    this.ui.setState('playing');
    this.refreshHUD();
    this.canvas.focus({ preventScroll: true });
    this.previousTime = 0;
    this.lastRenderTime = 0;
    this.active = !this.gpuLost;
    if (this.active && !this.loopStarted) {
      this.loopStarted = true;
      requestAnimationFrame(time => this.frame(time));
    }
  }

  togglePause() {
    if (this.mode === 'playing') {
      this.mode = 'paused';
      this.input.enabled = false;
      this.input.clear();
      this.ui.setState('paused');
      this.airView.hide();
      this.input.releaseLock();
    } else if (this.mode === 'paused') this.resume();
  }

  resume() {
    if (this.mode !== 'paused' || this.gpuLost) return;
    this.mode = 'playing';
    this.input.enabled = true;
    this.ui.setState('playing');
    this.canvas.focus({ preventScroll: true });
    if (this.platform === 'desktop') this.input.requestLock();
  }

  purchase(type) {
    if (this.mode !== 'playing') return;
    const costs = { hire: HIRE_COST, municipal: MUNICIPAL_COST, state: STATE_COST };
    const cost = costs[type];
    if (!cost || !canBuy(this.coins, cost, this.helpers.units.length, type)) return;
    if (type !== 'hire' && this.elapsed - this.lastAirlift[type] < 18) return;
    if (type === 'hire') {
      if (!this.helpers.hire(this.player.position)) return;
      this.ui.notify('Novo bombeiro contratado. Ele combate os focos automaticamente.');
    } else {
      if (!this.support.dispatch(type, this.fires)) return;
      this.lastAirlift[type] = this.elapsed;
      this.ui.notify(type === 'municipal' ? 'Apoio aéreo da prefeitura a caminho!' : 'Apoio aéreo estadual mobilizado!');
    }
    this.coins -= cost;
    if (this.platform === 'mobile') this.ui.closeShop();
    this.refreshHUD();
  }

  resize() {
    if (!this.camera || !this.renderer) return;
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // A bounded framebuffer is more important than high DPR for integrated GPUs.
    const budget = this.platform === 'mobile' ? 300000 : 560000;
    const maxScale = this.platform === 'mobile' ? .72 : .8;
    const scale = Math.min(maxScale, Math.sqrt(budget / (width * height))) * this.renderScale;
    this.renderer.setPixelRatio(scale);
    this.renderer.setSize(width, height, false);
  }

  awardExtinguished(completed) {
    if (!completed.length) return;
    let earned = 0;
    let rescued = 0;
    for (const fire of completed) {
      const reward = extinguishReward(this.combo, this.elapsed - this.lastExtinguishedAt);
      this.combo = reward.combo;
      this.lastExtinguishedAt = this.elapsed;
      earned += reward.coins;
      rescued += this.wildlife.releaseNear(fire);
    }
    this.coins += earned;
    this.ui.extinguished(earned, rescued, this.combo);
    this.refreshHUD();
    if (this.fires.activeCount === 0) this.finish('won');
  }

  finish(result) {
    if (this.mode !== 'playing') return;
    this.mode = result;
    this.airView.hide();
    this.input.enabled = false;
    this.input.clear();
    this.input.releaseLock();
    this.ui.setFinal(this.coins, this.wildlife.rescued, this.wildlife.lost, this.fires.fires.length);
    this.ui.setState(result);
  }

  refreshHUD() {
    this.ui.setProgress(this.fires.activeCount, this.fires.fires.length, this.coins);
    this.ui.setStatus(this.healthState.health, this.healthState.smoke, this.wildlife.rescued, this.wildlife.lost, this.helpers.units.length, {
      hire: canBuy(this.coins, HIRE_COST, this.helpers.units.length),
      municipal: canBuy(this.coins, MUNICIPAL_COST) && this.elapsed - this.lastAirlift.municipal >= 18,
      state: canBuy(this.coins, STATE_COST) && this.elapsed - this.lastAirlift.state >= 18,
    });
  }

  update(dt) {
    this.elapsed += dt;
    // WASD movement follows the heading, not the world axes.
    this.input.step(dt);
    const move = worldMovement(this.input.movement(dt), this.input.yaw);
    const moving = Math.hypot(move.x, move.z) > .08;
    if (moving) {
      const nextX = this.player.position.x + move.x * MOVE_SPEED * dt;
      const nextZ = this.player.position.z + move.z * MOVE_SPEED * dt;
      if (this.world.canOccupy(nextX, this.player.position.z)) this.player.position.x = nextX;
      if (this.world.canOccupy(this.player.position.x, nextZ)) this.player.position.z = nextZ;
    }
    this.player.face(this.player.position.x - Math.sin(this.input.yaw), this.player.position.z - Math.cos(this.input.yaw));
    this.player.update(dt, moving);
    this.camera.position.set(this.player.position.x, EYE_HEIGHT, this.player.position.z);
    this.camera.rotation.set(this.input.pitch, this.input.yaw, 0, 'YXZ');
    this.camera.updateMatrixWorld();
    this.camera.getWorldDirection(this.aimDirection);
    this.camera.localToWorld(this.tempNozzle.set(.32, -.27, -.9));

    const hit = findAimedFire(this.fires.fires, this.camera.position, this.aimDirection);
    this.ui.setAimTarget(Boolean(hit));
    const spraying = this.input.spraying;
    if (spraying) this.awardExtinguished(this.fires.spray(this.camera.position, this.aimDirection, dt));
    // Visual jet terminates at the same aimed focus used by FireLogic.
    this.water.update(dt, spraying, this.camera.position, this.tempNozzle,
      this.aimDirection, hit);
    if (this.mode !== 'playing') return;

    this.awardExtinguished(this.helpers.update(dt, this.fires, this.world));
    if (this.mode !== 'playing') return;
    const airResults = this.support.update(dt, this.fires);
    this.airView.update(dt, this.support.active, this.fires.fires,
      !this.ui.shopOpen || this.platform !== 'mobile');
    this.awardExtinguished(airResults);
    if (this.mode !== 'playing') return;
    const newFires = this.fires.spread(dt, (x, z) => this.world.canOccupy(x, z));
    if (newFires.length) this.ui.notify(`O fogo se espalhou! +${newFires.length} foco(s).`);
    const newlyLost = this.wildlife.update(dt, this.elapsed, this.fires);
    if (newlyLost) this.ui.notify(`${newlyLost} animal(is) não resistiu(ram) à fumaça ou ao fogo.`);
    const exposure = exposureAt(this.fires.fires, this.player.position);
    const surrounded = isEncircled(this.fires.fires, this.player.position);
    const oldHealth = this.healthState.health;
    this.healthState = advanceSurvival(this.healthState, exposure, dt, surrounded);
    this.damageFeedback.hit(oldHealth - this.healthState.health, exposure.directFire || surrounded);
    if (surrounded && this.healthState.health > 0 && this.elapsed % 4 < dt) this.ui.notify('Você está cercado pelo fogo! Fuja!');
    if (this.healthState.health <= 0) { this.finish('lost'); return; }
    this.hudClock += dt;
    if (this.hudClock >= .12 || newFires.length || newlyLost) { this.hudClock = 0; this.refreshHUD(); }
  }

  frame(time) {
    if (!this.active || !this.renderer) { this.loopStarted = false; return; }
    requestAnimationFrame(next => this.frame(next));
    const targetFPS = this.platform === 'mobile' ? 24 : RENDER_FPS;
    if (time - this.lastRenderTime < 1000 / targetFPS) return;
    // Keep the menu/pause screen near static, saving GPU power while idle.
    if (this.mode !== 'playing' && time - (this.lastIdleFrame || 0) < 250) return;
    if (this.mode !== 'playing') this.lastIdleFrame = time;
    const dt = this.previousTime ? Math.min((time - this.previousTime) / 1000, .05) : 0;
    this.previousTime = time;
    this.lastRenderTime = time;
    if (this.mode === 'playing') {
      this.update(dt);
      if (this.mode === 'playing') {
        this.fires.update(dt, this.elapsed);
        this.atmosphere.update(dt, this.fires, this.player.position);
      }
    }
    this.damageFeedback.update(dt);
    if (!this.gpuLost) {
      try { this.renderer.render(this.scene, this.camera); }
      catch (error) { this.showFatal(error); }
    }
  }
}
