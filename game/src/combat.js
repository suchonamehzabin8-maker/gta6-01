// Palmera Bay — Sunset Run: combat.
// Three weapons — pistol, spray gun, boomstick — plus fists, and the
// pickups scattered around the bay: health, ammo and cash.

import { WEAPONS, PLAYER } from './config.js';
import { clamp } from './random.js';
import { collideBuildings } from './city.js';

export function createCombat() {
  return {
    bullets: [],
    weapon: 'pistol',
    owned: { pistol: true, smg: false, boomstick: false },
    ammo: { pistol: Infinity, smg: 0, boomstick: 0 },
    cooldown: 0,
    punchT: 0,
    particles: [],
  };
}

export function currentWeapon(combat) {
  return WEAPONS[combat.weapon];
}

export function switchWeapon(combat, name) {
  if (combat.owned[name]) combat.weapon = name;
}

export function cycleWeapon(combat, dir) {
  const order = ['pistol', 'smg', 'boomstick'].filter((w) => combat.owned[w]);
  if (order.length < 2) return;
  const i = order.indexOf(combat.weapon);
  combat.weapon = order[(i + dir + order.length) % order.length];
}

export function giveWeapon(combat, name, ammo) {
  combat.owned[name] = true;
  combat.ammo[name] = (combat.ammo[name] || 0) + ammo;
  combat.weapon = name;
}

// Fire from (x, y) along angle. Returns true if a shot went out.
export function shoot(combat, x, y, angle) {
  if (combat.cooldown > 0) return false;
  const def = WEAPONS[combat.weapon];
  if (combat.ammo[combat.weapon] !== Infinity) {
    if (combat.ammo[combat.weapon] <= 0) return false;
    combat.ammo[combat.weapon]--;
  }
  combat.cooldown = def.rate;
  for (let i = 0; i < def.pellets; i++) {
    const spread = (Math.random() - 0.5) * 2 * def.spread;
    combat.bullets.push({
      x: x + Math.cos(angle) * 24,
      y: y + Math.sin(angle) * 24,
      vx: Math.cos(angle + spread) * def.speed,
      vy: Math.sin(angle + spread) * def.speed,
      life: def.range / def.speed,
      damage: def.damage,
      kind: combat.weapon,
    });
  }
  return true;
}

// Move bullets; returns hit events {type:'hit-vehicle'|'hit-person'|'hit-wall', ...}.
export function updateBullets(combat, dt, city, vehicles, people) {
  const events = [];
  combat.cooldown = Math.max(0, combat.cooldown - dt);
  combat.punchT = Math.max(0, combat.punchT - dt);
  for (let i = combat.bullets.length - 1; i >= 0; i--) {
    const b = combat.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let dead = false;
    // Buildings stop bullets.
    const probe = { x: b.x, y: b.y };
    if (collideBuildings(city, probe, 2)) {
      events.push({ type: 'hit-wall', x: b.x, y: b.y });
      dead = true;
    }
    if (!dead) {
      for (const v of vehicles) {
        if (v.wreck) continue;
        const dx = b.x - v.x;
        const dy = b.y - v.y;
        if (dx * dx + dy * dy < 30 * 30) {
          events.push({ type: 'hit-vehicle', vehicle: v, damage: b.damage, x: b.x, y: b.y });
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const p of people) {
        if (p.state === 'down') continue;
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        if (dx * dx + dy * dy < 18 * 18) {
          events.push({ type: 'hit-person', person: p, damage: b.damage, x: b.x, y: b.y });
          dead = true;
          break;
        }
      }
    }
    b.life -= dt;
    if (b.life <= 0) dead = true;
    if (dead) combat.bullets.splice(i, 1);
  }
  // Particles (muzzle flashes, impacts) age out on their own.
  for (let i = combat.particles.length - 1; i >= 0; i--) {
    const pt = combat.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.life <= 0) combat.particles.splice(i, 1);
  }
  return events;
}

export function spawnBurst(combat, x, y, color, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 160;
    combat.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.3, color });
  }
}

// A punch: anything in the arc in front of the player takes damage.
export function punch(combat, x, y, angle, people, vehicles) {
  if (combat.punchT > 0) return [];
  combat.punchT = PLAYER.punchCooldown;
  const hits = [];
  const range = PLAYER.punchRange;
  for (const p of people) {
    if (p.state === 'down') continue;
    const dx = p.x - x;
    const dy = p.y - y;
    const d = Math.hypot(dx, dy);
    if (d > range) continue;
    const a = Math.atan2(dy, dx);
    let diff = a - angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < PLAYER.punchArc) hits.push({ type: 'person', target: p });
  }
  for (const v of vehicles) {
    if (v.wreck) continue;
    const dx = v.x - x;
    const dy = v.y - y;
    if (Math.hypot(dx, dy) < range + 10) hits.push({ type: 'vehicle', target: v });
  }
  return hits;
}

// --- Pickups ----------------------------------------------------------------

export function spawnPickups(city) {
  return [
    { kind: 'health', x: 800, y: 700, taken: false },
    { kind: 'health', x: 2100, y: 1200, taken: false },
    { kind: 'health', x: 3100, y: 1300, taken: false },
    { kind: 'ammo', x: 400, y: 2050, taken: false },
    { kind: 'ammo', x: 2900, y: 2150, taken: false },
    { kind: 'cash', x: 1200, y: 800, taken: false },
    { kind: 'cash', x: 2400, y: 800, taken: false },
    { kind: 'cash', x: 1600, y: 2200, taken: false },
  ];
}

export function pickupNear(pickups, x, y, maxD = 30) {
  for (const p of pickups) {
    if (p.taken) continue;
    const dx = p.x - x;
    const dy = p.y - y;
    if (dx * dx + dy * dy < maxD * maxD) return p;
  }
  return null;
}
