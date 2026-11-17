// The world: everything in Solmara at once, and the one step that moves it
// all — the player, the traffic, the pedestrians, the police, the bullets,
// the missions and the camera. main.js calls stepWorld every fixed step.
import { CAR, PEDS, PLAYER, POLICE, TRAFFIC, WORLD } from './config.js';
import { createRandom } from './random.js';
import { generateCity } from './city.js';
import {
  createPlayer, updateOnFoot, nearestEnterableCar, enterCar, exitCar,
  tryShoot, startReload, damagePlayer, healPlayer,
} from './player.js';
import {
  createCar, driveCar, collideCars, updateTraffic, spawnTraffic, spawnParked,
} from './vehicles.js';
import { spawnPeds, updatePeds, knockDown } from './pedestrians.js';
import { createWanted, addHeat, clearWanted, updatePolice } from './police.js';
import { updateBullets, enemyShoot } from './combat.js';
import {
  createMissionState, updateMissions, updateEnemies, currentObjective, currentMarker,
} from './missions.js';
import { saveGame } from './save.js';
import { ACTION_ENTER, ACTION_RELOAD } from './input.js';

export function createWorld(seed) {
  const rng = createRandom(seed);
  const city = generateCity(rng);
  const start = city.locations.safehouse;
  const cars = [
    ...spawnTraffic(city, rng, TRAFFIC.count),
    ...spawnParked(city, rng, 18),
  ];
  // Kai's own beater, parked outside the apartment.
  const ownCar = createCar(start.x + 60, start.y + 40, 0, 'sedan', rng, { state: 'parked', color: '#4f7ec9' });
  cars.push(ownCar);
  return {
    seed,
    rng,
    city,
    player: createPlayer(start.x, start.y),
    cars,
    peds: spawnPeds(city, rng, PEDS.count),
    cops: [],
    bullets: [],
    particles: [],
    skids: [],
    pickups: [
      { x: city.locations.hospital.x, y: city.locations.hospital.y, kind: 'health' },
      { x: start.x - 40, y: start.y + 30, kind: 'health' },
      { x: city.locations.park.x, y: city.locations.park.y, kind: 'health' },
    ],
    wanted: createWanted(),
    missions: createMissionState(),
    money: 0,
    time: 0,
    camera: { x: start.x, y: start.y, zoom: 1 },
    toast: null,
    toastLeft: 0,
    dialogue: null,
    dialogueLeft: 0,
    gameOver: null,
    lastGunshot: null,
    lastGunshotLeft: 0,
    saveCooldown: 0,
  };
}

function addToast(state, text, seconds) {
  state.toast = text;
  state.toastLeft = seconds || 3;
}

function addParticles(state, x, y, count, color, speed, life, size) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: life * (0.6 + Math.random() * 0.6),
      maxLife: life,
      size: size * (0.7 + Math.random() * 0.6),
      color,
    });
  }
}

function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2 * dt;
    p.vy *= 1 - 2 * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.skids.length - 1; i >= 0; i -= 1) {
    state.skids[i].life -= dt;
    if (state.skids[i].life <= 0) state.skids.splice(i, 1);
  }
  if (state.particles.length > 400) state.particles.splice(0, state.particles.length - 400);
  if (state.skids.length > 300) state.skids.splice(0, state.skids.length - 300);
}

function carWrecked(state, car) {
  addParticles(state, car.x, car.y, 26, '#ff7b2e', 220, 0.7, 5);
  addParticles(state, car.x, car.y, 18, '#555555', 90, 1.6, 9);
  if (state.player.car === car) {
    exitCar(state.player, state.city);
    damagePlayer(state.player, 25);
    addToast(state, 'Your car is wrecked!', 3);
  }
}

/**
 * One fixed step. `input` is the input device, `mouseWorld` the mouse in
 * world coordinates (for aiming). Returns events for sound and screens.
 */
