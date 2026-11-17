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
import { ACTION_RADIO, ACTION_GARAGE, ACTION_NITRO, ACTION_PHOTO } from './input.js';
import { createDayNight, updateDayNight } from './daynight.js';
import { createRadio, updateRadio, nextStation, stationLine } from './radio.js';
import { createTaxi, updateTaxi } from './taxi.js';
import { createRaces, updateRaces } from './races.js';
import { createGarage, afterDrive, useNitro } from './garage.js';
import { createPackages, updatePackages } from './packages.js';
import { createViewpoints, updateViewpoints } from './viewpoints.js';
import { createChallenges, updateChallenges } from './challenges.js';
import { createChatter, updateChatter } from './chatter.js';

export function createWorld(seed) {
  const rng = createRandom(seed);
  const city = generateCity(rng);
  const start = city.locations.safehouse;
  const cars = [
    ...spawnTraffic(city, rng, TRAFFIC.count),
    ...spawnParked(city, rng, 18),
  ];
  // Kai's own beater, parked at the curb of the avenue by the apartment,
  // facing down the road so driving off is smooth.
  const ownCar = createCar(734, 540, Math.PI / 2, 'sedan', rng, { state: 'parked', color: '#4f7ec9' });
  cars.push(ownCar);
  ownCar.isOwnCar = true;
  const garage = createGarage();
  ownCar.color = garage.paint;
  ownCar.tune = garage.engine;
  ownCar.armor = garage.armor;
  ownCar.tires = garage.tires;
  ownCar.maxHealth = 100 + 50 * garage.armor;
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
      // A wrench at Eddie's Garage: drive a damaged car over it and the
      // car comes back to full health. It turns up elsewhere after use.
      { x: city.locations.eddiesGarage.x, y: city.locations.eddiesGarage.y, kind: 'repair' },
    ],
    wanted: createWanted(),
    missions: createMissionState(),
    daynight: createDayNight(),
    radio: createRadio(),
    taxi: createTaxi(),
    races: createRaces(),
    garage,
    packages: createPackages(),
    viewpoints: createViewpoints(),
    challenges: createChallenges(),
    chatter: createChatter(),
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

/** A car that just hit zero health: one explosion, then it burns. */
function carWrecked(state, car) {
  car.exploded = true;
  car.burnLeft = CAR.burnTime;
  addParticles(state, car.x, car.y, 26, '#ff7b2e', 220, 0.7, 5);
  addParticles(state, car.x, car.y, 18, '#555555', 90, 1.6, 9);
  if (state.player.car === car) {
    exitCar(state.player, state.city);
    car.state = 'wreck'; // exitCar parks it; a wreck stays a wreck.
    damagePlayer(state.player, 25);
    addToast(state, 'Your car is wrecked!', 3);
  }
}

/**
 * One step for every wreck and every smoking car: a fresh wreck explodes
 * once (and ejects its driver), a burning wreck throws fire and smoke until
 * it is a husk, and a husk far from the player is cleared away so wrecks do
 * not pile up. Smoking cars puff grey smoke. Returns explosion events.
 */
