import * as THREE from 'three';
import { box, plate, cylinder, ring, cable, label, barBetween, bake, seededRandom } from './assets.js';
import { createArena } from './arena.js';

const PAD_RADIUS = 3;
const RAMP_RADIUS = 5.3;
const PAD_HEIGHT = 0.30;
const GROUND_HEIGHT = -0.07;

function groundHeight(x, z) {
  const t = THREE.MathUtils.clamp((Math.hypot(x, z) - PAD_RADIUS) / (RAMP_RADIUS - PAD_RADIUS), 0, 1);
  return THREE.MathUtils.lerp(PAD_HEIGHT, GROUND_HEIGHT, t * t * (3 - 2 * t));
}

function scopedLamp(material, name) {
  const copy = material.clone();
  copy.name = name;
  copy.userData.disposeOnModel = true;
  return copy;
}

function staticRegion(parent, name) {
  const region = new THREE.Group();
  region.name = name;
  parent.add(region);
  return region;
}

function finishRegion(region) {
  const owned = new Set();
  region.traverse(object => {
    if (object.isMesh && object.userData.ownedGeometry && !object.material.transparent) owned.add(object.geometry);
  });
  bake(region);
  owned.forEach(geometry => geometry.dispose());
  region.traverse(object => {
    if (object.isMesh) {
      object.geometry.computeBoundingBox();
      object.geometry.computeBoundingSphere();
    }
  });
  return region;
}

function createPadRamp(parent, materials) {
  // A real smooth annular apron: the entire departure lane, not a hidden step.
  const segments = 128;
  const rows = 32;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let row = 0; row <= rows; row += 1) {
    const radius = THREE.MathUtils.lerp(PAD_RADIUS, RAMP_RADIUS, row / rows);
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = segment / segments * Math.PI * 2;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      positions.push(x, groundHeight(x, z), z);
      uvs.push(x / 4, z / 4);
      if (row < rows && segment < segments) {
        const a = row * (segments + 1) + segment;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const ramp = new THREE.Mesh(geometry, materials.floor);
  ramp.name = 'Pad_Smooth_Departure_Ramp';
  ramp.castShadow = true;
  ramp.receiveShadow = true;
  ramp.userData.ownedGeometry = true;
  parent.add(ramp);
  // Dashed caution shoulders follow exactly the same height profile.
  for (const side of [-1, 1]) {
    for (let index = 0; index < 12; index += 1) {
      const x = side * 2.9;
      const z = -1.4 - index * 0.34;
      const slope = (groundHeight(x, z + 0.03) - groundHeight(x, z - 0.03)) / 0.06;
      box(parent, [0.2, 0.012, 0.22], [x, groundHeight(x, z) + 0.01, z], index % 3 ? materials.caution : materials.ivory, 0, [-Math.atan(slope), 0, 0]);
    }
  }
}

function crate(parent, materials, position, scale = 1) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.scale.setScalar(scale);
  box(group, [1.3, 0.92, 0.94], [0, 0.47, 0], materials.dark, 0.07);
  plate(group, [1.16, 0.72, 0.04], [0, 0.48, 0.49], materials.wall, 0.08);
  for (const side of [-1, 1]) {
    box(group, [0.14, 1.0, 1.04], [side * 0.44, 0.48, 0], materials.steel);
    box(group, [0.21, 0.18, 0.07], [side * 0.44, 0.51, 0.56], materials.bronze);
  }
  box(group, [0.23, 0.035, 0.02], [0, 0.62, 0.53], materials.amber);
  label(group, 'ICL / 09', 0.54, [0, 0.35, 0.53], '#99afb3');
  parent.add(group);
}

