// Synthesised sound — no audio files anywhere. Everything is WebAudio
// oscillators and filtered noise, built lazily on the first user gesture so
// the page never needs an autoplay grant. In Node (tests) every method is a
// harmless no-op.
export function createAudio() {
  const a = {
    ctx: null,
    master: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    rainNode: null,
    rainGain: null,
    sirenOsc: null,
    sirenGain: null,
    rotorOsc: null,
    rotorGain: null,
  };

  function ensure() {
    if (typeof window === 'undefined') return null;
    if (!a.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      a.ctx = new AC();
      a.master = a.ctx.createGain();
      a.master.gain.value = 0.5;
      a.master.connect(a.ctx.destination);
    }
    if (a.ctx.state === 'suspended') a.ctx.resume();
    return a.ctx;
  }

  function noiseBuffer(ctx, seconds = 1) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function blip(freq, dur, type = 'sine', vol = 0.25, slideTo = 0) {
    const ctx = ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(a.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, filterFreq, type = 'lowpass') {
    const ctx = ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, dur + 0.1);
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(a.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  return Object.assign(a, {
    unlock() { ensure(); },
    toggleMute() {
      a.muted = !a.muted;
      if (a.master) a.master.gain.value = a.muted ? 0 : 0.5;
      return a.muted;
    },
    shot() { noiseBurst(0.12, 0.5, 1800, 'bandpass'); blip(220, 0.08, 'square', 0.12, 60); },
    shotgun() { noiseBurst(0.25, 0.65, 900, 'lowpass'); blip(140, 0.15, 'sawtooth', 0.15, 45); },
    punch() { noiseBurst(0.09, 0.4, 500, 'lowpass'); },
    pickup() { blip(660, 0.09, 'sine', 0.22); blip(990, 0.12, 'sine', 0.2); },
    cash() { blip(880, 0.08, 'triangle', 0.22); setTimeout(() => blip(1320, 0.1, 'triangle', 0.2), 70); },
    jingle() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.22), i * 95));
    },
    badJingle() {
      [392, 370, 330].forEach((f, i) => setTimeout(() => blip(f, 0.2, 'sawtooth', 0.14), i * 120));
    },
    thunder() { noiseBurst(1.6, 0.5, 140, 'lowpass'); },
    horn() { blip(370, 0.18, 'square', 0.12, 370); blip(466, 0.18, 'square', 0.1, 466); },
    // Continuous loops: engine pitch follows speed, siren wails, rotor chops.
    setEngine(on, speed01 = 0, bike = false) {
      const ctx = ensure();
      if (!ctx) return;
      if (!on) {
        if (a.engineOsc) { try { a.engineOsc.stop(); } catch { /* already stopped */ } a.engineOsc = null; }
        return;
      }
      if (!a.engineOsc) {
        a.engineOsc = ctx.createOscillator();
        a.engineGain = ctx.createGain();
        a.engineOsc.type = bike ? 'sawtooth' : 'triangle';
        a.engineGain.gain.value = 0.05;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 900;
        a.engineOsc.connect(f); f.connect(a.engineGain); a.engineGain.connect(a.master);
        a.engineOsc.start();
      }
      const base = bike ? 90 : 55;
      a.engineOsc.frequency.setTargetAtTime(base + speed01 * 160, ctx.currentTime, 0.08);
      a.engineGain.gain.setTargetAtTime(0.04 + speed01 * 0.05, ctx.currentTime, 0.1);
    },
    setSiren(on) {
      const ctx = ensure();
      if (!ctx) return;
      if (!on) {
        if (a.sirenOsc) { try { a.sirenOsc.stop(); } catch { /* stopped */ } a.sirenOsc = null; }
        return;
      }
      if (!a.sirenOsc) {
        a.sirenOsc = ctx.createOscillator();
        a.sirenGain = ctx.createGain();
        a.sirenOsc.type = 'sine';
        a.sirenGain.gain.value = 0.035;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.9;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 320;
        lfo.connect(lfoGain); lfoGain.connect(a.sirenOsc.frequency);
        a.sirenOsc.frequency.value = 800;
        a.sirenOsc.connect(a.sirenGain); a.sirenGain.connect(a.master);
        a.sirenOsc.start(); lfo.start();
        a._sirenLfo = lfo;
      }
    },
    setRotor(on) {
      const ctx = ensure();
      if (!ctx) return;
      if (!on) {
        if (a.rotorOsc) { try { a.rotorOsc.stop(); } catch { /* stopped */ } a.rotorOsc = null; }
        return;
      }
      if (!a.rotorOsc) {
        a.rotorOsc = ctx.createOscillator();
        a.rotorGain = ctx.createGain();
        a.rotorOsc.type = 'square';
        a.rotorOsc.frequency.value = 13;
        a.rotorGain.gain.value = 0.05;
        a.rotorOsc.connect(a.rotorGain); a.rotorGain.connect(a.master);
        a.rotorOsc.start();
      }
    },
    setRain(on, intensity = 0) {
      const ctx = ensure();
      if (!ctx) return;
      if (!on || intensity <= 0.02) {
        if (a.rainGain) a.rainGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
        return;
      }
      if (!a.rainNode) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(ctx, 2);
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.6;
        a.rainGain = ctx.createGain();
        a.rainGain.gain.value = 0;
        src.connect(f); f.connect(a.rainGain); a.rainGain.connect(a.master);
        src.start();
        a.rainNode = src;
      }
      a.rainGain.gain.setTargetAtTime(0.06 * intensity, ctx.currentTime, 0.3);
    },
    // A single note for the radio sequencer (radio.js drives the timing).
    note(freq, dur, type, vol) { blip(freq, dur, type, vol); },
    ensure,
  });
}
