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
import { worldMovement } from './FirstPersonLogic.js';
import { MAX_HEALTH, HIRE_COST, MUNICIPAL_COST, STATE_COST, MAX_HELPERS, exposureAt, isEncircled, advanceSurvival, extinguishReward, canBuy } from './SurvivalLogic.js';

const MOVE_SPEED = 8.5;
const EYE_HEIGHT = 1.85;
const RENDER_FPS = 36;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    // Do not allocate a GPU context or procedural forest on the device-selection page.
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.world = null;
    this.active = false;
    this.gpuLost = false;
    this.loopStarted = false;
    this.renderScale = 1;
    this.lastRenderTime = 0;
    this.damageFeedback = new DamageFeedback(document.getElementById('damage-flash'));
    this.aimDirection = new THREE.Vector3(0, 0, -1);
    this.tempNozzle = new THREE.Vector3();
    this.input = new Input(canvas, () => this.togglePause(), () => this.onPointerUnlock());
    this.ui = new UI({ selectDesktop: () => this.chooseDesktop(), selectMobile: () => this.chooseMobile(), backToDevice: () => this.chooseDevice(), start: () => this.start(), pause: () => this.togglePause(), resume: () => this.resume(), restart: () => this.start(), hire: () => this.purchase('hire'), municipal: () => this.purchase('municipal'), state: () => this.purchase('state') });
    this.mode = 'device';
    this.coins = 0;
    this.elapsed = 0;
    this.previousTime = 0;
    this.active = true;
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
      this.gpuLost = true;
      this.active = false;
      this.loopStarted = false;
      if (this.mode === 'playing') this.togglePause();
      this.input.releaseLock();
      this.ui.notify('Vídeo interrompido. Aguardando recuperação automática do navegador.');
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

  /** Create WebGL only after the player has explicitly started a mission. */
  initializeGraphics() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      stencil: false,
      powerPreference: 'default',
      preserveDrawingBuffer: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .97;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x504940);
    this.scene.fog = new THREE.FogExp2(0x504940, .035);
    this.scene.add(new THREE.HemisphereLight(0xb9b6a0, 0x1c2920, 1.55));
    const sun = new THREE.DirectionalLight(0xf1ad7c, 1.05);
    sun.position.set(-14, 27, 10);
    this.scene.add(sun);

    this.camera = new THREE.PerspectiveCamera(75, 1, .08, 115);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.createFirstPersonHose();

    this.world = new World(this.scene);
    this.player = new Player(this.scene);
    this.player.root.visible = false; // Camera is inside the character; avoid seeing the head.
    this.fires = new FireSystem(this.scene);
    this.water = new WaterSystem(this.scene);
    this.helpers = new Helpers(this.scene);
    this.support = new AirSupport(this.scene);
    this.wildlife = new Wildlife(this.scene);
    this.atmosphere = new Atmosphere(this.scene);
    this.resize();
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
    this.ui.setState('paused');
  }

  showFatal(error) {
    console.error('Falha no WebGL:', error);
    this.active = false;
    this.input.releaseLock();
    const banner = document.getElementById('fatal-error');
    banner.textContent = 'Não foi possível iniciar os gráficos 3D. Verifique o suporte a WebGL e os drivers de vídeo do navegador. Tente atualizar a página ou outro navegador.';
    banner.hidden = false;
  }

  chooseDesktop() { this.mode = 'start'; this.ui.setState('start'); }
  chooseMobile() { this.mode = 'mobile'; this.ui.setState('mobile'); }
  chooseDevice() { this.mode = 'device'; this.ui.setState('device'); }

  start() {
    if (this.mode === 'loading') return;
    this.mode = 'loading';
    this.ui.setState('loading');
    this.input.clear();
    this.input.resetLook();
    // Request lock in the actual click gesture. Canvas click is also a fallback.
    this.input.requestLock();
    // Yield a paint so the loading overlay appears BEFORE the expensive scene is built.
    window.setTimeout(() => {
      try {
        if (!this.renderer) this.initializeGraphics();
        this.beginSession();
      } catch (error) {
        this.showFatal(error);
      }
    }, 60);
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
    this.player.reset();
    this.fires.reset();
    this.water.reset();
    this.helpers.reset();
    this.support.reset();
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
      this.input.clear();
      this.ui.setState('paused');
      this.input.releaseLock();
    } else if (this.mode === 'paused') this.resume();
  }

  resume() {
    if (this.mode !== 'paused' || this.gpuLost) return;
    this.mode = 'playing';
    this.ui.setState('playing');
    this.canvas.focus({ preventScroll: true });
    this.input.requestLock();
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
    this.refreshHUD();
  }

  resize() {
    if (!this.camera || !this.renderer) return;
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // A bounded framebuffer is more important than high DPR for integrated GPUs.
    const scale = Math.min(1, Math.sqrt(1100000 / (width * height))) * this.renderScale;
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
    const move = worldMovement(this.input.move(), this.input.yaw);
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

    const spraying = this.input.spraying;
    if (spraying) this.awardExtinguished(this.fires.spray(this.camera.position, this.aimDirection, dt));
    this.water.update(dt, spraying, this.tempNozzle, this.aimDirection);
    if (this.mode !== 'playing') return;

    this.awardExtinguished(this.helpers.update(dt, this.fires, this.world));
    if (this.mode !== 'playing') return;
    this.awardExtinguished(this.support.update(dt, this.fires));
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
    if (time - this.lastRenderTime < 1000 / RENDER_FPS) return;
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
