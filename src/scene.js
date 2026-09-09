import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { makeMaterials, disposeModel, vector, ring, seededRandom } from './assets.js';
import { createMech } from './mech.js';
import { partDefinitions, defaultParts, buildPresets, chassisNames } from './catalog.js';
import { createHangar, createDust, createLightShafts } from './hangar.js';
import { loadPartLibrary, libraryDiagnostics } from './library.js';
import { createLocomotion } from './locomotion.js';
import { createRenderClock, createTrainingDirector } from './training.js';
import { createPlayerController } from './player-controller.js';
import { createPlayerCamera } from './player-camera.js';
import { createBattlefield } from './battlefield.js';
import { createCombatSimulation } from './combat-simulation.js';
import { compileLoadout } from './loadout-behavior.js';
import { createGameplayActors } from './gameplay-actors.js';

const host = document.getElementById('scene-host');
const loading = document.getElementById('scene-loading');
const errorPanel = document.getElementById('scene-error');

function initialize() {
  const scene = new THREE.Scene();
  scene.name = 'IRONCLAD / BAY 09';
  scene.background = new THREE.Color('#151f26');
  scene.fog = new THREE.FogExp2('#19242b', 0.023);
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', '3D 机库，拖动旋转镜头，滚轮缩放');
  renderer.domElement.setAttribute('tabindex', '0');
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160);
  camera.position.set(9.3, 5.9, 13.6);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2.73, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 3;
  controls.maxDistance = 27;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.minPolarAngle = 0.23;
  controls.enablePan = true;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.36;
  controls.update();
  const materials = makeMaterials();
  const environment = new RoomEnvironment();
  const generator = new THREE.PMREMGenerator(renderer);
  const environmentMap = generator.fromScene(environment, 0.04);
  scene.environment = environmentMap.texture;
  scene.environmentIntensity = 0.53;
  environment.dispose();
  generator.dispose();
  const environmentRig = createHangar(materials);
  const hangar = environmentRig.group;
  const arena = environmentRig.arena;
  const battlefield = createBattlefield(materials);
  battlefield.setActive(false);
  scene.add(hangar, battlefield.group);
  window.addEventListener('ironclad:combat', event => {
    const snapshot = combatSimulation?.getSnapshot?.();
    if (gameplayActors && snapshot) gameplayActors.update(snapshot, 0.016);
    const hud = document.getElementById('gameplay-hud');
    if (!hud || !snapshot) return;
    const p = snapshot.player;
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    set('gameplay-player-hp', Math.round(p.hp) + ' / ' + p.maxHp);
    set('gameplay-player-shield', Math.round(p.shield) + '%');
    set('gameplay-heat', Math.round(p.heat) + '%');
    set('gameplay-energy', Math.round(p.energy) + '%');
    const objective = snapshot.objective;
    set('gameplay-mode-label', objective.objective === 'extract' ? '撤离信标已解锁' : '战区作战 · SECTOR 09');
    set('gameplay-prompt', objective.objective === 'extract' ? '前往撤离区并按住撤退' : '歼灭敌军并占领全部据点');
  });
  const dust = createDust();
  dust.name = 'Atmosphere';
  scene.add(dust);
  const lightShafts = createLightShafts();
  scene.add(lightShafts);
  scene.add(new THREE.HemisphereLight('#b3d8ed', '#4c4737', 0.4));
  const key = new THREE.SpotLight('#d5e9ff', 920, 38, 0.61, 0.7, 2);
  key.position.set(3.8, 11, 5.2);
  key.target.position.set(0, 2.5, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.00015;
  key.shadow.normalBias = 0.025;
  key.shadow.camera.near = 0.5;
  scene.add(key, key.target);
  const rim = new THREE.SpotLight('#ffc77e', 1350, 34, 0.58, 0.75, 2);
  rim.position.set(-4.5, 8.3, -5);
  rim.target.position.set(0, 3.1, 0);
  scene.add(rim, rim.target);
  const fill = new THREE.DirectionalLight('#76b5ce', 0.8);
  fill.position.set(-5, 4.5, 6);
  scene.add(fill);
  const front = new THREE.DirectionalLight('#fff1d1', 0.55);
  front.position.set(2, 6, 10);
  scene.add(front);
  const floorLight = new THREE.PointLight('#37aec2', 10, 9, 2);
  floorLight.position.set(0, 0.7, 1.5);
  scene.add(floorLight);
  for (const side of [-1, 1]) {
    const lamp = new THREE.PointLight(side > 0 ? '#eeb06f' : '#77c2d9', 210, 17, 2);
    lamp.position.set(side * 7, 5, -9);
    scene.add(lamp);
  }
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ambientOcclusion = new SSAOPass(scene, camera, 512, 512);
  ambientOcclusion.kernelRadius = 0.32;
  ambientOcclusion.minDistance = 0.001;
  ambientOcclusion.maxDistance = 0.14;
  composer.addPass(ambientOcclusion);
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.23, 0.45, 1.55);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const antialiasing = new ShaderPass(FXAAShader);
  composer.addPass(antialiasing);
  let currentParts = { ...defaultParts };
  let currentColors = {};
  let currentMech = createMech(currentParts, materials, currentColors);
  let playerMotion = createLocomotion(currentMech, currentParts.legs);
  scene.add(currentMech.root);
  const enemyMaterials = { ...materials, paint: materials.paint.clone(), ivory: materials.ivory.clone(), cyan: materials.cyan.clone() };
  enemyMaterials.paint.color.set('#522c27');
  enemyMaterials.ivory.color.set('#4b5759');
  enemyMaterials.cyan.color.set('#ff8166');
  enemyMaterials.cyan.emissive.set('#ed3e20');
  const enemy = createMech({ chassis: 'raptor', head: 'sensor', arms: 'lancer', legs: 'anchor', weapon: 'arc', backpack: 'compact' }, enemyMaterials);
  const enemyMotion = createLocomotion(enemy, 'anchor');
  enemy.root.position.copy(arena.enemyPosition);
  enemy.root.scale.setScalar(0.94);
  enemy.root.rotation.y = Math.atan2(arena.playerPosition.x - arena.enemyPosition.x, arena.playerPosition.z - arena.enemyPosition.z);
  enemy.root.visible = false;
  scene.add(enemy.root);
  const targetRing = ring(scene, 2.1, 0.023, [arena.enemyPosition.x, 0.015, arena.enemyPosition.z], materials.red, [Math.PI / 2, 0, 0]);
  targetRing.visible = false;
  const flash = new THREE.PointLight('#9bdfff', 0, 11, 2);
  scene.add(flash);
  const effects = [];
  const fxRandom = seededRandom(90217);
  let battle = false;
  let elapsed = 0;
  const renderClock = createRenderClock();
  let training = null;
  let trainingMoving = false;
  let trainingDistance = 0;
  let lastFrame = performance.now();
  let lastMetrics = lastFrame;
  let frames = 0;
  let cameraTransition = null;
  let quality = 'cinematic';
  let paused = false;
  let activePart = 'chassis';
  let recoil = 0;
  let recoilSide = 'player';
  let enemyDown = false;
  let playerDown = false;
  let action = null;
  let actionSerial = 0;
  let exporting = false;
  let testSpeed = 1;
  let testPaused = false;
  const testMode = new URLSearchParams(window.location.search).has('trainingTest');
  const previousPlayer = currentMech.root.position.clone();
  const previousEnemy = enemy.root.position.clone();
  const playerAim = new THREE.Vector3();
  const enemyAim = new THREE.Vector3();
  const poseState = { player: 0, enemy: 0 };
  const motionSample = { distance: 0, moving: false, elapsed: 0, speed: 0, groundHeight: 0 };
  const playerController = createPlayerController({ canvas: renderer.domElement });
  const playerCamera = createPlayerCamera(camera, scene, { collisionGroup: battlefield.collisionGroup, distance: 8, height: 2.6 });
  let gameplayMode = 'hangar';
  let combatSimulation = null;
  let gameplayLoadout = null;
  let gameplayInput = null;
  let battlefieldReturn = null;
  let gameplayActors = createGameplayActors(scene, materials, battlefield);
  const hangarMechSave = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: new THREE.Vector3(1, 1, 1) };

  function groundMech(mech, kind) {
    const floor = environmentRig.getGroundHeight(mech.root.position.x, mech.root.position.z);
    mech.root.position.y = floor - mech.modelMinY * mech.root.scale.y + (kind === 'hover' ? 0.5 : 0.018);
    return floor;
  }

  groundMech(currentMech, currentParts.legs);
  groundMech(enemy, 'anchor');

  function setCamera(position, target) {
    if (training?.getState().active) return;
    cameraTransition = { position: vector(position), target: vector(target) };
    controls.autoRotate = false;
    document.getElementById('auto-rotate').setAttribute('aria-pressed', 'false');
  }

  function resetCamera() {
    const compact = host.clientWidth < 700;
    const size = currentMech.bounds.getSize(new THREE.Vector3());
    const distanceScale = Math.max(1, size.x / 5.35, size.y / 6.6);
    const targetY = 2.73 + currentMech.upperOffset * 0.72;
    const position = compact ? [10.2, 6.2, 15.4] : [9.3, 5.9, 13.6];
    setCamera([Math.min(8.4, position[0]), targetY + (position[1] - 2.73) * distanceScale, position[2] * distanceScale], [0, targetY, 0]);
  }

  function update(parts, colors = {}) {
    if (training?.getState().active || exporting) return false;
    const changed = Object.keys(parts).some(key => parts[key] !== currentParts[key]);
    const colorsChanged = JSON.stringify(colors) !== JSON.stringify(currentColors);
    if (changed || colorsChanged) {
      const reframing = parts.legs !== currentParts.legs || parts.backpack !== currentParts.backpack;
      playerMotion.reset();
      disposeModel(currentMech.root);
      currentParts = { ...parts };
      currentColors = JSON.parse(JSON.stringify(colors));
      currentMech = createMech(currentParts, materials, currentColors);
      playerMotion = createLocomotion(currentMech, currentParts.legs);
      groundMech(currentMech, currentParts.legs);
      previousPlayer.copy(currentMech.root.position);
      scene.add(currentMech.root);
      if (reframing && !battle) resetCamera();
    }
  }

  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
    const ratio = renderer.getPixelRatio();
    antialiasing.uniforms.resolution.value.set(1 / (width * ratio), 1 / (height * ratio));
  }

  function setQuality(value) {
    const ratios = { cinematic: 1.5, balanced: 1.1, performance: 0.85 };
    value = Object.hasOwn(ratios, value) ? value : 'balanced';
    quality = value;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, ratios[value]));
    composer.setPixelRatio(renderer.getPixelRatio());
    ambientOcclusion.enabled = value === 'cinematic';
    bloom.enabled = value !== 'performance';
    lightShafts.visible = value !== 'performance' && currentMech.root.position.z > -24;
    renderer.shadowMap.enabled = value !== 'performance';
    arena.lights.forEach(light => { if (light.isSpotLight) light.castShadow = value !== 'performance'; });
    resize();
    document.getElementById('render-mode').textContent = value === 'cinematic' ? 'PBR / AO / BLOOM' : value === 'balanced' ? 'PBR / BLOOM' : 'PBR / ECO';
  }

  function clearEffects() {
    for (const effect of effects) {
      effect.object.removeFromParent();
      effect.object.geometry.dispose();
      effect.object.material.dispose();
    }
    effects.length = 0;
    flash.intensity = 0;
  }

  function cancelAttack() {
    actionSerial += 1;
    action = null;
    recoil = 0;
    playerMotion.reset();
    enemyMotion.reset();
    currentMech.weapon.position.z = currentMech.weaponRestZ;
    enemy.weapon.position.z = enemy.weaponRestZ;
    clearEffects();
  }

  function resetActors() {
    cancelAttack();
    enemyDown = playerDown = false;
    poseState.player = poseState.enemy = 0;
    currentMech.root.rotation.z = enemy.root.rotation.z = 0;
    enemy.root.position.copy(arena.enemyPosition);
    enemy.root.rotation.y = Math.atan2(arena.playerPosition.x - arena.enemyPosition.x, arena.playerPosition.z - arena.enemyPosition.z);
    groundMech(enemy, 'anchor');
    previousEnemy.copy(enemy.root.position);
    previousPlayer.copy(currentMech.root.position);
  }

  function setBattle(value) {
    if (value) return beginTraining();
    if (training.getState().active) return false;
    training.reset();
    resetCamera();
    return true;
  }

  function beginTraining() {
    if (paused || exporting || training.getState().active) return Promise.resolve(false);
    return training.beginTraining();
  }

  function shotEffect(side, weapon, end, flight = 0.4) {
    const attacker = side === 'player' ? currentMech : enemy;
    scene.updateMatrixWorld(true);
    const start = attacker.muzzle.getWorldPosition(new THREE.Vector3());
    const melee = ['monoblade', 'beamblade'].includes(weapon);
    const accent = attacker.scopedMaterials?.weapon?.cyan?.color || materials.cyan.color;
    const color = weapon === 'gatling' || weapon === 'missiles' ? new THREE.Color('#ffc677') : side === 'player' ? accent.clone() : new THREE.Color('#ff7655');
    let curve;
    if (melee) {
      const middle = end.clone().lerp(start, 0.45).add(new THREE.Vector3(0, 0.55, 0));
      curve = new THREE.CatmullRomCurve3([start, middle, end]);
    } else if (weapon === 'arc') {
      curve = new THREE.CatmullRomCurve3([start, start.clone().lerp(end, 0.32).add(new THREE.Vector3(0.15, 0.32, 0.1)), start.clone().lerp(end, 0.64).add(new THREE.Vector3(-0.12, -0.2, 0)), end]);
    } else if (weapon === 'missiles') {
      curve = new THREE.CatmullRomCurve3([start, start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 3.2, 0)), end]);
    } else {
      curve = new THREE.LineCurve3(start, end);
    }
    const shape = new THREE.TubeGeometry(curve, weapon === 'arc' || weapon === 'missiles' || melee ? 18 : 1, melee ? 0.085 : weapon === 'missiles' ? 0.012 : 0.03, 6, false);
    const material = new THREE.MeshBasicMaterial({ color: color.multiplyScalar(4), transparent: true, opacity: weapon === 'missiles' ? 0.3 : 1, depthWrite: false, blending: THREE.AdditiveBlending });
    const beam = new THREE.Mesh(shape, material);
    scene.add(beam);
    effects.push({ object: beam, age: 0, life: weapon === 'missiles' ? flight : 0.23, opacity: material.opacity });
    if (weapon === 'gatling') {
      for (const offset of [-1, 1]) {
        const tracer = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(start.clone().add(new THREE.Vector3(offset * 0.13, 0, 0)), end.clone().add(new THREE.Vector3(offset * 0.1, 0.07, 0))), 1, 0.014, 5, false), material.clone());
        scene.add(tracer);
        effects.push({ object: tracer, age: 0, life: 0.16 });
      }
    }
    if (weapon === 'missiles') {
      const rocket = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffeeaa', transparent: true }));
      rocket.position.copy(start);
      scene.add(rocket);
      effects.push({ object: rocket, path: curve, age: 0, life: flight });
    }
    recoil = 0.2;
    recoilSide = side;
  }

  function impactEffect(position, critical = false) {
    const count = quality === 'performance' ? 20 : 45;
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let index = 0; index < count; index += 1) {
      position.toArray(positions, index * 3);
      velocities.push(new THREE.Vector3((fxRandom() - 0.5) * 5, 0.8 + fxRandom() * 3.3, (fxRandom() - 0.5) * 5));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: critical ? '#fff5cb' : '#ffc174', size: critical ? 0.075 : 0.056, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(particles);
    effects.push({ object: particles, velocities, age: 0, life: 0.75 });
    flash.position.copy(position);
    flash.intensity = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 35 : critical ? 230 : 130;
  }

  function strike(side, weapon) {
    if (training.getState().phase !== 'COMBAT') return false;
    const defender = side === 'player' ? enemy : currentMech;
    scene.updateMatrixWorld(true);
    const end = defender.poseRoot.localToWorld(new THREE.Vector3(0, 3.85 + defender.upperOffset, 0.28));
    shotEffect(side, weapon, end);
    impactEffect(end);
    return true;
  }

  async function performAttack(side, weapon, { dodged = false, critical = false, onImpact } = {}) {
    if (paused || action || training.getState().phase !== 'COMBAT') return false;
    const attacker = side === 'player' ? currentMech : enemy;
    const defender = side === 'player' ? enemy : currentMech;
    const serial = ++actionSerial;
    const melee = ['monoblade', 'beamblade'].includes(weapon);
    const direction = defender.root.position.clone().sub(attacker.root.position);
    direction.y = 0;
    const separation = direction.length();
    direction.normalize();
    const duration = melee ? 2.15 : weapon === 'missiles' ? 1.45 : 1.05;
    const shot = {
      serial, side, weapon, attacker, defender, melee, dodged, critical, onImpact, duration,
      attackerStart: attacker.root.position.clone(), defenderStart: defender.root.position.clone(),
      direction, sidestep: new THREE.Vector3(direction.z, 0, -direction.x),
      approach: Math.max(0, separation - 3.05), progress: 0, fired: false, impacted: false,
      fireAt: weapon === 'missiles' ? 0.24 : melee ? 0.5 : 0.43,
      impactAt: weapon === 'missiles' ? 0.66 : melee ? 0.56 : 0.46,
      end: new THREE.Vector3()
    };
    action = shot;
    training.aimCombat(side);
    const complete = await renderClock.tween(duration, progress => {
      shot.progress = progress;
      if (melee) {
        const outward = Math.min(1, progress / 0.4);
        const retreat = Math.max(0, (progress - 0.72) / 0.28);
        const travel = (outward * outward * (3 - 2 * outward)) * (1 - retreat * retreat * (3 - 2 * retreat));
        attacker.root.position.copy(shot.attackerStart).addScaledVector(direction, shot.approach * travel);
      }
      if (dodged) {
        const evade = Math.sin(Math.PI * Math.min(1, Math.max(0, (progress - 0.18) / 0.75)));
        defender.root.position.copy(shot.defenderStart).addScaledVector(shot.sidestep, evade * 1.6);
      }
      attacker.root.rotation.y = Math.atan2(direction.x, direction.z);
    });
    if (serial !== actionSerial || !complete) return false;
    attacker.root.position.copy(shot.attackerStart);
    defender.root.position.copy(shot.defenderStart);
    action = null;
    return true;
  }

  function animateAttack() {
    if (!action) return;
    const shot = action;
    const { attacker, defender, progress, melee } = shot;
    const arm = attacker.armRight;
    const rest = attacker.armRest[1];
    if (arm && rest) {
      if (melee) {
        const swing = THREE.MathUtils.smoothstep(progress, 0.4, 0.61);
        const settle = 1 - THREE.MathUtils.smoothstep(progress, 0.7, 1);
        arm.rotation.x = rest.rotation.x + (-0.9 + swing * 1.65) * settle;
        arm.rotation.z = rest.rotation.z + (0.58 - swing * 1.3) * settle;
      } else {
        arm.rotation.x = rest.rotation.x - Math.sin(Math.PI * progress) * 0.055;
      }
    }
    if (shot.dodged) defender.poseRoot.rotation.z += Math.sin(progress * Math.PI) * 0.075;
    scene.updateMatrixWorld(true);
    if (!shot.fired && progress >= shot.fireAt) {
      shot.fired = true;
      shot.end.copy(shot.defenderStart);
      shot.end.y = defender.root.position.y + (3.85 + defender.upperOffset) * defender.root.scale.y;
      shot.end.addScaledVector(shot.direction, 0.28);
      shotEffect(shot.side, shot.weapon, shot.end, Math.max(0.05, (shot.impactAt - shot.fireAt) * shot.duration));
    }
    if (!shot.impacted && progress >= shot.impactAt) {
      shot.impacted = true;
      if (!shot.dodged) {
        impactEffect(shot.end, shot.critical);
        shot.onImpact?.();
      }
    }
    if (shot.impacted && !shot.dodged) {
      const response = Math.sin(Math.PI * THREE.MathUtils.clamp((progress - shot.impactAt) / 0.28, 0, 1));
      defender.poseRoot.rotation.x += response * (shot.critical ? 0.12 : 0.055);
    }
  }

  async function exportBinary(kind = 'scene') {
    const asset = new THREE.Group();
    asset.name = kind === 'mech' ? currentMech.root.name : 'IRONCLAD_HANGAR_09';
    if (kind !== 'mech') asset.add(hangar.clone(true));
    const model = currentMech.root.clone(true);
    model.rotation.set(0, 0, 0);
    model.position.set(0, 0.23, 0);
    asset.add(model);
    asset.updateMatrixWorld(true);
    return new GLTFExporter().parseAsync(asset, { binary: true, onlyVisible: true, maxTextureSize: 1024 });
  }

  function download(blob, filename) {
    const address = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = address;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(address), 10000);
  }

  function animate(now) {
    requestAnimationFrame(animate);
    if (paused || document.hidden || testPaused) {
      lastFrame = now;
      return;
    }
    const delta = Math.min((now - lastFrame) / 1000, 0.05) * testSpeed;
    lastFrame = now;
    elapsed += delta;
    previousPlayer.copy(currentMech.root.position);
    previousEnemy.copy(enemy.root.position);
    training.update(delta);
    if (gameplayMode === 'battlefield') {
      gameplayInput = playerController.update(delta, {});
      const move = gameplayInput.move;
      const speed = gameplayInput.sprint ? 10 : 5;
      const aimPoint = currentMech.root.position.clone().add(new THREE.Vector3(0, 2.2, 0));
      const cameraBasis = playerCamera.update(delta, currentMech.root, aimPoint, { input: gameplayInput });
      const forward = cameraBasis.forward;
      const right = cameraBasis.right;
      const travel = forward.clone().multiplyScalar(move.y * speed * delta).addScaledVector(right, move.x * speed * delta);
      const nextX = THREE.MathUtils.clamp(currentMech.root.position.x + travel.x, battlefield.bounds.minX + 3, battlefield.bounds.maxX - 3);
      const nextZ = THREE.MathUtils.clamp(currentMech.root.position.z + travel.z, battlefield.bounds.minZ + 3, battlefield.bounds.maxZ - 3);
      currentMech.root.position.x = nextX; currentMech.root.position.z = nextZ;
      const hasHorizontalInput = Math.abs(travel.x) + Math.abs(travel.z) > 1e-5;
      if (hasHorizontalInput) {
        const targetYaw = Math.atan2(travel.x, travel.z);
        const yawDelta = Math.atan2(Math.sin(targetYaw - currentMech.root.rotation.y), Math.cos(targetYaw - currentMech.root.rotation.y));
        currentMech.root.rotation.y += yawDelta * (1 - Math.exp(-12 * delta));
      }
      // Ground the player on the battlefield floor (y=0) with authored hover clearance.
      currentMech.root.position.y = currentParts.legs === 'hover' ? 0.55 : 0.05;
      if (combatSimulation) {
        combatSimulation.step(delta, { position: { x: nextX, y: 0, z: nextZ }, firePrimary: gameplayInput.buttons.has(0), armAbility: gameplayInput.actions.has('abilityQ'), backpackAbility: gameplayInput.actions.has('abilityE'), mobility: gameplayInput.actions.has('jump') });
        gameplayActors.update(combatSimulation.getSnapshot(), delta);
      }
    }
    const trainingState = training.getState();
    // Camera ownership is exclusive: hangar idle uses OrbitControls; gameplay uses playerCamera.
    if (!trainingState.active && gameplayMode === 'hangar') {
      if (cameraTransition) {
        const factor = 1 - Math.exp(-5 * delta);
        camera.position.lerp(cameraTransition.position, factor);
        controls.target.lerp(cameraTransition.target, factor);
        if (camera.position.distanceTo(cameraTransition.position) < 0.02) cameraTransition = null;
      }
      controls.update(delta);
    } else if (gameplayMode === 'training') {
      playerCamera.update(delta, currentMech.root, currentMech.root.position, { input: playerController.update(delta, {}) });
    }
    if (gameplayMode !== 'battlefield') {
      const playerFloor = groundMech(currentMech, currentParts.legs);
      const enemyFloor = groundMech(enemy, 'anchor');
      trainingDistance = Math.hypot(currentMech.root.position.x - previousPlayer.x, currentMech.root.position.z - previousPlayer.z);
      trainingMoving = trainingDistance > 0.0001 && trainingDistance < 3;
      Object.assign(motionSample, { distance: trainingMoving ? trainingDistance : 0, moving: trainingMoving, elapsed, speed: trainingMoving ? trainingDistance / delta : 0, groundHeight: playerFloor });
      playerMotion.update(delta, motionSample);
      const enemyDistance = Math.hypot(enemy.root.position.x - previousEnemy.x, enemy.root.position.z - previousEnemy.z);
      Object.assign(motionSample, { distance: enemyDistance < 3 ? enemyDistance : 0, moving: enemyDistance > 0.0001 && enemyDistance < 3, elapsed, speed: enemyDistance < 3 ? enemyDistance / delta : 0, groundHeight: enemyFloor });
      enemyMotion.update(delta, motionSample);
    }
    currentMech.head.rotation.y = Math.sin(elapsed * 0.32) * (trainingState.active ? 0.015 : 0.055);
    dust.rotation.y = elapsed * 0.005;
    targetRing.rotation.z = elapsed * 0.35;
    battlefield.update?.(delta, elapsed);
    const outside = THREE.MathUtils.smoothstep(-currentMech.root.position.z, 20, 29);
    scene.fog.density = THREE.MathUtils.lerp(0.023, 0.012, outside);
    scene.environmentIntensity = THREE.MathUtils.lerp(0.53, 0.7, outside);
    key.intensity = 920 * (1 - outside * 0.82);
    rim.intensity = 1350 * (1 - outside * 0.86);
    lightShafts.visible = quality !== 'performance' && outside < 0.9;
    dust.visible = outside < 0.95;
    poseState.player = THREE.MathUtils.lerp(poseState.player, playerDown ? -0.74 : 0, 1 - Math.exp(-6 * delta));
    poseState.enemy = THREE.MathUtils.lerp(poseState.enemy, enemyDown ? 0.74 : 0, 1 - Math.exp(-6 * delta));
    currentMech.poseRoot.rotation.z = poseState.player;
    enemy.poseRoot.rotation.z = poseState.enemy;
    currentMech.root.updateMatrixWorld(true);
    enemy.root.updateMatrixWorld(true);
    try { animateAttack(); } catch (error) { training.reset('ERROR'); errorPanel.hidden = false; errorPanel.querySelector('p').textContent = '训练场演出中断：' + error.message; }
    recoil = Math.max(0, recoil - delta);
    const kick = Math.sin(recoil / 0.2 * Math.PI) * 0.16;
    currentMech.weapon.position.z = currentMech.weaponRestZ - (recoilSide === 'player' ? kick : 0);
    enemy.weapon.position.z = enemy.weaponRestZ - (recoilSide === 'enemy' ? kick : 0);
    if (currentMech.rotor) currentMech.rotor.rotation.z += delta * (action?.side === 'player' ? 23 : 1.5);
    flash.intensity *= Math.exp(-13 * delta);
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      const effect = effects[index];
      effect.age += delta;
      if (effect.path) effect.object.position.copy(effect.path.getPoint(Math.min(1, effect.age / effect.life)));
      effect.object.material.opacity = (effect.opacity ?? 1) * Math.max(0, 1 - effect.age / effect.life);
      if (effect.velocities) {
        const attribute = effect.object.geometry.attributes.position;
        effect.velocities.forEach((velocity, offset) => {
          velocity.y -= delta * 6;
          attribute.setXYZ(offset, attribute.getX(offset) + velocity.x * delta, attribute.getY(offset) + velocity.y * delta, attribute.getZ(offset) + velocity.z * delta);
        });
        attribute.needsUpdate = true;
      }
      if (effect.age >= effect.life) {
        effect.object.removeFromParent();
        effect.object.geometry.dispose();
        effect.object.material.dispose();
        effects.splice(index, 1);
      }
    }
    composer.render();
    frames += 1;
    if (now - lastMetrics > 1000) {
      const fps = Math.round(frames * 1000 / (now - lastMetrics));
      document.getElementById('fps-readout').textContent = fps + ' FPS';
      frames = 0;
      lastMetrics = now;
    }
  }

  training = createTrainingDirector({
    camera, controls, clock: renderClock, environment: environmentRig, getMech: () => currentMech,
    onEnter() {
      resetActors();
      playerController.disable();
      playerCamera.setEnabled(false);
      cameraTransition = null;
      battle = false;
      enemy.root.visible = true;
      targetRing.visible = true;
      renderer.domElement.inert = true;
    },
    onCombat() {
      resetActors();
      gameplayMode = 'training';
      playerController.enable();
      playerCamera.setEnabled(true);
      groundMech(currentMech, currentParts.legs);
      previousPlayer.copy(currentMech.root.position);
      battle = true;
      enemy.root.visible = true;
      targetRing.visible = true;
    },
    onResult(result) {
      enemyDown = result === 'VICTORY';
      playerDown = result === 'DEFEAT';
      if (!result) { poseState.player = poseState.enemy = 0; playerMotion.reset(); enemyMotion.reset(); }
    },
    onCancel: cancelAttack,
    onRestore() {
      resetActors();
      gameplayMode = 'hangar';
      playerController.disable();
      playerCamera.setEnabled(false);
      battlefield.setActive(false);
      battle = false;
      enemy.root.visible = false;
      targetRing.visible = false;
      cameraTransition = null;
      renderer.domElement.inert = false;
      scene.fog.density = 0.023;
      scene.environmentIntensity = 0.53;
      key.intensity = 920;
      rim.intensity = 1350;
      lightShafts.visible = quality !== 'performance';
      dust.visible = true;
    },
    onError(error) {
      console.error('Training cinematic failed', error);
      errorPanel.hidden = false;
      errorPanel.querySelector('p').textContent = '训练场演出中断：' + error.message;
    }
  });

  controls.addEventListener('start', () => { if (!training.getState().active) cameraTransition = null; });
  new ResizeObserver(resize).observe(host);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    paused = true;
    errorPanel.hidden = false;
    errorPanel.querySelector('p').textContent = '显卡渲染上下文已中断，请刷新页面恢复。可降低画质后继续使用。';
  });
  document.getElementById('quality-select').addEventListener('change', event => setQuality(event.target.value));
  document.getElementById('reset-camera').addEventListener('click', resetCamera);
  document.getElementById('auto-rotate').addEventListener('click', event => {
    cameraTransition = null;
    controls.autoRotate = !controls.autoRotate;
    event.currentTarget.setAttribute('aria-pressed', String(controls.autoRotate));
  });
  document.getElementById('detail-camera').addEventListener('click', () => {
    const groups = { chassis: [currentMech.torso], head: [currentMech.head], arms: currentMech.arms, legs: currentMech.legs, weapon: [currentMech.weapon], backpack: [currentMech.backpack] };
    const bounds = new THREE.Box3();
    groups[activePart].forEach(group => bounds.expandByObject(group));
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const direction = new THREE.Vector3(0.49, 0.19, activePart === 'backpack' ? -0.87 : 0.87).normalize();
    const distance = Math.max(3.2, size.length() * 1.7);
    setCamera(center.clone().addScaledVector(direction, distance).toArray(), center.toArray());
  });
  document.getElementById('scene-camera').addEventListener('click', () => setCamera([14.6, 8.7, 20.1], [0, 3, -2]));
  document.getElementById('photo-mode').addEventListener('click', () => {
    document.body.classList.toggle('photo-mode');
    document.getElementById('photo-mode').setAttribute('aria-pressed', String(document.body.classList.contains('photo-mode')));
  });
  document.getElementById('take-photo').addEventListener('click', () => {
    composer.render();
    renderer.domElement.toBlob(blob => { if (blob) download(blob, 'IRONCLAD-HANGAR.png'); }, 'image/png');
  });
  document.getElementById('export-mech').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    const original = button.textContent;
    button.textContent = '导出中…';
    try {
      download(new Blob([await exportBinary('mech')], { type: 'model/gltf-binary' }), 'IRONCLAD-MECH.glb');
    } catch (error) {
      document.getElementById('scene-notice').textContent = '模型导出失败：' + error.message;
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });
  document.addEventListener('keydown', event => {
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement?.tagName)) return;
    if (event.key.toLowerCase() === 'h') document.getElementById('photo-mode').click();
    if (event.key.toLowerCase() === 'r') resetCamera();
    if (event.key === 'Escape') {
      document.body.classList.remove('photo-mode');
      document.getElementById('photo-mode').setAttribute('aria-pressed', 'false');
    }
  });
  resize();
  if (host.clientWidth < 900) {
    quality = 'balanced';
    document.getElementById('quality-select').value = quality;
  }
  setQuality(quality);
  composer.render();
  loading.hidden = true;
  document.body.classList.add('scene-ready');
  requestAnimationFrame(animate);
  return {
    available: true, update, setBattle, strike, exportBinary,
    beginTraining,
    finishTraining(result) { return training.finishTraining(result); },
    cancelTraining() { return training.cancelTraining(); },
    skipCinematic() { return training.skipCinematic(); },
    resetTraining(reason = 'IDLE') { training.reset(reason); },
    getTrainingState() { return training.getState(); },
    performAttack,
    wait(seconds) { return renderClock.wait(seconds); },
    focusPart(part) { activePart = part; },
    endBattle(result) {
      enemyDown = result === 'VICTORY';
      playerDown = result === 'DEFEAT';
      document.getElementById('stage-status').textContent = result;
      return training.finishTraining(result);
    },
    startBattlefield(parts = currentParts) {
      if (training.getState().active || gameplayMode === 'battlefield') return false;
      gameplayMode = 'battlefield';
      gameplayLoadout = compileLoadout(parts);
      hangarMechSave.position.copy(currentMech.root.position);
      hangarMechSave.quaternion.copy(currentMech.root.quaternion);
      hangarMechSave.scale.copy(currentMech.root.scale);
      battlefield.setActive(true);
      hangar.visible = false;
      currentMech.root.position.copy(battlefield.playerSpawn);
      currentMech.root.position.y = currentParts.legs === 'hover' ? 0.55 : 0.05;
      currentMech.root.rotation.y = 0;
      currentMech.root.rotation.z = 0;
      currentMech.poseRoot.position.set(0, 0, 0);
      currentMech.poseRoot.rotation.set(0, 0, 0);
      playerController.enable();
      playerCamera.reset(); playerCamera.setEnabled(true);
      combatSimulation = createCombatSimulation({ loadout: gameplayLoadout, battlefield, seed: 20260909, onEvent: event => window.dispatchEvent(new CustomEvent('ironclad:combat', { detail: event })) });
      combatSimulation.start('battlefield');
      window.dispatchEvent(new CustomEvent('ironclad:battlefield', { detail: { phase: 'active', snapshot: combatSimulation.getSnapshot() } }));
      return true;
    },
    stopBattlefield(reason = 'retreat') {
      if (gameplayMode !== 'battlefield') return false;
      playerController.clear(); playerController.disable(); playerCamera.setEnabled(false);
      combatSimulation?.stop(); combatSimulation = null; battlefield.reset(); battlefield.setActive(false); hangar.visible = true; gameplayMode = 'hangar';
      currentMech.root.position.copy(hangarMechSave.position);
      currentMech.root.quaternion.copy(hangarMechSave.quaternion);
      currentMech.root.scale.copy(hangarMechSave.scale);
      groundMech(currentMech, currentParts.legs);
      window.dispatchEvent(new CustomEvent('ironclad:battlefield', { detail: { phase: 'return', reason } }));
      resetCamera();
      // Hard-restore the hangar orbit camera immediately instead of relying only on a slow tween.
      controls.target.set(0, 2.73, 0);
      camera.position.set(9.3, 5.9, 13.6);
      camera.fov = 42;
      camera.updateProjectionMatrix();
      controls.update();
      cameraTransition = null;
      return true;
    },
    getBattlefieldSnapshot() { return combatSimulation?.getSnapshot() || null; },
    diagnostics() {
      let meshCount = 0;
      currentMech.root.traverse(object => { if (object.isMesh) meshCount += 1; });
      return { quality, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, meshes: meshCount, assetSource: currentMech.root.userData.configuration?.assetSource || 'procedural fallback', parts: { ...currentParts }, upperOffset: currentMech.upperOffset, size: currentMech.bounds.getSize(new THREE.Vector3()).toArray(), effects: effects.length, camera: camera.position.toArray(), mech: currentMech.root.position.toArray(), gameplayMode, webgl: renderer.getContext().getParameter(renderer.getContext().VERSION) };
    }
  };
}

