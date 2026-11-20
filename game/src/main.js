// Palmera Bay — Sunset Run: the game itself.
// Boots the world, runs the loop, wires every system together. The player
// is one object whose position follows their car or bike while driving —
// the stale-position bug from the earlier build is fixed here by
// construction: every system reads G.player, and G.player is synced to the
// vehicle every frame.

import { WORLD, PLAYER, HEAT } from './config.js';
import { rngFrom, clamp } from './random.js';
import { buildCity, nearestRoadPoint, collideBuildings } from './city.js';
import { createWeather, updateWeather, forceStorm } from './weather.js';
import { SoundBank } from './audio.js';
import { createRadio, radioTick, switchStation, currentStation } from './radio.js';
import { makeCar, makeBike, spawnWorldVehicles, spawnTrafficCar, driveVehicle, damageVehicle, updateTrafficCar, nearestVehicle } from './vehicles.js';
import { makePerson, spawnCrowd, makeGoons, updatePeople, copsChase, spawnCop, nearestPerson } from './people.js';
import { garageAt, applyRepair, applyPaint } from './garage.js';
import { createStunts, rampNear, startJump, updateAir } from './stunts.js';
import { createWanted, addHeat, updateWanted, checkSpikeStrips } from './wanted.js';
import { createCombat, switchWeapon, cycleWeapon, giveWeapon, shoot, updateBullets, punch, spawnBurst, spawnPickups, pickupNear, currentWeapon } from './combat.js';
import { MISSIONS, createStory, currentMission, startMission, updateStory, missionObjective, createTaxi, offerFare, updateTaxi, tokenNear, tokensLeft } from './missions.js';
import { drawGame, daylight } from './render.js';
import { createInput, held, wasPressed, moveAxes, endFrame } from './input.js';
import { setupShot } from './shots.js';

const SAVE_KEY = 'palmera-bay-save-v1';

function newGame(seed = WORLD.seed) {
  const city = buildCity(seed);
  const rng = rngFrom(seed ^ 0x9e3779b9);
  const G = {
    seed,
    city,
    rng,
    time: 0,
    frame: 0,
    clock: 17.4, // golden hour
    cash: 120,
    rep: 0,
    mode: 'title',
    photo: false,
    shake: 0,
    view: { w: 1280, h: 720 },
    camera: { x: city.spawn.x, y: city.spawn.y },
    weather: createWeather(),
    stormForced: false,
    radio: createRadio(),
    sound: new SoundBank(),
    wanted: createWanted(),
    combat: createCombat(),
    story: createStory(),
    taxi: createTaxi(),
    stunts: createStunts(),
    missions: MISSIONS,
    vehicles: [],
    people: [],
    goons: [],
    pickups: spawnPickups(city),
    toasts: [],
    missionTarget: null,
    objective: '',
    speedMph: 0,
    saveT: 0,
    shot: null,
  };
  G.player = {
    x: city.spawn.x,
    y: city.spawn.y,
    angle: 0,
    health: PLAYER.maxHealth,
    vehicle: null,
    punchAnim: 0,
  };
  G.vehicles = spawnWorldVehicles(city, rng);
  G.people = spawnCrowd(city, rng);
  return G;
}

export function spawnGoonsInto(G) {
  const goons = makeGoons(G.city);
  G.goons = goons;
  for (const g of goons) G.people.push(g);
}

function toast(G, text, life = 3) {
  G.toasts.push({ text, life });
  if (G.toasts.length > 4) G.toasts.shift();
}

function saveGame(G) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: G.cash,
      rep: G.rep,
      done: G.story.done,
      index: G.story.index,
      tokens: G.city.tokens.filter((t) => t.taken).map((t) => t.id),
      best: G.stunts.best,
      clock: G.clock,
    }));
  } catch { /* private mode or no storage: play on without saving */ }
}

function loadGame(G) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.cash === 'number') G.cash = s.cash;
    if (typeof s.rep === 'number') G.rep = s.rep;
    if (Array.isArray(s.done)) s.done.forEach((d, i) => { if (d) G.story.done[i] = true; });
    if (typeof s.index === 'number') G.story.index = s.index;
    if (Array.isArray(s.tokens)) {
      for (const id of s.tokens) {
        const t = G.city.tokens.find((tk) => tk.id === id);
        if (t) t.taken = true;
      }
    }
    if (typeof s.best === 'number') G.stunts.best = s.best;
    if (typeof s.clock === 'number') G.clock = s.clock;
  } catch { /* corrupt save: start fresh */ }
}

