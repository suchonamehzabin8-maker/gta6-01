// Palmera Bay — Sunset Run: the game loop. Builds the world, wires every
// system together, and runs the frame: input → update → render. The player's
// position always follows the car or bike they are driving, so missions,
// tokens and chases all read one true position.
import { createCity, circleHitsBuilding } from './city.js';
import { createWeather, updateWeather } from './weather.js';
import { createAudio } from './audio.js';
import { createRadio } from './radio.js';
import { createInput } from './input.js';
import {
  makeVehicle, spawnParkedCars, spawnTrafficCar, driveVehicle,
  updateTraffic, nearestVehicle,
} from './vehicles.js';
import {
  spawnPeds, spawnJoggers, spawnGoons, updatePeople,
  spawnFootCops, updateFootCops,
} from './people.js';
import {
  createCombat, fireWeapon, punch, switchWeapon, updateCombat,
  spawnStashPickups,
} from './combat.js';
import { createWanted, updateWanted, addHeat, starsForHeat } from './wanted.js';
import {
  MISSIONS, createMissions, startMission, updateMission,
  offerFare, startFare, updateFare, updateTokens,
  saveProgress, loadProgress, failMission,
} from './missions.js';
import { garageInRange, useGarage } from './garage.js';
import { createStunts, updateStunts } from './stunts.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { SEED, PLAYER, WORLD, CLOCK, HEAT, SHOTS } from './config.js';
import { makeRng, clamp, dist } from './random.js';

export function createGame(canvas) {
  const rng = makeRng(SEED);
  const city = createCity(SEED);
  const audio = createAudio();
  const radio = createRadio(audio);
  const G = {
    time: 0,
    clock: CLOCK.start,
    mode: 'title',
    photo: false,
    seed: SEED,
    rng,
    city,
    weather: createWeather(),
    audio,
    radio,
    input: createInput(canvas),
    camera: { x: city.spawn.x, y: city.spawn.y },
    player: {
      x: city.spawn.x, y: city.spawn.y,
      angle: -Math.PI / 2, aimAngle: 0,
      hp: PLAYER.maxHp, cash: 0, rep: 0,
      onFoot: true, vehicle: null,
    },
    vehicles: spawnParkedCars(city, rng, 26),
    traffic: [],
    peds: [],
    cops: [],
    wanted: createWanted(),
    missions: createMissions(),
    combat: createCombat(),
    stats: { bestAir: 0, bestDist: 0 },
    messages: [],
    garageNear: null,
    missionDefs: MISSIONS,
    shot: null,
  };
  G.peds = [...spawnPeds(city, rng, 34), ...spawnJoggers(city, rng), ...spawnGoons(city, rng)];
  G.cops = spawnFootCops(city, rng, 4);
  for (let i = 0; i < 12; i++) G.traffic.push(spawnTrafficCar(city, rng, G.weather));
  spawnStashPickups(G);
  loadProgress(G);
  return G;
}

function playerScreenPos(G) {
  const p = G.player;
  return {
    x: p.x - (G.camera.x - 640),
    y: p.y - (G.camera.y - 360),
  };
}

function tryEnterVehicle(G) {
  const p = G.player;
  if (p.onFoot) {
    const v = nearestVehicle(G.vehicles, p.x, p.y, 62);
    if (v) {
      p.vehicle = v;
      p.onFoot = false;
      v.parked = false;
      v.traffic = false;
      if (v.kind === 'bike') G.messages.push({ text: 'Bike stolen!', t: 1.6, color: '#ffd166' });
      else G.messages.push({ text: 'Car stolen!', t: 1.6, color: '#ffd166' });
      addHeat(G, HEAT.stealCar);
      G.audio.horn();
      return;
    }
    // Or accept a taxi fare.
    startFare(G);
  } else if (p.vehicle) {
    const v = p.vehicle;
    p.vehicle = null;
    p.onFoot = true;
    p.x = clamp(v.x + Math.cos(v.angle + Math.PI / 2) * 26, 24, WORLD.w - 24);
    p.y = clamp(v.y + Math.sin(v.angle + Math.PI / 2) * 26, 24, WORLD.h - 24);
    v.speed = 0;
  }
}

function moveOnFoot(G, dt) {
  const p = G.player;
  const input = G.input;
  const fx = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0)
    - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0);
  const fy = (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0)
    - (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0);
  if (fx === 0 && fy === 0) return;
  const len = Math.hypot(fx, fy);
  const running = input.down('ShiftLeft') || input.down('ShiftRight');
  const speed = (running ? PLAYER.runSpeed : PLAYER.walkSpeed) * dt;
  const nx = p.x + (fx / len) * speed;
  const ny = p.y + (fy / len) * speed;
  if (!circleHitsBuilding(G.city, nx, p.y, PLAYER.radius) && ny < 2490) p.x = nx;
  if (!circleHitsBuilding(G.city, p.x, ny, PLAYER.radius) && ny < 2490) p.y = ny;
  p.x = clamp(p.x, 24, WORLD.w - 24);
  p.y = clamp(p.y, 24, 2490);
  p.angle = Math.atan2(fy, fx);
}

