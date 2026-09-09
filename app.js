const { partDefinitions, defaultParts, buildPresets, chassisNames } = window.mechCatalog;

const palettes = {
  cyan: { name: 'ION CYAN', base: '#25505a', accent: '#62e8fb', soft: 'rgba(98, 232, 251, 0.12)', glow: 'rgba(98, 232, 251, 0.45)', dark: '#0b2739' },
  amber: { name: 'SOLAR AMBER', base: '#6a4d28', accent: '#f2c56b', soft: 'rgba(242, 197, 107, 0.12)', glow: 'rgba(242, 197, 107, 0.45)', dark: '#2e2417' },
  coral: { name: 'COMBAT CORAL', base: '#6a2e31', accent: '#ff7b6c', soft: 'rgba(255, 123, 108, 0.12)', glow: 'rgba(255, 123, 108, 0.45)', dark: '#301c25' },
  violet: { name: 'VOID VIOLET', base: '#40356f', accent: '#ae9bff', soft: 'rgba(174, 155, 255, 0.12)', glow: 'rgba(174, 155, 255, 0.45)', dark: '#211d3c' }
};

const colorSlots = Object.keys(partDefinitions);

function createPartColors(paletteKey = 'cyan') {
  const palette = palettes[paletteKey];
  const secondary = paletteKey === 'amber' ? '#d8b46e' : paletteKey === 'coral' ? '#d98478' : paletteKey === 'violet' ? '#9387ce' : '#9bb9b5';
  return Object.fromEntries(colorSlots.map(slot => [slot, { base: palette.base, secondary, accent: palette.accent }]));
}

function validColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

const state = {
  parts: { ...defaultParts },
  activePart: 'chassis',
  color: 'cyan',
  partColors: createPartColors(),
  playerHp: 100,
  enemyHp: 100,
  round: 0,
  battleRunning: false
};

const $ = (selector) => document.querySelector(selector);
const partTabs = $('#part-tabs');
const optionGrid = $('#option-grid');
const paletteRow = $('#palette-row');
const componentColorPanel = $('#component-color-panel');
const componentBaseColor = $('#component-base-color');
const componentSecondaryColor = $('#component-secondary-color');
const componentAccentColor = $('#component-accent-color');
const logList = $('#log-list');
const battleButton = $('#start-battle');
const trainingButton = $('#start-training');
const trainingOverlay = $('#training-overlay');
const skipCinematicButton = $('#skip-cinematic');
const cancelTrainingButton = $('#cancel-training');
const appShell = $('.app-shell');
const sceneHost = $('#scene-host');
let currentTraining = null;
let trainingView = { phase: 'IDLE', active: false, direction: 'idle', canSkip: false, canCancel: false };
let trainingRestore = null;
let pendingTrainingFocus = null;
const buildControlStates = new Map();

function focusTrainingControl() {
  const controls = [skipCinematicButton, cancelTrainingButton].filter(button => !button.hidden && !button.disabled);
  (controls[0] || trainingOverlay).focus({ preventScroll: true });
}

function restoreTrainingFocus() {
  const visible = element => {
    if (!element?.isConnected || element.disabled || element.closest('[inert], [hidden], [aria-hidden="true"]') || !element.getClientRects().length) return false;
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.visibility === 'hidden' || style.opacity === '0') return false;
    }
    return true;
  };
  const errorButton = $('#scene-error:not([hidden]) button');
  const target = errorButton || (visible(pendingTrainingFocus) ? pendingTrainingFocus : [battleButton, $('#photo-mode'), $('.brand')].find(visible));
  if (target) target.focus({ preventScroll: true });
  else {
    const tabindex = document.body.getAttribute('tabindex');
    document.body.tabIndex = -1;
    document.body.focus({ preventScroll: true });
    if (tabindex === null) document.body.removeAttribute('tabindex');
    else document.body.setAttribute('tabindex', tabindex);
  }
  if (!state.battleRunning) pendingTrainingFocus = null;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function getSelectedOption(partKey) {
  return partDefinitions[partKey].options.find((option) => option.id === state.parts[partKey]);
}

function calculateStats() {
  const base = { power: 42, armor: 43, speed: 46, sync: 56 };
  Object.entries(state.parts).forEach(([partKey, optionId]) => {
    const option = partDefinitions[partKey].options.find((item) => item.id === optionId);
    Object.entries(option.stats).forEach(([key, value]) => { base[key] += value; });
  });
  return Object.fromEntries(Object.entries(base).map(([key, value]) => [key, clamp(value)]));
}