function repairArm(parent, materials, side) {
  const group = new THREE.Group();
  group.position.set(side * 3.7, 0.25, -2.6);
  cylinder(group, 0.62, 0.36, [0, 0.18, 0], materials.dark);
  ring(group, 0.57, 0.04, [0, 0.38, 0], materials.amber, [Math.PI / 2, 0, 0]);
  box(group, [0.75, 1.03, 0.75], [0, 0.94, 0], materials.caution, 0.07);
  const joints = [[0, 1.42, 0], [side * 0.63, 2.97, -0.05], [side * -0.66, 4.02, 0.12], [side * -1.34, 3.91, 0.42]];
  joints.forEach((position, index) => {
    cylinder(group, index > 1 ? 0.21 : 0.33, 0.55, position, materials.dark, [Math.PI / 2, 0, 0]);
    cylinder(group, index > 1 ? 0.1 : 0.18, 0.57, position, materials.steel, [Math.PI / 2, 0, 0]);
  });
  for (let index = 0; index < joints.length - 1; index += 1) {
    const start = new THREE.Vector3(...joints[index]);
    const finish = new THREE.Vector3(...joints[index + 1]);
    const beam = box(group, [index ? 0.27 : 0.41, start.distanceTo(finish), 0.34], start.clone().add(finish).multiplyScalar(0.5).toArray(), materials.caution, 0.04);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), finish.sub(start).normalize());
  }
  barBetween(group, [side * 0.16, 1.51, 0.28], [side * 0.93, 2.83, 0.24], 0.07, materials.steel);
  cable(group, [[0, 0.8, -0.42], [side * 0.97, 2.9, -0.45], [side * -0.85, 4.2, -0.21]], 0.07, materials.rubber);
  box(group, [0.15, 0.36, 0.3], [side * -1.41, 3.84, 0.43], materials.steel);
  cylinder(group, 0.11, 0.1, [side * -1.42, 3.84, 0.63], materials.cyan, [Math.PI / 2, 0, 0]);
  label(group, side < 0 ? 'ARM / L' : 'ARM / R', 0.52, [0, 1.02, 0.405], '#151a1d');
  group.name = side < 0 ? 'Repair_Arm_L' : 'Repair_Arm_R';
  parent.add(group);
  finishRegion(group);
  return group;
}

function addHangarDetail(group, corridor, materials) {
  const walls = staticRegion(group, 'Bay_Wall_Panels_Static');
  const trusses = staticRegion(group, 'Ceiling_Trusses_Static');
  const floor = staticRegion(group, 'Floor_Seams_Decals_Static');
  const rails = staticRegion(group, 'Door_Rails_Detail_Static');
  for (const side of [-1, 1]) {
    for (let depth = -17; depth <= 13; depth += 5) {
      box(walls, [0.16, 9.2, 3.7], [side * 10.43, 5.5, depth], materials.steel, 0.03);
      box(walls, [0.08, 7.9, 3.15], [side * 10.52, 5.5, depth], materials.wall, 0.02);
      for (let y = 2.1; y < 9; y += 1.7) box(walls, [0.05, 0.06, 3.05], [side * 10.58, y, depth], materials.caution, 0);
    }
    for (let depth = -18; depth <= 12; depth += 6) {
      barBetween(trusses, [side * 9.7, 10.65, depth], [side * 3.9, 10.65, depth], 0.1, materials.steel);
      barBetween(trusses, [side * 9.4, 10.65, depth], [side * 7.6, 9.75, depth], 0.07, materials.dark);
      barBetween(trusses, [side * 7.6, 9.75, depth], [side * 5.8, 10.65, depth], 0.07, materials.dark);
    }
    box(floor, [0.035, 0.018, 25], [side * 4.8, -0.01, -1], materials.cyan, 0);
    for (let depth = -7; depth <= 7; depth += 2) box(floor, [3.5, 0.018, 0.035], [side * 7.6, 0.005, depth], materials.steel, 0);
  }
  for (const z of [-13.95, -13.55]) {
    box(rails, [20.4, 0.11, 0.12], [0, 9.22, z], materials.steel, 0);
    box(rails, [20.0, 0.035, 0.06], [0, 9.29, z], materials.cyan, 0);
  }
  for (const z of [-10, -6, -2, 2, 6]) {
    box(corridor, [0.22, 0.035, 1.4], [-4.95, 0.025, z], materials.amber, 0);
    box(corridor, [0.22, 0.035, 1.4], [4.95, 0.025, z], materials.amber, 0);
  }
  finishRegion(walls); finishRegion(trusses); finishRegion(floor); finishRegion(rails); finishRegion(corridor);
}

