import * as THREE from 'three';
import { box, plate, fin, cylinder, ring, bolt, cable, label, barBetween, bake } from './assets.js';

function joint(parent, position, radius, materials, length = 0.38) {
  cylinder(parent, radius, length, position, materials.dark, [0, 0, Math.PI / 2]);
  cylinder(parent, radius * 0.54, length + 0.025, position, materials.steel, [0, 0, Math.PI / 2], 12);
}

function strut(parent, start, finish, width, depth, material) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...finish);
  const object = box(parent, [width, from.distanceTo(to), depth], from.clone().add(to).multiplyScalar(0.5).toArray(), material, 0.035);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
  return object;
}

function exhaust(parent, position, radius, length, materials, rotation = [Math.PI / 2, 0, 0]) {
  cylinder(parent, radius, length, position, materials.steel, rotation, 20, radius * 0.7);
  const direction = new THREE.Vector3(0, -length / 2 - 0.015, 0).applyEuler(new THREE.Euler(...rotation));
  const mouth = new THREE.Vector3(...position).add(direction);
  cylinder(parent, radius * 0.81, 0.045, mouth.toArray(), materials.black, rotation);
  cylinder(parent, radius * 0.59, 0.051, mouth.toArray(), materials.cyan, rotation);
}

export function makeAdvancedTorso(kind, materials) {
  if (!['aerocore', 'reactor', 'paladin'].includes(kind)) return null;
  const group = new THREE.Group();
  group.name = 'Torso_' + kind;
  cylinder(group, 0.38, 0.72, [0, 3.24, 0], materials.steel);
  for (let index = 0; index < 4; index += 1) {
    ring(group, 0.39, 0.046, [0, 3.01 + index * 0.15, 0], materials.dark, [Math.PI / 2, 0, 0]);
  }
  plate(group, [1.31, 0.42, 0.69], [0, 2.95, 0], materials.dark, 0.09);
  if (kind === 'aerocore') {
    fin(group, [[-0.47,-0.68],[0.47,-0.68],[0.8,0.51],[0.42,0.91],[-0.42,0.91],[-0.8,0.51]], 0.84, [0, 4.04, 0], materials.dark);
    fin(group, [[-0.15,-0.79],[0.15,-0.79],[0.4,0.31],[0.27,0.72],[-0.27,0.72],[-0.4,0.31]], 0.14, [0,4.18,0.64], materials.paint);
    fin(group, [[-0.19,-0.29],[0.19,-0.29],[0.26,0.36],[0,0.64],[-0.26,0.36]], 0.1, [0,4.22,0.78], materials.glass);
    for (const side of [-1,1]) {
      fin(group, [[0,-0.52],[side*0.49,-0.24],[side*0.91,0.7],[side*0.14,0.44]], 0.32, [side*0.39,4.02,0.3], materials.ivory, [0,side*0.18,0]);
      fin(group, [[0,0],[side*0.51,0.37],[side*0.45,0.67],[side*0.09,0.44]], 0.08, [side*0.52,4.13,0.53], materials.paint);
      plate(group, [0.28,0.45,0.07], [side*0.66,4.29,0.57], materials.black, 0.055, [0,side*0.13,side*-0.25]);
      for (let index=0; index<4; index+=1) box(group,[0.23,0.024,0.035],[side*0.66,4.18+index*0.075,0.615],materials.steel,0);
      barBetween(group,[side*0.62,3.82,-0.2],[side*0.36,3.02,-0.15],0.045,materials.steel);
      fin(group, [[0,0.25],[side*0.48,0.04],[side*0.29,-0.72],[0,-0.36]],0.13,[side*0.48,2.99,0.35],materials.ivory);
    }
    box(group,[0.18,0.055,0.05],[0,4.02,0.855],materials.cyan);
    label(group,'K-92',0.31,[0,3.8,0.735]);
  } else if (kind === 'reactor') {
    plate(group,[2.03,1.27,1.08],[0,4.1,0],materials.dark,0.15);
    for (const side of [-1,1]) {
      plate(group,[0.64,1.18,0.45],[side*0.82,4.11,0.39],materials.paint,0.11);
      plate(group,[0.62,0.37,0.12],[side*0.84,4.6,0.64],materials.ivory,0.04);
      box(group,[0.6,0.08,0.04],[side*0.84,4.55,0.72],materials.caution);
      for (let index=0; index<5; index+=1) {
        box(group,[0.42,0.045,0.06],[side*0.82,3.75+index*0.11,0.65],materials.steel,0);
      }
      cylinder(group,0.16,0.91,[side*0.47,4.1,0.76],materials.bronze);
      cable(group,[[side*0.56,4.6,0.42],[side*0.68,4.8,0.76],[side*0.61,3.43,0.6]],0.06,materials.rubber);
      plate(group,[0.54,0.51,0.31],[side*0.55,2.8,0.44],materials.dark,0.08);
    }
    cylinder(group,0.46,0.28,[0,4.15,0.64],materials.steel,[Math.PI/2,0,0],24);
    cylinder(group,0.37,0.3,[0,4.15,0.67],materials.black,[Math.PI/2,0,0],24);
    ring(group,0.27,0.025,[0,4.15,0.86],materials.amber);
    for (let index=0; index<12; index+=1) {
      const angle=index/12*Math.PI*2;
      box(group,[0.09,0.19,0.03],[Math.sin(angle)*0.27,4.15+Math.cos(angle)*0.27,0.85],materials.bronze,0,[0,0,-angle+0.5]);
    }
    cylinder(group,0.12,0.045,[0,4.15,0.91],materials.cyan,[Math.PI/2,0,0]);
    box(group,[1.0,0.2,0.44],[0,3.43,0.33],materials.ivory);
    label(group,'FD / 808',0.7,[0,4.62,0.56]);
  } else {
    fin(group,[[-0.58,-0.67],[0.58,-0.67],[1.02,0.52],[0.73,0.78],[-0.73,0.78],[-1.02,0.52]],0.97,[0,4.1,0],materials.dark);
    for (const side of [-1,1]) {
      fin(group,[[0,0.51],[side*0.95,0.39],[side*0.69,-0.39],[side*0.15,-0.51]],0.23,[side*0.04,4.3,0.61],materials.paint,[0,side*0.1,0]);
      fin(group,[[0,0.05],[side*0.8,0.26],[side*0.68,0.41],[side*0.1,0.3]],0.11,[side*0.08,4.52,0.7],materials.ivory);
      plate(group,[0.32,0.37,0.09],[side*0.51,4.27,0.82],materials.black,0.035);
      for(let index=0;index<3;index+=1) box(group,[0.32,0.05,0.06],[side*0.51,4.18+index*0.11,0.884],materials.bronze);
      fin(group,[[-0.23,0.36],[0.23,0.36],[0.37,-0.42],[0,-0.59],[-0.35,-0.4]],0.17,[side*0.41,2.87,0.49],materials.ivory,[0,side*0.12,side*-0.1]);
      fin(group,[[-0.19,0.28],[0.19,0.28],[0.28,-0.39],[-0.22,-0.39]],0.17,[side*0.82,2.88,0],materials.paint,[0,side*0.75,side*-0.2]);
      box(group,[0.11,0.24,0.04],[side*0.4,2.96,0.6],materials.paint);
    }
    fin(group,[[-0.25,0.17],[0.25,0.17],[0,-0.26]],0.07,[0,4.36,0.81],materials.bronze);
    fin(group,[[-0.14,0.1],[0.14,0.1],[0,-0.14]],0.05,[0,4.36,0.87],materials.cyan);
    plate(group,[0.85,0.28,0.37],[0,3.49,0.39],materials.ivory,0.05);
    label(group,'PL / 001',0.47,[0,3.55,0.601],'#30424b');
  }
  return bake(group);
}

