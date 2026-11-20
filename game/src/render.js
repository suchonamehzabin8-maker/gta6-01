// Everything the player sees: the city through a day/night cycle, the cars
// and people, the police helicopter and its searchlight, roadblocks, spike
// strips, stunt ramps, the ferris wheel, the boardwalk and the garages, the
// rain and lightning, the effects, the HUD (minimap, wanted stars, cash,
// health, mission, weather, radio) and every menu. One canvas, one logical
// 1280x720 viewport, scaled to fit.
import { VIEW, WORLD, PALETTE, FONT, FONT_DISPLAY, LIGHTING } from './config.js';
import { AVENUES, STREETS, ROAD_W, BEACH_TOP, SEA_TOP, LANDMARKS, PLACES } from './city.js';
import { drawMinimap } from './minimap.js';
import { weatherWord } from './weather.js';
import { radioName } from './radio.js';
import { GARAGE_BAYS } from './garage.js';
import { RAMPS } from './stunts.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSE = 2;
export const SCREEN_OVER = 3;
export const SCREEN_BUSTED = 4;
export const SCREEN_COMPLETE = 5;

// Lighting for the current in-game clock: a tint colour, how strongly it
// darkens the scene, how bright the lamps glow, and the phase's name.
export function lightingFor(minutes) {
  const m = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  for (const phase of LIGHTING) {
    if (m >= phase.from && m < phase.to) return phase;
  }
  return LIGHTING[LIGHTING.length - 1];
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

function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const L = 54;
  const W = 26;
  if (car.kind === 'bike') {
    // A motorbike: a slim frame, two wheels and a leaning rider. The front
    // wheel lifts during a wheelie, and the whole bike leans into corners.
    const lean = car.lean || 0;
    const wheelie = car.wheelie || 0;
    ctx.rotate(lean * 0.5);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wheels — the front one lifts when the bike wheelies.
    ctx.fillStyle = '#14161a';
    ctx.beginPath();
    ctx.arc(-22, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(22, -wheelie * 12, 8, 0, Math.PI * 2);
    ctx.fill();
    // Frame.
    ctx.strokeStyle = car.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(22, -wheelie * 12);
    ctx.stroke();
    // Tank and seat.
    ctx.fillStyle = car.color;
    roundRect(ctx, -8, -6 - wheelie * 4, 20, 10, 4);
    ctx.fill();
    // Rider, leaning with the bike.
    ctx.fillStyle = '#e8b48c';
    ctx.beginPath();
    ctx.arc(-2, -12, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c2f38';
    ctx.fillRect(-8, -8, 12, 5);
    // Headlight.
    ctx.fillStyle = '#fff8c9';
    ctx.fillRect(26, -3 - wheelie * 12, 4, 6);
    ctx.restore();
    return;
  }
  if (car.kind === 'roadblock') {
    // A striped police barrier across the road, with two flashing beacons.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(ctx, -L / 2 + 3, -W / 2 + 4, L, W, 8);
    ctx.fill();
    ctx.fillStyle = '#e8e8e8';
    roundRect(ctx, -L / 2, -W / 2, L, W, 6);
    ctx.fill();
    ctx.fillStyle = '#e5534b';
    ctx.fillRect(-L / 2 + 4, -W / 2 + 2, 12, W - 4);
    ctx.fillRect(-L / 2 + 24, -W / 2 + 2, 12, W - 4);
    ctx.fillRect(-L / 2 + 44, -W / 2 + 2, 6, W - 4);
    const flash = Math.floor(time * 4) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#2f7bff';
    ctx.beginPath();
    ctx.arc(0, -W / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#2f7bff' : '#ff3b30';
    ctx.beginPath();
    ctx.arc(0, W / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (car.wreck) {
    // A wreck: charred shell, no windows, smoke curling up.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, -L / 2 + 3, -W / 2 + 4, L, W, 8);
    ctx.fill();
    ctx.fillStyle = '#2a2724';
    roundRect(ctx, -L / 2, -W / 2, L, W, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,120,120,0.55)';
    ctx.beginPath();
    ctx.arc(-L / 4, 0, 10 + Math.sin(time * 5) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(L / 6, -4, 7 + Math.cos(time * 4) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(ctx, -L / 2 + 3, -W / 2 + 4, L, W, 8);
  ctx.fill();
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -L / 2, -W / 2, L, W, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, -L / 2 + 4, -W / 2 + 3, L - 8, 6, 3);
  ctx.fill();
  // Windows and roof.
  ctx.fillStyle = '#1d2b36';
  roundRect(ctx, -8, -W / 2 + 4, 18, W - 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-L / 2 + 5, -W / 2 + 4, 6, W - 8);
  // Wheels.
  ctx.fillStyle = '#14161a';
  ctx.fillRect(-L / 2 + 6, -W / 2 - 3, 10, 5);
  ctx.fillRect(-L / 2 + 6, W / 2 - 2, 10, 5);
  ctx.fillRect(L / 2 - 16, -W / 2 - 3, 10, 5);
  ctx.fillRect(L / 2 - 16, W / 2 - 2, 10, 5);
  // Headlights.
  ctx.fillStyle = '#fff8c9';
  ctx.fillRect(L / 2 - 2, -W / 2 + 4, 3, 5);
  ctx.fillRect(L / 2 - 2, W / 2 - 9, 3, 5);
  if (car.kind === 'police') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -W / 2 + 2, 10, 3);
    ctx.fillRect(-4, W / 2 - 5, 10, 3);
    const flash = Math.floor(time * 4) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#2f7bff';
    ctx.beginPath();
    ctx.arc(-2, -W / 2 + 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#2f7bff' : '#ff3b30';
    ctx.beginPath();
    ctx.arc(-2, W / 2 - 3, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#14161a';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  if (car.smoke > 0) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.arc(-L / 2, 0, 8 + (0.4 - Math.min(car.smoke, 0.4)) * 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// The police helicopter: a dark silhouette with a spinning rotor, a red
// beacon, and a searchlight cone sweeping the ground below it.
function drawHeli(ctx, heli, time) {
  if (!heli.active) return;
  const sweep = heli.sweep;
  // Searchlight cone on the ground, sweeping slowly.
  ctx.save();
  ctx.translate(heli.x, heli.y);
  ctx.rotate(sweep);
  const grad = ctx.createLinearGradient(0, 0, 150, 0);
  grad.addColorStop(0, 'rgba(255,240,180,0.30)');
  grad.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(150, -42);
  ctx.lineTo(150, 42);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Shadow on the ground, offset by the sun's low angle.
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(heli.x + 26, heli.y + 30, 30, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.save();
  ctx.translate(heli.x, heli.y);
  ctx.rotate(heli.angle);
  ctx.fillStyle = '#1d2b36';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f6fd0';
  ctx.fillRect(-6, -12, 22, 24);
  ctx.fillStyle = '#9fd8ef';
  ctx.beginPath();
  ctx.ellipse(16, 0, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rotor, blurred by speed.
  ctx.strokeStyle = 'rgba(20,22,26,0.75)';
  ctx.lineWidth = 3;
  const rotor = time * 22;
  ctx.beginPath();
  ctx.moveTo(Math.cos(rotor) * -34, Math.sin(rotor) * -34);
  ctx.lineTo(Math.cos(rotor) * 34, Math.sin(rotor) * 34);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(Math.cos(rotor + Math.PI / 2) * -34, Math.sin(rotor + Math.PI / 2) * -34);
  ctx.lineTo(Math.cos(rotor + Math.PI / 2) * 34, Math.sin(rotor + Math.PI / 2) * 34);
  ctx.stroke();
  // Red beacon.
  const flash = Math.floor(time * 3) % 2 === 0;
  ctx.fillStyle = flash ? '#ff3b30' : '#7a1a16';
  ctx.beginPath();
  ctx.arc(-14, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, color, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(angle);
  // Legs (two small feet that alternate while walking).
  const step = opts.walking ? Math.sin((opts.time || 0) * 10) * 4 : 0;
  ctx.fillStyle = '#2c2f38';
  ctx.fillRect(-4, -8 + step * 0.4, 7, 4);
  ctx.fillRect(-4, 4 - step * 0.4, 7, 4);
  // Body.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(-3, -3, 4, 0, Math.PI * 2);
  ctx.fill();
  // Head and shoulders face the walking direction.
  ctx.fillStyle = '#e8b48c';
  ctx.beginPath();
  ctx.arc(7, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  if (opts.gun) {
    ctx.strokeStyle = '#22252c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
  }
  if (opts.panic) {
    ctx.fillStyle = '#ff5d5d';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, -20);
  }
  if (opts.goon) {
    // A Syndicate goon's red bandana, so the brawl's muscle reads at a
    // glance among the crowd.
    ctx.fillStyle = '#d64545';
    ctx.fillRect(2, -8, 10, 4);
  }
  ctx.restore();
}

// The Bay Wheel: a ferris wheel on the sand by the boardwalk, turning
// slowly, its gondolas hanging level as the rim goes round.
function drawWheel(ctx, wheel, time) {
  if (!wheel) return;
  const angle = time * 0.15;
  // Supports.
  ctx.strokeStyle = '#3a3f4a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(wheel.x - 30, wheel.y + 46);
  ctx.lineTo(wheel.x, wheel.y);
  ctx.lineTo(wheel.x + 30, wheel.y + 46);
  ctx.stroke();
  // Rim.
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(wheel.x, wheel.y, wheel.radius, 0, Math.PI * 2);
  ctx.stroke();
  // Spokes and gondolas.
  const gondolaColors = ['#d64545', '#f39c12', '#4a90d9', '#8e44ad'];
  for (let i = 0; i < 8; i += 1) {
    const a = angle + (i / 8) * Math.PI * 2;
    const gx = wheel.x + Math.cos(a) * wheel.radius;
    const gy = wheel.y + Math.sin(a) * wheel.radius;
    ctx.strokeStyle = 'rgba(232,232,232,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wheel.x, wheel.y);
    ctx.lineTo(gx, gy);
    ctx.stroke();
    ctx.fillStyle = gondolaColors[i % 4];
    ctx.beginPath();
    ctx.arc(gx, gy, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hub.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(wheel.x, wheel.y, 6, 0, Math.PI * 2);
  ctx.fill();
}

// The ground under everything: grass, the sand strip and the sea, then
// the road grid with its centre dashes and sidewalks, the park, the
// parking lots, the pier, the marina boats and the stadium oval. The
// visible rectangle is computed once so every fill stays on screen.
function drawGround(ctx, game, cam) {
  const { city } = game;
  const half = ROAD_W / 2;
  const view = {
    x: cam.x - VIEW.width / 2 - 40,
    y: cam.y - VIEW.height / 2 - 40,
    w: VIEW.width + 80,
    h: VIEW.height + 80,
  };
  ctx.fillStyle = '#8fae62';
  ctx.fillRect(view.x, view.y, view.w, view.h);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(view.x, BEACH_TOP, view.w, SEA_TOP - BEACH_TOP);
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(view.x, SEA_TOP, view.w, WORLD.height - SEA_TOP + 40);
  ctx.fillStyle = PALETTE.seaDeep;
  for (let i = 0; i < 5; i += 1) ctx.fillRect(view.x, SEA_TOP + 40 + i * 34, view.w, 3);
  // Roads: every avenue north-south, every street east-west, and the beach
  // road along the sand.
  ctx.fillStyle = PALETTE.road;
  for (const ax of AVENUES) ctx.fillRect(ax - half, 80, ROAD_W, BEACH_TOP - 80);
  for (const sy of STREETS) ctx.fillRect(100, sy - half, WORLD.width - 200, ROAD_W);
  ctx.fillRect(100, 2330 - half, WORLD.width - 200, ROAD_W);
  // Centre dashes: short marks down the middle of every road.
  ctx.fillStyle = PALETTE.roadLine;
  for (const ax of AVENUES) {
    for (let y = 120; y < BEACH_TOP; y += 56) ctx.fillRect(ax - 2, y, 4, 26);
  }
  for (const sy of STREETS) {
    for (let x = 140; x < WORLD.width - 100; x += 56) ctx.fillRect(x, sy - 2, 26, 4);
  }
  // Sidewalks flank every avenue.
  ctx.fillStyle = PALETTE.sidewalk;
  for (const ax of AVENUES) {
    ctx.fillRect(ax - half - 14, 80, 14, BEACH_TOP - 80);
    ctx.fillRect(ax + half, 80, 14, BEACH_TOP - 80);
  }
  // Coral Park: green, with a darker lawn and a pond in the middle.
  for (const p of city.parks) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PALETTE.grassDark;
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6db3e8';
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  // Parking lots: grey slabs with painted bays.
  for (const lot of city.lots) {
    ctx.fillStyle = '#6d6a63';
    ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
    ctx.strokeStyle = 'rgba(245,241,230,0.6)';
    ctx.lineWidth = 2;
    for (let x = lot.x + 20; x < lot.x + lot.w - 20; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, lot.y + 12);
      ctx.lineTo(x, lot.y + 44);
      ctx.stroke();
    }
  }
  // The pier: planks out over the sea, with a darker line every few feet.
  ctx.fillStyle = PALETTE.pier;
  ctx.fillRect(city.pier.x, city.pier.y, city.pier.w, city.pier.h);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let y = city.pier.y + 14; y < city.pier.y + city.pier.h; y += 22) {
    ctx.fillRect(city.pier.x, y, city.pier.w, 3);
  }
  // Marina boats moored along the slips.
  for (const boat of city.boats) {
    ctx.save();
    ctx.translate(boat.x, boat.y);
    ctx.rotate(boat.angle);
    ctx.fillStyle = boat.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d2b36';
    ctx.fillRect(-6, -4, 12, 8);
    ctx.restore();
  }
  // Bay Stadium: an oval arena with a green pitch, a centre circle and
  // floodlight masts at the corners.
  const st = PLACES.stadium;
  ctx.fillStyle = '#5a5148';
  ctx.beginPath();
  ctx.ellipse(st.x, st.y, 190, 130, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a8f4f';
  ctx.beginPath();
  ctx.ellipse(st.x, st.y, 160, 100, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,241,230,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(st.x, st.y, 60, 42, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e8e8e8';
  for (const [mx, my] of [[-170, -110], [170, -110], [-170, 110], [170, 110]]) {
    ctx.fillRect(st.x + mx - 3, st.y + my - 3, 6, 6);
  }
}

// Every building, with a long golden-hour shadow, a roof, lit windows on
// the towers, the casino's neon sign after dusk, and striped awnings on
// the boardwalk shops.
function drawBuildings(ctx, game, light) {
  for (const b of game.city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 10, b.y + 12, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
    if (b.tall) {
      // A tower: rows of lit windows.
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let wy = b.y + 18; wy < b.y + b.h - 14; wy += 22) {
        for (let wx = b.x + 14; wx < b.x + b.w - 14; wx += 24) ctx.fillRect(wx, wy, 10, 8);
      }
    } else {
      // A low building: one door in the middle.
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(b.x + b.w / 2 - 12, b.y + b.h / 2 - 8, 24, 16);
    }
    if (b.casino) {
      // Golden Palm Casino: a neon sign that only lights up after dusk.
      const glow = 0.4 + light.lamps * 0.6;
      ctx.fillStyle = `rgba(255,93,162,${glow})`;
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GOLDEN PALM', b.x + b.w / 2, b.y + b.h / 2 - 4);
      ctx.fillStyle = `rgba(242,201,76,${glow})`;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('★ CASINO ★', b.x + b.w / 2, b.y + b.h / 2 + 16);
    }
    if (b.boardwalk) {
      // A striped awning on the shop front, facing the sea.
      for (let s = 0; s < 6; s += 1) {
        ctx.fillStyle = s % 2 === 0 ? (b.awning || '#d64545') : 'rgba(255,255,255,0.85)';
        ctx.fillRect(b.x + 6 + s * 15, b.y + b.h - 2, 15, 12);
      }
    }
  }
}

function drawWorld(ctx, game) {
  const { city, time } = game;
  const cam = game.camera;
  const light = lightingFor(game.clockMinutes);
  ctx.save();
  ctx.translate(-cam.x + VIEW.width / 2, -cam.y + VIEW.height / 2);
  drawGround(ctx, game, cam);
  drawBuildings(ctx, game, light);
  // Neon billboards over the beach road.
  for (const board of city.billboards) {
    ctx.fillStyle = '#1d2b36';
    ctx.fillRect(board.x - 70, board.y - 60, 140, 44);
    ctx.strokeStyle = board.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(board.x - 70, board.y - 60, 140, 44);
    ctx.fillStyle = board.color;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(board.text, board.x, board.y - 32);
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(board.x - 4, board.y - 16, 8, 16);
  }
  // Palmera Lighthouse: a striped tower on the water with a rotating beam.
  const lh = PLACES.lighthouse;
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(lh.x - 14, lh.y - 60, 28, 60);
  ctx.fillStyle = '#e5534b';
  ctx.fillRect(lh.x - 14, lh.y - 44, 28, 12);
  ctx.fillRect(lh.x - 14, lh.y - 16, 28, 12);
  ctx.fillStyle = '#1d2b36';
  ctx.fillRect(lh.x - 10, lh.y - 72, 20, 12);
  const beamAngle = time * 0.7;
  const beam = ctx.createLinearGradient(
    lh.x, lh.y - 66,
    lh.x + Math.cos(beamAngle) * 420, lh.y - 66 + Math.sin(beamAngle) * 420,
  );
  beam.addColorStop(0, `rgba(255,240,180,${0.15 + light.lamps * 0.35})`);
  beam.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = beam;
  ctx.save();
  ctx.translate(lh.x, lh.y - 66);
  ctx.rotate(beamAngle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(420, -46);
  ctx.lineTo(420, 46);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The Bay Wheel on the sand by the boardwalk.
  drawWheel(ctx, city.wheel, time);
  // Spray & Go bays: a green ring and a sign, so a hurt car can find them.
  for (const bay of GARAGE_BAYS) {
    ctx.strokeStyle = 'rgba(88,179,104,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bay.x, bay.y, 56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#58b368';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bay.name.toUpperCase(), bay.x, bay.y - 62);
  }
  // Stunt ramps: wooden lips on the open road, with a yellow edge.
  for (const ramp of RAMPS) {
    ctx.save();
    ctx.translate(ramp.x, ramp.y);
    ctx.rotate(ramp.angle);
    ctx.fillStyle = '#8a6a3f';
    ctx.beginPath();
    ctx.moveTo(-34, 16);
    ctx.lineTo(34, -10);
    ctx.lineTo(34, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(-34, 12, 68, 4);
    ctx.restore();
  }
  // Spike strips the PD dropped: a dark mat of steel teeth across the road.
  for (const strip of game.wanted.spikes) {
    ctx.save();
    ctx.translate(strip.x, strip.y);
    ctx.rotate(strip.angle + Math.PI / 2);
    ctx.fillStyle = '#22252c';
    ctx.fillRect(-60, -6, 120, 12);
    ctx.fillStyle = '#c8ccd4';
    for (let tx = -56; tx < 60; tx += 12) {
      ctx.beginPath();
      ctx.moveTo(tx, -6);
      ctx.lineTo(tx + 5, 0);
      ctx.lineTo(tx, 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  // Palms.
  for (const palm of city.palms) {
    ctx.strokeStyle = '#7a5a38';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(palm.x, palm.y);
    ctx.lineTo(palm.x + 3, palm.y - 16);
    ctx.stroke();
    ctx.fillStyle = '#3f8f4f';
    ctx.beginPath();
    ctx.arc(palm.x + 3, palm.y - 20, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#57a866';
    ctx.beginPath();
    ctx.arc(palm.x - 2, palm.y - 24, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Streetlamps glow once the light fades.
  if (light.lamps > 0.1) {
    for (const lamp of city.lamps) {
      const lx = lamp.x;
      const ly = lamp.y;
      if (lx < cam.x - VIEW.width / 2 - 60 || lx > cam.x + VIEW.width / 2 + 60) continue;
      if (ly < cam.y - VIEW.height / 2 - 60 || ly > cam.y + VIEW.height / 2 + 60) continue;
      const glow = ctx.createRadialGradient(lx, ly, 2, lx, ly, 46);
      glow.addColorStop(0, `rgba(255,217,138,${0.5 * light.lamps})`);
      glow.addColorStop(1, 'rgba(255,217,138,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx, ly, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd98a';
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Sunset tokens.
  for (const t of game.tokens) {
    if (t.taken) continue;
    const bob = Math.sin(time * 3 + t.x) * 3;
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(t.x, t.y + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', t.x, t.y + bob + 4);
  }
  // Pickups.
  for (const p of game.combat.pickups) {
    const bob = Math.sin(p.bob * 4) * 3;
    ctx.fillStyle = p.kind === 'health' ? '#ff6b6b' : p.kind === 'ammo' ? '#4fc3f7' : p.kind === 'weapon' ? '#b388eb' : PALETTE.gold;
    roundRect(ctx, p.x - 11, p.y - 11 + bob, 22, 22, 5);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.kind === 'health' ? '+' : p.kind === 'ammo' ? 'A' : p.kind === 'weapon' ? 'W' : '$', p.x, p.y + 5 + bob);
  }
  // Mission marker: a pulsing ring and a beacon of light.
  const target = game.missionTarget;
  if (target) {
    const pulse = 1 + Math.sin(time * 4) * 0.15;
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 34 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(242,201,76,0.25)';
    ctx.beginPath();
    ctx.arc(target.x, target.y, 22 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.moveTo(target.x, target.y - 44);
    ctx.lineTo(target.x + 10, target.y - 24);
    ctx.lineTo(target.x - 10, target.y - 24);
    ctx.closePath();
    ctx.fill();
  }
  // Race checkpoints.
  if (game.raceActive) {
    game.racePoints.forEach((cp, i) => {
      if (i < game.raceCheckpoint) return;
      ctx.fillStyle = i === game.raceCheckpoint ? PALETTE.gold : 'rgba(245,241,230,0.5)';
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, i === game.raceCheckpoint ? 26 : 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10131a';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), cp.x, cp.y + 6);
    });
  }
  // Cars, peds, cops, player, bullets, helicopter.
  for (const car of game.cars) drawCar(ctx, car, time);
  for (const ped of game.peds) {
    if (ped.dead) continue;
    drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color, {
      walking: ped.panic <= 0 && ped.wait <= 0,
      time,
      panic: ped.panic > 0,
    });
  }
  for (const cop of game.cops) {
    if (cop.dead) continue;
    drawPerson(ctx, cop.x, cop.y, cop.angle, '#2f6fd0', { walking: true, time });
    ctx.fillStyle = '#1d2b36';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', cop.x, cop.y - 18);
  }
  // Syndicate goons, out only while the Bayfront Brawl's fight is running.
  for (const goon of game.goons || []) {
    if (goon.dead) continue;
    drawPerson(ctx, goon.x, goon.y, goon.angle, '#3a3f4a', { walking: true, time, goon: true });
    ctx.fillStyle = '#d64545';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GOON', goon.x, goon.y - 18);
  }
  if (game.playerCar) {
    // Player is inside the car: draw a small head through the roof. A
    // bike already draws its rider, so it needs no extra head.
    if (game.playerCar.kind !== 'bike') {
      ctx.fillStyle = '#e8b48c';
      ctx.beginPath();
      ctx.arc(game.playerCar.x, game.playerCar.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    drawPerson(ctx, game.player.x, game.player.y, game.player.angle, PALETTE.player, {
      walking: game.player.moving,
      time,
      gun: game.combat.ammo > 0,
    });
  }
  // Bullets.
  ctx.fillStyle = '#ffe066';
  for (const b of game.combat.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Muzzle flash.
  if (game.combat.muzzle > 0 && !game.playerCar) {
    ctx.fillStyle = 'rgba(255,220,100,0.9)';
    const mx = game.player.x + Math.cos(game.player.angle) * 24;
    const my = game.player.y + Math.sin(game.player.angle) * 24;
    ctx.beginPath();
    ctx.arc(mx, my, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  drawHeli(ctx, game.wanted.heli, time);
  ctx.restore();
  // Day/night tint over the whole scene, in screen space.
  if (light.alpha > 0) {
    ctx.fillStyle = light.tint;
    ctx.globalAlpha = light.alpha;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.globalAlpha = 1;
  }
  // Rain streaks fall in screen space, and lightning flashes the sky.
  const weather = game.weather;
  if (weather && weather.intensity > 0.05) {
    ctx.strokeStyle = `rgba(174,194,224,${0.35 * weather.intensity})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const s of weather.streaks) {
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - weather.gust * 8, s.y + s.len);
    }
    ctx.stroke();
    if (weather.flash > 0) {
      ctx.fillStyle = `rgba(255,255,240,${weather.flash * 0.28})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }
}

function clockText(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function drawHud(ctx, game) {
  const { player, progress, wanted, combat } = game;
  const light = lightingFor(game.clockMinutes);
  drawMinimap(ctx, game);
  // Wanted stars, top right — flashing red at 5 stars.
  ctx.textAlign = 'right';
  ctx.font = 'bold 30px system-ui, sans-serif';
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < wanted.stars ? '★' : '☆';
  ctx.fillStyle = wanted.stars >= 5 && Math.floor(game.time * 2) % 2 === 0
    ? PALETTE.red
    : wanted.stars > 0 ? PALETTE.gold : 'rgba(245,241,230,0.45)';
  ctx.fillText(stars, VIEW.width - 18, 48);
  if (wanted.heli.active) {
    ctx.fillStyle = PALETTE.red;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('HELICOPTER OVERHEAD', VIEW.width - 18, 66);
  }
  // Cash, health, ammo panel.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hudPanel;
  roundRect(ctx, VIEW.width - 218, 78, 200, 104, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`$${progress.cash.toLocaleString()}`, VIEW.width - 204, 110);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`REP ${progress.rep}   •   ${clockText(game.clockMinutes)}`, VIEW.width - 204, 134);
  // Health bar, with its label underneath so the two never overlap.
  ctx.fillStyle = '#3a3f4a';
  roundRect(ctx, VIEW.width - 204, 144, 172, 10, 5);
  ctx.fill();
  ctx.fillStyle = player.health > 30 ? PALETTE.green : PALETTE.red;
  roundRect(ctx, VIEW.width - 204, 144, Math.max(0, 172 * (player.health / 100)), 10, 5);
  ctx.fill();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`HEALTH ${Math.ceil(player.health)}   AMMO ${combat.ammo}`, VIEW.width - 204, 172);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 13px system-ui, sans-serif';
  const weaponNames = { pistol: 'PISTOL', smg: 'SPRAY GUN', shotgun: 'BOOMSTICK' };
  ctx.fillText(`${weaponNames[combat.weapon] || 'PISTOL'}  •  1/2/3 switch`, VIEW.width - 204, 190);
  // Mission objective, bottom centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudPanel;
  const obj = game.objectiveText;
  const w = Math.min(760, ctx.measureText(obj).width + 40);
  roundRect(ctx, VIEW.width / 2 - w / 2, VIEW.height - 58, w, 40, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(obj, VIEW.width / 2, VIEW.height - 32);
  // Timer for timed objectives.
  if (game.stepTimer > 0) {
    ctx.fillStyle = game.stepTimer < 10 ? PALETTE.red : PALETTE.gold;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(`⏱ ${Math.ceil(game.stepTimer)}s`, VIEW.width / 2, VIEW.height - 74);
  }
  // Time-of-day tag, top centre — with the weather and the radio station.
  ctx.fillStyle = 'rgba(245,241,230,0.8)';
  ctx.font = 'bold 13px system-ui, sans-serif';
  const weatherBit = game.weather ? `  •  ${weatherWord(game.weather)}` : '';
  const radioBit = game.radio && game.radio.on ? `  •  ${radioName(game.radio)}` : '';
  ctx.fillText(`${light.name.toUpperCase()}  •  ${clockText(game.clockMinutes)}${weatherBit}${radioBit}`, VIEW.width / 2, 26);
  // Message toast.
  if (game.message && game.messageTimer > 0) {
    ctx.fillStyle = 'rgba(16,19,26,0.88)';
    const mw = Math.min(900, ctx.measureText(game.message).width + 40);
    roundRect(ctx, VIEW.width / 2 - mw / 2, 76, mw, 44, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(game.message, VIEW.width / 2, 104);
  }
  // Stunt popup: big gold text for a good jump.
  if (game.stunts && game.stunts.popupTimer > 0) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(game.stunts.popup, VIEW.width / 2, 140);
  }
  // Spike warning: tyres gone, find a garage.
  if (game.playerCar && game.playerCar.spiked) {
    ctx.fillStyle = PALETTE.red;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('TYRES SHOT — GET TO A GARAGE!', VIEW.width / 2, 164);
  }
  // Garage prompt, just above the mission objective.
  if (game.garagePrompt && game.stepTimer <= 0) {
    ctx.fillStyle = '#58b368';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(game.garagePrompt, VIEW.width / 2, VIEW.height - 74);
  }
  // Speedometer when driving.
  if (game.playerCar) {
    const mph = Math.round(Math.abs(game.playerCar.speed) * 0.14);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(`${mph}`, VIEW.width - 24, VIEW.height - 100);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('MPH  •  SPACE handbrake', VIEW.width - 24, VIEW.height - 74);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(game.playerCar.name, VIEW.width - 24, VIEW.height - 126);
    if (game.playerCar.kind === 'bike' && (game.playerCar.wheelie || 0) > 0.5) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('WHEELIE!', VIEW.width - 24, VIEW.height - 148);
    }
  }
  // Controls hint, bottom left.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(245,241,230,0.75)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('WASD move/drive  •  E enter car  •  Click shoot  •  F punch  •  1/2/3 weapons  •  C radio  •  G garage  •  P photo  •  Esc pause  •  M mute', 16, VIEW.height - 14);
  // Taxi fare — below the message toast so the two never overlap.
  if (game.taxi.passenger) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`TAXI FARE $${game.taxi.fare} — take ${game.taxi.passenger.name} to the marker`, VIEW.width / 2, 164);
  }
  // Off-screen mission arrow.
  const target = game.missionTarget;
  if (target) {
    const sx = target.x - game.camera.x + VIEW.width / 2;
    const sy = target.y - game.camera.y + VIEW.height / 2;
    if (sx < 40 || sx > VIEW.width - 40 || sy < 40 || sy > VIEW.height - 40) {
      let cx = Math.min(Math.max(sx, 60), VIEW.width - 60);
      let cy = Math.min(Math.max(sy, 120), VIEW.height - 120);
      if (cx < 240 && cy < 210) cy = 210; // clear of the minimap
      if (cx > VIEW.width - 260 && cy < 210) cy = 210; // clear of the cash panel and its weapon line
      const a = Math.atan2(sy - VIEW.height / 2, sx - VIEW.width / 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-8, -10);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (!(cx > VIEW.width - 260 && cy < 210)) {
        ctx.fillStyle = PALETTE.gold;
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(Math.hypot(target.x - player.x, target.y - player.y))}m`, cx, cy + 28);
      }
    }
  }
}

function drawTitle(ctx, game) {
  ctx.fillStyle = '#1b1f2a';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Sunset bands.
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, '#ff9e5e');
  grad.addColorStop(0.45, '#ff6b9d');
  grad.addColorStop(0.75, '#7b5ea7');
  grad.addColorStop(1, '#2b2d5c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(VIEW.width / 2, 380, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,16,40,0.55)';
  ctx.fillRect(0, 430, VIEW.width, VIEW.height - 430);
  // Skyline silhouette: low enough that it never reaches the title text.
  ctx.fillStyle = '#241f3d';
  const skyline = [50, 90, 60, 110, 80, 100, 55, 120, 85, 70, 105, 60];
  let x = 0;
  for (const h of skyline) {
    ctx.fillRect(x, 430 - h, 110, h);
    x += 110;
  }
  // A tiny lighthouse on the right of the skyline, beam and all.
  ctx.fillStyle = '#241f3d';
  ctx.fillRect(1150, 340, 22, 90);
  ctx.fillStyle = 'rgba(255,240,180,0.5)';
  ctx.beginPath();
  ctx.moveTo(1161, 350);
  ctx.lineTo(1280, 320);
  ctx.lineTo(1280, 380);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = `900 92px ${FONT_DISPLAY}`;
  ctx.fillText('PALMERA BAY', VIEW.width / 2, 210);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('S U N S E T   R U N', VIEW.width / 2, 258);
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('An open-world crime game in the spirit of GTA 6 — a city of your own.', VIEW.width / 2, 300);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO PLAY', VIEW.width / 2, 480);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('WASD move & drive  •  E steal a car  •  Mouse aim, click to shoot  •  F punch', VIEW.width / 2, 530);
  ctx.fillText('12 story missions  •  Taxi fares  •  12 hidden sunset tokens  •  Storms, bikes, garages & stunt jumps', VIEW.width / 2, 560);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`Best score: $${(game.bestCash || 0).toLocaleString()}   •   Missions done: ${game.progress.missionDone.filter(Boolean).length}/12`, VIEW.width / 2, 620);
  ctx.fillText('Original work: no Rockstar names, art, music or map. Built for make.fun — gta6-01.', VIEW.width / 2, 648);
}

function drawOverlay(ctx, title, lines, hint) {
  ctx.fillStyle = 'rgba(10,12,18,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = `900 56px ${FONT_DISPLAY}`;
  ctx.fillText(title, VIEW.width / 2, 250);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 310 + i * 34));
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText(hint, VIEW.width / 2, 310 + lines.length * 34 + 30);
}

// The pause screen doubles as the stats screen: cash, missions, tokens,
// fares, races won, distance driven, shots fired and the highest wanted
// level survived this session.
function drawPause(ctx, game) {
  const s = game.stats;
  const miles = (s.distance / 1609).toFixed(1);
  drawOverlay(ctx, 'PAUSED', [
    `Cash $${game.progress.cash.toLocaleString()}  •  Missions ${game.progress.missionDone.filter(Boolean).length}/12`,
    `Missions: ${game.missionListText}`,
    `Tokens ${game.progress.tokens}/12  •  Fares ${game.progress.fares}  •  Races won ${game.progress.racesWon}`,
    `Driven ${miles} miles  •  Shots fired ${s.shots}  •  Cars stolen ${s.carsStolen}  •  Highest heat ${s.bestWanted}★`,
  ], 'ESC resume  •  R restart mission  •  Q quit to title');
}

export function drawGame(ctx, game) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  if (game.screen === SCREEN_TITLE) {
    drawTitle(ctx, game);
    return;
  }
  drawWorld(ctx, game);
  if (game.photoMode) {
    // Photo mode: just the city, no HUD, so the shot is clean.
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(245,241,230,0.85)';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('PHOTO MODE — press P to exit', VIEW.width / 2, VIEW.height - 16);
    return;
  }
  drawHud(ctx, game);
  if (game.screen === SCREEN_PAUSE) {
    drawPause(ctx, game);
  } else if (game.screen === SCREEN_OVER) {
    drawOverlay(ctx, 'WASTED', ['Mara: "Get up. The city doesn\'t wait."', `You had $${game.progress.cash.toLocaleString()}`], 'ENTER — try again');
  } else if (game.screen === SCREEN_BUSTED) {
    drawOverlay(ctx, 'BUSTED', ['The Palmera Bay PD caught you.', 'You paid a $200 fine and lost your heat.'], 'ENTER — back on the streets');
  } else if (game.screen === SCREEN_COMPLETE) {
    drawOverlay(ctx, 'PALMERA BAY IS YOURS', [
      'Every mission done. The debt is paid, the city is yours.',
      `Final cash $${game.progress.cash.toLocaleString()}  •  Tokens ${game.progress.tokens}/12  •  Races won ${game.progress.racesWon}`,
    ], 'ENTER — keep playing in free roam');
  }
}
