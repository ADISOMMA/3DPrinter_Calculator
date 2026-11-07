"use strict";

/* ============================================================
   Calcolatore Costi Stampa 3D – logica
   ============================================================ */

const LS_STATE = "c3d.state.v1";
const LS_QUOTES = "c3d.quotes.v1";
const LS_CUSTOM_PRINTERS = "c3d.customPrinters.v1";
const LS_CUSTOM_FILAMENTS = "c3d.customFilaments.v1";
const LS_OPEN = "c3d.openSections.v1";
const LS_THEME = "c3d.theme";

const $ = (id) => document.getElementById(id);
const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const fmt = (n) => (Number.isFinite(n) ? eur.format(n) : "–");
const pct = (n) => (Number.isFinite(n) ? (n * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 }) + "%" : "–");
const num = (id) => {
  const v = parseFloat(String($(id).value).replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

// Campi numerici/testuali semplici salvati nello stato
const FIELDS = [
  "jobName", "qty", "perPlate", "hours", "minutes",
  "pPrice", "pPower", "pLife", "pMaint",
  "waste", "kwh", "failRate", "laborRate", "prepMin", "postMin",
  "orderFixed", "designFee", "rushFee",
  "markup", "feePct", "feeFixed", "vat", "minOrder", "rounding",
  "friendMarkup",
];
// Checkbox salvate nello stato
const CHECKS = ["friendMode", "friendLabor"];

function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch { return fallback; }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let customPrinters = loadJSON(LS_CUSTOM_PRINTERS, []);
let customFilaments = loadJSON(LS_CUSTOM_FILAMENTS, []);
let discounts = [];
let extras = [];       // { name, cost, qty }
let filamentRows = []; // { id, price, grams }

const allPrinters = () => [...customPrinters, ...PRINTERS];
const allFilaments = () => [...customFilaments, ...FILAMENTS];
const findPrinter = (id) => allPrinters().find((p) => p.id === id);
const findFilament = (id) => allFilaments().find((f) => f.id === id);

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
}

/* ---------- Select builders ---------- */
function buildGroupedOptions(select, items, selectedId) {
  select.innerHTML = "";
  const groups = new Map();
  for (const it of items) {
    const g = it.custom ? "⭐ Personalizzati" : it.brand;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(it);
  }
  for (const [g, list] of groups) {
    const og = document.createElement("optgroup");
    og.label = g;
    for (const it of list) {
      const o = document.createElement("option");
      o.value = it.id;
      o.textContent = it.custom ? it.name : `${it.brand} ${it.name}`;
      if (it.id === selectedId) o.selected = true;
      og.appendChild(o);
    }
    select.appendChild(og);
  }
}

function renderPrinterSelect(selectedId) {
  buildGroupedOptions($("printerSel"), allPrinters(), selectedId);
  updateDelPrinterBtn();
}

function applyPrinter(id) {
  const p = findPrinter(id);
  if (!p) return;
  $("pPrice").value = p.price;
  $("pPower").value = p.power;
  $("pLife").value = p.life;
  $("pMaint").value = p.maint;
}

function updateDelPrinterBtn() {
  const p = findPrinter($("printerSel").value);
  $("delPrinter").classList.toggle("hidden", !(p && p.custom));
}

/* ---------- Filamenti ---------- */
function renderFilaments() {
  const box = $("filaments");
  box.innerHTML = "";
  filamentRows.forEach((row, i) => {
    const div = document.createElement("div");
    div.className = "fil-row";
    div.innerHTML = `
      <label class="field fil-sel"><span class="lab">Filamento${filamentRows.length > 1 ? " " + (i + 1) : ""}</span>
        <select></select>
      </label>
      <label class="field"><span class="lab">Prezzo</span>
        <span class="ctl"><input type="number" inputmode="decimal" min="0" step="0.5" class="fil-price"><span class="u">€/kg</span></span>
      </label>
      <label class="field"><span class="lab">Per piatto</span>
        <span class="ctl"><input type="number" inputmode="decimal" min="0" step="0.1" class="fil-grams"><span class="u">g</span></span>
      </label>
      <div class="fil-btns">
        <button type="button" class="icon-btn" title="Salva come filamento personalizzato" aria-label="Salva come filamento personalizzato">${icon("save")}</button>
        <button type="button" class="icon-btn danger" title="Rimuovi riga" aria-label="Rimuovi riga">${icon("x")}</button>
      </div>`;
    const sel = div.querySelector("select");
    buildGroupedOptions(sel, allFilaments(), row.id);
    const price = div.querySelector(".fil-price");
    const grams = div.querySelector(".fil-grams");
    price.value = row.price;
    grams.value = row.grams;

    sel.addEventListener("change", () => {
      row.id = sel.value;
      const f = findFilament(row.id);
      if (f) { row.price = f.price; price.value = f.price; }
      update();
    });
    price.addEventListener("input", () => { row.price = parseFloat(price.value) || 0; update(); });
    grams.addEventListener("input", () => { row.grams = parseFloat(grams.value) || 0; update(); });

    const [saveBtn, delBtn] = div.querySelectorAll(".fil-btns button");
    const cur = findFilament(row.id);
    if (cur && cur.custom) {
      // filamento personalizzato selezionato: il pulsante diventa "elimina dalla lista"
      saveBtn.innerHTML = icon("trash");
      saveBtn.classList.add("danger");
      saveBtn.title = "Elimina questo filamento personalizzato dalla lista";
      saveBtn.setAttribute("aria-label", saveBtn.title);
      saveBtn.addEventListener("click", () => {
        if (!confirm(`Eliminare "${cur.name}" dai filamenti personalizzati?`)) return;
        customFilaments = customFilaments.filter((c) => c.id !== cur.id);
        saveJSON(LS_CUSTOM_FILAMENTS, customFilaments);
        for (const r of filamentRows) if (r.id === cur.id) r.id = genericForType(cur.type);
        renderFilaments(); update();
      });
    } else {
      saveBtn.addEventListener("click", () => saveCustomFilament(row));
    }
    delBtn.addEventListener("click", () => {
      if (filamentRows.length === 1) { row.grams = 0; renderFilaments(); update(); return; }
      filamentRows.splice(i, 1);
      renderFilaments();
      update();
    });
    box.appendChild(div);
  });
}

function addFilamentRow(id = "gen-pla", grams = 0, price) {
  const f = findFilament(id) || findFilament("gen-pla");
  filamentRows.push({ id: f.id, price: price ?? f.price, grams });
}

function saveCustomFilament(row) {
  const base = findFilament(row.id);
  const name = prompt("Nome del filamento personalizzato (es. 'Sunlu PLA Meta nero'):", base ? `${base.brand} ${base.name}` : "");
  if (!name) return;
  const id = "custom-f-" + Date.now();
  customFilaments.push({ id, brand: "Personalizzato", name: name.trim(), type: base?.type || "", price: row.price, custom: true });
  saveJSON(LS_CUSTOM_FILAMENTS, customFilaments);
  row.id = id;
  renderFilaments();
  update();
  toast("Filamento salvato");
}

/* ---------- Sconti ---------- */
function renderDiscounts() {
  const tb = $("discounts");
  tb.innerHTML = "";
  discounts.forEach((d, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="ctl"><input type="number" inputmode="numeric" min="1" step="1" value="${d.min}" aria-label="Da pezzi"><span class="u">pz</span></span></td>
      <td><span class="ctl"><input type="number" inputmode="decimal" min="0" max="90" step="0.5" value="${d.pct}" aria-label="Sconto"><span class="u">%</span></span></td>
      <td><button type="button" class="icon-btn danger" title="Rimuovi fascia" aria-label="Rimuovi fascia">${icon("x")}</button></td>`;
    const [minI, pctI] = tr.querySelectorAll("input");
    minI.addEventListener("input", () => { d.min = Math.max(1, parseInt(minI.value) || 1); update(); });
    minI.addEventListener("change", () => { sortDiscounts(); renderDiscounts(); update(); });
    pctI.addEventListener("input", () => { d.pct = Math.min(90, Math.max(0, parseFloat(pctI.value) || 0)); update(); });
    tr.querySelector("button").addEventListener("click", () => { discounts.splice(i, 1); renderDiscounts(); update(); });
    tb.appendChild(tr);
  });
}
function sortDiscounts() { discounts.sort((a, b) => a.min - b.min); }
function discountFor(qty) {
  let best = 0;
  for (const d of discounts) if (qty >= d.min && d.pct > best) best = d.pct;
  return best / 100;
}

/* ---------- Componenti aggiuntivi ---------- */
function renderExtras() {
  const tb = $("extras");
  tb.innerHTML = "";
  extras.forEach((e, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="ex-name" placeholder="Nome oggetto" aria-label="Oggetto"></td>
      <td><span class="ctl"><input type="number" inputmode="decimal" min="0" step="0.01" class="ex-cost" aria-label="Costo unitario"><span class="u">€</span></span></td>
      <td><span class="ctl"><input type="number" inputmode="numeric" min="0" step="1" class="ex-qty" aria-label="Quantità per pezzo"><span class="u">×</span></span></td>
      <td class="ex-tot"></td>
      <td><button type="button" class="icon-btn danger" title="Rimuovi oggetto" aria-label="Rimuovi oggetto">${icon("x")}</button></td>`;
    const name = tr.querySelector(".ex-name"), cost = tr.querySelector(".ex-cost"), qty = tr.querySelector(".ex-qty");
    name.value = e.name; cost.value = e.cost; qty.value = e.qty;
    if (e.qty > 0) tr.classList.add("used");
    name.addEventListener("input", () => { e.name = name.value; saveState(); });
    cost.addEventListener("input", () => { e.cost = parseFloat(cost.value) || 0; update(); });
    qty.addEventListener("input", () => { e.qty = Math.max(0, parseFloat(qty.value) || 0); tr.classList.toggle("used", e.qty > 0); update(); });
    tr.querySelector("button").addEventListener("click", () => { extras.splice(i, 1); renderExtras(); update(); });
    tb.appendChild(tr);
  });
}

/* ---------- Arrotondamento ---------- */
function roundPrice(v, mode) {
  if (!(v > 0)) return v;
  if (mode === "psy") return Math.max(0.9, Math.ceil(v - 0.9 - 1e-9) + 0.9); // es. 7,20 -> 7,90; 7,95 -> 8,90
  const step = parseFloat(mode);
  if (!step) return Math.round(v * 100) / 100;
  return Math.ceil(v / step - 1e-9) * step;
}

/* ---------- Calcolo ---------- */
function readInputs(normal = false) {
  const inp = {
    qty: Math.max(1, Math.floor(num("qty"))),
    perPlate: Math.max(1, Math.floor(num("perPlate"))),
    hours: Math.max(0, num("hours") + num("minutes") / 60),
    pPrice: num("pPrice"), pPower: num("pPower"), pLife: Math.max(1, num("pLife")), pMaint: num("pMaint"),
    waste: num("waste"), kwh: num("kwh"),
    fail: Math.min(0.9, Math.max(0, num("failRate") / 100)),
    laborRate: num("laborRate"), prepMin: num("prepMin"), postMin: num("postMin"),
    extraPiece: extras.reduce((s, e) => s + (e.cost || 0) * (e.qty || 0), 0),
    orderFixed: num("orderFixed"), designFee: num("designFee"), rushFee: num("rushFee"),
    markup: num("markup") / 100,
    feePct: Math.min(0.8, Math.max(0, num("feePct") / 100)),
    feeFixed: num("feeFixed"),
    vat: Math.max(0, num("vat") / 100),
    minOrder: num("minOrder"),
    rounding: $("rounding").value,
    filaments: filamentRows.map((r) => ({ ...r })),
    friends: false,
  };
  if (!normal && $("friendMode").checked) applyFriends(inp);
  return inp;
}

/** Modalità amici & famiglia: solo costi vivi + piccolo margine. */
function applyFriends(inp) {
  inp.friends = true;
  inp.markup = Math.max(0, num("friendMarkup") / 100);
  inp.feePct = 0; inp.feeFixed = 0; inp.minOrder = 0; inp.rushFee = 0;
  if (!$("friendLabor").checked) { inp.laborRate = 0; inp.designFee = 0; }
}

/** Costo di produzione per pezzo (indipendente dalla quantità). */
function unitCost(inp) {
  const grams = inp.filaments.reduce((s, f) => s + (f.grams || 0), 0);
  // prezzo medio pesato per lo spreco
  const matFil = inp.filaments.reduce((s, f) => s + (f.grams || 0) * (f.price || 0) / 1000, 0);
  const avgPrice = grams > 0 ? matFil / grams * 1000 : (inp.filaments[0]?.price || 0);
  const matWaste = inp.waste * avgPrice / 1000;

  const plate = {
    material: matFil + matWaste,
    energy: inp.hours * inp.pPower / 1000 * inp.kwh,
    machine: inp.hours * (inp.pPrice / inp.pLife + inp.pMaint),
    prep: inp.prepMin / 60 * inp.laborRate,
  };
  const plateBase = plate.material + plate.energy + plate.machine + plate.prep;
  const plateWithFail = plateBase / (1 - inp.fail);
  const failCost = plateWithFail - plateBase;

  const per = (v) => v / inp.perPlate;
  const items = [
    { k: "Filamento", v: per(plate.material) },
    { k: "Energia elettrica", v: per(plate.energy) },
    { k: "Ammortamento + manutenzione", v: per(plate.machine) },
    { k: "Preparazione stampa", v: per(plate.prep) },
    { k: "Riserva fallimenti", v: per(failCost) },
    { k: "Post‑produzione", v: inp.postMin / 60 * inp.laborRate },
    { k: "Componenti aggiuntivi", v: inp.extraPiece },
  ];
  const total = items.reduce((s, i) => s + i.v, 0);
  return { items, total, gramsPerPiece: (grams + inp.waste) / inp.perPlate };
}

/** Prezzi e totali per una certa quantità. */
function quote(inp, uc, qty) {
  const disc = inp.friends ? 0 : discountFor(qty);
  const target = uc.total * (1 + inp.markup);             // quanto vuoi incassare netto per pezzo
  const listNet = target / (1 - inp.feePct);               // listino che copre la commissione %
  const discNet = listNet * (1 - disc);
  const unitGross = roundPrice(discNet * (1 + inp.vat), inp.rounding);
  const unitNet = unitGross / (1 + inp.vat);

  const extrasNet = (inp.orderFixed + inp.designFee + inp.rushFee + inp.feeFixed) / (1 - inp.feePct);
  let totalGross = unitGross * qty + extrasNet * (1 + inp.vat);
  totalGross = Math.round(totalGross * 100) / 100;
  let minApplied = false;
  if (inp.minOrder > 0 && totalGross < inp.minOrder) { totalGross = inp.minOrder; minApplied = true; }

  const revenueNet = totalGross / (1 + inp.vat);
  const vatAmount = totalGross - revenueNet;
  const fees = revenueNet * inp.feePct + inp.feeFixed;
  const costTotal = uc.total * qty + inp.orderFixed + inp.designFee;
  const profit = revenueNet - fees - costTotal;
  const margin = revenueNet > 0 ? profit / revenueNet : NaN;
  const unitKeep = unitNet * (1 - inp.feePct); // incasso netto per pezzo dopo commissione %
  const plates = Math.ceil(qty / inp.perPlate);
  const machineHours = plates * inp.hours;

  return {
    qty, disc, listGross: listNet * (1 + inp.vat), unitGross, unitNet, unitKeep,
    totalGross, revenueNet, vatAmount, fees, costTotal, profit, margin,
    minApplied, plates, machineHours,
    belowCost: unitKeep < uc.total - 1e-9,
  };
}

let lastResult = null;

function update() {
  const inp = readInputs();
  const uc = unitCost(inp);
  const q = quote(inp, uc, inp.qty);
  lastResult = { inp, uc, q };

  // Info usura macchina, come "% del prezzo per ora" (stesso dato del foglio Excel)
  const wearH = inp.pPrice / inp.pLife + inp.pMaint;
  $("wearInfo").textContent = `Usura: ${fmt(wearH)}/h · ${(inp.pPrice > 0 ? 100 / inp.pLife : 0).toLocaleString("it-IT", { maximumFractionDigits: 3 })}% del prezzo all'ora + manutenzione`;

  // Totali riga componenti
  document.querySelectorAll("#extras tr").forEach((tr, i) => {
    const e = extras[i];
    if (e) tr.querySelector(".ex-tot").textContent = fmt((e.cost || 0) * (e.qty || 0));
  });

  // Big numbers
  setNum("rUnit", fmt(q.unitGross));
  setNum("rTotal", fmt(q.totalGross));
  $("mUnit").textContent = fmt(q.unitGross);
  $("mTotal").textContent = fmt(q.totalGross);
  $("modeClient").setAttribute("aria-pressed", String(!inp.friends));
  $("modeFriend").setAttribute("aria-pressed", String(inp.friends));
  $("friendBox").classList.toggle("on", inp.friends);
  document.querySelector(".result-card").classList.toggle("friends", inp.friends);
  let normalQ = null;
  if (inp.friends) {
    const n = readInputs(true);
    normalQ = quote(n, unitCost(n), n.qty);
  }
  $("rUnitNote").textContent = inp.friends
    ? `prezzo amici · cliente ${fmt(normalQ.unitGross)}`
    : q.disc > 0
    ? `listino ${fmt(roundPrice(q.listGross, inp.rounding))} − ${pct(q.disc)} sconto`
    : (inp.vat > 0 ? "IVA inclusa" : "");
  $("rTotalNote").textContent = `${q.qty} pz · ${q.plates} piatt${q.plates === 1 ? "o" : "i"} · ${formatHours(q.machineHours)} macchina`;

  // Warnings
  const w = [];
  const W = (type, text) => w.push({ type, text });
  if (q.belowCost) W("bad", `Con lo sconto del ${pct(q.disc)} il prezzo scende sotto il costo di produzione (${fmt(uc.total)}/pz). Riduci lo sconto o aumenta il ricarico.`);
  if (inp.friends) W("friend", `Prezzo amici: ${inp.laborRate ? "costi + tuo tempo" : "solo costi vivi (tempo regalato)"} + ${pct(inp.markup)}. Il prezzo normale sarebbe ${fmt(normalQ.totalGross)}: l'amico risparmia ${fmt(normalQ.totalGross - q.totalGross)}.`);
  else if (q.margin < 0.15 && q.revenueNet > 0) W("warn", `Margine basso (${pct(q.margin)}): ogni imprevisto ti porta in perdita.`);
  if (q.minApplied) W("info", `Applicato il prezzo minimo d'ordine (${fmt(inp.minOrder)}).`);
  if (inp.qty % inp.perPlate !== 0) W("info", `${inp.qty} pezzi non riempiono esattamente i piatti (${inp.perPlate}/piatto): l'ultimo piatto sarà parziale.`);
  if (!inp.filaments.some((f) => f.grams > 0)) W("info", "Inserisci i grammi di filamento.");
  if (inp.hours <= 0) W("info", "Inserisci il tempo di stampa.");
  const ICONS = { bad: "alert", warn: "alert", info: "info", friend: "heart" };
  $("warnings").innerHTML = w.map((a) => `<p class="alert ${a.type}">${icon(ICONS[a.type])}<span>${a.text}</span></p>`).join("");

  // Breakdown
  // Ogni voce ha un colore fisso (segue la voce, non la posizione): --s1 … --s7
  const parts = uc.items.map((it, idx) => ({ ...it, color: `var(--s${idx + 1})` })).filter((i) => i.v > 0.00049);
  const share = (v) => (uc.total > 0 ? v / uc.total : 0);
  $("costBar").innerHTML = parts.map((p) =>
    `<span style="flex:${share(p.v).toFixed(4)} 1 0;background:${p.color}" title="${p.k}: ${fmt(p.v)} (${pct(share(p.v))})"></span>`).join("");
  $("costBar").setAttribute("aria-label", "Ripartizione del costo per pezzo: " + parts.map((p) => `${p.k} ${pct(share(p.v))}`).join(", "));
  const rows = parts.map((p) => `
    <tr><td><span class="dot" style="background:${p.color}"></span>${p.k}</td><td class="share">${pct(share(p.v))}</td><td>${fmt(p.v)}</td></tr>`);
  rows.push(`<tr class="tot"><td>Costo di produzione</td><td></td><td>${fmt(uc.total)}</td></tr>`);
  rows.push(`<tr class="muted"><td colspan="2">Filamento per pezzo</td><td>${uc.gramsPerPiece.toLocaleString("it-IT", { maximumFractionDigits: 1 })} g</td></tr>`);
  $("breakdown").innerHTML = rows.join("");

  // Summary
  const s = [
    ["Costi totali", fmt(q.costTotal)],
    inp.feePct > 0 || inp.feeFixed > 0 ? ["Commissioni piattaforma", fmt(q.fees)] : null,
    inp.vat > 0 ? ["IVA da versare", fmt(q.vatAmount)] : null,
    ["Utile netto", `<b class="${q.profit < 0 ? "neg" : "pos"}">${fmt(q.profit)}</b>`],
    ["Margine sul netto incassato", pct(q.margin)],
    q.machineHours > 0 ? ["Utile per ora macchina", fmt(q.profit / q.machineHours)] : null,
  ].filter(Boolean);
  $("summary").innerHTML = s.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");

  // Tier table
  const qtys = [...new Set([1, ...discounts.map((d) => d.min), inp.qty])].sort((a, b) => a - b);
  $("tierTable").innerHTML = qtys.map((n) => {
    const t = quote(inp, uc, n);
    const cls = n === inp.qty ? "current" : "";
    return `<tr class="${cls}${t.belowCost ? " loss" : ""}"><td>${n}</td><td>${t.disc ? pct(t.disc) : "–"}</td><td>${fmt(t.unitGross)}</td><td>${fmt(t.totalGross)}</td><td>${pct(t.margin)}</td></tr>`;
  }).join("");

  updateChips(inp);
  saveState();
}

function setNum(id, text) {
  const el = $(id);
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove("bump");
  void el.offsetWidth; // riavvia l'animazione
  el.classList.add("bump");
}

/** Riepilogo compatto mostrato sulle sezioni chiuse. */
function updateChips(inp) {
  const p = findPrinter($("printerSel").value);
  const grams = inp.filaments.reduce((s, f) => s + (f.grams || 0), 0);
  const fil = inp.filaments.map((f) => findFilament(f.id)).filter(Boolean);
  const usedExtras = extras.filter((e) => e.qty > 0);
  const n = (v, d = 2) => v.toLocaleString("it-IT", { maximumFractionDigits: d });
  const chips = {
    "sum-job": `${inp.qty} pz · ${inp.perPlate}/piatto · ${formatHours(inp.hours)}`,
    "sum-printer": `${p ? p.name : ""} · ${n(inp.pPower, 0)} W · ${fmt(inp.pPrice / inp.pLife + inp.pMaint)}/h`,
    "sum-fil": `${fil.length > 1 ? fil.length + " filamenti" : fil[0] ? fil[0].brand + " " + fil[0].name : ""} · ${n(grams, 1)} g`,
    "sum-ops": `${n(inp.kwh)} €/kWh · fallite ${n(inp.fail * 100, 1)}% · ${n(num("laborRate"))} €/h`,
    "sum-extras": usedExtras.length ? `${usedExtras.length} oggett${usedExtras.length > 1 ? "i" : "o"} · ${fmt(inp.extraPiece)}/pz` : "nessuno",
    "sum-price": `ricarico ${n(num("markup"), 1)}%${num("feePct") ? ` · comm. ${n(num("feePct"), 1)}%` : ""}${num("vat") ? ` · IVA ${n(num("vat"), 0)}%` : ""}`,
    "sum-disc": discounts.filter((d) => d.pct > 0).map((d) => `${d.min}+ −${n(d.pct, 1)}%`).join(" · ") || "nessuno",
  };
  for (const [id, text] of Object.entries(chips)) $(id).textContent = text;
}

function setFriendMode(on) {
  $("friendMode").checked = on;
  update();
}

function formatHours(h) {
  const tot = Math.round(h * 60);
  const hh = Math.floor(tot / 60), mm = tot % 60;
  return hh ? `${hh}h ${String(mm).padStart(2, "0")}m` : `${mm}m`;
}

/* ---------- Stato ---------- */
function getState() {
  const fields = {};
  for (const id of FIELDS) fields[id] = $(id).value;
  for (const id of CHECKS) fields[id] = $(id).checked;
  return { fields, printer: $("printerSel").value, filaments: filamentRows, discounts, extras };
}

function setState(st) {
  if (st.printer && findPrinter(st.printer)) renderPrinterSelect(st.printer);
  for (const id of FIELDS) if (st.fields && st.fields[id] !== undefined) $(id).value = st.fields[id];
  for (const id of CHECKS) $(id).checked = !!st.fields?.[id];
  filamentRows = (st.filaments && st.filaments.length ? st.filaments : [{ id: "gen-pla", price: 18, grams: 0 }])
    .map((r) => ({ id: findFilament(r.id) ? r.id : "gen-pla", price: r.price, grams: r.grams }));
  discounts = (st.discounts || DEFAULT_DISCOUNTS).map((d) => ({ ...d }));
  extras = (st.extras || DEFAULT_EXTRAS).map((e) => ({ ...e }));
  // migrazione dalla prima versione (campo unico "componenti extra per pezzo")
  const oldExtra = parseFloat(st.fields?.extraPiece);
  if (!st.extras && oldExtra > 0) extras.unshift({ name: "Componenti extra", cost: oldExtra, qty: 1 });
  sortDiscounts();
  renderFilaments();
  renderDiscounts();
  renderExtras();
  updateDelPrinterBtn();
}

let saveTimer;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveJSON(LS_STATE, getState()), 200);
}

