// Combat on foot: aim with the mouse, shoot with a click, punch up close.
// Three weapons — the pistol Mara starts with, the spray gun (SMG) picked
// up around the bay, and the boomstick (shotgun) at the stadium and the
// boardwalk — plus bullets, pickups (health, ammo, cash, weapons) and the
// crime callback that feeds the wanted system. Weapon pickups sit at
// fixed spots so a player who explores finds the better guns. Bullets hurt
// cars too: a car shot enough becomes a smoking wreck.
import { PLAYER, WEAPONS } from './config.js';
import { hitBuilding } from './city.js';
import { damageCar } from './vehicles.js';

export function createCombat() {
  return {
    bullets: [],
    ammo: 24,
    maxAmmo: 180,
    fireTimer: 0,
    muzzle: 0,
    weapon: 'pistol',
    owned: { pistol: true, smg: false, shotgun: false },
    pickups: [], // {x, y, kind: 'health'|'ammo'|'cash'|'weapon', value, bob}
  };
}

export function currentWeapon(combat) {
  return WEAPONS[combat.weapon] || WEAPONS.pistol;
}

export function switchWeapon(combat, name) {
  if (combat.owned[name]) {
    combat.weapon = name;
    return true;
  }
  return false;
}

export function shoot(combat, x, y, angle, onCrime) {
  const weapon = currentWeapon(combat);
  if (combat.fireTimer > 0 || combat.ammo <= 0) return false;
  combat.fireTimer = weapon.fireRate;
  combat.ammo -= 1;
  combat.muzzle = 0.08;
  // The boomstick fires a spread of pellets from one shell; every other
  // gun fires a single bullet. Pellets fly a shorter distance, so the
  // shotgun is a close-range room-clearer, not a sniper.
  const pellets = weapon.pellets || 1;
  for (let i = 0; i < pellets; i += 1) {
    const spread = (Math.random() - 0.5) * 2 * weapon.spread;
    combat.bullets.push({
      x, y,
      angle: angle + spread,
      speed: weapon.bulletSpeed,
      life: pellets > 1 ? 0.45 : 0.9,
      fromPlayer: true,
      damage: weapon.damage,
      weapon: combat.weapon,
    });
  }
  if (onCrime) onCrime(8);
  return weapon;
}

export function punch(combat, player, peds, cops, onCrime) {
  // Hits the nearest person inside the punch arc.
  let best = null;
  let bestD = PLAYER.punchRange;
  const consider = (p) => {
    if (p.dead) return;
    const d = Math.hypot(p.x - player.x, p.y - player.y);
    if (d > bestD) return;
    const a = Math.atan2(p.y - player.y, p.x - player.x);
    let diff = Math.abs(a - player.angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff < PLAYER.punchArc) {
      best = p;
      bestD = d;
    }
  };
  peds.forEach(consider);
  cops.forEach(consider);
  if (best) {
    if (best.kind === 'goon') {
      // Goons are tougher than a bystander: three punches to drop one,
      // and no heat for fighting Syndicate muscle in the brawl.
      best.hp = (best.hp ?? 3) - 1;
      if (best.hp <= 0) best.dead = true;
    } else {
      best.dead = true;
      if (onCrime) onCrime(best.kind === 'cop' ? 80 : 35);
    }
    return best;
  }
  return null;
}

export function updateBullets(combat, dt, city, peds, cops, cars, player, onHit, onWreck) {
  for (const b of combat.bullets) {
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    if (hitBuilding(city, b.x, b.y, 2)) {
      b.life = 0;
      continue;
    }
    if (b.fromPlayer) {
      for (const p of [...peds, ...cops]) {
        if (p.dead) continue;
        if (Math.hypot(p.x - b.x, p.y - b.y) < 15) {
          // Cops take two pistol hits; peds go down in one.
          p.hp = (p.hp ?? 1) - 1;
          if (p.hp <= 0) {
            p.dead = true;
            if (onHit) onHit(p);
          }
          b.life = 0;
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const c of cars) {
        if (c.driver === 'player') continue;
        if (Math.hypot(c.x - b.x, c.y - b.y) < 26) {
          if (damageCar(c, b.damage) && onWreck) onWreck(c);
          b.life = 0;
          break;
        }
      }
    }
  }
  combat.bullets = combat.bullets.filter((b) => b.life > 0);
  if (combat.fireTimer > 0) combat.fireTimer -= dt;
  if (combat.muzzle > 0) combat.muzzle -= dt;
}

export function updatePickups(combat, dt, player, onPickup) {
  for (const p of combat.pickups) p.bob = (p.bob || 0) + dt;
  const kept = [];
  for (const p of combat.pickups) {
    if (Math.hypot(p.x - player.x, p.y - player.y) < 30) {
      if (onPickup) onPickup(p);
    } else {
      kept.push(p);
    }
  }
  combat.pickups = kept;
}

export function dropPickup(combat, x, y, kind, value) {
  combat.pickups.push({ x, y, kind, value, bob: 0 });
}

// A weapon pickup: grants the SMG (and a clip of ammo) the first time,
// ammo after that.
export function dropWeaponPickup(combat, x, y) {
  combat.pickups.push({ x, y, kind: 'weapon', value: 'smg', bob: 0 });
}

// A boomstick pickup: grants the shotgun (and shells) the first time,
// shells after that. The value names the weapon, so the pickup handler
// knows which gun to hand over.
export function dropShotgunPickup(combat, x, y) {
  combat.pickups.push({ x, y, kind: 'weapon', value: 'shotgun', bob: 0 });
}
