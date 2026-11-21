// Rendering — the whole visible game: ground, city, people, vehicles, weather,
// HUD and menus, on one 1280x720 canvas. The camera follows the player and
// clamps at the world edges; outside the world the screen is water, never black.
import { clamp, lerp, dist, angleTo } from './random.js';
import { WORLD, BEACH_TOP, WATER_TOP, WEAPONS } from './config.js';
import { drawMinimap } from './minimap.js';
import { missionObjective } from './missions.js';
import { inWater, onBeach } from './city.js';

const VW = 1280, VH = 720;

function daylight(clock) {
  // 0..1 brightness for the hour of day.
  const h = clock % 24;
  if (h >= 6 && h < 17) return 1;
  if (h >= 17 && h < 18.5) return lerp(1, 0.72, (h - 17) / 1.5);
  if (h >= 18.5 && h < 20) return lerp(0.72, 0.42, (h - 18.5) / 1.5);
  if (h >= 20 && h < 21.5) return lerp(0.42, 0.3, (h - 20) / 1.5);
  if (h >= 21.5 || h < 5) return 0.3;
  if (h >= 5 && h < 6) return lerp(0.3, 1, (h - 5));
  return 1;
}

function clockText(clock) {
  const h = Math.floor(clock % 24);
  const m = Math.floor((clock % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function render(G, ctx) {
  const p = G.player;
  const cam = G.camera;
  const px = p.vehicle ? p.vehicle.x : p.x;
  const py = p.vehicle ? p.vehicle.y : p.y;
  cam.x = clamp(px, VW / 2, WORLD.w - VW / 2);
  cam.y = clamp(py, VH / 2, WORLD.h - VH / 2);
  const ox = cam.x - VW / 2, oy = cam.y - VH / 2;
  const X = wx => wx - ox, Y = wy => wy - oy;
  const inView = (wx, wy, m = 80) => wx > ox - m && wx < ox + VW + m && wy > oy - m && wy < oy + VH + m;

  // --- Ground -------------------------------------------------------------
  ctx.fillStyle = '#164e6d'; // water fills the frame, including off-world
  ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#4a7d4f'; // grass
  ctx.fillRect(X(0), Y(0), WORLD.w, BEACH_TOP);
  ctx.fillStyle = '#e8d29a'; // beach
  ctx.fillRect(X(0), Y(BEACH_TOP), WORLD.w, WATER_TOP - BEACH_TOP);
  ctx.fillStyle = '#1b5f7d'; // sea
  ctx.fillRect(X(0), Y(WATER_TOP), WORLD.w, WORLD.h - WATER_TOP);

  // Park, airfield, docks, marina ground.
  ctx.fillStyle = '#3d7a44';
  ctx.fillRect(X(G.city.park.x), Y(G.city.park.y), G.city.park.w, G.city.park.h);
  ctx.fillStyle = '#8a8f96';
  ctx.fillRect(X(G.city.airfield.x), Y(G.city.airfield.y), G.city.airfield.w, G.city.airfield.h);
  ctx.fillStyle = '#7d838c';
  ctx.fillRect(X(G.city.docks.x), Y(G.city.docks.y), G.city.docks.w, G.city.docks.h);
  ctx.fillStyle = '#1b5f7d';
  ctx.fillRect(X(G.city.marina.x), Y(G.city.marina.y), G.city.marina.w, G.city.marina.h);

  // Roads: dark asphalt with pale centre dashes.
  ctx.fillStyle = '#3a3f47';
  for (const rx of [300, 700, 1100, 1500, 1900, 2300, 2700, 3100]) {
    ctx.fillRect(X(rx - 30), Y(0), 60, WORLD.h);
  }
  for (const ry of [250, 650, 1050, 1450, 1850, 2250]) {
    ctx.fillRect(X(0), Y(ry - 30), WORLD.w, 60);
  }
  ctx.strokeStyle = 'rgba(240,220,120,0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 22]);
  for (const rx of [300, 700, 1100, 1500, 1900, 2300, 2700, 3100]) {
    ctx.beginPath(); ctx.moveTo(X(rx), Y(0)); ctx.lineTo(X(rx), Y(WORLD.h)); ctx.stroke();
  }
  for (const ry of [250, 650, 1050, 1450, 1850, 2250]) {
    ctx.beginPath(); ctx.moveTo(X(0), Y(ry)); ctx.lineTo(X(WORLD.w), Y(ry)); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Boardwalk planks and the pier.
  ctx.fillStyle = '#b98d5f';
  ctx.fillRect(X(400), Y(2260), 2800, 70);
  ctx.fillStyle = '#a87f52';
  ctx.fillRect(X(1800), Y(2380), 90, 200);
  ctx.strokeStyle = 'rgba(90,60,30,0.6)';
  ctx.lineWidth = 1;
  for (let y = 2390; y < 2580; y += 18) {
    ctx.beginPath(); ctx.moveTo(X(1800), Y(y)); ctx.lineTo(X(1890), Y(y)); ctx.stroke();
  }

  // Buildings: a soft shadow offset by height, then the block and its roof.
  for (const b of G.city.buildings) {
    if (!inView(b.x + b.w / 2, b.y + b.h / 2, 120)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(X(b.x) + 6, Y(b.y) + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(X(b.x), Y(b.y), b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(X(b.x) + 4, Y(b.y) + 4, b.w - 8, b.h - 8);
    if (b.hgt > 60) {
      // Downtown towers get lit windows at night.
      const bright = daylight(G.clock);
      if (bright < 0.6) {
        ctx.fillStyle = 'rgba(255,214,120,0.85)';
        for (let wy = b.y + 14; wy < b.y + b.h - 10; wy += 18) {
          for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 16) {
            if ((wx * 7 + wy * 13) % 5 < 2) ctx.fillRect(X(wx), Y(wy), 5, 7);
          }
        }
      }
    }
  }

  // Trees and palms.
  for (const t of G.city.trees) {
    if (!inView(t.x, t.y)) continue;
    ctx.fillStyle = '#2e6b34';
    ctx.beginPath(); ctx.arc(X(t.x), Y(t.y), 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a8a4f';
    ctx.beginPath(); ctx.arc(X(t.x) - 3, Y(t.y) - 3, 6, 0, Math.PI * 2); ctx.fill();
  }
  for (const pl of G.city.palms) {
    if (!inView(pl.x, pl.y)) continue;
    ctx.strokeStyle = '#7a5a3a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(X(pl.x), Y(pl.y)); ctx.lineTo(X(pl.x), Y(pl.y) - 14); ctx.stroke();
    ctx.fillStyle = '#3f9e4d';
    ctx.beginPath(); ctx.arc(X(pl.x), Y(pl.y) - 16, 8, 0, Math.PI * 2); ctx.fill();
  }

  // Billboards glow at dusk.
  for (const bb of G.city.billboards) {
    if (!inView(bb.x, bb.y)) continue;
    ctx.fillStyle = '#20242c';
    ctx.fillRect(X(bb.x) - 16, Y(bb.y) - 10, 32, 20);
    ctx.fillStyle = bb.color;
    ctx.fillRect(X(bb.x) - 13, Y(bb.y) - 7, 26, 14);
  }

  // The lighthouse, with a rotating beam after dark.
  const lh = G.city.lighthouse;
  if (inView(lh.x, lh.y, 200)) {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(X(lh.x) - 12, Y(lh.y) - 30, 24, 60);
    ctx.fillStyle = '#d64545';
    ctx.fillRect(X(lh.x) - 12, Y(lh.y) - 18, 24, 10);
    ctx.fillRect(X(lh.x) - 12, Y(lh.y) + 8, 24, 10);
    if (daylight(G.clock) < 0.6) {
      const beam = G.time * 0.5;
      ctx.save();
      ctx.translate(X(lh.x), Y(lh.y) - 30);
      ctx.rotate(beam);
      const grad = ctx.createLinearGradient(0, 0, 320, 0);
      grad.addColorStop(0, 'rgba(255,240,180,0.5)');
      grad.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(320, -26); ctx.lineTo(320, 26); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // The Bay Wheel turns slowly above the boardwalk.
  const bw = G.city.bayWheel;
  if (inView(bw.x, bw.y, 160)) {
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(X(bw.x), Y(bw.y), 62, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(bw.x), Y(bw.y), 34, 0, Math.PI * 2); ctx.stroke();
    const rot = G.time * 0.12;
    for (let i = 0; i < 8; i++) {
      const a = rot + (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(X(bw.x), Y(bw.y));
      ctx.lineTo(X(bw.x) + Math.cos(a) * 62, Y(bw.y) + Math.sin(a) * 62);
      ctx.stroke();
      ctx.fillStyle = ['#ff5d8f', '#22d3ee', '#facc15', '#a78bfa'][i % 4];
      ctx.beginPath();
      ctx.arc(X(bw.x) + Math.cos(a) * 62, Y(bw.y) + Math.sin(a) * 62, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#8a8f96';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(X(bw.x) - 30, Y(bw.y) + 80); ctx.lineTo(X(bw.x), Y(bw.y)); ctx.lineTo(X(bw.x) + 30, Y(bw.y) + 80); ctx.stroke();
  }

  // Garages: a green ring marks the service bay; it pulses when in range.
  for (const g of G.city.garages) {
    if (!inView(g.x, g.y, 120)) continue;
    const near = G.player.vehicle && dist(G.player.vehicle.x, G.player.vehicle.y, g.x, g.y) < 85;
    ctx.strokeStyle = near ? '#7CFC00' : '#3d8bfd';
    ctx.lineWidth = near ? 4 : 3;
    ctx.beginPath(); ctx.arc(X(g.x), Y(g.y), 62, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#20242c';
    ctx.fillRect(X(g.x) - 46, Y(g.y) - 26, 92, 52);
    ctx.fillStyle = g.color;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.name, X(g.x), Y(g.y) + 4);
  }

  // Stunt ramps: wooden wedges.
  for (const r of G.city.ramps) {
    if (!inView(r.x, r.y)) continue;
    ctx.save();
    ctx.translate(X(r.x), Y(r.y));
    ctx.rotate(r.angle);
    ctx.fillStyle = '#c9a06a';
    ctx.beginPath();
    ctx.moveTo(-22, 12); ctx.lineTo(22, 12); ctx.lineTo(22, -12); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(-22, 8, 44, 4);
    ctx.restore();
  }

  // Weapon stashes glow until collected.
  for (const pk of G.combat.pickups) {
    if (pk.taken || !inView(pk.x, pk.y)) continue;
    const col = pk.kind === 'health' ? '#7bc47f' : pk.kind === 'cash' ? '#ffd166' : '#22d3ee';
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(X(pk.x), Y(pk.y), 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20242c';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'health' ? '+' : pk.kind === 'cash' ? '$' : 'A', X(pk.x), Y(pk.y) + 3.5);
  }

  // Sunset tokens shimmer.
  for (const t of G.city.tokens) {
    if (t.found || !inView(t.x, t.y)) continue;
    const pulse = 6 + Math.sin(G.time * 4 + t.id) * 2;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(X(t.x), Y(t.y), pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b8860b';
    ctx.beginPath(); ctx.arc(X(t.x), Y(t.y), pulse - 3, 0, Math.PI * 2); ctx.fill();
  }

  // Mission crates at the marina.
  if (G.missions.active >= 0) {
    for (const c of G.missions.crates) {
      if (c.got || !inView(c.x, c.y)) continue;
      ctx.fillStyle = '#c9a06a';
      ctx.fillRect(X(c.x) - 10, Y(c.y) - 10, 20, 20);
      ctx.strokeStyle = '#5b4a3a';
      ctx.lineWidth = 2;
      ctx.strokeRect(X(c.x) - 10, Y(c.y) - 10, 20, 20);
    }
  }

  // Roadblocks and spike strips.
  for (const rb of G.wanted.roadblocks) {
    if (!inView(rb.x, rb.y)) continue;
    ctx.save();
    ctx.translate(X(rb.x), Y(rb.y));
    ctx.rotate(rb.angle);
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(-40, -8, 80, 16);
    ctx.fillStyle = '#20242c';
    for (let i = -36; i < 40; i += 16) ctx.fillRect(i, -8, 8, 16);
    ctx.restore();
  }
  for (const s of G.wanted.spikes) {
    if (!inView(s.x, s.y)) continue;
    ctx.save();
    ctx.translate(X(s.x), Y(s.y));
    ctx.rotate(s.angle);
    ctx.fillStyle = '#111';
    for (let i = -24; i <= 24; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, -6); ctx.lineTo(i + 5, 0); ctx.lineTo(i, 6); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // --- Vehicles ------------------------------------------------------------
  const drawCar = (v, isPlayer) => {
    ctx.save();
    ctx.translate(X(v.x), Y(v.y));
    ctx.rotate(v.angle);
    if (v.kind === 'bike') {
      ctx.strokeStyle = v.color;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-11, 0, 4, 0, Math.PI * 2); ctx.arc(11, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    // Shadow, body, cabin, wheels.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-20, -10, 40, 24);
    ctx.fillStyle = v.wreck ? '#3a3f47' : v.color;
    roundRect(ctx, -19, -11, 38, 22, 6);
    ctx.fill();
    ctx.fillStyle = v.wreck ? '#222' : '#bfe3f2';
    roundRect(ctx, -6, -8, 14, 16, 3);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(-14, -13, 8, 4); ctx.fillRect(-14, 9, 8, 4);
    ctx.fillRect(8, -13, 8, 4); ctx.fillRect(8, 9, 8, 4);
    if (v.tyresPopped) {
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-14, -11, 3, 0, Math.PI * 2); ctx.arc(8, -11, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (v.damage > 45 && !v.wreck) {
      ctx.fillStyle = 'rgba(120,120,120,0.7)';
      ctx.beginPath(); ctx.arc(-8 + Math.sin(G.time * 9) * 2, -4, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (isPlayer) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(v.x), Y(v.y), 30, 0, Math.PI * 2); ctx.stroke();
    }
  };
  for (const v of G.vehicles) if (inView(v.x, v.y, 60)) drawCar(v, v === p.vehicle);
  for (const v of G.traffic) if (inView(v.x, v.y, 60)) drawCar(v, false);
  for (const v of G.wanted.cruisers) {
    if (!inView(v.x, v.y, 60)) continue;
    drawCar(v, false);
    // Flashing light bar.
    const on = Math.floor(G.time * 6) % 2 === 0;
    ctx.fillStyle = on ? '#ff4757' : '#3d8bfd';
    ctx.beginPath(); ctx.arc(X(v.x), Y(v.y), 5, 0, Math.PI * 2); ctx.fill();
  }

  // The helicopter, with its searchlight sweeping the ground.
  const heli = G.wanted.heli;
  if (heli && inView(heli.x, heli.y, 200)) {
    const hx = X(heli.x), hy = Y(heli.y);
    ctx.fillStyle = 'rgba(255,240,180,0.13)';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - 90, hy + 240);
    ctx.lineTo(hx + 90, hy + 240);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1e3a5f';
    ctx.beginPath(); ctx.ellipse(hx, hy, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    const rot = G.time * 18;
    ctx.beginPath();
    ctx.moveTo(hx - Math.cos(rot) * 34, hy - Math.sin(rot) * 6);
    ctx.lineTo(hx + Math.cos(rot) * 34, hy + Math.sin(rot) * 6);
    ctx.stroke();
  }

  // --- People ---------------------------------------------------------------
  const drawPerson = (pd) => {
    if (!inView(pd.x, pd.y)) return;
    ctx.fillStyle = pd.color;
    ctx.beginPath(); ctx.arc(X(pd.x), Y(pd.y), pd.kind === 'goon' ? 13 : 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath(); ctx.arc(X(pd.x), Y(pd.y), 5, 0, Math.PI * 2); ctx.fill();
    if (pd.kind === 'cop') {
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(X(pd.x) - 6, Y(pd.y) - 13, 12, 3);
    }
    if (pd.kind === 'goon' && pd.hp > 0) {
      ctx.fillStyle = '#ff8a80';
      ctx.fillRect(X(pd.x) - 12, Y(pd.y) - 20, 24, 4);
      ctx.fillStyle = '#7bc47f';
      ctx.fillRect(X(pd.x) - 12, Y(pd.y) - 20, 24 * (pd.hp / 90), 4);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pd.name, X(pd.x), Y(pd.y) - 24);
    }
    if (pd.taxi) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAXI?', X(pd.x), Y(pd.y) - 18);
    }
  };
  for (const pd of G.peds) drawPerson(pd);
  for (const c of G.cops) drawPerson(c);

  // Vendors at their striped stalls.
  for (const v of G.city.vendors) {
    if (!inView(v.x, v.y)) continue;
    ctx.fillStyle = '#8a5a3a';
    ctx.fillRect(X(v.x) - 16, Y(v.y) - 8, 32, 16);
    ctx.fillStyle = '#e07a5f';
    ctx.fillRect(X(v.x) - 18, Y(v.y) - 14, 36, 7);
    ctx.fillStyle = '#fff';
    ctx.fillRect(X(v.x) - 10, Y(v.y) - 14, 8, 7);
    ctx.fillRect(X(v.x) + 6, Y(v.y) - 14, 8, 7);
    ctx.fillStyle = '#222';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(v.goods, X(v.x), Y(v.y) + 22);
  }

  // --- The player ------------------------------------------------------------
  if (p.onFoot) {
    ctx.fillStyle = '#ff5d8f';
    ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(X(p.x), Y(p.y));
    ctx.lineTo(X(p.x) + Math.cos(p.angle) * 18, Y(p.y) + Math.sin(p.angle) * 18);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 20, 0, Math.PI * 2); ctx.stroke();
  }

  // Bullet tracers fade fast.
  ctx.strokeStyle = 'rgba(255,220,120,0.9)';
  ctx.lineWidth = 2;
  for (const b of G.combat.bullets) {
    ctx.beginPath();
    ctx.moveTo(X(b.x), Y(b.y));
    ctx.lineTo(X(b.ax), Y(b.ay));
    ctx.stroke();
  }

  // Rain and lightning over everything.
  if (G.weather.intensity > 0.05) {
    ctx.strokeStyle = `rgba(180,200,230,${0.25 + G.weather.intensity * 0.35})`;
    ctx.lineWidth = 1.5;
    for (const d of G.weather.rain) {
      ctx.beginPath();
      ctx.moveTo(X(d.x), Y(d.y));
      ctx.lineTo(X(d.x) - 4, Y(d.y) + d.len);
      ctx.stroke();
    }
  }
  if (G.weather.flashes.length > 0) {
    ctx.fillStyle = 'rgba(255,255,240,0.22)';
    ctx.fillRect(0, 0, VW, VH);
  }

  // Day/night: a cool wash after dark, streetlamps glowing at intersections.
  const bright = daylight(G.clock);
  if (bright < 0.95) {
    ctx.fillStyle = `rgba(8,14,44,${(0.95 - bright) * 0.55})`;
    ctx.fillRect(0, 0, VW, VH);
    if (bright < 0.6) {
      for (const rx of [300, 700, 1100, 1500, 1900, 2300, 2700, 3100]) {
        for (const ry of [250, 650, 1050, 1450, 1850, 2250]) {
          if (!inView(rx, ry)) continue;
          ctx.fillStyle = 'rgba(255,214,120,0.16)';
          ctx.beginPath(); ctx.arc(X(rx), Y(ry), 46, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffd678';
          ctx.beginPath(); ctx.arc(X(rx), Y(ry), 4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }

  if (!G.photo) drawHud(G, ctx);
  drawMenus(G, ctx);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHud(G, ctx) {
  const p = G.player;
  const W = 1280, H = 720;
  ctx.textAlign = 'left';
  // Top-left: cash, rep, clock, weather, radio.
  ctx.fillStyle = 'rgba(10,12,20,0.55)';
  roundRect(ctx, 12, 10, 330, 66, 8);
  ctx.fill();
  ctx.fillStyle = '#7bc47f';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`$${p.cash}`, 24, 38);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`REP ${p.rep}`, 24, 60);
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText(clockText(G.clock), 150, 38);
  ctx.fillText(G.weather.sky, 150, 60);
  ctx.fillText(`♪ ${G.radio.name()}`, 230, 38);
  ctx.fillStyle = '#c9c9c9';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${G.missions.done.length}/12 missions`, 230, 60);

  // Top-right: wanted stars.
  ctx.fillStyle = 'rgba(10,12,20,0.55)';
  roundRect(ctx, W - 190, 10, 178, 40, 8);
  ctx.fill();
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted.stars ? '#ffd166' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', W - 168 + i * 34, 38);
  }

  // Mission objective, top centre.
  const obj = missionObjective(G);
  ctx.font = 'bold 15px sans-serif';
  const ow = ctx.measureText(obj).width + 28;
  ctx.fillStyle = 'rgba(10,12,20,0.55)';
  roundRect(ctx, (W - ow) / 2, 10, ow, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(obj, W / 2, 32);

  // Toasts under the objective.
  ctx.font = '14px sans-serif';
  let ty = 62;
  for (const m of G.messages) {
    ctx.fillStyle = m.color || '#fff';
    ctx.fillText(m.text, W / 2, ty);
    ty += 20;
  }

  // Bottom-left: health, weapon, ammo.
  ctx.fillStyle = 'rgba(10,12,20,0.55)';
  roundRect(ctx, 12, H - 64, 260, 52, 8);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.fillRect(24, H - 48, 120, 12);
  ctx.fillStyle = p.hp > 30 ? '#7bc47f' : '#ff4757';
  ctx.fillRect(24, H - 48, 120 * (p.hp / 100), 12);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`HP ${Math.ceil(p.hp)}`, 152, H - 36);
  const w = WEAPONS[G.combat.weapon];
  const ammo = G.combat.ammo[G.combat.weapon];
  ctx.fillText(`${w.name}  ${w.infinite ? '∞' : ammo}`, 24, H - 20);

  // Speedometer when driving.
  if (p.vehicle) {
    const mph = Math.round(Math.abs(p.vehicle.speed) * 0.22);
    ctx.fillStyle = 'rgba(10,12,20,0.55)';
    roundRect(ctx, W - 190, H - 64, 178, 52, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${mph}`, W - 101, H - 30);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#c9c9c9';
    ctx.fillText('MPH', W - 101, H - 14);
    if (p.vehicle.damage > 0) {
      ctx.fillStyle = p.vehicle.damage > 45 ? '#ff4757' : '#ffd166';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`DAMAGE ${Math.round(p.vehicle.damage)}%`, W - 101, H - 52);
    }
    if (p.vehicle.tyresPopped) {
      ctx.fillStyle = '#ff4757';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('TYRES POPPED — FIND A GARAGE', W / 2, H - 84);
    }
  }

  // Garage prompt.
  if (p.vehicle && G.garageNear) {
    ctx.fillStyle = '#7CFC00';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('G — Repair & repaint at ' + G.garageNear.name, W / 2, H - 96);
  }

  // Off-screen mission arrow.
  const marker = offscreenMarker(G);
  if (marker) {
    const cx = W / 2, cy = H / 2;
    const a = Math.atan2(marker.y - cy, marker.x - cx);
    const ex = cx + Math.cos(a) * 300;
    const ey = cy + Math.sin(a) * 220;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(a);
    ctx.fillStyle = '#ff5d8f';
    ctx.beginPath();
    ctx.moveTo(14, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Minimap, bottom-right (above the speedometer when driving).
  drawMinimap(ctx, G, W - 212, H - 212, 200);

  // Photo-mode hint is hidden; the hint only shows outside photo mode.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('P photo · M mute · Esc pause', W - 12, H - 8);
}

function offscreenMarker(G) {
  const m = G.missions;
  let target = null;
  if (m.fare) target = m.fare.dropoff;
  else if (m.active >= 0) {
    const def = missionDef(G, m.active);
    if (def) {
      const step = def.steps[m.step];
      if (step) {
        if (step.type === 'race') target = G.city.raceRoute[m.raceCp] || null;
        else if (step.type === 'collect') {
          const next = m.crates.find(c => !c.got);
          target = next || null;
        } else if (step.type === 'defeat') {
          target = G.peds.find(pd => pd.kind === 'goon' && pd.hp > 0) || null;
        } else if (step.x !== undefined) target = { x: step.x, y: step.y };
      }
    }
  }
  if (!target) return null;
  const p = G.player;
  const px = p.vehicle ? p.vehicle.x : p.x;
  const py = p.vehicle ? p.vehicle.y : p.y;
  const cam = G.camera;
  const sx = target.x - (cam.x - 640);
  const sy = target.y - (cam.y - 360);
  if (sx > 40 && sx < 1240 && sy > 40 && sy < 680) return null;
  return { x: sx, y: sy };
}

function missionDef(G, idx) {
  return G.missionDefs ? G.missionDefs[idx] : null;
}

function drawMenus(G, ctx) {
  const W = 1280, H = 720;
  const p = G.player;
  ctx.textAlign = 'center';
  if (G.mode === 'title') {
    ctx.fillStyle = 'rgba(8,10,24,0.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('PALMERA BAY', W / 2, 200);
    ctx.fillStyle = '#ff5d8f';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('— SUNSET RUN —', W / 2, 248);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText('A top-down open-world crime game in the spirit of GTA 6', W / 2, 300);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#7bc47f';
    ctx.fillText('Press N to start the story  ·  12 missions  ·  or roam free', W / 2, 350);
    ctx.fillStyle = '#c9c9c9';
    ctx.font = '15px sans-serif';
    ctx.fillText('WASD move / drive · E steal a car · Mouse aim, click shoot · F punch · 1/2/3 weapons', W / 2, 400);
    ctx.fillText('Space handbrake · G garage · C radio · P photo mode · Esc pause · M mute', W / 2, 426);
    if (G.missions.done.length > 0) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`${G.missions.done.length}/12 missions done · $${p.cash} · ${G.city.tokens.filter(t => t.found).length}/12 sunset tokens`, W / 2, 480);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '13px sans-serif';
    ctx.fillText('An original game: Palmera Bay, Mara Vega and the Bay Syndicate are invented here.', W / 2, 540);
    return;
  }
  if (G.mode === 'paused') {
    ctx.fillStyle = 'rgba(8,10,24,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('PAUSED', W / 2, 260);
    ctx.font = '18px sans-serif';
    ctx.fillText(`Cash $${p.cash} · Rep ${p.rep} · ${G.missions.done.length}/12 missions · ${G.city.tokens.filter(t => t.found).length}/12 tokens`, W / 2, 310);
    ctx.fillText(`Best jump ${G.stats.bestAir.toFixed(1)}s · ${Math.round(G.stats.bestDist)}m · Time ${clockText(G.clock)}`, W / 2, 340);
    ctx.fillStyle = '#c9c9c9';
    ctx.fillText('Esc to resume', W / 2, 390);
    return;
  }
  if (G.mode === 'wasted') {
    ctx.fillStyle = 'rgba(20,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff4757';
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText('WASTED', W / 2, 330);
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.fillText('Press R to restart at the hospital', W / 2, 380);
    return;
  }
  if (G.mode === 'busted') {
    ctx.fillStyle = 'rgba(0,0,30,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#3d8bfd';
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText('BUSTED', W / 2, 330);
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.fillText('Press R to restart at the police station', W / 2, 380);
    return;
  }
  if (G.mode === 'complete') {
    ctx.fillStyle = 'rgba(8,24,10,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#7bc47f';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText('STORY COMPLETE', W / 2, 300);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText('Mara Vega paid her debt to the Bay Syndicate. Palmera Bay is yours.', W / 2, 350);
    ctx.fillText('Press N to keep roaming free', W / 2, 390);
    return;
  }
}