export function makeAdvancedArm(side, kind, materials) {
  if (!['aerofins','siege','pauldrons'].includes(kind)) return null;
  const group = new THREE.Group();
  group.name = (side < 0 ? 'Left' : 'Right') + '_Arm_' + kind;
  group.position.set(side * 1.14,4.48,0);
  group.rotation.z = side * 0.08;
  joint(group,[side*0.08,0,0],0.25,materials,0.64);
  const reach = kind === 'siege' ? 0.36 : 0.24;
  strut(group,[side*reach,-0.05,0],[side*reach,-0.99,0.05],0.28,0.35,materials.dark);
  joint(group,[side*reach,-1.01,0.04],0.18,materials,0.5);
  plate(group,[0.37,0.84,0.39],[side*reach,-1.54,0.14],materials.dark,0.09,[-0.13,0,0]);
  barBetween(group,[side*(reach+0.18),-0.31,-0.07],[side*(reach+0.18),-1.07,-0.02],0.044,materials.steel);
  box(group,[0.33,0.24,0.29],[side*reach,-2.09,0.2],materials.dark);
  for(let index=0;index<3;index+=1) box(group,[0.075,0.24,0.11],[side*reach-0.1+index*0.1,-2.17,0.34],materials.steel,0.01);
  if (kind === 'aerofins') {
    fin(group,[[0,-0.16],[side*1.04,0.63],[side*0.7,0.2],[side*0.32,-0.44]],0.68,[side*0.05,0.35,0],materials.ivory,[0,side*0.22,0]);
    fin(group,[[0,0],[side*0.89,0.52],[side*0.34,-0.14]],0.045,[side*0.2,0.34,0.4],materials.paint);
    fin(group,[[-0.19,0.44],[0.19,0.44],[side*0.37,-0.65],[-side*0.07,-0.4]],0.22,[side*reach,-1.56,0.4],materials.ivory);
    fin(group,[[0,0.3],[side*0.43,-0.44],[side*0.21,-0.68],[0,-0.25]],0.07,[side*(reach+0.17),-1.47,0.12],materials.paint);
    box(group,[0.045,0.57,0.045],[side*reach,-1.52,0.54],materials.cyan);
    plate(group,[0.31,0.45,0.1],[side*reach,-0.51,0.23],materials.paint,0.065);
  } else if (kind === 'siege') {
    plate(group,[1.17,0.62,1.06],[side*0.35,0.22,0],materials.dark,0.1);
    plate(group,[1.25,0.23,1.11],[side*0.38,0.62,0],materials.paint,0.065);
    plate(group,[0.79,0.65,0.12],[side*0.36,0.23,0.59],materials.ivory,0.04);
    for(let index=0;index<4;index+=1) box(group,[0.56,0.045,0.07],[side*0.36,0.04+index*0.12,0.68],materials.dark,0);
    plate(group,[0.73,0.99,0.31],[side*reach,-1.55,0.43],materials.paint,0.1);
    if(side<0) {
      plate(group,[1.04,1.92,0.27],[-0.62,-0.9,0.68],materials.dark,0.11,[0,-0.15,-0.08]);
      plate(group,[0.82,1.69,0.09],[-0.66,-0.9,0.85],materials.ivory,0.08,[0,-0.15,-0.08]);
      box(group,[0.18,1.51,0.055],[-0.71,-0.9,0.95],materials.paint);
      for(const level of [-1,1]) box(group,[0.84,0.09,0.08],[-0.67,-0.9+level*0.64,0.96],materials.caution);
      label(group,'RAMPART',0.62,[-0.65,-0.54,1.0],'#243b44');
    } else {
      for(let index=0;index<3;index+=1) cylinder(group,0.07,0.13,[side*reach-0.16+index*0.16,-1.36,0.69],materials.steel,[Math.PI/2,0,0]);
    }
  } else {
    for(let layer=0;layer<3;layer+=1) {
      fin(group,[[0,-0.22],[side*0.28,0.21],[side*(1.04-layer*0.1),0.57],[side*(0.83-layer*0.1),-0.13],[side*0.41,-0.36]],0.7-layer*0.13,[side*0.01,0.43-layer*0.2,layer*0.07],layer===1?materials.paint:materials.ivory);
    }
    plate(group,[0.38,0.64,0.15],[side*reach,-0.48,0.26],materials.ivory,0.09);
    fin(group,[[-0.26,0.44],[0.26,0.44],[0.23,-0.41],[0,-0.7],[-0.23,-0.41]],0.27,[side*reach,-1.47,0.39],materials.ivory);
    fin(group,[[-0.11,0.37],[0.11,0.37],[0,-0.39]],0.04,[side*reach,-1.43,0.565],materials.paint);
    box(group,[0.18,0.055,0.06],[side*reach,-1.29,0.62],materials.cyan);
    for(const offset of [-1,1]) bolt(group,[side*reach+offset*0.18,-1.15,0.56],materials.steel);
  }
  cable(group,[[side*0.31,0.08,-0.39],[side*0.46,-0.6,-0.4],[side*reach,-1.43,-0.08]],0.037,materials.rubber);
  return bake(group);
}

