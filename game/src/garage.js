// Eddie's Garage, the shop: paint, engine tuning, armour plating and nitro
// tanks for Kai's own car — the blue sedan by the apartment. Everything
// here is bought with mission money and saved on its own, so a paint job
// survives quitting to the title screen. The menu opens on foot at the
// garage (G) and is clicked with the mouse; the world waits while you shop.
const GARAGE_KEY = 'solmara-garage-v1';
const MAX_NITRO = 5;

export const PAINTS = [
  { name: 'Ocean Blue', color: '#4f7ec9', price: 0 },
  { name: 'Sunset Red', color: '#d42a2a', price: 150 },
  { name: 'Palm Green', color: '#2e9e5b', price: 150 },
  { name: 'Sand Gold', color: '#d9a441', price: 150 },
  { name: 'Midnight', color: '#222222', price: 200 },
  { name: 'Bubblegum', color: '#e87fb0', price: 200 },
  { name: 'Cherry Blossom', color: '#f2a5c0', price: 250 },
  { name: 'Ocean Teal', color: '#1f8a8a', price: 250 },
  { name: 'Lime Rush', color: '#a8d420', price: 250 },
  { name: 'Royal Purple', color: '#6b3fa0', price: 250 },
];
export const ENGINE_PRICES = [300, 500, 800];
export const ARMOR_PRICES = [300, 500];
export const TIRES_PRICES = [250, 450];
export const NITRO_PRICE = 120;

/** Kai's garage record: what he owns, loaded from its own save slot. */
export function createGarage() {
  const owned = loadGarageData();
  return {
    paint: owned.paint || '#4f7ec9',
    paintsOwned: owned.paintsOwned || ['#4f7ec9'],
    engine: owned.engine || 0,
    armor: owned.armor || 0,
    tires: owned.tires || 0,
    nitro: owned.nitro || 0,
    open: false,
  };
}

function loadGarageData() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(GARAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return {};
    return data;
  } catch {
    return {};
  }
}

export function saveGarage(garage) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(GARAGE_KEY, JSON.stringify({
      paint: garage.paint,
      paintsOwned: garage.paintsOwned,
      engine: garage.engine,
      armor: garage.armor,
      tires: garage.tires,
      nitro: garage.nitro,
    }));
    return true;
  } catch {
    return false;
  }
}

/** Kai's own car — the sedan by the apartment — or null if it is gone. */
export function ownCar(state) {
  return state.cars.find((c) => c.isOwnCar) || null;
}

/** Every shelf item with its price and whether Kai already owns it. */
export function garageMenuItems(state) {
  const garage = state.garage;
  const items = [];
  for (const paint of PAINTS) {
    const owned = garage.paintsOwned.includes(paint.color);
    items.push({
      id: `garage-paint-${paint.color}`,
      label: owned
        ? (garage.paint === paint.color ? `✓ ${paint.name} (on the car)` : `${paint.name} (owned)`)
        : `${paint.name} paint — $${paint.price}`,
      price: paint.price,
      owned,
      enabled: owned || state.money >= paint.price,
    });
  }
  const nextEngine = ENGINE_PRICES[garage.engine];
  items.push({
    id: 'garage-engine',
    label: garage.engine >= ENGINE_PRICES.length
      ? '✓ Engine tuning — maxed out'
      : `Engine tuning Lv${garage.engine + 1} — $${nextEngine}`,
    price: nextEngine ?? 0,
    owned: garage.engine >= ENGINE_PRICES.length,
    enabled: garage.engine < ENGINE_PRICES.length && state.money >= (nextEngine ?? 0),
  });
  const nextArmor = ARMOR_PRICES[garage.armor];
  items.push({
    id: 'garage-armor',
    label: garage.armor >= ARMOR_PRICES.length
      ? '✓ Reinforced frame — maxed out'
      : `Reinforced frame Lv${garage.armor + 1} — $${nextArmor}`,
    price: nextArmor ?? 0,
    owned: garage.armor >= ARMOR_PRICES.length,
    enabled: garage.armor < ARMOR_PRICES.length && state.money >= (nextArmor ?? 0),
  });
  const nextTires = TIRES_PRICES[garage.tires];
  items.push({
    id: 'garage-tires',
    label: garage.tires >= TIRES_PRICES.length
      ? '✓ Racing tires — maxed out'
      : `Racing tires Lv${garage.tires + 1} — $${nextTires}`,
    price: nextTires ?? 0,
    owned: garage.tires >= TIRES_PRICES.length,
    enabled: garage.tires < TIRES_PRICES.length && state.money >= (nextTires ?? 0),
  });
  items.push({
    id: 'garage-nitro',
    label: `Nitro tank — $${NITRO_PRICE} (have ${garage.nitro}/${MAX_NITRO})`,
    price: NITRO_PRICE,
    owned: false,
    enabled: garage.nitro < MAX_NITRO && state.money >= NITRO_PRICE,
  });
  const car = state.cars ? ownCar(state) : null;
  items.push({
    id: 'garage-service',
    label: 'Full service — $80 (repair + wash)',
    price: 80,
    owned: false,
    enabled: !!car && car.state !== 'wreck' && state.money >= 80,
  });
  const unowned = PAINTS.filter((p) => !garage.paintsOwned.includes(p.color));
  items.push({
    id: 'garage-mystery',
    label: unowned.length === 0
      ? '✓ Mystery paint — every colour owned'
      : 'Mystery paint — $100 (a colour you do not own yet)',
    price: 100,
    owned: unowned.length === 0,
    enabled: unowned.length > 0 && state.money >= 100,
  });
  return items;
}

