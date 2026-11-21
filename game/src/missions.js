// The story — twelve missions as Mara Vega, plus taxi fares and the twelve
// hidden sunset tokens. A mission is a list of steps; each step type is a
// small state machine in updateMission, so a new mission is data, not code.
import { dist, clamp } from './random.js';
import { PRICES } from './config.js';
import { forceStorm } from './weather.js';

// Coordinates are the landmarks the city fixes: motel, bank, safehouse,
// pier, marina, stadium, docks, airfield, boardwalk.
export const MISSIONS = [
  {
    id: 'first-wheels', name: 'First Wheels', pay: 250, rep: 10,
    brief: 'Steal a car and bring it to the Flamingo Motel.',
    steps: [
      { type: 'steal', label: 'Steal a car (E near one)' },
      { type: 'reachCar', x: 670, y: 2110, r: 70, label: 'Drive to the Flamingo Motel' },
    ],
  },
  {
    id: 'the-drop', name: 'The Drop', pay: 300, rep: 12,
    brief: 'On foot: carry the package to the end of the pier.',
    steps: [
      { type: 'reach', x: 1845, y: 2560, r: 45, label: 'Reach the end of the pier' },
    ],
  },
  {
    id: 'shakedown', name: 'Shakedown', pay: 400, rep: 15,
    brief: 'Collect from three shops on the boardwalk.',
    steps: [
      { type: 'reach', x: 800, y: 2290, r: 55, label: 'Collect from the taco stand' },
      { type: 'reach', x: 1400, y: 2290, r: 55, label: 'Collect from the ice cream cart' },
      { type: 'reach', x: 2200, y: 2290, r: 55, label: 'Collect from the shades stall' },
    ],
  },
  {
    id: 'getaway', name: 'Getaway', pay: 450, rep: 15,
    brief: 'Lose the heat, then reach the safehouse.',
    steps: [
      { type: 'reach', x: 3300, y: 2100, r: 70, label: 'Reach the safehouse' },
    ],
  },
  {
    id: 'grand-prix', name: 'Sunset Grand Prix', pay: 600, rep: 20,
    brief: 'Nine checkpoints down the beach road and through downtown.',
    steps: [
      { type: 'race', label: 'Race the checkpoints' },
    ],
  },
  {
    id: 'the-big-one', name: 'The Big One', pay: 800, rep: 25,
    brief: 'Hit the bank, then get clear before the timer runs out.',
    steps: [
      { type: 'reach', x: 1700, y: 1000, r: 60, label: 'Reach the bank' },
      { type: 'timedReach', x: 3300, y: 2100, r: 70, seconds: 75, label: 'Reach the safehouse in time' },
    ],
  },
  {
    id: 'marina-heist', name: 'Marina Heist', pay: 700, rep: 22,
    brief: 'Grab three crates at the marina and deliver them to the docks.',
    steps: [
      { type: 'collect', kind: 'crate', count: 3, area: { x: 3200, y: 2000, r: 200 }, label: 'Collect 3 crates at the marina' },
      { type: 'reach', x: 340, y: 1780, r: 70, label: 'Deliver to the Old Docks' },
    ],
  },
  {
    id: 'sunset-showdown', name: 'Sunset Showdown', pay: 900, rep: 30,
    brief: 'Five stars. Survive sixty seconds, then reach the safehouse.',
    steps: [
      { type: 'survive', seconds: 60, label: 'Survive the heat — 60s' },
      { type: 'reach', x: 3300, y: 2100, r: 70, label: 'Reach the safehouse' },
    ],
  },
  {
    id: 'the-long-con', name: 'The Long Con', pay: 750, rep: 25,
    brief: 'Three drops, one hour on the clock. Keep moving.',
    steps: [
      { type: 'timedReach', x: 1100, y: 650, r: 60, seconds: 90, label: 'Drop 1: downtown north' },
      { type: 'timedReach', x: 2700, y: 1450, r: 60, seconds: 90, label: 'Drop 2: east side' },
      { type: 'timedReach', x: 700, y: 1850, r: 60, seconds: 90, label: 'Drop 3: park side' },
    ],
  },
  {
    id: 'storm-runner', name: 'Storm Runner', pay: 850, rep: 28,
    brief: 'A bay storm is rolling in. Run the deliveries through it.',
    steps: [
      { type: 'timedReach', x: 3100, y: 2250, r: 60, seconds: 80, label: 'Deliver to the east beach' },
      { type: 'timedReach', x: 500, y: 2250, r: 60, seconds: 80, label: 'Deliver to the west beach' },
    ],
  },
  {
    id: 'bayfront-brawl', name: 'Bayfront Brawl', pay: 800, rep: 28,
    brief: 'Four Syndicate goons at the stadium. Fists and the boomstick.',
    steps: [
      { type: 'defeat', count: 4, area: { x: 2460, y: 610, r: 320 }, label: 'Defeat the four goons' },
    ],
  },
  {
    id: 'midnight-courier', name: 'Midnight Courier', pay: 1000, rep: 35,
    brief: 'Three stops after dark, against the clock.',
    steps: [
      { type: 'timedReach', x: 1500, y: 250, r: 60, seconds: 75, label: 'Stop 1: north road' },
      { type: 'timedReach', x: 3400, y: 1050, r: 60, seconds: 75, label: 'Stop 2: lighthouse road' },
      { type: 'timedReach', x: 900, y: 2250, r: 60, seconds: 75, label: 'Stop 3: motel road' },
    ],
  },
];

