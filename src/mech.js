import * as THREE from 'three';
import { box, plate, fin, cylinder, ring, bolt, cable, label, barBetween, bake, forkMaterials } from './assets.js';
import { makeAdvancedTorso, makeAdvancedHead, makeAdvancedArm, makeAdvancedLegs, makeAdvancedWeapon, makeBackpack } from './variants.js';
import { makeStandardTorso, makeStandardHead, makeStandardArm, makeStandardLegs, makeStandardWeapon } from './designs.js';

function vents(parent, center, count, width, material) {
  for (let index = 0; index < count; index += 1) {
    box(parent, [width, 0.027, 0.04], [center[0], center[1] + index * 0.065, center[2]], material, 0.005);
  }
}

function fasteners(parent, center, width, height, material) {
  for (const side of [-1, 1]) {
    for (const level of [-1, 1]) {
      bolt(parent, [center[0] + side * width / 2, center[1] + level * height / 2, center[2]], material);
    }
  }
}

function makeTorso(kind, materials) {
  if (['bulwark', 'raptor', 'specter'].includes(kind)) return makeStandardTorso(kind, materials);
  const advanced = makeAdvancedTorso(kind, materials);
  if (advanced) return advanced;
  const group = new THREE.Group();
  group.name = 'Torso_' + kind;
  const width = kind === 'bulwark' ? 1.95 : kind === 'raptor' ? 1.62 : 1.42;
  cylinder(group, 0.45, 0.75, [0, 3.22, 0], materials.dark);
  for (let index = 0; index < 4; index += 1) {
    ring(group, 0.46, 0.06, [0, 2.97 + index * 0.14, 0], materials.steel, [Math.PI / 2, 0, 0]);
  }
  plate(group, [1.35, 0.47, 0.68], [0, 2.96, 0], materials.dark, 0.14);
  plate(group, [0.57, 0.72, 0.19], [0, 2.79, 0.46], materials.ivory, 0.16, [-0.12, 0, 0]);
  for (const side of [-1, 1]) {
    plate(group, [0.55, 0.63, 0.27], [side * 0.65, 2.85, 0.31], materials.paint, 0.1, [0, side * 0.19, side * -0.14]);
  }
  plate(group, [width, 1.4, 0.97], [0, 4.08, 0], materials.dark, 0.3);
  plate(group, [width + 0.15, 0.42, 0.8], [0, 4.66, 0.1], materials.ivory, 0.12);
  for (const side of [-1, 1]) {
    plate(group, [width * 0.46, 0.87, 0.22], [side * width * 0.265, 4.25, 0.57], materials.ivory, 0.15, [0.12, side * 0.2, side * 0.09]);
    plate(group, [width * 0.37, 0.26, 0.06], [side * width * 0.255, 4.53, 0.73], materials.paint, 0.06, [0.1, side * 0.2, side * 0.09]);
    vents(group, [side * width * 0.275, 3.96, 0.726], 4, width * 0.32, materials.dark);
    box(group, [0.39, 0.06, 0.09], [side * 0.55, 4.46, 0.79], materials.cyan);
    fasteners(group, [side * width * 0.275, 4.18, 0.74], width * 0.32, 0.49, materials.steel);
    cable(group, [[side * 0.48, 3.78, 0.25], [side * 0.64, 3.37, 0.3], [side * 0.42, 3.19, 0.23]], 0.055, materials.rubber);
    barBetween(group, [side * 0.71, 3.52, -0.22], [side * 0.49, 3.03, -0.24], 0.055, materials.steel);
  }
  plate(group, [1.07, 0.38, 0.32], [0, 3.6, 0.44], materials.paint, 0.1);
  if (kind === 'bulwark') {
    plate(group, [2.34, 0.6, 0.88], [0, 4.43, -0.04], materials.ivory, 0.16, [0.08, 0, 0]);
    for (const side of [-1, 1]) {
      fin(group, [[-0.42, -0.28], [0.42, -0.28], [0.66, 0.21], [0.4, 0.4], [-0.4, 0.4], [-0.66, 0.21]], 0.17, [side * 0.91, 4.46, 0.11], materials.dark, [0, side * 0.16, 0]);
      cylinder(group, 0.16, 0.24, [side * 1.12, 4.16, -0.14], materials.steel, [0, Math.PI / 2, 0], 12);
      ring(group, 0.13, 0.025, [side * 1.25, 4.16, -0.14], materials.amber, [0, Math.PI / 2, 0]);
    }
    box(group, [0.72, 0.07, 0.05], [0, 4.46, 0.47], materials.cyan, 0.01);
  } else if (kind === 'raptor') {
    fin(group, [[-0.37, -0.43], [0.37, -0.43], [0.48, 0.42], [0, 0.69], [-0.48, 0.42]], 0.16, [0, 4.12, 0.55], materials.ivory, [0.13, 0, 0]);
    for (const side of [-1, 1]) {
      fin(group, [[0, -0.3], [side * 0.43, 0.08], [side * 0.72, 0.46], [side * 0.16, 0.32]], 0.11, [0, 4.34, 0.67], materials.paint, [0, side * 0.13, 0]);
      cylinder(group, 0.19, 0.38, [side * 0.79, 4.02, -0.28], materials.dark, [Math.PI / 2, 0, 0], 16);
      cylinder(group, 0.11, 0.41, [side * 0.79, 4.02, -0.49], materials.cyan, [Math.PI / 2, 0, 0], 16);
    }
    box(group, [0.1, 0.58, 0.08], [0, 4.47, 0.57], materials.cyan, 0.02, [0, 0, 0.16]);
  } else if (kind === 'specter') {
    fin(group, [[-0.29, -0.45], [0.29, -0.45], [0.22, 0.45], [0, 0.72], [-0.22, 0.45]], 0.12, [0, 4.17, 0.55], materials.dark, [0.08, 0, 0]);
    for (const side of [-1, 1]) {
      fin(group, [[0, -0.18], [side * 0.34, 0.1], [side * 0.66, 0.68], [side * 0.11, 0.48]], 0.08, [side * 0.16, 4.18, 0.65], materials.ivory, [0, side * 0.26, 0]);
      barBetween(group, [side * 0.3, 4.46, 0.42], [side * 0.58, 3.78, -0.12], 0.032, materials.steel);
    }
    box(group, [0.52, 0.04, 0.035], [0, 4.57, 0.69], materials.cyan, 0.006);
  }
  cylinder(group, 0.25, 0.11, [0, 4.14, 0.65], materials.steel, [Math.PI / 2, 0, 0]);
  cylinder(group, 0.195, 0.12, [0, 4.14, 0.72], materials.black, [Math.PI / 2, 0, 0]);
  ring(group, 0.137, 0.028, [0, 4.14, 0.8], materials.cyan);
  cylinder(group, 0.075, 0.04, [0, 4.14, 0.82], materials.cyan, [Math.PI / 2, 0, 0]);
  label(group, 'AX / 041', 0.52, [-0.5, 4.64, 0.544], '#243138');
  label(group, 'DANGER', 0.36, [0.51, 3.65, 0.615], '#e7c17a');
  return bake(group);
}

