// Seeded randomness, so the same seed always builds the same city and the
// same screenshot scenes. mulberry32 is a small, fast generator; the helpers
// below (pick, range, chance, shuffle, weighted pick, clamp) all draw from
// it, so nothing in the world is ever unrepeatable.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One item from a list, chosen by the generator.
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

// A float between min (inclusive) and max (exclusive).
export function range(random, min, max) {
  return min + random() * (max - min);
}

// An integer between min and max, both inclusive.
export function rangeInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

// True with probability p (0 to 1).
export function chance(random, p) {
  return random() < p;
}

// A shuffled copy of a list, drawn from the same generator.
export function shuffle(random, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// A bell-curved random number, mean 0, spread 1 — two uniform draws
// averaged, which is close enough for gusts and lightning gaps and keeps
// the extremes rare. Drawn from the same generator, so it stays seeded.
export function gauss(random) {
  return (random() + random() + random() - 1.5) * 2;
}

// N different items from a list, in a shuffled order, without repeats.
export function pickN(random, list, n) {
  return shuffle(random, list).slice(0, Math.min(n, list.length));
}

// Pick one entry from [value, weight] pairs, weighted by the second element.
export function weightedPick(random, entries) {
  let total = 0;
  for (const entry of entries) total += entry[1];
  let roll = random() * total;
  for (const entry of entries) {
    roll -= entry[1];
    if (roll <= 0) return entry[0];
  }
  return entries[entries.length - 1][0];
}

// Clamp a value into [min, max]; used by the camera and the lighting code.
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
