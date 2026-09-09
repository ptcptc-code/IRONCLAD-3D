import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = v => Number.isFinite(v) ? v : 0;
const deadzone = (v, dz = 0.14) => Math.abs(v) < dz ? 0 : Math.sign(v) * ((Math.abs(v) - dz) / (1 - dz));

/** Input adapter for a player-driven third-person controller. */
export function createPlayerController(options = {}) {
  const canvas = options.canvas || options.domElement || null;
  const target = options.target || canvas || (typeof window !== 'undefined' ? window : null);
  const key = new Set();
  const buttons = new Set();
  const pressed = new Set();
  const look = new THREE.Vector2();
  const move = new THREE.Vector2();
  const listeners = [];
  let enabled = options.enabled !== false;
  let dragging = false;
  let activePointer = null;
  let lastGamepad = null;
  let snapshot = makeSnapshot();

  const keyMap = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
  const actionMap = { Space: 'jump', KeyQ: 'abilityQ', KeyE: 'abilityE', ShiftLeft: 'sprint', ShiftRight: 'sprint' };
  const buttonActions = { 0: 'primary', 1: 'secondary', 2: 'tertiary', 3: 'action' };
  function makeSnapshot() { return { move: new THREE.Vector2(), look: new THREE.Vector2(), buttons: new Set(), actions: new Set(), sprint: false, gamepad: false }; }
  function on(type, fn, node = target) { if (!node?.addEventListener) return; node.addEventListener(type, fn, { passive: type === 'pointermove' ? false : true }); listeners.push(() => node.removeEventListener(type, fn)); }
  function clear() { key.clear(); buttons.clear(); pressed.clear(); dragging = false; activePointer = null; look.set(0, 0); move.set(0, 0); snapshot = makeSnapshot(); }
  function blur() { clear(); }
  function keydown(e) { if (!enabled) return; key.add(e.code); const action = actionMap[e.code]; if (action && !e.repeat) pressed.add(action); if (action || keyMap[e.code]) e.preventDefault?.(); }
  function keyup(e) { key.delete(e.code); }
  function pointerdown(e) { if (!enabled) return; if (e.button !== undefined) { buttons.add(e.button); const action = buttonActions[e.button]; if (action) pressed.add(action); } if (e.pointerId != null) { activePointer = e.pointerId; dragging = true; canvas?.setPointerCapture?.(e.pointerId); } }
  function pointerup(e) { if (e.button !== undefined) buttons.delete(e.button); if (e.pointerId == null || e.pointerId === activePointer) { dragging = false; activePointer = null; } }
  function pointermove(e) { if (!enabled || !dragging || (activePointer != null && e.pointerId !== activePointer)) return; const scale = finite(options.lookSensitivity ?? 1); look.x += finite(e.movementX) * scale; look.y += finite(e.movementY) * scale; }
  on('keydown', keydown, typeof window !== 'undefined' ? window : target); on('keyup', keyup, typeof window !== 'undefined' ? window : target);
  on('pointerdown', pointerdown, canvas); on('pointerup', pointerup, canvas); on('pointercancel', pointerup, canvas); on('pointermove', pointermove, canvas);
  on('blur', blur, typeof window !== 'undefined' ? window : target); on('visibilitychange', () => { if (typeof document !== 'undefined' && document.hidden) clear(); }, typeof document !== 'undefined' ? document : target);
  on('pause', clear, target); on('suspend', clear, target);

  function pollGamepad() {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads || []).find(Boolean); if (!pad) { lastGamepad = null; return; }
    const previousButtons = lastGamepad?._buttons || [];
    lastGamepad = pad; const ax = i => deadzone(finite(pad.axes?.[i]));
    buttons.clear();
    // Gamepad axes are absolute per frame; do not accumulate them over time.
    move.x = clamp(ax(0), -1, 1); move.y = clamp(-ax(1), -1, 1);
    look.x += ax(2) * finite(options.gamepadLookSpeed ?? 8); look.y += ax(3) * finite(options.gamepadLookSpeed ?? 8);
    const map = { 0: 'jump', 1: 'secondary', 2: 'primary', 3: 'action', 4: 'tertiary', 5: 'sprint', 6: 'abilityQ', 7: 'abilityE' };
    pad.buttons?.forEach((b, i) => { if (b?.pressed) { const a = map[i]; if (a) { buttons.add(i); if (!previousButtons[i]) pressed.add(a); } } });
    pad._buttons = pad.buttons?.map(b => Boolean(b?.pressed)) || [];
  }
  function update(delta = 0, state = {}) {
    const dt = clamp(finite(delta), 0, 0.1); if (!enabled) { clear(); return snapshot; }
    move.set((key.has('KeyD') || key.has('ArrowRight') ? 1 : 0) - (key.has('KeyA') || key.has('ArrowLeft') ? 1 : 0), (key.has('KeyW') || key.has('ArrowUp') ? 1 : 0) - (key.has('KeyS') || key.has('ArrowDown') ? 1 : 0));
    pollGamepad(); if (move.lengthSq() > 1) move.normalize();
    const actions = new Set(pressed); if (key.has('Space')) actions.add('jump'); if (key.has('KeyQ')) actions.add('abilityQ'); if (key.has('KeyE')) actions.add('abilityE');
    snapshot.move.copy(move); snapshot.look.copy(look); snapshot.buttons = new Set(buttons); snapshot.actions = actions; snapshot.sprint = key.has('ShiftLeft') || key.has('ShiftRight') || buttons.has(5); snapshot.gamepad = Boolean(lastGamepad);
    state.input = snapshot; state.move = snapshot.move; state.look = snapshot.look; state.actions = snapshot.actions; state.sprint = snapshot.sprint;
    look.set(0, 0); pressed.clear(); return snapshot;
  }
  function setEnabled(value) { enabled = Boolean(value); if (!enabled) clear(); }
  return { enable: () => setEnabled(true), disable: () => setEnabled(false), update, getInputSnapshot: () => ({ ...snapshot, move: snapshot.move.clone(), look: snapshot.look.clone(), buttons: new Set(snapshot.buttons), actions: new Set(snapshot.actions) }), consumeAction: name => { const had = pressed.has(name) || snapshot.actions.has(name); pressed.delete(name); snapshot.actions.delete(name); return had; }, clear, dispose: () => { listeners.splice(0).forEach(fn => fn()); clear(); } };
}