window.mechCatalog = { partDefinitions, defaultParts, buildPresets, chassisNames };

const pendingCalls = [];
window.mechScene = {
  available: false,
  update(...args) { pendingCalls.push(['update', args]); },
  focusPart(...args) { pendingCalls.push(['focusPart', args]); },
  setBattle(...args) { pendingCalls.push(['setBattle', args]); },
  strike(...args) { pendingCalls.push(['strike', args]); },
  endBattle(...args) { pendingCalls.push(['endBattle', args]); },
  beginTraining(...args) { pendingCalls.push(['beginTraining', args]); },
  finishTraining(...args) { pendingCalls.push(['finishTraining', args]); },
  cancelTraining(...args) { pendingCalls.push(['cancelTraining', args]); },
  skipCinematic(...args) { pendingCalls.push(['skipCinematic', args]); },
  resetTraining(...args) { pendingCalls.push(['resetTraining', args]); },
  performAttack(...args) { pendingCalls.push(['performAttack', args]); },
  wait(...args) { pendingCalls.push(['wait', args]); },
  startBattlefield(...args) { pendingCalls.push(['startBattlefield', args]); },
  stopBattlefield(...args) { pendingCalls.push(['stopBattlefield', args]); },
  getBattlefieldSnapshot(...args) { pendingCalls.push(['getBattlefieldSnapshot', args]); }
};

loadPartLibrary().then(() => {
  const sceneApi = initialize();
  window.mechScene = sceneApi;
  pendingCalls.forEach(([method, args]) => sceneApi[method]?.(...args));
}).catch(error => {
  console.error('3D initialization failed', error);
  loading.hidden = true;
  errorPanel.hidden = false;
  errorPanel.querySelector('p').textContent = '3D asset library failed to load: ' + error.message;
});
