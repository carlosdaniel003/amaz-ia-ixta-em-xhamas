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
import { MAX_HEALTH, HIRE_COST, MUNICIPAL_COST, STATE_COST, MAX_HELPERS, exposureAt, isEncircled, advanceSurvival, extinguishReward, canBuy } from './SurvivalLogic.js';

const MOVE_SPEED = 8.5;
const worldGround = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .97;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x504940);
    this.scene.fog = new THREE.FogExp2(0x504940, .035);
    this.scene.add(new THREE.HemisphereLight(0xb9b6a0, 0x1c2920, 1.55));
    const sun = new THREE.DirectionalLight(0xf1ad7c, 1.05);
    sun.position.set(-14, 27, 10);
    this.scene.add(sun);
    this.camera = new THREE.PerspectiveCamera(48, 1, .1, 150);
    this.camera.position.set(0, 31, 39);
    this.camera.lookAt(0, 1, 6);
    this.cameraOffset = new THREE.Vector3(0, 28, 29);
    this.raycaster = new THREE.Raycaster();
    this.tempTarget = new THREE.Vector3();
    this.tempNozzle = new THREE.Vector3();
    this.world = new World(this.scene);
    this.player = new Player(this.scene);
    this.fires = new FireSystem(this.scene);
    this.water = new WaterSystem(this.scene);
    this.helpers = new Helpers(this.scene);
    this.support = new AirSupport(this.scene);
    this.wildlife = new Wildlife(this.scene);
    this.atmosphere = new Atmosphere(this.scene);
    this.damageFeedback = new DamageFeedback(document.getElementById('damage-flash'));
    this.input = new Input(canvas, () => this.togglePause());
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
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault(); this.active = false;
      const banner = document.getElementById('fatal-error');
      banner.textContent = 'A conexão com a placa gráfica foi perdida. Recarregue a página para continuar.';
      banner.hidden = false;
    });
    requestAnimationFrame((time) => this.frame(time));
  }

  chooseDesktop() { this.mode = 'start'; this.ui.setState('start'); }
  chooseMobile() { this.mode = 'mobile'; this.ui.setState('mobile'); }
  chooseDevice() { this.mode = 'device'; this.ui.setState('device'); }

  start() {
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
    this.world.refreshCanopies(this.player.position, true);
    this.ui.reset();
    this.ui.setState('playing');
    this.refreshHUD();
    this.canvas.focus({ preventScroll: true });
  }

  togglePause() {
    if (this.mode === 'playing') { this.mode = 'paused'; this.input.clear(); this.ui.setState('paused'); }
    else if (this.mode === 'paused') this.resume();
  }
  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing'; this.ui.setState('playing'); this.canvas.focus({ preventScroll: true });
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
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.camera.aspect = width / height;
    this.camera.fov = width < 620 ? 59 : 48;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  aimAtPointer() {
    this.raycaster.setFromCamera(this.input.aim, this.camera);
    if (this.raycaster.ray.intersectPlane(worldGround, this.tempTarget)) this.player.face(this.tempTarget.x, this.tempTarget.z);
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
    const move = this.input.move();
    const moving = Math.hypot(move.x, move.z) > .08;
    if (moving) {
      const nextX = this.player.position.x + move.x * MOVE_SPEED * dt;
      const nextZ = this.player.position.z + move.z * MOVE_SPEED * dt;
      if (this.world.canOccupy(nextX, this.player.position.z)) this.player.position.x = nextX;
      if (this.world.canOccupy(this.player.position.x, nextZ)) this.player.position.z = nextZ;
    }
    if (!this.input.hasPointerAim) {
      const nearest = this.fires.nearest(this.player.position, 24);
      if (nearest) this.player.face(nearest.x, nearest.z);
      else if (moving) this.player.face(this.player.position.x + move.x, this.player.position.z + move.z);
    } else this.aimAtPointer();
    this.player.update(dt, moving);
    this.world.refreshCanopies(this.player.position);
    this.tempTarget.copy(this.player.position).add(this.cameraOffset);
    this.camera.position.lerp(this.tempTarget, 1 - Math.exp(-4.3 * dt));
    this.camera.lookAt(this.player.position.x, 1.1, this.player.position.z - 1.5);

    const spraying = this.input.spraying;
    if (spraying) this.awardExtinguished(this.fires.spray(this.player.position, this.player.forward, dt));
    this.water.update(dt, spraying, this.player.nozzleWorldPosition(this.tempNozzle), this.player.forward);
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
    if (!this.active) return;
    const dt = this.previousTime ? Math.min((time - this.previousTime) / 1000, .045) : 0;
    this.previousTime = time;
    if (this.mode === 'playing') this.update(dt);
    if (this.mode !== 'paused') {
      this.fires.update(dt, this.elapsed);
      this.atmosphere.update(dt, this.fires, this.player.position);
      if (this.mode !== 'playing') this.water.update(dt, false, this.player.position, this.player.forward);
    }
    this.damageFeedback.update(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(next => this.frame(next));
  }
}
