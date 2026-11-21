// Combat — three weapons, punching, and the pickups the city hides. Shooting
// is hitscan with spread: each pellet walks a short line and the first thing
// it meets takes the damage.
import { clamp, dist, angleTo } from './random.js';
import { WEAPONS, WEAPON_ORDER, PLAYER } from './config.js';

export function createCombat() {
  return {
    weapon: 'pistol',
    ammo: { pistol: Infinity, smg: 0, shotgun: 0 },
    cooldown: 0,
    punchCooldown: 0,
    shotsFiredRecently: 0,
    bullets: [], // tracer visuals {x,y,ax,ay,t}
    pickups: [], // {kind:'health'|'ammo'|'cash', x, y, amount, weapon}
  };
}

export function switchWeapon(G, dir) {
  const owned = WEAPON_ORDER.filter(w => G.combat.ammo[w] > 0 || WEAPONS[w].infinite);
  if (owned.length === 0) return;
  const i = owned.indexOf(G.combat.weapon);
  const next = owned[(i + dir + owned.length) % owned.length];
  G.combat.weapon = next;
  G.messages.push({ text: WEAPONS[next].name, t: 1.2, color: '#ffd166' });
}

export function fireWeapon(G) {
  const c = G.combat;
  const p = G.player;
  if (c.cooldown > 0 || p.hp <= 0) return;
  const w = WEAPONS[c.weapon];
  if (!w.infinite && c.ammo[c.weapon] <= 0) {
    switchWeapon(G, 1);
    return;
  }
  c.cooldown = w.rate;
  if (!w.infinite) c.ammo[c.weapon]--;
  c.shotsFiredRecently = 1.2;
  G.audio.shot();
  if (c.weapon === 'shotgun') G.audio.shotgun();
  const base = p.aimAngle;
  for (let i = 0; i < w.pellets; i++) {
    const a = base + (G.rng.next() - 0.5) * 2 * w.spread;
    shootPellet(G, p.x, p.y, a, w);
  }
  if (p.vehicle) {
    // Firing from a car spooks the street.
    G.wanted.heat = Math.min(120, G.wanted.heat + 2);
  }
}

function shootPellet(G, x, y, angle, w) {
  const step = 14;
  let cx = x, cy = y;
  let hitX = x + Math.cos(angle) * w.range;
  let hitY = y + Math.sin(angle) * w.range;
  let hit = null;
  for (let d = 0; d < w.range; d += step) {
    cx = x + Math.cos(angle) * d;
    cy = y + Math.sin(angle) * d;
    const b = G.city.buildings.find(bd => cx >= bd.x && cx <= bd.x + bd.w && cy >= bd.y && cy <= bd.y + bd.h);
    if (b) { hitX = cx; hitY = cy; break; }
    const ped = G.peds.find(pd => pd.hp > 0 && dist(cx, cy, pd.x, pd.y) < 14);
    if (ped) { hit = { kind: 'ped', target: ped }; hitX = cx; hitY = cy; break; }
    const cop = G.cops.find(cp => cp.hp > 0 && dist(cx, cy, cp.x, cp.y) < 14);
    if (cop) { hit = { kind: 'cop', target: cop }; hitX = cx; hitY = cy; break; }
    const goon = G.peds.find(pd => pd.kind === 'goon' && pd.hp > 0 && dist(cx, cy, pd.x, pd.y) < 16);
    if (goon) { hit = { kind: 'goon', target: goon }; hitX = cx; hitY = cy; break; }
    for (const v of [...G.vehicles, ...G.traffic]) {
      if (v.wreck) continue;
      if (dist(cx, cy, v.x, v.y) < 20) {
        hit = { kind: 'vehicle', target: v }; hitX = cx; hitY = cy; break;
      }
    }
    if (hit) break;
  }
  G.combat.bullets.push({ x, y, ax: hitX, ay: hitY, t: 0.09 });
  if (!hit) return;
  if (hit.kind === 'vehicle') {
    hit.target.damage = clamp(hit.target.damage + w.damage * 0.4, 0, 100);
    if (hit.target.damage >= 100) hit.target.wreck = true;
    return;
  }
  hit.target.hp -= w.damage;
  G.wanted.heat = Math.min(120, G.wanted.heat + (hit.kind === 'cop' ? 12 : 5));
  if (hit.target.hp <= 0) {
    if (hit.kind === 'cop') G.wanted.heat = Math.min(120, G.wanted.heat + 10);
    if (G.rng.chance(0.35)) {
      G.combat.pickups.push({ kind: 'cash', x: hit.target.x, y: hit.target.y, amount: 40 });
    }
    G.messages.push({ text: hit.kind === 'goon' ? `${hit.target.name} is down!` : 'Target down', t: 1.4, color: '#ffd166' });
  }
}

