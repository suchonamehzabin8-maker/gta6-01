// The minimap — the whole city shrunk to a corner of the HUD, with the
// player, police, mission marker, tokens, garages and ramps on it.
import { WORLD } from './config.js';
import { MISSIONS } from './missions.js';

export function drawMinimap(ctx, G, x, y, size) {
  const s = size / WORLD.w;
  const city = G.city;
  const p = G.player;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size * (WORLD.h / WORLD.w));
  ctx.clip();
  // Water, sand, land.
  ctx.fillStyle = '#1b4d6b';
  ctx.fillRect(x, y, size, size * (WORLD.h / WORLD.w));
  ctx.fillStyle = '#3f7a52';
  ctx.fillRect(x, y, size, size * (2320 / WORLD.w));
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(x, y + size * (2320 / WORLD.w), size, size * ((2500 - 2320) / WORLD.w));
  // Roads.
  ctx.strokeStyle = '#5a5f6a';
  ctx.lineWidth = Math.max(2, size * 0.012);
  for (const rx of [300, 700, 1100, 1500, 1900, 2300, 2700, 3100]) {
    ctx.beginPath();
    ctx.moveTo(x + rx * s, y);
    ctx.lineTo(x + rx * s, y + size * (WORLD.h / WORLD.w));
    ctx.stroke();
  }
  for (const ry of [250, 650, 1050, 1450, 1850, 2250]) {
    ctx.beginPath();
    ctx.moveTo(x, y + ry * s);
    ctx.lineTo(x + size, y + ry * s);
    ctx.stroke();
  }
  const dot = (wx, wy, color, r = 3) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + wx * s, y + wy * s, r, 0, Math.PI * 2);
    ctx.fill();
  };
  // Buildings as faint blocks.
  ctx.fillStyle = 'rgba(40,44,54,0.85)';
  for (const b of city.buildings) {
    ctx.fillRect(x + b.x * s, y + b.y * s, Math.max(1.5, b.w * s), Math.max(1.5, b.h * s));
  }
  // Garages and ramps.
  for (const g of city.garages) dot(g.x, g.y, '#3d8bfd', 3.5);
  for (const r of city.ramps) dot(r.x, r.y, '#f2c14e', 3);
  // Sunset tokens still hidden.
  for (const t of city.tokens) if (!t.found) dot(t.x, t.y, '#ffd166', 2.5);
  // Mission marker / fare dropoff.
  const marker = missionMarker(G);
  if (marker) {
    ctx.fillStyle = '#ff5d8f';
    ctx.beginPath();
    ctx.arc(x + marker.x * s, y + marker.y * s, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Police, helicopter.
  for (const c of G.wanted.cruisers) dot(c.x, c.y, '#ff4757', 3);
  if (G.wanted.heli) dot(G.wanted.heli.x, G.wanted.heli.y, '#ff4757', 4);
  // The player, on top, with a white ring.
  const px = p.vehicle ? p.vehicle.x : p.x;
  const py = p.vehicle ? p.vehicle.y : p.y;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + px * s, y + py * s, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22d3ee';
  ctx.beginPath();
  ctx.arc(x + px * s, y + py * s, 3, 0, Math.PI * 2);
  ctx.fill();
  // Frame.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, size, size * (WORLD.h / WORLD.w));
  ctx.restore();
}

function missionMarker(G) {
  const m = G.missions;
  if (m.fare) return m.fare.dropoff;
  if (m.active < 0) return null;
  const def = MISSIONS[m.active];
  if (!def) return null;
  const step = def.steps[m.step];
  if (!step) return null;
  if (step.type === 'race') {
    const cp = G.city.raceRoute[m.raceCp];
    return cp ? { x: cp.x, y: cp.y } : null;
  }
  if (step.type === 'collect') {
    const next = m.crates.find(c => !c.got);
    return next ? { x: next.x, y: next.y } : null;
  }
  if (step.type === 'defeat') {
    const goon = G.peds.find(pd => pd.kind === 'goon' && pd.hp > 0);
    return goon ? { x: goon.x, y: goon.y } : null;
  }
  if (step.x !== undefined) return { x: step.x, y: step.y };
  return null;
}
