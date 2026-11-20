// Palmera Bay — Sunset Run: car radio.
// Three live-synthesised stations. Each station is a little loop of notes
// with its own tempo and voice; audio.js turns the notes into sound.

export const STATIONS = [
  {
    name: 'Sunset FM',
    tag: 'golden-hour pop',
    tempo: 112,
    wave: 'triangle',
    // A breezy I–V–vi–IV loop, one note a beat.
    notes: [523, 659, 784, 880, 784, 659, 587, 659, 523, 587, 659, 784, 880, 784, 659, 587],
  },
  {
    name: 'Neon Nights',
    tag: 'midnight synth',
    tempo: 128,
    wave: 'sawtooth',
    notes: [220, 220, 262, 330, 392, 330, 262, 220, 196, 220, 262, 330, 392, 440, 392, 330],
  },
  {
    name: 'Coral Chill',
    tag: 'slow bay breeze',
    tempo: 84,
    wave: 'sine',
    notes: [392, 440, 494, 587, 494, 440, 392, 330, 392, 440, 494, 440, 392, 330, 294, 330],
  },
];

export function createRadio() {
  return { station: 0, step: 0, nextIn: 0 };
}

export function currentStation(radio) {
  return STATIONS[radio.station % STATIONS.length];
}

export function switchStation(radio) {
  radio.station = (radio.station + 1) % STATIONS.length;
  radio.step = 0;
  radio.nextIn = 0;
  return currentStation(radio);
}

// Advance the station's loop; returns a note {freq, dur, wave} when one is
// due this tick, otherwise null. Only plays while the player is driving.
export function radioTick(radio, dt, driving) {
  if (!driving) return null;
  const st = currentStation(radio);
  radio.nextIn -= dt;
  if (radio.nextIn > 0) return null;
  const beat = 60 / st.tempo;
  radio.nextIn = beat;
  const freq = st.notes[radio.step % st.notes.length];
  radio.step++;
  return { freq, dur: beat * 0.92, wave: st.wave };
}
