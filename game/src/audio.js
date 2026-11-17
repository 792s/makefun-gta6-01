// Every sound is synthesised with WebAudio: no audio files, nothing to load.
// The engine hums, the siren wails, gunshots crack, pickups blip. The context
// starts on the first user gesture, as browsers require.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
    return ctx;
  }

  function noiseBuffer(duration) {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function blip(freq, duration, type, volume, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    gain.gain.setValueAtTime(volume || 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  function noise(duration, volume, filterFreq) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
  }

  return {
    /** Call on any user gesture so the context is allowed to sound. */
    unlock() {
      ensure();
    },
    setMuted(value) {
      muted = value;
      if (muted) {
        this.stopEngine();
        this.stopSiren();
      }
    },
    get muted() {
      return muted;
    },
    gunshot() {
      noise(0.12, 0.35, 2600);
      blip(160, 0.09, 'square', 0.12, 60);
    },
    crash(strength) {
      noise(0.18, Math.min(0.5, 0.15 + strength * 0.3), 500);
    },
    pickup() {
      blip(660, 0.1, 'sine', 0.18);
      setTimeout(() => blip(990, 0.14, 'sine', 0.18), 70);
    },
    cash() {
      blip(880, 0.09, 'triangle', 0.2);
      setTimeout(() => blip(1174, 0.09, 'triangle', 0.2), 80);
      setTimeout(() => blip(1568, 0.16, 'triangle', 0.2), 160);
    },
    missionDone() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.2), i * 110));
    },
    fail() {
      blip(220, 0.3, 'sawtooth', 0.15, 110);
      setTimeout(() => blip(165, 0.4, 'sawtooth', 0.15, 82), 180);
    },
    click() {
      blip(1200, 0.05, 'sine', 0.1);
    },
    horn() {
      blip(370, 0.25, 'square', 0.08);
      blip(440, 0.25, 'square', 0.08);
    },
    startEngine() {
      if (!ensure() || muted || engineOsc) return;
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain.gain.value = 0.0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineOsc.connect(filter).connect(engineGain).connect(ctx.destination);
      engineOsc.start();
    },
    setEngine(speed, maxSpeed) {
      if (!engineOsc || !engineGain || muted) return;
      const ratio = Math.min(1, Math.abs(speed) / maxSpeed);
      engineOsc.frequency.setTargetAtTime(55 + ratio * 110, ctx.currentTime, 0.08);
      engineGain.gain.setTargetAtTime(0.03 + ratio * 0.05, ctx.currentTime, 0.08);
    },
    stopEngine() {
      if (engineOsc) {
        try { engineOsc.stop(); } catch { /* already stopped */ }
        engineOsc = null;
        engineGain = null;
      }
    },
    startSiren() {
      if (!ensure() || muted || sirenOsc) return;
      sirenOsc = ctx.createOscillator();
      sirenGain = ctx.createGain();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 750;
      sirenGain.gain.value = 0.045;
      sirenOsc.connect(sirenGain).connect(ctx.destination);
      sirenOsc.start();
      let high = false;
      sirenTimer = setInterval(() => {
        if (!sirenOsc) return;
        high = !high;
        sirenOsc.frequency.setTargetAtTime(high ? 950 : 650, ctx.currentTime, 0.05);
      }, 380);
    },
    stopSiren() {
      if (sirenTimer) {
        clearInterval(sirenTimer);
        sirenTimer = null;
      }
      if (sirenOsc) {
        try { sirenOsc.stop(); } catch { /* already stopped */ }
        sirenOsc = null;
        sirenGain = null;
      }
    },
  };
}
