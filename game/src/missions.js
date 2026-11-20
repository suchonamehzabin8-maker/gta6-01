// Palmera Bay — Sunset Run: the story.
// Twelve missions as Mara Vega, plus taxi fares and the twelve hidden
// sunset tokens. Each mission is a list of steps; the engine below checks
// them off as the player plays. Coordinates match the landmarks city.js
// places, so a mission's target is always somewhere real.

export const MISSIONS = [
  {
    id: 'first-wheels', name: 'First Wheels', pay: 250, rep: 10,
    brief: 'Dante needs wheels. Steal any car on the street.',
    steps: [{ type: 'steal', kind: 'car', label: 'Steal a car (E next to one)' }],
  },
  {
    id: 'the-drop', name: 'The Drop', pay: 300, rep: 10,
    brief: 'Take the package to the end of the pier. No questions.',
    steps: [{ type: 'reach', x: 3300, y: 1222, r: 90, label: 'Reach the end of the pier' }],
  },
  {
    id: 'shakedown', name: 'Shakedown', pay: 400, rep: 15,
    brief: 'Two shops owe the Syndicate. Collect from both.',
    steps: [
      { type: 'reach', x: 1560, y: 740, r: 80, label: 'Collect from the downtown shop' },
      { type: 'reach', x: 2360, y: 1140, r: 80, label: 'Collect from the marina shop' },
    ],
  },
  {
    id: 'getaway', name: 'Getaway', pay: 450, rep: 15,
    brief: 'The PD is onto you. Make some heat, then lose it.',
    steps: [
      { type: 'heat', stars: 1, label: 'Get the cops\' attention (steal or shoot)' },
      { type: 'loseheat', label: 'Lose the heat — lay low out of sight' },
    ],
  },
  {
    id: 'grand-prix', name: 'Sunset Grand Prix', pay: 600, rep: 25,
    brief: 'Nine checkpoints down the beach road. Beat the clock.',
    steps: [{ type: 'race', points: [[3080, 420], [3080, 700], [3080, 980], [3080, 1240], [3080, 1500], [3080, 1760], [3080, 2020], [3080, 2240], [3120, 2380]], seconds: 80, label: 'Race the beach road' }],
  },
  {
    id: 'the-big-one', name: 'The Big One', pay: 500, rep: 20,
    brief: 'Grab a bike and get the goods to the airfield.',
    steps: [
      { type: 'steal', kind: 'bike', label: 'Steal a motorbike' },
      { type: 'reach', x: 380, y: 232, r: 110, label: 'Reach the airfield runway' },
    ],
  },
  {
    id: 'marina-heist', name: 'Marina Heist', pay: 700, rep: 25,
    brief: 'The marina office keeps its cash in a safe. Take it home.',
    steps: [
      { type: 'reach', x: 2970, y: 2210, r: 90, label: 'Reach the marina office' },
      { type: 'reach', x: 760, y: 560, r: 90, label: 'Bring it back to the safehouse' },
    ],
  },
  {
    id: 'showdown', name: 'Sunset Showdown', pay: 800, rep: 30,
    brief: 'Five stars. The whole PD is coming. Survive, then vanish.',
    steps: [
      { type: 'survive', seconds: 45, label: 'Survive 5 stars for 45 seconds' },
      { type: 'loseheat', label: 'Lose the heat' },
    ],
  },
  {
    id: 'long-con', name: 'The Long Con', pay: 650, rep: 20,
    brief: 'Three drops, three deadlines. Don\'t be late.',
    steps: [
      { type: 'timed', x: 1140, y: 340, r: 80, seconds: 45, label: 'Drop 1: north avenue' },
      { type: 'timed', x: 2340, y: 1540, r: 80, seconds: 45, label: 'Drop 2: stadium district' },
      { type: 'timed', x: 3060, y: 1940, r: 80, seconds: 45, label: 'Drop 3: beach road' },
    ],
  },
  {
    id: 'storm-runner', name: 'Storm Runner', pay: 700, rep: 25,
    brief: 'A bay storm is coming in. Drive through it — twice.',
    storm: true,
    steps: [
      { type: 'timed', x: 1560, y: 1940, r: 90, seconds: 55, label: 'Deliver through the storm' },
      { type: 'timed', x: 2960, y: 760, r: 90, seconds: 55, label: 'Second drop, same storm' },
    ],
  },
  {
    id: 'bayfront-brawl', name: 'Bayfront Brawl', pay: 750, rep: 30,
    brief: 'Four Syndicate goons are waiting at the stadium. Settle it.',
    steps: [{ type: 'defeat', count: 4, label: 'Drop all four goons (F to punch)' }],
  },
  {
    id: 'midnight-courier', name: 'Midnight Courier', pay: 900, rep: 35,
    brief: 'Three night stops against the clock. The city never sleeps.',
    night: true,
    steps: [
      { type: 'timed', x: 760, y: 1940, r: 80, seconds: 50, label: 'Stop 1: Old Docks' },
      { type: 'timed', x: 2360, y: 340, r: 80, seconds: 50, label: 'Stop 2: north avenue' },
      { type: 'timed', x: 3300, y: 2200, r: 80, seconds: 50, label: 'Stop 3: the marina' },
    ],
  },
];

export function createStory() {
  return {
    index: 0, // next mission to start
    active: false,
    step: 0,
    timer: 0,
    raceCp: 0,
    goonsDown: 0,
    done: MISSIONS.map(() => false),
    complete: false,
    failed: null,
  };
}

export function currentMission(story) {
  if (story.index >= MISSIONS.length) return null;
  return MISSIONS[story.index];
}

