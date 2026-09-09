import * as THREE from 'three';
import { box, cylinder, ring } from './assets.js';

const MAX_ENEMIES = 32;
const MAX_EFFECTS = 48;
const v3 = new THREE.Vector3();
const geometryCache = new Map();
const getGeometry = (key, factory) => {
  if (!geometryCache.has(key)) geometryCache.set(key, factory());
  return geometryCache.get(key);
};
const positionOf = value => value?.position || value || {};

function makeEnemy(root, type, materials) {
  const palette = type === 'heavy' ? materials.amber : type === 'ranged' ? materials.cyan : materials.red;
  const group = new THREE.Group();
  group.name = 'GameplayEnemy_' + type;
  const bodySize = type === 'heavy' ? [1.45, 1.2, 1.15] : type === 'ranged' ? [1.05, 1.35, 0.9] : [1.2, 1.05, 1];
  const body = new THREE.Mesh(getGeometry('enemy-body-' + type, () => new THREE.BoxGeometry(...bodySize)), materials.dark);
  body.position.y = type === 'heavy' ? 1.25 : 1.05;
  group.add(body);
  const head = new THREE.Mesh(getGeometry('enemy-head-' + type, () => new THREE.BoxGeometry(type === 'heavy' ? .8 : .62, .42, .62)), materials.ivory);
  head.position.y = type === 'heavy' ? 2.05 : 1.82;
  group.add(head);
  if (type === 'heavy') {
    const shoulder = new THREE.Mesh(getGeometry('enemy-shoulder', () => new THREE.BoxGeometry(1.9, .35, 1.25)), materials.steel);
    shoulder.position.y = 1.75; group.add(shoulder);
  } else if (type === 'ranged') {
    const antenna = new THREE.Mesh(getGeometry('enemy-antenna', () => new THREE.CylinderGeometry(.07, .07, .9, 8)), palette);
    antenna.position.set(0, 2.45, 0); group.add(antenna);
  } else {
    const blade = new THREE.Mesh(getGeometry('enemy-blade', () => new THREE.BoxGeometry(.12, .8, .42)), palette);
    blade.position.set(.78, 1.2, .15); blade.rotation.z = -.35; group.add(blade);
  }
  const accent = new THREE.Mesh(getGeometry('enemy-accent', () => new THREE.BoxGeometry(.22, .22, .08)), palette);
  accent.position.set(0, 1.35, bodySize[2] / 2 + .045); group.add(accent);
  root.add(group);
  return { root: group, type };
}

function makeBeacon(parent, position, materials, name, material) {
  const group = new THREE.Group(); group.name = name; group.position.set(position.x || 0, position.y || 0, position.z || 0);
  cylinder(group, .22, 2.6, [0, 1.3, 0], materials.steel, [0, 0, 0], 12);
  ring(group, 1.8, .07, [0, .08, 0], material, [Math.PI / 2, 0, 0]);
  const light = new THREE.Mesh(getGeometry('beacon-core', () => new THREE.SphereGeometry(.3, 12, 8)), material);
  light.position.y = 2.65; group.add(light); parent.add(group);
  return { group, ring: group.children[1], light };
}

export function createGameplayActors(scene, materials, battlefield = {}) {
  const root = new THREE.Group(); root.name = 'Gameplay_Actors'; scene.add(root);
  const enemyPool = [];
  const enemies = new Map();
  const effects = [];
  const beacons = [];
  const objectives = battlefield.objectives || [];
  objectives.forEach((objective, index) => {
    const p = positionOf(objective.center || objective.position);
    beacons.push({ data: objective, ...makeBeacon(root, p, materials, 'ObjectiveBeacon_' + (objective.id || index), materials[objective.color] || materials.cyan) });
  });
  const extractionPosition = battlefield.extraction || battlefield.extractionPosition;
  if (extractionPosition) beacons.push({ extraction: true, ...makeBeacon(root, positionOf(extractionPosition), materials, 'ExtractionBeacon', materials.amber) });

  function acquire(type) {
    let item = enemyPool.find(candidate => !candidate.used);
    if (!item && enemyPool.length < MAX_ENEMIES) {
      item = makeEnemy(root, type, materials); enemyPool.push(item);
    }
    if (!item) return null;
    item.used = true; item.type = type; item.root.visible = true; return item;
  }
  function spawnEffect(event) {
    if (effects.length >= MAX_EFFECTS) return;
    const start = positionOf(event.start || event.origin || event.from);
    const end = positionOf(event.end || event.targetPosition || event.to);
    const a = new THREE.Vector3(start.x || 0, start.y || 0.8, start.z || 0);
    const b = new THREE.Vector3(end.x || a.x, end.y || a.y, end.z || a.z);
    const material = (event.type === 'damage' ? materials.red : materials.amber).clone();
    material.transparent = true; material.depthWrite = false; material.emissiveIntensity = 4;
    const mesh = new THREE.Mesh(getGeometry('tracer', () => new THREE.CylinderGeometry(.035, .035, 1, 6)), material);
    mesh.position.copy(a).lerp(b, .5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    mesh.scale.y = a.distanceTo(b); root.add(mesh); effects.push({ mesh, age: 0, life: event.life || .18 });
  }
  function update(snapshot, delta = 0) {
    const listed = snapshot?.enemies || [];
    enemyPool.forEach(item => { item.used = false; item.root.visible = false; });
    listed.slice(0, MAX_ENEMIES).forEach(enemy => {
      const item = enemies.get(enemy.id) || acquire(enemy.type || 'assault'); if (!item) return;
      enemies.set(enemy.id, item); item.used = true; item.root.visible = !!enemy.alive;
      const p = positionOf(enemy); item.root.position.set(p.x || 0, p.y || 0, p.z || 0); item.root.rotation.y = enemy.rotation ?? item.root.rotation.y;
    });
    const objective = snapshot?.objective || {};
    beacons.forEach(beacon => {
      if (beacon.extraction) beacon.group.visible = !!objective.extractionUnlocked;
      else { const state = objective.state || objective.objective; beacon.group.visible = true; beacon.ring.material.opacity = state === 'captured' ? .35 : 1; beacon.group.scale.setScalar(1 + (beacon.data.progress || objective.capture || 0) * .12); }
    });
    (snapshot?.events || snapshot?.eventQueue || snapshot?.eventsQueue || []).forEach(spawnEffect);
    for (let i = effects.length - 1; i >= 0; i--) { const effect = effects[i]; effect.age += delta; effect.mesh.material.opacity = Math.max(0, 1 - effect.age / effect.life); if (effect.age >= effect.life) { effect.mesh.removeFromParent(); effect.mesh.material.dispose(); effects.splice(i, 1); } }
  }
  function clear() { enemies.clear(); enemyPool.forEach(item => { item.used = false; item.root.visible = false; }); effects.forEach(effect => { effect.mesh.removeFromParent(); effect.mesh.material.dispose(); }); effects.length = 0; }
  function dispose() { clear(); root.removeFromParent(); beacons.forEach(beacon => beacon.group.traverse(object => { if (object.geometry && !geometryCacheHas(object.geometry)) return; })); }
  return { root, update, clear, dispose };
}
function geometryCacheHas() { return true; }