/** Buy one menu item: money out, mod on the car, saved at once. */
export function buyGarageItem(state, id) {
  const garage = state.garage;
  const car = ownCar(state);
  if (id.startsWith('garage-paint-')) {
    const color = id.slice('garage-paint-'.length);
    const paint = PAINTS.find((p) => p.color === color);
    if (!paint) return { ok: false, text: 'That paint is not on the shelf.' };
    if (!garage.paintsOwned.includes(color)) {
      if (state.money < paint.price) return { ok: false, text: `Not enough cash for ${paint.name}.` };
      state.money -= paint.price;
      garage.paintsOwned.push(color);
    }
    garage.paint = color;
    if (car && car.state !== 'wreck') car.color = color;
    saveGarage(garage);
    return { ok: true, text: `${paint.name} paint on the car.` };
  }
  if (id === 'garage-engine') {
    const price = ENGINE_PRICES[garage.engine];
    if (price === undefined) return { ok: false, text: 'Engine tuning is maxed out.' };
    if (state.money < price) return { ok: false, text: 'Not enough cash for the engine work.' };
    state.money -= price;
    garage.engine += 1;
    if (car) car.tune = garage.engine;
    saveGarage(garage);
    return { ok: true, text: `Engine tuning Lv${garage.engine} fitted — faster top speed.` };
  }
  if (id === 'garage-armor') {
    const price = ARMOR_PRICES[garage.armor];
    if (price === undefined) return { ok: false, text: 'The frame is as strong as it gets.' };
    if (state.money < price) return { ok: false, text: 'Not enough cash for the plating.' };
    state.money -= price;
    garage.armor += 1;
    if (car) {
      car.armor = garage.armor;
      car.maxHealth = 100 + 50 * garage.armor;
      car.health = Math.min(car.maxHealth, car.health + 50);
    }
    saveGarage(garage);
    return { ok: true, text: `Reinforced frame Lv${garage.armor} fitted — crashes hurt less.` };
  }
  if (id === 'garage-tires') {
    const price = TIRES_PRICES[garage.tires];
    if (price === undefined) return { ok: false, text: 'The tires are as grippy as they get.' };
    if (state.money < price) return { ok: false, text: 'Not enough cash for the tires.' };
    state.money -= price;
    garage.tires += 1;
    if (car) car.tires = garage.tires;
    saveGarage(garage);
    return { ok: true, text: `Racing tires Lv${garage.tires} fitted — higher top speed.` };
  }
  if (id === 'garage-nitro') {
    if (garage.nitro >= MAX_NITRO) return { ok: false, text: 'Nitro rack is full.' };
    if (state.money < NITRO_PRICE) return { ok: false, text: 'Not enough cash for nitro.' };
    state.money -= NITRO_PRICE;
    garage.nitro += 1;
    saveGarage(garage);
    return { ok: true, text: `Nitro tank loaded (${garage.nitro}/${MAX_NITRO}). Press N while driving to fire it.` };
  }
  if (id === 'garage-service') {
    if (state.money < 80) return { ok: false, text: 'Not enough cash for a full service.' };
    if (!car || car.state === 'wreck') return { ok: false, text: 'Your car is not here to service.' };
    state.money -= 80;
    car.health = car.maxHealth || 100;
    saveGarage(garage);
    return { ok: true, text: 'Full service done — back to showroom shine.' };
  }
  if (id === 'garage-mystery') {
    const unowned = PAINTS.filter((p) => !garage.paintsOwned.includes(p.color));
    if (unowned.length === 0) return { ok: false, text: 'You own every colour already.' };
    if (state.money < 100) return { ok: false, text: 'Not enough cash for a mystery paint.' };
    const pick = unowned[Math.floor((state.rng ? state.rng.next() : Math.random()) * unowned.length)];
    state.money -= 100;
    garage.paintsOwned.push(pick.color);
    garage.paint = pick.color;
    if (car && car.state !== 'wreck') car.color = pick.color;
    saveGarage(garage);
    return { ok: true, text: `Mystery paint: ${pick.name}! On the car.` };
  }
  return { ok: false, text: '' };
}