function miniSvg(partKey, optionId, accent) {
  const shapes = {
    chassis: {
      bulwark: '<path class="mini-solid" d="M18 12h24l5 8-3 19H16l-3-19z"/><path class="mini-edge" d="M19 18h22M18 32h24"/>',
      raptor: '<path class="mini-solid" d="M24 10h13l10 9-5 20H16l-3-20z"/><path class="mini-edge" d="M22 16h16M18 33h24"/>',
      specter: '<path class="mini-solid" d="M25 9h11l7 8-2 23H19l-2-23z"/><path class="mini-edge" d="M23 17h15M21 34h19"/>'
    },
    head: {
      visor: '<path class="mini-solid" d="M20 16l5-7h11l6 7v13H20z"/><path class="mini-accent" d="M23 20h16"/>',
      horned: '<path class="mini-solid" d="M20 16l3-7 5 5 5-5 5 7v14H20z"/><path class="mini-accent" d="M23 20h16"/>',
      sensor: '<path class="mini-solid" d="M21 14l5-6h8l7 6-3 16H22z"/><circle class="mini-accent" cx="32" cy="20" r="4"/>'
    },
    arms: {
      gauntlet: '<path class="mini-solid" d="M17 13h9v18l-4 10h-9l3-11zM47 13h-9v18l4 10h9l-3-11z"/><path class="mini-accent" d="M18 29h6M40 29h6"/>',
      lancer: '<path class="mini-solid" d="M20 12h7v19l-3 10h-6l2-11zM44 12h-7v19l3 10h6l-2-11z"/><path class="mini-accent" d="M13 20h13M39 20h13"/>',
      talon: '<path class="mini-solid" d="M20 12h7l-1 19-7 10h-6l6-13zM44 12h-7l1 19 7 10h6l-6-13z"/><path class="mini-accent" d="M16 37l-4 4M45 37l4 4"/>'
    },
    legs: {
      strider: '<path class="mini-solid" d="M22 12h9l-2 16-5 12H14l7-14zM34 12h9l6 14 7 14h-10l-5-12z"/><path class="mini-accent" d="M19 35h9M43 35h9"/>',
      anchor: '<path class="mini-solid" d="M20 11h12v19l-4 10H12l6-11zM32 11h12l6 8 6 11H40l-4-10z"/><path class="mini-edge" d="M16 36h13M42 36h13"/>',
      hover: '<path class="mini-solid" d="M23 11h9v16l-6 7H16l7-8zM33 11h9l7 15-7 8h-10l-1-7z"/><path class="mini-accent" d="M15 39h14M41 39h14"/>'
    },
    weapon: {
      railgun: '<path class="mini-solid" d="M16 28h25l10-5v10l-10-2H16z"/><path class="mini-accent" d="M45 24h10v8H45"/>',
      arc: '<path class="mini-solid" d="M20 17h8v25h-8zM36 17h8v25h-8z"/><path class="mini-accent" d="M17 24h30M17 34h30"/>',
      monoblade: '<path class="mini-solid" d="M25 35V15l4-6 4 6v20z"/><path class="mini-accent" d="M29 9v33"/>'
    }
  };
  const body = partDefinitions[partKey].options.find(option => option.id === optionId).icon || shapes[partKey]?.[optionId] || '';
  return '<svg viewBox="0 0 64 48" aria-hidden="true"><rect width="64" height="48" fill="#0a1a2a"/><g style="--mini-accent:' + accent + '">' + body + '</g></svg>';
}

function renderTabs() {
  const keys = Object.keys(partDefinitions);
  partTabs.innerHTML = keys.map((key, index) => {
    const part = partDefinitions[key];
    const active = state.activePart === key ? ' is-active' : '';
    return '<button class="part-tab' + active + '" id="tab-' + key + '" role="tab" aria-controls="option-grid" aria-label="' + part.label + '" tabindex="' + (state.activePart === key ? 0 : -1) + '" aria-selected="' + (state.activePart === key) + '" data-part="' + key + '"><span>0' + (index + 1) + '</span><span>' + part.short + '</span></button>';
  }).join('');
}

