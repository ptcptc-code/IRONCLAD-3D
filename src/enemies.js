const ARCHETYPES = {
  assault: { maxHp: 90, shield: 20, speed: 3.2, range: 8, damage: 10, cooldown: 1.25, radius: .65, score: 1 },
  ranged: { maxHp: 65, shield: 35, speed: 2.15, range: 16, damage: 8, cooldown: 1.8, radius: .55, score: 1 },
  heavy: { maxHp: 210, shield: 70, speed: 1.15, range: 9, damage: 22, cooldown: 2.5, radius: 1, score: 3 }
};
const pos = p => ({ x: Number(p?.x) || 0, y: Number(p?.y) || 0, z: Number(p?.z) || 0 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const norm = (x, z) => { const n = Math.hypot(x, z) || 1; return { x: x / n, z: z / n }; };
export function createEnemy({ id, type = 'assault', position = {}, seed = 1, battlefield = {} } = {}) {
  const spec = ARCHETYPES[type] || ARCHETYPES.assault; const origin = pos(position); let state = { ...origin }; let cooldown = 0;
  const enemy = { id: id || `enemy-${type}`, type: ARCHETYPES[type] ? type : 'assault', position: state, maxHp: spec.maxHp, hp: spec.maxHp, maxShield: spec.shield, shield: spec.shield, radius: spec.radius, alive: true, state: 'patrol', score: spec.score, seed: seed >>> 0, cooldown: 0,
    update(dt, player, emit) { if (!enemy.alive) return; cooldown = Math.max(0, cooldown - dt); enemy.cooldown = cooldown; const d = distance(state, player.position); const los = battlefield.hasLineOfSight ? battlefield.hasLineOfSight(state, player.position) : true; if (!los) enemy.state = 'seek'; else if (d <= spec.range) enemy.state = 'attack'; else enemy.state = 'advance'; if (enemy.state !== 'attack') { const v = norm(player.position.x - state.x, player.position.z - state.z); const next = { x: state.x + v.x * spec.speed * dt, y: state.y, z: state.z + v.z * spec.speed * dt }; state = battlefield.resolveCollision ? pos(battlefield.resolveCollision(next, enemy.radius, state)) : next; enemy.position = state; } else if (cooldown <= 0 && los) { cooldown = spec.cooldown; enemy.cooldown = cooldown; emit({ type: 'enemy-fire', actorId: enemy.id, targetId: 'player', origin: { ...state }, targetPosition: { ...player.position }, damage: spec.damage, archetype: enemy.type }); } },
    damage(amount, source = 'player') { let remaining = Math.max(0, Number(amount) || 0); const shieldDamage = Math.min(enemy.shield, remaining); enemy.shield -= shieldDamage; remaining -= shieldDamage; const hpDamage = Math.min(enemy.hp, remaining); enemy.hp -= hpDamage; if (enemy.hp <= 0) enemy.alive = false; return { applied: shieldDamage + hpDamage, shieldDamage, hpDamage, killed: !enemy.alive, source }; },
    reset() { state = { ...origin }; enemy.position = state; enemy.hp = spec.maxHp; enemy.shield = spec.shield; enemy.alive = true; enemy.state = 'patrol'; cooldown = 0; }
  }; return enemy;
}
export function getEnemyArchetypes() { return Object.fromEntries(Object.entries(ARCHETYPES).map(([k, v]) => [k, { ...v }])); }
