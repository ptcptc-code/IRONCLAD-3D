import * as THREE from 'three';
import { box, plate, fin, cylinder, ring, bolt, cable, label, barBetween, bake } from './assets.js';

function joint(parent, position, radius, materials, length = 0.34) {
  cylinder(parent, radius, length, position, materials.dark, [0, 0, Math.PI / 2], 16);
  cylinder(parent, radius * 0.56, length + 0.03, position, materials.steel, [0, 0, Math.PI / 2], 12);
}

function piston(parent, start, finish, width, materials, cap = 0.08) {
  barBetween(parent, start, finish, width, materials.steel);
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...finish);
  const direction = to.sub(from).normalize();
  const center = new THREE.Vector3(...finish);
  cylinder(parent, width * 1.45, cap, center.toArray(), materials.bronze, [0, 0, Math.PI / 2], 12);
  return direction;
}

function nozzle(parent, position, radius, materials, direction = [0, 0, 0]) {
  cylinder(parent, radius, radius * 2.8, position, materials.dark, direction, 16);
  cylinder(parent, radius * 0.68, radius * 2.95, [position[0], position[1], position[2] + 0.03], materials.steel, direction, 12);
  cylinder(parent, radius * 0.42, 0.05, [position[0], position[1], position[2] + 0.13], materials.cyan, direction, 12);
}

export function makeStandardTorso(kind, materials) {
  const group = new THREE.Group();
  group.name = 'Torso_' + kind;
  cylinder(group, 0.38, 0.66, [0, 3.24, 0], materials.dark);
  for (let index = 0; index < 3; index += 1) ring(group, 0.4, 0.045, [0, 3.02 + index * 0.14, 0], materials.steel, [Math.PI / 2, 0, 0]);
  if (kind === 'bulwark') {
    plate(group, [2.3, 1.25, 1.1], [0, 4.03, 0], materials.dark, 0.2);
    plate(group, [1.87, 0.71, 0.12], [0, 4.22, 0.58], materials.ivory, 0.1);
    plate(group, [0.67, 0.62, 0.1], [0, 4.02, 0.66], materials.paint, 0.08);
    box(group, [0.42, 0.08, 0.035], [0, 4.04, 0.72], materials.cyan, 0.008);
    for (const side of [-1, 1]) {
      plate(group, [0.55, 0.94, 0.78], [side * 1.06, 4.28, -0.02], materials.ivory, 0.11, [0, side * 0.18, side * 0.08]);
      plate(group, [0.46, 0.66, 0.85], [side * 0.71, 3.8, 0.45], materials.paint, 0.08, [0.05, side * 0.24, 0]);
      for (let index = 0; index < 4; index += 1) box(group, [0.26, 0.04, 0.05], [side * 0.71, 3.61 + index * 0.1, 0.87], materials.steel, 0);
      bolt(group, [side * 1.12, 4.57, 0.5], materials.steel, 0.05);
      nozzle(group, [side * 1.18, 4.05, -0.62], 0.15, materials);
    }
    plate(group, [1.48, 0.35, 0.92], [0, 3.25, 0.1], materials.paint, 0.08);
    label(group, 'BULWARK / 41', 0.42, [-0.62, 4.43, 0.66]);
  } else if (kind === 'raptor') {
    fin(group, [[-0.7, -0.55], [0.7, -0.55], [0.38, 0.66], [0, 0.91], [-0.38, 0.66]], 0.92, [0, 4.02, 0.04], materials.dark, [0.05, 0, 0]);
    fin(group, [[-0.4, -0.5], [0.4, -0.5], [0.25, 0.5], [0, 0.7], [-0.25, 0.5]], 0.16, [0, 4.07, 0.58], materials.ivory, [0.05, 0, 0]);
    fin(group, [[-0.19, -0.3], [0.19, -0.3], [0.28, 0.29], [0, 0.5], [-0.28, 0.29]], 0.07, [0, 4.04, 0.7], materials.paint);
    box(group, [0.12, 0.46, 0.04], [0, 4.18, 0.78], materials.cyan, 0.008, [0, 0, 0.12]);
    for (const side of [-1, 1]) {
      fin(group, [[0, -0.25], [side * 0.75, 0.31], [side * 0.47, 0.55], [side * 0.12, 0.12]], 0.1, [side * 0.26, 4.28, 0.42], materials.paint, [0, side * 0.2, 0]);
      plate(group, [0.31, 0.7, 0.56], [side * 0.78, 4.1, -0.14], materials.ivory, 0.08, [0, side * 0.32, side * 0.12]);
      nozzle(group, [side * 0.8, 3.95, -0.62], 0.13, materials, [Math.PI / 2, 0, 0]);
      barBetween(group, [side * 0.48, 3.69, -0.2], [side * 0.76, 3.24, -0.33], 0.035, materials.steel);
    }
    plate(group, [0.92, 0.34, 0.56], [0, 3.38, 0.39], materials.paint, 0.08);
    label(group, 'RP / 077', 0.42, [-0.44, 4.05, 0.77]);
  } else {
    for (let level = 0; level < 4; level += 1) {
      const width = 1.08 - level * 0.12;
      plate(group, [width, 0.2, 0.67], [0, 3.42 + level * 0.36, 0.04], level % 2 ? materials.ivory : materials.dark, 0.07, [0.07, 0, 0]);
      for (const side of [-1, 1]) piston(group, [side * (0.37 + level * 0.04), 3.31 + level * 0.35, -0.27], [side * (0.55 + level * 0.04), 3.62 + level * 0.35, -0.25], 0.026, materials);
    }
    for (const side of [-1, 1]) {
      fin(group, [[0, -0.2], [side * 0.32, 0.26], [side * 0.72, 0.6], [side * 0.38, -0.42]], 0.1, [side * 0.42, 4.1, 0.45], materials.paint, [0, side * 0.36, 0]);
      box(group, [0.08, 0.48, 0.05], [side * 0.47, 4.19, 0.65], materials.cyan, 0.006);
      cable(group, [[side * 0.25, 3.42, -0.34], [side * 0.58, 3.1, -0.35], [side * 0.43, 2.96, 0.08]], 0.035, materials.rubber);
    }
    plate(group, [0.7, 0.27, 0.36], [0, 3.13, 0.32], materials.paint, 0.05);
    label(group, 'SP / 013', 0.38, [-0.4, 4.34, 0.42]);
  }
  return bake(group);
}