export function createMissions() {
  return {
    next: 0, // index of the next mission to offer
    active: -1, // index of the running mission, -1 when none
    step: 0,
    stepT: 0,
    timer: 0,
    raceCp: 0,
    collected: 0,
    crates: [],
    done: [],
    fare: null, // {pickup:{x,y}, dropoff:{x,y}, timer, active}
  };
}

export function missionObjective(G) {
  const m = G.missions;
  if (m.active < 0) {
    if (m.next >= MISSIONS.length) return 'Story complete — free roam!';
    return `Press N: ${MISSIONS[m.next].name}`;
  }
  const def = MISSIONS[m.active];
  const step = def.steps[m.step];
  if (!step) return def.name;
  let label = step.label;
  if (step.type === 'race') label += ` (${m.raceCp + 1}/9)`;
  if (step.type === 'collect') label += ` (${m.collected}/${step.count})`;
  if (step.type === 'defeat') {
    const left = G.peds.filter(pd => pd.kind === 'goon' && pd.hp > 0).length;
    label += ` (${step.count - left}/${step.count})`;
  }
  if (step.type === 'survive') label += ` (${Math.ceil(m.timer)}s)`;
  if (step.type === 'timedReach') label += ` (${Math.ceil(m.timer)}s)`;
  return `${def.name}: ${label}`;
}

export function startMission(G, idx) {
  const m = G.missions;
  const def = MISSIONS[idx];
  if (!def || m.active >= 0) return false;
  m.active = idx;
  m.step = 0;
  m.stepT = 0;
  m.timer = 0;
  m.raceCp = 0;
  m.collected = 0;
  m.crates = [];
  const p = G.player;
  if (def.id === 'storm-runner') forceStorm(G.weather);
  if (def.id === 'midnight-courier') G.clock = 23.2;
  if (def.id === 'sunset-showdown') G.wanted.heat = 105;
  if (def.id === 'getaway') G.wanted.heat = Math.max(G.wanted.heat, 40);
  if (def.id === 'marina-heist') {
    m.crates = [
      { x: 3100, y: 1930, got: false },
      { x: 3280, y: 2050, got: false },
      { x: 3180, y: 2150, got: false },
    ];
  }
  if (def.id === 'bayfront-brawl') {
    // The goons are already waiting at the stadium.
  }
  G.messages.push({ text: `${def.name} — ${def.brief}`, t: 4, color: '#ffd166' });
  G.audio.jingle();
  armStepTimer(G);
  return true;
}

// Timed steps carry their countdown in m.timer, armed when the step starts.
function armStepTimer(G) {
  const m = G.missions;
  const def = MISSIONS[m.active];
  if (!def) return;
  const step = def.steps[m.step];
  m.timer = (step && (step.type === 'timedReach' || step.type === 'survive')) ? step.seconds : 0;
}

function completeStep(G) {
  const m = G.missions;
  const def = MISSIONS[m.active];
  m.step++;
  m.stepT = 0;
  if (m.step >= def.steps.length) completeMission(G);
  else {
    G.messages.push({ text: def.steps[m.step].label, t: 2.5, color: '#ffd166' });
    armStepTimer(G);
  }
}

function completeMission(G) {
  const m = G.missions;
  const def = MISSIONS[m.active];
  const p = G.player;
  p.cash += def.pay;
  p.rep += def.rep;
  m.done.push(def.id);
  m.next = Math.max(m.next, m.active + 1);
  m.active = -1;
  m.step = 0;
  G.messages.push({ text: `${def.name} complete! +$${def.pay}  +${def.rep} rep`, t: 4, color: '#7bc47f' });
  G.audio.cash();
  if (m.done.length >= MISSIONS.length) {
    G.mode = 'complete';
    G.audio.jingle();
  }
  saveProgress(G);
}

export function failMission(G, reason) {
  const m = G.missions;
  if (m.active < 0) return;
  G.messages.push({ text: `Mission failed: ${reason}`, t: 3, color: '#ff8a80' });
  G.audio.badJingle();
  m.active = -1;
  m.step = 0;
}

