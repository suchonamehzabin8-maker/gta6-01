// Palmera Bay — Sunset Run: the minimap.
// A small live map in the corner: roads, water, the player arrow, police,
// the mission marker, tokens, garages, ramps and goons.

import { WORLD } from './config.js';

export function drawMinimap(ctx, G) {
  const w = 196;
  const h = 142;
  const x0 = G.view.w - w - 14;
  const y0 = 14;
  const sx = w / WORLD.w;
  const sy = h / WORLD.h;

  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#10151c';
  ctx.fillRect(x0 - 4, y0 - 4, w + 8, h + 8);
  ctx.globalAlpha = 1;
  // Water and sand on the east edge.
  ctx.fillStyle = '#1f6391';
  ctx.fillRect(x0 + WORLD.sandX * sx, y0, w - WORLD.sandX * sx, h);
  ctx.fillStyle = '#e8d39a';
  ctx.fillRect(x0 + WORLD.sandX * sx - 4, y0, 4, h);
  // Roads.
  ctx.strokeStyle = '#5a6068';
  ctx.lineWidth = 2;
  for (const rx of G.city.roadsX) {
    ctx.beginPath();
    ctx.moveTo(x0 + rx * sx, y0);
    ctx.lineTo(x0 + rx * sx, y0 + h);
    ctx.stroke();
  }
  for (const ry of G.city.roadsY) {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + ry * sy);
    ctx.lineTo(x0 + w, y0 + ry * sy);
    ctx.stroke();
  }
  const dot = (x, y, color, r = 3) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x0 + x * sx, y0 + y * sy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  // Garages, ramps, tokens.
  for (const g of G.city.garages) dot(g.x, g.y, '#3ddc5a', 3);
  for (const r of G.city.ramps) dot(r.x, r.y, '#ff9a3d', 2.5);
  for (const t of G.city.tokens) if (!t.taken) dot(t.x, t.y, '#ffd94f', 2);
  // Goons, when the brawl is on.
  if (G.story.active && G.story.index < 12) {
    const m = G.story && G.missions[G.story.index];
    if (m && m.id === 'bayfront-brawl') {
      for (const g of G.goons) if (g.state !== 'down') dot(g.x, g.y, '#c95aff', 3);
    }
  }
  // Police.
  for (const c of G.wanted.cruisers) dot(c.x, c.y, '#ff4d4d', 3);
  if (G.wanted.heli) dot(G.wanted.heli.x, G.wanted.heli.y, '#ff4d4d', 4);
  // Mission target.
  const target = G.missionTarget;
  if (target) {
    ctx.fillStyle = '#ffd94f';
    ctx.beginPath();
    ctx.arc(x0 + target.x * sx, y0 + target.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // The player: a white triangle pointing where they face.
  const px = x0 + G.player.x * sx;
  const py = y0 + G.player.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(G.player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}
