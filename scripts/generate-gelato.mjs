// Generates public/data/gelato.csv: daily sales for "Gelateria Nebbia", a fictional
// five-shop London gelato chain, 2024–2025. Entirely invented, but shaped by rules so
// the data has stories to find. Seeded, so every run produces the same file.
// Run: node scripts/generate-gelato.mjs
// See docs/DATA.md for the planted stories and column meanings.

import { mkdirSync, writeFileSync } from 'node:fs';

const OUTPUT = new URL('../public/data/gelato.csv', import.meta.url);
const START = '2024-01-01';
const END = '2025-12-31';
const rand = mulberry32(20260924);

// --- the world -------------------------------------------------------------

const SHOPS = [
  // base: total scoops on a dry weekday at 20°C. sensitivity: how strongly heat drives sales.
  { name: 'Covent Garden', base: 420, sensitivity: 0.6, weekend: 1.35, rain: 0.8, pricePremium: 0.3 },
  { name: 'Hampstead Heath', base: 260, sensitivity: 1.15, weekend: 1.8, rain: 0.45, pricePremium: 0 },
  { name: 'Canary Wharf', base: 300, sensitivity: 0.7, weekend: 0.45, rain: 0.85, pricePremium: 0 },
  { name: 'Brixton', base: 230, sensitivity: 0.9, weekend: 1.4, rain: 0.7, pricePremium: 0 },
  { name: 'Richmond Riverside', base: 240, sensitivity: 1.25, weekend: 1.7, rain: 0.4, pricePremium: 0 },
];

const FLAVOURS = [
  // share: baseline popularity. tilt: share change per °C away from 18°C.
  { name: 'Pistachio', type: 'Gelato', share: 0.2, tilt: 0, pricePremium: 0.4 },
  { name: 'Stracciatella', type: 'Gelato', share: 0.18, tilt: 0 },
  { name: 'Dark Chocolate', type: 'Gelato', share: 0.17, tilt: -0.035 },
  { name: 'Salted Caramel', type: 'Gelato', share: 0.15, tilt: -0.02 },
  { name: 'Amalfi Lemon', type: 'Sorbet', share: 0.14, tilt: 0.05 },
  { name: 'Alphonso Mango', type: 'Sorbet', share: 0.16, tilt: 0.04 },
  { name: 'Earl Grey', type: 'Gelato', share: 0.1, tilt: -0.01, launched: '2025-05-01' },
];

const HEATWAVES = [
  ['2024-07-29', '2024-08-02', 3.5],
  ['2024-08-10', '2024-08-13', 3],
  ['2025-06-19', '2025-07-01', 8],
  ['2025-07-11', '2025-07-13', 4.5],
  ['2025-08-11', '2025-08-14', 4],
];
const COLD_SNAPS = [
  ['2024-01-15', '2024-01-19', -4],
  ['2025-01-08', '2025-01-12', -4],
];

const SCHOOL_HOLIDAYS = [ // approximate London term dates
  ['2024-01-01', '2024-01-03'], ['2024-02-12', '2024-02-16'], ['2024-03-29', '2024-04-12'],
  ['2024-05-27', '2024-05-31'], ['2024-07-23', '2024-09-03'], ['2024-10-28', '2024-11-01'],
  ['2024-12-23', '2025-01-03'], ['2025-02-17', '2025-02-21'], ['2025-04-07', '2025-04-21'],
  ['2025-05-26', '2025-05-30'], ['2025-07-23', '2025-09-02'], ['2025-10-27', '2025-10-31'],
  ['2025-12-22', '2025-12-31'],
];
const BANK_HOLIDAYS = new Set([
  '2024-01-01', '2024-03-29', '2024-04-01', '2024-05-06', '2024-05-27', '2024-08-26',
  '2024-12-25', '2024-12-26', '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-05',
  '2025-05-26', '2025-08-25', '2025-12-25', '2025-12-26',
]);
const CLOSED_ALL = new Set(['2024-12-25', '2025-12-25']);
const BRIXTON_REFIT = ['2025-02-03', '2025-02-23'];
const PRICE_RISE = '2025-04-01';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- generate --------------------------------------------------------------

const rows = [];
let anomaly = 0;

