// The car radio: three stations, all sequenced live with WebAudio, no audio
// files. The music only plays while Kai is driving; on foot it goes quiet,
// and a running mission ducks it so dialogue stays readable. In an
// environment with no AudioContext (tests, headless runs) the radio still
// tracks its station and volume, it just makes no sound.
export const STATIONS = [
  {
    name: 'SOL 104.7 — Neon Coast',
    bpm: 96,
    wave: 'sawtooth',
    bass: [0, 0, 7, 0, 10, 0, 7, 5],
    lead: [12, -1, 15, -1, 19, -1, 15, 12],
    root: 55,
    lines: [
      'DJ Sol: the coast is neon tonight, Solmara.',
      'DJ Sol: that one goes out to everyone stuck in traffic on the 5.',
      'DJ Sol: keep it locked, the night is just getting started.',
    ],
  },
  {
    name: 'TALK 88 — Solmara Nights',
    bpm: 72,
    wave: 'triangle',
    bass: [0, -1, 0, -1, 5, -1, 3, -1],
    lead: [12, 10, -1, 12, 14, -1, 10, 7],
    root: 65.41,
    lines: [
      'Mara Voss: caller, you are on Solmara Nights. Make it good.',
      'Mara Voss: the city never sleeps, and neither do our phone lines.',
      'Mara Voss: next up, why the docks smell like that. Stay tuned.',
    ],
  },
  {
    name: 'CALOR 99 — Salsa del Mar',
    bpm: 120,
    wave: 'square',
    bass: [0, 3, 5, 3, 0, 3, 7, 5],
    lead: [12, 15, 19, 15, 12, 19, 22, 19],
    root: 49,
    lines: [
      'El Fuego: ¡eso! Salsa del Mar, direct from the beach.',
      'El Fuego: if your hips are not moving, turn it up.',
      'El Fuego: the sea is warm and the music is warmer.',
    ],
  },
  {
    name: 'CLASSIC 101 — Palm Court',
    bpm: 66,
    wave: 'sine',
    bass: [0, -1, 7, -1, 5, -1, 3, -1],
    lead: [12, 14, 16, 14, 12, -1, 10, 12],
    root: 130.81,
    lines: [
      'Palm Court: quiet keys for a loud city.',
      'Palm Court: this next piece was written for a slow drive home.',
      'Palm Court: no talking over the music here. Enjoy.',
    ],
  },
  {
    name: 'BASS 107 — Harbor Rave',
    bpm: 140,
    wave: 'sawtooth',
    bass: [0, 0, 0, 7, 0, 0, 10, 7],
    lead: [12, -1, 12, -1, 15, -1, 19, -1],
    root: 41.2,
    lines: [
      'Harbor Rave: the docks are shaking and so are you.',
      'Harbor Rave: turn it up, the cranes can take it.',
      'Harbor Rave: 140 beats a minute, no brakes, no apologies.',
    ],
  },
  {
    name: 'NEWS 112 — Solmara Today',
    bpm: 80,
    wave: 'triangle',
    bass: [0, -1, 0, -1, 0, -1, 5, -1],
    lead: [12, 12, -1, 12, 14, -1, 12, 10],
    root: 110,
    lines: [
      'Solmara Today: traffic is bad, the weather is worse, stay tuned.',
      'Solmara Today: the mayor denies everything, as usual.',
      'Solmara Today: the ferry is late again. In other news, water is wet.',
    ],
  },
];

const STEP_BEATS = 0.5; // eighth notes
const LOOKAHEAD_SECONDS = 0.18;

/** A radio that starts silent on station zero. */
export function createRadio() {
  return {
    station: 0,
    playing: false,
    muted: false,
    ducked: false,
    ctx: null,
    master: null,
    noiseBuf: null,
    nextNoteAt: 0,
    step: 0,
    startedAt: 0,
    lineIndex: 0,
  };
}

/** The station on air right now, for the HUD. */
export function radioLabel(radio) {
  return STATIONS[radio.station].name;
}

