// Palmera Bay — Sunset Run: synthesised sound.
// Every sound is made with the Web Audio API — oscillators and filtered
// noise, no audio files. All calls are safe before the first user gesture:
// the context is created lazily and every method guards a missing one.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenOn = false;
    this.rainGain = null;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
    } catch {
      return false;
    }
    return true;
  }

  resume() {
    if (this.ensure() && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx && this.ctx.destination) {
      this.ctx.destination.gain = m ? 0 : 1;
    }
  }

  _tone(freq, dur, wave, vol, slideTo = null) {
    if (!this.ensure() || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch { /* sound is decoration; never break the game */ }
  }

  _noise(dur, vol, filterFreq, type = 'lowpass') {
    if (!this.ensure() || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = filterFreq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter).connect(gain).connect(this.ctx.destination);
      src.start(t);
    } catch { /* ignore */ }
  }

  // --- Game sounds -----------------------------------------------------------
  shot(kind) {
    if (kind === 'boomstick') this._noise(0.28, 0.5, 900);
    else if (kind === 'smg') this._noise(0.08, 0.25, 1800, 'highpass');
    else this._noise(0.12, 0.3, 1400, 'highpass');
  }

  punch() {
    this._noise(0.09, 0.35, 500);
  }

  hit() {
    this._tone(180, 0.08, 'square', 0.2, 90);
  }

  coin() {
    this._tone(880, 0.09, 'sine', 0.22);
    setTimeout(() => this._tone(1318, 0.14, 'sine', 0.2), 70);
  }

  jingle(kind) {
    const seq = kind === 'mission' ? [523, 659, 784, 1046] : [392, 523, 659];
    seq.forEach((f, i) => setTimeout(() => this._tone(f, 0.16, 'triangle', 0.22), i * 90));
  }

  thunder() {
    this._noise(1.6, 0.5, 220);
  }

  crash() {
    this._noise(0.3, 0.5, 700);
  }

  radioNote(note) {
    this._tone(note.freq, note.dur, note.wave, 0.07);
  }

  // --- Continuous sounds ------------------------------------------------------
  engine(speed01, on, bike = false) {
    if (!this.ensure()) return;
    try {
      if (!on) {
        if (this.engineOsc) { this.engineOsc.stop(); this.engineOsc = null; }
        return;
      }
      if (!this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.engineOsc.type = bike ? 'sawtooth' : 'triangle';
        this.engineGain.gain.value = 0.05;
        this.engineOsc.connect(this.engineGain).connect(this.ctx.destination);
        this.engineOsc.start();
      }
      const base = bike ? 140 : 70;
      this.engineOsc.frequency.setTargetAtTime(base + speed01 * (bike ? 320 : 160), this.ctx.currentTime, 0.08);
      this.engineGain.gain.setTargetAtTime(0.03 + speed01 * 0.05, this.ctx.currentTime, 0.1);
    } catch { /* ignore */ }
  }

  siren(on) {
    if (!this.ensure()) return;
    try {
      if (!on) {
        if (this.sirenOsc) { this.sirenOsc.stop(); this.sirenOsc = null; }
        this.sirenOn = false;
        return;
      }
      if (!this.sirenOsc) {
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenGain = this.ctx.createGain();
        this.sirenOsc.type = 'sine';
        this.sirenGain.gain.value = 0.035;
        this.sirenOsc.connect(this.sirenGain).connect(this.ctx.destination);
        this.sirenOsc.start();
        this.sirenOn = true;
      }
      const t = this.ctx.currentTime;
      const f = (Math.floor(t * 1.6) % 2 === 0) ? 660 : 520;
      this.sirenOsc.frequency.setTargetAtTime(f, t, 0.05);
    } catch { /* ignore */ }
  }
}