for (const date of eachDay(START, END)) {
  const d = new Date(`${date}T12:00:00Z`);
  const doy = dayOfYear(d);
  const weekday = WEEKDAYS[d.getUTCDay()];

  // Weather: seasonal climate + persistent random anomaly + planted spells.
  anomaly = 0.72 * anomaly + normal() * 1.8;
  const spell = spellOffset(date, HEATWAVES) + spellOffset(date, COLD_SNAPS);
  const climate = 15.9 + 7.8 * Math.sin((2 * Math.PI * (doy - 110)) / 365.25);
  const maxTemp = round(Math.min(35.5, Math.max(0, climate + anomaly + spell)), 1);

  const summer = doy > 120 && doy < 270;
  const wetChance = (summer ? 0.35 : 0.5) - 0.04 * (anomaly + spell);
  const rainMm = rand() < wetChance ? round(-Math.log(1 - rand()) * 4, 1) : 0;
  const sunnyChance = 1 / (1 + Math.exp(-(0.6 * (anomaly + spell) + (summer ? 0.3 : -0.3))));
  const weather = rainMm >= 1 ? 'Rain' : rand() < sunnyChance ? 'Sunny' : 'Cloudy';

  if (CLOSED_ALL.has(date)) continue;

  const weekend = weekday === 'Sat' || weekday === 'Sun';
  const bankHoliday = BANK_HOLIDAYS.has(date);
  const schoolHoliday = SCHOOL_HOLIDAYS.some(([a, b]) => date >= a && date <= b);
  const growth = date >= '2025-01-01' ? 1.06 : 1;
  const basePrice = date >= PRICE_RISE ? 3.95 : 3.6;

  // Flavour mix for the day, shifted by temperature.
  const flavours = FLAVOURS.filter((f) => !f.launched || date >= f.launched);
  const weights = flavours.map((f) => {
    let w = f.share * Math.exp(f.tilt * (maxTemp - 18));
    if (f.launched) w *= launchHype(date, f.launched);
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);

  for (const shop of SHOPS) {
    const refit = shop.name === 'Brixton' && date >= BRIXTON_REFIT[0] && date <= BRIXTON_REFIT[1];
    if (refit) continue;

    let demand = shop.base * growth;
    demand *= Math.max(0.15, 1 + shop.sensitivity * (heatResponse(maxTemp) - 1));
    if (weekend || bankHoliday) demand *= shop.weekend;
    if (weather === 'Rain') demand *= shop.rain;
    else if (weather === 'Sunny') demand *= 1.12;
    if (schoolHoliday) demand *= shop.name === 'Canary Wharf' ? 0.9 : 1.15;
    if (shop.name === 'Covent Garden' && date.slice(5, 7) === '12' && date < `${date.slice(0, 4)}-12-25`) {
      demand *= 1.3; // Christmas crowds
    }
    if (shop.name === 'Brixton' && date > BRIXTON_REFIT[1] && daysBetween(BRIXTON_REFIT[1], date) <= 7) {
      demand *= 1.25; // reopening week
    }
    demand *= Math.exp(normal() * 0.12);

    flavours.forEach((f, i) => {
      const scoops = Math.max(0, Math.round(demand * (weights[i] / total) * Math.exp(normal() * 0.1)));
      const price = basePrice + shop.pricePremium + (f.pricePremium ?? 0);
      rows.push({
        date,
        weekday,
        shop: shop.name,
        flavour: f.name,
        flavour_type: f.type,
        scoops,
        revenue_gbp: round(scoops * price, 2),
        max_temp_c: maxTemp,
        rain_mm: rainMm,
        weather,
        school_holiday: schoolHoliday ? 'Yes' : 'No',
        bank_holiday: bankHoliday ? 'Yes' : 'No',
      });
    });
  }
}

mkdirSync(new URL('.', OUTPUT), { recursive: true });
writeFileSync(OUTPUT, toCsv(rows));
console.log(`Wrote ${rows.length} rows to ${OUTPUT.pathname}`);

// --- model pieces ----------------------------------------------------------

// Sales multiplier vs temperature: flat in the cold, steep from 15–28°C,
// then dipping slightly above 31°C ("too hot to queue").
function heatResponse(t) {
  const s = 0.25 + 1.75 / (1 + Math.exp(-(t - 21) / 3.2));
  return t > 31 ? s * (1 - 0.04 * (t - 31)) : s;
}

function launchHype(date, launched) {
  const days = daysBetween(launched, date);
  return 1 + 0.8 * Math.exp(-days / 10);
}

function spellOffset(date, spells) {
  for (const [a, b, peak] of spells) {
    if (date < a || date > b) continue;
    const len = daysBetween(a, b) + 1;
    const pos = daysBetween(a, date) + 1;
    return peak * Math.sin((Math.PI * pos) / (len + 1)); // ramps up, peaks, eases off
  }
  return 0;
}

// --- utilities -------------------------------------------------------------

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal() {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function* eachDay(from, to) {
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

function dayOfYear(d) {
  return Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86_400_000);
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

function round(n, places) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function toCsv(records) {
  const keys = Object.keys(records[0]);
  return [keys.join(','), ...records.map((r) => keys.map((k) => r[k]).join(','))].join('\n') + '\n';
}
