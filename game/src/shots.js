// The screenshot scenes behind ?shot=chase|city|drive|mission. Each one sets
// up a real game state with the game's own code — a chase, a busy corner, a
// beach drive, a dockside firefight — then steps the simulation forward so
// the frame is what a short game really looks like. The same seed always
// gives the same frame.
import { STEP } from './config.js';
import { createCar } from './vehicles.js';
import { createPed } from './pedestrians.js';
import { enterCar } from './player.js';
import { addHeat } from './police.js';
import { startMission } from './missions.js';
import { stepWorld } from './world.js';
import { SCREEN_PLAY } from './render.js';

/** A scripted stand-in for the input device, so a scene can drive itself. */
function stubInput(drive) {
  return {
    takeActions() {
      return 0;
    },
    direction() {
      return drive ? { x: 0, y: -1 } : { x: 0, y: 0 };
    },
    run: false,
    mouse: { down: false, x: 0, y: 0 },
  };
}

function stepFor(state, input, mouseWorld, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) stepWorld(state, input, mouseWorld, STEP);
}

/** The cover: a three-star chase down the main street, mission on the HUD. */
function stageChase(state) {
  const car = createCar(1500, 1100, 0, 'sports', state.rng, { state: 'parked', color: '#d42a2a' });
  state.cars.push(car);
  enterCar(state.player, car);
  car.speed = 420;
  state.player.x = car.x;
  state.player.y = car.y;
  // Three stars and three patrol cars closing in from behind.
  addHeat(state.wanted, 55);
  const spots = [
    { x: 1180, y: 1100 },
    { x: 1280, y: 1076 },
    { x: 1240, y: 1128 },
  ];
  for (const s of spots) {
    const cop = createCar(s.x, s.y, 0, 'police', state.rng, { state: 'police' });
    cop.speed = 430;
    state.cars.push(cop);
  }
  // Mission 2's last step, so the objective and the marker show.
  state.missions.active = { index: 1, step: 2 };
  state.missions.done = 1;
  state.missions.cometCar = car;
  state.money = 300;
  const input = stubInput(true);
  stepFor(state, input, { x: 1600, y: 1100 }, 1.4);
}

/** On foot at the city's busiest corner, traffic and people around. */
function stageCity(state) {
  state.player.x = 1500;
  state.player.y = 1100;
  state.player.aimAngle = 0.4;
  // A few extra cars and people near the corner, so the frame is alive.
  for (let i = 0; i < 4; i += 1) {
    const car = createCar(1500 - 160 - i * 120, 1100 + (i % 2 === 0 ? 24 : -24), 0, 'sedan', state.rng, {
      state: 'traffic',
      road: { axis: 'h', at: 1100 },
      dir: 1,
      lane: i % 2 === 0 ? 24 : -24,
    });
    car.speed = 170;
    state.cars.push(car);
  }
  for (let i = 0; i < 8; i += 1) {
    const ped = createPed(1500 + (i - 4) * 55, 1100 + (i % 2 === 0 ? 70 : -70), state.rng);
    state.peds.push(ped);
  }
  const input = stubInput(false);
  stepFor(state, input, { x: 1600, y: 1150 }, 2);
}

/** Driving the beach road, the sea on the left. */
function stageDrive(state) {
  const car = createCar(1200, 2220, 0, 'convertible', state.rng, { state: 'parked', color: '#7fd4e8' });
  state.cars.push(car);
  enterCar(state.player, car);
  car.speed = 360;
  state.player.x = car.x;
  state.player.y = car.y;
  state.money = 800;
  const input = stubInput(true);
  stepFor(state, input, { x: 1400, y: 2220 }, 1.2);
}

/** Mission 3 in progress: a firefight at the docks. */
function stageMission(state) {
  startMission(state, 2);
  state.missions.done = 2;
  state.player.x = 2900;
  state.player.y = 1250;
  state.money = 800;
  const input = stubInput(false);
  // Let the enemies settle, then fire a few shots at the nearest one so a
  // muzzle flash and a bullet are in the frame.
  stepFor(state, input, { x: 2980, y: 1300 }, 0.8);
  input.mouse.down = true;
  const enemy = state.missions.enemies[0];
  stepFor(state, input, { x: enemy.x, y: enemy.y }, 0.35);
  input.mouse.down = false;
}

/**
 * Set `state` to the named scene and return the screen to draw over it.
 * Any unknown name stages the city.
 */
export function stageShot(name, state) {
  if (name === 'chase') stageChase(state);
  else if (name === 'drive') stageDrive(state);
  else if (name === 'mission') stageMission(state);
  else stageCity(state);
  return { screen: SCREEN_PLAY };
}
