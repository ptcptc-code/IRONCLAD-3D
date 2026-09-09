import * as THREE from 'three';

const TAU = Math.PI * 2;
const EPS = 1e-6;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const fraction = value => value - Math.floor(value);
const smooth = value => value * value * (3 - 2 * value);
const finite = value => Number.isFinite(value) ? value : 0;
const capture = node => ({ position: node.position.clone(), quaternion: node.quaternion.clone() });
const restore = (node, rest) => { node.position.copy(rest.position); node.quaternion.copy(rest.quaternion); };

function discover(root) {
  const nodes = { hip: [], wheel: [], pod: [], tread: [] };
  root.traverse(node => {
    const list = nodes[node.userData.locomotionJoint];
    if (Array.isArray(list)) list.push(node);
  });
  return nodes;
}

function makeLeg(hip, root, index, total) {
  const knee = hip.children.find(node => node.userData.locomotionJoint === 'knee');
  const foot = knee?.children.find(node => node.userData.locomotionJoint === 'foot');
  if (!knee || !foot) return null;
  const inverse = hip.parent.matrixWorld.clone().invert();
  const origin = hip.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse);
  const a = knee.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse).sub(origin);
  const b = foot.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse).sub(origin).sub(a);
  const l1 = a.length(); const l2 = b.length();
  if (l1 < EPS || l2 < EPS) return null;
  const reach = a.clone().add(b).normalize();
  const bend = a.clone().addScaledVector(reach, -a.dot(reach));
  if (bend.lengthSq() < EPS) {
    bend.set(0, 0, hip.userData.kneeBend === -1 ? -1 : 1);
    bend.addScaledVector(reach, -bend.dot(reach));
  }
  if (bend.lengthSq() < EPS) return null;
  bend.normalize();
  const worldFoot = foot.getWorldPosition(new THREE.Vector3());
  const footBounds = new THREE.Box3().setFromObject(foot);
  const scaleY = Math.max(EPS, Math.abs(root.getWorldScale(new THREE.Vector3()).y));
  const soleHeight = footBounds.isEmpty() ? 0 : (worldFoot.y - footBounds.min.y) / scaleY;
  const restFoot = root.worldToLocal(worldFoot.clone());
  const footQ = root.getWorldQuaternion(new THREE.Quaternion()).invert()
    .multiply(foot.getWorldQuaternion(new THREE.Quaternion()));
  const side = Number(hip.userData.legSide) || (index % 2 ? 1 : -1);
  const front = Number(hip.userData.legFront) || 1;
  return {
    hip, knee, foot, l1, l2, a: a.normalize(), b: b.normalize(), bend, restFoot, footQ, soleHeight,
    hipRest: capture(hip), kneeRest: capture(knee), footRest: capture(foot),
    combinedQ: hip.quaternion.clone().multiply(knee.quaternion),
    offset: total === 4 ? (side * front > 0 ? 0.5 : 0) : (side > 0 ? 0.5 : 0),
    plant: worldFoot.clone(), launch: worldFoot.clone(), target: worldFoot.clone(),
    previous: -1, planted: false, clamped: false,
  };
}

function makeWheel(node) {
  const radius = Number(node.userData.wheelRadius ?? node.userData.radius);
  if (!(radius > EPS)) return null;
  const rawAxis = node.userData.wheelAxis;
  const axis = Array.isArray(rawAxis) ? new THREE.Vector3().fromArray(rawAxis)
    : new THREE.Vector3(rawAxis === 'y' ? 0 : rawAxis === 'z' ? 0 : 1, rawAxis === 'y' ? 1 : 0, rawAxis === 'z' ? 1 : 0);
  if (axis.lengthSq() < EPS) return null;
  return { node, rest: capture(node), radius, axis: axis.normalize(), angle: 0 };
}

function animateFeet(legs, root, state, work, delta) {
  const scaleY = Math.abs(work.scale.y);
  const stepLength = state.stride * Math.abs(work.scale.z);
  const settle = 1 - Math.exp(-10 * delta);
  for (const leg of legs) {
    if (!state.moving) {
      leg.hip.quaternion.slerp(leg.hipRest.quaternion, settle);
      leg.knee.quaternion.slerp(leg.kneeRest.quaternion, settle);
      leg.foot.quaternion.slerp(leg.footRest.quaternion, settle);
      leg.previous = -1; leg.planted = false; leg.clamped = false;
      continue;
    }
    work.neutral.copy(leg.restFoot).applyMatrix4(root.matrixWorld);
    work.neutral.y = state.ground + leg.soleHeight * scaleY;
    const p = fraction(state.phase + leg.offset);
    const inStance = p < state.stance;
    work.landing.copy(work.neutral).addScaledVector(work.forward, stepLength * state.stance * 0.5);
    if (leg.previous < 0) {
      leg.foot.getWorldPosition(leg.target);
      leg.target.y = work.neutral.y;
      leg.plant.copy(leg.target); leg.launch.copy(leg.target);
    }
    if (inStance) {
      if (leg.previous >= state.stance) {
        // Account for the part of this frame already spent in stance after wrapping.
        leg.plant.copy(work.landing).addScaledVector(work.forward, -p * stepLength);
      }
      // A fixed world-space target cancels root translation and turning in stance.
      leg.target.copy(leg.plant); leg.target.y = work.neutral.y;
      leg.planted = true;
    } else {
      if (leg.previous >= 0 && leg.previous < state.stance) leg.launch.copy(leg.target);
      const t = (p - state.stance) / (1 - state.stance);
      leg.target.lerpVectors(leg.launch, work.landing, smooth(t));
      leg.target.y = work.neutral.y + Math.sin(Math.PI * t) * state.lift * scaleY;
      leg.planted = false;
    }
    leg.previous = p;
    solveLeg(leg, work);
  }
}