function makeLeg(side, kind, materials) {
  const group = new THREE.Group();
  group.name = (side < 0 ? 'Left' : 'Right') + '_Leg_' + kind;
  group.position.set(side * 0.52, 2.89, 0);
  const heavy = kind === 'anchor';
  const breadth = heavy ? 0.77 : 0.54;
  cylinder(group, 0.26, 0.52, [0, -0.05, 0], materials.steel, [0, 0, Math.PI / 2]);
  plate(group, [breadth, 0.94, 0.53], [side * 0.07, -0.55, 0.01], materials.dark, 0.12);
  plate(group, [breadth + 0.09, 0.74, 0.17], [side * 0.07, -0.48, 0.36], materials.ivory, 0.16, [-0.1, 0, side * 0.08]);
  plate(group, [0.22, 0.56, 0.07], [side * 0.07, -0.44, 0.47], materials.paint, 0.06);
  barBetween(group, [side * 0.3, -0.14, -0.19], [side * 0.35, -1.12, -0.18], 0.055, materials.steel);
  cylinder(group, 0.26, breadth + 0.18, [side * 0.12, -1.09, 0], materials.dark, [0, 0, Math.PI / 2]);
  cylinder(group, 0.13, breadth + 0.23, [side * 0.12, -1.09, 0], materials.bronze, [0, 0, Math.PI / 2]);
  plate(group, [breadth + 0.12, 0.42, 0.24], [side * 0.12, -1.07, 0.29], materials.paint, 0.1);
  box(group, [0.27, 0.045, 0.03], [side * 0.12, -1.045, 0.43], materials.cyan);
  const ankleZ = kind === 'strider' ? -0.17 : 0;
  plate(group, [breadth + 0.18, 1.13, 0.58], [side * 0.18, -1.84, ankleZ], materials.dark, 0.15);
  plate(group, [breadth + 0.23, 0.88, 0.16], [side * 0.18, -1.75, 0.31 + ankleZ], materials.ivory, 0.18, [-0.1, 0, 0]);
  plate(group, [0.17, 0.65, 0.04], [side * 0.18, -1.74, 0.44 + ankleZ], materials.paint, 0.05);
  for (const offset of [-1, 1]) {
    barBetween(group, [side * 0.18 + offset * 0.22, -1.38, -0.29], [side * 0.18 + offset * 0.22, -2.42, -0.23], 0.045, materials.steel);
  }
  vents(group, [side * 0.18, -2.17, 0.428 + ankleZ], 3, breadth * 0.65, materials.dark);
  fasteners(group, [side * 0.18, -1.74, 0.427 + ankleZ], breadth * 0.69, 0.57, materials.steel);
  if (kind === 'hover') {
    cylinder(group, 0.44, 0.42, [side * 0.19, -2.5, 0.06], materials.dark);
    cylinder(group, 0.46, 0.08, [side * 0.19, -2.7, 0.06], materials.steel);
    ring(group, 0.33, 0.045, [side * 0.19, -2.75, 0.06], materials.cyan, [Math.PI / 2, 0, 0]);
    cylinder(group, 0.28, 0.09, [side * 0.19, -2.8, 0.06], materials.cyan);
  } else {
    plate(group, [heavy ? 1.0 : 0.79, 0.33, heavy ? 1.45 : 1.22], [side * 0.21, -2.56, 0.3], materials.dark, 0.12);
    plate(group, [heavy ? 0.96 : 0.74, 0.22, 0.62], [side * 0.21, -2.47, 0.68], materials.ivory, 0.07, [-0.1, 0, 0]);
    box(group, [0.55, 0.035, 0.07], [side * 0.21, -2.5, 1.015], materials.caution);
    for (let index = 0; index < 5; index += 1) {
      box(group, [heavy ? 1.04 : 0.84, 0.085, 0.085], [side * 0.21, -2.77, -0.12 + index * 0.25], materials.rubber);
      }
  }
  if (kind === 'strider') {
    fin(group, [[-0.19, 0.4], [0.19, 0.4], [0.28, -0.34], [0, -0.58], [-0.28, -0.34]], 0.11, [side * 0.18, -1.85, 0.39], materials.ivory, [-0.12, 0, 0]);
    for (const toe of [-1, 1]) {
      plate(group, [0.22, 0.56, 0.22], [side * 0.21 + toe * 0.24, -2.62, 0.53], materials.paint, 0.05, [-0.18, 0, 0]);
    }
  } else if (kind === 'anchor') {
    plate(group, [0.95, 1.22, 0.72], [side * 0.18, -1.82, -0.04], materials.ivory, 0.14, [0.04, 0, 0]);
    cylinder(group, 0.19, 0.73, [side * 0.18, -2.29, -0.32], materials.steel, [Math.PI / 2, 0, 0], 16);
    for (const toe of [-1, 1]) box(group, [0.08, 0.26, 0.32], [side * 0.21 + toe * 0.29, -2.62, 0.9], materials.caution, 0.02);
  }
  label(group, side < 0 ? 'L-04' : 'R-04', 0.3, [side * 0.18, -1.43, 0.425 + ankleZ], '#273d42');
  return bake(group);
}