export function makeStandardHead(kind, materials) {
  const group = new THREE.Group();
  group.name = 'Head_' + kind;
  group.position.set(0, 4.86, 0.06);
  if (kind === 'visor') {
    plate(group, [1.05, 0.67, 0.68], [0, 0.38, 0.02], materials.dark, 0.16);
    plate(group, [1.2, 0.22, 0.73], [0, 0.61, 0.18], materials.ivory, 0.08, [0.16, 0, 0]);
    plate(group, [0.92, 0.18, 0.05], [0, 0.52, 0.5], materials.glass, 0.03);
    box(group, [0.72, 0.045, 0.035], [0, 0.53, 0.54], materials.cyan, 0.004);
    for (const side of [-1, 1]) {
      plate(group, [0.23, 0.47, 0.56], [side * 0.54, 0.26, 0], materials.paint, 0.07, [0, side * 0.28, 0]);
      bolt(group, [side * 0.45, 0.75, 0.36], materials.steel, 0.04);
    }
  } else if (kind === 'horned') {
    fin(group, [[-0.38, -0.3], [0.38, -0.3], [0.31, 0.4], [0, 0.62], [-0.31, 0.4]], 0.66, [0, 0.4, 0], materials.ivory);
    for (const side of [-1, 1]) {
      fin(group, [[0, -0.1], [side * 0.18, 0.42], [side * 0.55, 1.18], [side * 0.78, 1.3], [side * 0.57, 0.43]], 0.13, [side * 0.22, 0.5, 0.04], materials.paint, [0, side * 0.16, 0]);
      box(group, [0.07, 0.22, 0.04], [side * 0.55, 1.48, 0.05], materials.cyan, 0.006);
    }
    plate(group, [0.71, 0.18, 0.56], [0, 0.32, 0.42], materials.dark, 0.04);
    box(group, [0.51, 0.04, 0.04], [0, 0.42, 0.73], materials.cyan, 0.004);
  } else {
    cylinder(group, 0.29, 0.44, [0, 0.35, 0], materials.steel, [0, 0, 0], 20);
    cylinder(group, 0.22, 0.48, [0, 0.57, 0.08], materials.dark, [0, 0, 0], 16);
    ring(group, 0.31, 0.04, [0, 0.55, 0.2], materials.cyan, [Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) {
      cylinder(group, 0.14, 0.19, [side * 0.38, 0.58, 0.05], materials.steel, [0, 0, Math.PI / 2], 14);
      cylinder(group, 0.09, 0.06, [side * 0.49, 0.58, 0.05], materials.glass, [0, 0, Math.PI / 2], 14);
      barBetween(group, [side * 0.24, 0.32, -0.12], [side * 0.56, 0.19, -0.17], 0.025, materials.steel);
    }
    plate(group, [0.58, 0.22, 0.38], [0, 0.18, 0.29], materials.paint, 0.04);
    label(group, 'SENSOR', 0.24, [-0.3, 0.84, 0.23]);
  }
  return bake(group);
}

export function makeStandardArm(side, kind, materials) {
  const group = new THREE.Group();
  group.name = (side < 0 ? 'Left' : 'Right') + '_Arm_' + kind;
  group.position.set(side * 1.17, 4.45, 0);
  if (kind === 'gauntlet') {
    joint(group, [side * 0.08, 0, 0], 0.32, materials, 0.72);
    plate(group, [1.04, 0.72, 0.93], [side * 0.3, 0.14, 0], materials.dark, 0.14);
    plate(group, [1.16, 0.45, 1.03], [side * 0.37, 0.48, 0.02], materials.ivory, 0.11, [0, 0, side * -0.1]);
    cylinder(group, 0.32, 0.66, [side * 0.34, -0.43, 0], materials.steel, [0, 0, Math.PI / 2], 16);
    plate(group, [0.74, 0.9, 0.78], [side * 0.35, -1.08, 0], materials.dark, 0.13);
    for (let finger = -1; finger <= 1; finger += 1) cylinder(group, 0.1, 0.42, [side * (0.14 + finger * 0.13), -1.72, 0.24], materials.steel, [0.2, 0, 0], 12);
    box(group, [0.42, 0.08, 0.04], [side * 0.34, 0.36, 0.54], materials.cyan, 0.006);
    label(group, 'FST / 09', 0.27, [side * 0.14, -0.79, 0.42]);
  } else if (kind === 'lancer') {
    joint(group, [side * 0.06, 0, 0], 0.22, materials, 0.52);
    piston(group, [side * 0.22, -0.08, 0], [side * 0.3, -0.92, -0.02], 0.07, materials);
    plate(group, [0.51, 0.78, 0.48], [side * 0.29, -0.35, 0], materials.paint, 0.08);
    plate(group, [0.42, 0.86, 0.32], [side * 0.3, -1.17, 0], materials.dark, 0.06);
    cylinder(group, 0.1, 1.36, [side * 0.3, -1.14, 0.38], materials.steel, [Math.PI / 2, 0, 0], 14);
    cylinder(group, 0.07, 1.4, [side * 0.3, -1.14, 0.42], materials.cyan, [Math.PI / 2, 0, 0], 12);
    plate(group, [0.48, 0.34, 0.62], [side * 0.3, -1.9, 0.02], materials.ivory, 0.05);
    label(group, 'LNC / 12', 0.27, [side * 0.02, -0.42, 0.28]);
  } else {
    joint(group, [side * 0.06, 0, 0], 0.18, materials, 0.4);
    for (const offset of [-1, 1]) {
      piston(group, [side * (0.16 + offset * 0.17), -0.05, 0], [side * (0.2 + offset * 0.2), -1.28, 0], 0.038, materials);
      fin(group, [[0, 0.25], [side * 0.23, 0.16], [side * 0.45, -0.12], [side * 0.12, -0.32]], 0.09, [side * (0.18 + offset * 0.12), 0.1, 0.08], materials.paint, [0, side * 0.25, 0]);
      fin(group, [[-0.09, 0.15], [0.09, 0.15], [0.14, -0.54], [0, -0.72], [-0.14, -0.54]], 0.07, [side * (0.2 + offset * 0.2), -1.37, 0.2], materials.ivory);
    }
    box(group, [0.09, 0.88, 0.05], [side * 0.31, -0.71, 0.39], materials.cyan, 0.005);
    for (const claw of [-1, 0, 1]) fin(group, [[-0.08, 0.05], [0.08, 0.05], [0.05, -0.42], [0, -0.68], [-0.05, -0.42]], 0.035, [side * (0.31 + claw * 0.12), -1.98, 0.19], materials.steel, [0, 0, claw * 0.2]);
  }
  cable(group, [[side * 0.15, 0.1, -0.3], [side * 0.36, -0.7, -0.35], [side * 0.29, -1.52, -0.25]], 0.038, materials.rubber);
  return bake(group);
}

function makeStriderLeg(side, materials) {
  const group = new THREE.Group();
  group.name = (side < 0 ? 'Left' : 'Right') + '_Leg_strider';
  group.position.set(side * 0.52, 2.9, 0);
  joint(group, [0, 0, 0], 0.22, materials, 0.42);
  fin(group, [[-0.25, 0.35], [0.25, 0.35], [0.18, -0.15], [0, -0.38], [-0.18, -0.15]], 0.28, [0, -0.35, 0.1], materials.paint);
  piston(group, [side * 0.24, -0.2, -0.2], [side * 0.29, -1.25, -0.22], 0.045, materials);
  joint(group, [side * 0.18, -1.25, 0], 0.18, materials, 0.34);
  plate(group, [0.54, 1.1, 0.52], [side * 0.16, -1.72, 0.08], materials.dark, 0.12, [-0.1, 0, 0]);
  fin(group, [[-0.22, 0.3], [0.22, 0.3], [0.18, -0.34], [0, -0.52], [-0.18, -0.34]], 0.14, [side * 0.16, -1.82, 0.4], materials.ivory, [-0.1, 0, 0]);
  for (const toe of [-1, 1]) plate(group, [0.2, 0.55, 0.22], [side * 0.16 + toe * 0.2, -2.55, 0.48], materials.paint, 0.04, [-0.18, 0, 0]);
  box(group, [0.32, 0.045, 0.04], [side * 0.16, -1.78, 0.58], materials.cyan, 0.004);
  return bake(group);
}

function makeAnchorLeg(side, materials) {
  const group = new THREE.Group();
  group.name = (side < 0 ? 'Left' : 'Right') + '_Leg_anchor';
  group.position.set(side * 0.65, 2.86, 0);
  cylinder(group, 0.34, 0.78, [0, -0.05, 0], materials.steel, [0, 0, Math.PI / 2], 18);
  plate(group, [0.94, 1.3, 0.78], [side * 0.1, -0.64, 0], materials.dark, 0.15);
  plate(group, [0.98, 1.0, 0.18], [side * 0.1, -0.62, 0.43], materials.ivory, 0.12);
  cylinder(group, 0.28, 0.76, [side * 0.1, -1.42, 0], materials.bronze, [0, 0, Math.PI / 2], 16);
  plate(group, [1.0, 1.18, 0.74], [side * 0.1, -2.03, 0.05], materials.dark, 0.14);
  plate(group, [1.07, 0.62, 0.2], [side * 0.1, -1.96, 0.43], materials.ivory, 0.07);
  plate(group, [1.24, 0.34, 1.46], [side * 0.1, -2.65, 0.27], materials.paint, 0.12);
  for (let index = 0; index < 6; index += 1) box(group, [1.03, 0.09, 0.1], [side * 0.1, -2.79, -0.23 + index * 0.22], materials.rubber, 0.01);
  for (const level of [-1, 1]) bolt(group, [side * 0.1, -1.96 + level * 0.34, 0.55], materials.steel, 0.05);
  box(group, [0.48, 0.05, 0.04], [side * 0.1, -2.14, 0.67], materials.cyan, 0.004);
  return bake(group);
}

function makeHoverLegs(materials) {
  const group = new THREE.Group();
  group.name = 'Legs_hover';
  plate(group, [1.7, 0.34, 1.18], [0, 2.26, 0], materials.dark, 0.16);
  cylinder(group, 0.5, 0.5, [0, 2.54, 0], materials.steel, [0, 0, 0], 24);
  for (const side of [-1, 1]) {
    for (const front of [-1, 1]) {
      const position = [side * 0.75, 1.25, front * 0.45];
      piston(group, [side * 0.36, 2.1, front * 0.24], position, 0.07, materials);
      nozzle(group, [side * 0.78, 0.88, front * 0.55], 0.19, materials, [Math.PI / 2, 0, 0]);
      ring(group, 0.25, 0.04, [side * 0.78, 0.64, front * 0.55], materials.cyan, [Math.PI / 2, 0, 0]);
    }
  }
  plate(group, [1.26, 0.22, 1.0], [0, 1.05, 0.1], materials.paint, 0.08);
  label(group, 'HOVER / 22', 0.5, [-0.47, 1.16, 0.62]);
  return { legs: [bake(group)], upperOffset: -0.38 };
}

export function makeStandardLegs(kind, materials) {
  if (kind === 'hover') return makeHoverLegs(materials);
  return { legs: [-1, 1].map(side => kind === 'anchor' ? makeAnchorLeg(side, materials) : makeStriderLeg(side, materials)), upperOffset: 0 };
}

export function makeStandardWeapon(kind, materials) {
  const group = new THREE.Group();
  group.name = 'Weapon_' + kind;
  const muzzle = new THREE.Object3D();
  if (kind === 'railgun') {
    group.position.set(1.7, 3.42, 0.38);
    plate(group, [0.78, 0.56, 1.2], [0, 0, 0.42], materials.dark, 0.09);
    for (const side of [-1, 1]) {
      box(group, [0.08, 0.14, 2.1], [side * 0.23, 0.18, 1.42], materials.steel, 0.02);
      box(group, [0.035, 0.05, 1.82], [side * 0.28, 0.18, 1.42], materials.cyan, 0.004);
      fin(group, [[-0.18, -0.22], [0.18, -0.22], [0.24, 0.27], [0, 0.45], [-0.24, 0.27]], 0.08, [side * 0.32, 0.25, 0.48], materials.paint, [0, side * 0.2, 0]);
    }
    plate(group, [0.74, 0.22, 0.56], [0, 0.42, -0.22], materials.ivory, 0.04);
    cylinder(group, 0.28, 0.2, [0, 0.18, 2.48], materials.dark, [Math.PI / 2, 0, 0], 16);
    cylinder(group, 0.14, 0.03, [0, 0.18, 2.61], materials.black, [Math.PI / 2, 0, 0], 12);
    label(group, 'RAIL / 77', 0.34, [-0.3, 0.2, 0.96]);
    muzzle.position.set(0, 0.18, 2.64);
  } else if (kind === 'arc') {
    group.position.set(1.68, 3.38, 0.44);
    for (const side of [-1, 1]) {
      plate(group, [0.28, 1.2, 0.72], [side * 0.38, 0, 0.58], materials.dark, 0.1);
      fin(group, [[0, -0.34], [side * 0.25, 0.32], [side * 0.62, 0.62], [side * 0.4, -0.28]], 0.12, [side * 0.13, 0.12, 0.56], materials.ivory, [0, side * 0.24, 0]);
    }
    ring(group, 0.5, 0.08, [0, 0.04, 0.52], materials.steel, [Math.PI / 2, 0, 0]);
    ring(group, 0.39, 0.06, [0, 0.04, 0.52], materials.cyan, [Math.PI / 2, 0, 0]);
    cylinder(group, 0.16, 0.42, [0, 0.04, 0.52], materials.glass, [Math.PI / 2, 0, 0], 16);
    for (let index = 0; index < 4; index += 1) barBetween(group, [Math.cos(index * Math.PI / 2) * 0.18, 0.04, 0.52 + Math.sin(index * Math.PI / 2) * 0.18], [Math.cos(index * Math.PI / 2) * 0.48, 0.04, 0.52 + Math.sin(index * Math.PI / 2) * 0.48], 0.025, materials.cyan);
    muzzle.position.set(0, 0.04, 0.9);
  } else {
    group.position.set(1.66, 2.48, 0.54);
    plate(group, [0.3, 0.84, 0.42], [0, 0, 0], materials.dark, 0.06);
    fin(group, [[-0.48, 0.12], [0.48, 0.12], [0.32, 2.36], [0, 2.82], [-0.32, 2.36]], 0.14, [0, 0.28, 0.04], materials.ivory);
    fin(group, [[-0.24, 0.24], [0.24, 0.24], [0.14, 2.32], [0, 2.62], [-0.14, 2.32]], 0.05, [0, 0.31, 0.13], materials.cyan);
    plate(group, [0.87, 0.2, 0.28], [0, 0.34, 0], materials.steel, 0.05);
    plate(group, [0.28, 0.22, 0.38], [0, 0.64, 0], materials.paint, 0.04);
    muzzle.position.set(0, 3.16, 0.08);
  }
  muzzle.name = 'Muzzle';
  group.add(muzzle);
  return { group: bake(group), muzzle };
}