// Where the minimap arrow and the HUD point right now.
function computeMissionTarget(G) {
  const story = G.story;
  if (G.taxi.fare) return { x: G.taxi.fare.x, y: G.taxi.fare.y };
  if (!story.active) {
    const m = currentMission(story);
    return m ? { x: G.city.spawn.x, y: G.city.spawn.y } : null;
  }
  const m = currentMission(story);
  const step = m.steps[story.step];
  if (!step) return null;
  if (step.type === 'race') {
    const cp = step.points[story.raceCp];
    return cp ? { x: cp[0], y: cp[1] } : null;
  }
  if (step.type === 'defeat') return { x: G.city.stadium.x + 210, y: G.city.stadium.y + 130 };
  if (step.x !== undefined) return { x: step.x, y: step.y };
  return null;
}

function enterVehicle(G, v) {
  const p = G.player;
  p.vehicle = v;
  v.driver = 'player';
  v.speed = 0;
  if (v.wasParked || v.driver === 'traffic') addHeat(G.wanted, HEAT.stealCar);
  toast(G, v.kind === 'bike' ? 'Bike stolen — the PD noticed.' : 'Car stolen — the PD noticed.');
  G.sound.resume();
}

function exitVehicle(G) {
  const p = G.player;
  const v = p.vehicle;
  if (!v) return;
  v.driver = 'parked';
  v.speed = 0;
  const side = 34;
  p.x = v.x + Math.cos(v.angle + Math.PI / 2) * side;
  p.y = v.y + Math.sin(v.angle + Math.PI / 2) * side;
  p.angle = v.angle;
  p.vehicle = null;
}

function hurtPlayer(G, dmg) {
  const p = G.player;
  p.health -= dmg;
  G.shake = Math.max(G.shake, 6);
  if (p.health <= 0) {
    p.health = 0;
    G.mode = 'wasted';
    G.sound.engine(0, false);
    G.sound.siren(false);
  }
}

function processBulletEvents(G, events) {
  for (const e of events) {
    if (e.type === 'hit-wall') {
      spawnBurst(G.combat, e.x, e.y, '#c9c9c9', 4);
    } else if (e.type === 'hit-vehicle') {
      damageVehicle(e.vehicle, e.damage);
      spawnBurst(G.combat, e.x, e.y, '#ffd94f', 6);
      G.sound.hit();
      if (e.vehicle.police) addHeat(G.wanted, 30);
    } else if (e.type === 'hit-person') {
      const person = e.person;
      spawnBurst(G.combat, e.x, e.y, '#e83d3d', 6);
      G.sound.hit();
      if (person.kind === 'goon') {
        // Goons take three hits; no heat, no cash for dropping one.
        person.hp -= 1;
        if (person.hp <= 0) {
          person.state = 'down';
          G.story.goonsDown++;
          toast(G, `Goon down — ${G.story.goonsDown}/4.`);
        }
      } else if (person.kind === 'cop') {
        person.hp -= 1;
        if (person.hp <= 0) {
          person.state = 'down';
          addHeat(G.wanted, HEAT.killCop);
          toast(G, 'Cop down — the heat is on you now.');
        }
      } else {
        person.state = 'down';
        addHeat(G.wanted, HEAT.killPed);
        toast(G, 'Pedestrian down. The city saw that.');
      }
    }
  }
}

function processPunchHits(G, hits) {
  for (const h of hits) {
    if (h.type === 'person') {
      const person = h.target;
      if (person.kind === 'goon') {
        person.hp -= 1;
        if (person.hp <= 0) {
          person.state = 'down';
          G.story.goonsDown++;
          toast(G, `Goon down — ${G.story.goonsDown}/4.`);
        } else {
          person.state = 'chase';
          person.target = G.player;
        }
      } else if (person.kind === 'cop') {
        person.state = 'down';
        addHeat(G.wanted, HEAT.killCop);
      } else {
        person.state = 'down';
        addHeat(G.wanted, HEAT.hitPed);
        person.panic = 2;
      }
      G.sound.punch();
    } else if (h.type === 'vehicle') {
      damageVehicle(h.target, 12);
      G.sound.punch();
    }
  }
}

