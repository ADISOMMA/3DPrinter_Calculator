// Preset stampanti e filamenti.
// Prezzi in EUR indicativi (street price UE fine 2025/2026) e consumi medi in stampa PLA.
// Sono valori di partenza: l'utente può modificarli prima del calcolo.
// power = consumo medio in stampa (W), non il picco dell'alimentatore.
// life  = ore di vita utile stimate prima che la stampante sia "ammortizzata".
// maint = manutenzione/consumabili in €/ora (ugelli, piatti, cinghie, PTFE, lubrificanti).

const PRINTERS = [
  { id: "generic",        brand: "Generica",  name: "Stampante FDM generica",  price: 350,  power: 120, life: 5000, maint: 0.03 },
  { id: "bambu-a1mini",   brand: "Bambu Lab", name: "A1 mini",                 price: 249,  power: 80,  life: 4000, maint: 0.03 },
  { id: "bambu-a1",       brand: "Bambu Lab", name: "A1",                      price: 349,  power: 95,  life: 4000, maint: 0.03 },
  { id: "bambu-p1s",      brand: "Bambu Lab", name: "P1S",                     price: 499,  power: 110, life: 5000, maint: 0.03 },
  { id: "bambu-p2s",      brand: "Bambu Lab", name: "P2S",                     price: 599,  power: 120, life: 5000, maint: 0.03 },
  { id: "bambu-x1c",      brand: "Bambu Lab", name: "X1 Carbon",               price: 1199, power: 110, life: 6000, maint: 0.04 },
  { id: "bambu-h2s",      brand: "Bambu Lab", name: "H2S",                     price: 1299, power: 180, life: 6000, maint: 0.04 },
  { id: "bambu-h2c",      brand: "Bambu Lab", name: "H2C",                     price: 2099, power: 200, life: 6000, maint: 0.05 },
  { id: "bambu-h2d",      brand: "Bambu Lab", name: "H2D",                     price: 1899, power: 200, life: 6000, maint: 0.05 },
  { id: "prusa-mk4s",     brand: "Prusa",     name: "MK4S",                    price: 1099, power: 80,  life: 8000, maint: 0.03 },
  { id: "prusa-coreone",  brand: "Prusa",     name: "Core One",                price: 1199, power: 120, life: 8000, maint: 0.03 },
  { id: "creality-ender3v3se", brand: "Creality", name: "Ender-3 V3 SE",       price: 179,  power: 110, life: 3000, maint: 0.03 },
  { id: "creality-k1c",   brand: "Creality",  name: "K1C",                     price: 399,  power: 130, life: 4000, maint: 0.03 },
  { id: "creality-k2plus",brand: "Creality",  name: "K2 Plus",                 price: 1299, power: 250, life: 6000, maint: 0.05 },
  { id: "elegoo-cc",      brand: "Elegoo",    name: "Centauri Carbon",         price: 299,  power: 120, life: 4000, maint: 0.03 },
  { id: "anycubic-kobra3",brand: "Anycubic",  name: "Kobra 3 Combo",           price: 349,  power: 120, life: 4000, maint: 0.03 },
  { id: "qidi-plus4",     brand: "Qidi",      name: "Plus4",                   price: 769,  power: 200, life: 5000, maint: 0.04 },
  { id: "sovol-sv06",     brand: "Sovol",     name: "SV06",                    price: 229,  power: 100, life: 3000, maint: 0.03 },
];