function updateWrecks(state, dt) {
  const events = [];
  const player = state.player;
  for (let i = state.cars.length - 1; i >= 0; i -= 1) {
    const car = state.cars[i];
    if (car.state === 'wreck') {
      if (!car.exploded) {
        carWrecked(state, car);
        events.push({ type: 'explosion', x: car.x, y: car.y });
        if (player.health <= 0 && !state.gameOver) {
          state.gameOver = 'wasted';
          events.push({ type: 'wasted' });
        }
      } else if (car.burnLeft > 0) {
        car.burnLeft -= dt;
        if (Math.random() < 0.5) {
          addParticles(state, car.x, car.y, 1, '#ff7b2e', 60, 0.5, 6);
        }
        if (Math.random() < 0.5) {
          addParticles(state, car.x, car.y, 1, '#555555', 30, 1.4, 9);
        }
      } else if (car !== state.missions.cometCar
        && Math.hypot(car.x - player.x, car.y - player.y) > 700) {
        // Burnt out and out of sight: clear the husk away.
        state.cars.splice(i, 1);
      }
    } else if (car.smoking && Math.random() < 0.3) {
      addParticles(state, car.x, car.y, 1, '#666666', 30, 1.2, 7);
    }
  }
  return events;
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
  const actions = input.takeActions(ACTION_ENTER | ACTION_RELOAD);
  const sideActions = input.takeActions(ACTION_RADIO | ACTION_GARAGE | ACTION_NITRO | ACTION_PHOTO);
  // Eddie's shop: the world waits while Kai browses, and G closes it again.
  if (state.garage.open) {
    if (sideActions & ACTION_GARAGE) state.garage.open = false;
    return events;
  }
  if ((sideActions & ACTION_GARAGE) && player.state === 'foot') {
    const shop = state.city.locations.eddiesGarage;
    if (Math.hypot(player.x - shop.x, player.y - shop.y) < 90) {
      state.garage.open = true;
      addToast(state, "Eddie's Garage — click what you want, G to leave", 3);
      return events;
    }
  }

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
    const hit = driveCar(player.car, throttle, steer, input.run, dt, state.city);
    if (hit > 0.15) {
      events.push({ type: 'crash', x: player.car.x, y: player.car.y, strength: hit });
      addParticles(state, player.car.x, player.car.y, 8, '#ffd94d', 150, 0.3, 3);
    }
    // The garage mods bite after the physics: tuning past the stock cap,
    // armour refunding part of a crash, nitro on the N key.
    afterDrive(state, player.car, throttle, hit, dt);
    if (sideActions & ACTION_NITRO) {
      if (useNitro(state)) {
        addParticles(state, player.car.x, player.car.y, 12, '#4da3ff', 200, 0.4, 4);
        addToast(state, 'NITRO!', 1);
      }
    }
    // A wrecked car explodes in updateWrecks below, like any other car.
    if (player.car.skidding) {
      state.skids.push({
        x1: player.car.x - Math.cos(player.car.angle) * 20,
        y1: player.car.y - Math.sin(player.car.angle) * 20,
        x2: player.car.x,
        y2: player.car.y,
        life: 4,
      });
    }
    player.x = player.car.x;
    player.y = player.car.y;
    player.angle = player.car.angle;
    if (actions & ACTION_ENTER) {
      exitCar(player, state.city);
      events.push({ type: 'exitCar' });
    }
  }

  // The radio dial: V changes the station while driving.
  if ((sideActions & ACTION_RADIO) && player.state === 'car') {
    const stationName = nextStation(state.radio);
    addToast(state, `${stationName} — ${stationLine(state.radio)}`, 2);
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
      // A car shot to zero health explodes in updateWrecks, like any wreck.
    } else if (e.type === 'hitPlayer') {
      if (damagePlayer(player, e.damage)) {
        state.gameOver = 'wasted';
        events.push({ type: 'wasted' });
      } else {
        events.push({ type: 'hurt' });
      }
    }
  }

  // --- Wrecks, fires, smoke ---
  for (const e of updateWrecks(state, dt)) events.push(e);

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
    } else if (e.type === 'missionFailed') {
      state.dialogue = `Too slow — the buyer walked away. ${e.name} failed; Eddie will remember that.`;
      state.dialogueLeft = 5;
      addToast(state, 'Mission failed — you can try again', 4);
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

  // --- Side activities: the sky, the radio, the cab, the races, the parcels ---
  updateDayNight(state, dt);
  updateRadio(state.radio, state, dt);
  const sideEvents = [
    ...updateTaxi(state, dt),
    ...updateRaces(state, dt),
    ...updatePackages(state, dt),
    ...updateViewpoints(state, dt, (sideActions & ACTION_PHOTO) !== 0),
    ...updateChallenges(state, dt),
    ...updateChatter(state, dt),
  ];
  for (const e of sideEvents) {
    if (e.type === 'toast') addToast(state, e.text, 4);
    events.push(e);
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
    } else if (player.state === 'car' && player.car && pickup.kind === 'repair'
      && player.car.health < CAR.health
      && Math.hypot(pickup.x - player.car.x, pickup.y - player.car.y) < 40) {
      // Drive a damaged car over the wrench: full repair, smoke gone.
      player.car.health = CAR.health;
      player.car.smoking = false;
      events.push({ type: 'pickup' });
      addToast(state, 'Wrench pickup — car repaired', 2);
      // The wrench turns up somewhere else around the garage.
      const g = state.city.locations.eddiesGarage;
      pickup.x = Math.max(120, Math.min(3080, g.x + (Math.random() - 0.5) * 400));
      pickup.y = Math.max(120, Math.min(2200, g.y + (Math.random() - 0.5) * 400));
    }
  }

  // --- Safehouse: save when Kai walks in on foot ---
  const home = state.city.locations.safehouse;
  if (player.state === 'foot' && state.saveCooldown <= 0
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