function animateAccessories(wheels, treads, pods, arms, distance, blend, phase, speed, work) {
  for (const wheel of wheels) {
    wheel.angle += distance / wheel.radius;
    wheel.node.quaternion.copy(wheel.rest.quaternion);
    work.deltaQ.setFromAxisAngle(wheel.axis, wheel.angle);
    wheel.node.quaternion.multiply(work.deltaQ);
  }
  for (const tread of treads) {
    tread.distance += distance;
    tread.node.userData.locomotionDistance = tread.distance;
  }
  for (const pod of pods) {
    restore(pod.node, pod.rest);
    pod.node.rotation.x += clamp(speed * 0.01, -0.1, 0.1) * blend;
    pod.node.rotation.z += Math.sin(phase * TAU) * 0.025 * blend;
  }
  for (const arm of arms) arm.node.quaternion.slerp(arm.rest.quaternion, 1 - Math.exp(-8 * (blend + 0.01)));
}

function makeTread(node) {
  const data = node.userData;
  const radius = Number(data.trackRadius);
  const halfLength = Number(data.trackHalfLength);
  if (!(radius > EPS) || !(halfLength >= 0) || !Number.isFinite(data.trackPhase)) return null;
  const rest = capture(node);
  return { node, rest, radius, halfLength, phase: data.trackPhase, distance: 0,
    centerY: Number(data.trackCenterY) || 0, centerZ: Number(data.trackCenterZ) || 0,
    length: halfLength * 4 + TAU * radius,
  };
}

function animateBody(poseRoot, base, kind, blend, elapsed, speed, phase, reach, work) {
  restore(poseRoot, base);
  const hover = kind === 'hover';
  const bob = hover ? Math.sin(elapsed * 2.1) * 0.05
    : Math.sin(elapsed * 1.6) * 0.003 * (1 - blend);
  // Negative compression creates reach headroom without changing world grounding.
  poseRoot.position.y += bob - (hover || kind === 'treads' ? 0 : reach * 0.06 * blend);
  const lean = hover ? clamp(speed * 0.018, -0.12, 0.12) : clamp(speed * 0.006, -0.025, 0.025) * blend;
  work.deltaQ.setFromAxisAngle(work.axis, lean);
  poseRoot.quaternion.multiply(work.deltaQ);
}

function makeWork(root) {
  return {
    inverse: new THREE.Matrix4(), goal: new THREE.Vector3(), direction: new THREE.Vector3(),
    bend: new THREE.Vector3(), upper: new THREE.Vector3(), lower: new THREE.Vector3(),
    hipQ: new THREE.Quaternion(), kneeQ: new THREE.Quaternion(), footQ: new THREE.Quaternion(),
    tempQ: new THREE.Quaternion(), rootQ: new THREE.Quaternion(), deltaQ: new THREE.Quaternion(),
    world: new THREE.Vector3(), forward: new THREE.Vector3(), scale: new THREE.Vector3(),
    landing: new THREE.Vector3(), neutral: new THREE.Vector3(), axis: new THREE.Vector3(1, 0, 0),
    previousRoot: root.getWorldPosition(new THREE.Vector3()),
  };
}

// Two-bone analytic IK in the authored bend plane; lateral spread is not flattened.
function solveLeg(leg, work) {
  const { hip, knee, foot } = leg;
  hip.parent.updateWorldMatrix(true, false);
  work.inverse.copy(hip.parent.matrixWorld).invert();
  work.goal.copy(leg.target).applyMatrix4(work.inverse).sub(leg.hipRest.position);
  const raw = work.goal.length();
  if (raw < EPS) return;
  work.direction.copy(work.goal).multiplyScalar(1 / raw);
  const length = clamp(raw, Math.abs(leg.l1 - leg.l2) + EPS, leg.l1 + leg.l2 - EPS);
  leg.clamped = Math.abs(raw - length) > 0.005;
  work.bend.copy(leg.bend).addScaledVector(work.direction, -leg.bend.dot(work.direction)).normalize();
  const along = (leg.l1 * leg.l1 + length * length - leg.l2 * leg.l2) / (2 * length);
  const height = Math.sqrt(Math.max(0, leg.l1 * leg.l1 - along * along));
  work.upper.copy(work.direction).multiplyScalar(along).addScaledVector(work.bend, height);
  work.lower.copy(work.direction).multiplyScalar(length).sub(work.upper).normalize();
  work.upper.normalize();
  work.hipQ.setFromUnitVectors(leg.a, work.upper).multiply(leg.hipRest.quaternion);
  work.kneeQ.setFromUnitVectors(leg.b, work.lower).multiply(leg.combinedQ);
  work.tempQ.copy(work.hipQ).invert();
  work.kneeQ.premultiply(work.tempQ);
  hip.quaternion.copy(work.hipQ); knee.quaternion.copy(work.kneeQ);
  knee.updateWorldMatrix(true, false);
  knee.getWorldQuaternion(work.tempQ).invert();
  work.footQ.copy(work.rootQ).multiply(leg.footQ).premultiply(work.tempQ);
  foot.quaternion.copy(work.footQ);
}