/* ---------- Preventivi salvati ---------- */
function renderQuotes() {
  const list = loadJSON(LS_QUOTES, []);
  const ul = $("quotes");
  if (!list.length) { ul.innerHTML = `<li class="empty">Nessun preventivo salvato. Compila i dati e premi “Salva preventivo”.</li>`; return; }
  ul.innerHTML = "";
  list.forEach((q, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div><b></b><small></small></div>
      <div class="q-btns">
        <button type="button" class="btn ghost small">Apri</button>
        <button type="button" class="icon-btn danger" title="Elimina preventivo" aria-label="Elimina preventivo">${icon("trash")}</button>
      </div>`;
    li.querySelector("b").textContent = q.name;
    li.querySelector("small").textContent = `${new Date(q.date).toLocaleDateString("it-IT")} · ${q.qty} pz · ${fmt(q.total)}`;
    const [openB, delB] = li.querySelectorAll("button");
    openB.addEventListener("click", () => { setState(q.state); update(); toast(`Aperto "${q.name}"`); window.scrollTo({ top: 0, behavior: "smooth" }); });
    delB.addEventListener("click", () => {
      if (!confirm(`Eliminare "${q.name}"?`)) return;
      list.splice(i, 1); saveJSON(LS_QUOTES, list); renderQuotes();
    });
    ul.appendChild(li);
  });
}

function saveQuote() {
  const name = $("jobName").value.trim() || prompt("Nome del preventivo:", "Preventivo " + new Date().toLocaleDateString("it-IT"));
  if (!name) return;
  const list = loadJSON(LS_QUOTES, []);
  list.unshift({ name, date: Date.now(), qty: lastResult.q.qty, total: lastResult.q.totalGross, state: JSON.parse(JSON.stringify(getState())) });
  saveJSON(LS_QUOTES, list.slice(0, 200));
  renderQuotes();
  toast("Preventivo salvato");
}

function quoteText() {
  const { inp, uc, q } = lastResult;
  const name = $("jobName").value.trim();
  const lines = [
    `Preventivo stampa 3D${name ? " – " + name : ""}${inp.friends ? " (prezzo amici)" : ""}`,
    `Data: ${new Date().toLocaleDateString("it-IT")}`,
    ``,
    `Quantità: ${q.qty} pz`,
    `Prezzo unitario: ${fmt(q.unitGross)}${q.disc ? ` (sconto quantità ${pct(q.disc)})` : ""}`,
  ];
  if (inp.designFee > 0) lines.push(`Progettazione: ${fmt(inp.designFee / (1 - inp.feePct) * (1 + inp.vat))}`);
  if (inp.rushFee > 0) lines.push(`Supplemento urgenza: ${fmt(inp.rushFee / (1 - inp.feePct) * (1 + inp.vat))}`);
  if (inp.orderFixed + inp.feeFixed > 0) lines.push(`Imballaggio e servizio: ${fmt((inp.orderFixed + inp.feeFixed) / (1 - inp.feePct) * (1 + inp.vat))}`);
  lines.push(`Totale: ${fmt(q.totalGross)}${inp.vat > 0 ? " IVA inclusa" : ""}`);
  lines.push(``, `Tempo di produzione stimato: ${formatHours(q.machineHours)} di stampa`);
  return lines.join("\n");
}

/* ---------- Backup ---------- */
function exportBackup() {
  const data = {
    app: "calcolatore-stampa-3d", version: 1, exported: new Date().toISOString(),
    state: getState(), quotes: loadJSON(LS_QUOTES, []),
    customPrinters, customFilaments,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `calcolatore-3d-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== "calcolatore-stampa-3d") throw new Error("File non riconosciuto");
    customPrinters = data.customPrinters || [];
    customFilaments = data.customFilaments || [];
    saveJSON(LS_CUSTOM_PRINTERS, customPrinters);
    saveJSON(LS_CUSTOM_FILAMENTS, customFilaments);
    saveJSON(LS_QUOTES, data.quotes || []);
    renderPrinterSelect(data.state?.printer);
    if (data.state) setState(data.state);
    renderQuotes();
    update();
    toast("Backup importato");
  } catch (e) {
    alert("Impossibile importare il backup: " + e.message);
  }
}