export function startMission(story, G) {
  const m = currentMission(story);
  if (!m || story.active) return false;
  story.active = true;
  story.step = 0;
  story.raceCp = 0;
  story.goonsDown = 0;
  story.failed = null;
  const first = m.steps[0];
  story.timer = first.seconds || 0;
  if (m.storm) G.stormForced = true;
  if (m.id === 'showdown') G.wanted.heat = 950;
  if (m.id === 'bayfront-brawl') {
    G.goons = G.goons && G.goons.length ? G.goons : null;
    if (G.spawnGoons) G.spawnGoons();
  }
  if (m.id === 'getaway') G.wanted.heat = Math.max(G.wanted.heat, 120);
  return true;
}

// Advance the story one tick. Returns an event or null:
// {type:'step'} | {type:'complete', mission} | {type:'failed', reason}
export function updateStory(story, G, dt) {
  if (!story.active) return null;
  const m = currentMission(story);
  if (!m) return null;
  const step = m.steps[story.step];
  const p = G.player;
  const dist = (x, y) => Math.hypot(p.x - x, p.y - y);

  if (step.type === 'timed') {
    story.timer -= dt;
    if (story.timer <= 0) {
      story.active = false;
      story.failed = 'Out of time.';
      return { type: 'failed', reason: 'Out of time.' };
    }
  }
  if (step.type === 'survive') {
    story.timer = (story.timer || step.seconds) - dt;
    if (G.wanted.stars < 5 && story.timer > 0) {
      // Heat fell early: the showdown is over, move on.
      story.timer = 0;
    }
    if (story.timer <= 0) return advance(story, G, m);
  }
  let done = false;
  switch (step.type) {
    case 'reach':
    case 'deliver':
    case 'timed':
      done = dist(step.x, step.y) < step.r;
      break;
    case 'steal':
      done = !!p.vehicle && (step.kind === 'any' || p.vehicle.kind === step.kind);
      break;
    case 'heat':
      done = G.wanted.stars >= step.stars;
      break;
    case 'loseheat':
      done = G.wanted.stars === 0;
      break;
    case 'race': {
      const cp = step.points[story.raceCp];
      if (cp && dist(cp[0], cp[1]) < 90) {
        story.raceCp++;
        if (story.raceCp >= step.points.length) done = true;
        else return { type: 'step', checkpoint: story.raceCp };
      }
      if (step.seconds) {
        story.timer -= dt;
        if (story.timer <= 0) {
          story.active = false;
          story.failed = 'Out of time.';
          return { type: 'failed', reason: 'Out of time.' };
        }
      }
      break;
    }
    case 'defeat':
      done = story.goonsDown >= step.count;
      break;
    case 'survive':
      break;
  }
  if (done) return advance(story, G, m);
  return null;
}

function advance(story, G, m) {
  story.step++;
  if (story.step >= m.steps.length) {
    // Mission complete: pay up.
    story.done[story.index] = true;
    story.active = false;
    G.cash += m.pay;
    G.rep += m.rep;
    if (m.storm) G.stormForced = false;
    const finished = story.done.every(Boolean);
    if (finished) story.complete = true;
    else story.index++;
    return { type: 'complete', mission: m, finished };
  }
  const next = m.steps[story.step];
  story.timer = next.seconds || 0;
  story.raceCp = 0;
  return { type: 'step' };
}

export function missionObjective(story) {
  if (story.complete) return 'Story complete — Palmera Bay is yours.';
  const m = currentMission(story);
  if (!m) return '';
  if (!story.active) return `Next mission (N): ${m.name} — $${m.pay}`;
  const step = m.steps[story.step];
  let label = step.label;
  if (step.type === 'race') label += ` (${story.raceCp}/${step.points.length})`;
  if (step.type === 'defeat') label += ` (${story.goonsDown}/${step.count})`;
  if (step.type === 'timed' || step.type === 'race') label += ` — ${Math.ceil(story.timer)}s`;
  if (step.type === 'survive') label += ` — ${Math.ceil(story.timer)}s`;
  return `${m.name}: ${label}`;
}

// --- Taxi fares ---------------------------------------------------------------

export function createTaxi() {
  return { fare: null, timer: 0 };
}

// Offer a fare when the player is driving a taxi. Destination: a random
// road point; pay scales with distance.
export function offerFare(taxi, G, rng) {
  if (taxi.fare) return null;
  const p = G.player;
  if (!p.vehicle || !p.vehicle.taxi) return null;
  const dest = {
    x: 300 + Math.floor(rng() * 10) * 280,
    y: 300 + Math.floor(rng() * 7) * 280,
  };
  const d = Math.hypot(dest.x - p.x, dest.y - p.y);
  taxi.fare = { x: dest.x, y: dest.y, pay: 60 + Math.round(d / 12), timer: 60 + d / 40 };
  return taxi.fare;
}

export function updateTaxi(taxi, G, dt) {
  if (!taxi.fare) return null;
  taxi.timer -= dt;
  const p = G.player;
  if (Math.hypot(p.x - taxi.fare.x, p.y - taxi.fare.y) < 90) {
    const pay = taxi.fare.pay;
    G.cash += pay;
    taxi.fare = null;
    return { type: 'fare', pay };
  }
  if (taxi.timer <= 0) {
    taxi.fare = null;
    return { type: 'fare-lost' };
  }
  return null;
}

// --- Sunset tokens -------------------------------------------------------------

export function tokenNear(city, x, y, maxD = 30) {
  for (const t of city.tokens) {
    if (t.taken) continue;
    const dx = t.x - x;
    const dy = t.y - y;
    if (dx * dx + dy * dy < maxD * maxD) return t;
  }
  return null;
}

export function tokensLeft(city) {
  return city.tokens.filter((t) => !t.taken).length;
}
