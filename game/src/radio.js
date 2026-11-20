// The bay's radio: three stations, all synthesised live, switched with
// the C key. Sunset FM is the driving bassline; Neon Nights is a faster
// synthwave arpeggio for chases; Coral Chill is slow jazz chords for a
// night cruise. The station shows on the HUD, and the music only plays
// while you drive — park up and the bay goes quiet.
import { RADIO } from './config.js';

// Each station is a 16-step pattern: bass notes (Hz, 0 is a rest), a lead
// line that plays on some steps, and the waveform each one sings with.
const STATIONS = [
  {
    name: 'Sunset FM',
    bass: [73.42, 0, 73.42, 0, 87.31, 0, 73.42, 0, 65.41, 0, 73.42, 0, 98.0, 87.31, 73.42, 0],
    lead: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    bassType: 'triangle',
    leadType: 'sine',
    bassVol: 0.05,
    leadVol: 0,
    hatStep: 2,
  },
  {
    name: 'Neon Nights',
    bass: [55, 0, 55, 0, 65.41, 0, 55, 0, 49, 0, 55, 0, 82.41, 73.42, 65.41, 0],
    lead: [220, 261.63, 329.63, 261.63, 220, 261.63, 329.63, 392, 329.63, 261.63, 220, 196, 220, 261.63, 329.63, 440],
    bassType: 'sawtooth',
    leadType: 'square',
    bassVol: 0.035,
    leadVol: 0.018,
    hatStep: 2,
  },
  {
    name: 'Coral Chill',
    bass: [65.41, 0, 0, 0, 49, 0, 0, 0, 58.27, 0, 0, 0, 73.42, 0, 0, 0],
    lead: [261.63, 0, 329.63, 0, 392, 0, 329.63, 0, 293.66, 0, 349.23, 0, 392, 0, 440, 0],
    bassType: 'sine',
    leadType: 'triangle',
    bassVol: 0.05,
    leadVol: 0.03,
    hatStep: -1, // no hats on this station: it is a slow one
  },
];

export function createRadio() {
  return {
    station: 0, // index into STATIONS
    step: 0,
    next: 0, // audio-clock time of the next step
    on: false, // playing right now
  };
}

export function radioName(radio) {
  return RADIO.stations[radio.station] || STATIONS[radio.station].name;
}

// Switch to the next station; returns its name for the HUD.
export function nextStation(radio) {
  radio.station = (radio.station + 1) % STATIONS.length;
  radio.step = 0;
  return radioName(radio);
}

// The driving groove: schedule every note whose time has come. Called
// every frame with the audio state; `playTone` is the audio module's note
// player, and `driving` is whether the player is moving fast enough for
// the radio to be on. The step length changes with the station, so Neon
// Nights hurries and Coral Chill takes its time.
export function updateRadio(radio, audio, driving, playTone) {
  if (!audio.ctx || audio.muted) return;
  radio.on = driving;
  if (!driving) return;
  const station = STATIONS[radio.station];
  const stepDur = RADIO.stepDur[radio.station];
  if (radio.next < audio.ctx.currentTime) radio.next = audio.ctx.currentTime + 0.05;
  while (radio.next < audio.ctx.currentTime + 0.25) {
    const step = radio.step % 16;
    const when = radio.next - audio.ctx.currentTime;
    const bass = station.bass[step];
    if (bass > 0) playTone(audio, bass, 0.14, station.bassType, station.bassVol, when);
    const lead = station.lead[step];
    if (lead > 0) playTone(audio, lead, 0.12, station.leadType, station.leadVol, when);
    if (station.hatStep >= 0 && step % 4 === station.hatStep) {
      playTone(audio, 5200, 0.03, 'square', 0.012, when);
    }
    radio.step += 1;
    radio.next += stepDur;
  }
}