/* ============================================================
   Import G-code / 3MF
   ============================================================ */

function parseDuration(s) {
  // "1d 2h 3m 4s" | "2h 5m" | "45m 10s"
  let sec = 0, found = false;
  const re = /(\d+(?:\.\d+)?)\s*([dhms])/gi;
  let m;
  while ((m = re.exec(s))) {
    found = true;
    const v = parseFloat(m[1]);
    sec += v * { d: 86400, h: 3600, m: 60, s: 1 }[m[2].toLowerCase()];
  }
  return found ? sec : null;
}

function parseGcodeText(txt) {
  const out = { seconds: null, grams: [], types: [] };

  // Tempo
  let m = txt.match(/;\s*total estimated time:\s*([^;\n]+)/i)              // Bambu Studio
       || txt.match(/;\s*estimated printing time \(normal mode\)\s*=\s*([^\n]+)/i); // Prusa / Orca
  if (m) out.seconds = parseDuration(m[1]);
  if (out.seconds == null) {
    m = txt.match(/;TIME:(\d+)/);                                          // Cura
    if (m) out.seconds = parseInt(m[1]);
  }

  // Grammi per estrusore
  m = txt.match(/;\s*filament used \[g\]\s*=\s*([^\n]+)/i);
  if (m) out.grams = m[1].split(",").map((x) => parseFloat(x)).filter((x) => Number.isFinite(x));
  if (!out.grams.length) {
    m = txt.match(/;\s*total filament (?:used|weight) \[g\]\s*[:=]\s*([\d.]+)/i);
    if (m) out.grams = [parseFloat(m[1])];
  }
  if (!out.grams.length) {
    m = txt.match(/;Filament used:\s*([^\n]+)/i);                          // Cura, in metri
    if (m) {
      // 1,75 mm, densità PLA 1,24 g/cm³ → ~2,98 g/m
      out.grams = m[1].split(",").map((x) => parseFloat(x) * 2.98).filter((x) => Number.isFinite(x) && x > 0);
      out.approx = true;
    }
  }
  m = txt.match(/;\s*filament_type\s*=\s*([^\n]+)/i);
  if (m) out.types = m[1].split(";").map((x) => x.trim());
  return out;
}