function makeArm(side, kind, materials) {
  if (['gauntlet', 'lancer', 'talon'].includes(kind)) return makeStandardArm(side, kind, materials);
  const advanced = makeAdvancedArm(side, kind, materials);
  if (advanced) return advanced;
  const group = new THREE.Group();
  group.name = (side < 0 ? 'Left' : 'Right') + '_Arm_' + kind;
  group.position.set(side * 1.14, 4.48, 0);
  group.rotation.z = side * 0.08;
  const heavy = kind === 'gauntlet';
  cylinder(group, 0.3, 0.65, [side * 0.07, 0, 0], materials.steel, [0, 0, Math.PI / 2]);
  plate(group, [heavy ? 1.08 : 0.84, 0.56, 0.89], [side * 0.28, 0.16, 0], materials.dark, 0.14);
  plate(group, [heavy ? 1.15 : 0.91, 0.33, 0.97], [side * 0.32, 0.45, 0], materials.ivory, 0.12, [0, 0, side * -0.09]);
  plate(group, [0.82, 0.25, 0.09], [side * 0.33, 0.33, 0.51], materials.paint, 0.06);
  box(group, [0.41, 0.045, 0.05], [side * 0.29, 0.29, 0.57], materials.cyan);
  fasteners(group, [side * 0.29, 0.32, 0.55], 0.63, 0.09, materials.steel);
  box(group, [0.39, 0.82, 0.44], [side * 0.3, -0.47, 0], materials.dark, 0.06);
  plate(group, [0.44, 0.64, 0.16], [side * 0.3, -0.42, 0.28], materials.paint, 0.09);
  barBetween(group, [side * 0.5, -0.1, 0], [side * 0.5, -0.95, 0.03], 0.055, materials.steel);
  cylinder(group, 0.22, 0.57, [side * 0.3, -0.97, 0], materials.steel, [0, 0, Math.PI / 2]);
  const palm = new THREE.Group();
  palm.position.set(side * 0.31, -1.05, 0);
  palm.rotation.x = -0.2;
  group.add(palm);
  plate(palm, [heavy ? 0.76 : 0.54, 0.91, 0.66], [0, -0.5, 0], materials.dark, 0.15);
  plate(palm, [heavy ? 0.7 : 0.49, 0.76, 0.16], [0, -0.47, 0.36], materials.ivory, 0.11);
  plate(palm, [0.19, 0.62, 0.035], [0, -0.44, 0.47], materials.paint, 0.04);
  vents(palm, [0, -0.76, 0.465], 3, 0.34, materials.dark);
  box(palm, [0.39, 0.27, 0.34], [0, -1.09, 0], materials.dark, 0.04);
  for (let finger = 0; finger < 3; finger += 1) {
    box(palm, [0.098, 0.3, 0.18], [-0.13 + finger * 0.13, -1.15, 0.19], materials.steel, 0.02);
  }
  if (kind === 'talon') {
    for (const offset of [-1, 1]) {
      plate(palm, [0.09, 0.89, 0.12], [offset * 0.26, -1.12, 0.13], materials.steel, 0.035, [0.17, 0, offset * 0.11]);
      box(palm, [0.025, 0.64, 0.055], [offset * 0.3, -1.14, 0.22], materials.cyan);
    }
  }
  if (heavy && side < 0) {
    plate(palm, [0.74, 1.12, 0.18], [-0.36, -0.42, 0.27], materials.paint, 0.15, [0, -0.15, -0.12]);
    label(palm, '04', 0.36, [-0.35, -0.3, 0.395]);
  }
  if (kind === 'lancer') {
    cylinder(palm, 0.13, 0.83, [side * 0.31, -0.42, 0], materials.dark);
    ring(palm, 0.13, 0.02, [side * 0.31, -0.15, 0], materials.cyan, [Math.PI / 2, 0, 0]);
  }
  cable(group, [[side * 0.38, 0.05, -0.36], [side * 0.51, -0.44, -0.47], [side * 0.29, -1.25, -0.36]], 0.042, materials.rubber);
  label(group, side > 0 ? '041' : 'ICL', 0.37, [side * 0.29, 0.53, 0.526], '#263941');
  return bake(group);
}