/** A menu click: close, or buy. Returns what the game should announce. */
export function handleGarageClick(state, id) {
  if (id === 'garage-close') {
    state.garage.open = false;
    return { handled: true, text: '' };
  }
  if (!id.startsWith('garage-')) return { handled: false, text: '' };
  const result = buyGarageItem(state, id);
  return { handled: true, text: result.text };
}

/**
 * After the physics step: the garage mods bite. Engine tuning adds speed
 * past the stock cap, armour refunds part of a crash, and a wrecked car
 * stays wrecked no matter how much plating it had.
 */
export function afterDrive(state, car, throttle, hit, dt) {
  if (!car || !car.isOwnCar) return;
  if (car.state === 'wreck') return;
  if ((car.tune > 0 || (car.tires || 0) > 0) && throttle > 0) {
    const cap = 560 + car.tune * 110 + (car.tires || 0) * 40;
    const push = (car.tune * 240 + (car.tires || 0) * 60) * dt;
    if (car.speed < cap) car.speed = Math.min(cap, car.speed + push);
  }
  if (hit > 0.15 && car.armor > 0) {
    const refund = hit * 22 * 0.35 * car.armor;
    car.health = Math.min(car.maxHealth || 100, car.health + refund);
  }
}

/** Fire a nitro tank while driving Kai's own car. False when it cannot. */
export function useNitro(state) {
  const garage = state.garage;
  const player = state.player;
  if (!player.car || !player.car.isOwnCar || garage.nitro <= 0) return false;
  const car = player.car;
  car.speed = Math.min(car.speed + 300, 920);
  garage.nitro -= 1;
  saveGarage(garage);
  return true;
}

/** The shop menu, drawn over the game while the world waits. */
export function drawGarage(ctx, state, w, h, drawButton) {
  const garage = state.garage;
  ctx.fillStyle = 'rgba(10, 14, 20, 0.78)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText("EDDIE'S GARAGE", w / 2, 90);
  ctx.fillStyle = '#fff';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText("Kai's ride, your money. Paint, tuning, plating, nitro.", w / 2, 126);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`Cash: $${state.money}   ·   Nitro: ${garage.nitro}/${MAX_NITRO}   ·   Engine Lv${garage.engine}   ·   Frame Lv${garage.armor}`, w / 2, 158);
  ctx.textAlign = 'left';
  const items = garageMenuItems(state);
  const bw = 460;
  const bh = 42;
  const bx = w / 2 - bw / 2;
  let by = 190;
  for (const item of items) {
    drawButton(item.id, item.label, bx, by, bw, bh, item.enabled);
    by += bh + 10;
  }
  drawButton('garage-close', 'BACK TO THE STREET', bx, by + 8, bw, bh, true);
  ctx.textAlign = 'left';
}