async function readZipEntries(buf, wanted) {
  // Lettore ZIP minimale (central directory) + DecompressionStream
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Archivio non valido");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const result = {};
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
    p += 46 + nameLen + extraLen + commLen;
    if (!wanted(name)) continue;
    const lNameLen = dv.getUint16(local + 26, true);
    const lExtraLen = dv.getUint16(local + 28, true);
    const data = new Uint8Array(buf, local + 30 + lNameLen + lExtraLen, csize);
    let bytes;
    if (method === 0) bytes = data;
    else if (method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else continue;
    result[name] = dec.decode(bytes);
  }
  return result;
}

function parseSliceInfo(xml) {
  // Bambu Studio / Orca: Metadata/slice_info.config
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const plates = [...doc.getElementsByTagName("plate")];
  let seconds = 0;
  const fil = new Map(); // key type|color -> grams
  for (const pl of plates) {
    for (const md of pl.getElementsByTagName("metadata")) {
      if (md.getAttribute("key") === "prediction") seconds += parseFloat(md.getAttribute("value")) || 0;
    }
    for (const f of pl.getElementsByTagName("filament")) {
      const type = f.getAttribute("type") || "PLA";
      const key = `${type}|${f.getAttribute("color") || ""}`;
      fil.set(key, (fil.get(key) || 0) + (parseFloat(f.getAttribute("used_g")) || 0));
    }
  }
  return {
    seconds: seconds || null,
    plates: plates.length,
    grams: [...fil.values()],
    types: [...fil.keys()].map((k) => k.split("|")[0]),
  };
}