function renderOptions() {
  const part = partDefinitions[state.activePart];
  const componentColors = state.partColors[state.activePart];
  const selectedIndex = part.options.findIndex((option) => option.id === state.parts[state.activePart]);
  $('#selection-label').textContent = part.label;
  $('#selection-count').textContent = String(selectedIndex + 1).padStart(2, '0') + ' / ' + String(part.options.length).padStart(2, '0');
  optionGrid.innerHTML = part.options.map((option) => {
    const selected = state.parts[state.activePart] === option.id ? ' selected' : '';
    return '<button class="option-card' + selected + '" data-option="' + option.id + '" aria-pressed="' + Boolean(selected) + '" title="' + option.desc + '"><span class="option-thumb">' + miniSvg(state.activePart, option.id, componentColors.accent) + '</span><span class="option-copy"><strong>' + option.name + '</strong><small>' + option.desc + '</small></span><span class="option-stat">' + option.stat + '</span></button>';
  }).join('');
  optionGrid.setAttribute('aria-labelledby', 'tab-' + state.activePart);
  const selected = optionGrid.querySelector('.selected');
  if (selected) optionGrid.scrollTop = Math.max(0, selected.offsetTop - optionGrid.clientHeight / 2 + selected.clientHeight / 2);
  renderPresets();
}

function renderComponentColors() {
  const palette = state.partColors[state.activePart];
  const definition = partDefinitions[state.activePart];
  $('#component-color-name').textContent = definition.short;
  $('#component-color-code').textContent = definition.code;
  componentBaseColor.value = palette.base;
  componentSecondaryColor.value = palette.secondary;
  componentAccentColor.value = palette.accent;
  $('#component-color-swatches').innerHTML = Object.entries(palettes).map(([key, value]) => '<button class="component-swatch" data-component-palette="' + key + '" style="--swatch-base:' + value.base + ';--swatch-secondary:' + (key === 'amber' ? '#d8b46e' : key === 'coral' ? '#d98478' : key === 'violet' ? '#9387ce' : '#9bb9b5') + ';--swatch-accent:' + value.accent + '" aria-label="' + value.name + '" title="' + value.name + '"><i></i><b></b><em></em></button>').join('');
}

function renderPresets() {
  $('#preset-row').innerHTML = buildPresets.map(preset => {
    const selected = Object.keys(defaultParts).every(key => state.parts[key] === preset.parts[key]);
    return '<button class="preset-button' + (selected ? ' selected' : '') + '" data-preset="' + preset.id + '" aria-pressed="' + selected + '"><span>' + preset.code + '</span><strong>' + preset.name + '</strong></button>';
  }).join('');
  const count = Object.values(partDefinitions).reduce((total, definition) => total + definition.options.length, 0);
  const combinations = Object.values(partDefinitions).reduce((total, definition) => total * definition.options.length, 1);
  $('#library-summary').textContent = count + ' 款部件 · ' + combinations.toLocaleString('zh-CN') + ' 种组合';
}

function renderPalette() {
  paletteRow.innerHTML = Object.entries(palettes).map(([key, palette]) => {
    const selected = state.color === key ? ' selected' : '';
    return '<button class="palette-button' + selected + '" data-palette="' + key + '" style="--swatch:' + palette.accent + '" aria-label="' + palette.name + '" title="' + palette.name + '"></button>';
  }).join('');
  $('#palette-name').textContent = palettes[state.color].name;
}

function renderMech() {
  window.mechScene?.update(state.parts, state.partColors);
  const stats = calculateStats();
  $('#mech-name').textContent = getMechName();
  $('#player-name').textContent = getMechName().replace(' // ', ' ');
  $('#unit-id').textContent = getUnitId();
  $('#power-readout').textContent = stats.power + '%';
  try {
    localStorage.setItem('ironclad-build-v4', JSON.stringify({ parts: state.parts, color: state.color, partColors: state.partColors }));
  } catch {}
}

function getMechName() {
  const [name, number] = chassisNames[state.parts.chassis];
  return name + ' // ' + number;
}

function getUnitId() {
  const [, number, prefix] = chassisNames[state.parts.chassis];
  return prefix + '-' + number;
}