export function punch(G) {
  const c = G.combat;
  const p = G.player;
  if (c.punchCooldown > 0 || p.hp <= 0) return;
  c.punchCooldown = PLAYER.punchCooldown;
  G.audio.punch();
  const a = p.angle;
  const hx = p.x + Math.cos(a) * PLAYER.punchRange;
  const hy = p.y + Math.sin(a) * PLAYER.punchRange;
  let struck = false;
  for (const ped of G.peds) {
    if (ped.hp <= 0) continue;
    if (dist(hx, hy, ped.x, ped.y) < 26) {
      ped.hp -= PLAYER.punchDamage;
      struck = true;
      if (ped.kind === 'goon' && ped.hp <= 0) {
        G.messages.push({ text: `${ped.name} is down!`, t: 1.4, color: '#ffd166' });
      }
    }
  }
  for (const cop of G.cops) {
    if (cop.hp > 0 && dist(hx, hy, cop.x, cop.y) < 26) {
      cop.hp -= PLAYER.punchDamage;
      struck = true;
      G.wanted.heat = Math.min(120, G.wanted.heat + 8);
    }
  }
  if (struck) G.wanted.heat = Math.min(120, G.wanted.heat + 2);
}

export function updateCombat(G, dt) {
  const c = G.combat;
  c.cooldown = Math.max(0, c.cooldown - dt);
  c.punchCooldown = Math.max(0, c.punchCooldown - dt);
  c.shotsFiredRecently = Math.max(0, c.shotsFiredRecently - dt);
  for (const b of c.bullets) b.t -= dt;
  c.bullets = c.bullets.filter(b => b.t > 0);
  // Pickups: walk over them on foot.
  const p = G.player;
  for (const pk of c.pickups) {
    if (p.onFoot && dist(p.x, p.y, pk.x, pk.y) < 26) {
      if (pk.kind === 'health') {
        p.hp = clamp(p.hp + 40, 0, PLAYER.maxHp);
        G.messages.push({ text: '+40 health', t: 1.4, color: '#7bc47f' });
      } else if (pk.kind === 'ammo') {
        c.ammo[pk.weapon] = (c.ammo[pk.weapon] || 0) + pk.amount;
        G.messages.push({ text: `+${pk.amount} ${WEAPONS[pk.weapon].name} ammo`, t: 1.4, color: '#ffd166' });
      } else {
        p.cash += pk.amount;
        G.messages.push({ text: `+$${pk.amount}`, t: 1.4, color: '#7bc47f' });
      }
      G.audio.pickup();
      pk.taken = true;
    }
  }
  c.pickups = c.pickups.filter(pk => !pk.taken);
}

export function spawnStashPickups(G) {
  // Weapon stashes become pickups the first time the player walks near one.
  for (const s of G.city.stashes) {
    G.combat.pickups.push({ kind: 'ammo', weapon: s.weapon, x: s.x, y: s.y, amount: s.weapon === 'smg' ? 240 : 24, stash: true });
  }
  // A few health kits around the map.
  for (const [x, y] of [[1200, 900], [2600, 1600], [600, 1900], [3000, 800]]) {
    G.combat.pickups.push({ kind: 'health', x, y, amount: 40 });
  }
}