export function stepWorld(state, input, mouseWorld, dt) {
  const events = [];
  if (state.gameOver) return events;
  state.time += dt;
  if (state.toastLeft > 0) {
    state.toastLeft -= dt;
    if (state.toastLeft <= 0) state.toast = null;
  }
  if (state.dialogueLeft > 0) {
    state.dialogueLeft -= dt;
    if (state.dialogueLeft <= 0) state.dialogue = null;
  }
  if (state.lastGunshotLeft > 0) state.lastGunshotLeft -= dt;
  if (state.saveCooldown > 0) state.saveCooldown -= dt;

  const player = state.player;
  const actions = input.takeActions();

  // --- Player: on foot or in a car ---
  if (player.state === 'foot') {
    const dir = input.direction();
    updateOnFoot(player, dir, input.run, dt, state.city);
    player.aimAngle = Math.atan2(mouseWorld.y - player.y, mouseWorld.x - player.x);
    if (input.mouse.down) {
      if (tryShoot(player, player.aimAngle, state.bullets)) {
        events.push({ type: 'gunshot', x: player.x, y: player.y });
        state.lastGunshot = { x: player.x, y: player.y };
        state.lastGunshotLeft = 2;
        addParticles(state, player.x + Math.cos(player.aimAngle) * 22, player.y + Math.sin(player.aimAngle) * 22, 3, '#ffd94d', 120, 0.12, 3);
        // Firing in front of the law draws heat.
        const copNear = state.cops.some((c) => Math.hypot(c.x - player.x, c.y - player.y) < POLICE.sightRange)
          || state.cars.some((c) => c.state === 'police' && Math.hypot(c.x - player.x, c.y - player.y) < POLICE.sightRange);
        if (copNear && addHeat(state.wanted, 6)) events.push({ type: 'starsUp', stars: state.wanted.stars });
      }
    }
    if (actions & ACTION_RELOAD) startReload(player);
    if (actions & ACTION_ENTER) {
      const car = nearestEnterableCar(player, state.cars);
      if (car) {
        const wasTraffic = car.state === 'traffic';
        enterCar(player, car);
        events.push({ type: 'enterCar', car });
        // Stealing a car the police can see is a crime.
        const copNear = state.cops.some((c) => Math.hypot(c.x - player.x, c.y - player.y) < POLICE.sightRange)
          || state.cars.some((c) => c.state === 'police' && Math.hypot(c.x - player.x, c.y - player.y) < POLICE.sightRange);
        if (copNear || wasTraffic) {
          if (addHeat(state.wanted, wasTraffic ? 14 : 10)) events.push({ type: 'starsUp', stars: state.wanted.stars });
        }
      }
    }
  } else if (player.car) {
    const dir = input.direction();
    const throttle = dir.y < 0 ? 1 : dir.y > 0 ? -1 : 0;
    const steer = dir.x;
    const before = player.car.health;
    const hit = driveCar(player.car, throttle, steer, input.run, dt, state.city);
    if (hit > 0.15) {
      events.push({ type: 'crash', x: player.car.x, y: player.car.y, strength: hit });
      addParticles(state, player.car.x, player.car.y, 8, '#ffd94d', 150, 0.3, 3);
    }
    if (player.car.state === 'wreck' && before > 0) carWrecked(state, player.car);
    if (player.car.skidding) {
      state.skids.push({
        x1: player.car.x - Math.cos(player.car.angle) * 20,
        y1: player.car.y - Math.sin(player.car.angle) * 20,
        x2: player.car.x,
        y2: player.car.y,
        life: 4,
      });
    }
    if (player.car.smoking && Math.random() < 0.3) {
      addParticles(state, player.car.x, player.car.y, 1, '#666666', 30, 1.2, 7);
    }
    player.x = player.car.x;
    player.y = player.car.y;
    player.angle = player.car.angle;
    if (actions & ACTION_ENTER) {
      exitCar(player, state.city);
      events.push({ type: 'exitCar' });
    }
  }

  // --- Traffic, collisions, pedestrians ---
  for (const car of state.cars) {
    if (car.state === 'traffic') updateTraffic(car, dt, state.city, state.cars, state.rng);
  }
  collideCars(state.cars);
  const danger = [];
  if (state.lastGunshotLeft > 0 && state.lastGunshot) {
    danger.push({ x: state.lastGunshot.x, y: state.lastGunshot.y, radius: 320 });
  }
  if (player.state === 'car' && player.car && Math.abs(player.car.speed) > 260) {
    danger.push({ x: player.car.x, y: player.car.y, radius: 200 });
  }
  for (const car of state.cars) {
    if (car.state === 'police') danger.push({ x: car.x, y: car.y, radius: 240 });
  }
  updatePeds(state.peds, dt, state.city, state.rng, danger);

  // Cars running over pedestrians.
  for (const car of state.cars) {
    if (Math.abs(car.speed) < 120 || car.state === 'wreck') continue;
    for (const ped of state.peds) {
      if (ped.state === 'down') continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < CAR.radius) {
        knockDown(ped);
        addParticles(state, ped.x, ped.y, 10, '#c0392b', 120, 0.5, 4);
        if (car.state === 'player') {
          if (addHeat(state.wanted, 18)) events.push({ type: 'starsUp', stars: state.wanted.stars });
          addToast(state, 'You ran someone over!', 2.5);
        }
      }
    }
  }

  // --- Bullets ---
  const bulletEvents = updateBullets(state.bullets, dt, state.city, {
    peds: state.peds,
    enemies: state.missions.enemies,
    cars: state.cars.filter((c) => c.state !== 'player'),
    player,
  });
  for (const e of bulletEvents) {
    if (e.type === 'spark') {
      addParticles(state, e.x, e.y, 4, '#ffd94d', 140, 0.2, 2);
    } else if (e.type === 'hitPed') {
      knockDown(e.target);
      addParticles(state, e.x, e.y, 8, '#c0392b', 120, 0.5, 4);
      if (addHeat(state.wanted, 20)) events.push({ type: 'starsUp', stars: state.wanted.stars });
    } else if (e.type === 'hitEnemy') {
      addParticles(state, e.x, e.y, 6, '#c0392b', 120, 0.4, 4);
      if (e.target.health <= 0) {
        events.push({ type: 'enemyDown' });
        addParticles(state, e.x, e.y, 12, '#c0392b', 160, 0.6, 4);
      }
    } else if (e.type === 'hitCar') {
      addParticles(state, e.x, e.y, 5, '#ffd94d', 140, 0.25, 3);
      if (e.target.state === 'wreck') carWrecked(state, e.target);
    } else if (e.type === 'hitPlayer') {
      if (damagePlayer(player, e.damage)) {
        state.gameOver = 'wasted';
        events.push({ type: 'wasted' });
      } else {
        events.push({ type: 'hurt' });
      }
    }
  }

  // --- Police, missions, enemies ---
  const policeEvents = updatePolice(state, dt, state.city, state.rng);
  for (const e of policeEvents) {
    if (e.type === 'busted') {
      state.gameOver = 'busted';
      events.push(e);
    } else {
      events.push(e);
    }
  }
  const missionEvents = updateMissions(state, dt);
  for (const e of missionEvents) {
    if (e.type === 'missionStart') {
      state.dialogue = e.intro;
      state.dialogueLeft = 6;
      addToast(state, `Mission: ${e.name}`, 4);
    } else if (e.type === 'missionComplete') {
      state.dialogue = `Mission complete: ${e.name}. +$${e.pay}`;
      state.dialogueLeft = 5;
      saveGame(state);
      events.push({ type: 'cash' });
    } else if (e.type === 'toast') {
      addToast(state, e.text, 4);
    }
    events.push(e);
  }
  const enemyEvents = updateEnemies(state, dt);
  for (const e of enemyEvents) {
    if (e.type === 'enemyShoot') {
      enemyShoot(e.enemy, player, state.bullets);
      events.push({ type: 'gunshot', x: e.enemy.x, y: e.enemy.y });
    }
  }

  // --- Pickups ---
  for (const pickup of state.pickups) {
    if (player.state === 'foot' && Math.hypot(pickup.x - player.x, pickup.y - player.y) < 30) {
      if (pickup.kind === 'health' && player.health < 100) {
        healPlayer(player, 50);
        events.push({ type: 'pickup' });
        addToast(state, '+50 health', 2);
        // Move the pack elsewhere so it can be found again later.
        pickup.x = state.city.locations.hospital.x + (Math.random() - 0.5) * 120;
        pickup.y = state.city.locations.hospital.y + (Math.random() - 0.5) * 120;
      }
    }
  }

  // --- Safehouse: save when Kai walks in with no mission running ---
  const home = state.city.locations.safehouse;
  if (player.state === 'foot' && !state.missions.active && state.saveCooldown <= 0
    && Math.hypot(player.x - home.x, player.y - home.y) < 70) {
    if (saveGame(state)) {
      addToast(state, 'Progress saved at the safehouse', 3);
      state.saveCooldown = 10;
      events.push({ type: 'pickup' });
    }
  }

  updateParticles(state, dt);

  // --- Camera: follow the player, zoom out a little while driving ---
  const targetZoom = player.state === 'car' ? 0.82 : 1;
  state.camera.zoom += (targetZoom - state.camera.zoom) * Math.min(1, dt * 3);
  const tx = player.x;
  const ty = player.y;
  state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 5);
  state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 5);

  return events;
}

