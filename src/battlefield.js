import * as THREE from 'three';
import { box, cylinder, ring, label, plate, bolt, barBetween } from './assets.js';

const ZONE_LAYOUT = [
  { id: 'A', name: 'RADAR', type: 'radar', position: [-48, 0, -22], size: [24, 20], color: 'cyan' },
  { id: 'B', name: 'REACTOR', type: 'reactor', position: [8, 0, -36], size: [28, 24], color: 'amber' },
  { id: 'C', name: 'ARTILLERY', type: 'artillery', position: [52, 0, 4], size: [26, 22], color: 'red' }
];

function descriptor(id, kind, position, size, extra = {}) {
  return { id, kind, position: new THREE.Vector3(position[0], position[1] || 0, position[2]), size: new THREE.Vector3(size[0], size[1] || 0, size[2]), ...extra };
}

export function createBattlefield(materials) {
  const group = new THREE.Group(); group.name = 'IRONCLAD_BATTLEFIELD_180x140';
  const terrain = new THREE.Group(); terrain.name = 'Battlefield_Terrain'; group.add(terrain);
  const structures = new THREE.Group(); structures.name = 'Battlefield_Structures'; group.add(structures);
  const collisionGroup = new THREE.Group(); collisionGroup.name = 'Battlefield_Collision'; collisionGroup.visible = false; group.add(collisionGroup);
  const activeObjects = [];
  const lights = [];
  const colliders = [];
  const addCollider = (id, position, size, rotation = 0) => {
    const item = descriptor(id, 'box', position, size, { rotation });
    colliders.push(item);
    const mesh = box(collisionGroup, size, position, materials.black);
    mesh.visible = false; mesh.userData.collision = item;
    mesh.rotation.y = rotation;
    return item;
  };
  const addActive = object => { activeObjects.push(object); return object; };
  const detail = (parent, x, y, z, w, h, d, material = materials.steel, accent = materials.cyan) => {
    const module = new THREE.Group(); module.position.set(x, y, z); parent.add(module);
    box(module, [w, h, d], [0, 0, 0], material, 0.08);
    plate(module, [w * 0.72, h * 0.62, 0.035], [0, 0, d / 2 + 0.02], accent, 0.04, [0, 0, 0]);
    for (const sx of [-w * 0.34, w * 0.34]) for (const sy of [-h * 0.28, h * 0.28]) bolt(module, [sx, sy, d / 2 + 0.045], materials.black);
    return module;
  };
  const pipeBridge = (x, z, length, height, material = materials.steel) => {
    const bridge = new THREE.Group(); bridge.position.set(x, 0, z); structures.add(bridge);
    for (const y of [height - 1.2, height, height + 1.2]) {
      barBetween(bridge, [-length / 2, y, -2.2], [length / 2, y, -2.2], 0.18, material);
      barBetween(bridge, [-length / 2, y, 2.2], [length / 2, y, 2.2], 0.18, material);
    }
    for (const px of [-length / 2, length / 2]) { barBetween(bridge, [px, 0.3, -2.2], [px, height, -2.2], 0.14, material); barBetween(bridge, [px, 0.3, 2.2], [px, height, 2.2], 0.14, material); }
    return bridge;
  };

  // Ground and open south entrance. The main route remains broad and unobstructed.
  box(terrain, [180, 0.35, 140], [0, -0.18, 0], materials.floor);
  box(terrain, [10, 0.08, 126], [0, 0.03, 0], materials.dark);
  box(terrain, [0.18, 0.04, 126], [-4.3, 0.09, 0], materials.cyan);
  box(terrain, [0.18, 0.04, 126], [4.3, 0.09, 0], materials.cyan);
  for (let z = -60; z <= 58; z += 8) box(terrain, [166, 0.045, 0.11], [0, 0.06, z], materials.steel);

  // Industrial road and alternate lanes.
  box(terrain, [34, 0.12, 116], [0, 0.09, -3], materials.wall);
  box(terrain, [8, 0.16, 116], [0, 0.18, -3], materials.dark);
  for (const x of [-4.2, 4.2]) box(terrain, [0.14, 0.035, 114], [x, 0.29, -3], materials.caution);
  for (const x of [-62, 62]) {
    box(terrain, [12, 0.12, 90], [x, 0.1, -4], materials.wall);
    box(terrain, [7, 0.16, 90], [x, 0.2, -4], materials.dark);
    box(terrain, [0.14, 0.035, 88], [x, 0.31, -4], materials.cyan);
  }
  // Cross connectors create tactical alternate routes without a maze.
  for (const z of [-42, 18, 54]) box(terrain, [132, 0.1, 7], [0, 0.1, z], materials.dark);

  const coverLayout = [
    [-74, 2, -48, 12, 4, 5, 0], [-75, 2, 22, 10, 4, 5, 0.25],
    [-30, 1.8, 28, 8, 3.6, 6, -0.2], [30, 2, 28, 12, 4, 5, 0.18],
    [74, 2, -42, 10, 4, 6, -0.2], [70, 1.5, 45, 8, 3, 5, 0.35],
    [-30, 1.6, -48, 7, 3.2, 4, 0], [30, 1.7, -8, 8, 3.4, 4, 0]
  ];
  coverLayout.forEach(([x, y, z, w, h, d, r], index) => {
    box(structures, [w, h, d], [x, y, z], index % 2 ? materials.dark : materials.steel, 0.15, [0, r, 0]);
    addCollider('cover-' + index, [x, y, z], [w, h, d], r);
  });

  // Midfield industrial language: modular warehouses, elevated frames, ramps and service conduits.
  for (const [x, z, w, d, r] of [[-34, -4, 15, 9, 0], [34, 12, 15, 9, 0], [-68, 34, 12, 8, 0.12], [67, -20, 13, 8, -0.12]]) {
    const module = detail(structures, x, 3.2, z, w, 6.4, d, materials.wall, materials.cyan); module.rotation.y = r;
    box(module, [w * 0.8, 0.18, d + 0.12], [0, 2.5, 0], materials.caution);
    addCollider('warehouse-' + x + '-' + z, [x, 3.2, z], [w, 6.4, d], r);
  }
  for (const [x, z] of [[-18, -31], [22, 2], [58, 30]]) pipeBridge(x, z, 22, 8);
  for (const [x, z, r] of [[-56, 10, 0], [50, -47, 0.2]]) {
    const frame = new THREE.Group(); frame.position.set(x, 0, z); structures.add(frame);
    for (const px of [-5, 5]) { barBetween(frame, [px, 0, -3], [px, 8, -3], 0.22, materials.steel); barBetween(frame, [px, 0, 3], [px, 8, 3], 0.22, materials.steel); }
    box(frame, [12, 0.35, 7], [0, 8, 0], materials.dark); frame.rotation.y = r;
  }
  for (const [x, z, rot] of [[-12, 42, 0.08], [18, 40, -0.08]]) {
    const ramp = box(structures, [18, 0.7, 5], [x, 1.2, z], materials.steel, 0.08, [0, rot, 0]);
    box(structures, [16, 0.06, 0.18], [x, 1.65, z - 2.35], materials.caution, 0.01, [0, rot, 0]);
  }
  // Objective facilities share this authored layout with objective and collision descriptors.
  const objectives = ZONE_LAYOUT.map(zone => {
    const [x, , z] = zone.position; const [w, d] = zone.size;
    const root = new THREE.Group(); root.name = 'Objective_' + zone.id + '_' + zone.name; root.position.set(x, 0, z);
    const accent = materials[zone.color];
    box(root, [w, 0.16, d], [0, 0.12, 0], materials.dark, 0.12);
    box(root, [w - 2, 0.05, d - 2], [0, 0.23, 0], accent);
    ring(root, Math.min(w, d) * 0.28, 0.1, [0, 0.31, 0], accent);
    label(root, zone.id + '  ' + zone.name, Math.min(w * 0.66, 13), [0, 0.42, -d * 0.38], zone.color === 'red' ? '#ff806b' : zone.color === 'amber' ? '#ffe2a0' : '#71e9ef');
    if (zone.type === 'radar') { cylinder(root, 2.3, 7, [0, 3.5, 0], materials.steel); ring(root, 4.6, 0.16, [0, 5.8, 0], accent, [Math.PI / 2, 0, 0]); for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) box(root, [0.22, 4.5, 0.22], [Math.cos(a) * 3.6, 2.4, Math.sin(a) * 3.6], accent); }
    if (zone.type === 'reactor') { cylinder(root, 3.2, 5.4, [0, 2.7, 0], materials.dark); ring(root, 3.5, 0.3, [0, 2.8, 0], accent); ring(root, 2.5, 0.16, [0, 5.3, 0], accent); }
    if (zone.type === 'artillery') { box(root, [5.5, 2.2, 8], [0, 1.2, 0], materials.steel, 0.2); cylinder(root, 0.7, 11, [0, 3.1, 0], materials.dark, [Math.PI / 2, 0, 0]); box(root, [7, 0.22, 10], [0, 5.9, 0], accent, 0.04); }
    group.add(root); addActive(root);
    const item = descriptor(zone.id, 'objective', [x, 0, z], [w, 0, d], { name: zone.name, type: zone.type, state: 'inactive', progress: 0, active: false, color: zone.color });
    item.group = root; item.center = new THREE.Vector3(x, 0, z);
    addCollider('objective-' + zone.id, [x, 1.2, z], [w, 2.4, d]);
    return item;
  });

  // Far skyline and track structures keep the horizon legible without blocking play space.
  for (const x of [-82, -58, 58, 82]) {
    box(structures, [7, 18 + (Math.abs(x) % 3) * 3, 5], [x, 10, -61], materials.wall, 0.2);
    box(structures, [9, 0.3, 7], [x, 19, -61], materials.caution);
  }
  for (const x of [-78, -26, 26, 78]) {
    box(structures, [2.2, 1.4, 3.5], [x, 0.8, 62], materials.dark);
    cylinder(structures, 0.22, 9, [x, 5, 62], materials.steel);
    box(structures, [8, 0.22, 0.22], [x, 9.3, 62], materials.cyan);
  }
  // Distant rail megastructure reads as a skyline band, kept behind the playable north edge.
  box(structures, [150, 2.4, 2.2], [0, 20, -67], materials.dark);
  for (const x of [-72, -48, -24, 0, 24, 48, 72]) {
    box(structures, [0.7, 16, 2.8], [x, 10, -67], materials.steel);
    box(structures, [18, 0.28, 0.28], [x, 18, -65.4], materials.cyan);
  }

  // Bounded local illumination.
  for (const [x, z, color] of [[-48, -22, 0x55dce8], [8, -36, 0xffb95e], [52, 4, 0xff6654], [0, 44, 0x5bc8d4]]) {
    const light = new THREE.PointLight(color, 5, 30, 2); light.position.set(x, 7, z); light.castShadow = lights.length < 2; group.add(light); lights.push(light);
  }

  const playerSpawn = new THREE.Vector3(0, 0, 61);
  const extraction = new THREE.Vector3(0, 0, 67);
  const enemySpawns = [new THREE.Vector3(-72, 0, -56), new THREE.Vector3(72, 0, -56), new THREE.Vector3(76, 0, 50), new THREE.Vector3(-76, 0, 50)];
  const bounds = { minX: -90, maxX: 90, minZ: -70, maxZ: 70, width: 180, depth: 140 };
  const snapshot = () => objectives.map(item => ({ id: item.id, name: item.name, type: item.type, state: item.state, progress: item.progress, active: item.active, position: item.center.clone() }));
  const setActive = active => { group.visible = active; activeObjects.forEach(object => { object.visible = active; }); lights.forEach(light => { light.visible = active; }); };
  const reset = () => objectives.forEach(item => { item.state = 'inactive'; item.progress = 0; item.active = false; });
  return {
    group, objectives, playerSpawn, extraction, enemySpawns, collisionGroup, colliders, bounds,
    update(delta, elapsed) { objectives.forEach((item, index) => { item.group.rotation.y = Math.sin(elapsed * 0.35 + index) * 0.018; }); },
    setActive, reset, getGroundHeight: () => 0, getObjectiveSnapshot: snapshot, lights
  };
}
