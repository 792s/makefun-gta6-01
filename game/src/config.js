// Tuning and constants for SOLMARA: the world, the player, the cars, the
// police, the palette. One place for every number the game plays by.
export const STEP = 1 / 60;

export const WORLD = {
  width: 3200,
  height: 2400,
  // The sea starts here (south edge); the sand runs 140 units above it.
  waterY: 2320,
  sandY: 2150,
  // The docks run along the east edge.
  docksX: 2900,
};

// Sun-soaked coastal palette: warm sand, turquoise water, pastel buildings.
export const PALETTE = {
  grass: '#7fae5a',
  grassDark: '#74a24f',
  sand: '#e8d39a',
  water: '#2e9db8',
  waterDeep: '#1f7f9c',
  asphalt: '#3d3f45',
  asphaltDark: '#35373d',
  sidewalk: '#b9b3a4',
  curb: '#9a937f',
  line: '#e8e4d2',
  roof: ['#c96f4a', '#d9a441', '#7a9e7e', '#8a7fb8', '#b8576b', '#5b8db8', '#c9c2b0', '#a8b545'],
  roofDowntown: ['#5d6d7e', '#7e8c8d', '#6c7a89', '#85929e'],
  wall: '#e6ddc8',
};

export const PLAYER = {
  walkSpeed: 185,
  runSpeed: 305,
  radius: 13,
  health: 100,
  // How close the player must be to a car to steal it.
  stealRange: 46,
  // Pistol: damage, range, fire rate, magazine.
  gunDamage: 34,
  gunRange: 520,
  fireInterval: 0.22,
  magazine: 12,
  reloadTime: 1.1,
  bulletSpeed: 900,
};

export const CAR = {
  accel: 420,
  brake: 700,
  reverseAccel: 260,
  maxSpeed: 560,
  maxReverse: 180,
  steerRate: 2.6,
  drag: 0.55,
  grip: 6.5,
  radius: 26,
  health: 100,
  // Seconds a wrecked car burns before it is just a husk.
  burnTime: 8,
  // A sports car is quicker and grippier.
  sportsAccel: 560,
  sportsMaxSpeed: 680,
};

export const TRAFFIC = {
  count: 26,
  cruiseSpeed: 190,
  // How far ahead a traffic car looks for a car to avoid.
  lookAhead: 90,
};

export const PEDS = {
  count: 34,
  walkSpeed: 70,
  fleeSpeed: 210,
};

export const POLICE = {
  // Heat thresholds for each star (heat 0..100).
  starHeat: [0, 12, 30, 55, 78, 95],
  maxCars: 6,
  chaseSpeed: 620,
  // Seconds with no police line of sight before a star drops.
  coolDown: 9,
  // How close a cop must be, and for how long, to bust the player on foot.
  bustRange: 34,
  bustTime: 1.4,
  sightRange: 620,
};

export const MISSION_PAY = [300, 500, 800, 1200, 1500];
// The Long Haul gives Kai two and a half minutes for three stops.
export const MISSION_TIME_LIMIT = 150;
export const SAVE_KEY = 'solmara-save-v1';
export const BEST_KEY = 'solmara-best-v1';