export function makeAdvancedLegs(kind, materials) {
  if (!['reverse','tetrapod','treads'].includes(kind)) return null;
  const group = new THREE.Group();
  group.name = 'Legs_' + kind;
  if (kind === 'reverse') {
    for (const side of [-1,1]) {
      const hip=[side*0.55,2.85,0];
      const knee=[side*0.71,2.15,0.57];
      const hock=[side*0.82,0.9,-0.45];
      const ankle=[side*0.87,0.3,0.25];
      joint(group,hip,0.25,materials);
      joint(group,knee,0.23,materials,0.52);
      joint(group,hock,0.18,materials,0.46);
      strut(group,hip,knee,0.43,0.47,materials.dark);
      strut(group,knee,hock,0.4,0.44,materials.paint);
      strut(group,hock,ankle,0.22,0.25,materials.steel);
      fin(group,[[-0.22,0.41],[0.22,0.41],[0.26,-0.25],[0,-0.48],[-0.26,-0.25]],0.15,[side*0.66,2.48,0.44],materials.ivory,[-0.45,0,0]);
      fin(group,[[-0.27,0.18],[0.27,0.18],[0,-0.36]],0.18,[side*0.71,2.17,0.88],materials.paint);
      box(group,[0.24,0.045,0.06],[side*0.71,2.23,1.0],materials.cyan);
      strut(group,[side*0.79,1.98,0.58],[side*0.87,1.02,-0.24],0.3,0.15,materials.ivory);
      barBetween(group,[side*1.0,2.06,0.35],[side*1.04,0.87,-0.51],0.054,materials.steel);
      plate(group,[0.7,0.22,1.03],[side*0.87,0.19,0.35],materials.dark,0.09);
      for (const toe of [-1,1]) {
        fin(group,[[-0.12,0.08],[0.12,0.08],[0.09,-0.16],[-0.09,-0.16]],0.66,[side*0.87+toe*0.19,0.29,0.72],materials.ivory,[-0.14,0,0]);
      }
      exhaust(group,[side*0.77,1.62,-0.45],0.12,0.42,materials);
    }
    return { legs: [bake(group)], upperOffset: 0 };
  }
  if (kind === 'tetrapod') {
    plate(group,[1.61,0.41,1.6],[0,2.19,0],materials.dark,0.19);
    cylinder(group,0.51,0.47,[0,2.51,0],materials.steel);
    for(const side of [-1,1]) {
      for(const direction of [-1,1]) {
        const hip=[side*0.61,2.27,direction*0.48];
        const knee=[side*1.51,1.71,direction*1.1];
        const ankle=[side*1.81,0.38,direction*1.62];
        joint(group,hip,0.23,materials);
        joint(group,knee,0.22,materials,0.51);
        joint(group,ankle,0.14,materials,0.38);
        strut(group,hip,knee,0.37,0.45,materials.dark);
        strut(group,knee,ankle,0.34,0.4,materials.ivory);
        barBetween(group,[side*1.28,1.97,direction*1.16],[side*1.57,0.67,direction*1.77],0.065,materials.steel);
        plate(group,[0.58,0.38,0.53],[side*1.51,1.74,direction*1.1],materials.paint,0.08);
        box(group,[0.29,0.047,0.045],[side*1.51,1.76,direction*1.4],materials.cyan);
        plate(group,[0.71,0.16,0.8],[side*1.81,0.16,direction*1.72],materials.dark,0.13);
        box(group,[0.51,0.09,0.28],[side*1.81,0.27,direction*1.91],materials.ivory);
      }
    }
    label(group,'TETRA / 04',0.69,[0,2.31,0.83]);
    return { legs: [bake(group)], upperOffset: -0.43 };
  }
  plate(group,[2.59,0.47,2.52],[0,1.24,0],materials.dark,0.16);
  cylinder(group,0.81,0.41,[0,1.51,0],materials.steel, [0,0,0],32);
  ring(group,0.79,0.04,[0,1.71,0],materials.bronze,[Math.PI/2,0,0]);
  for(const side of [-1,1]) {
    const track = new THREE.Group();
    track.position.x = side*1.2;
    box(track,[0.91,0.84,2.3],[0,0.65,0],materials.dark,0.21);
    for(let index=0;index<5;index+=1) {
      cylinder(track,0.29,0.99,[0,0.52,-1.02+index*0.51],materials.rubber,[0,0,Math.PI/2]);
      cylinder(track,0.19,1.01,[0,0.52,-1.02+index*0.51],materials.steel,[0,0,Math.PI/2],12);
    }
    for(let index=0;index<32;index+=1) {
      const angle=index/32*Math.PI*2;
      const center=angle<Math.PI?1.02:-1.02;
      box(track,[1.04,0.095,0.2],[0,0.62+Math.cos(angle)*0.48,center+Math.sin(angle)*0.48],materials.rubber,0.01,[angle,0,0]);
    }
    for(const height of [0.14,1.1]) {
      for(let index=0;index<11;index+=1) box(track,[1.03,0.095,0.15],[0,height,-1.0+index*0.2],materials.rubber,0.01);
    }
    plate(track,[1.08,0.28,2.8],[0,1.24,0],materials.paint,0.12);
    for(let index=0;index<3;index+=1) box(track,[1.1,0.055,0.41],[0,1.42,-0.83+index*0.83],materials.ivory);
    box(track,[0.41,0.075,0.07],[0,1.28,1.46],materials.amber);
    group.add(track);
  }
  plate(group,[1.3,0.55,0.17],[0,1.08,1.29],materials.ivory,0.1,[0.22,0,0]);
  label(group,'LANDSHIP',0.84,[0,1.18,1.42],'#273943');
  return { legs: [bake(group)], upperOffset: -1.27 };
}


