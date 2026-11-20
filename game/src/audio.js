// Synthesised sound, no audio files: a WebAudio engine hum whose pitch
// follows the car's speed (and a higher bike whine for motorcycles), a
// two-tone police siren, a helicopter rotor thump, gunshots — including
// the boomstick's boom — pickup chimes, a mission-complete jingle, rain
// noise that swells with a storm, a thunder rumble, and three radio
// stations of live-synthesised music that play while you drive. Mute with M.
export function createAudio() {
  return {
    ctx: null,
    muted: false,
    engine: null,
    engineGain: null,
    bike: null,
    bikeGain: null,
    siren: null,
    sirenGain: null,
    rotor: null,
    rotorGain: null,
    rotorLfo: null,
    rain: null,
    rainGain: null,
    musicStep: 0,
    musicNext: 0,
    musicOn: false,
  };
}

export function ensureAudio(audio) {
  if (audio.ctx || audio.muted) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new Ctx();
    // Engine: a sawtooth hum, quiet until you drive.
    audio.engine = audio.ctx.createOscillator();
    audio.engine.type = 'sawtooth';
    audio.engine.frequency.value = 60;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engine.connect(audio.engineGain);
    audio.engineGain.connect(audio.ctx.destination);
    audio.engine.start();
    // Siren: a square wave that wails while the police are after you.
    audio.siren = audio.ctx.createOscillator();
    audio.siren.type = 'square';
    audio.siren.frequency.value = 700;
    audio.sirenGain = audio.ctx.createGain();
    audio.sirenGain.gain.value = 0;
    audio.siren.connect(audio.sirenGain);
    audio.sirenGain.connect(audio.ctx.destination);
    audio.siren.start();
    // Helicopter rotor: a low square wave chopped by a slow LFO.
    audio.rotor = audio.ctx.createOscillator();
    audio.rotor.type = 'square';
    audio.rotor.frequency.value = 55;
    audio.rotorGain = audio.ctx.createGain();
    audio.rotorGain.gain.value = 0;
    audio.rotorLfo = audio.ctx.createOscillator();
    audio.rotorLfo.type = 'sine';
    audio.rotorLfo.frequency.value = 11;
    const lfoGain = audio.ctx.createGain();
    lfoGain.gain.value = 0.02;
    audio.rotorLfo.connect(lfoGain);
    lfoGain.connect(audio.rotorGain.gain);
    audio.rotor.connect(audio.rotorGain);
    audio.rotorGain.connect(audio.ctx.destination);
    audio.rotor.start();
    audio.rotorLfo.start();
    // Rain: looping white noise through a low-pass filter, quiet until a
    // storm rolls in. The gain follows the weather's intensity.
    const noiseLen = audio.ctx.sampleRate * 2;
    const buffer = audio.ctx.createBuffer(1, noiseLen, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i += 1) data[i] = Math.random() * 2 - 1;
    audio.rain = audio.ctx.createBufferSource();
    audio.rain.buffer = buffer;
    audio.rain.loop = true;
    const rainFilter = audio.ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.value = 900;
    audio.rainGain = audio.ctx.createGain();
    audio.rainGain.gain.value = 0;
    audio.rain.connect(rainFilter);
    rainFilter.connect(audio.rainGain);
    audio.rainGain.connect(audio.ctx.destination);
    audio.rain.start();
    // Bike engine: a thinner, higher whine than the car engine, used
    // while riding a motorcycle.
    audio.bike = audio.ctx.createOscillator();
    audio.bike.type = 'sawtooth';
    audio.bike.frequency.value = 90;
    audio.bikeGain = audio.ctx.createGain();
    audio.bikeGain.gain.value = 0;
    audio.bike.connect(audio.bikeGain);
    audio.bikeGain.connect(audio.ctx.destination);
    audio.bike.start();
    audio.musicNext = audio.ctx.currentTime + 0.1;
  } catch {
    audio.ctx = null;
  }
}

export function setEngine(audio, speed, driving) {
  if (!audio.ctx || audio.muted) return;
  const target = driving ? 0.03 + (Math.abs(speed) / 575) * 0.05 : 0;
  audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
  audio.engine.frequency.setTargetAtTime(55 + Math.abs(speed) * 0.22, audio.ctx.currentTime, 0.1);
}

// The bike's whine: same shape as the car engine, higher and thinner.
export function setBikeEngine(audio, speed, riding) {
  if (!audio.ctx || audio.muted) return;
  const target = riding ? 0.025 + (Math.abs(speed) / 660) * 0.045 : 0;
  audio.bikeGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
  audio.bike.frequency.setTargetAtTime(85 + Math.abs(speed) * 0.3, audio.ctx.currentTime, 0.1);
}

// Rain volume follows the storm: 0 is dry, 1 is a full bay downpour.
export function setRain(audio, intensity) {
  if (!audio.ctx || audio.muted) return;
  audio.rainGain.gain.setTargetAtTime(intensity * 0.06, audio.ctx.currentTime, 0.5);
}

