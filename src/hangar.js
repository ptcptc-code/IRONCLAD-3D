import * as THREE from 'three';
import { box, plate, cylinder, ring, cable, label, barBetween, bake, seededRandom } from './assets.js';

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
  parent.add(group);
}

export function createHangar(materials) {
  const group = new THREE.Group();
  group.name = 'HANGAR_09';
  box(group, [44, 0.3, 58], [0, -0.25, -2], materials.floor, 0);
  for (let row = -6; row < 7; row += 1) {
    for (let column = -5; column < 6; column += 1) {
      if (Math.hypot(column * 2.2, row * 2.2) < 4.5) continue;
      box(group, [2.17, 0.025, 2.17], [column * 2.2, -0.083, row * 2.2], (column + row) % 3 ? materials.floor : materials.wall, 0.014);
    }
  }
  cylinder(group, 3.8, 0.26, [0, 0.05, 0], materials.dark, [0, 0, 0], 96);
  cylinder(group, 3.54, 0.16, [0, 0.22, 0], materials.floor, [0, 0, 0], 96);
  ring(group, 3.6, 0.04, [0, 0.28, 0], materials.cyan, [Math.PI / 2, 0, 0]);
  ring(group, 3.83, 0.05, [0, 0.14, 0], materials.steel, [Math.PI / 2, 0, 0]);
  ring(group, 3.1, 0.011, [0, 0.31, 0], materials.steel, [Math.PI / 2, 0, 0]);
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
  box(group, [22, 11, 0.65], [0, 5.4, -14.7], materials.wall);
  plate(group, [9.2, 8.3, 0.36], [0, 4.1, -14.2], materials.dark, 0.9);
  for (const side of [-1, 1]) {
    plate(group, [4.31, 7.65, 0.2], [side * 2.22, 3.85, -13.96], materials.floor, 0.4);
    box(group, [0.06, 6.5, 0.08], [side * 4.36, 3.8, -13.71], materials.amber);
    box(group, [0.05, 7.13, 0.08], [side * 0.11, 3.75, -13.76], materials.cyan);
    for (let index = 0; index < 5; index += 1) {
      box(group, [3.7, 0.07, 0.06], [side * 2.22, 0.85 + index * 1.32, -13.8], materials.steel);
    }
  }
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
  return bake(group);
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