function updatePlayer(G, input, dt) {
  const p = G.player;
  const axes = moveAxes(input);
  if (p.vehicle) {
    const v = p.vehicle;
    const handbrake = held(input, 'Space');
    driveVehicle(v, { up: axes.y < 0, down: axes.y > 0, left: axes.x < 0, right: axes.x > 0 }, dt, G.city, G.weather, handbrake);
    // The player's position follows the car or bike — every system reads it.
    p.x = v.x;
    p.y = v.y;
    p.angle = v.angle;
    G.speedMph = Math.abs(v.speed) * 0.18;
    G.sound.engine(Math.abs(v.speed) / 600, true, v.kind === 'bike');
    // Ramps.
    const ramp = rampNear(G.city, v.x, v.y);
    if (ramp && !G.stunts.air) startJump(G.stunts, ramp, v);
    if (G.stunts.air) {
      const landed = updateAir(G.stunts, v, dt);
      if (landed) {
        G.cash += landed.payout;
        toast(G, landed.isBest ? `NEW BEST JUMP! +$${landed.payout}` : `Jump +$${landed.payout}`);
        G.sound.coin();
      }
    }
    // Spike strips pop tyres.
    if (checkSpikeStrips(G.wanted, v)) {
      toast(G, 'Spike strip! Tyres gone — find a garage (G).');
      G.sound.crash();
    }
    // Exiting.
    if (wasPressed(input, 'KeyE')) exitVehicle(G);
  } else {
    G.speedMph = 0;
    G.sound.engine(0, false);
    const moving = axes.x !== 0 || axes.y !== 0;
    const speed = moving ? PLAYER.walkSpeed : 0;
    if (moving) {
      const len = Math.hypot(axes.x, axes.y);
      p.x += (axes.x / len) * speed * dt;
      p.y += (axes.y / len) * speed * dt;
      p.angle = Math.atan2(axes.y, axes.x);
      p.x = clamp(p.x, 30, WORLD.w - 30);
      p.y = clamp(p.y, 30, WORLD.h - 30);
      const probe = { x: p.x, y: p.y };
      // Buildings push the player out; water is a wall.
      collideBuildings(G.city, probe, PLAYER.radius);
      p.x = probe.x;
      p.y = probe.y;
      if (p.x > 3330) p.x = 3330;
    }
    // Aim at the mouse.
    const mx = G.camera.x + (input.mouse.x - G.view.w / 2);
    const my = G.camera.y + (input.mouse.y - G.view.h / 2);
    p.angle = Math.atan2(my - p.y, mx - p.x);
    // Punch.
    if (wasPressed(input, 'KeyF')) {
      const hits = punch(G.combat, p.x, p.y, p.angle, G.people, G.vehicles);
      processPunchHits(G, hits);
    }
    // Shoot.
    if (input.mouse.down) {
      if (shoot(G.combat, p.x, p.y, p.angle)) {
        G.sound.shot(currentWeapon(G.combat).name === 'Boomstick' ? 'boomstick' : G.combat.weapon);
        addHeat(G.wanted, 2);
      }
    }
    // Enter a car or bike.
    if (wasPressed(input, 'KeyE')) {
      const v = nearestVehicle(G.vehicles, p.x, p.y, 64);
      if (v && !v.wreck) enterVehicle(G, v);
    }
  }
  // Garage: repair + repaint, or paint only when already perfect.
  if (wasPressed(input, 'KeyG') && p.vehicle) {
    const g = garageAt(G.city, p.x, p.y);
    if (g) {
      const v = p.vehicle;
      let res;
      if (v.health < 100 || v.tyres < 4) res = applyRepair(G, v, true);
      else res = applyPaint(G, v);
      toast(G, res.message);
      if (res.ok) { G.sound.coin(); saveGame(G); }
    } else {
      toast(G, 'No garage here — look for the green ring.');
    }
  }
}