// Thunder: a low rumble that rolls in after the lightning, in two parts.
export function thunder(audio) {
  if (!audio.ctx || audio.muted) return;
  blip(audio, 48, 1.4, 'sawtooth', 0.16);
  setTimeout(() => blip(audio, 38, 1.1, 'sawtooth', 0.12), 180);
}

export function setSiren(audio, on) {
  if (!audio.ctx || audio.muted) return;
  audio.sirenGain.gain.setTargetAtTime(on ? 0.02 : 0, audio.ctx.currentTime, 0.2);
  if (on) {
    const wail = 650 + Math.sin(audio.ctx.currentTime * 4) * 180;
    audio.siren.frequency.setTargetAtTime(wail, audio.ctx.currentTime, 0.05);
  }
}

export function setRotor(audio, on) {
  if (!audio.ctx || audio.muted) return;
  audio.rotorGain.gain.setTargetAtTime(on ? 0.035 : 0, audio.ctx.currentTime, 0.3);
}

// A single scheduled note — the primitive the radio stations and the
// jingles build on. `when` is seconds from now.
export function playTone(audio, freq, dur, type = 'sine', vol = 0.08, when = 0) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime + when;
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(audio.ctx.destination);
  o.start(t);
  o.stop(t + dur);
}

function blip(audio, freq, dur, type = 'sine', vol = 0.08, when = 0) {
  playTone(audio, freq, dur, type, vol, when);
}

// The driving groove: a 16-step D-minor bassline with a soft off-beat hat.
// Called every frame; it only schedules notes whose time has come.
const BASSLINE = [73.42, 0, 73.42, 0, 87.31, 0, 73.42, 0, 65.41, 0, 73.42, 0, 98.0, 87.31, 73.42, 0];
export function updateMusic(audio, driving) {
  if (!audio.ctx || audio.muted) return;
  audio.musicOn = driving;
  if (!driving) return;
  const stepDur = 0.16;
  while (audio.musicNext < audio.ctx.currentTime + 0.25) {
    const step = audio.musicStep % 16;
    const note = BASSLINE[step];
    const when = audio.musicNext - audio.ctx.currentTime;
    if (note > 0) blip(audio, note, 0.14, 'triangle', 0.05, when);
    if (step % 4 === 2) blip(audio, 5200, 0.03, 'square', 0.012, when);
    audio.musicStep += 1;
    audio.musicNext += stepDur;
  }
}

export function sfx(audio, name) {
  if (!audio.ctx || audio.muted) return;
  if (name === 'shot') blip(audio, 180, 0.12, 'square', 0.12);
  else if (name === 'smg') blip(audio, 240, 0.07, 'square', 0.07);
  else if (name === 'shotgun') {
    // The boomstick: a deep boom with a sharp crack on top.
    blip(audio, 110, 0.3, 'sawtooth', 0.2);
    blip(audio, 55, 0.4, 'sawtooth', 0.16);
    blip(audio, 900, 0.05, 'square', 0.08);
  } else if (name === 'spray') {
    // The garage's paint gun: a short high hiss.
    blip(audio, 3200, 0.16, 'square', 0.03);
    setTimeout(() => blip(audio, 2800, 0.14, 'square', 0.025), 120);
  } else if (name === 'stunt') {
    // A rising whistle for a good jump, landing on a bright note.
    [392, 523, 659, 784].forEach((f, i) => setTimeout(() => blip(audio, f, 0.12), i * 70));
  } else if (name === 'punch') blip(audio, 100, 0.1, 'square', 0.1);
  else if (name === 'pickup') {
    blip(audio, 660, 0.1);
    setTimeout(() => blip(audio, 990, 0.14), 70);
  } else if (name === 'weapon') {
    [440, 554, 659, 880].forEach((f, i) => setTimeout(() => blip(audio, f, 0.12), i * 70));
  } else if (name === 'crash') blip(audio, 90, 0.25, 'sawtooth', 0.14);
  else if (name === 'wreck') {
    blip(audio, 70, 0.5, 'sawtooth', 0.18);
    setTimeout(() => blip(audio, 50, 0.4, 'sawtooth', 0.12), 90);
  } else if (name === 'horn') blip(audio, 370, 0.18, 'square', 0.05);
  else if (name === 'mission') {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(audio, f, 0.22), i * 110));
  } else if (name === 'fail') {
    [392, 330, 262].forEach((f, i) => setTimeout(() => blip(audio, f, 0.25), i * 130));
  } else if (name === 'busted') {
    [440, 415, 392, 370].forEach((f, i) => setTimeout(() => blip(audio, f, 0.3, 'square', 0.06), i * 150));
  } else if (name === 'heli') {
    blip(audio, 1200, 0.15, 'sine', 0.06);
    setTimeout(() => blip(audio, 900, 0.2, 'sine', 0.05), 120);
  }
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.ctx) {
    audio.engineGain.gain.value = 0;
    audio.bikeGain.gain.value = 0;
    audio.sirenGain.gain.value = 0;
    audio.rotorGain.gain.value = 0;
    audio.rainGain.gain.value = 0;
  }
  return audio.muted;
}