function renderStats() {
  const stats = calculateStats();
  const max = 100;
  const points = [stats.power, stats.armor, stats.speed, stats.sync].map(value => Math.max(8, Math.min(max, value)));
  const radar = document.getElementById('loadout-radar-shape');
  if (radar) {
    const center = [110, 82];
    const axes = [[110, 12], [188, 57], [158, 132], [62, 132], [32, 57]];
    const values = [points[0], points[1], points[2], points[3], Math.max(8, Math.round((stats.armor + stats.sync) / 2))];
    radar.setAttribute('points', axes.map(([x, y], index) => `${center[0] + (x - center[0]) * values[index] / max},${center[1] + (y - center[1]) * values[index] / max}`).join(' '));
    ['power', 'armor', 'speed', 'sync'].forEach(key => { const el = document.getElementById('radar-' + key); if (el) el.textContent = String(stats[key]).padStart(2, '0'); });
  }
  const radarProfile = document.getElementById('loadout-radar-status');
  if (radarProfile) radarProfile.textContent = stats.power > stats.speed + 7 ? 'ASSAULT / MK-III' : stats.speed > stats.armor + 9 ? 'SCOUT / MK-I' : 'BALANCED / MK-II';
  ['power', 'armor', 'speed', 'sync'].forEach((key) => {
    $('#' + key + '-stat').style.width = stats[key] + '%';
    $('#' + key + '-stat-value').textContent = stats[key];
  });
  const coreTemp = (34 + stats.power * 0.055 + (100 - stats.armor) * 0.035).toFixed(1);
  $('#core-temp').textContent = coreTemp + '°';
  $('#sync-rate').textContent = (stats.sync * 0.97).toFixed(1) + '%';
  const profile = stats.power > stats.speed + 7 ? 'ASSAULT / MK-III' : stats.speed > stats.armor + 9 ? 'SCOUT / MK-I' : 'BALANCED / MK-II';
  $('#loadout-profile').textContent = profile;
  if (radarProfile) radarProfile.textContent = profile;
}

function renderHealth() {
  $('#player-hp-bar').style.width = state.playerHp + '%';
  $('#enemy-hp-bar').style.width = state.enemyHp + '%';
  $('#player-hp').textContent = Math.round(state.playerHp);
  $('#enemy-hp').textContent = Math.round(state.enemyHp);
  $('#round-badge').textContent = 'ROUND ' + String(state.round).padStart(2, '0');
  $('#training-player-name').textContent = getMechName().replace(' // ', ' ');
  $('#training-round').textContent = String(state.round).padStart(2, '0') + ' / 12';
  ['player', 'enemy'].forEach(side => {
    const hp = Math.round(state[side + 'Hp']);
    const bar = $('#training-' + side + '-bar');
    const meter = bar.parentElement;
    bar.style.width = hp + '%';
    $('#training-' + side + '-hp').textContent = hp;
    meter.setAttribute('aria-valuenow', String(hp));
    meter.setAttribute('aria-valuetext', '耐久 ' + hp + ' / 100');
    meter.title = (side === 'player' ? '我方' : '对手') + '耐久 ' + hp + ' / 100';
  });
}

function setTheme() {
  const palette = palettes[state.color];
  document.documentElement.style.setProperty('--accent', palette.accent);
  document.documentElement.style.setProperty('--accent-soft', palette.soft);
  document.documentElement.style.setProperty('--accent-glow', palette.glow);
}

function renderAll() {
  setTheme();
  renderTabs();
  renderOptions();
  renderComponentColors();
  renderPalette();
  renderMech();
  renderStats();
  renderHealth();
}

function addLog(message, type = '') {
  const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const entry = document.createElement('div');
  entry.className = 'log-entry ' + type;
  entry.innerHTML = '<span>' + time + '</span><p>' + message + '</p>';
  logList.appendChild(entry);
  while (logList.children.length > 5) logList.removeChild(logList.firstElementChild);
  logList.scrollTop = logList.scrollHeight;
  const compact = $('#training-log');
  if (compact) compact.textContent = message;
}

function clearLogs() {
  logList.innerHTML = '';
  $('#training-log').textContent = '等待训练开始。';
}

function enterTrainingView() {
  if (trainingRestore) return;
  const nodes = [appShell, sceneHost];
  trainingRestore = {
    focus: currentTraining?.focus || document.activeElement,
    scrollX: currentTraining?.scrollX ?? window.scrollX,
    scrollY: currentTraining?.scrollY ?? window.scrollY,
    nodes: nodes.map(node => ({ node, inert: node.inert, aria: node.getAttribute('aria-hidden') }))
  };
  pendingTrainingFocus = trainingRestore.focus;
  trainingOverlay.hidden = false;
  trainingOverlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('training-active');
  trainingOverlay.focus({ preventScroll: true });
  nodes.forEach(node => { node.inert = true; node.setAttribute('aria-hidden', 'true'); });
}

