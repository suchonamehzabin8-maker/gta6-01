// The radio: three live-synthesised stations, no audio files. Each station is
// a small step sequencer — a bass line, a chord stab and a lead phrase over a
// scale — scheduled a little ahead of the game clock so it stays in time.
import { STATIONS } from './config.js';

// Frequencies (Hz) for the scales each station plays in.
const SCALES = {
  'Sunset FM': { bpm: 96, bass: [110, 130.8, 98, 146.8], lead: [440, 523.25, 587.33, 659.25, 523.25, 440, 392, 493.88], wave: 'triangle' },
  'Neon Nights': { bpm: 122, bass: [55, 65.4, 49, 73.4], lead: [220, 261.6, 329.6, 392, 440, 392, 329.6, 261.6], wave: 'sawtooth' },
  'Coral Chill': { bpm: 72, bass: [87.3, 110, 98, 130.8], lead: [349.23, 415.3, 493.88, 523.25, 493.88, 415.3, 349.23, 293.66], wave: 'sine' },
};

export function createRadio(audio) {
  return {
    audio,
    station: 0,
    step: 0,
    nextStepAt: 0,
    playing: false,
    name() { return STATIONS[this.station]; },
    switch() {
      this.station = (this.station + 1) % STATIONS.length;
      this.step = 0;
      this.nextStepAt = 0;
      return this.name();
    },
    setStation(i) {
      this.station = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
      this.step = 0;
      this.nextStepAt = 0;
    },
    // Call every frame with the game's wall-clock seconds; the sequencer
    // schedules notes a short way ahead so timing never slips.
    update(now) {
      if (!this.playing || !this.audio || typeof window === 'undefined') return;
      const st = SCALES[this.name()];
      const stepDur = 60 / st.bpm / 2; // eighth notes
      if (this.nextStepAt <= 0) this.nextStepAt = now + 0.05;
      while (this.nextStepAt < now + 0.15) {
        const s = this.step;
        const bar = Math.floor(s / 8) % 4;
        const beat = s % 8;
        // Bass on beats 0 and 4 of each bar, root follows the chord.
        if (beat === 0 || beat === 4) {
          this.audio.note(st.bass[bar], stepDur * 1.8, 'sine', 0.16);
        }
        // Lead phrase: a note on most steps, resting on step 6.
        if (beat !== 6) {
          const idx = (s * 3 + bar) % st.lead.length;
          this.audio.note(st.lead[idx], stepDur * 0.9, st.wave, 0.07);
        }
        // A soft chord stab on beat 2.
        if (beat === 2) {
          this.audio.note(st.bass[bar] * 2, stepDur, 'triangle', 0.05);
          this.audio.note(st.bass[bar] * 2.5, stepDur, 'triangle', 0.04);
        }
        this.step++;
        this.nextStepAt += stepDur;
      }
    },
  };
}