// Main owns root travel/grounding. Apply combat pose overrides AFTER update().
export function createLocomotion(mech, kind = mech.root.userData.configuration?.legs || 'biped') {
  const { root, poseRoot } = mech;
  if (!poseRoot) throw new Error('createLocomotion requires mech.poseRoot');
  root.updateWorldMatrix(true, true);
  const nodes = discover(poseRoot);
  const legs = nodes.hip.map((hip, i) => makeLeg(hip, root, i, nodes.hip.length)).filter(Boolean);
  const wheels = nodes.wheel.map(makeWheel).filter(Boolean);
  const treads = nodes.tread.map(makeTread).filter(Boolean);
  const pods = nodes.pod.map(node => ({ node, rest: capture(node) }));
  const arms = (mech.arms || []).map((node, i) => ({ node, rest: mech.armRest?.[i] || capture(node) }));
  const base = capture(poseRoot);
  const work = makeWork(root);
  const ready = kind === 'hover' ? pods.length > 0 : kind === 'treads' ? wheels.length > 0 : legs.length >= 2;
  const reach = legs.length ? legs.reduce((sum, leg) => sum + leg.l1 + leg.l2, 0) / legs.length : 2;
  const stride = reach * (kind === 'tetrapod' ? 0.42 : 0.48);
  const stance = 0.64;
  let phase = 0, travel = 0, blend = 0, movingNow = false, ground = 0;
  const state = { stride, stance, lift: reach * 0.085, phase: 0, ground: 0, moving: false };
  function reset() {
    phase = travel = blend = 0; movingNow = false; ground = 0;
    restore(poseRoot, base);
    for (const leg of legs) {
      restore(leg.hip, leg.hipRest); restore(leg.knee, leg.kneeRest); restore(leg.foot, leg.footRest);
      leg.previous = -1; leg.planted = leg.clamped = false;
    }
    for (const item of [...wheels, ...treads, ...pods, ...arms]) restore(item.node, item.rest);
    for (const wheel of wheels) wheel.angle = 0;
    root.getWorldPosition(work.previousRoot);
  }
  function update(delta, { distance = 0, moving = false, elapsed = 0, speed = 0, groundHeight = 0 } = {}) {
    const dt = clamp(finite(delta), 0, 0.1);
    const d = finite(distance);
    movingNow = Boolean(moving) && Math.abs(d) > EPS;
    ground = finite(groundHeight);
    travel += Math.abs(d);
    root.updateWorldMatrix(true, false);
    root.getWorldQuaternion(work.rootQ); root.getWorldScale(work.scale);
    root.getWorldPosition(work.world);
    work.forward.copy(work.world).sub(work.previousRoot); work.forward.y = 0;
    if (work.forward.lengthSq() > EPS) work.forward.normalize();
    else work.forward.set(0, 0, d < 0 ? -1 : 1).applyQuaternion(work.rootQ).normalize();
    work.previousRoot.copy(work.world);
    const worldScale = Math.max(EPS, Math.abs(work.scale.z));
    phase = fraction(phase + (movingNow ? Math.abs(d) / (stride * worldScale) : 0));
    blend += ((movingNow ? 1 : 0) - blend) * (1 - Math.exp(-10 * dt));
    if (blend < 0.0001) blend = 0;
    animateBody(poseRoot, base, kind, blend, finite(elapsed), finite(speed), phase, reach, work);
    state.phase = phase; state.ground = ground; state.moving = movingNow;
    animateFeet(legs, root, state, work, dt);
    animateAccessories(wheels, treads, pods, arms, d / worldScale, blend, phase, finite(speed), work);
  }
  return { update, reset, diagnostics: () => ({
    kind, locomotionReady: ready, legs: legs.length, joints: legs.length * 3,
    wheels: wheels.length, pods: pods.length, treadLinks: treads.length, phase, travel,
    moving: movingNow, groundHeight: ground, clampedLegs: legs.filter(leg => leg.clamped).length,
    warnings: ready ? (nodes.tread.length !== treads.length ? ['Unsupported tread path metadata; those links remain static.'] : [])
      : ['Missing valid rigid pivots; fallback geometry is not animated as fake legs.'],
  }) };
}