function createDoors(parent, frame, materials) {
  const leaves = [];
  const indicator = scopedLamp(materials.cyan, 'Door_Status_Independent');
  const warning = scopedLamp(materials.amber, 'Door_Warning_Independent');
  for (const side of [-1, 1]) {
    box(frame, [0.4, 8.6, 0.9], [side * 5, 4.2, -14.7], materials.steel);
    box(frame, [0.12, 8.3, 0.08], [side * 4.88, 4.15, -14.20], indicator, 0);
    box(frame, [0.7, 0.22, 0.7], [side * 5.4, 8.75, -14.1], materials.dark);
    cylinder(frame, 0.14, 0.26, [side * 5.4, 8.98, -14.1], warning, [0, 0, 0], 12);
    const leaf = staticRegion(parent, side < 0 ? 'Sliding_Door_L' : 'Sliding_Door_R');
    leaf.position.set(side * 2.475, 0, -13.76);
    box(leaf, [4.95, 8.56, 0.56], [0, 4.21, 0], materials.dark, 0.05);
    for (const face of [-1, 1]) {
      plate(leaf, [4.48, 7.82, 0.08], [0, 4.22, face * 0.315], materials.floor, 0.25);
      for (let index = 0; index < 5; index += 1) {
        box(leaf, [4.3, 0.12, 0.09], [0, 0.85 + index * 1.58, face * 0.39], materials.steel);
      }
      box(leaf, [0.07, 7.85, 0.04], [-side * 2.36, 4.22, face * 0.4], indicator, 0);
      box(leaf, [0.18, 7.9, 0.08], [side * 2.25, 4.22, face * 0.39], materials.caution);
      box(leaf, [2.6, 0.42, 0.09], [0, 1.38, face * 0.4], materials.caution);
      for (let index = 0; index < 5; index += 1) {
        box(leaf, [0.12, 0.38, 0.025], [-1 + index * 0.5, 1.38, face * 0.46], materials.dark, 0, [0, 0, -0.45]);
      }
    }
    for (const x of [-1.65, 1.65]) {
      box(leaf, [0.16, 0.3, 0.2], [x, 8.54, 0], materials.steel);
      cylinder(leaf, 0.13, 0.18, [x, 8.72, 0], materials.dark, [Math.PI / 2, 0, 0], 12);
    }
    leaves.push(finishRegion(leaf));
  }
  box(frame, [21.4, 0.36, 0.82], [0, 8.97, -13.8], materials.dark);
  box(frame, [21.1, 0.1, 0.12], [0, 8.78, -13.8], materials.steel);
  box(frame, [21, 0.04, 0.22], [0, -0.09, -13.76], materials.steel, 0);
  let openAmount = 0;
  function setOpenAmount(amount) {
    openAmount = THREE.MathUtils.clamp(Number.isFinite(amount) ? amount : 0, 0, 1);
    leaves.forEach((leaf, index) => {
      leaf.position.x = (index ? 1 : -1) * (2.475 + openAmount * 5.1);
    });
    const moving = openAmount > 0.001 && openAmount < 0.999;
    warning.emissiveIntensity = moving ? 3.8 : 0.45;
    indicator.emissiveIntensity = openAmount > 0.98 ? 2.3 : 0.9;
  }
  setOpenAmount(0);
  return { setOpenAmount, get openAmount() { return openAmount; }, clearance: { halfWidth: 4.8, height: 8.5, z: -14.7 } };
}