export function updateMission(G, dt) {
  const m = G.missions;
  const p = G.player;
  if (m.active < 0) return;
  const def = MISSIONS[m.active];
  const step = def.steps[m.step];
  if (!step) return;
  m.stepT += dt;
  const px = p.vehicle ? p.vehicle.x : p.x;
  const py = p.vehicle ? p.vehicle.y : p.y;

  switch (step.type) {
    case 'steal':
      if (p.vehicle) completeStep(G);
      break;
    case 'reach':
      if (dist(px, py, step.x, step.y) < step.r) completeStep(G);
      break;
    case 'reachCar':
      if (p.vehicle && dist(px, py, step.x, step.y) < step.r) completeStep(G);
      break;
    case 'timedReach': {
      m.timer -= dt;
      if (dist(px, py, step.x, step.y) < step.r) completeStep(G);
      else if (m.timer <= 0) failMission(G, 'Out of time');
      break;
    }
    case 'survive': {
      m.timer -= dt;
      if (m.timer <= 0) completeStep(G);
      break;
    }
    case 'race': {
      const cp = G.city.raceRoute[m.raceCp];
      if (cp && dist(px, py, cp.x, cp.y) < 70) {
        m.raceCp++;
        G.audio.pickup();
        if (m.raceCp >= G.city.raceRoute.length) completeStep(G);
      }
      break;
    }
    case 'collect': {
      for (const c of m.crates) {
        if (!c.got && dist(px, py, c.x, c.y) < 40) {
          c.got = true;
          m.collected++;
          G.audio.pickup();
        }
      }
      if (m.collected >= step.count) completeStep(G);
      break;
    }
    case 'defeat': {
      const left = G.peds.filter(pd => pd.kind === 'goon' && pd.hp > 0).length;
      if (left === 0) completeStep(G);
      break;
    }
  }
}

// --- Taxi fares ------------------------------------------------------------
export function offerFare(G) {
  // A nearby pedestrian hails a cab when the player is on foot.
  const p = G.player;
  if (!p.onFoot || G.missions.fare) return;
  const near = G.peds.find(pd => pd.kind === 'ped' && pd.hp > 0 && dist(p.x, p.y, pd.x, pd.y) < 60);
  if (near && G.rng.chance(0.02)) {
    near.taxi = true;
    G.messages.push({ text: 'A pedestrian wants a cab — press E nearby', t: 2.5, color: '#ffd166' });
  }
}

export function startFare(G) {
  const p = G.player;
  const near = G.peds.find(pd => pd.taxi && pd.hp > 0 && dist(p.x, p.y, pd.x, pd.y) < 70);
  if (!near || !p.vehicle) return false;
  const dest = G.city.raceRoute[G.rng.int(0, G.city.raceRoute.length - 1)];
  G.missions.fare = {
    dropoff: { x: dest.x, y: dest.y },
    timer: 90,
    passenger: near,
  };
  near.taxi = false;
  G.messages.push({ text: 'Fare accepted — drive to the marker', t: 2.5, color: '#ffd166' });
  return true;
}

export function updateFare(G, dt) {
  const f = G.missions.fare;
  if (!f) return;
  const p = G.player;
  f.timer -= dt;
  const px = p.vehicle ? p.vehicle.x : p.x;
  const py = p.vehicle ? p.vehicle.y : p.y;
  if (dist(px, py, f.dropoff.x, f.dropoff.y) < 60) {
    const pay = PRICES.taxiBase + G.rng.int(0, 60);
    p.cash += pay;
    G.messages.push({ text: `Fare complete! +$${pay}`, t: 2.5, color: '#7bc47f' });
    G.audio.cash();
    G.missions.fare = null;
  } else if (f.timer <= 0 || !p.vehicle) {
    G.messages.push({ text: 'Fare lost', t: 2, color: '#ff8a80' });
    G.missions.fare = null;
  }
}

// --- Sunset tokens ----------------------------------------------------------
export function updateTokens(G) {
  const p = G.player;
  const px = p.vehicle ? p.vehicle.x : p.x;
  const py = p.vehicle ? p.vehicle.y : p.y;
  for (const t of G.city.tokens) {
    if (!t.found && dist(px, py, t.x, t.y) < 34) {
      t.found = true;
      p.cash += PRICES.tokenBonus;
      G.messages.push({ text: `Sunset token! +$${PRICES.tokenBonus}`, t: 2.5, color: '#ffd166' });
      G.audio.jingle();
      saveProgress(G);
    }
  }
}

// --- Save / load ------------------------------------------------------------
const SAVE_KEY = 'palmera-bay-save-v1';

export function saveProgress(G) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: G.player.cash,
      rep: G.player.rep,
      done: G.missions.done,
      next: G.missions.next,
      tokens: G.city.tokens.filter(t => t.found).map(t => t.id),
      bestAir: G.stats.bestAir,
    }));
  } catch { /* storage full or blocked — the game plays on */ }
}

export function loadProgress(G) {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    G.player.cash = s.cash || 0;
    G.player.rep = s.rep || 0;
    G.missions.done = s.done || [];
    G.missions.next = s.next || 0;
    for (const id of s.tokens || []) {
      const t = G.city.tokens.find(tk => tk.id === id);
      if (t) t.found = true;
    }
    G.stats.bestAir = s.bestAir || 0;
  } catch { /* corrupt save — start fresh */ }
}