function leaveTrainingView() {
  if (!trainingRestore) return;
  const saved = trainingRestore;
  trainingRestore = null;
  saved.nodes.forEach(({ node, inert, aria }) => {
    node.inert = inert;
    if (aria === null) node.removeAttribute('aria-hidden');
    else node.setAttribute('aria-hidden', aria);
  });
  document.body.classList.remove('training-active', 'training-cinematic', 'training-combat');
  restoreTrainingFocus();
  trainingOverlay.hidden = true;
  trainingOverlay.setAttribute('aria-hidden', 'true');
  window.scrollTo({ left: saved.scrollX, top: saved.scrollY, behavior: 'instant' });
}

function updateTrainingView(event) {
  const detail = event.detail || event;
  trainingView = { ...trainingView, ...detail };
  const { active, direction, phase } = trainingView;
  const route = document.getElementById('mission-route');
  if (route) {
    const routeKey = !active ? 'bay' : direction === 'return' ? 'return' : direction === 'combat' ? 'field' : ['DOOR_OPEN', 'DEPARTURE', 'TRANSIT'].includes(phase) ? 'gate' : 'field';
    route.dataset.route = routeKey;
    route.querySelectorAll('[data-route]').forEach(node => node.classList.toggle('is-active', node.dataset.route === routeKey));
  }
  const entering = active && !trainingRestore;
  if (active) enterTrainingView();
  document.body.classList.toggle('training-active', active);
  document.body.classList.toggle('training-cinematic', active && (direction === 'outbound' || direction === 'return'));
  document.body.classList.toggle('training-combat', active && (direction === 'combat' || phase.startsWith('RESULT')));
  trainingOverlay.dataset.phase = phase;
  $('#training-eyebrow').textContent = trainingView.eyebrow || 'TRAINING GROUND / SECTOR 09';
  $('#training-caption').textContent = trainingView.caption || (active ? '训练进行中' : '整备就绪');
  const descriptions = { outbound: '前往室外训练场 · 配置已锁定，可跳过出击转场。', combat: '实战演算进行中 · 命中瞬间结算耐久，可取消并安全返航。', return: '正在返回整备平台 · 本次耐久与回合记录将保留。', idle: '已返回机库，可检查记录并调整配置。' };
  $('#training-detail').textContent = trainingView.detail || descriptions[direction];
  const canSkip = active && trainingView.canSkip && ['outbound', 'return'].includes(direction);
  const canCancel = active && trainingView.canCancel && ['outbound', 'combat'].includes(direction) && !currentTraining?.cancelled && !currentTraining?.finishing;
  skipCinematicButton.hidden = !canSkip;
  skipCinematicButton.disabled = !canSkip;
  skipCinematicButton.textContent = direction === 'return' ? '跳过返航转场' : '跳过出击转场';
  cancelTrainingButton.hidden = !canCancel;
  cancelTrainingButton.disabled = !canCancel;
  if (state.battleRunning && active) $('#battle-button-label').textContent = direction === 'return' ? '安全返航中…' : direction === 'outbound' ? '出击转场中…' : '训练进行中…';
  if (active && (entering || !trainingOverlay.contains(document.activeElement) || document.activeElement.hidden || document.activeElement.disabled)) focusTrainingControl();
  if (!active) leaveTrainingView();
}
window.addEventListener('ironclad:training', updateTrainingView);
window.addEventListener('ironclad:renderer-error', () => {
  currentTraining?.fail(new Error('3D 渲染上下文已丢失'));
});

function markTrainingCancelled(run) {
  run.cancelled = true;
  if (run.cancelLogged) return;
  run.cancelLogged = true;
  $('#log-state').textContent = 'CANCELLED';
  addLog('训练已取消，已保留当前回合与耐久，正在安全返航。', 'muted');
  cancelTrainingButton.hidden = true;
  cancelTrainingButton.disabled = true;
  if (document.activeElement === cancelTrainingButton) focusTrainingControl();
}

function requestTrainingCancel(run) {
  if (run.error) return Promise.resolve();
  markTrainingCancelled(run);
  if (!run.cancelPromise) {
    try { run.cancelPromise = Promise.resolve(run.scene.cancelTraining()); }
    catch (error) { run.fail(error); return Promise.resolve(); }
    run.cancelPromise.catch(run.fail);
  }
  return run.cancelPromise;
}

