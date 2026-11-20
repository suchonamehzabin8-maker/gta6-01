// Palmera Bay — Sunset Run: everything the player sees.
// Canvas 2D, top-down. The world first (ground, roads, districts, the
// boardwalk and the Bay Wheel), then the vehicles and people, then weather
// and light, then the HUD and the menus. Photo mode hides the HUD.

import { WORLD, COLORS } from './config.js';
import { clamp, lerp, hash2 } from './random.js';
import { isWater, isSand } from './city.js';
import { drawMinimap } from './minimap.js';
import { MISSIONS } from './missions.js';
import { skyName, rainStreaks } from './weather.js';
import { currentStation } from './radio.js';

// 0 = deep night, 1 = full day. Golden hour sits around 17:00–19:00.
export function daylight(G) {
  const h = G.clock;
  if (h >= 6 && h < 8) return lerp(0.25, 0.85, (h - 6) / 2);
  if (h >= 8 && h < 17) return 1;
  if (h >= 17 && h < 19.5) return lerp(1, 0.55, (h - 17) / 2.5);
  if (h >= 19.5 && h < 21) return lerp(0.55, 0.12, (h - 19.5) / 1.5);
  return 0.12;
}

export function drawGame(ctx, G) {
  const { w, h } = G.view;
  ctx.clearRect(0, 0, w, h);
  // Beyond the world's east edge is the bay: fill the whole canvas with
  // water first so the camera never shows a black strip at the edge.
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  const camX = clamp(G.camera.x - w / 2, -80, WORLD.w - w + 80);
  const camY = clamp(G.camera.y - h / 2, -80, WORLD.h - h + 80);
  ctx.translate(-camX, -camY);
  drawGround(ctx, G, camX, camY, w, h);
  drawRoads(ctx, G);
  drawLandmarks(ctx, G);
  drawBuildings(ctx, G);
  drawPickups(ctx, G);
  drawRamps(ctx, G);
  drawRoadblocks(ctx, G);
  drawVehicles(ctx, G);
  drawPeople(ctx, G);
  drawBullets(ctx, G);
  drawHelicopter(ctx, G);
  if (G.weather.intensity > 0.1) drawRain(ctx, G, camX, camY, w, h);
  drawNight(ctx, G, camX, camY, w, h);
  if (G.weather.lightning > 0) {
    ctx.fillStyle = `rgba(255,255,240,${G.weather.lightning * 0.7})`;
    ctx.fillRect(camX, camY, w, h);
  }
  ctx.restore();

  if (G.mode === 'title') { drawTitle(ctx, G); return; }
  if (!G.photo) drawHUD(ctx, G);
  drawToasts(ctx, G);
  if (G.mode === 'pause') drawPause(ctx, G);
  if (G.mode === 'wasted') drawEndScreen(ctx, G, 'WASTED', 'Mara is down. The Bay Syndicate is not impressed.');
  if (G.mode === 'busted') drawEndScreen(ctx, G, 'BUSTED', 'The Palmera Bay PD finally caught up with you.');
  if (G.mode === 'complete') drawEndScreen(ctx, G, 'STORY COMPLETE', 'All twelve missions done. Palmera Bay is yours, Mara.');
}

function drawGround(ctx, G, camX, camY, w, h) {
  const x0 = Math.max(0, camX - 40);
  const y0 = Math.max(0, camY - 40);
  const x1 = Math.min(WORLD.w, camX + w + 40);
  const y1 = Math.min(WORLD.h, camY + h + 40);
  // Grass base.
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // Mown patches for texture.
  ctx.fillStyle = COLORS.grassDark;
  const gx0 = Math.floor(x0 / 240);
  const gy0 = Math.floor(y0 / 240);
  for (let gx = gx0; gx * 240 < x1; gx++) {
    for (let gy = gy0; gy * 240 < y1; gy++) {
      if (hash2(gx, gy, 3) < 0.5) ctx.fillRect(gx * 240, gy * 240, 240, 240);
    }
  }
  // Coral Park.
  ctx.fillStyle = COLORS.park;
  ctx.fillRect(2300, 1100, 340, 340);
  // Beach sand, then the bay itself with moving wave lines.
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(WORLD.sandX, y0, x1 - WORLD.sandX > 0 ? Math.min(x1, WORLD.w) - WORLD.sandX : 0, y1 - y0);
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(WORLD.waterX, y0, Math.min(x1, WORLD.w) - WORLD.waterX, y1 - y0);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const wy = y0 + ((i * 317 + Math.floor(G.time * 40)) % Math.max(1, (y1 - y0)));
    ctx.beginPath();
    ctx.moveTo(WORLD.waterX + 6, wy);
    ctx.quadraticCurveTo(WORLD.waterX + 60, wy + 8, WORLD.waterX + 130, wy);
    ctx.stroke();
  }
}

