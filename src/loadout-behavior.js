/* Pure, immutable gameplay behavior registry for loadout components. */

const SLOTS = Object.freeze(['chassis', 'head', 'arms', 'legs', 'weapon', 'backpack']);

const freeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.keys(value).forEach(key => freeze(value[key]));
  return Object.freeze(value);
};

const behavior = (mechanism, tradeoff, control, fields) => freeze({
  mechanism,
  tradeoff,
  control,
  ...fields,
});

const fallback = freeze({
  mechanism: 'Unidentified module is isolated from the control loop.',
  tradeoff: 'No known bonus or penalty; compatibility is preserved.',
  control: 'Uses conservative default control limits.',
  movement: { speed: 0, acceleration: 0, handling: 0, stability: 0 },
  sensing: { range: 0, acquisition: 0, awareness: 0, stealth: 0 },
  weapon: { power: 0, reach: 0, cadence: 0, spread: 0, control: 0 },
  active: { id: 'none', cooldown: 0, duration: 0, magnitude: 0 },
  passive: { id: 'none', magnitude: 0 },
  resources: { energy: 0, heat: 0, ammo: 0, drain: 0 },
});

const table = {
  chassis: {
    bulwark: behavior('Layered frontal bastion', 'Slow turns and high mass', 'Brace and hold ground', { movement:{speed:-3,acceleration:-3,handling:-4,stability:10}, sensing:{range:0,acquisition:0,awareness:2,stealth:-1}, weapon:{power:2,reach:0,cadence:-1,spread:-1,control:2}, active:{id:'fortify',cooldown:18,duration:5,magnitude:10}, passive:{id:'impact-damping',magnitude:8}, resources:{energy:2,heat:2,ammo:0,drain:1} }),
    raptor: behavior('Sloped reactive armor', 'Moderate protection for burst mobility', 'Commit to attack vectors', {movement:{speed:5,acceleration:4,handling:3,stability:-1}, sensing:{range:1,acquisition:2,awareness:1,stealth:1}, weapon:{power:1,reach:0,cadence:1,spread:0,control:1}, active:{id:'pounce',cooldown:14,duration:2,magnitude:7}, passive:{id:'angle-deflection',magnitude:5}, resources:{energy:3,heat:2,ammo:0,drain:2} }),
    specter: behavior('Lightweight signature-damping frame', 'Fragile under direct impact', 'Break lock and reposition', {movement:{speed:7,acceleration:6,handling:6,stability:-4}, sensing:{range:1,acquisition:1,awareness:4,stealth:8}, weapon:{power:-1,reach:0,cadence:1,spread:0,control:2}, active:{id:'cloak',cooldown:20,duration:4,magnitude:8}, passive:{id:'signature-dampening',magnitude:10}, resources:{energy:4,heat:1,ammo:0,drain:3} }),
    aerocore: behavior('Aerofoil core with lift channels', 'Speed costs stability in tight spaces', 'Dive and recover', {movement:{speed:9,acceleration:7,handling:5,stability:-2}, sensing:{range:2,acquisition:1,awareness:2,stealth:2}, weapon:{power:0,reach:1,cadence:1,spread:0,control:1}, active:{id:'afterburn',cooldown:16,duration:3,magnitude:9}, passive:{id:'aerodynamic-lift',magnitude:7}, resources:{energy:4,heat:3,ammo:0,drain:3} }),
    reactor: behavior('Exposed high-output turbine cage', 'Heat and inertia are difficult to shed', 'Overcharge then vent', {movement:{speed:-5,acceleration:-4,handling:-3,stability:8}, sensing:{range:1,acquisition:0,awareness:1,stealth:-3}, weapon:{power:5,reach:0,cadence:0,spread:1,control:-1}, active:{id:'overdrive',cooldown:22,duration:4,magnitude:14}, passive:{id:'surplus-output',magnitude:10}, resources:{energy:10,heat:9,ammo:0,drain:7} }),
    paladin: behavior('Segmented shielded knight frame', 'Balanced but expensive to repair', 'Guard allies and counter', {movement:{speed:2,acceleration:1,handling:1,stability:5}, sensing:{range:1,acquisition:1,awareness:3,stealth:0}, weapon:{power:2,reach:1,cadence:0,spread:-1,control:2}, active:{id:'aegis',cooldown:20,duration:5,magnitude:9}, passive:{id:'counter-guard',magnitude:6}, resources:{energy:5,heat:3,ammo:0,drain:3} }),
  },
  head: {
    visor: behavior('Wide-band visual lock array', 'Strong lock requires line of sight', 'Acquire multiple targets', {movement:{speed:0,acceleration:0,handling:0,stability:0}, sensing:{range:4,acquisition:7,awareness:5,stealth:0}, weapon:{power:0,reach:1,cadence:0,spread:-1,control:4}, active:{id:'wide-lock',cooldown:12,duration:4,magnitude:7}, passive:{id:'target-mark',magnitude:6}, resources:{energy:2,heat:1,ammo:0,drain:2} }),
    horned: behavior('High-frequency long-range antennae', 'Noisy emissions reveal position', 'Scan before firing', {movement:{speed:-1,acceleration:0,handling:0,stability:0}, sensing:{range:10,acquisition:5,awareness:8,stealth:-4}, weapon:{power:1,reach:4,cadence:0,spread:0,control:2}, active:{id:'deep-scan',cooldown:18,duration:5,magnitude:10}, passive:{id:'early-warning',magnitude:8}, resources:{energy:6,heat:2,ammo:0,drain:4} }),
    sensor: behavior('Independent low-power scout pod', 'Limited target confidence at range', 'Probe and disengage', {movement:{speed:2,acceleration:2,handling:2,stability:0}, sensing:{range:5,acquisition:3,awareness:7,stealth:2}, weapon:{power:0,reach:0,cadence:0,spread:0,control:1}, active:{id:'probe',cooldown:10,duration:3,magnitude:6}, passive:{id:'low-signature',magnitude:4}, resources:{energy:1,heat:0,ammo:0,drain:1} }),
    wedge: behavior('Twin-wing radar wedge', 'Narrow frontal scan cone', 'Strafe through scan lanes', {movement:{speed:5,acceleration:4,handling:4,stability:-1}, sensing:{range:7,acquisition:5,awareness:5,stealth:1}, weapon:{power:0,reach:1,cadence:1,spread:-1,control:2}, active:{id:'sweep-pulse',cooldown:13,duration:2,magnitude:8}, passive:{id:'forward-clarity',magnitude:6}, resources:{energy:3,heat:1,ammo:0,drain:2} }),
    monoeye: behavior('Armored single-eye panoramic optic', 'Heavy housing reduces agility', 'Hold a firing lane', {movement:{speed:-2,acceleration:-1,handling:-2,stability:3}, sensing:{range:6,acquisition:6,awareness:6,stealth:0}, weapon:{power:1,reach:2,cadence:0,spread:-2,control:5}, active:{id:'precision-focus',cooldown:16,duration:4,magnitude:9}, passive:{id:'weakpoint-read',magnitude:7}, resources:{energy:3,heat:1,ammo:0,drain:2} }),
    vcrest: behavior('Dual-eye command crown', 'High profile is easy to spot', 'Coordinate and retarget', {movement:{speed:1,acceleration:1,handling:1,stability:1}, sensing:{range:6,acquisition:7,awareness:7,stealth:-1}, weapon:{power:1,reach:1,cadence:1,spread:-1,control:3}, active:{id:'command-link',cooldown:15,duration:5,magnitude:8}, passive:{id:'squad-synchrony',magnitude:7}, resources:{energy:4,heat:1,ammo:0,drain:3} }),
  },
  arms: {
    gauntlet: behavior('Reinforced impact fists', 'Short reach and poor ranged handling', 'Close distance and stagger', {movement:{speed:-2,acceleration:-1,handling:-1,stability:3}, sensing:{range:0,acquisition:0,awareness:0,stealth:0}, weapon:{power:8,reach:-5,cadence:1,spread:0,control:2}, active:{id:'haymaker',cooldown:12,duration:1,magnitude:12}, passive:{id:'melee-stagger',magnitude:9}, resources:{energy:2,heat:3,ammo:0,drain:1} }),
    lancer: behavior('Long precision hardpoint', 'Vulnerable while braced', 'Brace, aim, release', {movement:{speed:0,acceleration:-1,handling:-1,stability:1}, sensing:{range:1,acquisition:2,awareness:1,stealth:0}, weapon:{power:5,reach:7,cadence:-1,spread:-3,control:6}, active:{id:'lance-shot',cooldown:15,duration:1,magnitude:11}, passive:{id:'steady-aim',magnitude:8}, resources:{energy:3,heat:3,ammo:1,drain:2} }),
    talon: behavior('Twin rapid claw actuators', 'Light structure cannot absorb recoil', 'Chain hits while moving', {movement:{speed:4,acceleration:4,handling:3,stability:-2}, sensing:{range:0,acquisition:0,awareness:1,stealth:1}, weapon:{power:2,reach:-2,cadence:7,spread:1,control:1}, active:{id:'flurry',cooldown:10,duration:3,magnitude:8}, passive:{id:'combo-window',magnitude:7}, resources:{energy:2,heat:5,ammo:0,drain:2} }),
    aerofins: behavior('Swept shoulder fins and blade forearms', 'Armor sacrificed for momentum', 'Slice past the target', {movement:{speed:8,acceleration:8,handling:5,stability:-3}, sensing:{range:0,acquisition:0,awareness:1,stealth:2}, weapon:{power:3,reach:1,cadence:3,spread:0,control:1}, active:{id:'wing-cut',cooldown:11,duration:2,magnitude:9}, passive:{id:'momentum-strike',magnitude:8}, resources:{energy:3,heat:3,ammo:0,drain:2} }),
    siege: behavior('Asymmetric shielded siege arms', 'Slow weapon transitions', 'Anchor and suppress', {movement:{speed:-3,acceleration:-3,handling:-3,stability:7}, sensing:{range:0,acquisition:0,awareness:0,stealth:-1}, weapon:{power:4,reach:2,cadence:-2,spread:-1,control:3}, active:{id:'suppress',cooldown:18,duration:4,magnitude:10}, passive:{id:'shield-wall',magnitude:10}, resources:{energy:4,heat:4,ammo:1,drain:3} }),
    pauldrons: behavior('Layered knight pauldrons and bracers', 'Neither fastest nor strongest specialty', 'Counterattack on timing', {movement:{speed:1,acceleration:1,handling:1,stability:2}, sensing:{range:0,acquisition:1,awareness:1,stealth:0}, weapon:{power:4,reach:0,cadence:1,spread:-1,control:3}, active:{id:'riposte',cooldown:14,duration:2,magnitude:9}, passive:{id:'guarded-combo',magnitude:6}, resources:{energy:3,heat:2,ammo:0,drain:2} }),
  },
  legs: {
    strider: behavior('Multi-jointed adaptive legs', 'Low armor and impact resistance', 'Traverse and reposition', {movement:{speed:8,acceleration:7,handling:5,stability:-1}, sensing:{range:0,acquisition:0,awareness:1,stealth:1}, weapon:{power:0,reach:0,cadence:0,spread:0,control:0}, active:{id:'terrain-step',cooldown:10,duration:3,magnitude:7}, passive:{id:'terrain-adapt',magnitude:8}, resources:{energy:2,heat:1,ammo:0,drain:1} }),
    anchor: behavior('Heavy shock-absorbing support legs', 'Very slow acceleration', 'Plant to resist displacement', {movement:{speed:-6,acceleration:-7,handling:-4,stability:10}, sensing:{range:0,acquisition:0,awareness:0,stealth:-1}, weapon:{power:2,reach:0,cadence:-1,spread:-1,control:4}, active:{id:'root',cooldown:16,duration:5,magnitude:10}, passive:{id:'anti-knockback',magnitude:10}, resources:{energy:2,heat:1,ammo:0,drain:1} }),
    hover: behavior('Magnetic hover skirt', 'Poor stability against heavy impacts', 'Dodge laterally', {movement:{speed:9,acceleration:9,handling:8,stability:-7}, sensing:{range:0,acquisition:0,awareness:1,stealth:1}, weapon:{power:0,reach:0,cadence:1,spread:1,control:-1}, active:{id:'sidestep',cooldown:8,duration:1,magnitude:10}, passive:{id:'evasion',magnitude:9}, resources:{energy:6,heat:2,ammo:0,drain:5} }),
    reverse: behavior('Reverse-joint long-stroke hydraulics', 'High stride speed costs control', 'Sprint through openings', {movement:{speed:12,acceleration:10,handling:6,stability:-4}, sensing:{range:0,acquisition:0,awareness:1,stealth:2}, weapon:{power:0,reach:0,cadence:1,spread:0,control:0}, active:{id:'long-stride',cooldown:11,duration:3,magnitude:10}, passive:{id:'sprint-efficiency',magnitude:8}, resources:{energy:4,heat:3,ammo:0,drain:3} }),
    tetrapod: behavior('Four-point artillery support chassis', 'Cannot pivot quickly', 'Deploy and fire from cover', {movement:{speed:-4,acceleration:-5,handling:-5,stability:9}, sensing:{range:1,acquisition:0,awareness:2,stealth:-1}, weapon:{power:3,reach:2,cadence:0,spread:-1,control:4}, active:{id:'deploy-legs',cooldown:17,duration:5,magnitude:9}, passive:{id:'artillery-stability',magnitude:9}, resources:{energy:3,heat:2,ammo:0,drain:2} }),
    treads: behavior('Low-center tracked landship base', 'Lowest speed and turning response', 'Advance inexorably', {movement:{speed:-8,acceleration:-8,handling:-8,stability:12}, sensing:{range:0,acquisition:0,awareness:0,stealth:-2}, weapon:{power:3,reach:0,cadence:-1,spread:-1,control:3}, active:{id:'bulldoze',cooldown:20,duration:4,magnitude:11}, passive:{id:'traction',magnitude:12}, resources:{energy:2,heat:2,ammo:0,drain:1} }),
  },
  weapon: {
    railgun: behavior('Coil-accelerated penetrator', 'Slow cycle and high heat per shot', 'Line up a decisive shot', {movement:{speed:-1,acceleration:0,handling:0,stability:1}, sensing:{range:2,acquisition:2,awareness:0,stealth:0}, weapon:{power:10,reach:9,cadence:-5,spread:-4,control:5}, active:{id:'penetrator',cooldown:16,duration:1,magnitude:13}, passive:{id:'pierce',magnitude:10}, resources:{energy:7,heat:8,ammo:1,drain:3} }),
    arc: behavior('Forked electrical arc projector', 'Damage disperses across targets', 'Control groups rather than single targets', {movement:{speed:0,acceleration:0,handling:0,stability:0}, sensing:{range:1,acquisition:3,awareness:2,stealth:0}, weapon:{power:5,reach:5,cadence:3,spread:6,control:7}, active:{id:'chain-arc',cooldown:12,duration:2,magnitude:9}, passive:{id:'disrupt',magnitude:8}, resources:{energy:8,heat:5,ammo:0,drain:7} }),
    monoblade: behavior('Single-molecule close combat blade', 'No ranged pressure', 'Close, dash, execute', {movement:{speed:3,acceleration:3,handling:3,stability:0}, sensing:{range:0,acquisition:0,awareness:0,stealth:1}, weapon:{power:8,reach:-3,cadence:4,spread:0,control:3}, active:{id:'lunge',cooldown:9,duration:1,magnitude:12}, passive:{id:'edge',magnitude:10}, resources:{energy:2,heat:3,ammo:0,drain:1} }),
    gatling: behavior('Six-barrel rotary suppressor', 'Spin-up and sustained heat', 'Keep the trigger down', {movement:{speed:-2,acceleration:-1,handling:-1,stability:0}, sensing:{range:1,acquisition:1,awareness:0,stealth:-2}, weapon:{power:7,reach:3,cadence:10,spread:4,control:-2}, active:{id:'barrage',cooldown:20,duration:5,magnitude:12}, passive:{id:'sustained-fire',magnitude:9}, resources:{energy:3,heat:10,ammo:8,drain:2} }),
    missiles: behavior('Arcing multi-rack missile volley', 'Slow reload and visible trajectory', 'Salvo, relocate, reload', {movement:{speed:-3,acceleration:-2,handling:-1,stability:0}, sensing:{range:3,acquisition:2,awareness:1,stealth:-1}, weapon:{power:9,reach:8,cadence:-3,spread:5,control:2}, active:{id:'salvo',cooldown:22,duration:2,magnitude:14}, passive:{id:'area-denial',magnitude:9}, resources:{energy:4,heat:5,ammo:6,drain:2} }),
    beamblade: behavior('Long-hilt sweeping light blade', 'Requires committed attack arcs', 'Sweep lanes and punish pursuit', {movement:{speed:2,acceleration:1,handling:2,stability:0}, sensing:{range:0,acquisition:1,awareness:1,stealth:0}, weapon:{power:9,reach:4,cadence:2,spread:2,control:4}, active:{id:'dawn-sweep',cooldown:13,duration:2,magnitude:11}, passive:{id:'sweeping-edge',magnitude:8}, resources:{energy:6,heat:6,ammo:0,drain:4} }),
  },
  backpack: {
    compact: behavior('Compact dual utility thrusters', 'No specialized advantage', 'Use as a reliable baseline', {movement:{speed:0,acceleration:1,handling:1,stability:0}, sensing:{range:0,acquisition:0,awareness:0,stealth:0}, weapon:{power:0,reach:0,cadence:0,spread:0,control:0}, active:{id:'utility-burst',cooldown:10,duration:1,magnitude:3}, passive:{id:'serviceable',magnitude:1}, resources:{energy:1,heat:1,ammo:0,drain:1} }),
    wings: behavior('Swept wings with wingtip thrusters', 'Exposed and lightly armored', 'Maintain speed through turns', {movement:{speed:10,acceleration:8,handling:6,stability:-4}, sensing:{range:0,acquisition:0,awareness:1,stealth:1}, weapon:{power:1,reach:0,cadence:1,spread:0,control:0}, active:{id:'vector-dash',cooldown:10,duration:2,magnitude:9}, passive:{id:'air-brake',magnitude:6}, resources:{energy:5,heat:3,ammo:0,drain:4} }),
    missilepack: behavior('Shoulder-rear heavy ordnance pods', 'Adds mass and reload dependency', 'Fire from cover', {movement:{speed:-3,acceleration:-3,handling:-2,stability:1}, sensing:{range:1,acquisition:1,awareness:0,stealth:-1}, weapon:{power:7,reach:5,cadence:-2,spread:3,control:1}, active:{id:'pod-volley',cooldown:21,duration:2,magnitude:12}, passive:{id:'extra-ordnance',magnitude:7}, resources:{energy:3,heat:5,ammo:5,drain:2} }),
    funnels: behavior('Six autonomous floating funnel modules', 'High coordination and energy demand', 'Flank targets with remote fire', {movement:{speed:0,acceleration:0,handling:1,stability:-1}, sensing:{range:4,acquisition:4,awareness:5,stealth:0}, weapon:{power:5,reach:6,cadence:4,spread:4,control:6}, active:{id:'funnel-net',cooldown:17,duration:4,magnitude:10}, passive:{id:'crossfire',magnitude:8}, resources:{energy:9,heat:4,ammo:0,drain:8} }),
    reactorpack: behavior('Ring reactor with cooling fin array', 'Large thermal signature and mass', 'Convert heat into output', {movement:{speed:-3,acceleration:-2,handling:-1,stability:2}, sensing:{range:1,acquisition:0,awareness:0,stealth:-3}, weapon:{power:3,reach:0,cadence:1,spread:0,control:0}, active:{id:'thermal-dump',cooldown:18,duration:1,magnitude:10}, passive:{id:'power-buffer',magnitude:9}, resources:{energy:11,heat:-4,ammo:0,drain:6} }),
    booster: behavior('Twin vectorable sprint nozzles', 'Consumes energy rapidly and exposes exhaust', 'Burst in straight lines', {movement:{speed:13,acceleration:12,handling:4,stability:-5}, sensing:{range:0,acquisition:0,awareness:0,stealth:-2}, weapon:{power:0,reach:0,cadence:1,spread:0,control:-1}, active:{id:'comet-burn',cooldown:12,duration:3,magnitude:12}, passive:{id:'burst-thrust',magnitude:10}, resources:{energy:8,heat:7,ammo:0,drain:8} }),
  },
};