function lockBuild(locked) {
  const controls = '[data-part], [data-option], [data-palette], [data-preset], [data-component-palette], #reset-build, #export-mech, #apply-colors-all, #component-color-panel input, #quality-select, #take-photo, #photo-mode, #reset-camera, #detail-camera, #scene-camera, #auto-rotate';
  if (locked) document.querySelectorAll(controls).forEach(control => {
    if (!buildControlStates.has(control)) buildControlStates.set(control, control.disabled);
    control.disabled = true;
  });
  else {
    buildControlStates.forEach((disabled, control) => { control.disabled = disabled; });
    buildControlStates.clear();
  }
  document.body.classList.toggle('build-locked', locked);
}

function commitImpact(side, damage, critical) {
  const target = side === 'player' ? 'enemyHp' : 'playerHp';
  state[target] = clamp(state[target] - damage);
  renderHealth();
  const actor = side === 'player' ? '你的机体' : 'NULLWALKER';
  addLog('R-' + String(state.round).padStart(2, '0') + ' · ' + actor + (critical ? '暴击 ' : '命中 ') + damage + ' 点伤害。', side === 'player' ? 'success' : 'damage');
}


async function runBattle() {
  const scene = window.mechScene;
  if (state.battleRunning || scene?.getTrainingState?.().active) return;
  if (!scene?.available) {
    addLog('3D 渲染未就绪，请等待场景准备完成；若持续失败，请检查硬件加速并重新加载。', 'damage');
    return;
  }
  state.battleRunning = true;
  const run = { scene, focus: document.activeElement, scrollX: window.scrollX, scrollY: window.scrollY, cancelled: false, cancelLogged: false, finishing: false, error: null, cancelPromise: null };
  let signalFailure;
  const failure = new Promise(resolve => { signalFailure = resolve; });
  run.fail = error => {
    if (run.error) return;
    run.error = error instanceof Error ? error : new Error(String(error));
    try { scene.resetTraining(); } catch (resetError) { console.error(resetError); }
    signalFailure();
  };
  currentTraining = run;
  const awaitScene = async action => {
    if (run.error) throw run.error;
    if (run.cancelled) return false;
    const completed = await Promise.race([action(), failure]);
    if (run.error) throw run.error;
    if (completed === false) markTrainingCancelled(run);
    return !run.cancelled;
  };
  state.playerHp = 100;
  state.enemyHp = 100;
  state.round = 0;
  clearLogs();
  $('#log-state').textContent = 'ENGAGED';
  battleButton.disabled = true;
  lockBuild(true);
  $('#battle-button-label').textContent = '模拟运行中…';
  renderHealth();
  const stats = calculateStats();
  const opponent = { power: 84, armor: 72, speed: 68, sync: 79 };
  try {
    // A cancelled stage unwinds through finally, which awaits the entire safe return.
    if (!await awaitScene(() => scene.beginTraining())) return;
    addLog('NULLWALKER 已接入试炼场，配置已锁定。');
    for (let round = 1; round <= 12; round += 1) {
      if (round > 1 && !await awaitScene(() => scene.wait(0.3))) return;
      state.round = round;
      renderHealth();
      const order = stats.speed >= opponent.speed ? ['player', 'enemy'] : ['enemy', 'player'];
      for (const side of order) {
        const attacking = side === 'player' ? stats : opponent;
        const defending = side === 'player' ? opponent : stats;
        const target = side === 'player' ? 'enemyHp' : 'playerHp';
        const actor = side === 'player' ? '你的机体' : 'NULLWALKER';
        const dodged = Math.random() < defending.speed * 0.0015;
        const critical = !dodged && Math.random() < attacking.sync * 0.002;
        const damage = dodged ? 0 : Math.round((9 + attacking.power * 0.16 + Math.random() * 5) * (1 - defending.armor * 0.003) * (critical ? 1.55 : 1));
        let committed = false;
        if (!await awaitScene(() => scene.performAttack(side, side === 'player' ? state.parts.weapon : 'arc', {
          dodged, critical,
          onImpact: () => {
            if (committed || dodged || run.cancelled || run.error || currentTraining !== run) return;
            committed = true;
            commitImpact(side, damage, critical);
          }
        }))) return;
        if (dodged) addLog(actor + '的攻击被闪避。', 'muted');
        if (state[target] <= 0) break;
      }
      renderHealth();
      if (state.playerHp <= 0 || state.enemyHp <= 0) break;
    }
    if (!await awaitScene(() => scene.wait(0.2))) return;
    const result = state.enemyHp <= 0 ? 'VICTORY' : state.playerHp <= 0 ? 'DEFEAT' : 'TIMEOUT';
    run.finishing = true;
    cancelTrainingButton.hidden = true;
    cancelTrainingButton.disabled = true;
    if (document.activeElement === cancelTrainingButton) focusTrainingControl();
    $('#log-state').textContent = result;
    const messages = { VICTORY: '演算胜利。机体通过本次实战测试。', DEFEAT: '机体失去响应。尝试增加装甲或机动后再战。', TIMEOUT: '回合上限已到达，双方撤离试炼场。' };
    addLog(messages[result], result === 'VICTORY' ? 'success' : result === 'DEFEAT' ? 'damage' : 'muted');
    if (!await awaitScene(() => scene.finishTraining(result))) return;
    addLog('已返回机库 · ' + messages[result] + ' 我方耐久 ' + Math.round(state.playerHp) + '/100，对手耐久 ' + Math.round(state.enemyHp) + '/100，回合 ' + state.round + '。', 'muted');
  } catch (error) {
    run.fail(error);
  } finally {
    try {
      if (run.cancelled && !run.error) await Promise.race([requestTrainingCancel(run), failure]);
    } catch (error) {
      run.fail(error);
    } finally {
      if (run.error) {
        $('#log-state').textContent = 'ERROR';
        addLog('训练中断，已保留最后结算的耐久与回合。请重新加载场景。', 'damage');
        console.error(run.error);
      }
      currentTraining = null;
      state.battleRunning = false;
      battleButton.disabled = false;
      lockBuild(false);
      $('#battle-button-label').textContent = run.error ? '场景中断 · 重新加载' : '再次模拟';
      if (trainingRestore) updateTrainingView({ phase: 'IDLE', active: false, direction: 'idle', canSkip: false, canCancel: false });
      if (pendingTrainingFocus) restoreTrainingFocus();
    }
  }
}