/** The title screen's background: traffic and pedestrians move, the camera
 * drifts slowly around the city centre. No missions, no police, no player. */
export function stepAmbient(state, dt) {
  state.time += dt;
  for (const car of state.cars) {
    if (car.state === 'traffic') updateTraffic(car, dt, state.city, state.cars, state.rng);
  }
  collideCars(state.cars);
  updatePeds(state.peds, dt, state.city, state.rng, []);
  updateParticles(state, dt);
  const t = state.time * 0.05;
  state.camera.x = 1500 + Math.cos(t) * 500;
  state.camera.y = 1100 + Math.sin(t * 0.8) * 380;
  state.camera.zoom = 0.7;
}

/** After busted/wasted: respawn Kai, docked pay, wanted cleared. */
export function respawn(state, kind) {
  const loc = kind === 'busted' ? state.city.locations.policeStation : state.city.locations.hospital;
  if (state.player.car) {
    state.player.car.state = 'parked';
    state.player.car = null;
  }
  state.player.state = 'foot';
  state.player.x = loc.x + 40;
  state.player.y = loc.y + 40;
  state.player.health = PLAYER.health;
  state.player.ammo = PLAYER.magazine;
  state.money = Math.max(0, state.money - 100);
  clearWanted(state.wanted);
  // The police stand down; their cars leave.
  state.cars = state.cars.filter((c) => c.state !== 'police');
  state.cops = [];
  state.bullets = [];
  state.missions.active = null;
  state.gameOver = null;
  addToast(state, kind === 'busted' ? 'Busted! The PD took $100.' : 'Wasted! The hospital took $100.', 4);
}

export { currentObjective, currentMarker };