export function createHangar(materials) {
  const root = new THREE.Group();
  root.name = 'HANGAR_09';
  // Only this static bay is baked. Sliding leaves, repair rigs and yard stay independent.
  const group = staticRegion(root, 'Hangar_Bay_Static');
  const corridor = staticRegion(root, 'Launch_Corridor_Static');
  // Keep the playable lane clear: no old bay-side walls or crates are placed on x=0, z<-8.
  corridor.userData.clearLane = { minX: -5.2, maxX: 5.2, minZ: -27, maxZ: -8 };
  const arena = createArena(materials);
  root.add(arena.group);
  const doorFrame = staticRegion(root, 'Launch_Gate_Frame');
  const doorRig = createDoors(root, doorFrame, materials);
  const repairRig = { arms: [-1, 1].map(side => root.getObjectByName(side < 0 ? 'Repair_Arm_L' : 'Repair_Arm_R')), setRetracted(amount) { this.arms.forEach((arm, index) => { if (arm) arm.position.x = (index ? 1 : -1) * (3.7 + THREE.MathUtils.clamp(amount, 0, 1) * 1.65); }); } };
  box(group, [44, 0.3, 58], [0, -0.25, -2], materials.floor, 0);
  for (let row = -6; row < 7; row += 1) {
    for (let column = -5; column < 6; column += 1) {
      if (Math.hypot(column * 2.2, row * 2.2) < 4.5) continue;
      box(group, [2.17, 0.025, 2.17], [column * 2.2, -0.083, row * 2.2], (column + row) % 3 ? materials.floor : materials.wall, 0.014);
    }
  }
  cylinder(group, 3.8, 0.26, [0, 0.05, 0], materials.dark, [0, 0, 0], 96);
  cylinder(group, PAD_RADIUS, 0.16, [0, 0.22, 0], materials.floor, [0, 0, 0], 128);
  createPadRamp(group, materials);
  ring(group, 3.6, 0.014, [0, groundHeight(3.6, 0) + 0.012, 0], materials.cyan, [Math.PI / 2, 0, 0]);
  ring(group, 5.3, 0.015, [0, GROUND_HEIGHT, 0], materials.steel, [Math.PI / 2, 0, 0]);
  ring(group, 3.1, 0.009, [0, groundHeight(3.1, 0) + 0.01, 0], materials.steel, [Math.PI / 2, 0, 0]);
  for (let index = 0; index < 32; index += 1) {
    const angle = index / 32 * Math.PI * 2;
    box(group, [0.2, 0.018, 0.4], [Math.sin(angle) * 3.3, 0.316, Math.cos(angle) * 3.3], index % 4 ? materials.caution : materials.ivory, 0.005, [0, angle - 0.25, 0]);
  }
  for (const side of [-1, 1]) {
    box(group, [0.055, 0.02, 24], [side * 5.2, -0.05, 0], materials.caution, 0);
    box(group, [0.03, 0.022, 24], [side * 5.37, -0.05, 0], materials.ivory, 0);
    for (let index = -6; index <= 6; index += 1) {
      box(group, [0.95, 0.05, 1.85], [side * 6.8, -0.025, index * 2], materials.dark);
      for (let slat = 0; slat < 11; slat += 1) {
        box(group, [0.89, 0.025, 0.055], [side * 6.8, 0.01, index * 2 - 0.82 + slat * 0.16], materials.steel, 0);
      }
    }
    box(group, [0.65, 12, 39], [side * 10.8, 5.9, -4], materials.wall, 0.02);
    for (let index = 0; index < 6; index += 1) {
      const depth = -18 + index * 6;
      box(group, [0.7, 8.5, 0.8], [side * 9.8, 4.13, depth], materials.dark);
      box(group, [0.11, 6.6, 0.14], [side * 9.38, 4.15, depth + 0.42], materials.amber);
      const diagonal = box(group, [0.72, 3.4, 0.8], [side * 8.6, 9.13, depth], materials.steel);
      diagonal.rotation.z = side * -0.72;
      box(group, [0.35, 0.42, 5.3], [side * 10.19, 2.35, depth + 2.9], materials.steel);
      plate(group, [0.12, 3.15, 4.4], [side * 10.29, 4.4, depth + 2.9], materials.dark);
      box(group, [0.24, 0.54, 2.4], [side * 10.07, 6.7, depth + 2.9], materials.white);
    }
    for (let pipeIndex = 0; pipeIndex < 3; pipeIndex += 1) {
      cylinder(group, 0.12 + pipeIndex * 0.03, 36, [side * 10.25, 7.2 + pipeIndex * 0.39, -3], pipeIndex === 1 ? materials.bronze : materials.steel, [Math.PI / 2, 0, 0]);
    }
    repairArm(group, materials, side);
  }
  for (let index = 0; index < 6; index += 1) {
    const depth = -18 + index * 6;
    box(group, [16, 0.62, 0.8], [0, 10.37, depth], materials.dark);
    for (const side of [-1, 1]) {
      box(group, [0.46, 0.09, 3.3], [side * 4.5, 9.96, depth + 2.7], materials.white);
    }
  }
  box(group, [23, 0.3, 42], [0, 11.1, -5], materials.dark);
  // A flush bulkhead cap remains above the opening; the opening itself is never filled.
  box(doorFrame, [10.0, 0.42, 0.82], [0, 9.78, -14.7], materials.dark);
  // The rear wall is split around the 9.2m x 8.3m clear opening.
  box(group, [6.0, 11, 0.65], [-8.0, 5.4, -14.7], materials.wall);
  box(group, [6.0, 11, 0.65], [8.0, 5.4, -14.7], materials.wall);
  box(group, [10.0, 2.7, 0.65], [0, 9.65, -14.7], materials.wall);
  // Door leaves, rails and warning strips are supplied by createDoors().
  // Do not add the former decorative plates here: they visually read as a second closed gate.
  label(group, '09', 7, [6.9, 6.15, -14.32], '#c4c9bc');
  label(group, 'SECTOR / 09', 6.6, [0, 9.27, -14.3], '#d4ded9');
  label(group, 'AUTHORIZED PERSONNEL ONLY', 5.3, [0, 8.58, -14.3], '#788b8c');
  label(group, 'IRONCLAD', 5.2, [-6.9, 6.2, -14.31], '#a9b7ae');
  label(group, 'ASSEMBLY DIVISION', 5.2, [-6.9, 5.52, -14.31], '#798a83');
  label(group, 'KEEP CLEAR', 2.8, [0, 0.324, 2.39], '#a9ac90', [-Math.PI / 2, 0, 0]);
  label(group, 'BAY 09', 2.5, [-3.8, -0.04, 5.8], '#899b9c', [-Math.PI / 2, 0, 0]);
  crate(group, materials, [-5.7, 0, -4.2], 1.2);
  crate(group, materials, [-7.1, 0, -4.8], 1.05);
  crate(group, materials, [-5.8, 1.16, -4.3], 0.82);
  crate(group, materials, [6.1, 0, -6.1], 1.3);
  crate(group, materials, [7.6, 0, -6.4], 0.9);
  for (const depth of [-9, -5]) {
    cylinder(group, 0.48, 2.2, [7.8, 1.1, depth], materials.steel);
    ring(group, 0.48, 0.055, [7.8, 1.85, depth], materials.bronze, [Math.PI / 2, 0, 0]);
    ring(group, 0.48, 0.055, [7.8, 0.35, depth], materials.bronze, [Math.PI / 2, 0, 0]);
  }
  box(group, [1.38, 0.8, 0.7], [-4.6, 1.43, 0.4], materials.dark, 0.05, [-0.27, 0, 0]);
  box(group, [1.17, 0.53, 0.025], [-4.6, 1.5, 0.81], materials.glass);
  box(group, [0.45, 1.2, 0.4], [-4.6, 0.55, 0.35], materials.steel);
  label(group, 'SYSTEM ONLINE', 0.99, [-4.6, 1.64, 0.833], '#61d7e2');
  for (let index = 0; index < 8; index += 1) {
    box(group, [0.045, 0.07 + (index % 3) * 0.043, 0.01], [-4.98 + index * 0.1, 1.45, 0.837], materials.cyan, 0);
  }
  cable(group, [[-4.6, 0.1, 0.2], [-4.1, 0.04, 1.8], [-2.9, 0.05, 2.3], [-2.2, 0.08, 1.6]], 0.05, materials.rubber);
  cable(group, [[5.7, 0.1, -6], [4.4, 0.05, -4.7], [4, 0.05, -2.4]], 0.07, materials.rubber);
  addHangarDetail(group, corridor, materials);
  finishRegion(group);
  finishRegion(corridor);
  return { group: root, doorRig, arena, repairRig, getGroundHeight: groundHeight, bounds: arena.bounds };
}


