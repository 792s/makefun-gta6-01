// Solmara, the city: a seeded grid of avenues and streets, blocks of
// buildings, a park, a beachfront along the south edge and docks along the
// east. The same seed always builds the same city. This file also answers the
// questions the game asks about the ground: is this water, is this a road,
// does this circle hit a building.
import { PALETTE, WORLD } from './config.js';

// Avenues (vertical roads) and streets (horizontal roads), centre lines.
export const ROAD_X = [300, 700, 1100, 1500, 1900, 2300, 2700, 3050];
export const ROAD_Y = [300, 700, 1100, 1500, 1900, 2220];
export const ROAD_W = 96;
export const ROAD_HALF = ROAD_W / 2;

// The park block: between avenues 1100 and 1500, streets 1100 and 1500.
const PARK = { x0: 1150, y0: 1150, x1: 1450, y1: 1450 };

export function generateCity(rng) {
  const buildings = [];
  const trees = [];
  const containers = [];
  const lamps = [];

  // Blocks: the rectangles between neighbouring roads.
  const xs = [100, ...ROAD_X.slice(0, -1), 2900];
  const ys = [100, ...ROAD_Y.slice(0, -1), 2150];
  for (let bx = 0; bx < xs.length - 1; bx += 1) {
    for (let by = 0; by < ys.length - 1; by += 1) {
      const x0 = xs[bx] + ROAD_HALF + 14;
      const x1 = xs[bx + 1] - ROAD_HALF - 14;
      const y0 = ys[by] + ROAD_HALF + 14;
      const y1 = ys[by + 1] - ROAD_HALF - 14;
      if (x1 - x0 < 60 || y1 - y0 < 60) continue;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      // The park: trees and paths, no buildings.
      if (cx > PARK.x0 && cx < PARK.x1 && cy > PARK.y0 && cy < PARK.y1) {
        for (let i = 0; i < 26; i += 1) {
          trees.push({ x: rng.range(x0 + 10, x1 - 10), y: rng.range(y0 + 10, y1 - 10), r: rng.range(9, 15) });
        }
        continue;
      }
      // Downtown: the blocks around the city centre get taller buildings.
      const downtown = Math.hypot(cx - 1500, cy - 1100) < 620;
      const count = rng.int(1, 3);
      const palette = downtown ? PALETTE.roofDowntown : PALETTE.roof;
      for (let i = 0; i < count; i += 1) {
        const w = rng.range(70, Math.min(150, (x1 - x0) / count - 8));
        const h = rng.range(60, Math.min(130, y1 - y0 - 16));
        const x = x0 + ((x1 - x0) / count) * i + rng.range(4, Math.max(4, (x1 - x0) / count - w - 4));
        const y = rng.range(y0 + 4, Math.max(y0 + 4, y1 - h - 4));
        buildings.push({
          x, y, w, h,
          color: rng.pick(palette),
          height: downtown ? rng.int(2, 3) : 1,
          // A roof detail: an AC box or a skylight.
          detail: rng.chance(0.6),
        });
      }
      // A few street trees on the block's edge.
      for (let i = 0; i < 3; i += 1) {
        if (rng.chance(0.7)) trees.push({ x: rng.range(x0, x1), y: y0 - 6, r: rng.range(7, 11) });
      }
    }
  }

  // The docks: warehouses, container stacks and cranes east of x = 2900.
  for (let i = 0; i < 4; i += 1) {
    buildings.push({
      x: 2930, y: 180 + i * 480, w: 150, h: 220,
      color: ['#8a9ba8', '#a8b8a0', '#b8a88a', '#9a8aa8'][i],
      height: 1, detail: false, warehouse: true,
    });
  }
  const containerColors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad'];
  for (let i = 0; i < 40; i += 1) {
    containers.push({
      x: rng.range(2920, 3120), y: rng.range(120, 2100),
      w: 44, h: 20, color: rng.pick(containerColors),
      angle: rng.chance(0.5) ? 0 : Math.PI / 2,
    });
  }

  // Street lamps along the avenues, for the night feel in the render.
  for (const x of ROAD_X) {
    for (let y = 200; y < 2100; y += 400) lamps.push({ x: x + ROAD_HALF - 6, y });
  }

  // Named places the missions and the HUD point at.
  const locations = {
    safehouse: { x: 520, y: 500, name: "Kai's Apartment" },
    veraOffice: { x: 1700, y: 900, name: "Vera's Office" },
    eddiesGarage: { x: 2500, y: 1700, name: "Eddie's Garage" },
    docksPickup: { x: 3050, y: 1450, name: 'Docks Pickup' },
    cometSpot: { x: 900, y: 1900, name: 'Comet GT' },
    policeStation: { x: 1500, y: 300, name: 'Solmara PD' },
    hospital: { x: 2300, y: 700, name: 'St. Mara Hospital' },
    park: { x: 1300, y: 1300, name: 'Palm Park' },
    beach: { x: 1600, y: 2240, name: 'Solmara Beach' },
    warehouse: { x: 3050, y: 300, name: 'North Warehouse' },
    market: { x: 900, y: 1500, name: 'Palm Market' },
  };

  return { buildings, trees, containers, lamps, locations, roadsX: ROAD_X, roadsY: ROAD_Y };
}

