// Builds public/data/bikes.csv from TfL Santander Cycles journey data.
// Powered by TfL Open Data. See docs/DATA.md for source, licence and columns.
//
// Usage:
//   1. Download one or more weekly "JourneyDataExtract" CSVs from
//      https://cycling.data.tfl.gov.uk/ (usage-stats folder) into data-raw/
//   2. node scripts/prepare-bikes.mjs data-raw/*.csv
//
// Station coordinates come from TfL's BikePoint API. If it can't be reached,
// the file is still built, with the coordinate columns left blank.
// Set TFL_APP_KEY in the environment if you have one (optional).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUTPUT = new URL('../public/data/bikes.csv', import.meta.url);
const TARGET_ROWS = 25_000; // keeps the file comfortably under the app's 5 MB limit
const SEED = 20260924;

const REQUIRED = [
  'Start date', 'Start station number', 'Start station',
  'End station number', 'End station', 'Bike model', 'Total duration (ms)',
];
const BIKE_TYPES = { CLASSIC: 'Classic', PBSC_EBIKE: 'E-bike' };
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Pass one or more journey CSV files, e.g. node scripts/prepare-bikes.mjs data-raw/*.csv');
  process.exit(1);
}

// --- read and clean journeys ----------------------------------------------

const journeys = [];
let dropped = 0;

for (const file of files) {
  const [header, ...rows] = parseCsv(readFileSync(file, 'utf8'));
  const missing = REQUIRED.filter((name) => !header.includes(name));
  if (missing.length) {
    console.error(`${file}: unexpected format, missing columns: ${missing.join(', ')}`);
    console.error('This script expects the journey extract format TfL has used since late 2022.');
    process.exit(1);
  }
  const col = Object.fromEntries(header.map((name, i) => [name, i]));

  for (const r of rows) {
    const durationMs = Number(r[col['Total duration (ms)']]);
    const startNo = r[col['Start station number']];
    const endNo = r[col['End station number']];
    // Drop false starts (under a minute, returned to the same dock) and bikes out over 24 hours.
    if (!Number.isFinite(durationMs) || durationMs > 86_400_000 ||
        (durationMs < 60_000 && startNo === endNo)) { dropped++; continue; }
    journeys.push({
      start: r[col['Start date']], // "YYYY-MM-DD HH:MM", London local time
      startNo,
      startName: tidyName(r[col['Start station']]),
      endNo,
      endName: tidyName(r[col['End station']]),
      model: r[col['Bike model']],
      durationMs,
    });
  }
}

// --- sample to a manageable size (seeded, so reruns match) ----------------

const rand = mulberry32(SEED);
const rate = Math.min(1, TARGET_ROWS / journeys.length);
const sample = journeys.filter(() => rand() < rate).sort((a, b) => a.start.localeCompare(b.start));

// --- station coordinates ---------------------------------------------------

const coords = await loadStationCoords();

const rows = sample.map((j) => {
  const [date, time] = j.start.split(' ');
  const d = new Date(`${date}T12:00:00Z`);
  const weekday = WEEKDAYS[d.getUTCDay()];
  const s = coords.get(j.startNo) ?? coords.get(nameKey(j.startName));
  const e = coords.get(j.endNo) ?? coords.get(nameKey(j.endName));
  return {
    start_time: `${date}T${time}`,
    date,
    weekday,
    day_type: weekday === 'Sat' || weekday === 'Sun' ? 'Weekend' : 'Weekday',
    hour: Number(time.slice(0, 2)),
    season: season(Number(date.slice(5, 7))),
    start_station: j.startName,
    start_area: area(j.startName),
    start_lat: s?.lat ?? '',
    start_lon: s?.lon ?? '',
    end_station: j.endName,
    end_area: area(j.endName),
    end_lat: e?.lat ?? '',
    end_lon: e?.lon ?? '',
    round_trip: j.startNo === j.endNo ? 'Yes' : 'No',
    duration_min: Math.round(j.durationMs / 6_000) / 10,
    bike_type: BIKE_TYPES[j.model] ?? titleCase(j.model),
  };
});

mkdirSync(new URL('.', OUTPUT), { recursive: true });
writeFileSync(OUTPUT, toCsv(rows));

const located = rows.filter((r) => r.start_lat !== '').length;
console.log(`Read ${journeys.length + dropped} journeys from ${files.length} file(s); dropped ${dropped} false starts / overlong hires.`);
console.log(`Sampled 1 in ${(1 / rate).toFixed(1)} → wrote ${rows.length} rows to ${OUTPUT.pathname}`);
console.log(`Start coordinates found for ${((100 * located) / Math.max(1, rows.length)).toFixed(1)}% of rows.`);

// --- helpers ---------------------------------------------------------------

async function loadStationCoords() {
  const map = new Map();
  const key = process.env.TFL_APP_KEY ? `?app_key=${process.env.TFL_APP_KEY}` : '';
  try {
    const res = await fetch(`https://api.tfl.gov.uk/BikePoint${key}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    for (const p of await res.json()) {
      const point = { lat: round(p.lat, 4), lon: round(p.lon, 4) };
      const terminal = p.additionalProperties?.find((x) => x.key === 'TerminalName')?.value;
      if (terminal) map.set(terminal, point);
      map.set(nameKey(tidyName(p.commonName)), point);
    }
  } catch (err) {
    console.warn(`Could not load station coordinates (${err.message}); coordinate columns left blank.`);
  }
  return map;
}

function tidyName(s) {
  return decodeEntities(s).replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();
}

function nameKey(s) {
  return `name:${s.toLowerCase()}`;
}

function area(stationName) {
  const i = stationName.lastIndexOf(',');
  return i === -1 ? stationName : stationName.slice(i + 1).trim();
}

function season(month) {
  if (month <= 2 || month === 12) return 'Winter';
  if (month <= 5) return 'Spring';
  if (month <= 8) return 'Summer';
  return 'Autumn';
}

function titleCase(s) {
  return s.toLowerCase().replace(/(^|[\s_])\w/g, (m) => m.toUpperCase()).replace(/_/g, ' ');
}

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function round(n, places) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseCsv(text) {
  const out = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); out.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); out.push(row); }
  return out.filter((r) => r.length > 1 || r[0] !== '');
}

function toCsv(records) {
  const keys = Object.keys(records[0]);
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...records.map((r) => keys.map((k) => cell(r[k])).join(','))].join('\n') + '\n';
}