// price = €/kg indicativo, spool = grammi per bobina (solo informativo)
const FILAMENTS = [
  { id: "gen-pla",     brand: "Generico",  name: "PLA",            type: "PLA",   price: 18 },
  { id: "gen-plaplus", brand: "Generico",  name: "PLA+",           type: "PLA",   price: 21 },
  { id: "gen-plawood", brand: "Generico",  name: "PLA Legno (Wood fill)", type: "PLA", price: 28 },
  { id: "gen-petg",    brand: "Generico",  name: "PETG",           type: "PETG",  price: 19 },
  { id: "gen-abs",     brand: "Generico",  name: "ABS",            type: "ABS",   price: 20 },
  { id: "gen-asa",     brand: "Generico",  name: "ASA",            type: "ASA",   price: 24 },
  { id: "gen-tpu",     brand: "Generico",  name: "TPU 95A",        type: "TPU",   price: 28 },
  { id: "gen-silk",    brand: "Generico",  name: "PLA Silk",       type: "PLA",   price: 22 },
  { id: "gen-placf",   brand: "Generico",  name: "PLA-CF",         type: "PLA-CF",price: 30 },
  { id: "gen-petgcf",  brand: "Generico",  name: "PETG-CF",        type: "PETG-CF",price: 32 },
  { id: "gen-pacf",    brand: "Generico",  name: "PA-CF (Nylon)",  type: "PA-CF", price: 60 },
  { id: "gen-pa",      brand: "Generico",  name: "Nylon (PA)",     type: "PA",    price: 45 },
  { id: "gen-pc",      brand: "Generico",  name: "PC",             type: "PC",    price: 35 },
  { id: "bambu-pla-basic", brand: "Bambu Lab", name: "PLA Basic",  type: "PLA",   price: 20 },
  { id: "bambu-pla-matte", brand: "Bambu Lab", name: "PLA Matte",  type: "PLA",   price: 20 },
  { id: "bambu-pla-sparkle", brand: "Bambu Lab", name: "PLA Sparkle", type: "PLA", price: 28 },
  { id: "bambu-petg-hf",   brand: "Bambu Lab", name: "PETG HF",    type: "PETG",  price: 20 },
  { id: "bambu-abs",       brand: "Bambu Lab", name: "ABS",        type: "ABS",   price: 21 },
  { id: "bambu-tpu",       brand: "Bambu Lab", name: "TPU for AMS",type: "TPU",   price: 40 },
  { id: "prusament-pla",   brand: "Prusament", name: "PLA",        type: "PLA",   price: 30 },
  { id: "prusament-petg",  brand: "Prusament", name: "PETG",       type: "PETG",  price: 30 },
  { id: "polymaker-polyterra", brand: "Polymaker", name: "PolyTerra PLA", type: "PLA", price: 21 },
  { id: "polymaker-plapro",    brand: "Polymaker", name: "PolyLite PLA Pro", type: "PLA", price: 24 },
  { id: "esun-plaplus",    brand: "eSun",      name: "PLA+",       type: "PLA",   price: 19 },
  { id: "sunlu-pla",       brand: "Sunlu",     name: "PLA",        type: "PLA",   price: 15 },
  { id: "sunlu-petg",      brand: "Sunlu",     name: "PETG",       type: "PETG",  price: 16 },
  { id: "elegoo-pla",      brand: "Elegoo",    name: "PLA",        type: "PLA",   price: 15 },
  { id: "elegoo-petg",     brand: "Elegoo",    name: "PETG",       type: "PETG",  price: 16 },
  { id: "creality-hyperpla", brand: "Creality", name: "Hyper PLA", type: "PLA",   price: 17 },
  { id: "filoalfa-pla",    brand: "FILOALFA",  name: "ALFA+ PLA",  type: "PLA",   price: 28 },
  { id: "fiberlogy-easypla", brand: "Fiberlogy", name: "Easy PLA", type: "PLA",   price: 25 },
];

// Fasce sconto quantità di default: da "min" pezzi in su -> "pct" %
const DEFAULT_DISCOUNTS = [
  { min: 1,  pct: 0 },
  { min: 5,  pct: 5 },
  { min: 10, pct: 10 },
  { min: 25, pct: 15 },
  { min: 50, pct: 20 },
];

// Componenti aggiuntivi di default (quantità per pezzo, 0 = non usato)
const DEFAULT_EXTRAS = [
  { name: "Magnete 6x2 mm",       cost: 0.10, qty: 0 },
  { name: "LED 5 mm",             cost: 0.30, qty: 0 },
  { name: "Pulsante / tasto",     cost: 0.50, qty: 0 },
  { name: "Vite M3x10",           cost: 0.10, qty: 0 },
  { name: "Inserto filettato M3", cost: 0.15, qty: 0 },
];