export function isWater(x, y) {
  return y >= WORLD.waterY || x < 0 || x > WORLD.width || y < 0 || y > WORLD.height;
}

export function isOnRoad(city, x, y) {
  for (const rx of city.roadsX) if (Math.abs(x - rx) <= ROAD_HALF && y >= 100 && y <= 2300) return true;
  for (const ry of city.roadsY) if (Math.abs(y - ry) <= ROAD_HALF && x >= 100 && x <= 3150) return true;
  return false;
}

/** Push a circle out of buildings, water and the world edge; returns the fixed position. */
export function collideCircle(city, x, y, r) {
  // World bounds (the sea is the south bound).
  x = Math.max(r, Math.min(WORLD.width - r, x));
  y = Math.max(r, Math.min(WORLD.waterY - r, y));
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      x = cx + (dx / d) * r;
      y = cy + (dy / d) * r;
    } else {
      // Dead centre of a building: push out the shortest way.
      const left = x - b.x + r;
      const right = b.x + b.w - x + r;
      const top = y - b.y + r;
      const bottom = b.y + b.h - y + r;
      const m = Math.min(left, right, top, bottom);
      if (m === left) x = b.x - r;
      else if (m === right) x = b.x + b.w + r;
      else if (m === top) y = b.y - r;
      else y = b.y + b.h + r;
    }
  }
  return { x, y };
}

/** A random point on a road, for spawning traffic. */
export function randomRoadPoint(rng, city) {
  if (rng.chance(0.5)) {
    const rx = rng.pick(city.roadsX);
    return { x: rx + rng.range(-ROAD_HALF + 14, ROAD_HALF - 14), y: rng.range(150, 2100) };
  }
  const ry = rng.pick(city.roadsY);
  return { x: rng.range(150, 2850), y: ry + rng.range(-ROAD_HALF + 14, ROAD_HALF - 14) };
}

/** A random point on a sidewalk (just off a road), for spawning pedestrians. */
export function randomSidewalkPoint(rng, city) {
  if (rng.chance(0.5)) {
    const rx = rng.pick(city.roadsX);
    const side = rng.chance(0.5) ? -1 : 1;
    return { x: rx + side * (ROAD_HALF + 10), y: rng.range(150, 2100) };
  }
  const ry = rng.pick(city.roadsY);
  const side = rng.chance(0.5) ? -1 : 1;
  return { x: rng.range(150, 2850), y: ry + side * (ROAD_HALF + 10) };
}

/** The nearest road centre and axis to a point, for traffic AI. */
export function nearestRoad(city, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of city.roadsX) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { axis: 'v', at: rx }; }
  }
  for (const ry of city.roadsY) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { axis: 'h', at: ry }; }
  }
  return best;
}