function update(G, dt) {
  const p = G.player;
  const input = G.input;

  // Aim follows the mouse, from the player's screen position.
  const sp = playerScreenPos(G);
  p.aimAngle = Math.atan2(input.mouse.y - sp.y, input.mouse.x - sp.x);

  // One-shot keys.
  if (input.hit('KeyM')) G.audio.toggleMute();
  if (input.hit('KeyP')) { G.photo = !G.photo; }
  if (input.hit('KeyC')) {
    const name = G.radio.switch();
    G.messages.push({ text: `♪ ${name}`, t: 1.4, color: '#ffd166' });
  }
  if (input.hit('Escape')) {
    if (G.mode === 'playing') { G.mode = 'paused'; saveProgress(G); }
    else if (G.mode === 'paused') G.mode = 'playing';
  }
  if (input.hit('KeyN')) {
    if (G.mode === 'title') { G.mode = 'playing'; G.audio.unlock(); }
    if (G.mode === 'playing' && G.missions.active < 0 && G.missions.next < MISSIONS.length) {
      startMission(G, G.missions.next);
    } else if (G.mode === 'complete') {
      G.mode = 'playing';
    }
  }
  if (input.hit('KeyR')) {
    if (G.mode === 'wasted' || G.mode === 'busted') {
      p.hp = PLAYER.maxHp;
      p.x = G.city.spawn.x; p.y = G.city.spawn.y;
      p.onFoot = true; p.vehicle = null;
      G.wanted.heat = 0;
      G.mode = 'playing';
    } else if (G.missions.active >= 0) {
      failMission(G, 'Restarted');
    }
  }
  if (G.mode !== 'playing') {
    // Menus: the city keeps living behind them, but nothing can be played.
    G.time += dt;
    G.clock = (G.clock + dt * (24 / CLOCK.dayLength)) % 24;
    updateWeather(G.weather, dt, G.rng, G.camera);
    updateTraffic(G, dt);
    updatePeople(G, dt);
    G.audio.setEngine(false);
    input.endFrame();
    return;
  }
  if (input.hit('KeyE')) tryEnterVehicle(G);
  if (input.hit('KeyF')) punch(G);
  if (input.hit('Digit1')) { G.combat.weapon = 'pistol'; }
  if (input.hit('Digit2') && G.combat.ammo.smg > 0) { G.combat.weapon = 'smg'; }
  if (input.hit('Digit3') && G.combat.ammo.shotgun > 0) { G.combat.weapon = 'shotgun'; }
  if (input.mouse.wheel !== 0) switchWeapon(G, input.mouse.wheel > 0 ? 1 : -1);
  if (input.hit('KeyG') && p.vehicle) {
    useGarage(G, input.down('ShiftLeft') || input.down('ShiftRight'));
  }
  if (input.mouse.down) fireWeapon(G);

  // Movement.
  if (p.vehicle) {
    if (p.vehicle.wreck) {
      // A wrecked car spits its driver out.
      p.vehicle = null;
      p.onFoot = true;
    } else {
      driveVehicle(G, p.vehicle, dt, {
        forward: input.down('KeyW') || input.down('ArrowUp'),
        back: input.down('KeyS') || input.down('ArrowDown'),
        left: input.down('KeyA') || input.down('ArrowLeft'),
        right: input.down('KeyD') || input.down('ArrowRight'),
        handbrake: input.down('Space'),
      });
      p.x = p.vehicle.x;
      p.y = p.vehicle.y;
      p.angle = p.vehicle.angle;
    }
  } else {
    moveOnFoot(G, dt);
  }

  // The world ticks.
  G.time += dt;
  G.clock = (G.clock + dt * (24 / CLOCK.dayLength)) % 24;
  updateWeather(G.weather, dt, G.rng, G.camera);
  updateTraffic(G, dt);
  updatePeople(G, dt);
  updateFootCops(G, dt);
  updateWanted(G, dt);
  updateCombat(G, dt);
  updateMission(G, dt);
  updateFare(G, dt);
  updateTokens(G);
  updateStunts(G, dt);
  offerFare(G);
  G.garageNear = garageInRange(G);

  // Toasts age out.
  for (const m of G.messages) m.t -= dt;
  G.messages = G.messages.filter(m => m.t > 0);

  // The radio and the engine hum follow the game, not the menus.
  G.radio.playing = G.mode === 'playing';
  G.radio.update(G.time);
  if (p.vehicle && G.mode === 'playing') {
    G.audio.setEngine(true, Math.abs(p.vehicle.speed) / 700, p.vehicle.kind === 'bike');
  } else {
    G.audio.setEngine(false);
  }
  G.audio.setRain(G.weather.intensity > 0.05, G.weather.intensity);
  if (G.weather.thunderAt > 0 && G.weather.phaseT >= G.weather.thunderAt) {
    G.audio.thunder();
    G.weather.thunderAt = -1;
  }

  // Wasted ends the run until R.
  if (p.hp <= 0 && G.mode === 'playing') {
    G.mode = 'wasted';
    G.audio.badJingle();
    saveProgress(G);
  }
  input.endFrame();
}

function frame(G, ctx, t) {
  const dt = Math.min(0.05, (t - frame.last) / 1000 || 0.016);
  frame.last = t;
  if (G.mode !== 'paused') update(G, dt);
  render(G, ctx);
  requestAnimationFrame(next => frame(G, ctx, next));
}

export function start(canvas) {
  const ctx = canvas.getContext('2d');
  const G = createGame(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot && SHOTS.includes(shot)) {
    // Deterministic screenshot mode: stage the scene, render one frozen
    // frame, and say so. The world does not advance.
    G.shot = shot;
    stageShot(G, shot);
    render(G, ctx);
    window.__shotReady = true;
    return G;
  }
  window.__game = G;
  requestAnimationFrame(t => { frame.last = t; frame(G, ctx, t); });
  return G;
}

if (typeof document !== 'undefined') {
  const canvas = document.getElementById('game');
  if (canvas) start(canvas);
}
