import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = v => Number.isFinite(v) ? v : 0;

/** Shoulder camera with optional scene collision raycasts. */
export function createPlayerCamera(camera, scene, options = {}) {
  if (!camera) throw new Error('createPlayerCamera requires a camera');
  const collisionGroup = options.collisionGroup || options.collisionRoot || null;
  const raycaster = new THREE.Raycaster();
  const desired = new THREE.Vector3();
  const target = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const aim = new THREE.Vector3();
  let enabled = options.enabled !== false;
  let yaw = finite(options.yaw ?? 0);
  let pitch = finite(options.pitch ?? 0.25);
  let distance = finite(options.distance ?? 7);
  const initial = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: camera.fov };
  const shoulder = finite(options.shoulder ?? 1.35);
  const height = finite(options.height ?? 2.4);
  const minDistance = Math.max(0.05, finite(options.minDistance ?? 0.65));
  const maxPitch = finite(options.maxPitch ?? 1.25);
  const minPitch = finite(options.minPitch ?? -0.45);
  const smooth = Math.max(0, finite(options.smoothing ?? 14));
  const collisionPadding = Math.max(0, finite(options.collisionPadding ?? 0.25));
  function setEnabled(value) { enabled = Boolean(value); }
  function reset() { yaw = finite(options.yaw ?? 0); pitch = finite(options.pitch ?? 0.25); distance = finite(options.distance ?? 7); camera.position.copy(initial.position); camera.quaternion.copy(initial.quaternion); if (initial.fov != null) camera.fov = initial.fov; }
  function collisionObjects() { if (Array.isArray(collisionGroup)) return collisionGroup; if (collisionGroup?.isObject3D) return collisionGroup.children?.length ? collisionGroup.children : [collisionGroup]; return scene?.children || []; }
  const basisForward = new THREE.Vector3();
  const basisRight = new THREE.Vector3();
  function getBasis() {
    // Yaw is camera-owned. Forward is the horizontal direction the camera aims toward.
    basisForward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
    basisRight.set(-basisForward.z, 0, basisForward.x).normalize();
    return { forward: basisForward.clone(), right: basisRight.clone(), yaw, pitch };
  }
  function update(delta = 0, playerRoot, aimPoint, state = {}) {
    if (!enabled || !playerRoot) return camera;
    const input = state.input || state;
    const look = input.look || state.look;
    yaw -= finite(look?.x) * finite(options.lookSpeed ?? 0.0025);
    pitch = clamp(pitch - finite(look?.y) * finite(options.lookSpeed ?? 0.0025), minPitch, maxPitch);
    playerRoot.getWorldPosition(origin);
    aim.copy(aimPoint?.isVector3 ? aimPoint : origin).add(new THREE.Vector3(0, height, 0));
    offset.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    desired.copy(aim).addScaledVector(offset, distance).add(new THREE.Vector3(shoulder, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
    const objects = collisionObjects();
    if (objects.length) {
      raycaster.set(aim, desired.clone().sub(aim).normalize()); raycaster.far = distance + shoulder + 1;
      const hits = raycaster.intersectObjects(objects, true).filter(hit => hit.object.visible && hit.distance > 0.05);
      if (hits.length) desired.copy(hits[0].point).addScaledVector(raycaster.ray.direction, -collisionPadding).lerp(aim, 0.02);
    }
    const factor = smooth > 0 ? 1 - Math.exp(-smooth * clamp(finite(delta), 0, 0.1)) : 1;
    camera.position.lerp(desired, factor); target.lerp(aim, factor); camera.lookAt(target); camera.updateMatrixWorld();
    state.cameraYaw = yaw; state.cameraPitch = pitch; state.cameraDistance = camera.position.distanceTo(aim);
    const basis = getBasis(); state.cameraBasis = basis;
    return basis;
  }
  return { update, setEnabled, reset, getBasis, getAimPoint: () => aim.clone() };
}