function makeWeapon(kind, materials) {
  if (['railgun', 'arc', 'monoblade'].includes(kind)) return makeStandardWeapon(kind, materials);
  const advanced = makeAdvancedWeapon(kind, materials);
  if (advanced) return advanced;
  const group = new THREE.Group();
  group.name = 'Weapon_' + kind;
  group.position.set(1.71, 3.43, 0.44);
  const muzzle = new THREE.Object3D();
  if (kind === 'railgun') {
    plate(group, [0.56, 0.63, 1.78], [0, 0, 0.38], materials.dark, 0.09);
    plate(group, [0.6, 0.23, 1.23], [0, 0.36, 0.19], materials.ivory, 0.045);
    box(group, [0.19, 0.21, 0.81], [0.35, -0.05, 0.31], materials.paint);
    for (let index = 0; index < 5; index += 1) {
      box(group, [0.6, 0.075, 0.09], [0, 0.34, -0.17 + index * 0.25], materials.steel);
    }
    cylinder(group, 0.185, 1.55, [0, 0.02, 1.53], materials.steel, [Math.PI / 2, 0, 0]);
    cylinder(group, 0.23, 0.2, [0, 0.02, 2.29], materials.dark, [Math.PI / 2, 0, 0]);
    cylinder(group, 0.125, 0.02, [0, 0.02, 2.401], materials.black, [Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) {
      box(group, [0.07, 0.11, 1.36], [side * 0.22, 0.02, 1.49], materials.paint);
      box(group, [0.025, 0.045, 1.22], [side * 0.267, 0.04, 1.49], materials.cyan);
    }
    box(group, [0.26, 0.23, 0.55], [0, 0.58, -0.15], materials.dark);
    cylinder(group, 0.08, 0.03, [0, 0.58, 0.15], materials.red, [Math.PI / 2, 0, 0]);
    label(group, 'R-77', 0.32, [0, 0.15, 1.292]);
    for (const side of [-1, 1]) fin(group, [[-0.15, -0.28], [0.15, -0.28], [0.23, 0.31], [0, 0.48], [-0.23, 0.31]], 0.055, [side * 0.31, 0.18, 0.73], materials.paint, [0, side * 0.22, 0]);
    muzzle.position.set(0, 0.02, 2.43);
  } else if (kind === 'arc') {
    cylinder(group, 0.34, 1.67, [0, 0, 0.43], materials.dark, [Math.PI / 2, 0, 0]);
    for (let index = 0; index < 6; index += 1) {
      ring(group, 0.38, 0.065, [0, 0, index * 0.21], index % 2 ? materials.steel : materials.cyan);
    }
    for (const side of [-1, 1]) {
      box(group, [0.14, 0.2, 1.13], [side * 0.44, 0, 0.92], materials.ivory);
      box(group, [0.08, 0.12, 0.29], [side * 0.44, 0, 1.57], materials.cyan);
    }
    ring(group, 0.51, 0.035, [0, 0, 0.9], materials.amber, [Math.PI / 2, 0, 0]);
    muzzle.position.set(0, 0, 1.75);
  } else {
    group.position.set(1.68, 2.5, 0.57);
    box(group, [0.14, 0.68, 0.17], [0, 0, 0], materials.rubber);
    plate(group, [0.74, 0.14, 0.29], [0, 0.33, 0], materials.steel, 0.04);
    plate(group, [0.37, 2.19, 0.11], [0, 1.5, 0], materials.steel, 0.14, [0, 0, -0.07]);
    plate(group, [0.064, 2.04, 0.06], [0.13, 1.51, 0.09], materials.cyan, 0.025, [0, 0, -0.07]);
    fin(group, [[-0.52, 0.05], [0.52, 0.05], [0.35, 0.3], [-0.35, 0.3]], 0.14, [0, 0.34, 0], materials.dark);
    muzzle.position.set(0.08, 2.65, 0);
  }
  bake(group);
  muzzle.name = 'Muzzle';
  group.add(muzzle);
  return { group, muzzle };
}

export function createMech(parts, materials, componentColors = {}) {
  const root = new THREE.Group();
  root.name = 'IRONCLAD_' + parts.chassis;
  const colors = componentColors;
  const scopedMaterials = {
    chassis: forkMaterials(materials, colors.chassis),
    head: forkMaterials(materials, colors.head),
    arms: forkMaterials(materials, colors.arms),
    legs: forkMaterials(materials, colors.legs),
    weapon: forkMaterials(materials, colors.weapon),
    backpack: forkMaterials(materials, colors.backpack)
  };
  const torso = makeTorso(parts.chassis, scopedMaterials.chassis);
  const head = makeHead(parts.head, scopedMaterials.head);
  const legSystem = makeAdvancedLegs(parts.legs, scopedMaterials.legs) || makeStandardLegs(parts.legs, scopedMaterials.legs);
  const legs = legSystem.legs;
  const upperOffset = legSystem.upperOffset ?? 0;
  const arms = [-1, 1].map(side => makeArm(side, parts.arms, scopedMaterials.arms));
  const weapon = makeWeapon(parts.weapon, scopedMaterials.weapon);
  const backpack = makeBackpack(parts.backpack || 'compact', scopedMaterials.backpack);
  [torso, head, ...arms, weapon.group, backpack].forEach(object => { object.position.y += upperOffset; });
  root.add(torso, head, ...legs, ...arms, weapon.group, backpack);
  root.userData.configuration = { ...parts, backpack: parts.backpack || 'compact', colors };
  root.position.y = 0.23;
  const bounds = new THREE.Box3().setFromObject(root);
  return { root, torso, head, legs, arms, backpack, bounds, upperOffset, weapon: weapon.group, muzzle: weapon.muzzle, rotor: weapon.rotor, weaponRestZ: weapon.group.position.z, scopedMaterials };
}


function makeHead(kind, materials) {
  if (['visor', 'horned', 'sensor'].includes(kind)) return makeStandardHead(kind, materials);
  const advanced = makeAdvancedHead(kind, materials);
  if (advanced) return advanced;
  const group = new THREE.Group();
  group.name = 'Head_' + kind;
  group.position.set(0, 4.84, 0.06);
  cylinder(group, 0.21, 0.34, [0, 0.08, 0], materials.steel);
  const width = kind === 'sensor' ? 0.57 : 0.74;
  plate(group, [width, 0.64, 0.58], [0, 0.51, 0.04], materials.ivory, 0.17);
  plate(group, [width * 0.92, 0.24, 0.06], [0, 0.52, 0.37], materials.dark, 0.055);
  if (kind === 'sensor') {
    cylinder(group, 0.14, 0.1, [0, 0.54, 0.43], materials.steel, [Math.PI / 2, 0, 0]);
    cylinder(group, 0.09, 0.11, [0, 0.54, 0.47], materials.cyan, [Math.PI / 2, 0, 0]);
    box(group, [0.33, 0.22, 0.28], [0.42, 0.59, 0.11], materials.dark);
    cylinder(group, 0.052, 0.04, [0.42, 0.61, 0.28], materials.red, [Math.PI / 2, 0, 0]);
  } else {
    box(group, [0.54, 0.053, 0.05], [0, 0.55, 0.418], materials.cyan, 0.012);
    box(group, [0.075, 0.21, 0.06], [0, 0.37, 0.424], materials.paint);
  }
  plate(group, [0.41, 0.19, 0.14], [0, 0.24, 0.34], materials.dark, 0.055);
  for (const side of [-1, 1]) {
    cylinder(group, 0.145, 0.08, [side * (width / 2 + 0.02), 0.5, 0], materials.steel, [0, 0, Math.PI / 2]);
    bolt(group, [side * 0.245, 0.74, 0.34], materials.steel);
    if (kind === 'horned') {
      const antenna = plate(group, [0.12, 0.84, 0.09], [side * 0.43, 1.03, 0.02], materials.paint, 0.035);
      antenna.rotation.z = side * -0.42;
      box(group, [0.042, 0.11, 0.03], [side * 0.59, 1.41, 0.03], materials.cyan);
    }
  }
  if (kind !== 'horned') {
    barBetween(group, [-0.36, 0.67, -0.15], [-0.43, 1.09, -0.2], 0.018, materials.steel);
    cylinder(group, 0.025, 0.07, [-0.43, 1.09, -0.2], materials.amber);
  }
  return bake(group);
}
