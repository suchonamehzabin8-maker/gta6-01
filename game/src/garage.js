// Palmera Bay — Sunset Run: Spray & Go garages.
// Mara's Garage and Sunset Spray repair and repaint (G in the green ring),
// priced by damage. A garage is also the only cure for spike-popped tyres.

import { PRICES } from './config.js';

export function garageAt(city, x, y) {
  for (const g of city.garages) {
    const dx = x - g.x;
    const dy = y - g.y;
    if (dx * dx + dy * dy < g.r * g.r) return g;
  }
  return null;
}

export function repairCost(vehicle, repaint) {
  const missing = Math.max(0, 100 - vehicle.health);
  let cost = Math.ceil(missing * PRICES.repairPerHealth);
  if (vehicle.tyres < 4) cost += PRICES.tyreFix;
  if (repaint) cost += PRICES.repaint;
  return cost;
}

export function paintCost() {
  return PRICES.repaint;
}

const PAINTS = ['#d94f3d', '#3d7dd9', '#e8b93d', '#7ed67e', '#c9c9c9', '#8a5ad9', '#e87ab5', '#3dc9c9', '#222222', '#f2f2f2'];

// Repair + optional repaint. Returns {ok, cost, message}.
export function applyRepair(state, vehicle, repaint) {
  const cost = repairCost(vehicle, repaint);
  if (cost <= 0) return { ok: false, cost: 0, message: 'Already in perfect shape.' };
  if (state.cash < cost) return { ok: false, cost, message: `Need $${cost} — you have $${state.cash}.` };
  state.cash -= cost;
  vehicle.health = 100;
  vehicle.wreck = false;
  vehicle.tyres = 4;
  if (repaint) {
    let next = vehicle.color;
    while (next === vehicle.color) {
      next = PAINTS[Math.floor(Math.random() * PAINTS.length)];
    }
    vehicle.color = next;
  }
  return { ok: true, cost, message: repaint ? `Repaired and repainted — $${cost}.` : `Repaired — $${cost}.` };
}

// Paint only, no repair. Returns {ok, cost, message}.
export function applyPaint(state, vehicle) {
  const cost = paintCost();
  if (state.cash < cost) return { ok: false, cost, message: `Need $${cost} for a repaint.` };
  state.cash -= cost;
  let next = vehicle.color;
  while (next === vehicle.color) {
    next = PAINTS[Math.floor(Math.random() * PAINTS.length)];
  }
  vehicle.color = next;
  return { ok: true, cost, message: `Fresh paint — $${cost}.` };
}
