// Solmara after dark: a clock that runs through the day, weather that rolls
// in off the sea, and the light that goes with them. The game starts at
// nine in the morning; an hour of Solmara time is a minute of play, so a
// long session sees dusk, night, and the lamps coming on. Rain and fog are
// cosmetic — they change what you see, never what the car does.
const DAY_START_MINUTES = 9 * 60;
const MINUTES_PER_SECOND = 1;
const DAY_MINUTES = 24 * 60;

const WEATHERS = ['clear', 'rain', 'fog'];
const WEATHER_WEIGHTS = { clear: 0.55, rain: 0.25, fog: 0.2 };
const WEATHER_MIN_SECONDS = 45;
const WEATHER_SPAN_SECONDS = 55;

/** The sky state for a fresh world: morning, clear, lamps off. */
export function createDayNight() {
  return {
    minutes: DAY_START_MINUTES,
    weather: 'clear',
    weatherLeft: 60,
    drops: [],
    lastRainDraw: 0,
    lightning: 0,
    stormIn: 8,
    day: 1, // Solmara counts days from the morning Kai wakes up
    meteors: [],
    meteorIn: 20,
  };
}

/** Morning, midday, golden hour or the small hours, from the clock. */
export function dayPhase(daynight) {
  const hour = daynight.minutes / 60;
  if (hour >= 20 || hour < 5.5) return 'night';
  if (hour < 7.5) return 'dawn';
  if (hour < 17.5) return 'day';
  return 'dusk';
}

/** How bright the world is, 1 in full daylight down to 0.22 at 3 a.m. */
export function daylightLevel(daynight) {
  const phase = dayPhase(daynight);
  if (phase === 'day') return 1;
  if (phase === 'night') return 0.22;
  const hour = daynight.minutes / 60;
  if (phase === 'dawn') return 0.22 + ((hour - 5.5) / 2) * 0.78;
  return 1 - ((hour - 17.5) / 2.5) * 0.78;
}

export function isNight(daynight) {
  return dayPhase(daynight) === 'night';
}

/** "21:30 · Rain" for the HUD line; at night the moon phase joins it. */
export function dayNightLabel(daynight) {
  const total = Math.floor(daynight.minutes) % DAY_MINUTES;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  const weather = daynight.weather === 'clear' ? 'Clear'
    : daynight.weather === 'rain' ? 'Rain' : 'Fog';
  if (dayPhase(daynight) === 'night') {
    return `${hh}:${mm} · ${weather} · ${moonPhase(daynight)}`;
  }
  return `${hh}:${mm} · ${weather}`;
}

/** The moon over Solmara, on an eight-day cycle from the day count. */
export function moonPhase(daynight) {
  const phases = ['New Moon', 'Crescent', 'Half Moon', 'Gibbous', 'Full Moon', 'Gibbous', 'Half Moon', 'Crescent'];
  return phases[(daynight.day - 1) % phases.length];
}

/** Roll the weather die: weighted, so clear skies are the common case. */
function pickWeather(rng) {
  const roll = rng.next();
  let acc = 0;
  for (const name of WEATHERS) {
    acc += WEATHER_WEIGHTS[name];
    if (roll < acc) return name;
  }
  return 'clear';
}

