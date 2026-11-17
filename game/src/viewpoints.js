// Scenic viewpoints: six postcard spots around Solmara — the beach at
// sunset, the crane over the docks, the park at noon. Stand on foot at a
// glowing camera marker and press F to take the shot: fifty dollars a
// photo, and the set is only complete when all six are in the album.
// The spots are marked, but only when Kai is close enough to notice.
import { dayPhase } from './daynight.js';

const VIEW_REWARD = 50;
const VIEW_RANGE = 60;
const REVEAL_RANGE = 600;

const SPOTS = [
  { x: 500, y: 2260, name: 'Sunset Beach' },
  { x: 3050, y: 500, name: 'Docks Crane' },
  { x: 700, y: 1000, name: 'Palm Park' },
  { x: 1600, y: 1100, name: 'Downtown Overlook' },
  { x: 2900, y: 2200, name: 'Harbor Light' },
  { x: 2400, y: 800, name: 'Rooftop View' },
];

/** Six postcards to take, none in the album yet. */
export function createViewpoints() {
  return {
    spots: SPOTS.map((spot) => ({ x: spot.x, y: spot.y, name: spot.name, found: false })),
    found: 0,
  };
}

export function viewpointCount(state) {
  return state.viewpoints.spots.length;
}

/** "Views 2/6" once the album has started, null before that. */
export function viewpointsLabel(state) {
  if (state.viewpoints.found === 0) return null;
  return `Views ${state.viewpoints.found}/${state.viewpoints.spots.length}`;
}

/** The nearest unfound viewpoint the player is standing on, or null. */
function spotUnderfoot(state) {
  const player = state.player;
  for (const spot of state.viewpoints.spots) {
    if (spot.found) continue;
    if (Math.hypot(spot.x - player.x, spot.y - player.y) < VIEW_RANGE) return spot;
  }
  return null;
}

/**
 * One fixed step: on foot, F takes the shot at a viewpoint. Returns
 * events for sound and toasts. F anywhere else just says there is no
 * view here, so the player learns to look for the glowing markers.
 */
export function updateViewpoints(state, dt, photoPressed) {
  void dt;
  const events = [];
  if (!photoPressed) return events;
  const player = state.player;
  if (player.state !== 'foot') {
    events.push({ type: 'toast', text: 'Get out of the car to take a photo.' });
    return events;
  }
  const spot = spotUnderfoot(state);
  if (!spot) {
    events.push({ type: 'toast', text: 'No view here — look for a glowing camera marker.' });
    return events;
  }
  spot.found = true;
  state.viewpoints.found += 1;
  // Golden hour doubles the price: a dusk shot sells twice as well.
  const golden = state.daynight && dayPhase(state.daynight) === 'dusk';
  const reward = golden ? VIEW_REWARD * 2 : VIEW_REWARD;
  state.money += reward;
  events.push({ type: 'cash' });
  events.push({
    type: 'toast',
    text: `${spot.name} — photo sold! +$${reward}${golden ? ' (golden hour!)' : ''} (${state.viewpoints.found}/${state.viewpoints.spots.length})`,
  });
  // The full album pays a bonus on top of the six photos.
  if (state.viewpoints.found === state.viewpoints.spots.length) {
    state.money += 300;
    events.push({ type: 'cash' });
    events.push({ type: 'toast', text: 'Album complete! All six views — bonus $300' });
  }
  return events;
}

/** The camera markers, glowing faintly — only when Kai is close enough. */
export function drawViewpoints(ctx, state) {
  const player = state.player;
  for (const spot of state.viewpoints.spots) {
    if (spot.found) continue;
    if (Math.hypot(spot.x - player.x, spot.y - player.y) > REVEAL_RANGE) continue;
    const pulse = 0.5 + Math.sin(state.time * 3 + spot.y) * 0.2;
    ctx.fillStyle = `rgba(255, 217, 77, ${pulse * 0.25})`;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 24, 0, Math.PI * 2);
    ctx.fill();
    // A little camera: body, lens, and a flash bump on top.
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(spot.x - 12, spot.y - 8, 24, 16);
    ctx.fillStyle = '#9ecfff';
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(spot.x + 4, spot.y - 12, 6, 4);
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(spot.name, spot.x - 34, spot.y + 26);
  }
}