/** The next DJ line for the station on air, rotating through its lines. */
export function stationLine(radio) {
  const station = STATIONS[radio.station];
  const line = station.lines[radio.lineIndex % station.lines.length];
  radio.lineIndex += 1;
  return line;
}

function ensureContext(radio) {
  if (radio.ctx) {
    if (radio.ctx.state === 'suspended') radio.ctx.resume().catch(() => {});
    return radio.ctx;
  }
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    radio.ctx = new AC();
  } catch {
    return null;
  }
  radio.master = radio.ctx.createGain();
  radio.master.gain.value = radio.muted ? 0 : 0.11;
  radio.master.connect(radio.ctx.destination);
  const len = Math.floor(radio.ctx.sampleRate * 0.06);
  radio.noiseBuf = radio.ctx.createBuffer(1, len, radio.ctx.sampleRate);
  const data = radio.noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  return radio.ctx;
}

/** Call on a user gesture so the radio is allowed to sound. */
export function unlockRadio(radio) {
  ensureContext(radio);
}

export function setRadioMuted(radio, value) {
  radio.muted = value;
  if (radio.master && radio.ctx) {
    radio.master.gain.setTargetAtTime(value ? 0 : 0.11, radio.ctx.currentTime, 0.05);
  }
}

/** Turn the dial one station forward, wrapping around. */
export function nextStation(radio) {
  radio.station = (radio.station + 1) % STATIONS.length;
  radio.step = 0;
  if (radio.ctx && radio.playing) radio.nextNoteAt = radio.ctx.currentTime + 0.05;
  return STATIONS[radio.station].name;
}

function noteFrequency(root, semitones) {
  return root * 2 ** (semitones / 12);
}

function playTone(radio, freq, at, duration, wave, volume) {
  const ctx = radio.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  osc.connect(gain).connect(radio.master);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

function playHat(radio, at, volume) {
  const ctx = radio.ctx;
  const src = ctx.createBufferSource();
  src.buffer = radio.noiseBuf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.04);
  src.connect(filter).connect(gain).connect(radio.master);
  src.start(at);
}

function scheduleStep(radio, at) {
  const station = STATIONS[radio.station];
  const beat = (60 / station.bpm) * STEP_BEATS;
  const bassDegree = station.bass[radio.step % station.bass.length];
  const leadDegree = station.lead[radio.step % station.lead.length];
  if (bassDegree >= 0) {
    playTone(radio, noteFrequency(station.root, bassDegree), at, beat * 0.9, station.wave, 0.5);
  }
  if (leadDegree >= 0 && radio.step % 2 === 0) {
    playTone(radio, noteFrequency(station.root * 2, leadDegree), at, beat * 0.7, 'sine', 0.22);
  }
  if (radio.step % 2 === 1) playHat(radio, at, 0.1);
  radio.step += 1;
  return beat;
}

/**
 * One fixed step, called from the world step while playing: schedule notes
 * ahead while Kai drives, go quiet on foot, and duck under missions.
 */
export function updateRadio(radio, state, dt) {
  void dt;
  const driving = state.player.state === 'car' && state.player.car;
  const missionOn = !!state.missions.active;
  const wantDuck = !!(missionOn && driving);
  if (wantDuck !== radio.ducked) {
    radio.ducked = wantDuck;
    if (radio.master && radio.ctx) {
      radio.master.gain.setTargetAtTime(
        radio.muted ? 0 : wantDuck ? 0.04 : 0.11, radio.ctx.currentTime, 0.1,
      );
    }
  }
  if (!driving) {
    radio.playing = false;
    return;
  }
  radio.playing = true;
  if (!ensureContext(radio)) return;
  if (radio.nextNoteAt < radio.ctx.currentTime) {
    radio.nextNoteAt = radio.ctx.currentTime + 0.05;
  }
  let guard = 0;
  while (radio.nextNoteAt < radio.ctx.currentTime + LOOKAHEAD_SECONDS && guard < 16) {
    const beat = scheduleStep(radio, radio.nextNoteAt);
    radio.nextNoteAt += beat;
    guard += 1;
  }
}