/** One fixed step: the clock turns, and the weather eventually turns too. */
export function updateDayNight(state, dt) {
  const sky = state.daynight;
  const before = sky.minutes;
  sky.minutes = (sky.minutes + dt * MINUTES_PER_SECOND) % DAY_MINUTES;
  if (sky.minutes < before) sky.day += 1; // midnight crossed: a new day
  sky.weatherLeft -= dt;
  if (sky.weatherLeft <= 0) {
    sky.weather = pickWeather(state.rng);
    sky.weatherLeft = WEATHER_MIN_SECONDS + state.rng.next() * WEATHER_SPAN_SECONDS;
    if (sky.weather !== 'rain') sky.drops = [];
  }
  // Rain brings lightning: a flash every few seconds, then a long wait.
  if (sky.weather === 'rain') {
    if (sky.lightning > 0) sky.lightning -= dt;
    sky.stormIn -= dt;
    if (sky.stormIn <= 0) {
      sky.lightning = 0.14;
      sky.stormIn = 5 + state.rng.next() * 9;
    }
  } else {
    sky.lightning = 0;
  }
  // Clear nights bring shooting stars: a streak every half minute or so.
  if (dayPhase(sky) === 'night' && sky.weather === 'clear') {
    sky.meteorIn -= dt;
    if (sky.meteorIn <= 0) {
      sky.meteors.push({
        x: state.rng.next() * 1200,
        y: state.rng.next() * 300,
        vx: -380 - state.rng.next() * 220,
        vy: 200 + state.rng.next() * 120,
        life: 0.9,
      });
      sky.meteorIn = 25 + state.rng.next() * 30;
    }
  }
  for (let i = sky.meteors.length - 1; i >= 0; i -= 1) {
    const m = sky.meteors[i];
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.life -= dt;
    if (m.life <= 0) sky.meteors.splice(i, 1);
  }
}

/** Force a time and weather (screenshots, tests): minutes since midnight. */
export function setDayNight(daynight, minutes, weather) {
  daynight.minutes = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  if (weather) {
    daynight.weather = weather;
    daynight.weatherLeft = 60;
    if (weather !== 'rain') daynight.drops = [];
  }
}

/** Street-lamp glow, drawn in world space after the buildings. */
export function drawNightLights(ctx, state) {
  const glow = 1 - daylightLevel(state.daynight);
  if (glow < 0.15) return;
  for (const lamp of state.city.lamps) {
    ctx.fillStyle = `rgba(255, 214, 130, ${0.1 + glow * 0.14})`;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 70 + glow * 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function seedDrops(sky, w, h) {
  const target = 110;
  while (sky.drops.length < target) {
    sky.drops.push({
      x: Math.random() * (w + 80) - 40,
      y: Math.random() * h,
      speed: 520 + Math.random() * 260,
      len: 12 + Math.random() * 10,
    });
  }
}

/** Screen-space overlay: dusk warmth, night dark, fog haze, falling rain. */
export function drawDayNight(ctx, state, w, h) {
  const sky = state.daynight;
  const light = daylightLevel(sky);
  const phase = dayPhase(sky);
  if (phase === 'dusk') {
    ctx.fillStyle = 'rgba(255, 122, 40, 0.08)';
    ctx.fillRect(0, 0, w, h);
  }
  if (phase === 'dawn') {
    ctx.fillStyle = 'rgba(255, 170, 90, 0.05)';
    ctx.fillRect(0, 0, w, h);
  }
  if (light < 1) {
    ctx.fillStyle = `rgba(8, 16, 48, ${(1 - light) * 0.5})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (sky.weather === 'fog') {
    ctx.fillStyle = 'rgba(220, 228, 235, 0.16)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(220, 228, 235, 0.1)';
    for (let i = 0; i < 5; i += 1) {
      const fy = ((i * 173 + state.time * 12) % (h + 160)) - 80;
      ctx.beginPath();
      ctx.ellipse(w / 2, fy, w * 0.55, 46, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (sky.weather === 'rain') {
    seedDrops(sky, w, h);
    const dt = Math.max(0, Math.min(0.1, state.time - sky.lastRainDraw));
    sky.lastRainDraw = state.time;
    ctx.strokeStyle = 'rgba(180, 205, 230, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const drop of sky.drops) {
      drop.y += drop.speed * dt;
      drop.x -= drop.speed * 0.16 * dt;
      if (drop.y > h + 20) {
        drop.y = -20;
        drop.x = Math.random() * (w + 80) - 40;
      }
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.len * 0.16, drop.y + drop.len);
    }
    ctx.stroke();
  }
  if (sky.lightning > 0) {
    ctx.fillStyle = `rgba(240, 244, 255, ${(sky.lightning / 0.14) * 0.3})`;
    ctx.fillRect(0, 0, w, h);
  }
  for (const m of sky.meteors) {
    const alpha = Math.max(0, Math.min(1, m.life / 0.9));
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x - m.vx * 0.12, m.y - m.vy * 0.12);
    ctx.stroke();
  }
}