partTabs.addEventListener('click', (event) => {
  const button = event.target.closest('[data-part]');
  if (!button || state.battleRunning) return;
  state.activePart = button.dataset.part;
  window.mechScene?.focusPart(state.activePart);
  renderTabs();
  renderOptions();
  renderComponentColors();
  partTabs.querySelector('[data-part="' + state.activePart + '"]').focus({ preventScroll: true });
});

partTabs.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || state.battleRunning) return;
  event.preventDefault();
  const keys = Object.keys(partDefinitions);
  const offset = event.key === 'ArrowRight' ? 1 : -1;
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1 : (keys.indexOf(state.activePart) + offset + keys.length) % keys.length;
  partTabs.querySelector('[data-part="' + keys[index] + '"]').click();
});

$('#preset-row').addEventListener('click', event => {
  const button = event.target.closest('[data-preset]');
  if (!button || state.battleRunning) return;
  const preset = buildPresets.find(item => item.id === button.dataset.preset);
  state.parts = { ...preset.parts };
  state.color = preset.color;
  state.partColors = createPartColors(preset.color);
  state.playerHp = state.enemyHp = 100;
  state.round = 0;
  $('#log-state').textContent = 'STANDBY';
  $('#battle-button-label').textContent = '启动战斗模拟';
  clearLogs();
  addLog(preset.name + '已装配，仍可逐件修改或自由混搭。', 'muted');
  renderAll();
  window.mechScene?.setBattle(false);
});

optionGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-option]');
  if (!button || state.battleRunning) return;
  state.parts[state.activePart] = button.dataset.option;
  if (state.round > 0) {
    state.playerHp = state.enemyHp = 100;
    state.round = 0;
    renderHealth();
    window.mechScene?.setBattle(false);
    $('#log-state').textContent = 'STANDBY';
    $('#battle-button-label').textContent = '启动战斗模拟';
    clearLogs();
    addLog('新配置已装配，可以开始下一次试炼。', 'muted');
  }
  renderOptions();
  renderMech();
  renderStats();
});

paletteRow.addEventListener('click', (event) => {
  const button = event.target.closest('[data-palette]');
  if (!button || state.battleRunning) return;
  state.color = button.dataset.palette;
  state.partColors = createPartColors(state.color);
  setTheme();
  renderOptions();
  renderPalette();
  renderComponentColors();
  renderMech();
});