function genericForType(type) {
  const t = (type || "").toUpperCase();
  const map = { "PLA": "gen-pla", "PETG": "gen-petg", "ABS": "gen-abs", "ASA": "gen-asa", "TPU": "gen-tpu",
    "PLA-CF": "gen-placf", "PETG-CF": "gen-petgcf", "PA-CF": "gen-pacf", "PAHT-CF": "gen-pacf", "PA": "gen-pa", "PA6": "gen-pa", "PC": "gen-pc" };
  return map[t] || (t.startsWith("PLA") ? "gen-pla" : t.startsWith("PET") ? "gen-petg" : "gen-pla");
}

async function importGcode(file) {
  const info = $("gcodeInfo");
  info.textContent = "Lettura in corso…";
  try {
    let res;
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".3mf")) {
      const buf = await file.arrayBuffer();
      const entries = await readZipEntries(buf, (n) => /slice_info\.config$/i.test(n));
      const key = Object.keys(entries)[0];
      if (!key) throw new Error("questo 3MF non è stato slicato: in Bambu Studio usa “Esporta file del piatto slicato” (.gcode.3mf)");
      res = parseSliceInfo(entries[key]);
    } else {
      // Le statistiche stanno in testa (Bambu/Orca) o in coda (Prusa/Cura): leggiamo solo le estremità
      const CH = 600 * 1024;
      const head = await file.slice(0, CH).text();
      const tail = file.size > CH ? await file.slice(Math.max(CH, file.size - CH)).text() : "";
      res = parseGcodeText(head + "\n" + tail);
    }

    const msgs = [];
    if (res.seconds) {
      const mins = Math.round(res.seconds / 60);
      $("hours").value = Math.floor(mins / 60);
      $("minutes").value = mins % 60;
      msgs.push(`tempo ${formatHours(res.seconds / 3600)}`);
    }
    const grams = (res.grams || []).filter((g) => g > 0);
    if (grams.length) {
      const oldRows = filamentRows;
      filamentRows = [];
      grams.forEach((g, i) => {
        // mantieni il filamento già scelto in quella posizione, altrimenti generico per tipo
        const keep = oldRows[i];
        const typeId = res.types?.[i] ? genericForType(res.types[i]) : null;
        const id = keep && (!typeId || findFilament(keep.id)?.type === res.types[i]) ? keep.id : (typeId || "gen-pla");
        const price = keep && keep.id === id ? keep.price : findFilament(id).price;
        filamentRows.push({ id, price, grams: Math.round(g * 100) / 100 });
      });
      renderFilaments();
      msgs.push(`${grams.reduce((a, b) => a + b, 0).toFixed(1)} g${res.approx ? " (stimati da metri)" : ""} su ${grams.length} filament${grams.length > 1 ? "i" : "o"}`);
    }
    if (res.plates > 1) msgs.push(`somma di ${res.plates} piatti`);
    info.textContent = msgs.length ? `Importato ${file.name}: ${msgs.join(", ")}. Controlla i pezzi per piatto.` : "Nessun dato di tempo o filamento trovato nel file.";
    $("dropzone").classList.toggle("ok", msgs.length > 0);
    update();
  } catch (e) {
    info.textContent = "Errore: " + e.message;
    $("dropzone").classList.remove("ok");
  }
}