function drawRoads(ctx, G) {
  const city = G.city;
  ctx.fillStyle = COLORS.road;
  for (const rx of city.roadsX) ctx.fillRect(rx - city.roadW / 2, 0, city.roadW, WORLD.h);
  for (const ry of city.roadsY) ctx.fillRect(0, ry - city.roadW / 2, WORLD.w, city.roadW);
  // Centre dashes.
  ctx.strokeStyle = COLORS.roadLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  for (const rx of city.roadsX) {
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx, WORLD.h);
    ctx.stroke();
  }
  for (const ry of city.roadsY) {
    ctx.beginPath();
    ctx.moveTo(0, ry);
    ctx.lineTo(WORLD.w, ry);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Sidewalks.
  ctx.strokeStyle = COLORS.sidewalk;
  ctx.lineWidth = 5;
  for (const rx of city.roadsX) {
    ctx.beginPath(); ctx.moveTo(rx - city.roadW / 2 - 4, 0); ctx.lineTo(rx - city.roadW / 2 - 4, WORLD.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx + city.roadW / 2 + 4, 0); ctx.lineTo(rx + city.roadW / 2 + 4, WORLD.h); ctx.stroke();
  }
  for (const ry of city.roadsY) {
    ctx.beginPath(); ctx.moveTo(0, ry - city.roadW / 2 - 4); ctx.lineTo(WORLD.w, ry - city.roadW / 2 - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ry + city.roadW / 2 + 4); ctx.lineTo(WORLD.w, ry + city.roadW / 2 + 4); ctx.stroke();
  }
}

