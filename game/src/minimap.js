// The HUD minimap: a small live map of Palmera Bay in the top-left corner —
// roads, beach, landmarks, the player, police cars and foot cops, the
// helicopter, roadblocks, the mission marker, nearby cars, uncollected
// tokens, the garages, the stunt ramps and the brawl's goons. A north label
// and the city name sit underneath.
import { WORLD, PALETTE } from './config.js';
import { AVENUES, STREETS, ROAD_W, BEACH_TOP, SEA_TOP, LANDMARKS } from './city.js';
import { GARAGE_BAYS } from './garage.js';
import { RAMPS } from './stunts.js';

const SIZE = 190;
const SCALE = SIZE / WORLD.width;

function mapX(x) {
  return 14 + x * SCALE;
}
function mapY(y) {
  return 14 + y * SCALE;
}

export function drawMinimap(ctx, game) {
  const { cars, cops, missionTarget: target, wanted } = game;
  const panelH = SIZE * (WORLD.height / WORLD.width);
  ctx.save();
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fillRect(10, 10, SIZE + 8, panelH + 8);
  ctx.strokeStyle = 'rgba(245,241,230,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, SIZE + 8, panelH + 8);
  // Grass base so the map reads as the city, not a black grid.
  ctx.fillStyle = '#8fae62';
  ctx.fillRect(mapX(0), mapY(0), SIZE, panelH);
  // Sea and sand.
  ctx.fillStyle = '#2a7f8f';
  ctx.fillRect(mapX(0), mapY(SEA_TOP), SIZE, (WORLD.height - SEA_TOP) * SCALE);
  ctx.fillStyle = '#e8c98a';
  ctx.fillRect(mapX(0), mapY(BEACH_TOP), SIZE, (SEA_TOP - BEACH_TOP) * SCALE);
  // Roads.
  ctx.strokeStyle = 'rgba(245,241,230,0.5)';
  ctx.lineWidth = Math.max(1, ROAD_W * SCALE);
  for (const avenue of AVENUES) {
    ctx.beginPath();
    ctx.moveTo(mapX(avenue), mapY(80));
    ctx.lineTo(mapX(avenue), mapY(BEACH_TOP));
    ctx.stroke();
  }
  for (const street of STREETS) {
    ctx.beginPath();
    ctx.moveTo(mapX(120), mapY(street));
    ctx.lineTo(mapX(3480), mapY(street));
    ctx.stroke();
  }
  // Park.
  ctx.fillStyle = '#7fae5a';
  ctx.fillRect(mapX(1950), mapY(550), 300 * SCALE, 300 * SCALE);
  // Landmarks: gold diamonds for the lighthouse, stadium, marina and casino.
  ctx.fillStyle = PALETTE.gold;
  for (const lm of LANDMARKS) {
    const mx = mapX(lm.x);
    const my = mapY(lm.y);
    ctx.beginPath();
    ctx.moveTo(mx, my - 4);
    ctx.lineTo(mx + 4, my);
    ctx.lineTo(mx, my + 4);
    ctx.lineTo(mx - 4, my);
    ctx.closePath();
    ctx.fill();
  }
  // Garages: green squares, so a hurt car can find a repair.
  ctx.fillStyle = '#58b368';
  for (const bay of GARAGE_BAYS) {
    ctx.fillRect(mapX(bay.x) - 3, mapY(bay.y) - 3, 6, 6);
  }
  // Stunt ramps: orange triangles on the open road.
  ctx.fillStyle = '#f39c12';
  for (const ramp of RAMPS) {
    const mx = mapX(ramp.x);
    const my = mapY(ramp.y);
    ctx.beginPath();
    ctx.moveTo(mx, my - 4);
    ctx.lineTo(mx + 4, my + 3);
    ctx.lineTo(mx - 4, my + 3);
    ctx.closePath();
    ctx.fill();
  }
  // Goons: red dots while the brawl's fight is running.
  if (game.goons) {
    ctx.fillStyle = '#d64545';
    for (const goon of game.goons) {
      if (goon.dead) continue;
      ctx.beginPath();
      ctx.arc(mapX(goon.x), mapY(goon.y), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Tokens not yet collected.
  ctx.fillStyle = PALETTE.gold;
  for (const t of game.tokens) {
    if (t.taken) continue;
    ctx.fillRect(mapX(t.x) - 1, mapY(t.y) - 1, 3, 3);
  }
  // Mission marker.
  if (target) {
    ctx.fillStyle = '#fff';
    const mx = mapX(target.x);
    const my = mapY(target.y);
    ctx.beginPath();
    ctx.moveTo(mx, my - 6);
    ctx.lineTo(mx + 5, my);
    ctx.lineTo(mx, my + 6);
    ctx.lineTo(mx - 5, my);
    ctx.closePath();
    ctx.fill();
  }
  // Cars, roadblocks and cops.
  ctx.fillStyle = 'rgba(230,230,230,0.8)';
  for (const car of cars) {
    if (car.driver === 'roadblock') continue;
    ctx.fillRect(mapX(car.x) - 1, mapY(car.y) - 1, 3, 3);
  }
  ctx.fillStyle = '#ff5d5d';
  for (const car of cars) {
    if (car.driver !== 'roadblock') continue;
    ctx.fillRect(mapX(car.x) - 2, mapY(car.y) - 2, 4, 4);
  }
  ctx.fillStyle = '#5aa0ff';
  for (const cop of cops) {
    if (cop.dead) continue;
    ctx.beginPath();
    ctx.arc(mapX(cop.x), mapY(cop.y), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police helicopter: a pulsing red ring when it is in the air.
  if (wanted.heli.active) {
    const hx = mapX(wanted.heli.x);
    const hy = mapY(wanted.heli.y);
    ctx.strokeStyle = '#ff5d5d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy, 5 + Math.sin(game.time * 6) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Player arrow.
  const px = mapX(game.player.x);
  const py = mapY(game.player.y);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(game.player.angle);
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // North label.
  ctx.fillStyle = PALETTE.muted;
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('N', 14, 14 + panelH + 30);
  ctx.fillText('PALMERA BAY', 28, 14 + panelH + 30);
  ctx.restore();
}