export function makeAdvancedWeapon(kind, materials) {
  if (!['gatling','missiles','beamblade'].includes(kind)) return null;
  const group = new THREE.Group();
  group.name = 'Weapon_' + kind;
  group.position.set(1.74,3.31,0.5);
  const muzzle = new THREE.Object3D();
  let rotor = null;
  if (kind === 'gatling') {
    cylinder(group,0.43,0.95,[0,0,0.06],materials.dark,[Math.PI/2,0,0],24);
    plate(group,[0.9,0.25,0.86],[0,0.41,0.05],materials.paint,0.055);
    cylinder(group,0.34,0.42,[0.52,-0.05,-0.13],materials.steel,[0,0,Math.PI/2],24);
    cylinder(group,0.27,0.46,[0.54,-0.05,-0.13],materials.dark,[0,0,Math.PI/2],20);
    box(group,[0.31,0.11,0.04],[0,0.41,0.5],materials.caution);
    bake(group);
    rotor = new THREE.Group();
    rotor.name = 'VULCAN_Rotor';
    for(let index=0;index<6;index+=1) {
      const angle=index/6*Math.PI*2;
      const offsetX=Math.cos(angle)*0.26;
      const offsetY=Math.sin(angle)*0.26;
      cylinder(rotor,0.08,1.78,[offsetX,offsetY,1.34],materials.steel,[Math.PI/2,0,0],10);
      cylinder(rotor,0.095,0.18,[offsetX,offsetY,2.26],materials.dark,[Math.PI/2,0,0],10);
      cylinder(rotor,0.051,0.012,[offsetX,offsetY,2.357],materials.black,[Math.PI/2,0,0],10);
    }
    for(const position of [0.52,1.69,2.16]) ring(rotor,0.34,0.065,[0,0,position],materials.dark);
    for(const position of [0.6,1.78]) ring(rotor,0.355,0.013,[0,0,position],materials.cyan);
    bake(rotor);
    group.add(rotor);
    muzzle.position.set(0,0,2.37);
  } else if (kind === 'missiles') {
    plate(group,[0.94,0.91,1.21],[0,0.05,0.46],materials.dark,0.15);
    plate(group,[1.02,0.13,1.24],[0,0.6,0.42],materials.paint,0.035);
    for(const side of [-1,1]) plate(group,[0.13,0.93,1.25],[side*0.53,0.05,0.42],materials.ivory,0.035);
    for(let row=0;row<2;row+=1) {
      for(let column=0;column<3;column+=1) {
        const position=[-0.29+column*0.29,-0.18+row*0.39,1.085];
        cylinder(group,0.13,0.08,position,materials.steel,[Math.PI/2,0,0],12);
        cylinder(group,0.091,0.1,[position[0],position[1],1.092],materials.black,[Math.PI/2,0,0],12);
        cylinder(group,0.045,0.105,[position[0],position[1],1.11],materials.amber,[Math.PI/2,0,0],12);
      }
    }
    label(group,'HV / 06',0.52,[0,0.45,1.11]);
    bake(group);
    muzzle.position.set(0,0.12,1.24);
  } else {
    group.position.set(1.69,2.49,0.69);
    box(group,[0.17,0.7,0.19],[0,0,0],materials.dark);
    for(let index=0;index<5;index+=1) ring(group,0.115,0.017,[0,-0.24+index*0.12,0],materials.steel,[Math.PI/2,0,0]);
    fin(group,[[-0.49,0.08],[0.49,0.08],[0.3,-0.09],[-0.3,-0.09]],0.22,[0,0.36,0],materials.bronze);
    fin(group,[[-0.25,0],[0.25,0],[0.17,2.43],[0,2.83],[-0.17,2.43]],0.065,[0,0.48,0.015],materials.cyan);
    fin(group,[[-0.068,0],[0.068,0],[0.045,2.45],[0,2.69],[-0.045,2.45]],0.091,[0,0.5,0.04],materials.white);
    plate(group,[0.35,0.41,0.19],[0,0.63,0],materials.ivory,0.06);
    bake(group);
    muzzle.position.set(0,3.16,0.04);
  }
  muzzle.name = 'Muzzle';
  group.add(muzzle);
  return { group, muzzle, rotor };
}

