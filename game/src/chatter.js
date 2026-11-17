// Pedestrian chatter: Solmara talks back. Every few seconds a passer-by
// near Kai gets something to say — tourists, fishermen, office workers,
// cops, kids — and a little speech bubble floats over their head for a
// few seconds. It is all flavour: nobody changes what they are doing,
// they just have something to say about this town.
const CHATTER_RANGE = 320;
const CHATTER_SHOW_SECONDS = 4;
const CHATTER_MIN_GAP = 7;
const CHATTER_MAX_GAP = 13;

const LINES = [
  'Tourist: Is the beach always this hot?',
  'Fisherman: The tide was better before the new pier.',
  'Office worker: I have been stuck in traffic since eight.',
  'Cop: Move along, nothing to see here.',
  'Kid: Dad says the Comet GT goes faster than a plane.',
  'Tourist: Do you know where Vera Solano lives? Asking for a friend.',
  'Fisherman: Caught a fish this big once. Nobody believed me.',
  'Office worker: My boss thinks I am at a meeting.',
  'Cop: You look like trouble. Keep walking.',
  'Kid: When I grow up I want to drive a taxi.',
  'Tourist: This city smells like salt and gasoline.',
  'Fisherman: The docks are quiet tonight. Too quiet.',
  'Office worker: Rent went up again. Of course it did.',
  'Cop: Papers, please. Just kidding. Mostly.',
  'Kid: My brother says the beach crew runs this town.',
  'Tourist: Is that a real palm tree or a fake one?',
  'Fisherman: The ferry captain owes me twenty bucks.',
  'Office worker: I would kill for a coffee right now.',
  'Cop: No loitering. Yes, that includes you.',
  'Kid: I saw a race last night! The red car won!',
  'Tourist: The sunset here is worth the flight alone.',
  'Fisherman: Storm coming. My knee says so.',
  'Office worker: If my phone rings one more time…',
  'Kid: Mum says never take rides from strangers.',
];

/** Nobody talking yet, and the next line is a few seconds away. */
export function createChatter() {
  return {
    active: null, // { ped, text, left }
    nextIn: 5,
  };
}

/** The line on screen right now, or null. */
export function chatterLine(state) {
  if (!state.chatter.active) return null;
  return state.chatter.active.text;
}

function pickLine(state) {
  return LINES[Math.floor(state.rng.next() * LINES.length)];
}

/**
 * One fixed step: count down to the next line, then give it to a random
 * pedestrian near Kai. The line fades after a few seconds. Returns events.
 */
export function updateChatter(state, dt) {
  const events = [];
  const chatter = state.chatter;
  if (chatter.active) {
    chatter.active.left -= dt;
    if (chatter.active.left <= 0) chatter.active = null;
    return events;
  }
  chatter.nextIn -= dt;
  if (chatter.nextIn > 0) return events;
  chatter.nextIn = CHATTER_MIN_GAP + state.rng.next() * (CHATTER_MAX_GAP - CHATTER_MIN_GAP);
  const player = state.player;
  const nearby = state.peds.filter(
    (ped) => Math.hypot(ped.x - player.x, ped.y - player.y) < CHATTER_RANGE,
  );
  if (nearby.length === 0) return events;
  const ped = nearby[Math.floor(state.rng.next() * nearby.length)];
  chatter.active = { ped, text: pickLine(state), left: CHATTER_SHOW_SECONDS };
  return events;
}

/** The speech bubble over the talking pedestrian, in world space. */
export function drawChatter(ctx, state) {
  const active = state.chatter.active;
  if (!active) return;
  const ped = active.ped;
  const text = active.text;
  ctx.font = '13px system-ui, sans-serif';
  const width = ctx.measureText(text).width + 18;
  const x = ped.x - width / 2;
  const y = ped.y - 52;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.fillRect(x, y, width, 24);
  ctx.strokeRect(x, y, width, 24);
  ctx.beginPath();
  ctx.moveTo(ped.x - 6, y + 24);
  ctx.lineTo(ped.x + 6, y + 24);
  ctx.lineTo(ped.x, y + 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillText(text, x + 9, y + 16);
}
