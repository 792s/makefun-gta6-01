// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// help, play, paused and game over (busted / wasted).
//
// ?seed=N fixes the city. ?shot=chase|city|drive|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createWorld, stepWorld, stepAmbient, respawn } from './world.js';
import { MISSIONS } from './missions.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE } from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_TITLE, SCREEN_HELP, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER,
} from './render.js';
import { stageShot } from './shots.js';
import { loadGame, hasSave, clearSave } from './save.js';
import { unlockRadio, setRadioMuted } from './radio.js';
import { handleGarageClick } from './garage.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);

function runShot(name) {
  const world = createWorld(seed);
  // A night drive for the cover set: ?shot=drive&night=1 stages the beach
  // road at half past nine, lamps on, sea black.
  if (params.get('night')) {
    world.daynight.minutes = 21 * 60 + 30;
    world.daynight.weather = 'clear';
    world.daynight.weatherLeft = 120;
  }
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, { hasSave: false, overKind: null });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let world = createWorld(seed);
  let screen = SCREEN_TITLE;
  let overKind = null;
  let accumulator = 0;
  let last = performance.now();
  let muted = false;
  let sirenOn = false;
  let engineOn = false;
  // Menu keys the input device does not map: C continue, H help, Q quit.
  const menuKeys = new Set();
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyC' || event.code === 'KeyH' || event.code === 'KeyQ') {
      menuKeys.add(event.code);
    }
  });

  function announce(message) {
    status.textContent = message;
  }

  function mouseWorld() {
    const cam = world.camera;
    return {
      x: cam.x + (input.mouse.x - renderer.width / 2) / cam.zoom,
      y: cam.y + (input.mouse.y - renderer.height / 2) / cam.zoom,
    };
  }

  function startNewGame() {
    clearSave();
    world = createWorld(seed);
    screen = SCREEN_PLAY;
    audio.unlock();
    unlockRadio(world.radio);
    audio.click();
    input.mouse.down = false;
    announce('New game. Follow the yellow marker to your first job.');
  }

  function continueGame() {
    const data = loadGame();
    if (!data) return;
    world = createWorld(seed);
    world.money = data.money;
    world.missions.done = Math.min(data.missionsDone, MISSIONS.length);
    world.player.x = data.x;
    world.player.y = data.y;
    world.player.health = data.health;
    world.camera.x = data.x;
    world.camera.y = data.y;
    screen = SCREEN_PLAY;
    audio.unlock();
    unlockRadio(world.radio);
    audio.click();
    input.mouse.down = false;
    announce(`Continued. $${data.money}, ${data.missionsDone} missions done.`);
  }

  function handleEvents(events) {
    for (const e of events) {
      if (e.type === 'gunshot') audio.gunshot();
      else if (e.type === 'crash') audio.crash(e.strength || 0.3);
      else if (e.type === 'explosion') audio.explosion();
      else if (e.type === 'missionFailed') audio.fail();
      else if (e.type === 'pickup') audio.pickup();
      else if (e.type === 'cash') audio.cash();
      else if (e.type === 'missionComplete') audio.missionDone();
      else if (e.type === 'busted' || e.type === 'wasted') {
        overKind = e.type;
        screen = SCREEN_OVER;
        audio.fail();
        audio.stopEngine();
        audio.stopSiren();
        engineOn = false;
        sirenOn = false;
        announce(e.type === 'busted' ? 'Busted. Press Enter to get back on your feet.' : 'Wasted. Press Enter to get back on your feet.');
      }
    }
  }

  function updateAudio() {
    const player = world.player;
    if (screen !== SCREEN_PLAY) {
      if (engineOn) {
        audio.stopEngine();
        engineOn = false;
      }
      if (sirenOn) {
        audio.stopSiren();
        sirenOn = false;
      }
      return;
    }
    if (player.state === 'car' && player.car) {
      if (!engineOn) {
        audio.startEngine();
        engineOn = true;
      }
      audio.setEngine(player.car.speed, 560);
    } else if (engineOn) {
      audio.stopEngine();
      engineOn = false;
    }
    const policeNear = world.wanted.stars > 0 && world.cars.some((c) => c.state === 'police'
      && Math.hypot(c.x - player.x, c.y - player.y) < 900);
    if (policeNear && !sirenOn) {
      audio.startSiren();
      sirenOn = true;
    } else if (!policeNear && sirenOn) {
      audio.stopSiren();
      sirenOn = false;
    }
  }

  function clickButton() {
    const buttons = renderer.buttons;
    for (const b of buttons) {
      if (!b.enabled) continue;
      if (input.mouse.x >= b.x && input.mouse.x <= b.x + b.w
        && input.mouse.y >= b.y && input.mouse.y <= b.y + b.h) {
        return b.id;
      }
    }
    return null;
  }

  function handleActions() {
    const actions = input.takeActions(ACTION_CONFIRM | ACTION_PAUSE | ACTION_MUTE);
    if (actions & ACTION_MUTE) {
      muted = !muted;
      audio.setMuted(muted);
      if (world.radio) setRadioMuted(world.radio, muted);
    }
    const clicked = input.takeClick() ? clickButton() : null;
    if (screen === SCREEN_TITLE) {
      if (clicked === 'new' || (actions & ACTION_CONFIRM)) startNewGame();
      else if (clicked === 'continue' || menuKeys.has('KeyC')) continueGame();
      else if (clicked === 'help' || menuKeys.has('KeyH')) {
        screen = SCREEN_HELP;
        audio.click();
      }
    } else if (screen === SCREEN_HELP) {
      if (clicked === 'back' || menuKeys.has('KeyH') || (actions & ACTION_PAUSE)) {
        screen = SCREEN_TITLE;
        audio.click();
      }
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
      // The garage menu is clicked, not typed: buy or close, then say so.
      if (clicked && clicked.startsWith('garage-') && world.garage.open) {
        const bought = handleGarageClick(world, clicked);
        if (bought.text) announce(bought.text);
      }
    } else if (screen === SCREEN_PAUSED) {
      if ((actions & ACTION_PAUSE) || (actions & ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (menuKeys.has('KeyQ')) {
        screen = SCREEN_TITLE;
        world = createWorld(seed);
        announce('Back to the title screen.');
      }
    } else if (screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) {
        respawn(world, overKind);
        screen = SCREEN_PLAY;
        announce('Back on your feet.');
      }
    }
    menuKeys.clear();
    // Outside play, the world's actions (enter a car, reload) are drained so
    // a key pressed on a menu does not fire when play resumes.
    if (screen !== SCREEN_PLAY) input.takeActions();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_HELP) {
      while (accumulator >= STEP) {
        stepAmbient(world, STEP);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        const events = stepWorld(world, input, mouseWorld(), STEP);
        handleEvents(events);
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
    } else {
      accumulator = 0;
    }
    updateAudio();
    renderer.draw(world, screen, { hasSave: hasSave(), overKind });
  }

  // Leaving the tab pauses a running game rather than letting the city run on.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Solmara. Press Enter for a new game, C to continue, H for how to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
