import * as THREE from 'three';
import { World } from './World.js';
import { Player } from './Player.js';
import { FireSystem } from './FireSystem.js';
import { WaterSystem } from './WaterSystem.js';
import { Input } from './Input.js';
import { UI } from '../ui/UI.js';

const MOVE_SPEED = 8.5;
const worldGround = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const tempTarget = new THREE.Vector3();

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1.35 : 1.7));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fc19c);
    this.scene.fog = new THREE.Fog(0x9fc19c, 37, 94);
    this.scene.add(new THREE.HemisphereLight(0xe2f7ea, 0x345c35, 2.15));
    const sun = new THREE.DirectionalLight(0xffebc0, 2.1);
    sun.position.set(-14, 27, 10);
    this.scene.add(sun);

    this.camera = new THREE.PerspectiveCamera(48, 1, .1, 150);
    this.camera.position.set(0, 23, 32);
    this.camera.lookAt(0, 1, 6);
    this.cameraOffset = new THREE.Vector3(0, 20, 22);
    this.raycaster = new THREE.Raycaster();
    this.world = new World(this.scene);
    this.player = new Player(this.scene);
    this.fires = new FireSystem(this.scene);
    this.water = new WaterSystem(this.scene);

    this.input = new Input(canvas, document.getElementById('virtual-stick'), document.getElementById('stick-center'), document.getElementById('spray-button'), () => this.togglePause());
    this.ui = new UI({
      start: () => this.start(), pause: () => this.togglePause(),
      resume: () => this.resume(), restart: () => this.start(),
    });
    this.mode = 'start';
    this.coins = 0;
    this.elapsed = 0;
    this.previousTime = 0;
    this.active = true;
    this.ui.setProgress(this.fires.activeCount, this.fires.fires.length, this.coins);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      this.input.clear();
      if (document.hidden && this.mode === 'playing') this.togglePause();
    });
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.active = false;
      this.ui.notify('A renderização foi interrompida. Recarregue a página.');
      document.getElementById('fatal-error').textContent = 'A conexão com a placa gráfica foi perdida. Recarregue a página para continuar.';
      document.getElementById('fatal-error').hidden = false;
    });
    requestAnimationFrame((time) => this.frame(time));
  }

  start() {
    this.mode = 'playing';
    this.coins = 0;
    this.elapsed = 0;
    this.input.clear();
    this.player.reset();
    this.fires.reset();
    this.water.reset();
    this.ui.reset();
    this.ui.setState('playing');
    this.canvas.focus({ preventScroll: true });
  }

  togglePause() {
    if (this.mode === 'playing') {
      this.mode = 'paused';
      this.input.clear();
      this.ui.setState('paused');
    } else if (this.mode === 'paused') this.resume();
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.ui.setState('playing');
    this.canvas.focus({ preventScroll: true });
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
    if (this.raycaster.ray.intersectPlane(worldGround, tempTarget)) this.player.face(tempTarget.x, tempTarget.z);
  }

  update(delta) {
    const move = this.input.move();
    const moving = Math.hypot(move.x, move.z) > .08;
    if (moving) {
      const nextX = this.player.position.x + move.x * MOVE_SPEED * delta;
      const nextZ = this.player.position.z + move.z * MOVE_SPEED * delta;
      if (this.world.canOccupy(nextX, this.player.position.z)) this.player.position.x = nextX;
      if (this.world.canOccupy(this.player.position.x, nextZ)) this.player.position.z = nextZ;
    }
    if (this.input.isTouch || !this.input.hasPointerAim) {
      const nearest = this.fires.nearest(this.player.position, 24);
      if (nearest) this.player.face(nearest.x, nearest.z);
      else if (moving) this.player.face(this.player.position.x + move.x, this.player.position.z + move.z);
    } else this.aimAtPointer();
    this.player.update(delta, moving);

    const desiredPosition = tempTarget.copy(this.player.position).add(this.cameraOffset);
    const easing = 1 - Math.exp(-4.3 * delta);
    this.camera.position.lerp(desiredPosition, easing);
    this.camera.lookAt(this.player.position.x, 1.1, this.player.position.z - 1.5);

    const spraying = this.input.spraying;
    if (spraying) {
      const completed = this.fires.spray(this.player.position, this.player.forward, delta);
      for (const fire of completed) {
        this.coins += 25;
        this.ui.extinguished(this.coins);
      }
      if (completed.length) this.ui.setProgress(this.fires.activeCount, this.fires.fires.length, this.coins);
      if (this.fires.activeCount === 0) {
        this.mode = 'won';
        this.input.clear();
        this.ui.setState('won');
      }
    }
    this.water.update(delta, spraying, this.player.nozzleWorldPosition(new THREE.Vector3()), this.player.forward);
  }

  frame(time) {
    if (!this.active) return;
    const delta = this.previousTime ? Math.min((time - this.previousTime) / 1000, .045) : 0;
    this.previousTime = time;
    if (this.mode === 'playing') this.update(delta);
    if (this.mode !== 'paused') {
      this.elapsed += delta;
      this.fires.update(delta, this.elapsed);
      if (this.mode !== 'playing') this.water.update(delta, false, this.player.position, this.player.forward);
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame((next) => this.frame(next));
  }
}
