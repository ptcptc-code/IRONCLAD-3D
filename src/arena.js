import * as THREE from 'three';
import { box, ring, label, cylinder, barBetween, bake } from './assets.js';

export function createArena(materials) {
  const group = new THREE.Group(); group.name = 'TRAINING_ARENA_09';
  const shell = new THREE.Group(); shell.name = 'Arena_Static_Shell'; group.add(shell);
  box(shell, [38, 0.32, 32], [0, -0.08, -43], materials.floor);
  for (const x of [-19, 19]) { box(shell, [1.1, 5.4, 32], [x, 2.7, -43], materials.wall); for (let z=-57; z<=-29; z+=7) box(shell,[1.7,6.8,0.8],[x,3.3,z],materials.dark); }
  // The arena mouth at z=-27 stays open; the launch lane enters the yard without clipping through a front wall.
  // Keep only the far blast wall, behind all combat and return waypoints.
  box(shell,[38,5.4,1.1],[0,2.7,-59],materials.wall);
  const lane = new THREE.Group(); lane.name='Launch_Lane'; group.add(lane);
  box(lane,[9.4,0.28,25],[0,0.14,-27.5],materials.dark);
  for (const x of [-4.2,4.2]) box(lane,[0.14,0.035,24],[x,0.31,-27.5],materials.cyan);
  box(lane,[0.18,0.04,24],[0,0.32,-27.5],materials.amber);
  for (let z=-31; z>=-56; z-=5) box(shell,[30,0.08,0.12],[0,0.34,z],materials.steel);
  const booth=new THREE.Group(); booth.name='Observation_Booth'; group.add(booth);
  box(booth,[7,4.8,3.2],[13.8,2.4,-53.5],materials.dark,0.12); box(booth,[6.2,2.1,0.08],[13.8,3.25,-51.85],materials.glass); label(booth,'CONTROL',1.5,[13.8,4,-51.82],'#71e9ef');
  for (const x of [-8,-3,3,8]) { box(group,[2.4,2.8,0.28],[x,1.4,-57.8],materials.dark,0.08); box(group,[1.8,1.5,0.06],[x,1.65,-57.62],materials.caution); box(group,[1.35,1.05,0.08],[x,1.67,-57.56],materials.red); }
  label(group,'TRAINING / 09',4.2,[0,4.9,-58.25],'#d4ded9');
  const detail = new THREE.Group(); detail.name = 'Arena_Observation_Detail_Static'; group.add(detail);
  for (const x of [-15, -5, 5, 15]) {
    box(detail, [0.18, 3.4, 0.18], [x, 1.7, -30], materials.steel, 0.03);
    box(detail, [1.3, 0.12, 0.42], [x, 3.35, -30], materials.dark, 0.03);
    box(detail, [1.0, 0.035, 0.06], [x, 3.42, -29.78], materials.cyan, 0);
  }
  for (const x of [-14, 14]) {
    box(detail, [4.8, 0.22, 0.22], [x, 5.5, -43], materials.steel, 0.03);
    barBetween(detail, [x - Math.sign(x) * 2.1, 1, -43], [x, 5.4, -43], 0.08, materials.dark);
    barBetween(detail, [x + Math.sign(x) * 2.1, 1, -43], [x, 5.4, -43], 0.08, materials.dark);
  }
  for (const x of [-7.5, 7.5]) {
    cylinder(detail, 0.34, 2.8, [x, 1.4, -38], materials.dark, [0, 0, 0], 12);
    ring(detail, 0.34, 0.045, [x, 2.82, -38], materials.amber, [Math.PI / 2, 0, 0]);
    box(detail, [0.12, 2.1, 0.12], [x, 3.8, -38], materials.steel, 0.02);
  }
  bake(detail);
  const active=[]; for (const x of [-15,15]) { const lamp=new THREE.Group(); box(lamp,[0.45,6,0.45],[0,3,0],materials.steel); box(lamp,[0.65,0.18,0.65],[0,6.1,0],materials.amber); lamp.position.set(x,0,-43); group.add(lamp); active.push(lamp); }
  const target=new THREE.Group(); target.name='Target_Props'; group.add(target); box(target,[1.8,3.2,0.3],[0,1.6,-43],materials.dark); box(target,[1.35,2.65,0.06],[0,1.65,-42.82],materials.red); ring(target,0.55,0.06,[0,1.65,-42.75],materials.cyan,[Math.PI/2,0,0]);
  const lights=[]; for(const x of [-12,12]) { const light=new THREE.PointLight(x<0?0x72e9ef:0xffb85c,3.2,24); light.position.set(x,6,-43); light.castShadow=true; group.add(light); lights.push(light); }
  const playerPosition=new THREE.Vector3(-5.5,0,-40), enemyPosition=new THREE.Vector3(5.5,0,-46), arenaTarget=new THREE.Vector3(0,2.8,-43);
  const setActive=activeState=>{ active.forEach(o=>o.visible=activeState); target.visible=activeState; lights.forEach(l=>l.visible=activeState); };
  setActive(false);
  return {group, playerPosition, enemyPosition, target:arenaTarget, setActive, update(delta,elapsed){ if(target.visible) target.rotation.y=elapsed*0.7; }, lights, bounds:{minX:-19,maxX:19,minZ:-59,maxZ:-27}};
}
