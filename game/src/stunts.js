// Stunts — four wooden ramps around the bay. Hit one fast and the car flies;
// air time and distance pay cash, and beating your best jump pays a bonus.
import { dist } from './random.js';
import { STUNT } from './config.js';

export function createStunts() {
  return { bestAir: 0, bestDist: 0, current: null };
}

export function updateStunts(G, dt) {
  const p = G.player;
  const v = p.vehicle;
  const st = G.stats;
  if (!v || v.wreck) return;
  // Launch: fast, on a ramp, not already airborne.
  if (!v.airborne) {
    for (const r of G.city.ramps) {
      if (dist(v.x, v.y, r.x, r.y) < 34 && Math.abs(v.speed) > 380) {
        const along = Math.cos(v.angle - r.angle);
        if (along > 0.55) {
          v.airborne = 1;
          v.airT = 0;
          v.airStart = { x: v.x, y: v.y };
          G.messages.push({ text: 'Airborne!', t: 1, color: '#ffd166' });
        }
      }
    }
    return;
  }
  // Airborne: the clock runs until the wheels touch down again.
  v.airT += dt;
  const speed = Math.abs(v.speed);
  v.airborne = v.airT < 0.9 + speed / 900 ? 1 : 0;
  if (v.airborne) return;
  // Landed.
  const airDist = dist(v.x, v.y, v.airStart.x, v.airStart.y);
  const pay = Math.round(v.airT * STUNT.perSecondAir + airDist * STUNT.perMetre);
  let bonus = 0;
  if (v.airT > st.bestAir) {
    st.bestAir = v.airT;
    bonus += STUNT.bestBonus;
  }
  if (airDist > st.bestDist) st.bestDist = airDist;
  p.cash += pay + bonus;
  G.messages.push({
    text: `Stunt! ${v.airT.toFixed(1)}s air, ${Math.round(airDist)}m — +$${pay + bonus}`,
    t: 2.6, color: '#7bc47f',
  });
  G.audio.cash();
  v.airStart = null;
}