export const componentBehaviorRegistry = freeze(table);

export function getComponentBehavior(slot, id) {
  return componentBehaviorRegistry[slot]?.[id] || fallback;
}

export function compileLoadout(parts = {}) {
  const components = {};
  const unknown = [];
  const totals = { movement:{speed:0,acceleration:0,handling:0,stability:0}, sensing:{range:0,acquisition:0,awareness:0,stealth:0}, weapon:{power:0,reach:0,cadence:0,spread:0,control:0}, resources:{energy:0,heat:0,ammo:0,drain:0} };
  SLOTS.forEach(slot => {
    const id = parts && typeof parts === 'object' ? parts[slot] : undefined;
    const known = Boolean(componentBehaviorRegistry[slot]?.[id]);
    components[slot] = { id: id ?? null, behavior: getComponentBehavior(slot, id) };
    if (id != null && !known) unknown.push({ slot, id });
    ['movement','sensing','weapon','resources'].forEach(group => Object.keys(totals[group]).forEach(key => { totals[group][key] += components[slot].behavior[group][key] || 0; }));
  });
  return freeze({ parts: Object.fromEntries(SLOTS.map(slot => [slot, components[slot].id])), components, totals, unknown, valid: unknown.length === 0 });
}

export function getLoadoutSummary(partsOrCompiled = {}) {
  const compiled = partsOrCompiled?.components ? partsOrCompiled : compileLoadout(partsOrCompiled);
  const labels = SLOTS.map(slot => `${slot}:${compiled.components[slot].behavior.mechanism}`).join(' | ');
  return freeze({ valid: compiled.valid, unknown: compiled.unknown, labels, totals: compiled.totals, active: SLOTS.map(slot => compiled.components[slot].behavior.active.id).filter(id => id !== 'none'), passives: SLOTS.map(slot => compiled.components[slot].behavior.passive.id).filter(id => id !== 'none') });
}

export function validateAllComponents() {
  const coverage = {};
  let total = 0;
  SLOTS.forEach(slot => { coverage[slot] = Object.keys(componentBehaviorRegistry[slot]).length; total += coverage[slot]; });
  return freeze({ valid: total === 36 && SLOTS.every(slot => coverage[slot] > 0), total, coverage });
}

export { fallback as unknownComponentBehavior, SLOTS as behaviorSlots };
