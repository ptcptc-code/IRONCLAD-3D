import * as THREE from 'three';

const smooth = value => value * value * (3 - 2 * value);
const lerpAngle = (from, to, amount) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * amount;

export function createRenderClock() {
  const jobs = new Set();
  return {
    tween(duration, update = () => {}) {
      return new Promise((resolve, reject) => {
        const job = { duration: Math.max(0.001, duration), age: 0, update, resolve, reject };
        jobs.add(job);
        try { update(0, 0); } catch (error) { jobs.delete(job); reject(error); }
      });
    },
    wait(seconds) { return this.tween(seconds); },
    tick(delta) {
      for (const job of jobs) {
        if (!jobs.has(job)) continue;
        job.age = Math.min(job.duration, job.age + delta);
        try {
          job.update(job.age / job.duration, delta);
          if (job.age >= job.duration && jobs.delete(job)) job.resolve(true);
        } catch (error) {
          jobs.delete(job);
          job.reject(error);
        }
      }
    },
    cancel() {
      for (const job of jobs) job.resolve(false);
      jobs.clear();
    },
    get size() { return jobs.size; }
  };
}

export function createTrainingDirector({ camera, controls, clock, environment, getMech, onEnter, onCombat, onResult, onCancel, onRestore, onError }) {
  const { doorRig, arena, repairRig } = environment;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const target = new THREE.Vector3();
  const cameraGoal = new THREE.Vector3();
  const targetGoal = new THREE.Vector3();
  const safeTarget = new THREE.Vector3();
  let hidden = Boolean(document.hidden);
  const onVisibilityChange = () => { hidden = Boolean(document.hidden); };
  document.addEventListener('visibilitychange', onVisibilityChange);
  let state = { phase: 'IDLE', active: false, direction: 'idle', result: null, caption: '整备就绪', eyebrow: 'BAY 09 / ASSEMBLY', canSkip: false, canCancel: false };
  let generation = 0;
  let saved = null;
  let outbound = null;
  let inbound = null;
  let phaseAge = 0;
  let phaseDuration = 0;
  let shot = 'assembly';
  let combatSide = null;

  function deferred() {
    let resolve;
    const promise = new Promise(finish => { resolve = finish; });
    return { promise, resolve };
  }

  function publish(phase, direction, caption, eyebrow = 'TRAINING GROUND / SECTOR 09', detail = '') {
    phaseAge = 0;
    state = { ...state, phase, direction, caption, eyebrow, detail,
      active: direction !== 'idle', canSkip: direction === 'outbound' || direction === 'return',
      canCancel: direction === 'outbound' || direction === 'combat' };
    document.getElementById('stage-status').textContent = phase === 'IDLE' ? 'ASSEMBLY READY' : phase.replaceAll('_', ' ');
    window.dispatchEvent(new CustomEvent('ironclad:training', { detail: { ...state } }));
  }

  function fov(value) {
    return Math.max(value, camera.aspect < 0.7 ? 68 : camera.aspect < 1 ? 57 : value);
  }

  function frame(position, aim, lens = 44, name = shot) {
    camera.position.copy(position.isVector3 ? position : new THREE.Vector3(...position));
    safeTarget.copy(aim.isVector3 ? aim : new THREE.Vector3(...aim));
    if (!Number.isFinite(safeTarget.x) || !Number.isFinite(safeTarget.y) || !Number.isFinite(safeTarget.z)) safeTarget.set(0, 2.5, 0);
    controls.target.copy(safeTarget);
    camera.fov = fov(Math.max(32, Math.min(68, lens)));
    camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
    shot = name;
  }

  function blendShot(from, to, progress, name) {
    const amount = reducedMotion.matches ? 1 : smooth(progress);
    cameraGoal.fromArray(from.position).lerp(new THREE.Vector3(...to.position), amount);
    targetGoal.fromArray(from.target).lerp(new THREE.Vector3(...to.target), amount);
    frame(cameraGoal, targetGoal, THREE.MathUtils.lerp(from.fov || 44, to.fov || 44, amount), name);
  }

  function duration(seconds) { return reducedMotion.matches ? Math.min(seconds, 0.36) : seconds; }

  async function steps(list, token, finished) {
    try {
      for (const step of list) {
        if (token !== generation) return;
        phaseDuration = duration(step.duration);
        publish(step.phase, step.direction, step.caption, step.eyebrow, step.detail);
        step.enter?.();
        const complete = await clock.tween(phaseDuration, (progress, delta) => {
          phaseAge = progress * phaseDuration;
          step.update?.(progress, delta);
        });
        if (!complete || token !== generation) return;
        step.exit?.();
      }
      if (token === generation) finished();
    } catch (error) {
      if (token === generation) {
        reset('ERROR');
        onError?.(error);
      }
    }
  }

  function moveStep({ phase, to, seconds, caption, direction, cameraAt, ease = false }) {
    let start;
    let yaw;
    let facing;
    return {
      phase, direction, caption, duration: seconds,
      enter() {
        const mech = getMech();
        start = mech.root.position.clone();
        yaw = mech.root.rotation.y;
        facing = Math.atan2(to[0] - start.x, to[2] - start.z);
      },
      update(progress) {
        const mech = getMech();
        const amount = ease ? smooth(progress) : progress;
        mech.root.position.x = THREE.MathUtils.lerp(start.x, to[0], amount);
        mech.root.position.z = THREE.MathUtils.lerp(start.z, to[2], amount);
        mech.root.rotation.y = lerpAngle(yaw, facing, smooth(Math.min(1, progress * 5)));
        cameraAt?.(mech.root.position, progress);
      }
    };
  }

  function resetPose() {
    const mech = getMech();
    if (mech.poseRoot) { mech.poseRoot.position.set(0, 0, 0); mech.poseRoot.rotation.set(0, 0, 0); }
  }

  function stageCombat() {
    const mech = getMech();
    mech.root.position.x = arena.playerPosition.x;
    mech.root.position.z = arena.playerPosition.z;
    mech.root.rotation.y = Math.atan2(arena.enemyPosition.x - mech.root.position.x, arena.enemyPosition.z - mech.root.position.z);
    resetPose();
    doorRig.setOpenAmount(1);
    repairRig?.setRetracted(1);
    arena.setActive(true);
    onCombat?.();
    combatSide = null;
    phaseDuration = 0;
    publish('COMBAT', 'combat', '实战演算', 'LIVE EXERCISE / SECTOR 09', '训练武器已解锁 · 所有损伤仅用于本次演算');
    combatCamera(1);
    outbound?.resolve(true);
    outbound = null;
  }

  function combatCamera(delta) {
    const aim = arena.target;
    const shift = combatSide === 'player' ? -1.3 : combatSide === 'enemy' ? 1.1 : 0;
    cameraGoal.set(13.7 + shift, state.phase === 'RESULT_HOLD' ? 6.9 : 8.1, -29.5 - Math.abs(shift));
    targetGoal.set(aim.x + shift * 0.35, aim.y + 0.25, aim.z);
    const factor = reducedMotion.matches ? 1 : 1 - Math.exp(-2.1 * delta);
    camera.position.lerp(cameraGoal, factor);
    controls.target.lerp(targetGoal, factor);
    camera.fov = THREE.MathUtils.lerp(camera.fov, fov(state.phase === 'RESULT_HOLD' ? 40 : 46), factor);
    camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
    shot = state.phase === 'RESULT_HOLD' ? 'result' : combatSide ? 'combat-' + combatSide : 'arena-wide';
  }

  function beginTraining() {
    if (state.active) return Promise.resolve(false);
    generation += 1;
    clock.cancel();
    inbound = null;
    const mech = getMech();
    saved = {
      mechPosition: mech.root.position.clone(), mechRotation: mech.root.quaternion.clone(), mechScale: mech.root.scale.clone(),
      cameraPosition: camera.position.clone(), cameraQuaternion: camera.quaternion.clone(), target: controls.target.clone(), fov: camera.fov,
      controlsEnabled: controls.enabled, autoRotate: controls.autoRotate, maxDistance: controls.maxDistance,
      photoMode: document.body.classList.contains('photo-mode')
    };
    controls.autoRotate = false;
    controls.enabled = false;
    controls.maxDistance = 65;
    document.body.classList.remove('photo-mode');
    document.body.classList.add('in-battle');
    document.getElementById('photo-mode').setAttribute('aria-pressed', 'false');
    document.getElementById('auto-rotate').setAttribute('aria-pressed', 'false');
    onEnter?.();
    arena.setActive(true);
    state.result = null;
    outbound = deferred();
    const promise = outbound.promise;
    const initialYaw = mech.root.rotation.y;
    const player = arena.playerPosition;
    steps([
      {
        phase: 'PREPARE', direction: 'outbound', duration: 0.9, caption: '出击许可已确认', eyebrow: 'BAY 09 / DEPLOYMENT',
        detail: '整备机械臂撤离 · 机体转向出库通道',
        update(progress) {
          repairRig?.setRetracted(smooth(progress));
          mech.root.rotation.y = lerpAngle(initialYaw, Math.PI, smooth(progress));
          blendShot({ position: [6.8, 4.2, 9.8], target: [0, 3.1, 0], fov: 44 }, { position: [5.9, 3.7, 8.6], target: [0, 3.1, -1.2], fov: 44 }, progress, 'preflight');
        }
      },
      {
        phase: 'DOOR_OPEN', direction: 'outbound', duration: 1.55, caption: '机库门开启', eyebrow: 'BAY 09 / LAUNCH GATE',
        detail: '通道净空确认 · 等待门锁完全解除',
        update(progress) {
          doorRig.setOpenAmount(smooth(progress));
          blendShot({ position: [5.4, 2.6, -5.8], target: [0, 3.8, -14.7], fov: 53 }, { position: [4.7, 2.8, -7], target: [0, 3.8, -16.2], fov: 53 }, progress, 'gate-opening');
        }
      },
      moveStep({ phase: 'DEPARTURE', direction: 'outbound', to: [0, 0, -9], seconds: 2.05, caption: '离开整备平台', ease: true,
        cameraAt(position) { frame([5.8, 4.3, position.z + 10.3], [position.x, 2.8, position.z - 1.2], 45, 'departure-tracking'); } }),
      moveStep({ phase: 'TRANSIT', direction: 'outbound', to: [0, 0, -26], seconds: 3.1, caption: '穿越出库通道',
        cameraAt(position, progress) { frame([3.05, 4.4, position.z + 9], [position.x, 2.9, position.z - 2], 48, 'corridor-tracking'); } }),
      moveStep({ phase: 'ARENA_APPROACH', direction: 'outbound', to: [player.x, 0, player.z], seconds: 2.8, caption: '抵达 SECTOR 09', ease: true,
        cameraAt(position, progress) {
          blendShot({ position: [9.2, 4.2, -33.5], target: [0, 2.8, -27], fov: 49 }, { position: [13.7, 8.1, -29.5], target: arena.target.toArray(), fov: 46 }, progress, 'arena-reveal');
        } }),
      {
        phase: 'ARENA_ARRIVAL', direction: 'outbound', duration: 0.65, caption: '训练区域就绪',
        detail: 'NULLWALKER 已接入 · 切换实战演算',
        enter() { this.yaw = mech.root.rotation.y; },
        update(progress) {
          const facing = Math.atan2(arena.enemyPosition.x - player.x, arena.enemyPosition.z - player.z);
          mech.root.rotation.y = lerpAngle(this.yaw, facing, smooth(progress));
          frame([13.7, 8.1, -29.5], arena.target, 46, 'arena-wide');
        }
      }
    ], generation, stageCombat);
    return promise;
  }

  function restore(resultPhase = 'IDLE') {
    onRestore?.();
    const mech = getMech();
    resetPose();
    if (saved) {
      mech.root.position.copy(saved.mechPosition);
      mech.root.quaternion.copy(saved.mechRotation);
      mech.root.scale.copy(saved.mechScale);
      camera.position.copy(saved.cameraPosition);
      camera.quaternion.copy(saved.cameraQuaternion);
      camera.fov = saved.fov;
      controls.target.copy(saved.target);
      controls.maxDistance = saved.maxDistance;
      controls.enabled = saved.controlsEnabled;
      controls.autoRotate = saved.autoRotate;
      controls.update();
      camera.updateProjectionMatrix();
      document.body.classList.toggle('photo-mode', saved.photoMode);
      document.getElementById('photo-mode').setAttribute('aria-pressed', String(saved.photoMode));
      document.getElementById('auto-rotate').setAttribute('aria-pressed', String(saved.autoRotate));
    } else {
      controls.enabled = true;
    }
    doorRig.setOpenAmount(0);
    repairRig?.setRetracted(0);
    arena.setActive(false);
    document.body.classList.remove('in-battle');
    phaseDuration = 0;
    shot = 'assembly';
    publish(resultPhase, 'idle', resultPhase === 'ERROR' ? '训练已中断' : '归库整备完成', 'BAY 09 / ASSEMBLY');
    saved = null;
  }

  function startReturn(result, cancelled) {
    if (inbound) return inbound.promise;
    if (!state.active) return Promise.resolve(true);
    generation += 1;
    onCancel?.();
    clock.cancel();
    outbound?.resolve(false);
    outbound = null;
    inbound = deferred();
    const promise = inbound.promise;
    const mech = getMech();
    state.result = result;
    const list = [];
    if (!cancelled) {
      list.push({
        phase: 'RESULT_HOLD', direction: 'return', duration: 1.2,
        caption: result === 'VICTORY' ? '训练通过' : result === 'DEFEAT' ? '机体演算失能' : '训练时间结束',
        eyebrow: result + ' / EXERCISE COMPLETE', detail: '演算数据已记录 · 准备解除模拟损伤',
        enter() { onResult?.(result); }, update(progress, delta) { combatCamera(delta); }
      });
    }
    list.push({
      phase: 'RETURN_PREPARE', direction: 'return', duration: 0.6, caption: cancelled ? '训练已取消 · 安全返库' : '解除演算 · 开始返库',
      detail: cancelled ? '已发生的伤害与回合将保留，不再执行后续攻击' : '模拟损伤解除 · 机体恢复行走姿态',
      enter() { onResult?.(null); },
      update(progress) {
        if (mech.root.position.z < -9) doorRig.setOpenAmount(Math.max(doorRig.openAmount, smooth(progress)));
        repairRig?.setRetracted(1);
      }
    });
    if (mech.root.position.z < -26) {
      list.push(moveStep({ phase: 'RETURN_ARENA', direction: 'return', to: [0, 0, -26], seconds: 2.35, caption: '撤离训练场', ease: true,
        cameraAt(position, progress) { frame([8.5 - progress * 2, 4.8, -30.4], [position.x, 2.8, position.z], 52, 'return-arena'); } }));
    }
    if (mech.root.position.z < -8) {
      list.push(moveStep({ phase: 'RETURN_TRANSIT', direction: 'return', to: [0, 0, -7], seconds: Math.max(0.5, Math.min(2.8, (-mech.root.position.z - 7) / 6)), caption: '返回机库通道',
        cameraAt(position) { frame([2.8, 4.1, position.z + 10.5], [position.x, 2.85, position.z], 47, 'return-corridor'); } }));
    }
    list.push(moveStep({ phase: 'RETURN_BAY', direction: 'return', to: [0, 0, 0], seconds: 1.55, caption: '进入整备平台', ease: true,
      cameraAt(position, progress) {
        frame([6.7, 4.6, 9.4], [position.x, 2.8, Math.min(0, position.z + 0.4)], 47, 'return-bay');
      } }));
    let turnFrom = 0;
    let doorFrom = 1;
    list.push({
      phase: 'DOOR_CLOSE', direction: 'return', duration: 1.4, caption: '机库封闭 · 归位完成', eyebrow: 'BAY 09 / SECURED',
      detail: '门体闭锁后恢复整备控制',
      enter() { turnFrom = mech.root.rotation.y; doorFrom = doorRig.openAmount; },
      update(progress) {
        mech.root.rotation.y = lerpAngle(turnFrom, 0, smooth(progress));
        doorRig.setOpenAmount(doorFrom * (1 - smooth(progress)));
        repairRig?.setRetracted(1 - smooth(progress));
        blendShot({ position: [6.7, 4.6, 9.4], target: [0, 2.8, -0.2], fov: 47 }, { position: [8.4, 5.9, 13.6], target: [0, 2.73, 0], fov: 42 }, progress, 'bay-settle');
      }
    });
    steps(list, generation, () => {
      restore();
      inbound?.resolve(true);
    });
    return promise;
  }

  function skipCinematic() {
    if (!state.canSkip) return false;
    generation += 1;
    clock.cancel();
    if (state.direction === 'outbound') {
      stageCombat();
    } else {
      onCancel?.();
      restore();
      inbound?.resolve(true);
    }
    return true;
  }

  function reset(reason = 'IDLE') {
    generation += 1;
    onCancel?.();
    clock.cancel();
    outbound?.resolve(false);
    inbound?.resolve(false);
    outbound = null;
    inbound = null;
    restore(reason);
  }

  return {
    beginTraining,
    finishTraining(result) { return startReturn(result, false); },
    cancelTraining() { return startReturn('CANCELLED', true); },
    skipCinematic, reset,
    update(delta) {
      // The render loop may continue servicing bookkeeping while the document is hidden;
      // do not advance cinematic time or write camera transforms until it is visible again.
      if (!hidden) clock.tick(delta);
      if (!hidden && state.phase === 'COMBAT') combatCamera(delta);
    },
    aimCombat(side) { combatSide = side; },
    getState() { return { ...state, phaseElapsed: phaseAge, phaseDuration, progress: phaseDuration ? phaseAge / phaseDuration : 0, shot, reducedMotion: reducedMotion.matches }; }
  };
}