export function createLightShafts() {
  const group = new THREE.Group();
  group.name = 'Light_Shafts';
  const configurations = [
    { start: [-4.5, 8.3, -5], end: [-1.5, 0.2, -1.5], color: '#ffc886', radius: 2.1 },
    { start: [4.5, 9.9, -2.8], end: [2.4, 0.2, 1], color: '#9bdcff', radius: 1.9 }
  ];
  for (const configuration of configurations) {
    const start = new THREE.Vector3(...configuration.start);
    const end = new THREE.Vector3(...configuration.end);
    const direction = start.clone().sub(end);
    const geometry = new THREE.ConeGeometry(configuration.radius, direction.length(), 40, 1, true);
    const material = new THREE.ShaderMaterial({
      uniforms: { beamColor: { value: new THREE.Color(configuration.color) } },
      vertexShader: 'varying vec2 beamUv; varying vec3 beamNormal; varying vec3 beamPosition; void main() { beamUv = uv; beamNormal = normalize(mat3(modelMatrix) * normal); vec4 worldPosition = modelMatrix * vec4(position, 1.0); beamPosition = worldPosition.xyz; gl_Position = projectionMatrix * viewMatrix * worldPosition; }',
      fragmentShader: 'uniform vec3 beamColor; varying vec2 beamUv; varying vec3 beamNormal; varying vec3 beamPosition; void main() { vec3 viewDirection = normalize(cameraPosition - beamPosition); float facing = pow(abs(dot(normalize(beamNormal), viewDirection)), 2.0); float fade = smoothstep(0.0, 0.25, beamUv.y) * (1.0 - smoothstep(0.85, 1.0, beamUv.y)); gl_FragColor = vec4(beamColor, facing * fade * 0.085); }',
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
    });
    const object = new THREE.Mesh(geometry, material);
    object.position.copy(start.clone().add(end).multiplyScalar(0.5));
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.add(object);
  }
  return group;
}

export function createDust() {
  const random = seededRandom(931);
  const positions = new Float32Array(420 * 3);
  for (let index = 0; index < positions.length; index += 3) {
    positions[index] = (random() - 0.5) * 24;
    positions[index + 1] = random() * 11;
    positions[index + 2] = (random() - 0.5) * 25;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: '#94b7c0', size: 0.023, transparent: true, opacity: 0.33, depthWrite: false, sizeAttenuation: true });
  return new THREE.Points(geometry, material);
}