export function makeBackpack(kind, materials) {
  const group = new THREE.Group();
  group.name = 'Backpack_' + kind;
  group.position.set(0,4.2,-0.83);
  box(group,[0.91,1.1,0.47],[0,0,0],materials.dark,0.09);
  if (kind === 'compact') {
    for(const side of [-1,1]) {
      cylinder(group,0.23,1.18,[side*0.56,-0.07,0.03],materials.paint);
      exhaust(group,[side*0.56,-0.71,0.03],0.26,0.22,materials,[0,0,0]);
      ring(group,0.235,0.04,[side*0.56,0.19,0.03],materials.steel,[Math.PI/2,0,0]);
      cable(group,[[side*0.43,0.45,-0.02],[side*0.93,0.2,-0.08],[side*0.82,-0.46,0.23]],0.052,materials.rubber);
    }
    for(let index=0;index<8;index+=1) box(group,[0.62,0.027,0.04],[0,-0.22+index*0.065,-0.25],materials.steel,0.005);
  } else if (kind === 'wings') {
    for(const side of [-1,1]) {
      const wing = new THREE.Group();
      wing.position.set(side*0.49,0.04,-0.2);
      wing.rotation.y=side*-0.22;
      fin(wing,[[0,-0.4],[side*0.32,0.77],[side*2.46,2.08],[side*1.51,-0.32],[side*0.74,-0.79]],0.16,[0,0,0],materials.ivory);
      fin(wing,[[side*0.23,-0.25],[side*0.46,0.63],[side*2.23,1.89],[side*1.31,0.02],[side*0.76,-0.46]],0.043,[0,0,0.115],materials.paint);
      fin(wing,[[side*0.79,-0.3],[side*1.49,0.52],[side*1.16,-1.27],[side*0.8,-0.73]],0.1,[0,0,-0.1],materials.ivory);
      for(let index=0;index<3;index+=1) {
        strut(wing,[side*(0.64+index*0.36),0.32+index*0.29,0.145],[side*(0.71+index*0.36),-0.15+index*0.29,0.145],0.021,0.012,materials.steel);
      }
      exhaust(wing,[side*1.39,-0.34,-0.17],0.16,0.46,materials,[0,0,side*-0.2]);
      group.add(wing);
    }
    plate(group,[0.5,1.35,0.32],[0,-0.17,-0.38],materials.paint,0.12);
  } else if (kind === 'missilepack') {
    for(const side of [-1,1]) {
      plate(group,[0.82,1.72,0.82],[side*0.81,0.38,-0.17],materials.dark,0.11);
      plate(group,[0.85,1.66,0.16],[side*0.81,0.38,-0.65],materials.paint,0.09);
      plate(group,[0.87,0.2,0.91],[side*0.81,1.26,-0.15],materials.ivory,0.04);
      for(let row=0;row<3;row+=1) {
        for(let column=0;column<2;column+=1) {
          cylinder(group,0.116,0.07,[side*0.81-0.2+column*0.4,0.45+row*0.28,0.29],materials.steel,[Math.PI/2,0,0],12);
          cylinder(group,0.073,0.08,[side*0.81-0.2+column*0.4,0.45+row*0.28,0.302],materials.black,[Math.PI/2,0,0],10);
        }
      }
      cylinder(group,0.115,1.21,[side*1.25,0.79,0.38],materials.dark,[Math.PI/2,0,0],12);
      cylinder(group,0.15,0.15,[side*1.25,0.79,1.01],materials.steel,[Math.PI/2,0,0],12);
      exhaust(group,[side*0.79,-0.71,-0.25],0.24,0.35,materials,[0,0,0]);
    }
  } else if (kind === 'funnels') {
    for(const side of [-1,1]) {
      for(let index=0;index<3;index+=1) {
        const module=new THREE.Group();
        module.position.set(side*(0.85+index*0.39),0.43+index*0.21,-0.22-index*0.16);
        module.rotation.z=side*(-0.17-index*0.19);
        fin(module,[[-0.12,-0.85],[0.12,-0.85],[0.17,0.53],[0,1.16],[-0.17,0.53]],0.18,[0,0,0],materials.ivory);
        fin(module,[[-0.081,-0.55],[0.081,-0.55],[0.09,0.41],[0,0.67],[-0.09,0.41]],0.045,[0,0,0.125],materials.paint);
        box(module,[0.045,0.51,0.035],[0,0.12,0.165],materials.cyan);
        exhaust(module,[0,-0.83,-0.02],0.085,0.13,materials,[0,0,0]);
        group.add(module);
      }
      strut(group,[side*0.21,0.1,-0.01],[side*1.51,0.79,-0.39],0.13,0.16,materials.steel);
    }
  } else if(kind === 'reactorpack') {
    cylinder(group,0.56,0.57,[0,0,-0.32],materials.steel,[Math.PI/2,0,0]);
    ring(group,1.24,0.13,[0,0,-0.38],materials.dark);
    ring(group,1.23,0.043,[0,0,-0.55],materials.cyan);
    for(let index=0;index<12;index+=1) {
      const angle=index/12*Math.PI*2;
      strut(group,[Math.cos(angle)*0.51,Math.sin(angle)*0.51,-0.39],[Math.cos(angle)*1.13,Math.sin(angle)*1.13,-0.39],0.09,0.12,materials.steel);
      plate(group,[0.18,0.53,0.23],[Math.sin(angle)*1.25,Math.cos(angle)*1.25,-0.4],index%3?materials.ivory:materials.paint,0.04,[0,0,-angle]);
    }
  } else {
    for(const side of [-1,1]) {
      plate(group,[0.52,0.85,1.41],[side*0.69,-0.05,-0.2],materials.paint,0.11,[0.13,side*-0.15,0]);
      exhaust(group,[side*0.74,-0.18,-1.05],0.44,0.48,materials);
      for(const level of [-1,1]) box(group,[0.35,0.08,0.63],[side*0.72,level*0.33,-0.49],materials.ivory);
      joint(group,[side*0.46,0.08,0.03],0.24,materials);
    }
    plate(group,[0.51,1.34,0.46],[0,-0.12,-0.13],materials.ivory,0.15);
  }
  return bake(group);
}