componentColorPanel.addEventListener('click', event => {
  const button = event.target.closest('[data-component-palette]');
  if (!button || state.battleRunning) return;
  const palette = palettes[button.dataset.componentPalette];
  const secondary = button.dataset.componentPalette === 'amber' ? '#d8b46e' : button.dataset.componentPalette === 'coral' ? '#d98478' : button.dataset.componentPalette === 'violet' ? '#9387ce' : '#9bb9b5';
  state.partColors[state.activePart] = { base: palette.base, secondary, accent: palette.accent };
  renderComponentColors();
  renderOptions();
  renderMech();
});

function updateActiveComponentColors() {
  if (state.battleRunning) return;
  state.partColors[state.activePart] = { base: componentBaseColor.value, secondary: componentSecondaryColor.value, accent: componentAccentColor.value };
  renderOptions();
  renderMech();
}

componentBaseColor.addEventListener('change', updateActiveComponentColors);
componentSecondaryColor.addEventListener('change', updateActiveComponentColors);
componentAccentColor.addEventListener('change', updateActiveComponentColors);

$('#apply-colors-all').addEventListener('click', () => {
  if (state.battleRunning) return;
  const palette = state.partColors[state.activePart];
  state.partColors = Object.fromEntries(colorSlots.map(slot => [slot, { ...palette }]));
  renderComponentColors();
  renderMech();
});

battleButton.addEventListener('click', () => { if (!state.battleRunning) window.mechScene?.startBattlefield?.(state.parts); });
trainingButton.addEventListener('click', () => { if (!state.battleRunning) runBattle(); });
skipCinematicButton.addEventListener('click', () => {
  if (!currentTraining || !trainingView.canSkip || !['outbound', 'return'].includes(trainingView.direction)) return;
  try { currentTraining.scene.skipCinematic(); } catch (error) { currentTraining.fail(error); }
});
cancelTrainingButton.addEventListener('click', () => {
  if (!currentTraining || !trainingView.canCancel || !['outbound', 'combat'].includes(trainingView.direction) || currentTraining.finishing || currentTraining.cancelled) return;
  requestTrainingCancel(currentTraining);
});
trainingOverlay.addEventListener('keydown', event => {
  if (event.key !== 'Tab' || !trainingView.active) return;
  const controls = [skipCinematicButton, cancelTrainingButton].filter(button => !button.hidden && !button.disabled);
  const index = controls.indexOf(document.activeElement);
  event.preventDefault();
  if (!controls.length) trainingOverlay.focus({ preventScroll: true });
  else {
    const next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (index + (event.shiftKey ? controls.length - 1 : 1)) % controls.length;
    controls[next].focus({ preventScroll: true });
  }
});

$('#reset-build').addEventListener('click', () => {
  if (state.battleRunning) return;
  window.mechScene?.setBattle(false);
  state.parts = { ...defaultParts };
  state.activePart = 'chassis';
  state.color = 'cyan';
  state.partColors = createPartColors();
  state.playerHp = 100;
  state.enemyHp = 100;
  state.round = 0;
  $('#log-state').textContent = 'STANDBY';
  $('#battle-button-label').textContent = '启动战斗模拟';
  clearLogs();
  logList.innerHTML = '<div class="log-entry muted"><span>--:--</span><p>等待驾驶员确认出击。</p></div>';
  renderAll();
});

document.querySelectorAll('[data-scroll]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach((link) => link.classList.remove('is-active'));
    button.classList.add('is-active');
    $('#' + button.dataset.scroll).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

try {
  const saved = JSON.parse(localStorage.getItem('ironclad-build-v4') || localStorage.getItem('ironclad-build-v3'));
  if (saved && typeof saved === 'object') {
    Object.keys(defaultParts).forEach(key => {
      if (partDefinitions[key].options.some(option => option.id === saved.parts?.[key])) state.parts[key] = saved.parts[key];
    });
    if (Object.hasOwn(palettes, saved.color)) state.color = saved.color;
    if (saved.partColors && typeof saved.partColors === 'object') {
      colorSlots.forEach(slot => {
        const colors = saved.partColors[slot];
        if (validColor(colors?.base) && validColor(colors?.secondary) && validColor(colors?.accent)) state.partColors[slot] = { base: colors.base, secondary: colors.secondary, accent: colors.accent };
      });
    } else {
      state.partColors = createPartColors(state.color);
    }
  }
} catch {}
renderAll();
