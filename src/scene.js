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
import { makeMaterials, disposeModel, vector, ring } from './assets.js';
import { createMech } from './mech.js';
import { partDefinitions, defaultParts, buildPresets, chassisNames } from './catalog.js';
import { createHangar, createDust, createLightShafts } from './hangar.js';

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
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 85);
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
  const hangar = createHangar(materials);
  scene.add(hangar);
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
  scene.add(currentMech.root);
  const enemyMaterials = { ...materials, paint: materials.paint.clone(), ivory: materials.ivory.clone(), cyan: materials.cyan.clone() };
  enemyMaterials.paint.color.set('#522c27');
  enemyMaterials.ivory.color.set('#4b5759');
  enemyMaterials.cyan.color.set('#ff8166');
  enemyMaterials.cyan.emissive.set('#ed3e20');
  const enemy = createMech({ chassis: 'raptor', head: 'sensor', arms: 'lancer', legs: 'anchor', weapon: 'arc' }, enemyMaterials);
  enemy.root.position.set(-4.8, -0.06, -2.7);
  enemy.root.scale.setScalar(0.81);
  enemy.root.rotation.y = 0.98;
  enemy.root.visible = false;
  scene.add(enemy.root);
  const targetRing = ring(scene, 1.6, 0.018, [-4.8, 0.06, -2.7], materials.red, [Math.PI / 2, 0, 0]);
  targetRing.visible = false;
  const flash = new THREE.PointLight('#9bdfff', 0, 11, 2);
  scene.add(flash);
  const effects = [];
  let battle = false;
  let elapsed = 0;
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

  function setCamera(position, target) {
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
    const changed = Object.keys(parts).some(key => parts[key] !== currentParts[key]);
    const colorsChanged = JSON.stringify(colors) !== JSON.stringify(currentColors);
    if (changed || colorsChanged) {
      const reframing = parts.legs !== currentParts.legs || parts.backpack !== currentParts.backpack;
      disposeModel(currentMech.root);
      currentParts = { ...parts };
      currentColors = JSON.parse(JSON.stringify(colors));
      currentMech = createMech(currentParts, materials, currentColors);
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
    quality = value;
    const ratios = { cinematic: 1.5, balanced: 1.1, performance: 0.85 };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, ratios[value]));
    composer.setPixelRatio(renderer.getPixelRatio());
    ambientOcclusion.enabled = value === 'cinematic';
    bloom.enabled = value !== 'performance';
    lightShafts.visible = value !== 'performance';
    renderer.shadowMap.enabled = value !== 'performance';
    resize();
    document.getElementById('render-mode').textContent = value === 'cinematic' ? 'PBR / AO / BLOOM' : value === 'balanced' ? 'PBR / BLOOM' : 'PBR / ECO';
  }

  function setBattle(value) {
    battle = value;
    enemyDown = false;
    playerDown = false;
    enemy.root.rotation.z = 0;
    currentMech.root.rotation.z = 0;
    enemy.root.visible = value;
    targetRing.visible = value;
    document.body.classList.toggle('in-battle', value);
    document.getElementById('stage-status').textContent = value ? 'SIMULATION ACTIVE' : 'ASSEMBLY READY';
    if (value) setCamera([-12, 6.8, 12], [-1.6, 2.5, -0.6]);
    else resetCamera();
  }

  function strike(side, weapon) {
    const attacker = side === 'player' ? currentMech : enemy;
    const defender = side === 'player' ? enemy : currentMech;
    scene.updateMatrixWorld(true);
    const start = attacker.muzzle.getWorldPosition(new THREE.Vector3());
    const end = defender.root.localToWorld(new THREE.Vector3(0, 4.05 + defender.upperOffset, 0.35));
    const melee = ['monoblade', 'beamblade'].includes(weapon);
    const color = weapon === 'gatling' || weapon === 'missiles' ? new THREE.Color('#ffc677') : side === 'player' ? materials.cyan.color.clone() : new THREE.Color('#ff553b');
    const curve = weapon === 'arc'
      ? new THREE.CatmullRomCurve3([start, start.clone().lerp(end, 0.32).add(new THREE.Vector3(0.1, 0.37, 0.1)), start.clone().lerp(end, 0.64).add(new THREE.Vector3(-0.14, -0.16, 0)), end])
      : weapon === 'missiles' || melee
        ? new THREE.CatmullRomCurve3([start, start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, weapon === 'missiles' ? 2.4 : 0.9, melee ? 0.7 : 0)), end])
        : new THREE.LineCurve3(start, end);
    const beamGeometry = new THREE.TubeGeometry(curve, weapon === 'arc' || weapon === 'missiles' || melee ? 18 : 1, melee ? 0.13 : 0.027, 6, false);
    const beamMaterial = new THREE.MeshBasicMaterial({ color: color.multiplyScalar(6), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    scene.add(beam);
    effects.push({ object: beam, age: 0, life: 0.28 });
    if (weapon === 'gatling') {
      for (const offset of [-1, 1]) {
        const tracer = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(start.clone().add(new THREE.Vector3(offset * 0.13, 0, 0)), end.clone().add(new THREE.Vector3(offset * 0.1, 0.07, 0))), 1, 0.014, 5, false), beamMaterial.clone());
        scene.add(tracer);
        effects.push({ object: tracer, age: 0, life: 0.16 });
      }
    }
    if (weapon === 'missiles') {
      const rocket = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffeeaa', transparent: true }));
      rocket.position.copy(start);
      scene.add(rocket);
      effects.push({ object: rocket, path: curve, age: 0, life: 0.4 });
    }
    const positions = new Float32Array(45 * 3);
    const velocities = [];
    for (let index = 0; index < 45; index += 1) {
      end.toArray(positions, index * 3);
      velocities.push(new THREE.Vector3((Math.random() - 0.5) * 5, 0.8 + Math.random() * 3.3, (Math.random() - 0.5) * 5));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#ffc174', size: 0.056, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(particles);
    effects.push({ object: particles, velocities, age: 0, life: 0.85 });
    flash.position.copy(end);
    flash.intensity = 180;
    recoil = 0.2;
    recoilSide = side;
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
    if (paused || document.hidden) {
      lastFrame = now;
      return;
    }
    const delta = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    elapsed += delta;
    if (cameraTransition) {
      const factor = 1 - Math.exp(-5 * delta);
      camera.position.lerp(cameraTransition.position, factor);
      controls.target.lerp(cameraTransition.target, factor);
      if (camera.position.distanceTo(cameraTransition.position) < 0.02) cameraTransition = null;
    }
    controls.update(delta);
    const idle = Math.sin(elapsed * 1.4);
    currentMech.root.position.y = 0.23 + (currentParts.legs === 'hover' ? 0.18 + idle * 0.045 : idle * 0.008);
    currentMech.head.rotation.y = Math.sin(elapsed * 0.32) * 0.075;
    currentMech.arms[0].rotation.x = idle * 0.013;
    dust.rotation.y = elapsed * 0.005;
    targetRing.rotation.z = elapsed * 0.35;
    recoil = Math.max(0, recoil - delta);
    const kick = Math.sin(recoil / 0.2 * Math.PI) * 0.16;
    currentMech.weapon.position.z = currentMech.weaponRestZ - (recoilSide === 'player' ? kick : 0);
    enemy.weapon.position.z = enemy.weaponRestZ - (recoilSide === 'enemy' ? kick : 0);
    if (currentMech.rotor) currentMech.rotor.rotation.z += delta * (battle ? 23 : 1.5);
    const targetYaw = battle ? -2.08 : 0;
    currentMech.root.rotation.y = THREE.MathUtils.lerp(currentMech.root.rotation.y, targetYaw, 1 - Math.exp(-3 * delta));
    currentMech.root.rotation.z = THREE.MathUtils.lerp(currentMech.root.rotation.z, playerDown ? -1.12 : 0, 1 - Math.exp(-3 * delta));
    enemy.root.rotation.z = THREE.MathUtils.lerp(enemy.root.rotation.z, enemyDown ? 1.12 : 0, 1 - Math.exp(-3 * delta));
    flash.intensity *= Math.exp(-13 * delta);
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      const effect = effects[index];
      effect.age += delta;
      if (effect.path) effect.object.position.copy(effect.path.getPoint(Math.min(1, effect.age / effect.life)));
      effect.object.material.opacity = Math.max(0, 1 - effect.age / effect.life);
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

  controls.addEventListener('start', () => { cameraTransition = null; });
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
    focusPart(part) { activePart = part; },
    endBattle(result) {
      enemyDown = result === 'VICTORY';
      playerDown = result === 'DEFEAT';
      document.getElementById('stage-status').textContent = result;
    },
    diagnostics() {
      return { quality, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, parts: { ...currentParts }, upperOffset: currentMech.upperOffset, size: currentMech.bounds.getSize(new THREE.Vector3()).toArray(), effects: effects.length, camera: camera.position.toArray(), webgl: renderer.getContext().getParameter(renderer.getContext().VERSION) };
    }
  };
}

window.mechCatalog = { partDefinitions, defaultParts, buildPresets, chassisNames };

try {
  window.mechScene = initialize();
} catch (error) {
  console.error('3D initialization failed', error);
  loading.hidden = true;
  errorPanel.hidden = false;
  window.mechScene = { available: false, update() {}, focusPart() {}, setBattle() {}, strike() {}, endBattle() {} };
}