export function makeAdvancedHead(kind, materials) {
  if (!['wedge','monoeye','vcrest'].includes(kind)) return null;
  const group = new THREE.Group();
  group.name = 'Head_' + kind;
  group.position.set(0,4.84,0.06);
  cylinder(group,0.2,0.32,[0,0.09,0],materials.steel);
  if (kind === 'wedge') {
    fin(group,[[-0.24,-0.25],[0.24,-0.25],[0.39,0.09],[0,0.39],[-0.39,0.09]],0.75,[0,0.46,0.18],materials.ivory,[-0.2,0,0]);
    fin(group,[[-0.21,0.1],[0.21,0.1],[0,-0.23]],0.12,[0,0.46,0.65],materials.dark);
    box(group,[0.27,0.034,0.02],[0,0.46,0.72],materials.cyan);
    for (const side of [-1,1]) fin(group,[[0,0],[side*0.58,0.57],[side*0.36,-0.21]],0.11,[side*0.28,0.51,-0.17],materials.paint,[0,side*0.4,0]);
  } else if (kind === 'monoeye') {
    plate(group,[0.94,0.66,0.66],[0,0.48,0.02],materials.dark,0.23);
    plate(group,[0.98,0.26,0.72],[0,0.77,0.0],materials.paint,0.08);
    plate(group,[0.99,0.16,0.72],[0,0.2,0.04],materials.ivory,0.05);
    box(group,[0.76,0.19,0.04],[0,0.48,0.37],materials.black);
    cylinder(group,0.081,0.042,[0.065,0.48,0.415],materials.red,[Math.PI/2,0,0]);
    ring(group,0.085,0.022,[0.065,0.48,0.435],materials.steel);
    for(const side of [-1,1]) cable(group,[[side*0.44,0.54,0.11],[side*0.56,0.2,0.4],[side*0.22,0.16,0.46]],0.045,materials.rubber);
    barBetween(group,[-0.33,0.8,-0.17],[-0.4,1.23,-0.2],0.014,materials.steel);
  } else {
    fin(group,[[-0.29,-0.35],[0,-0.5],[0.29,-0.35],[0.4,0.2],[0.24,0.41],[-0.24,0.41],[-0.4,0.2]],0.61,[0,0.58,0.02],materials.ivory);
    fin(group,[[-0.21,0.18],[0.21,0.18],[0.17,-0.22],[0,-0.35],[-0.17,-0.22]],0.08,[0,0.46,0.38],materials.dark);
    for(const side of [-1,1]) {
      box(group,[0.135,0.046,0.035],[side*0.119,0.55,0.445],materials.cyan,0.006,[0,0,side*0.1]);
      fin(group,[[0,0],[side*0.77,0.64],[side*0.53,0.03],[side*0.1,-0.11]],0.052,[side*0.07,0.79,0.39],materials.bronze);
      fin(group,[[0,0],[side*0.49,0.7],[side*0.26,0.17]],0.038,[side*0.14,0.8,0.31],materials.ivory);
      plate(group,[0.16,0.41,0.13],[side*0.35,0.36,0.31],materials.ivory,0.04,[0,0,side*-0.17]);
    }
    fin(group,[[-0.09,0.07],[0.09,0.07],[0,-0.15]],0.09,[0,0.31,0.46],materials.paint);
    box(group,[0.1,0.13,0.06],[0,0.84,0.48],materials.cyan);
  }
  return bake(group);
}