function updateWorld(G, input, dt) {
  // Clock: a full day takes four minutes of play.
  G.clock = (G.clock + dt * 0.1) % 24;
  updateWeather(G.weather, dt, G.rng);
  if (G.weather.thunderDue) {
    G.weather.thunderDue = false;
    G.sound.thunder();
  }
  updatePlayer(G, input, dt);
  // Traffic.
  for (const v of G.vehicles) {
    if (v.driver === 'traffic') updateTrafficCar(v, dt, G.city, G.vehicles, G.rng);
  }
  // Wanted system + its events.
  updateWanted(G.wanted, dt, G.city, G.player, G.vehicles, G.people, G.rng, (e) => {
    if (e.type === 'rammed') {
      const v = G.player.vehicle;
      if (v) {
        damageVehicle(v, 8);
        hurtPlayer(G, 4);
        G.sound.crash();
      }
    } else if (e.type === 'arrested') {
      G.mode = 'busted';
      G.sound.engine(0, false);
      G.sound.siren(false);
    }
  });
  G.sound.siren(G.wanted.stars >= 1);
  // People.
  const danger = G.combat.bullets.length ? { x: G.player.x, y: G.player.y, radius: 320 } : null;
  updatePeople(G.people, dt, G.city, G.player, danger, G.rng);
  copsChase(G.people, G.player, G.wanted.stars);
  // Goons chase the player during the brawl.
  for (const g of G.goons) {
    if (g.state !== 'down' && G.story.active) {
      const m = currentMission(G.story);
      if (m && m.id === 'bayfront-brawl') {
        const d = Math.hypot(G.player.x - g.x, G.player.y - g.y);
        if (d < 700) { g.state = 'chase'; g.target = G.player; }
      }
    }
  }
  // Bullets.
  const events = updateBullets(G.combat, dt, G.city, G.vehicles, G.people);
  processBulletEvents(G, events);
  // Pickups, stashes, tokens.
  const pk = pickupNear(G.pickups, G.player.x, G.player.y);
  if (pk) {
    pk.taken = true;
    if (pk.kind === 'health') G.player.health = Math.min(100, G.player.health + 40);
    else if (pk.kind === 'ammo') { G.combat.ammo.smg += 60; G.combat.ammo.boomstick += 12; }
    else G.cash += 40;
    G.sound.coin();
  }
  const stash = G.city.stashes.find((s) => !s.taken && Math.hypot(s.x - G.player.x, s.y - G.player.y) < 34);
  if (stash) {
    stash.taken = true;
    giveWeapon(G.combat, stash.kind, stash.kind === 'smg' ? 240 : 36);
    toast(G, stash.kind === 'smg' ? 'Spray Gun picked up!' : 'Boomstick picked up!');
    G.sound.coin();
  }
  const token = tokenNear(G.city, G.player.x, G.player.y);
  if (token) {
    token.taken = true;
    G.cash += 50;
    toast(G, `Sunset token! ${tokensLeft(G.city)} left — +$50.`);
    G.sound.coin();
    saveGame(G);
  }
  // Taxi fares.
  offerFare(G.taxi, G, G.rng);
  const fare = updateTaxi(G.taxi, G, dt);
  if (fare && fare.type === 'fare') {
    toast(G, `Fare complete — +$${fare.pay}.`);
    G.sound.coin();
  }
  // Radio.
  const note = radioTick(G.radio, dt, !!G.player.vehicle);
  if (note) G.sound.radioNote(note);
  // Story.
  const ev = updateStory(G.story, G, dt);
  if (ev) {
    if (ev.type === 'complete') {
      toast(G, `${ev.mission.name} complete — +$${ev.mission.pay}!`);
      G.sound.jingle('mission');
      saveGame(G);
      if (ev.finished) {
        G.mode = 'complete';
        G.sound.engine(0, false);
        G.sound.siren(false);
      }
    } else if (ev.type === 'failed') {
      toast(G, `Mission failed: ${ev.reason} — press R to retry.`);
    } else if (ev.type === 'step' && ev.checkpoint) {
      toast(G, `Checkpoint ${ev.checkpoint}!`);
      G.sound.coin();
    }
  }
  // Camera follows the player.
  const camTarget = { x: G.player.x, y: G.player.y };
  G.camera.x += (camTarget.x - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (camTarget.y - G.camera.y) * Math.min(1, dt * 5);
  G.missionTarget = computeMissionTarget(G);
  G.objective = missionObjective(G.story);
  // Toasts age.
  for (let i = G.toasts.length - 1; i >= 0; i--) {
    G.toasts[i].life -= dt;
    if (G.toasts[i].life <= 0) G.toasts.splice(i, 1);
  }
  G.shake = Math.max(0, G.shake - dt * 30);
  // Autosave now and then.
  G.saveT += dt;
  if (G.saveT > 20) { G.saveT = 0; saveGame(G); }
}

function updateKeys(G, input) {
  if (wasPressed(input, 'KeyM')) {
    G.sound.setMuted(!G.sound.muted);
    toast(G, G.sound.muted ? 'Muted.' : 'Sound on.');
  }
  if (wasPressed(input, 'KeyC')) {
    const st = switchStation(G.radio);
    toast(G, `♪ ${st.name} — ${st.tag}`);
  }
  if (wasPressed(input, 'KeyP')) {
    G.photo = !G.photo;
    toast(G, G.photo ? 'Photo mode — HUD hidden.' : 'Photo mode off.');
  }
  if (wasPressed(input, 'Digit1')) switchWeapon(G.combat, 'pistol');
  if (wasPressed(input, 'Digit2')) switchWeapon(G.combat, 'smg');
  if (wasPressed(input, 'Digit3')) switchWeapon(G.combat, 'boomstick');
  if (input.wheel !== 0) cycleWeapon(G.combat, input.wheel > 0 ? 1 : -1);
  if (wasPressed(input, 'KeyN')) {
    if (!G.story.active) {
      if (startMission(G.story, G)) {
        const m = currentMission(G.story);
        toast(G, `${m.name}: ${m.brief}`);
        G.sound.resume();
      }
    }
  }
  if (wasPressed(input, 'KeyR') && G.story.active) {
    const m = currentMission(G.story);
    G.story.active = false;
    G.story.failed = null;
    startMission(G.story, G);
    toast(G, `${m.name} restarted.`);
  }
}

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const seedParam = Number(params.get('seed') || WORLD.seed);
  const G = newGame(Number.isFinite(seedParam) ? seedParam : WORLD.seed);
  G.spawnGoons = () => spawnGoonsInto(G);
  loadGame(G);
  const input = createInput(canvas);

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    G.view.w = canvas.width;
    G.view.h = canvas.height;
  }
  window.addEventListener('resize', resize);
  resize();

  // Screenshot scenes (?shot=chase|play|race|title) stage a fixed moment.
  const shotName = params.get('shot');
  if (shotName) {
    G.shot = shotName;
    setupShot(G, shotName);
  }

  let last = performance.now();
  let shotFrames = 0;
  function frame(now) {
    // Fixed steps in shot mode so a staged scene renders identically twice.
    const dt = G.shot ? 1 / 60 : Math.min(0.05, (now - last) / 1000);
    last = now;
    // In shot mode the world is frozen: the staged scene renders exactly
    // the same pixels on every take, whatever the frame count.
    if (!G.shot) {
      G.time += dt;
      G.frame++;
    }
    if (G.mode === 'title') {
      if (wasPressed(input, 'Enter') || input.clicked) {
        G.mode = 'play';
        G.sound.resume();
      }
      // Slow drift over the city behind the title.
      G.camera.x = G.city.spawn.x + Math.sin(G.time * 0.05) * 200;
      G.camera.y = G.city.spawn.y + Math.cos(G.time * 0.04) * 120;
      G.objective = missionObjective(G.story);
      G.missionTarget = computeMissionTarget(G);
    } else if (G.mode === 'play') {
      if (wasPressed(input, 'Escape')) {
        G.mode = 'pause';
      } else if (!G.shot) {
        updateKeys(G, input);
        updateWorld(G, input, dt);
      }
    } else if (G.mode === 'pause') {
      if (wasPressed(input, 'Escape') || wasPressed(input, 'Enter')) G.mode = 'play';
      updateKeys(G, input);
    } else if (G.mode === 'wasted' || G.mode === 'busted' || G.mode === 'complete') {
      if (wasPressed(input, 'Enter') || input.clicked) {
        const keep = { cash: G.cash, rep: G.rep };
        const fresh = newGame(G.seed);
        fresh.cash = keep.cash;
        fresh.rep = keep.rep;
        Object.assign(G, fresh);
        G.spawnGoons = () => spawnGoonsInto(G);
        G.mode = 'play';
      }
    }
    ctx.save();
    if (G.shake > 0) {
      ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    }
    drawGame(ctx, G);
    ctx.restore();
    endFrame(input);
    if (G.shot) {
      shotFrames++;
      if (shotFrames >= 4) window.__shotReady = true;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
