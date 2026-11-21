// Garages — Spray & Go: repair damage and repaint, priced by the state of
// the car. The only cure for spike-popped tyres. Drive into the green ring
// and press G.
import { PRICES } from './config.js';
import { dist } from './random.js';

export function garageInRange(G) {
  const p = G.player;
  if (!p.vehicle) return null;
  for (const g of G.city.garages) {
    if (dist(p.vehicle.x, p.vehicle.y, g.x, g.y) < 85) return g;
  }
  return null;
}

export function repairCost(v, paintOnly) {
  const damageCost = Math.round(v.damage * PRICES.repairPerDamage);
  return paintOnly ? PRICES.repaint : damageCost + (v.tyresPopped ? 120 : 0);
}

export function useGarage(G, paintOnly) {
  const p = G.player;
  const v = p.vehicle;
  const g = garageInRange(G);
  if (!v || !g) return false;
  const cost = paintOnly ? PRICES.repaint : repairCost(v, false);
  if (p.cash < cost) {
    G.messages.push({ text: `Need $${cost} — you have $${p.cash}`, t: 2, color: '#ff8a80' });
    return false;
  }
  if (!paintOnly && v.damage <= 0 && !v.tyresPopped) {
    G.messages.push({ text: 'No damage to repair', t: 1.6, color: '#ffd166' });
    return false;
  }
  p.cash -= cost;
  if (!paintOnly) {
    v.damage = 0;
    v.tyresPopped = false;
  }
  // A fresh coat: pick a new colour from the street palette.
  const palette = ['#d64545', '#3d8bfd', '#f2c14e', '#7bc47f', '#e07a5f', '#9b7ede', '#e8e8e8', '#ff5d8f'];
  v.color = palette[G.rng.int(0, palette.length - 1)];
  G.messages.push({ text: paintOnly ? `Repainted! -$${cost}` : `Repaired & repainted! -$${cost}`, t: 2.2, color: '#7bc47f' });
  G.audio.cash();
  return true;
}