/* ============================================================
   Init
   ============================================================ */
function init() {
  const st = loadJSON(LS_STATE, null);
  renderPrinterSelect(st?.printer || "bambu-p1s");
  if (st) setState(st);
  else {
    applyPrinter("bambu-p1s");
    setState({ printer: "bambu-p1s", filaments: [{ id: "bambu-pla-basic", price: 20, grams: 50 }], discounts: DEFAULT_DISCOUNTS, extras: DEFAULT_EXTRAS });
  }

  // Fallback se lo stato salvato non ha i campi stampante
  if (!$("pPrice").value) applyPrinter($("printerSel").value);

  $("printerSel").addEventListener("change", () => { applyPrinter($("printerSel").value); updateDelPrinterBtn(); update(); });
  for (const id of CHECKS) $(id).addEventListener("change", update);
  for (const id of FIELDS) {
    $(id).addEventListener("input", update);
    $(id).addEventListener("change", update);
  }

  $("savePrinter").addEventListener("click", () => {
    const base = findPrinter($("printerSel").value);
    const name = prompt("Nome della stampante personalizzata (es. 'P1S + AMS'):", base ? (base.custom ? base.name : `${base.brand} ${base.name}`) : "");
    if (!name) return;
    const p = { id: "custom-p-" + Date.now(), brand: "Personalizzata", name: name.trim(), price: num("pPrice"), power: num("pPower"), life: num("pLife"), maint: num("pMaint"), custom: true };
    customPrinters.push(p);
    saveJSON(LS_CUSTOM_PRINTERS, customPrinters);
    renderPrinterSelect(p.id);
    update();
    toast("Stampante salvata");
  });
  $("delPrinter").addEventListener("click", () => {
    const p = findPrinter($("printerSel").value);
    if (!p || !p.custom || !confirm(`Eliminare "${p.name}"?`)) return;
    customPrinters = customPrinters.filter((c) => c.id !== p.id);
    saveJSON(LS_CUSTOM_PRINTERS, customPrinters);
    renderPrinterSelect("generic");
    applyPrinter("generic");
    update();
  });

  $("addFil").addEventListener("click", () => { addFilamentRow(); renderFilaments(); update(); });
  $("addDisc").addEventListener("click", () => {
    const last = discounts[discounts.length - 1];
    discounts.push({ min: last ? last.min * 2 : 1, pct: last ? Math.min(90, last.pct + 5) : 0 });
    renderDiscounts(); update();
  });
  $("addExtra").addEventListener("click", () => { extras.push({ name: "", cost: 0, qty: 1 }); renderExtras(); update(); });
  $("resetDisc").addEventListener("click", () => { discounts = DEFAULT_DISCOUNTS.map((d) => ({ ...d })); renderDiscounts(); update(); });

  $("gcodeFile").addEventListener("change", (e) => { if (e.target.files[0]) importGcode(e.target.files[0]); e.target.value = ""; });
  $("saveQuote").addEventListener("click", saveQuote);
  $("copyQuote").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(quoteText()); toast("Testo copiato negli appunti"); }
    catch { prompt("Copia il testo:", quoteText()); }
  });
  $("exportBtn").addEventListener("click", exportBackup);
  $("importFile").addEventListener("change", (e) => { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ""; });
  $("resetAll").addEventListener("click", () => {
    if (!confirm("Ripristinare i valori predefiniti? I preventivi salvati e i preset personalizzati restano.")) return;
    localStorage.removeItem(LS_STATE);
    location.reload();
  });

  // Selettore tema: Auto (come il dispositivo) / Chiaro / Scuro
  const themeBtns = document.querySelectorAll("[data-theme-opt]");
  const darkMq = window.matchMedia("(prefers-color-scheme: dark)");
  const applyTheme = (t) => {
    if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    themeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeOpt === (t || "auto"))));
    const dark = t === "dark" || (t !== "light" && darkMq.matches);
    document.querySelector('meta[name="theme-color"]').content = dark ? "#0f1d22" : "#13262b";
  };
  let theme = localStorage.getItem(LS_THEME) || "auto";
  applyTheme(theme);
  darkMq.addEventListener?.("change", () => applyTheme(theme));
  themeBtns.forEach((b) => b.addEventListener("click", () => {
    theme = b.dataset.themeOpt;
    if (theme === "auto") localStorage.removeItem(LS_THEME); else localStorage.setItem(LS_THEME, theme);
    applyTheme(theme);
  }));

  // Selettore Cliente / Amici
  $("modeClient").addEventListener("click", () => setFriendMode(false));
  $("modeFriend").addEventListener("click", () => setFriendMode(true));

  // Sezioni aperte/chiuse ricordate
  const openState = loadJSON(LS_OPEN, {});
  document.querySelectorAll("details.step").forEach((d) => {
    if (d.id in openState) d.open = openState[d.id];
    d.addEventListener("toggle", () => { openState[d.id] = d.open; saveJSON(LS_OPEN, openState); });
    // Su telefono: la sezione aperta con un tocco viene portata in cima allo schermo
    d.querySelector("summary").addEventListener("click", () => {
      if (d.open || !window.matchMedia("(max-width: 1000px)").matches) return;
      setTimeout(() => {
        const top = d.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.45) d.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 30);
    });
  });

  // Trascina e rilascia il file dello slicer
  const dz = $("dropzone");
  ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove("drag")));
  dz.addEventListener("drop", (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) importGcode(f); });

  // Barra prezzo mobile: nascosta quando il pannello risultati è visibile
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => $("mobileBar").classList.toggle("away", en.isIntersecting), { threshold: 0.05 })
      .observe(document.querySelector(".result-card"));
  }

  // Uso offline e installabile (solo online, non da file locale)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  renderQuotes();
  update();
}

document.addEventListener("DOMContentLoaded", init);