function drawLandmarks(ctx, G) {
  const c = G.city;
  // Airfield runway.
  ctx.fillStyle = '#4a4d52';
  ctx.fillRect(c.airfield.runway.x, c.airfield.runway.y, c.airfield.runway.w, c.airfield.runway.h);
  ctx.strokeStyle = '#fff';
  ctx.setLineDash([18, 18]);
  ctx.beginPath();
  ctx.moveTo(c.airfield.runway.x + 10, c.airfield.runway.y + 22);
  ctx.lineTo(c.airfield.runway.x + c.airfield.runway.w - 10, c.airfield.runway.y + 22);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('PALMERA AIRFIELD', c.airfield.x + 20, c.airfield.y + 120);
  // Old Docks crates.
  for (const k of c.docks.crates) {
    ctx.fillStyle = k.color;
    ctx.fillRect(k.x, k.y, k.w, k.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.strokeRect(k.x, k.y, k.w, k.h);
  }
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('OLD DOCKS', c.docks.x + 20, c.docks.y + 40);
  // Marina water + boats.
  ctx.fillStyle = '#2a6f92';
  ctx.fillRect(c.marina.x, c.marina.y, c.marina.w, c.marina.h);
  for (const b of c.marina.boats) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(-26, -8, 52, 16);
    ctx.fillStyle = '#3d7dd9';
    ctx.fillRect(-10, -14, 20, 12);
    ctx.restore();
  }
  // The pier.
  ctx.fillStyle = COLORS.pierWood;
  ctx.fillRect(c.pier.x, c.pier.y, c.pier.w, c.pier.h);
  ctx.strokeStyle = '#6a5232';
  ctx.lineWidth = 3;
  for (let x = c.pier.x; x < c.pier.x + c.pier.w; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, c.pier.y); ctx.lineTo(x, c.pier.y + c.pier.h); ctx.stroke();
  }
  // Boardwalk planks + striped awnings + the Bay Wheel.
  ctx.fillStyle = COLORS.boardwalk;
  ctx.fillRect(c.boardwalk.x, c.boardwalk.y, c.boardwalk.w, c.boardwalk.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  for (let y = c.boardwalk.y; y < c.boardwalk.y + c.boardwalk.h; y += 26) {
    ctx.beginPath(); ctx.moveTo(c.boardwalk.x, y); ctx.lineTo(c.boardwalk.x + c.boardwalk.w, y); ctx.stroke();
  }
  for (let i = 0; i < 10; i++) {
    const ay = c.boardwalk.y + 40 + i * 140;
    ctx.fillStyle = COLORS.awning[i % COLORS.awning.length];
    ctx.fillRect(c.boardwalk.x - 6, ay, 44, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let s = 0; s < 3; s++) ctx.fillRect(c.boardwalk.x - 6 + s * 16, ay, 7, 34);
  }
  // Bay Wheel: rim, spokes, cabins, slow rotation.
  const wheel = c.wheel;
  ctx.save();
  ctx.translate(wheel.x, wheel.y);
  ctx.strokeStyle = '#ff5ad0';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, 0, wheel.r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + G.time * 0.05;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * wheel.r, Math.sin(a) * wheel.r); ctx.stroke();
    ctx.fillStyle = i % 2 ? '#ffd94f' : '#4fe8ff';
    ctx.beginPath(); ctx.arc(Math.cos(a) * wheel.r, Math.sin(a) * wheel.r, 9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Lighthouse with a rotating beam at night.
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(c.lighthouse.x - 14, c.lighthouse.y - 40, 28, 80);
  ctx.fillStyle = '#d94f3d';
  ctx.fillRect(c.lighthouse.x - 14, c.lighthouse.y - 40, 28, 16);
  ctx.fillRect(c.lighthouse.x - 14, c.lighthouse.y + 8, 28, 16);
  if (daylight(G) < 0.4) {
    const beam = G.time * 0.6;
    ctx.save();
    ctx.translate(c.lighthouse.x, c.lighthouse.y - 44);
    ctx.rotate(beam);
    ctx.fillStyle = 'rgba(255,240,180,0.18)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(420, -40);
    ctx.lineTo(420, 40);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Stadium bowl.
  ctx.fillStyle = '#7a8a6a';
  ctx.fillRect(c.stadium.x, c.stadium.y, c.stadium.w, c.stadium.h);
  ctx.fillStyle = '#5da24a';
  ctx.fillRect(c.stadium.x + 40, c.stadium.y + 40, c.stadium.w - 80, c.stadium.h - 80);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(c.stadium.x + 40, c.stadium.y + 40, c.stadium.w - 80, c.stadium.h - 80);
  // Motel + casino signs.
  ctx.fillStyle = '#e8b45a';
  ctx.fillRect(c.motel.x, c.motel.y, c.motel.w, c.motel.h);
  ctx.fillStyle = '#ff5ad0';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('FLAMINGO MOTEL', c.motel.x + 14, c.motel.y + 52);
  ctx.fillStyle = '#2a2a4a';
  ctx.fillRect(c.casino.x, c.casino.y, c.casino.w, c.casino.h);
  ctx.fillStyle = daylight(G) < 0.5 ? '#4fe8ff' : '#ffd94f';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('★ CASINO SUNSET ★', c.casino.x + 18, c.casino.y + 70);
  // Neon billboards.
  for (const b of c.billboards) {
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(b.text, b.x + 10, b.y + 34);
  }
}

function drawBuildings(ctx, G) {
  for (const b of G.city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Rooftop detail + lit windows at night.
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 8);
    const lit = daylight(G) < 0.5;
    const cols = Math.max(1, Math.floor(b.w / 26));
    const rows = Math.max(1, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const on = lit ? hash2(b.x + i, b.y + j, 9) < 0.45 : hash2(b.x + i, b.y + j, 9) < 0.25;
        ctx.fillStyle = on ? '#ffe9a8' : COLORS.glass;
        ctx.fillRect(b.x + 8 + i * 26, b.y + 16 + j * 26, 14, 14);
      }
    }
    // Downtown towers get a height shadow edge.
    if (b.hgt >= 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(b.x + b.w - 10, b.y, 10, b.h);
    }
  }
  for (const t of G.city.trees) {
    ctx.fillStyle = '#3f7a34';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5da24a';
    ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPickups(ctx, G) {
  for (const p of G.pickups) {
    if (p.taken) continue;
    const bob = Math.sin(G.time * 3 + p.x) * 3;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    if (p.kind === 'health') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = '#e83d3d';
      ctx.fillRect(-3, -8, 6, 16);
      ctx.fillRect(-8, -3, 16, 6);
    } else if (p.kind === 'ammo') {
      ctx.fillStyle = '#ffd94f';
      ctx.fillRect(-9, -6, 18, 12);
      ctx.fillStyle = '#222';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('AMMO', -9, 4);
    } else {
      ctx.fillStyle = '#3ddc5a';
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('$', -4, 4);
    }
    ctx.restore();
  }
  // Sunset tokens: gold stars that spin.
  for (const t of G.city.tokens) {
    if (t.taken) continue;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(G.time * 1.5);
    ctx.fillStyle = '#ffd94f';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = i % 2 === 0 ? 12 : 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Weapon stashes.
  for (const s of G.city.stashes) {
    if (s.taken) continue;
    ctx.fillStyle = s.kind === 'smg' ? '#3d7dd9' : '#8a5ad9';
    ctx.fillRect(s.x - 12, s.y - 6, 24, 12);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(s.kind === 'smg' ? 'SMG' : 'BOOM', s.x - 11, s.y + 3);
  }
  // Taxi fare marker.
  if (G.taxi.fare) {
    ctx.fillStyle = '#f2c230';
    ctx.beginPath();
    ctx.arc(G.taxi.fare.x, G.taxi.fare.y, 12 + Math.sin(G.time * 6) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('$', G.taxi.fare.x - 4, G.taxi.fare.y + 4);
  }
}

function drawRamps(ctx, G) {
  for (const r of G.city.ramps) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);
    ctx.fillStyle = '#a87b4a';
    ctx.beginPath();
    ctx.moveTo(-34, 16);
    ctx.lineTo(34, 16);
    ctx.lineTo(20, -18);
    ctx.lineTo(-20, -18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd94f';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-20, -18); ctx.lineTo(20, -18); ctx.stroke();
    ctx.restore();
  }
  // Garage rings.
  for (const g of G.city.garages) {
    const near = G.player.vehicle && Math.hypot(G.player.x - g.x, G.player.y - g.y) < g.r;
    ctx.strokeStyle = near ? '#3ddc5a' : 'rgba(61,220,90,0.5)';
    ctx.lineWidth = near ? 5 : 3;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#3ddc5a';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(g.name, g.x - 52, g.y - g.r - 8);
  }
}

function drawRoadblocks(ctx, G) {
  for (const b of G.wanted.roadblocks) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = '#222831';
    ctx.fillRect(-45, -13, 90, 26);
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(-45, -13, 90, 8);
    ctx.fillStyle = '#d94f3d';
    ctx.fillRect(-45, 5, 90, 8);
    ctx.restore();
  }
  for (const s of G.wanted.strips) {
    if (s.used) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.fillStyle = '#444';
    ctx.fillRect(-40, -7, 80, 14);
    ctx.fillStyle = '#c9c9c9';
    for (let i = -30; i <= 30; i += 15) {
      ctx.beginPath(); ctx.moveTo(i, -7); ctx.lineTo(i + 5, 7); ctx.lineTo(i + 9, 7); ctx.lineTo(i + 4, -7); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

function drawVehicles(ctx, G) {
  for (const v of G.vehicles) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle + (v.kind === 'bike' ? v.lean * 0.6 : 0));
    const len = v.kind === 'bike' ? 34 : 46;
    const wid = v.kind === 'bike' ? 12 : 22;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-len / 2 + 3, -wid / 2 + 4, len, wid);
    // Wheels.
    ctx.fillStyle = '#111';
    const wy = wid / 2 - 2;
    ctx.fillRect(-len / 2 + 4, -wy - 3, 10, 6);
    ctx.fillRect(len / 2 - 14, -wy - 3, 10, 6);
    ctx.fillRect(-len / 2 + 4, wy - 3, 10, 6);
    ctx.fillRect(len / 2 - 14, wy - 3, 10, 6);
    // Body.
    ctx.fillStyle = v.wreck ? '#3a3a3a' : v.color;
    ctx.fillRect(-len / 2, -wid / 2, len, wid);
    if (v.kind === 'bike') {
      ctx.fillStyle = '#222';
      ctx.fillRect(-4, -wid / 2, 8, wid);
    } else {
      // Windshield + roof.
      ctx.fillStyle = 'rgba(180,220,240,0.9)';
      ctx.fillRect(len / 2 - 16, -wid / 2 + 3, 8, wid - 6);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-6, -wid / 2 + 3, 14, wid - 6);
    }
    if (v.police) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-len / 2 + 2, -wid / 2, 10, wid);
      ctx.fillStyle = '#d94f3d';
      ctx.fillRect(-2, -wid / 2 - 3, 8, 5);
      ctx.fillStyle = '#3d7dd9';
      ctx.fillRect(-2, wid / 2 - 2, 8, 5);
    }
    if (v.taxi) {
      ctx.fillStyle = '#222';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('TAXI', -len / 2 + 6, 3);
    }
    // Smoke when damaged.
    if (v.health < 45 && !v.wreck) {
      ctx.fillStyle = `rgba(120,120,120,${0.5 + Math.sin(G.time * 9) * 0.2})`;
      ctx.beginPath(); ctx.arc(-len / 2, 0, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // Airborne shadow while jumping.
    if (G.stunts.air && G.player.vehicle === v) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(v.x, v.y + 26, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawPeople(ctx, G) {
  for (const p of G.people) {
    if (p.state === 'down') {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 12, 6, p.angle, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    const bob = p.speed > 0 ? Math.sin(G.time * 10 + p.id) * 2 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 8, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(0, bob * 0.3, p.kind === 'goon' ? 13 : 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b88a';
    ctx.beginPath(); ctx.arc(Math.cos(p.angle) * 4, Math.sin(p.angle) * 4 + bob * 0.3, 5, 0, Math.PI * 2); ctx.fill();
    if (p.kind === 'cop') {
      ctx.fillStyle = '#2a4a8a';
      ctx.fillRect(-6, -13, 12, 5);
    }
    if (p.kind === 'goon') {
      ctx.fillStyle = '#c95aff';
      ctx.fillRect(-8, -16, 16, 4);
      // Goon health pips.
      ctx.fillStyle = '#fff';
      for (let i = 0; i < p.hp; i++) ctx.fillRect(-9 + i * 7, 12, 5, 5);
    }
    ctx.restore();
  }
  // The player on foot: a warm jacket, easy to spot.
  const pl = G.player;
  if (!pl.vehicle) {
    ctx.save();
    ctx.translate(pl.x, pl.y);
    ctx.rotate(pl.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(2, 4, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e85a3d';
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(8, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b88a';
    ctx.beginPath(); ctx.arc(10, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawBullets(ctx, G) {
  for (const b of G.combat.bullets) {
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const pt of G.combat.particles) {
    ctx.globalAlpha = Math.max(0, pt.life * 2);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHelicopter(ctx, G) {
  const h = G.wanted.heli;
  if (!h) return;
  // Searchlight cone on the ground.
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.fillStyle = 'rgba(255,240,180,0.14)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  const lx = Math.cos(h.light) * 320;
  const ly = Math.sin(h.light) * 320;
  ctx.lineTo(lx - 40, ly + 40);
  ctx.lineTo(lx + 40, ly - 40);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The helicopter itself, above the world.
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(4, 6, 26, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a4a8a';
  ctx.beginPath(); ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9c9c9';
  const rot = G.time * 22;
  ctx.fillRect(-34 * Math.cos(rot), -3, 68 * Math.cos(rot), 3);
  ctx.restore();
}

function drawRain(ctx, G, camX, camY, w, h) {
  const streaks = rainStreaks(G.frame, 130, w, h, G.weather.intensity);
  ctx.strokeStyle = 'rgba(200,220,255,0.4)';
  ctx.lineWidth = 1.5;
  for (const s of streaks) {
    ctx.beginPath();
    ctx.moveTo(camX + s.x, camY + s.y);
    ctx.lineTo(camX + s.x - 5, camY + s.y + s.len);
    ctx.stroke();
  }
}

function drawNight(ctx, G, camX, camY, w, h) {
  const d = daylight(G);
  if (d > 0.85) return;
  ctx.fillStyle = `rgba(8,12,34,${(0.85 - d) * 0.55})`;
  ctx.fillRect(camX, camY, w, h);
  // Streetlamps glow at night.
  if (d < 0.4) {
    for (const rx of G.city.roadsX) {
      for (const ry of G.city.roadsY) {
        const lx = rx + 40;
        const ly = ry - 40;
        if (lx < camX - 50 || lx > camX + w + 50 || ly < camY - 50 || ly > camY + h + 50) continue;
        const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 90);
        g.addColorStop(0, 'rgba(255,220,140,0.22)');
        g.addColorStop(1, 'rgba(255,220,140,0)');
        ctx.fillStyle = g;
        ctx.fillRect(lx - 90, ly - 90, 180, 180);
      }
    }
  }
}

// --- HUD ----------------------------------------------------------------------

function drawHUD(ctx, G) {
  const { w } = G.view;
  ctx.save();
  drawMinimap(ctx, G);
  // Wanted stars, top left.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(12, 12, 210, 44);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted.stars ? '#ffd94f' : 'rgba(255,255,255,0.25)';
    drawStar(ctx, 30 + i * 36, 34, 13);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`$${G.cash}`, 14, 78);
  ctx.fillText(`REP ${G.rep}`, 90, 78);
  const hh = Math.floor(G.clock);
  const mm = Math.floor((G.clock - hh) * 60);
  ctx.fillText(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, 160, 78);
  // Health + ammo, bottom left.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(12, G.view.h - 66, 250, 54);
  ctx.fillStyle = '#e83d3d';
  ctx.fillRect(22, G.view.h - 52, 120 * (G.player.health / 100), 14);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(22, G.view.h - 52, 120, 14);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`HP ${Math.ceil(G.player.health)}`, 150, G.view.h - 40);
  const cw = G.combat;
  const ammo = cw.ammo[cw.weapon] === Infinity ? '∞' : cw.ammo[cw.weapon];
  ctx.fillText(`${cw.weapon.toUpperCase()}  ${ammo}`, 22, G.view.h - 22);
  ctx.fillText('[1/2/3] weapon', 150, G.view.h - 22);
  // Mission objective, bottom centre.
  const obj = G.objective;
  if (obj) {
    ctx.font = 'bold 15px sans-serif';
    const tw = ctx.measureText(obj).width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect((w - tw) / 2 - 12, G.view.h - 40, tw + 24, 28);
    ctx.fillStyle = '#ffd94f';
    ctx.fillText(obj, (w - tw) / 2, G.view.h - 20);
  }
  // Weather + radio, top right under the minimap.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(w - 210, 164, 196, 52);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(skyName(G.weather), w - 200, 184);
  ctx.fillText(`♪ ${currentStation(G.radio).name}`, w - 200, 204);
  // Speedometer, bottom right.
  const mph = Math.round(Math.abs(G.speedMph || 0));
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(w - 120, G.view.h - 66, 106, 54);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`${mph}`, w - 108, G.view.h - 32);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('MPH', w - 56, G.view.h - 32);
  // Off-screen mission arrow.
  const t = G.missionTarget;
  if (t && G.mode === 'play') {
    const cx = w / 2;
    const cy = G.view.h / 2;
    const dx = t.x - G.camera.x;
    const dy = t.y - G.camera.y;
    const d = Math.hypot(dx, dy);
    if (d > 420) {
      const a = Math.atan2(dy, dx);
      const ax = cx + Math.cos(a) * 220;
      const ay = cy + Math.sin(a) * 150;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(a);
      ctx.fillStyle = '#ffd94f';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -11);
      ctx.lineTo(-10, 11);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffd94f';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${Math.round(d / 40)}m`, ax - 12, ay + 26);
    }
  }
  ctx.restore();
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function drawToasts(ctx, G) {
  ctx.save();
  ctx.font = 'bold 16px sans-serif';
  let y = 110;
  for (const t of G.toasts) {
    if (t.life <= 0) continue;
    ctx.globalAlpha = Math.min(1, t.life);
    const tw = ctx.measureText(t.text).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect((G.view.w - tw) / 2 - 10, y, tw + 20, 26);
    ctx.fillStyle = '#fff';
    ctx.fillText(t.text, (G.view.w - tw) / 2, y + 18);
    y += 32;
  }
  ctx.restore();
}

// --- Menus ----------------------------------------------------------------------

function drawTitle(ctx, G) {
  const { w, h } = G.view;
  ctx.fillStyle = 'rgba(10,10,24,0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5ad0';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('PALMERA BAY', w / 2, h / 2 - 120);
  ctx.fillStyle = '#ffd94f';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('— SUNSET RUN —', w / 2, h / 2 - 70);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('Twelve missions. One bay. Zero mercy from the PD.', w / 2, h / 2 - 24);
  ctx.fillStyle = '#4fe8ff';
  ctx.font = 'bold 18px sans-serif';
  const done = G.story.done.filter(Boolean).length;
  ctx.fillText(`Missions done: ${done} / 12    •    Sunset tokens: ${12 - G.city.tokens.filter((t) => !t.taken).length} / 12    •    Cash: $${G.cash}`, w / 2, h / 2 + 22);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText('WASD move / drive  •  E steal car  •  Mouse aim, click shoot  •  F punch', w / 2, h / 2 + 64);
  ctx.fillText('G garage  •  C radio  •  P photo mode  •  N next mission  •  Esc pause', w / 2, h / 2 + 92);
  ctx.fillStyle = '#ffd94f';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press ENTER or click to play', w / 2, h / 2 + 140);
  ctx.textAlign = 'left';
}

function drawPause(ctx, G) {
  const { w, h } = G.view;
  ctx.fillStyle = 'rgba(10,10,24,0.7)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', w / 2, h / 2 - 60);
  ctx.font = '18px sans-serif';
  ctx.fillText(`Cash $${G.cash}  •  Rep ${G.rep}  •  Missions ${G.story.done.filter(Boolean).length}/12  •  Tokens ${G.city.tokens.filter((t) => t.taken).length}/12`, w / 2, h / 2 - 10);
  ctx.fillText(`Best jump $${G.stunts.best}  •  Weather ${skyName(G.weather)}  •  Radio ${currentStation(G.radio).name}`, w / 2, h / 2 + 22);
  ctx.fillStyle = '#ffd94f';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Esc to resume  •  R restart mission  •  M mute', w / 2, h / 2 + 64);
  ctx.textAlign = 'left';
}

function drawEndScreen(ctx, G, title, sub) {
  const { w, h } = G.view;
  ctx.fillStyle = 'rgba(10,10,24,0.75)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = title === 'STORY COMPLETE' ? '#ffd94f' : '#ff4d4d';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(title, w / 2, h / 2 - 40);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText(sub, w / 2, h / 2 + 4);
  ctx.fillText(`Cash $${G.cash}  •  Missions ${G.story.done.filter(Boolean).length}/12  •  Tokens ${G.city.tokens.filter((t) => t.taken).length}/12`, w / 2, h / 2 + 40);
  ctx.fillStyle = '#ffd94f';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press ENTER to play again', w / 2, h / 2 + 88);
  ctx.textAlign = 'left';
}
