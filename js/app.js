/* Rachel's Workouts: app logic. Everything is stored on the phone in localStorage. */
(function () {
"use strict";

/* ---------- small helpers ---------- */
const $ = s => document.querySelector(s);
const root = document.documentElement;
const DAY_MS = 86400000;
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PROGRAMME = ["legs", "upper", "sprint", "full"];

function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c])); }
function pad(n) { return String(n).padStart(2, "0"); }
function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function parse(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
function todayStr() { return ymd(new Date()); }
function dowOf(s) { return parse(s).getDay(); }
function mondayOf(s) { const d = parse(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return ymd(d); }
function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / DAY_MS); }
function niceDate(s, opts) {
  const t = todayStr();
  if (s === t) return "Today";
  if (s === addDays(t, -1)) return "Yesterday";
  const d = parse(s);
  const base = (opts && opts.long ? DOW_LONG[d.getDay()] : DOW_SHORT[d.getDay()]) + " " + d.getDate() + " " + MONTHS[d.getMonth()].slice(0, 3);
  return d.getFullYear() !== new Date().getFullYear() ? base + " " + d.getFullYear() : base;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function sessionById(id) { return SESSIONS.find(s => s.id === id); }
function colorOf(id) { const s = sessionById(id); return COLORS[s ? s.color : "grey"]; }
function fmtClock(sec) { const s = Math.max(0, Math.ceil(sec)); return Math.floor(s / 60) + ":" + pad(s % 60); }
function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }
function num(n) { return Number(n).toLocaleString("en-GB"); }
function moveId(m) { return typeof m === "string" ? m : m.ex; }
function moveName(m) { if (typeof m === "string") return MOVES[m] ? MOVES[m].name : m; return m.name || (MOVES[m.ex] ? MOVES[m.ex].name : ""); }
function demoId(id) { const mv = MOVES[id]; const d = mv && mv.demo ? mv.demo : id; return window.Figure && Figure.has(d) ? d : null; }

/* ---------- storage ---------- */
const STORE = "rachels-workouts-v2";

function defaults() {
  const t = todayStr();
  return {
    v: 2,
    settings: {name: "Rachel", days: [1, 3, 5], lunch: "12:15", bells: [2.5, 6, 10, 16], voice: true, sound: true, vibrate: true, theme: "system", units: "kg", stepGoal: 8000},
    prog: {month: 1, week: 1, count: 0},
    meta: {created: t, lastBackup: null, welcomeBack: null},
    logs: [], checkins: {}, measures: [], active: null
  };
}
let db = defaults();
let storageOk = true;

function mergeData(saved) {
  const d = defaults();
  return {
    v: 2,
    settings: Object.assign(d.settings, saved.settings || {}),
    prog: Object.assign(d.prog, saved.prog || {}),
    meta: Object.assign(d.meta, saved.meta || {}),
    logs: Array.isArray(saved.logs) ? saved.logs : [],
    checkins: saved.checkins && typeof saved.checkins === "object" ? saved.checkins : {},
    measures: Array.isArray(saved.measures) ? saved.measures : [],
    active: saved.active && sessionById(saved.active.session) ? saved.active : null
  };
}
function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) { const saved = JSON.parse(raw); if (saved && typeof saved === "object") db = mergeData(saved); }
  } catch (e) { storageOk = false; }
}
let askedPersist = false;
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(db)); storageOk = true; } catch (e) { storageOk = false; }
  if (!askedPersist && navigator.storage && navigator.storage.persist) { askedPersist = true; navigator.storage.persist().catch(() => {}); }
}

/* ---------- programme maths ---------- */
function rotation() { return ROTATIONS[db.settings.days.length >= 4 ? 4 : 3]; }
function perWeek() { return rotation().length; }
function stageCtx(month, week) {
  const m = monthPlan(month), W = m.weeks[week - 1];
  return {month: month, week: week, m: m, W: W, phase: m.phase};
}
function curCtx() { return stageCtx(db.prog.month, db.prog.week); }
function advanceProg() {
  const p = db.prog;
  p.count++;
  if (p.count >= perWeek()) {
    p.count = 0; p.week++;
    if (p.week > 4) { p.week = 1; p.month++; return "month"; }
    return "week";
  }
  return null;
}
function rewindProg() {
  const p = db.prog;
  if (p.count > 0) { p.count--; return; }
  if (p.week > 1) { p.week--; p.count = perWeek() - 1; return; }
  if (p.month > 1) { p.month--; p.week = 4; p.count = perWeek() - 1; }
}

function mainFor(s, ctx, mode) {
  if (!s.main) return [];
  const list = s.main[ctx.phase];
  return mode === "short" ? list.filter(e => e.pair === "A" || e.pair === "B") : list;
}
function setsFor(ctx, mode) { return mode === "short" ? 2 : ctx.W.sets; }
function amountFor(e, ctx) {
  const add = ctx.W.add;
  if (e.secs) return e.secs + (add >= 2 ? 5 : 0) + (add >= 3 ? 5 : 0);
  return e.reps + add;
}
function doseText(e, ctx) { return e.secs ? amountFor(e, ctx) + "s" : String(amountFor(e, ctx)); }
function restFor(e, ctx) { return Math.max(15, Math.round(e.rest * ctx.m.restScale / 5) * 5); }
function finMins(ctx, mode) { return mode === "short" ? Math.max(3, Math.ceil(ctx.W.fin / 2)) : ctx.W.fin; }
function sprintFor(ctx, mode) { const [r, on, off] = ctx.W.sprint; return {reps: mode === "short" ? Math.ceil(r / 2) : r, on: on, off: off}; }
function circFor(ctx, mode) { const [r, w, rs] = ctx.W.circ; return {rounds: mode === "short" ? Math.min(2, r) : r, work: w, rest: rs}; }
function warmFor(s, mode) { return mode === "short" ? s.warm.slice(0, 4) : (s.warm || []); }
function coolFor(s, mode) { return mode === "short" ? (s.cool || []).slice(0, 2) : (s.cool || []); }
function itemName(w) { return w.name || moveName(w.ex); }

function estimate(s, mode, ctx) {
  if (s.follow) return Math.round(s.follow.moves.length * (s.follow.work + s.follow.rest) / 60);
  let secs = 60;
  warmFor(s, mode).forEach(w => { secs += w.secs; });
  coolFor(s, mode).forEach(w => { secs += w.secs; });
  const sets = setsFor(ctx, mode);
  mainFor(s, ctx, mode).forEach(e => {
    const work = (e.secs ? amountFor(e, ctx) : amountFor(e, ctx) * 3) * (e.each ? 2 : 1) + 8;
    secs += sets * (work + restFor(e, ctx));
  });
  if (s.sprints) { const sp = sprintFor(ctx, mode); secs += sp.reps * (sp.on + sp.off); }
  if (s.circuit) { const c = circFor(ctx, mode); secs += c.rounds * s.circuit.moves.length * (c.work + c.rest) + (c.rounds - 1) * s.circuit.roundRest; }
  if (s.finisher) secs += finMins(ctx, mode) * 60 + 30;
  return Math.round(secs / 60);
}
function aboutMins(n) { return "about " + (n >= 15 ? Math.round(n / 5) * 5 : n) + " min"; }

/* ---------- history queries ---------- */
function logsOn(date) { return db.logs.filter(l => l.date === date); }
function workoutsBetween(a, b) { return db.logs.filter(l => l.type === "workout" && l.date >= a && l.date <= b); }
function isPlannedDay(date) { return db.settings.days.includes(dowOf(date)); }
function byTime(a, b) { return (a.date + (a.at || "")).localeCompare(b.date + (b.at || "")); }

function statusOn(date) {
  const L = logsOn(date);
  const w = L.find(l => l.type === "workout");
  const planned = isPlannedDay(date) && date >= db.meta.created;
  const t = todayStr();
  if (w) return {kind: planned ? "done" : "extra", session: w.session, logs: L};
  if (L.some(l => l.type === "skip")) return {kind: "skip", logs: L};
  if (L.some(l => l.type === "activity")) return {kind: "activity", logs: L};
  if (planned && date < t) return {kind: "miss", logs: L};
  if (isPlannedDay(date) && date >= t) return {kind: "plan", logs: L};
  return {kind: "rest", logs: L};
}
function programmeLogs() { return db.logs.filter(l => l.type === "workout" && PROGRAMME.includes(l.session)).sort(byTime); }
function nextSessionId() {
  const rot = rotation();
  const past = programmeLogs().filter(l => rot.includes(l.session));
  if (!past.length) return rot[0];
  return rot[(rot.indexOf(past[past.length - 1].session) + 1) % rot.length];
}
function weekTally(date) {
  const mon = mondayOf(date || todayStr());
  return {done: workoutsBetween(mon, addDays(mon, 6)).filter(l => l.session !== "stretch").length, target: db.settings.days.length, mon: mon};
}
function weekStreak() {
  const target = db.settings.days.length;
  const count = mon => workoutsBetween(mon, addDays(mon, 6)).filter(l => l.session !== "stretch").length;
  let mon = mondayOf(todayStr()), streak = 0;
  if (count(mon) >= target) streak++;
  mon = addDays(mon, -7);
  while (mon >= mondayOf(db.meta.created) && count(mon) >= target) { streak++; mon = addDays(mon, -7); }
  return streak;
}
function missedDays() {
  const out = [], t = todayStr();
  for (let i = 1; i <= 21; i++) {
    const d = addDays(t, -i);
    if (d < db.meta.created) break;
    if (statusOn(d).kind === "miss") out.push(d);
  }
  return out;
}
function exerciseHistory(id) { return db.logs.filter(l => l.type === "workout" && l.sets && l.sets[id] && l.sets[id].length).sort(byTime); }
function lastFor(id) { const h = exerciseHistory(id); return h.length ? h[h.length - 1] : null; }
function topKg(sets) { return sets.reduce((m, s) => Math.max(m, Number(s.kg) || 0), 0); }
function nearestBell(kg) {
  const bells = db.settings.bells.slice().sort((a, b) => a - b);
  if (!bells.length) return 0;
  const le = bells.filter(b => b <= kg);
  return le.length ? le[le.length - 1] : bells[0];
}
function defaultKg(id, ctx) {
  const mv = MOVES[id];
  if (!mv || !mv.lift) return 0;
  const last = lastFor(id);
  if (last) { const k = topKg(last.sets[id]); if (k) return k; }
  return nearestBell(mv.start[ctx.phase === "base" ? 0 : 1]);
}
function readyToGoUp(e) {
  const mv = MOVES[e.ex];
  if (!mv || !mv.lift) return null;
  const h = exerciseHistory(e.ex).slice(-2);
  if (h.length < 2) return null;
  const kgs = h.map(l => topKg(l.sets[e.ex]));
  if (!kgs[0] || kgs[0] !== kgs[1]) return null;
  const good = h.every(l => (l.effort || 3) <= 3 && l.sets[e.ex].length >= (l.setsPer || 3) && l.sets[e.ex].every(s => s.full !== false));
  if (!good) return null;
  const heavier = db.settings.bells.filter(b => b > kgs[0]).sort((a, b) => a - b)[0];
  return {from: kgs[0], to: heavier || null};
}

/* ---------- markup pieces ---------- */
const chev = '<svg class="chev" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function bellIcon(sid, label, outline) {
  const col = colorOf(sid);
  return `<svg class="bell${outline ? " outline" : ""}" viewBox="0 0 64 64" aria-hidden="true" style="--c:${col.c};--on:${col.on}">
    <path class="handle" d="M19 30 V20 a13 13 0 0 1 26 0 V30"/><path class="body" d="M13 60 A23 23 0 1 1 51 60 Z"/>
    <text class="lbl" x="32" y="51" text-anchor="middle">${esc(label)}</text></svg>`;
}
function dotFor(st) {
  if (st.kind === "done" || st.kind === "extra") {
    const col = colorOf(st.session); const s = sessionById(st.session);
    return `<span class="dot ${st.kind}" style="--c:${col.c};--on:${col.on}" title="${esc(s ? s.title : "Workout")}">${esc((s ? s.short : "W")[0])}</span>`;
  }
  if (st.kind === "activity") return `<span class="dot done" style="--c:${COLORS.grey.c};--on:#fff" title="Other activity">+</span>`;
  if (st.kind === "skip") return `<span class="dot skip" title="Skipped">✕</span>`;
  if (st.kind === "miss") return `<span class="dot miss" title="Not logged">?</span>`;
  if (st.kind === "plan") return `<span class="dot plan" title="Workout day"></span>`;
  return `<span class="dot rest" title="Rest day"></span>`;
}
function sparkline(values, labels) {
  if (values.length < 2) return `<svg class="spark" viewBox="0 0 96 32" aria-hidden="true"></svg>`;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const x = i => 4 + (i * 88) / (values.length - 1);
  const y = v => max === min ? 16 : 28 - ((v - min) / span) * 24;
  const d = values.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  const hits = values.map((v, i) => `<rect class="hit" x="${(x(i) - 6).toFixed(1)}" y="0" width="12" height="32"><title>${esc(labels ? labels[i] : v)}</title></rect>`).join("");
  return `<svg class="spark" viewBox="0 0 96 32" role="img" aria-label="Trend from ${values[0]} to ${values[values.length - 1]}"><path d="${d}"/><circle cx="${x(values.length - 1).toFixed(1)}" cy="${y(values[values.length - 1]).toFixed(1)}" r="4"/>${hits}</svg>`;
}
function chipGroup(name, options, selected, multi, extraCls) {
  const sel = (multi ? (selected || []) : [selected]).map(String);
  return `<div class="chips" role="group" data-chips="${name}" data-multi="${multi ? 1 : 0}">${options.map(o => {
    const v = typeof o === "object" ? o.id : o; const l = typeof o === "object" ? o.label : o;
    return `<button type="button" class="chip${extraCls ? " " + extraCls : ""}" data-chip="${esc(v)}" aria-pressed="${sel.includes(String(v))}">${esc(l)}</button>`;
  }).join("")}</div>`;
}
function readChips(scope, name) {
  const g = scope.querySelector(`[data-chips="${name}"]`);
  if (!g) return null;
  const on = [...g.querySelectorAll('[aria-pressed="true"]')].map(b => b.dataset.chip);
  return g.dataset.multi === "1" ? on : (on[0] == null ? null : on[0]);
}
function kgText(kg) { return kg ? kg + " kg" : "No weight"; }
function weightText(kg) {
  if (kg == null || kg === "") return "";
  if (db.settings.units === "st") { const lb = kg * 2.20462; let st = Math.floor(lb / 14), r = Math.round(lb - st * 14); if (r === 14) { st++; r = 0; } return st + " st " + r + " lb"; }
  return (Math.round(kg * 10) / 10) + " kg";
}
function videoUrl(id) { const mv = MOVES[id]; return "https://www.youtube.com/results?search_query=" + encodeURIComponent(mv && mv.video ? mv.video : moveName(id)); }

/* ---------- routing ---------- */
let route = "today";
let historyMonth = null;
function currentRoute() { return (location.hash || "#today").slice(1) || "today"; }
function go(r) { if (location.hash !== "#" + r) location.hash = r; else render(); }
window.addEventListener("hashchange", () => { closeSheet(); render(); });

function render() {
  route = currentRoute();
  const inWorkout = route.startsWith("workout-");
  document.body.classList.toggle("in-workout", inWorkout);
  document.body.classList.toggle("has-nav", !inWorkout);
  $("#nav").hidden = inWorkout;
  document.querySelectorAll("#nav a").forEach(a => { if (a.dataset.tab === route) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  if (!inWorkout) { resetAccent(); stopTimer(); wake(false); clearInterval(elapsedIv); }
  if (inWorkout) renderWorkout(route.slice(8));
  else if (route === "plan") renderPlan();
  else if (route === "history") renderHistory();
  else if (route === "me") renderMe();
  else renderToday();
  if (!inWorkout) window.scrollTo(0, 0);
}
function applyAccent(sid) {
  const col = colorOf(sid);
  root.style.setProperty("--accent", col.c);
  root.style.setProperty("--accent-t", col.t);
  root.style.setProperty("--on-accent", col.on);
}
function resetAccent() { applyAccent("legs"); }

/* ---------- TODAY ---------- */
let installPrompt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; if (route === "today" || route === "me") render(); });

function greeting() {
  const h = new Date().getHours();
  return (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening") + ", " + (db.settings.name || "Rachel");
}
function stageLine() { const p = db.prog; return `Month ${p.month} · week ${p.week} · workout ${p.count + 1} of ${perWeek()}`; }

function monthBar() {
  const p = db.prog, per = perWeek(), total = per * 4, done = (p.week - 1) * per + p.count;
  const m = monthPlan(p.month);
  return `<button type="button" class="monthbar" data-act="goto" data-to="plan"><span class="mb-top"><span><strong>Month ${p.month}: ${esc(m.name)}</strong></span><span class="muted tnum">${done} of ${total}</span></span>
    <span class="mb-track" aria-hidden="true">${Array.from({length: total}, (_, i) => `<i class="${i < done ? "on" : ""}${i % per === per - 1 && i < total - 1 ? " gap" : ""}"></i>`).join("")}</span></button>`;
}

function renderToday() {
  const t = todayStr();
  const ctx = curCtx();
  const st = statusOn(t);
  const ci = db.checkins[t];
  const lowDay = ci && ((ci.energy && Number(ci.energy) <= 2) || ci.sleep === "Poor");
  const now = new Date();
  let h = `<header class="top"><div><p class="eyebrow">${DOW_LONG[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}</p><h1 class="page-title">${esc(greeting())}</h1></div></header>`;

  const a = db.active;
  const doneToday = st.logs.filter(l => l.type === "workout");
  const skipToday = st.logs.find(l => l.type === "skip");
  if (a) {
    const s = sessionById(a.session);
    const mins = Math.max(1, Math.round((Date.now() - a.startedAt) / 60000));
    h += `<section class="hero" style="--c:${colorOf(a.session).c}"><p class="kicker">In progress, started ${mins > 180 ? "earlier" : mins + " min ago"}</p><h2>${esc(s.title)}</h2>
      <p class="meta">${esc(progressText(a))}</p>
      <div class="actions"><button type="button" class="btn accent wide" data-act="open" data-session="${s.id}">Carry on</button></div></section>`;
  } else if (doneToday.length) {
    const l = doneToday[doneToday.length - 1], s = sessionById(l.session);
    h += `<section class="hero" style="--c:${colorOf(l.session).c}"><p class="kicker"><span class="done-mark">✓ Done today</span></p><h2>${esc(s ? s.title : "Workout")}</h2>
      <p class="meta">${esc(logSummary(l))}</p>
      <div class="sub-actions"><button type="button" class="linkbtn" data-act="open" data-session="stretch">Stretch and reset</button><button type="button" class="linkbtn" data-act="day" data-date="${t}">View or edit</button></div></section>`;
  } else if (skipToday) {
    const next = sessionById(nextSessionId());
    h += `<section class="hero" style="--c:${COLORS.grey.c}"><p class="kicker">Rest taken today</p><h2>Not today</h2>
      <p class="meta">${esc(reasonLabel(skipToday.reason))}${skipToday.note ? ": " + esc(skipToday.note) : ""}. ${esc(next.title)} is still up next, and the plan waits for you.</p>
      <div class="sub-actions"><button type="button" class="linkbtn" data-act="open" data-session="stretch">Do a 12-minute stretch</button><button type="button" class="linkbtn" data-act="open" data-session="${next.id}">Changed my mind</button></div></section>`;
  } else if (isPlannedDay(t)) {
    const s = sessionById(nextSessionId());
    const full = estimate(s, "full", ctx), short = estimate(s, "short", ctx);
    h += `<section class="hero" style="--c:${colorOf(s.id).c}">
      <p class="kicker">Today's workout · ${esc(stageLine())}</p><h2>${esc(s.title)}</h2>
      <p class="meta">${aboutMins(full)} · ${esc(s.kit)}.</p>
      ${lowDay ? `<p class="meta"><strong>Rough night?</strong> The short version still counts and still moves the plan on.</p>` : ""}
      <div class="actions">
        <button type="button" class="btn ${lowDay ? "ghost" : "accent"} wide" data-act="start" data-session="${s.id}" data-mode="full">Start workout</button>
        <button type="button" class="btn ${lowDay ? "accent" : "ghost"} wide" data-act="start" data-session="${s.id}" data-mode="short">Short on time? ${aboutMins(short)}</button>
      </div>
      <div class="sub-actions" style="margin-top:8px"><button type="button" class="linkbtn" data-act="skip" data-date="${t}">I can't today</button><button type="button" class="linkbtn" data-act="open" data-session="${s.id}">Look through it first</button></div>
    </section>`;
  } else {
    const next = sessionById(nextSessionId());
    h += `<section class="hero" style="--c:${COLORS.green.c}"><p class="kicker">Rest day</p><h2>Recover well</h2>
      <p class="meta">A brisk lunchtime walk or the 12-minute stretch keeps you moving without eating into recovery.</p>
      <div class="actions"><button type="button" class="btn wide" data-act="activity" data-date="${t}">Log a walk or other activity</button>
      <button type="button" class="btn ghost wide" data-act="open" data-session="stretch">Stretch and reset</button></div>
      <div class="sub-actions" style="margin-top:8px"><button type="button" class="linkbtn" data-act="open" data-session="${next.id}">Do ${esc(next.title.toLowerCase())} anyway</button></div></section>`;
  }

  h += monthBar();

  /* coming back after a break */
  const pl = programmeLogs();
  const lastDate = pl.length ? pl[pl.length - 1].date : null;
  const gap = lastDate ? daysBetween(lastDate, t) : 0;
  if (!a && lastDate && gap >= 14 && (db.prog.week > 1 || db.prog.month > 1) && db.meta.welcomeBack !== lastDate) {
    h += `<div class="nudge" role="status"><p><strong>Welcome back.</strong> It's been ${gap} days since your last workout. Easing in with the previous week's plan is kinder on your joints.</p>
      <div class="row"><button type="button" class="btn small" data-act="easeback" data-last="${lastDate}">Repeat the previous week</button><button type="button" class="btn small ghost" data-act="carryon" data-last="${lastDate}">Carry on where I was</button></div></div>`;
  }

  const missed = missedDays();
  if (missed.length) {
    const d = missed[0];
    h += `<div class="nudge" role="status"><p><strong>${esc(niceDate(d, {long: true}))} was a workout day</strong> with nothing logged. What happened?</p>
      <div class="row"><button type="button" class="btn small" data-act="quicklog" data-date="${d}">I did a workout</button><button type="button" class="btn small ghost" data-act="skip" data-date="${d}">I skipped it</button></div>
      ${missed.length > 1 ? `<p class="muted" style="font-size:14px">${plural(missed.length - 1, "other day")} to fill in too. Tap them in History.</p>` : ""}</div>`;
  }

  const tally = weekTally(t), streak = weekStreak();
  h += `<h2 class="sec">This week <small>${tally.done} of ${tally.target} workouts</small></h2><div class="weekstrip">`;
  for (let i = 0; i < 7; i++) {
    const d = addDays(tally.mon, i);
    h += `<button type="button" class="wd${d === t ? " is-today" : ""}" data-act="day" data-date="${d}" aria-label="${esc(niceDate(d, {long: true}))}"><span>${DOW_SHORT[dowOf(d)].slice(0, 1)}</span>${dotFor(statusOn(d))}<b>${parse(d).getDate()}</b></button>`;
  }
  h += `</div><div class="weeksum"><span>${streak ? `${plural(streak, "week")} in a row on target` : "Hit your target this week to start a streak"}</span><span>Next up: ${esc(sessionById(nextSessionId()).short)}</span></div>`;

  h += `<h2 class="sec">How are you today? <small>optional</small></h2><div class="card">`;
  if (ci) {
    h += `<div class="checkin-sum"><p><strong>Checked in</strong></p><button type="button" class="btn small ghost" data-act="checkin" data-date="${t}">Edit</button></div><div class="tags">${checkinTags(ci) || '<span class="tag">No details</span>'}</div>`;
  } else {
    h += `<div class="checkin-sum"><p class="muted" style="font-size:15px;min-width:0">Energy, sleep, steps, symptoms and your period, in a few taps. It helps you spot patterns.</p><button type="button" class="btn small" data-act="checkin" data-date="${t}">Check in</button></div>`;
  }
  h += `</div>`;

  h += `<h2 class="sec">Log something else</h2><div class="row"><button type="button" class="btn small ghost" data-act="activity" data-date="${t}">Walk or other activity</button><button type="button" class="btn small ghost" data-act="quicklog" data-date="${t}">A workout I didn't track</button><button type="button" class="btn small ghost" data-act="measure">Weight or waist</button></div>`;

  if (installPrompt) h += `<div class="card install" style="margin-top:22px"><p><strong>Put this on your home screen</strong><br><span class="muted">Opens full screen and works offline.</span></p><button type="button" class="btn small accent" data-act="install">Install</button></div>`;
  const lb = db.meta.lastBackup;
  if (db.logs.length >= 5 && (!lb || daysBetween(lb.slice(0, 10), t) > 21)) {
    h += `<div class="nudge" style="margin-top:22px"><p><strong>Back up your history.</strong> It's only stored on this phone. A backup means you won't lose it if the phone is lost or reset.</p><div class="row"><button type="button" class="btn small" data-act="goto" data-to="me">Back up now</button></div></div>`;
  }
  if (!storageOk) h += `<div class="nudge" style="margin-top:22px"><p><strong>This browser isn't saving anything.</strong> Private browsing or blocked site data stops the app remembering your workouts. Open it in a normal Chrome tab instead.</p></div>`;
  $("#app").innerHTML = h;
}

const ENERGY = ["very low", "low", "OK", "good", "great"];
function checkinTags(c) {
  const tags = [];
  if (c.energy) tags.push(`<span class="tag">Energy ${esc(ENERGY[c.energy - 1])}</span>`);
  if (c.sleep) tags.push(`<span class="tag">Sleep ${esc(c.sleep.toLowerCase())}</span>`);
  if (c.mood) tags.push(`<span class="tag">Mood ${esc(c.mood.toLowerCase())}</span>`);
  if (c.steps) tags.push(`<span class="tag">${num(c.steps)} steps</span>`);
  if (c.period && c.period !== "None") tags.push(`<span class="tag period">Period: ${esc(c.period.toLowerCase())}</span>`);
  (c.symptoms || []).forEach(x => tags.push(`<span class="tag">${esc(x)}</span>`));
  return tags.join("");
}
function reasonLabel(id) { const r = SKIP_REASONS.find(x => x.id === id); return r ? r.label : "Skipped"; }
function logSummary(l) {
  const bits = [];
  if (l.mins) bits.push(l.mins + " min");
  if (l.mode === "short") bits.push("short");
  if (l.totalSets) bits.push(`${l.doneSets}/${l.totalSets} sets`);
  if (l.rounds) bits.push(plural(l.rounds, "round"));
  if (l.effort) bits.push(EFFORT[l.effort - 1].label.toLowerCase());
  return bits.join(" · ");
}
function progressText(a) {
  const s = sessionById(a.session);
  const ctx = stageCtx(a.month, a.week);
  const list = mainFor(s, ctx, a.mode);
  if (!list.length) return "Timer-led session";
  const sets = setsFor(ctx, a.mode);
  let done = 0;
  list.forEach(e => { done += (a.sets[e.ex] || []).filter(x => x && x.done).length; });
  return `${done} of ${list.length * sets} sets done`;
}

/* ---------- PLAN ---------- */
function renderPlan() {
  const p = db.prog, per = perWeek(), rot = rotation(), ctx = curCtx();
  const m = monthPlan(p.month);
  let h = `<header class="top"><div><p class="eyebrow">Month ${p.month} of your plan</p><h1 class="page-title">${esc(m.name)}</h1></div></header>`;
  h += `<p class="lead-p">${esc(m.aim)}</p>`;

  /* month grid: 4 weeks x workouts */
  const monthLogs = programmeLogs().filter(l => l.month === p.month);
  h += `<div class="card monthgrid">`;
  for (let w = 1; w <= 4; w++) {
    const wl = monthLogs.filter(l => l.week === w);
    const state = w < p.week ? "past" : w === p.week ? "now" : "next";
    h += `<div class="mg-row ${state}"><span class="mg-lbl">Week ${w}<small>${m.weeks[w - 1].sets} sets${m.weeks[w - 1].add ? " +" + m.weeks[w - 1].add : ""}</small></span><span class="mg-slots">`;
    for (let i = 0; i < per; i++) {
      let sid, done;
      if (state === "past") { sid = wl[i] ? wl[i].session : rot[i]; done = true; }
      else if (state === "now") { done = i < p.count; sid = done && wl[i] ? wl[i].session : rot[(rot.indexOf(nextSessionId()) + i - p.count + rot.length * 4) % rot.length]; }
      else { sid = rot[i]; done = false; }
      const s = sessionById(sid);
      h += `<span class="mg-slot${done ? " done" : ""}${state === "now" && i === p.count ? " cur" : ""}" title="${esc(s.title)}">${bellIcon(sid, s.short[0], !done)}</span>`;
    }
    h += `</span></div>`;
  }
  h += `<p class="muted" style="font-size:14px;margin:10px 0 0">The plan moves on when you've done the week's ${per} workouts, not when the calendar says so. Miss a few days and it simply waits.</p>
    <div class="row" style="margin-top:10px"><button type="button" class="btn small ghost" data-act="adjust">Change month or week</button></div></div>`;
  h += `<p class="weeknote"><strong>Week ${p.week}.</strong> ${esc(ctx.W.note)}</p>`;

  /* roadmap */
  h += `<h2 class="sec">The months ahead</h2><ol class="roadmap">`;
  const upto = Math.max(3, p.month + 1);
  for (let n = 1; n <= upto; n++) {
    const mm = monthPlan(n);
    h += `<li class="${n < p.month ? "past" : n === p.month ? "now" : ""}"><strong>Month ${n}${n > 3 ? "" : ""}: ${esc(mm.name)}</strong><span>${esc(mm.aim)}</span></li>`;
  }
  h += `</ol>`;

  h += `<h2 class="sec">Workouts <small>${plural(rot.length, "a week", "a week")}</small></h2>`;
  h += `<p class="muted" style="margin:-4px 0 10px;font-size:14.5px">${rot.length === 3 ? "Three strength sessions, each with a sweaty finisher. Choose a fourth workout day under Me and Sprints and sweat joins in." : "Three strength sessions plus sprints and a circuit."} They come round in order on your workout days.</p><div class="sess-list">`;
  SESSIONS.forEach(s => {
    const inRot = rot.includes(s.id);
    const full = estimate(s, "full", ctx), short = s.follow ? null : estimate(s, "short", ctx);
    const tag = s.id === "stretch" ? "Rest days" : inRot ? "Workout " + (rot.indexOf(s.id) + 1) : "Extra";
    h += `<button type="button" class="sess" data-act="open" data-session="${s.id}">${bellIcon(s.id, s.short[0])}<span><h3>${esc(s.title)}</h3><p>${tag} · ${aboutMins(full)}${short ? ` · short ${aboutMins(short).replace("about ", "")}` : ""}</p></span><span class="go-arrow" aria-hidden="true">›</span></button>`;
  });
  h += `</div>`;

  /* move library */
  const groups = {};
  Object.keys(MOVES).forEach(id => { if (!demoId(id)) return; const g = MOVES[id].pattern || "Other"; (groups[g] = groups[g] || []).push(id); });
  h += `<h2 class="sec">How to do each move <small>tap for a demo</small></h2><div class="card library">`;
  ["Squat", "Hinge", "Lunge", "Push", "Pull", "Arms", "Carry", "Core", "Conditioning", "Sprint", "Mobility"].forEach(g => {
    if (!groups[g]) return;
    h += `<div class="lib-group"><span class="lib-h">${esc(g)}</span><div class="chips">${groups[g].map(id => `<button type="button" class="chip" data-act="move" data-move="${id}">${esc(MOVES[id].name)}</button>`).join("")}</div></div>`;
  });
  h += `</div>`;

  h += `<section class="notes"><h2 class="sec">Before you start</h2><div class="stack">${NOTES.map(n => `<div class="card"><h3>${esc(n.h)}</h3><p>${esc(n.p)}</p></div>`).join("")}</div>`;
  h += `<h2 class="sec">Losing weight</h2><div class="stack">${LOSS_NOTES.map(n => `<div class="card"><h3>${esc(n.h)}</h3><p>${esc(n.p)}</p></div>`).join("")}</div>`;
  h += `<h2 class="sec">Training through perimenopause</h2><div class="stack">${MENO_NOTES.map(n => `<div class="card"><h3>${esc(n.h)}</h3><p>${esc(n.p)}</p></div>`).join("")}</div>`;
  h += `<p class="muted" style="font-size:13.5px;margin-top:16px">General fitness guidance, not medical advice. If you have heart, blood pressure or joint problems, or anything feels wrong, check with your GP.</p></section>`;
  $("#app").innerHTML = h;
}

/* ---------- WORKOUT ---------- */
let viewMode = {};
let elapsedIv = null;

function workoutCtx(sid) {
  const a = db.active && db.active.session === sid ? db.active : null;
  const ctx = a ? stageCtx(a.month, a.week) : curCtx();
  return {a: a, ctx: ctx, mode: a ? a.mode : (viewMode[sid] || "full")};
}
function startWorkout(sid, mode) {
  const p = db.prog;
  db.active = {session: sid, mode: mode || "full", month: p.month, week: p.week, startedAt: Date.now(), sets: {}, kg: {}};
  save();
}
function ensureActive(sid) { if (!db.active || db.active.session !== sid) startWorkout(sid, viewMode[sid] || "full"); return db.active; }

function renderWorkout(sid) {
  const s = sessionById(sid);
  if (!s) { go("today"); return; }
  applyAccent(sid);
  const {a, ctx, mode} = workoutCtx(sid);
  const other = db.active && db.active.session !== sid ? sessionById(db.active.session) : null;
  const est = estimate(s, mode, ctx);
  const hasShort = !s.follow;

  let h = `<div class="wk-bar"><button type="button" class="back" data-act="back">‹ Back</button><span class="elapsed" id="elapsed">${a ? fmtClock((Date.now() - a.startedAt) / 1000) : ""}</span></div>`;
  h += `<header class="session-head"><p class="when">${s.follow ? "Any day" : `Month ${ctx.month} · week ${ctx.week}`} · ${aboutMins(est)}</p><h1>${esc(s.title)}</h1><p class="kit">You'll need ${esc(s.kit)}.</p></header>`;
  if (hasShort) {
    h += `<div class="modes" role="group" aria-label="Length">
      <button type="button" class="chip accent" data-act="mode" data-mode="full" aria-pressed="${mode === "full"}">Full · ${estimate(s, "full", ctx)} min</button>
      <button type="button" class="chip accent" data-act="mode" data-mode="short" aria-pressed="${mode === "short"}">Short · ${estimate(s, "short", ctx)} min</button></div>`;
  }
  if (other) h += `<div class="nudge"><p>You have <strong>${esc(other.title)}</strong> in progress. Starting this one will replace it.</p></div>`;
  h += s.intro ? `<p class="weeknote">${esc(s.intro)}</p>` : `<p class="weeknote"><strong>Week ${ctx.week}.</strong> ${esc(ctx.W.note)}${mode === "short" ? " Short version: two sets of the first four moves and a shorter finisher." : ""}</p>`;
  if (!a) h += `<div class="finish-wrap" style="margin-top:14px"><button type="button" class="btn accent wide" data-act="begin" data-session="${sid}">Start ${s.follow ? "session" : "workout"}</button></div>`;

  const warm = warmFor(s, mode);
  if (warm.length) {
    h += `<h2 class="sec">Warm-up <small>${aboutMins(Math.round(warm.reduce((t, w) => t + w.secs, 0) / 60))}</small></h2>` + simpleList(warm)
      + `<button type="button" class="btn ghost small" data-act="timer" data-kind="warm">Follow along with the timer</button>`;
  }

  const list = mainFor(s, ctx, mode);
  if (list.length) {
    const sets = setsFor(ctx, mode);
    h += `<h2 class="sec">Main work <small>${sets} sets each</small></h2><p class="pairnote">Work in pairs: do the first move, rest briefly, do the second, rest, and repeat until both are done. Tap a move to see how, and tap a set number when you finish it.</p><ol class="exlist">`;
    groupsOf(list).forEach(g => {
      h += `<li class="pairgroup"><ol class="exlist" style="gap:4px">`;
      g.items.forEach((e, k) => { h += exerciseCard(e, g.letter + (g.items.length > 1 ? (k + 1) : ""), a, ctx, sets); });
      h += `</ol></li>`;
    });
    h += `</ol><p class="progress"><span id="prog">${a ? esc(progressText(a)) : ""}</span></p>`;
  }

  if (s.sprints) {
    const sp = sprintFor(ctx, mode);
    h += `<h2 class="sec">Sprints <small>${sp.reps} × ${sp.on}s</small></h2><div class="block"><p>${esc(s.sprints.text)}</p>
      <p><strong>${sp.reps} sprints of ${sp.on} seconds</strong>, with ${sp.off} seconds' easy walking between. The timer counts you in and out.</p>
      <div class="chips" style="margin-bottom:12px">${s.sprints.moves.map(id => `<button type="button" class="chip" data-act="move" data-move="${id}">How to: ${esc(moveName(id))}</button>`).join("")}</div>
      <button type="button" class="btn accent" data-act="timer" data-kind="sprints">Start sprints</button></div>`;
  }

  if (s.circuit) {
    const c = circFor(ctx, mode);
    h += `<h2 class="sec">Circuit <small>${plural(c.rounds, "round")}</small></h2>
      <div class="block"><p>${c.work} seconds on, ${c.rest} seconds off, through all ${s.circuit.moves.length} moves. ${s.circuit.roundRest} seconds' rest between rounds. The timer calls out each move.</p>
      ${moveList(s.circuit.moves)}
      <button type="button" class="btn accent" data-act="timer" data-kind="circuit">Start circuit</button></div>`;
  }

  if (s.follow) {
    h += `<h2 class="sec">Follow-along <small>12 minutes</small></h2><div class="block"><p>${s.follow.moves.length} stretches, ${s.follow.work} seconds each.</p>
      <ol class="moves">${s.follow.moves.map(m => `<li><strong>${esc(m.name)}</strong>${m.cue ? `<span class="cue">${esc(m.cue)}</span>` : ""}</li>`).join("")}</ol>
      <button type="button" class="btn accent" data-act="timer" data-kind="follow">Start follow-along</button></div>`;
  }

  if (s.finisher) {
    const f = s.finisher, fm = finMins(ctx, mode), mctx = Object.assign({}, ctx.m, {fin: fm});
    h += `<h2 class="sec">Finisher <small>${fm} minutes</small></h2><div class="block"><p class="fname">${esc(f.name)}</p><p>${esc(finisherText(f, mctx, fm))}</p>${f.cue ? `<p class="alt">${esc(f.cue)}</p>` : ""}
      ${f.moves ? moveList(f.moves) : f.ex ? moveList([f.ex]) : ""}
      <button type="button" class="btn accent" data-act="timer" data-kind="finisher">Start timer</button></div>`;
  }

  const cool = coolFor(s, mode);
  if (cool.length) {
    h += `<h2 class="sec">Cool-down <small>${aboutMins(Math.max(1, Math.round(cool.reduce((t, w) => t + w.secs, 0) / 60)))}</small></h2>` + simpleList(cool)
      + `<button type="button" class="btn ghost small" data-act="timer" data-kind="cool">Follow along with the timer</button>`;
  }

  h += `<div class="finish-wrap">`;
  if (a) h += `<button type="button" class="btn accent wide" data-act="finish">Finish and log</button><div id="discard-zone"><button type="button" class="linkbtn danger" data-act="discard">Discard this workout</button></div>`;
  else h += `<button type="button" class="btn ghost wide" data-act="quicklog" data-date="${todayStr()}" data-session="${sid}">Already did it? Log it without tracking</button>`;
  h += `</div>`;

  const openIds = [...document.querySelectorAll('.ex-head[aria-expanded="true"]')].map(b => b.getAttribute("aria-controls"));
  $("#app").innerHTML = h;
  openIds.forEach(id => { const b = document.querySelector(`[aria-controls="${id}"]`); const body = document.getElementById(id); if (b && body) { b.setAttribute("aria-expanded", "true"); body.hidden = false; } });

  clearInterval(elapsedIv);
  if (a) {
    wake(true);
    elapsedIv = setInterval(() => {
      const el = $("#elapsed");
      if (!el || !db.active) { clearInterval(elapsedIv); return; }
      el.textContent = fmtClock((Date.now() - db.active.startedAt) / 1000);
    }, 1000);
  }
}
function finisherText(f, mctx, fm) {
  if (f.kind === "emom") return f.text(mctx) + ` ${fm} minutes in total.`;
  if (f.kind === "circuit") return f.text(mctx) + ` ${plural(coreRounds(fm), "round")}.`;
  return f.text(mctx);
}
function coreRounds(fm) { return Math.max(1, Math.round(fm * 60 / (4 * 45))); }
function moveList(moves) {
  return `<ol class="moves">${moves.map(m => { const id = moveId(m); const has = !!demoId(id);
    return `<li>${has ? `<button type="button" class="movelink" data-act="move" data-move="${id}">${esc(moveName(m))}</button>` : `<strong>${esc(moveName(m))}</strong>`}</li>`; }).join("")}</ol>`;
}
function simpleList(rows) {
  return `<ul class="simple">${rows.map(r => {
    const has = r.ex && demoId(r.ex);
    return `<li><span>${has ? `<button type="button" class="movelink" data-act="move" data-move="${r.ex}">${esc(itemName(r))}</button>` : esc(itemName(r))}${r.cue ? `<span class="cue">${esc(r.cue)}</span>` : ""}</span><span class="amt">${esc(r.amt)}</span></li>`;
  }).join("")}</ul>`;
}
function groupsOf(list) {
  const out = [];
  list.forEach((e, i) => {
    const letter = e.pair || String.fromCharCode(65 + i);
    let g = out.find(x => x.letter === letter);
    if (!g) { g = {letter: letter, items: []}; out.push(g); }
    g.items.push(e);
  });
  return out;
}
function moveGuide(id, withDemo) {
  const mv = MOVES[id]; if (!mv) return "";
  const d = demoId(id);
  return `${withDemo && d ? `<div class="demo">${Figure.markup(d)}</div>` : ""}
    <ol class="steps">${mv.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol>
    ${mv.watch && mv.watch.length ? `<p class="guide-h">Watch out for</p><ul class="watch">${mv.watch.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    ${mv.easier || mv.harder ? `<dl class="options">${mv.easier ? `<div><dt>Easier</dt><dd>${esc(mv.easier)}</dd></div>` : ""}${mv.harder ? `<div><dt>Harder</dt><dd>${esc(mv.harder)}</dd></div>` : ""}</dl>` : ""}
    <a class="videolink" href="${esc(videoUrl(id))}" target="_blank" rel="noopener">Watch videos of this move ↗</a>`;
}
function exerciseCard(e, label, a, ctx, sets) {
  const mv = MOVES[e.ex];
  const ticks = a ? (a.sets[e.ex] || []) : [];
  const kg = a && a.kg[e.ex] != null ? a.kg[e.ex] : defaultKg(e.ex, ctx);
  const target = amountFor(e, ctx);
  let circles = "";
  for (let n = 0; n < sets; n++) {
    const t = ticks[n], done = !!(t && t.done);
    const shown = done && t.reps !== target ? `<small>${t.reps}</small>` : "";
    circles += `<button type="button" class="set" data-act="set" data-ex="${e.ex}" data-set="${n}" aria-pressed="${done}" aria-label="${esc(mv.name)}, set ${n + 1}${done ? ", done" : ""}">${n + 1}${shown}</button>`;
  }
  const last = lastFor(e.ex);
  let lastTxt = "";
  if (last) { const ls = last.sets[e.ex], k = topKg(ls); lastTxt = `Last: ${ls.length} × ${ls[0].reps}${e.secs ? "s" : ""}${k ? " at " + k + " kg" : ""}`; }
  const up = readyToGoUp(e);
  let upBtn = "";
  if (up && up.to && kg < up.to) upBtn = `<button type="button" class="upnudge" data-act="kgset" data-ex="${e.ex}" data-kg="${up.to}">Ready for ${up.to} kg?</button>`;
  else if (up && !up.to) upBtn = `<span class="last" style="color:var(--good);font-weight:700">Ready for more: add 2 reps</span>`;
  const tools = (mv.lift || lastTxt || upBtn) ? `<div class="ex-tools">${mv.lift ? `<button type="button" class="kg" data-act="kg" data-ex="${e.ex}" aria-label="Weight for ${esc(mv.name)}: ${kgText(kg)}. Change">${kgText(kg)} ▾</button>` : ""}${lastTxt ? `<span class="last">${esc(lastTxt)}</span>` : ""}${upBtn}</div>` : "";
  return `<li class="ex">
    <button type="button" class="ex-head" aria-expanded="false" aria-controls="exb-${e.ex}">
      <span class="num">${label}</span><span class="ex-name">${esc(mv.name)}<span class="howto">How to do it</span></span>
      <span class="dose">${sets} × ${doseText(e, ctx)}${e.each ? "<small>each side</small>" : ""}</span>${chev}
    </button>
    <div class="ex-body" id="exb-${e.ex}" hidden>${moveGuide(e.ex, true)}</div>
    ${tools}
    <div class="sets">${circles}<span class="restnote">Rest ${restFor(e, ctx)}s</span></div>
  </li>`;
}
function nextAfterSet(s, a, exId) {
  const ctx = stageCtx(a.month, a.week);
  const sets = setsFor(ctx, a.mode);
  const groups = groupsOf(mainFor(s, ctx, a.mode));
  const gi = groups.findIndex(g => g.items.some(e => e.ex === exId));
  const isDone = (id, k) => { const t = (a.sets[id] || [])[k]; return !!(t && t.done); };
  for (let g = gi; g < groups.length; g++) for (let k = 0; k < sets; k++) for (const e of groups[g].items) if (!isDone(e.ex, k)) return {name: MOVES[e.ex].name, set: k + 1, id: e.ex};
  for (let g = 0; g < gi; g++) for (let k = 0; k < sets; k++) for (const e of groups[g].items) if (!isDone(e.ex, k)) return {name: MOVES[e.ex].name, set: k + 1, id: e.ex};
  return null;
}
function tickSet(exId, n) {
  const s = sessionById(route.slice(8));
  const a = ensureActive(s.id);
  const ctx = stageCtx(a.month, a.week);
  const e = mainFor(s, ctx, a.mode).find(x => x.ex === exId);
  const list = a.sets[exId] || [];
  const kg = a.kg[exId] != null ? a.kg[exId] : defaultKg(exId, ctx);
  list[n] = {done: true, reps: amountFor(e, ctx), kg: MOVES[exId].lift ? kg : 0};
  a.sets[exId] = list;
  save();
  renderWorkout(s.id);
  const next = nextAfterSet(s, a, exId);
  if (!next) {
    const after = s.finisher ? "Now the finisher." : s.sprints ? "Now the sprints." : "Now the cool-down.";
    toast("All sets done. " + after); speak("All sets done. " + after); return;
  }
  const label = `${next.name}, set ${next.set}`;
  startQueue([{phase: "rest", title: "Rest", sub: "Next: " + label, secs: restFor(e, ctx), say: `Rest. Next, ${label}.`, demo: demoId(next.id)}]);
}

/* ---------- HISTORY ---------- */
function renderHistory() {
  const t = todayStr();
  if (!historyMonth) historyMonth = t.slice(0, 7);
  const [yy, mm] = historyMonth.split("-").map(Number);
  const firstStr = ymd(new Date(yy, mm - 1, 1)), lastStr = ymd(new Date(yy, mm, 0));

  let h = `<header class="top"><div><p class="eyebrow">Your record</p><h1 class="page-title">History</h1></div></header>`;
  h += `<div class="cal-head"><button type="button" class="iconbtn" data-act="month" data-dir="-1" aria-label="Previous month">‹</button><h2>${MONTHS[mm - 1]} ${yy}</h2><button type="button" class="iconbtn" data-act="month" data-dir="1" aria-label="Next month">›</button></div>`;
  h += `<div class="cal">${["M", "T", "W", "T", "F", "S", "S"].map(d => `<span class="dow" aria-hidden="true">${d}</span>`).join("")}`;
  let d = mondayOf(firstStr);
  const end = addDays(mondayOf(lastStr), 6);
  while (d <= end) {
    const inMonth = d >= firstStr && d <= lastStr;
    const st = statusOn(d);
    const ci = db.checkins[d];
    const period = ci && ci.period && ci.period !== "None";
    h += `<button type="button" class="cell${inMonth ? "" : " out"}${d === t ? " today" : ""}" data-act="day" data-date="${d}" aria-label="${esc(niceDate(d, {long: true}))}"><span>${parse(d).getDate()}</span>${d <= t || st.kind === "plan" ? dotFor(st) : ""}${period ? '<span class="pd" aria-hidden="true"></span>' : ""}</button>`;
    d = addDays(d, 1);
  }
  h += `</div><div class="legend"><span>${dotFor({kind: "done", session: "legs"})}Workout</span><span>${dotFor({kind: "activity"})}Other activity</span><span>${dotFor({kind: "skip"})}Skipped</span><span>${dotFor({kind: "miss"})}Not logged</span><span><i class="pdl"></i>Period</span></div>`;

  const mw = workoutsBetween(firstStr, lastStr);
  const mins = db.logs.filter(l => l.date >= firstStr && l.date <= lastStr && (l.type === "workout" || l.type === "activity")).reduce((s, l) => s + (Number(l.mins) || 0), 0);
  const skips = db.logs.filter(l => l.type === "skip" && l.date >= firstStr && l.date <= lastStr).length;
  h += `<h2 class="sec">${MONTHS[mm - 1]}</h2><div class="tiles">
    <div class="tile"><b>${mw.length}</b><span>workouts</span></div><div class="tile"><b>${mins}</b><span>active minutes</span></div>
    <div class="tile"><b>${skips}</b><span>skipped</span></div><div class="tile"><b>${weekStreak()}</b><span>week streak</span></div></div>`;

  /* body */
  const ms = db.measures.slice().sort((a, b) => a.date.localeCompare(b.date));
  const wts = ms.filter(m => m.kg), wst = ms.filter(m => m.waist);
  h += `<h2 class="sec">Body <small>optional</small></h2><div class="card">`;
  if (wts.length || wst.length) {
    h += `<div class="lifts">`;
    if (wts.length) {
      const ch = wts.length > 1 ? wts[wts.length - 1].kg - wts[0].kg : 0;
      h += `<div class="lift"><span><span class="n">Weight</span><br><span class="s">${wts.length > 1 ? `${ch <= 0 ? "down" : "up"} ${esc(weightText(Math.abs(ch)).replace(/^0 st /, ""))} since ${esc(niceDate(wts[0].date))}` : "first entry"}</span></span>${sparkline(wts.map(m => m.kg), wts.map(m => niceDate(m.date) + ": " + weightText(m.kg)))}<span class="v">${esc(weightText(wts[wts.length - 1].kg))}</span></div>`;
    }
    if (wst.length) {
      const ch = wst.length > 1 ? wst[wst.length - 1].waist - wst[0].waist : 0;
      h += `<div class="lift"><span><span class="n">Waist</span><br><span class="s">${wst.length > 1 ? `${ch <= 0 ? "down" : "up"} ${Math.abs(Math.round(ch * 10) / 10)} cm since ${esc(niceDate(wst[0].date))}` : "first entry"}</span></span>${sparkline(wst.map(m => m.waist), wst.map(m => niceDate(m.date) + ": " + m.waist + " cm"))}<span class="v">${wst[wst.length - 1].waist} cm</span></div>`;
    }
    h += `</div>`;
  } else {
    h += `<p class="muted" style="margin:0 0 10px;font-size:14.5px">Weigh in once a week at most, same time of day, and measure your waist once a month. Trends matter; single days don't.</p>`;
  }
  h += `<div class="row" style="margin-top:10px"><button type="button" class="btn small" data-act="measure">Add weight or waist</button>${ms.length ? `<button type="button" class="btn small ghost" data-act="measures">See all</button>` : ""}</div></div>`;

  /* lifts */
  const lifts = [];
  Object.keys(MOVES).forEach(id => {
    if (!MOVES[id].lift) return;
    const hist = exerciseHistory(id).slice(-10);
    if (!hist.length) return;
    const vals = hist.map(l => topKg(l.sets[id]));
    if (!vals.some(Boolean)) return;
    lifts.push({id: id, vals: vals, labels: hist.map((l, i) => `${niceDate(l.date)}: ${vals[i]} kg`), n: hist.length});
  });
  const rounds = db.logs.filter(l => l.type === "workout" && l.rounds).sort(byTime).slice(-10);
  if (lifts.length || rounds.length) {
    h += `<h2 class="sec">Getting stronger <small>heaviest bell per session</small></h2><div class="card lifts">`;
    lifts.forEach(x => { h += `<div class="lift"><span><span class="n">${esc(MOVES[x.id].name)}</span><br><span class="s">${plural(x.n, "session")}</span></span>${sparkline(x.vals, x.labels)}<span class="v">${x.vals[x.vals.length - 1]} kg</span></div>`; });
    if (rounds.length) { const v = rounds.map(l => Number(l.rounds)); h += `<div class="lift"><span><span class="n">Round-up</span><br><span class="s">rounds completed</span></span>${sparkline(v, rounds.map(l => `${niceDate(l.date)}: ${l.rounds} rounds`))}<span class="v">${v[v.length - 1]}</span></div>`; }
    h += `</div>`;
  }

  /* skipped */
  const since = addDays(t, -90);
  const skipLogs = db.logs.filter(l => l.type === "skip" && l.date >= since);
  const unlogged = missedDays().length;
  if (skipLogs.length || unlogged) {
    const counts = {};
    skipLogs.forEach(l => { counts[l.reason || "other"] = (counts[l.reason || "other"] || 0) + 1; });
    const rows = Object.entries(counts).map(([k, v]) => [reasonLabel(k), v]).sort((a, b) => b[1] - a[1]);
    if (unlogged) rows.push(["Not logged yet", unlogged]);
    const max = Math.max(...rows.map(r => r[1]));
    h += `<h2 class="sec">Why workouts were missed <small>last 90 days</small></h2><div class="card"><div class="bars">${rows.map(([k, v]) => `<div class="bar-row"><span>${esc(k)}</span><span class="v">${v}</span><span class="track"><i style="width:${(v / max) * 100}%"></i></span></div>`).join("")}</div>${insightLine(skipLogs)}</div>`;
  }

  /* feelings */
  const ciDays = Object.keys(db.checkins).filter(k => k >= addDays(t, -30));
  if (ciDays.length) {
    const sym = {};
    let periodDays = 0, eSum = 0, eN = 0, sSum = 0, sN = 0;
    ciDays.forEach(k => {
      const c = db.checkins[k];
      (c.symptoms || []).forEach(x => { sym[x] = (sym[x] || 0) + 1; });
      if (c.period && c.period !== "None") periodDays++;
      if (c.energy) { eSum += Number(c.energy); eN++; }
      if (c.steps) { sSum += Number(c.steps); sN++; }
    });
    const rows = Object.entries(sym).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = rows.length ? rows[0][1] : 1;
    const facts = [plural(ciDays.length, "check-in")];
    if (eN) facts.push(`average energy ${ENERGY[Math.round(eSum / eN) - 1]}`);
    if (sN) facts.push(`${num(Math.round(sSum / sN / 100) * 100)} steps a day`);
    if (periodDays) facts.push(plural(periodDays, "period day"));
    h += `<h2 class="sec">How you've felt <small>last 30 days</small></h2><div class="card"><p style="margin:0 0 10px">${esc(facts.join(" · "))}</p>
      ${rows.length ? `<div class="bars">${rows.map(([k, v]) => `<div class="bar-row"><span>${esc(k)}</span><span class="v">${v}d</span><span class="track"><i style="width:${(v / max) * 100}%"></i></span></div>`).join("")}</div>` : `<p class="muted" style="margin:0">No symptoms logged.</p>`}</div>`;
  }

  const recent = db.logs.slice().sort((a, b) => byTime(b, a)).slice(0, 20);
  h += `<h2 class="sec">Recent</h2>`;
  h += recent.length ? `<div class="entries">${recent.map(entryRow).join("")}</div>` : `<div class="empty">Nothing logged yet. Finish a workout, log a walk or record a skipped day and it shows up here.</div>`;
  $("#app").innerHTML = h;
}
function insightLine(skips) {
  if (skips.length < 3) return "";
  const byDow = {};
  skips.forEach(l => { const k = dowOf(l.date); byDow[k] = (byDow[k] || 0) + 1; });
  const top = Object.entries(byDow).sort((a, b) => b[1] - a[1])[0];
  const withSym = skips.filter(l => { const c = db.checkins[l.date]; return c && ((c.symptoms || []).length || (c.period && c.period !== "None") || c.sleep === "Poor"); }).length;
  const bits = [];
  if (top[1] / skips.length >= 0.4) bits.push(`${top[1]} of ${skips.length} skips were on a ${DOW_LONG[top[0]]}. Would another day suit better?`);
  if (withSym >= 2) bits.push(`${withSym} of ${skips.length} skips were on days with symptoms, a period or poor sleep. On days like that the short version or the stretch is a good fallback.`);
  return bits.length ? `<p class="muted" style="margin:12px 0 0;font-size:14.5px">${esc(bits.join(" "))}</p>` : "";
}
function entryRow(l) {
  let title, sub, dot;
  if (l.type === "workout") { const s = sessionById(l.session); title = s ? s.title : "Workout"; sub = logSummary(l); dot = dotFor({kind: "done", session: l.session}); }
  else if (l.type === "activity") { title = l.activity || "Activity"; sub = [l.mins ? l.mins + " min" : "", l.note].filter(Boolean).join(" · "); dot = dotFor({kind: "activity"}); }
  else { title = "Skipped"; sub = [reasonLabel(l.reason), l.note].filter(Boolean).join(" · "); dot = dotFor({kind: "skip"}); }
  return `<button type="button" class="entry" data-act="day" data-date="${l.date}">${dot}<span style="min-width:0"><h3>${esc(title)}</h3><p>${esc(sub)}</p></span><span class="when">${esc(niceDate(l.date))}</span></button>`;
}

/* ---------- ME ---------- */
function renderMe() {
  const S = db.settings;
  let h = `<header class="top"><div><p class="eyebrow">Settings and data</p><h1 class="page-title">Me</h1></div></header>`;
  h += `<h2 class="sec">Your week</h2><div class="card">
    <div class="field"><span class="lbl">Workout days</span><p class="help">Pick 3 or 4. With 4, Sprints and sweat joins the rotation.</p>
      ${chipGroup("days", [1, 2, 3, 4, 5, 6, 0].map(n => ({id: n, label: DOW_SHORT[n]})), S.days, true)}</div>
    <div class="field"><label for="lunch">Usual workout time</label><input type="time" id="lunch" value="${esc(S.lunch)}"></div>
    <div class="field"><a class="btn ghost wide" id="cal-link" href="${esc(calendarUrl())}" target="_blank" rel="noopener">Add reminders to Google Calendar</a><p class="help">Adds a repeating 45-minute event on your workout days, so your phone reminds you and colleagues see you're busy.</p></div>
    <div class="field"><label for="stepgoal">Daily step goal</label><input type="number" id="stepgoal" inputmode="numeric" min="1000" step="500" value="${S.stepGoal}"></div>
  </div>`;
  h += `<h2 class="sec">Kettlebells you have</h2><div class="card"><div class="field"><p class="help">Used to pick starting weights and to suggest when to move up.</p>
    ${chipGroup("bells", BELL_OPTIONS.map(n => ({id: n, label: n + " kg"})), S.bells, true)}</div></div>`;
  h += `<h2 class="sec">During workouts</h2><div class="card">
    ${toggleRow("sound", "Beeps", "Countdown beeps at the end of each rest and interval.")}
    ${toggleRow("voice", "Spoken cues", "Says what's next, so you can leave the phone on the floor.")}
    ${toggleRow("vibrate", "Vibrate", "Buzzes when a rest or interval ends.")}</div>`;
  h += `<h2 class="sec">Appearance and units</h2><div class="card"><div class="field"><span class="lbl">Theme</span>${chipGroup("theme", [{id: "system", label: "Match phone"}, {id: "light", label: "Light"}, {id: "dark", label: "Dark"}], S.theme, false)}</div>
    <div class="field"><span class="lbl">Body weight in</span>${chipGroup("units", [{id: "kg", label: "kg"}, {id: "st", label: "stone and pounds"}], S.units, false)}</div>
    <div class="field"><label for="name">Your name</label><input type="text" id="name" value="${esc(S.name)}" autocomplete="given-name"></div></div>`;

  const preview = !!window.RW_NO_SW;
  const canShare = !preview && (() => { try { return !!(navigator.canShare && navigator.canShare({files: [new File(["{}"], "t.json", {type: "application/json"})]})); } catch (e) { return false; } })();
  h += `<h2 class="sec">Back up and restore</h2><div class="card">
    <p style="margin:0 0 12px;font-size:15px">Your history lives on this phone only. ${db.meta.lastBackup ? `Last backup: ${esc(niceDate(db.meta.lastBackup.slice(0, 10)))}.` : "You haven't made a backup yet."}</p>
    <div class="stack">
      ${canShare ? `<button type="button" class="btn wide" data-act="sharebackup">Send backup to Drive or email</button>` : ""}
      ${preview ? "" : `<button type="button" class="btn ${canShare ? "ghost" : ""} wide" data-act="savebackup">Save backup file</button>`}
      <button type="button" class="btn ghost wide" data-act="copybackup">Copy backup as text</button>
      <button type="button" class="btn ghost wide" data-act="restore">Restore from a backup</button>
    </div>
    ${preview ? `<p class="muted" style="font-size:13.5px;margin:12px 0 0">This is the preview version. For file backups and offline use, install the app from its own web address.</p>` : ""}
    <p class="muted" style="font-size:13.5px;margin:12px 0 0">${plural(db.logs.length, "entry", "entries")} · ${plural(Object.keys(db.checkins).length, "check-in")} · ${plural(db.measures.length, "measurement")}</p></div>`;
  h += `<h2 class="sec">Install on your phone</h2><div class="card"><p style="margin:0;font-size:15px">In Chrome, tap the <strong>⋮</strong> menu, then <strong>Add to home screen</strong>, then <strong>Install</strong>. It opens like an app, full screen, and works offline.</p>
    ${installPrompt ? `<button type="button" class="btn accent small" style="margin-top:10px" data-act="install">Install now</button>` : ""}</div>`;
  h += `<h2 class="sec">Start again</h2><div class="card danger-zone"><p style="margin:0 0 8px;font-size:15px">Deletes every workout, check-in and setting from this phone.</p><div id="erase-zone"><button type="button" class="linkbtn danger" data-act="erase">Erase everything</button></div></div>`;
  $("#app").innerHTML = h;
}
function toggleRow(key, label, help) {
  return `<div class="toggle"><span><strong>${esc(label)}</strong><br><span class="muted" style="font-size:13.5px">${esc(help)}</span></span><button type="button" class="switch" role="switch" aria-checked="${!!db.settings[key]}" aria-label="${esc(label)}" data-act="toggle" data-key="${key}"></button></div>`;
}
function calendarUrl() {
  const S = db.settings;
  const days = S.days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (!days.length) return "https://calendar.google.com/";
  let d = todayStr();
  for (let i = 0; i < 7 && !days.includes(dowOf(d)); i++) d = addDays(d, 1);
  const [hh, mi] = (S.lunch || "12:15").split(":").map(Number);
  const endMin = hh * 60 + mi + 45;
  const base = d.replace(/-/g, "");
  const start = base + "T" + pad(hh) + pad(mi) + "00", end = base + "T" + pad(Math.floor(endMin / 60) % 24) + pad(endMin % 60) + "00";
  const byday = days.map(n => ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][n]).join(",");
  const appUrl = /^https?:$/.test(location.protocol) && !/claude/.test(location.hostname) ? location.origin + location.pathname : "";
  const p = new URLSearchParams({action: "TEMPLATE", text: "Workout", dates: start + "/" + end, recur: "RRULE:FREQ=WEEKLY;BYDAY=" + byday,
    details: "Lunchtime workout, 30 to 45 minutes." + (appUrl ? "\n" + appUrl : "")});
  try { p.set("ctz", Intl.DateTimeFormat().resolvedOptions().timeZone); } catch (e) {}
  return "https://calendar.google.com/calendar/render?" + p.toString();
}

/* ---------- sheets ---------- */
let sheetCtx = null;
function openSheet(html, ctx) {
  sheetCtx = ctx || {};
  $("#sheet-root").innerHTML = `<div class="sheet-wrap" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div class="grab" aria-hidden="true"></div>${html}</div></div>`;
  document.body.classList.add("sheet-open");
  const f = $("#sheet-root .sheet h2");
  if (f) { f.setAttribute("tabindex", "-1"); f.focus({preventScroll: true}); }
}
function closeSheet() { $("#sheet-root").innerHTML = ""; sheetCtx = null; document.body.classList.remove("sheet-open"); }
function sheetEl() { return $("#sheet-root .sheet"); }
function foot(saveAct, saveLabel, extra) { return `<div class="foot"><button type="button" class="btn accent wide" data-act="${saveAct}">${saveLabel}</button>${extra || ""}<button type="button" class="btn ghost wide" data-act="close">Cancel</button></div>`; }

function moveSheet(id) {
  const mv = MOVES[id]; if (!mv) return;
  openSheet(`<h2 id="sheet-title">${esc(mv.name)}</h2><p class="lead">${esc(mv.pattern || "")}${mv.lift ? " · kettlebell" : " · bodyweight"}</p>${moveGuide(id, true)}
    <div class="foot"><button type="button" class="btn ghost wide" data-act="close">Close</button></div>`);
}
function skipSheet(date) {
  openSheet(`<h2 id="sheet-title">Skipping ${date === todayStr() ? "today" : esc(niceDate(date, {long: true}))}</h2>
    <p class="lead">No guilt. The plan waits for you, and logging why helps you spot what gets in the way.</p>
    <div class="section"><span class="lbl">What got in the way?</span>${chipGroup("reason", SKIP_REASONS, null, false)}</div>
    <div class="section"><label class="lbl" for="skip-note">Anything to add?</label><textarea id="skip-note" placeholder="Optional"></textarea></div>
    ${foot("saveskip", "Log it")}`, {date: date});
}
function activitySheet(date) {
  openSheet(`<h2 id="sheet-title">Other activity</h2><p class="lead">${esc(niceDate(date, {long: true}))}. Walks count.</p>
    <div class="section"><span class="lbl">What did you do?</span>${chipGroup("activity", ACTIVITIES, "Walk", false)}</div>
    <div class="section"><span class="lbl">How long?</span>${stepper("mins", 30, 5, 5, 240, "min")}</div>
    <div class="section"><label class="lbl" for="act-note">Note</label><textarea id="act-note" placeholder="Optional"></textarea></div>
    ${foot("saveactivity", "Save")}`, {date: date});
}
function quickLogSheet(date, sid) {
  const def = sid || nextSessionId();
  openSheet(`<h2 id="sheet-title">Log a workout</h2><p class="lead">${esc(niceDate(date, {long: true}))}. For a session you did without tracking it here. It still moves the plan on.</p>
    <div class="section"><span class="lbl">Which one?</span>${chipGroup("session", SESSIONS.map(s => ({id: s.id, label: s.title})), def, false)}</div>
    <div class="section"><span class="lbl">How long?</span>${stepper("mins", 35, 5, 5, 180, "min")}</div>
    <div class="section"><span class="lbl">How did it feel?</span>${effortPicker(null)}</div>
    <div class="section"><label class="lbl" for="q-note">Note</label><textarea id="q-note" placeholder="Optional"></textarea></div>
    ${foot("savequick", "Save")}`, {date: date});
}
function checkinSheet(date) {
  const c = db.checkins[date] || {};
  openSheet(`<h2 id="sheet-title">Check-in</h2><p class="lead">${esc(niceDate(date, {long: true}))}. Fill in as much or as little as you like.</p>
    <div class="section"><span class="lbl">Energy</span>${chipGroup("energy", [1, 2, 3, 4, 5].map(n => ({id: n, label: ENERGY[n - 1][0].toUpperCase() + ENERGY[n - 1].slice(1)})), c.energy, false)}</div>
    <div class="section"><span class="lbl">Sleep last night</span>${chipGroup("sleep", ["Poor", "OK", "Good"], c.sleep, false)}</div>
    <div class="section"><span class="lbl">Mood</span>${chipGroup("mood", ["Low", "OK", "Good"], c.mood, false)}</div>
    <div class="section"><label class="lbl" for="ci-steps">Steps <span class="muted">(from your phone or watch)</span></label><input type="number" id="ci-steps" inputmode="numeric" min="0" step="100" value="${c.steps || ""}" placeholder="Goal ${num(db.settings.stepGoal)}"></div>
    <div class="section"><span class="lbl">Period</span>${chipGroup("period", ["None", "Spotting", "Light", "Medium", "Heavy"], c.period, false)}</div>
    <div class="section"><span class="lbl">Symptoms</span>${chipGroup("symptoms", SYMPTOMS, c.symptoms, true)}</div>
    <div class="section"><label class="lbl" for="ci-note">Note</label><textarea id="ci-note" placeholder="Optional">${esc(c.note || "")}</textarea></div>
    ${foot("savecheckin", "Save", db.checkins[date] ? `<button type="button" class="btn ghost wide" data-act="delcheckin">Clear this check-in</button>` : "")}`, {date: date});
}
function daySheet(date) {
  const L = logsOn(date), c = db.checkins[date], future = date > todayStr();
  let h = `<h2 id="sheet-title">${esc(niceDate(date, {long: true}))}</h2><p class="lead">${isPlannedDay(date) ? "A workout day" : "A rest day"}${future ? ", coming up" : ""}.</p>`;
  if (L.length) {
    h += `<div class="stack">${L.map(l => `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:start"><div style="min-width:0"><strong>${esc(l.type === "workout" ? (sessionById(l.session) || {}).title || "Workout" : l.type === "activity" ? l.activity : "Skipped")}</strong>
      <p class="muted" style="margin:2px 0 0;font-size:14px">${esc(l.type === "workout" ? (l.month ? `Month ${l.month}, week ${l.week} · ` : "") + logSummary(l) : l.type === "skip" ? reasonLabel(l.reason) : (l.mins ? l.mins + " min" : ""))}</p>
      ${l.niggles && l.niggles.length ? `<p class="muted" style="margin:2px 0 0;font-size:14px">Niggles: ${esc(l.niggles.join(", "))}</p>` : ""}${l.note ? `<p style="margin:6px 0 0;font-size:14.5px">${esc(l.note)}</p>` : ""}</div>
      <span id="del-${l.id}"><button type="button" class="linkbtn danger" data-act="dellog" data-id="${l.id}">Delete</button></span></div>${l.type === "workout" && l.sets ? setDetail(l) : ""}</div>`).join("")}</div>`;
  } else if (!future) h += `<p class="muted">Nothing logged.</p>`;
  if (c) h += `<div class="card" style="margin-top:10px"><strong>Check-in</strong><div class="tags">${checkinTags(c)}</div>${c.note ? `<p style="margin:8px 0 0;font-size:14.5px">${esc(c.note)}</p>` : ""}</div>`;
  if (!future) {
    h += `<div class="foot"><button type="button" class="btn wide" data-act="quicklog" data-date="${date}">Log a workout</button>
      <div class="row"><button type="button" class="btn small ghost" data-act="skip" data-date="${date}">Log a skip</button><button type="button" class="btn small ghost" data-act="activity" data-date="${date}">Other activity</button><button type="button" class="btn small ghost" data-act="checkin" data-date="${date}">Check-in</button></div>
      <button type="button" class="btn ghost wide" data-act="close">Close</button></div>`;
  } else h += `<div class="foot"><button type="button" class="btn ghost wide" data-act="close">Close</button></div>`;
  openSheet(h, {date: date});
}
function setDetail(l) {
  const rows = Object.keys(l.sets).filter(id => MOVES[id]).map(id => {
    const sets = l.sets[id], k = topKg(sets);
    return `<li><span>${esc(MOVES[id].name)}</span><span class="amt">${sets.map(x => x.reps).join(", ")}${MOVES[id].secs ? "s" : ""}${k ? " · " + k + " kg" : ""}</span></li>`;
  });
  return rows.length ? `<ul class="simple" style="margin-top:10px;background:var(--surface-2)">${rows.join("")}</ul>` : "";
}
function stepper(name, val, step, min, max, unit) {
  return `<div class="stepper" data-stepper="${name}" data-step="${step}" data-min="${min}" data-max="${max}"><button type="button" data-act="step" data-dir="-1" aria-label="Less">−</button><output id="st-${name}" data-val="${val}">${val}</output><span class="muted">${esc(unit)}</span><button type="button" data-act="step" data-dir="1" aria-label="More">+</button></div>`;
}
function readStepper(name) { const o = document.getElementById("st-" + name); return o ? Number(o.dataset.val) : null; }
function effortPicker(sel) {
  return `<div class="effort" data-chips="effort" data-multi="0">${EFFORT.map(e => `<button type="button" data-chip="${e.v}" aria-pressed="${sel === e.v}"><b>${esc(e.label)}</b><span>${esc(e.sub)}</span></button>`).join("")}</div>`;
}
function finishSheet() {
  const a = db.active, s = sessionById(a.session);
  const mins = Math.max(1, Math.round((Date.now() - a.startedAt) / 60000));
  const lastRounds = db.logs.filter(l => l.session === s.id && l.rounds).sort(byTime).slice(-1)[0];
  const record = !!(s.finisher && s.finisher.record);
  const counts = PROGRAMME.includes(s.id);
  openSheet(`<h2 id="sheet-title">Finish ${esc(s.title.toLowerCase())}</h2><p class="lead">${esc(progressText(a))}.${counts ? ` This is workout ${db.prog.count + 1} of ${perWeek()} for week ${db.prog.week}.` : ""}</p>
    <div class="section"><span class="lbl">Time taken</span>${stepper("mins", Math.min(mins, 180), 1, 1, 180, "min")}</div>
    ${record ? `<div class="section"><span class="lbl">Round-up rounds${lastRounds ? ` <span class="muted">(last time ${lastRounds.rounds})</span>` : ""}</span>${stepper("rounds", lastRounds ? Number(lastRounds.rounds) : 3, 1, 0, 40, "rounds")}</div>` : ""}
    <div class="section"><span class="lbl">How did it feel?</span>${effortPicker(null)}</div>
    <div class="section"><span class="lbl">Any niggles?</span>${chipGroup("niggles", NIGGLES, [], true)}</div>
    <div class="section"><label class="lbl" for="fin-note">Notes</label><textarea id="fin-note" placeholder="Which push-up surface, how the swings felt, anything to remember"></textarea></div>
    <div class="foot"><button type="button" class="btn accent wide" data-act="savefinish">Save workout</button><button type="button" class="btn ghost wide" data-act="close">Keep going</button></div>`, {record: record});
}
function setSheet(exId, n) {
  const a = db.active, mv = MOVES[exId], t = a.sets[exId][n];
  openSheet(`<h2 id="sheet-title">${esc(mv.name)}, set ${n + 1}</h2><p class="lead">Adjust what you actually did.</p>
    <div class="section"><span class="lbl">${mv.secs ? "Seconds" : "Reps"}</span>${stepper("reps", t.reps, mv.secs ? 5 : 1, 0, mv.secs ? 300 : 60, mv.secs ? "sec" : "reps")}</div>
    ${mv.lift ? `<div class="section"><span class="lbl">Weight</span>${chipGroup("kg", [{id: 0, label: "None"}].concat(bellList(t.kg).map(b => ({id: b, label: b + " kg"}))), t.kg, false)}</div>` : ""}
    <div class="foot"><button type="button" class="btn accent wide" data-act="saveset">Save</button><button type="button" class="btn ghost wide" data-act="untick">Untick this set</button></div>`, {ex: exId, n: n});
}
function bellList(extra) { const set = new Set(db.settings.bells.map(Number)); if (extra) set.add(Number(extra)); return [...set].sort((a, b) => a - b); }
function kgSheet(exId) {
  const sid = route.slice(8), {a, ctx} = workoutCtx(sid);
  const cur = a && a.kg[exId] != null ? a.kg[exId] : defaultKg(exId, ctx);
  openSheet(`<h2 id="sheet-title">${esc(MOVES[exId].name)}</h2><p class="lead">Which bell are you using?</p>
    ${chipGroup("kg", [{id: 0, label: "None"}].concat(bellList(cur).map(b => ({id: b, label: b + " kg"}))), cur, false)}
    <div class="section"><label class="lbl" for="kg-other">Something else (kg)</label><input type="number" id="kg-other" inputmode="decimal" min="0" max="60" step="0.5" placeholder="e.g. 8"></div>
    ${foot("savekg", "Use this weight")}`, {ex: exId});
}
function measureSheet() {
  const st = db.settings.units === "st";
  openSheet(`<h2 id="sheet-title">Weight or waist</h2><p class="lead">Same time of day each time; first thing in the morning is most consistent.</p>
    <div class="section"><label class="lbl" for="m-date">Date</label><input type="date" id="m-date" value="${todayStr()}" max="${todayStr()}"></div>
    <div class="section"><span class="lbl">Weight</span>${st ? `<div class="inline"><input type="number" id="m-st" inputmode="numeric" placeholder="stone" aria-label="Stone"><input type="number" id="m-lb" inputmode="decimal" placeholder="pounds" aria-label="Pounds"></div>` : `<input type="number" id="m-kg" inputmode="decimal" step="0.1" placeholder="kg" aria-label="Kilograms">`}</div>
    <div class="section"><label class="lbl" for="m-waist">Waist in cm, level with your belly button</label><input type="number" id="m-waist" inputmode="decimal" step="0.5" placeholder="Optional"></div>
    ${foot("savemeasure", "Save")}`);
}
function measuresSheet() {
  const ms = db.measures.slice().sort((a, b) => b.date.localeCompare(a.date));
  openSheet(`<h2 id="sheet-title">Measurements</h2><ul class="measure-list">${ms.map(m => `<li><span>${esc(niceDate(m.date))}</span><span>${esc([m.kg ? weightText(m.kg) : "", m.waist ? m.waist + " cm" : ""].filter(Boolean).join(" · "))}</span><button type="button" class="linkbtn danger" data-act="delmeasure" data-id="${m.id}">Delete</button></li>`).join("")}</ul>
    <div class="foot"><button type="button" class="btn ghost wide" data-act="close">Close</button></div>`);
}
function adjustSheet() {
  const p = db.prog;
  openSheet(`<h2 id="sheet-title">Change month or week</h2><p class="lead">Repeat a week that felt tough, or jump ahead if it's too easy.</p>
    <div class="section"><span class="lbl">Month</span>${stepper("month", p.month, 1, 1, 24, "")}</div>
    <div class="section"><span class="lbl">Week</span>${chipGroup("week", [1, 2, 3, 4].map(n => ({id: n, label: "Week " + n})), p.week, false)}</div>
    ${foot("saveadjust", "Save")}`);
}
function restoreSheet() {
  openSheet(`<h2 id="sheet-title">Restore from a backup</h2><p class="lead">This replaces everything on this phone with the backup.</p>
    <div class="section"><label class="lbl" for="r-file">Choose the backup file</label><input type="file" id="r-file" accept="application/json,.json,text/plain"></div>
    <div class="section"><label class="lbl" for="r-text">Or paste the backup text</label><textarea id="r-text" placeholder='{"v":2,...}'></textarea></div>
    <p id="r-msg" class="muted" role="status"></p>${foot("dorestore", "Restore")}`);
}
function celebrateSheet(l, moved) {
  const tally = weekTally(l.date), s = sessionById(l.session);
  const total = db.logs.filter(x => x.type === "workout").length;
  const p = db.prog;
  let big = `${tally.done}/${tally.target}`, head = tally.done >= tally.target ? "Week done. Brilliant." : "Workout logged";
  let extra = "";
  if (moved === "week") extra = `<p class="unlock">Week ${p.week} unlocked: ${esc(curCtx().W.note)}</p>`;
  if (moved === "month") { head = `Month ${p.month - 1} complete`; big = "★"; extra = `<p class="unlock">Month ${p.month}: ${esc(monthPlan(p.month).name)}. ${esc(monthPlan(p.month).aim)} A good time to take your waist measurement too.</p>`; }
  openSheet(`<div class="celebrate"><p class="big">${big}</p><h2 id="sheet-title">${esc(head)}</h2>
    <p class="lead">${esc(s.title)} · ${esc(logSummary(l))}. That's ${plural(total, "workout")} in total.</p></div>${extra}
    <p style="margin:0 0 6px;font-size:15px">Refuel with a proper portion of protein at lunch, and drink some water.</p>
    <div class="foot"><button type="button" class="btn accent wide" data-act="close">Done</button></div>`);
}

/* ---------- actions ---------- */
function addLog(entry) { entry.id = uid(); entry.at = new Date().toISOString(); db.logs.push(entry); save(); return entry; }
function logWorkout(entry, stage) {
  let moved = null;
  if (PROGRAMME.includes(entry.session)) { entry.month = (stage || db.prog).month; entry.week = (stage || db.prog).week; moved = advanceProg(); }
  addLog(entry);
  return moved;
}

document.addEventListener("click", ev => {
  const chip = ev.target.closest("[data-chip]");
  if (chip) {
    const g = chip.closest("[data-chips]");
    if (g) {
      if (g.dataset.multi === "1") chip.setAttribute("aria-pressed", String(chip.getAttribute("aria-pressed") !== "true"));
      else g.querySelectorAll("[data-chip]").forEach(b => b.setAttribute("aria-pressed", String(b === chip)));
      onChipChange(g.dataset.chips, g);
      return;
    }
  }
  const head = ev.target.closest(".ex-head");
  if (head) {
    const open = head.getAttribute("aria-expanded") === "true";
    head.setAttribute("aria-expanded", String(!open));
    document.getElementById(head.getAttribute("aria-controls")).hidden = open;
    return;
  }
  const el = ev.target.closest("[data-act]");
  if (!el) return;
  if (el.dataset.act === "sheet-bg") { if (ev.target === el) closeSheet(); return; }
  handle(el.dataset.act, el);
});

function onChipChange(name, g) {
  if (g.closest(".sheet")) return;
  const S = db.settings;
  const on = () => [...g.querySelectorAll('[aria-pressed="true"]')].map(b => b.dataset.chip);
  if (name === "days") { S.days = on().map(Number); save(); const c = $("#cal-link"); if (c) c.href = calendarUrl(); }
  else if (name === "bells") { S.bells = on().map(Number); save(); }
  else if (name === "theme") { S.theme = on()[0] || "system"; applyTheme(); save(); }
  else if (name === "units") { S.units = on()[0] || "kg"; save(); }
}

function handle(act, el) {
  const t = todayStr();
  switch (act) {
    case "goto": go(el.dataset.to); break;
    case "open": go("workout-" + el.dataset.session); break;
    case "start":
      if (!db.active || db.active.session !== el.dataset.session) startWorkout(el.dataset.session, el.dataset.mode);
      else { db.active.mode = el.dataset.mode; save(); }
      go("workout-" + el.dataset.session); ensureAudio(); break;
    case "begin": { const sid = el.dataset.session; startWorkout(sid, viewMode[sid] || "full"); renderWorkout(sid); ensureAudio(); toast("Started. Warm up first."); window.scrollTo({top: 0}); break; }
    case "mode": {
      const sid = route.slice(8);
      viewMode[sid] = el.dataset.mode;
      if (db.active && db.active.session === sid) { db.active.mode = el.dataset.mode; save(); }
      renderWorkout(sid); break;
    }
    case "back": if (history.length > 1) history.back(); else go("today"); break;
    case "move": moveSheet(el.dataset.move); break;
    case "set": {
      const exId = el.dataset.ex, n = Number(el.dataset.set);
      ensureAudio();
      const a = db.active;
      const t0 = a && a.session === route.slice(8) && a.sets[exId] && a.sets[exId][n];
      if (t0 && t0.done) setSheet(exId, n); else tickSet(exId, n);
      break;
    }
    case "saveset": { const a = db.active, {ex, n} = sheetCtx; a.sets[ex][n].reps = readStepper("reps"); const kg = readChips(sheetEl(), "kg"); if (kg != null) a.sets[ex][n].kg = Number(kg); save(); closeSheet(); renderWorkout(a.session); break; }
    case "untick": { const a = db.active, {ex, n} = sheetCtx; a.sets[ex][n] = null; save(); closeSheet(); renderWorkout(a.session); break; }
    case "kg": kgSheet(el.dataset.ex); break;
    case "kgset": setKg(el.dataset.ex, Number(el.dataset.kg)); break;
    case "savekg": { const other = Number($("#kg-other").value); const chosen = other > 0 ? other : Number(readChips(sheetEl(), "kg") || 0); const ex = sheetCtx.ex; closeSheet(); setKg(ex, chosen); break; }
    case "timer": runTimer(el.dataset.kind); break;
    case "finish": finishSheet(); break;
    case "savefinish": saveFinish(); break;
    case "discard": $("#discard-zone").innerHTML = `<div class="confirm"><p>Throw away this workout? Nothing will be logged.</p><div class="row"><button type="button" class="btn small" data-act="discard-yes">Discard</button><button type="button" class="btn small ghost" data-act="discard-no">Keep it</button></div></div>`; break;
    case "discard-yes": db.active = null; save(); stopTimer(); wake(false); go("today"); break;
    case "discard-no": renderWorkout(route.slice(8)); break;
    case "skip": skipSheet(el.dataset.date || t); break;
    case "saveskip": {
      const reason = readChips(sheetEl(), "reason");
      if (!reason) { toast("Pick a reason, even \"Something else\""); break; }
      addLog({type: "skip", date: sheetCtx.date, reason: reason, note: $("#skip-note").value.trim()});
      closeSheet(); render(); toast("Logged. " + sessionById(nextSessionId()).title + " is up next."); break;
    }
    case "activity": activitySheet(el.dataset.date || t); break;
    case "saveactivity": addLog({type: "activity", date: sheetCtx.date, activity: readChips(sheetEl(), "activity") || "Activity", mins: readStepper("mins"), note: $("#act-note").value.trim()}); closeSheet(); render(); toast("Activity logged"); break;
    case "quicklog": quickLogSheet(el.dataset.date || t, el.dataset.session); break;
    case "savequick": {
      const sid = readChips(sheetEl(), "session") || nextSessionId();
      const eff = readChips(sheetEl(), "effort");
      const entry = {type: "workout", date: sheetCtx.date, session: sid, mode: "full", mins: readStepper("mins"), effort: eff ? Number(eff) : null, note: $("#q-note").value.trim(), untracked: true};
      const moved = logWorkout(entry); save();
      closeSheet(); if (route.startsWith("workout-")) go("today"); else render();
      toast(moved === "month" ? "Logged. New month unlocked!" : moved === "week" ? `Logged. On to week ${db.prog.week}.` : "Workout logged"); break;
    }
    case "checkin": checkinSheet(el.dataset.date || t); break;
    case "savecheckin": {
      const sh = sheetEl(), en = readChips(sh, "energy"), steps = Number($("#ci-steps").value) || null;
      db.checkins[sheetCtx.date] = {energy: en ? Number(en) : null, sleep: readChips(sh, "sleep"), mood: readChips(sh, "mood"), steps: steps, period: readChips(sh, "period"), symptoms: readChips(sh, "symptoms") || [], note: $("#ci-note").value.trim()};
      save(); closeSheet(); render(); toast(steps && steps >= db.settings.stepGoal ? "Saved. Step goal hit!" : "Check-in saved"); break;
    }
    case "delcheckin": delete db.checkins[sheetCtx.date]; save(); closeSheet(); render(); break;
    case "day": daySheet(el.dataset.date); break;
    case "dellog": {
      const id = el.dataset.id, z = document.getElementById("del-" + id);
      if (el.dataset.confirm) {
        const lg = db.logs.find(l => l.id === id);
        const pl = programmeLogs();
        if (lg && pl.length && pl[pl.length - 1].id === id) rewindProg();
        db.logs = db.logs.filter(l => l.id !== id); save();
        const d = sheetCtx.date; render(); daySheet(d); toast("Deleted");
      } else if (z) z.innerHTML = `<button type="button" class="btn small" style="background:var(--danger);color:#fff" data-act="dellog" data-id="${id}" data-confirm="1">Delete?</button>`;
      break;
    }
    case "close": closeSheet(); break;
    case "step": {
      const w = el.closest("[data-stepper]"), o = w.querySelector("output");
      const v = Math.min(Number(w.dataset.max), Math.max(Number(w.dataset.min), Number(o.dataset.val) + Number(el.dataset.dir) * Number(w.dataset.step)));
      o.dataset.val = v; o.textContent = v; break;
    }
    case "month": { const [y, m] = historyMonth.split("-").map(Number); const d = new Date(y, m - 1 + Number(el.dataset.dir), 1); historyMonth = d.getFullYear() + "-" + pad(d.getMonth() + 1); renderHistory(); break; }
    case "adjust": adjustSheet(); break;
    case "saveadjust": { db.prog.month = readStepper("month"); db.prog.week = Number(readChips(sheetEl(), "week") || 1); db.prog.count = 0; save(); closeSheet(); render(); toast(`Now on month ${db.prog.month}, week ${db.prog.week}`); break; }
    case "easeback": {
      const p = db.prog;
      if (p.week > 1) p.week--; else if (p.month > 1) { p.month--; p.week = 4; }
      p.count = 0; db.meta.welcomeBack = el.dataset.last; save(); render(); toast(`Back to month ${p.month}, week ${p.week}`); break;
    }
    case "carryon": db.meta.welcomeBack = el.dataset.last; save(); render(); break;
    case "toggle": db.settings[el.dataset.key] = !db.settings[el.dataset.key]; save(); el.setAttribute("aria-checked", String(db.settings[el.dataset.key])); break;
    case "measure": measureSheet(); break;
    case "measures": measuresSheet(); break;
    case "savemeasure": {
      let kg = null;
      if (db.settings.units === "st") { const st = Number($("#m-st").value) || 0, lb = Number($("#m-lb").value) || 0; if (st || lb) kg = Math.round(((st * 14 + lb) / 2.20462) * 10) / 10; }
      else { const v = Number($("#m-kg").value); if (v) kg = v; }
      const waist = Number($("#m-waist").value) || null;
      if (!kg && !waist) { toast("Enter a weight or a waist measurement"); break; }
      db.measures.push({id: uid(), date: $("#m-date").value || t, kg: kg, waist: waist}); save(); closeSheet(); render(); toast("Saved"); break;
    }
    case "delmeasure": db.measures = db.measures.filter(m => m.id !== el.dataset.id); save(); render(); measuresSheet(); break;
    case "savebackup": saveBackupFile(); break;
    case "sharebackup": shareBackup(); break;
    case "copybackup": copyBackup(); break;
    case "restore": restoreSheet(); break;
    case "dorestore": doRestore(); break;
    case "erase": $("#erase-zone").innerHTML = `<div class="confirm"><p>This can't be undone. Make a backup first if you might want it.</p><div class="row"><button type="button" class="btn small" style="background:var(--danger);color:#fff" data-act="erase-yes">Erase everything</button><button type="button" class="btn small ghost" data-act="erase-no">Cancel</button></div></div>`; break;
    case "erase-yes": db = defaults(); save(); applyTheme(); go("today"); toast("Everything erased"); break;
    case "erase-no": renderMe(); break;
    case "install": if (installPrompt) { installPrompt.prompt(); installPrompt.userChoice.finally(() => { installPrompt = null; render(); }); } break;
    case "reload": location.reload(); break;
  }
}
function setKg(exId, kg) { const sid = route.slice(8); ensureActive(sid).kg[exId] = kg; save(); renderWorkout(sid); }

function saveFinish() {
  const a = db.active, s = sessionById(a.session), sh = sheetEl();
  const ctx = stageCtx(a.month, a.week), list = mainFor(s, ctx, a.mode), per = list.length ? setsFor(ctx, a.mode) : 0;
  const eff = readChips(sh, "effort");
  const sets = {};
  let done = 0;
  list.forEach(e => {
    const target = amountFor(e, ctx);
    const got = (a.sets[e.ex] || []).filter(x => x && x.done).map(x => ({reps: x.reps, kg: x.kg, full: x.reps >= target}));
    if (got.length) sets[e.ex] = got;
    done += got.length;
  });
  const entry = {type: "workout", date: ymd(new Date(a.startedAt)), session: s.id, mode: a.mode,
    mins: readStepper("mins"), effort: eff ? Number(eff) : null, niggles: readChips(sh, "niggles") || [], note: $("#fin-note").value.trim()};
  if (list.length) Object.assign(entry, {sets: sets, totalSets: list.length * per, doneSets: done, setsPer: per});
  if (sheetCtx.record) entry.rounds = readStepper("rounds");
  /* the plan moves on from the stage the workout was started in */
  const moved = logWorkout(entry, a);
  db.active = null; save();
  closeSheet(); stopTimer(); wake(false);
  go("today");
  setTimeout(() => celebrateSheet(entry, moved), 60);
}

/* ---------- backup ---------- */
function backupJson() { return JSON.stringify(Object.assign({}, db, {exportedAt: new Date().toISOString(), app: "rachels-workouts"})); }
function backupName() { return "rachels-workouts-backup-" + todayStr() + ".json"; }
function markBackup() { db.meta.lastBackup = new Date().toISOString(); save(); if (route === "me") renderMe(); }
function saveBackupFile() {
  try {
    const url = URL.createObjectURL(new Blob([backupJson()], {type: "application/json"}));
    const a = document.createElement("a");
    a.href = url; a.download = backupName(); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    markBackup(); toast("Backup saved to Downloads");
  } catch (e) { toast("Couldn't save a file here. Use Copy backup as text instead."); }
}
async function shareBackup() {
  try { await navigator.share({files: [new File([backupJson()], backupName(), {type: "application/json"})], title: "Rachel's Workouts backup"}); markBackup(); }
  catch (e) { if (e && e.name !== "AbortError") toast("Sharing didn't work. Try Save backup file."); }
}
async function copyBackup() {
  const txt = backupJson();
  try { await navigator.clipboard.writeText(txt); markBackup(); toast("Copied. Paste it into an email or note to keep it safe."); }
  catch (e) {
    openSheet(`<h2 id="sheet-title">Backup text</h2><p class="lead">Select all of this, copy it and paste it somewhere safe.</p><textarea id="bk-text" readonly style="min-height:220px">${esc(txt)}</textarea><div class="foot"><button type="button" class="btn ghost wide" data-act="close">Done</button></div>`);
    const ta = $("#bk-text"); ta.focus(); ta.select(); markBackup();
  }
}
async function doRestore() {
  const msg = $("#r-msg");
  let text = $("#r-text").value.trim();
  const f = $("#r-file").files && $("#r-file").files[0];
  if (!text && f) text = await f.text();
  if (!text) { msg.textContent = "Choose a backup file or paste the text first."; return; }
  let data;
  try { data = JSON.parse(text); } catch (e) { msg.textContent = "That isn't a backup this app can read."; return; }
  if (!data || !Array.isArray(data.logs) || !data.settings) { msg.textContent = "That doesn't look like a Rachel's Workouts backup."; return; }
  db = mergeData(data); save(); applyTheme(); closeSheet(); go("today");
  toast(`Restored ${plural(db.logs.length, "entry", "entries")}`);
}

/* ---------- toast ---------- */
let toastTo = null;
function toast(msg, action) {
  $("#toast-root").innerHTML = `<div class="toast" role="status">${esc(msg)}${action ? ` <button type="button" class="linkbtn" style="color:inherit" data-act="${action.act}">${esc(action.label)}</button>` : ""}</div>`;
  clearTimeout(toastTo);
  toastTo = setTimeout(() => { $("#toast-root").innerHTML = ""; }, action ? 12000 : 3200);
}

/* ---------- timers ---------- */
function ready(first, demo) { return {phase: "rest", title: "Get ready", sub: "First: " + first, secs: 10, say: "Get ready. First, " + first + ".", demo: demo}; }
function buildCircuit(moves, work, rest, roundRest, rounds) {
  const q = [ready(moveName(moves[0]), demoId(moveId(moves[0])))];
  for (let r = 1; r <= rounds; r++) {
    moves.forEach((m, j) => {
      const nm = moveName(m);
      q.push({phase: "work", title: nm, sub: rounds === 1 ? `${j + 1} of ${moves.length}` : `Round ${r} of ${rounds}`, secs: work, say: nm, demo: demoId(moveId(m))});
      const lastMove = j === moves.length - 1;
      if (!lastMove && rest) q.push({phase: "rest", title: "Rest", sub: "Next: " + moveName(moves[j + 1]), secs: rest, say: "Rest. Next, " + moveName(moves[j + 1]), demo: demoId(moveId(moves[j + 1]))});
      if (lastMove && r < rounds) { const gap = roundRest || rest; if (gap) q.push({phase: "rest", title: "Rest", sub: `Next: round ${r + 1}, ${moveName(moves[0])}`, secs: gap, say: `Round ${r} done. Rest. Next, ${moveName(moves[0])}`, demo: demoId(moveId(moves[0]))}); }
    });
  }
  return q;
}
function buildList(items) {
  const q = [ready(itemName(items[0]), items[0].ex && demoId(items[0].ex))];
  items.forEach((w, i) => q.push({phase: "work", title: itemName(w), sub: `${w.amt} · ${i + 1} of ${items.length}`, secs: w.secs, say: itemName(w) + ", " + w.amt.replace(/s each side/, " seconds each side").replace(/(\d+) min\b/, "$1 minute"), demo: w.ex && demoId(w.ex)}));
  return q;
}
function buildFollow(f) {
  const q = [ready(f.moves[0].name)];
  f.moves.forEach((m, i) => {
    q.push({phase: "work", title: m.name, sub: `${i + 1} of ${f.moves.length}`, secs: f.work, say: m.name});
    if (i < f.moves.length - 1 && f.rest) q.push({phase: "rest", title: "Change", sub: "Next: " + f.moves[i + 1].name, secs: f.rest, say: "Next, " + f.moves[i + 1].name});
  });
  return q;
}
function buildEmom(mins, label, demo) {
  const q = [ready(label, demo)];
  for (let m = 1; m <= mins; m++) q.push({phase: "work", title: `Minute ${m} of ${mins}`, sub: label, secs: 60, say: m === 1 ? "Go. " + label : "Minute " + m, demo: demo});
  return q;
}
function buildSprints(sp, demo) {
  const q = [ready("sprint " + 1 + " of " + sp.reps, demo)];
  for (let i = 1; i <= sp.reps; i++) {
    q.push({phase: "work", title: `Sprint ${i} of ${sp.reps}`, sub: "About 8 out of 10", secs: sp.on, say: i === sp.reps ? "Last one. Go!" : "Go!", demo: demo});
    if (i < sp.reps) q.push({phase: "rest", title: "Walk and recover", sub: `Next: sprint ${i + 1}`, secs: sp.off, say: "Easy. Walk it off."});
  }
  return q;
}
function runTimer(kind) {
  const sid = route.slice(8), s = sessionById(sid);
  const a = ensureActive(sid), ctx = stageCtx(a.month, a.week);
  if (kind === "warm") startQueue(buildList(warmFor(s, a.mode)));
  else if (kind === "cool") startQueue(buildList(coolFor(s, a.mode)));
  else if (kind === "follow") startQueue(buildFollow(s.follow));
  else if (kind === "sprints") startQueue(buildSprints(sprintFor(ctx, a.mode), "sprint"));
  else if (kind === "circuit") { const c = circFor(ctx, a.mode); startQueue(buildCircuit(s.circuit.moves, c.work, c.rest, s.circuit.roundRest, c.rounds)); }
  else {
    const f = s.finisher, fm = finMins(ctx, a.mode), mctx = Object.assign({}, ctx.m, {fin: fm});
    if (f.kind === "emom") startQueue(buildEmom(fm, f.label(mctx), demoId(f.ex)));
    else if (f.kind === "circuit") startQueue(buildCircuit(f.moves, f.work, f.rest, 30, coreRounds(fm)));
    else startQueue([ready(f.label(mctx), demoId(f.moves[0])), {phase: "work", title: "Go", sub: f.label(mctx), secs: fm * 60, say: "Go. " + f.label(mctx)}]);
  }
  renderWorkout(sid);
}

const T = {q: [], i: 0, end: 0, left: 0, total: 0, running: false, iv: null, lastBeep: null, doneTo: null};
const bar = $("#timer");
function startQueue(q) {
  ensureAudio();
  clearTimeout(T.doneTo);
  T.q = q; T.i = 0; T.running = true;
  beginPhase();
  bar.hidden = false;
  document.body.classList.add("has-timer");
  $("#t-pause").textContent = "Pause";
  ["#t-pause", "#t-skip", "#t-add"].forEach(s => { $(s).disabled = false; });
  wake(true);
  if (!T.iv) T.iv = setInterval(tick, 200);
}
function beginPhase() {
  const p = T.q[T.i];
  T.total = p.secs; T.left = p.secs; T.end = Date.now() + p.secs * 1000; T.lastBeep = null;
  if (p.say) speak(p.say);
  const dm = $("#t-demo");
  if (p.demo && window.Figure) { dm.innerHTML = Figure.markup(p.demo, "mini"); dm.hidden = false; } else { dm.innerHTML = ""; dm.hidden = true; }
  draw();
}
function tick() {
  if (!T.running) return;
  T.left = Math.max(0, (T.end - Date.now()) / 1000);
  const whole = Math.ceil(T.left);
  if (whole > 0 && whole <= 3 && T.lastBeep !== whole) { T.lastBeep = whole; beep(660, 0.09); }
  if (T.left <= 0) { advance(); return; }
  draw();
}
function advance() {
  T.i++;
  if (T.i >= T.q.length) { finishTimer(); return; }
  beep(T.q[T.i].phase === "work" ? 988 : 740, 0.3); vib(180);
  beginPhase();
}
function finishTimer() {
  const wasRest = T.q.length === 1 && T.q[0].phase === "rest";
  T.running = false;
  beep(880, 0.5); vib([200, 100, 200]);
  speak(wasRest ? "Go." : "Done. Nicely done.");
  bar.classList.remove("work");
  $("#t-phase").textContent = wasRest ? "Rest's over" : "Done";
  $("#t-label").textContent = wasRest ? "On you go" : "Nicely done";
  $("#t-clock").textContent = "0:00";
  $("#t-bar").style.width = "100%";
  ["#t-pause", "#t-skip", "#t-add"].forEach(s => { $(s).disabled = true; });
  T.doneTo = setTimeout(stopTimer, 4000);
}
function stopTimer() {
  T.running = false; T.q = [];
  clearInterval(T.iv); T.iv = null; clearTimeout(T.doneTo);
  bar.hidden = true; $("#t-demo").innerHTML = "";
  document.body.classList.remove("has-timer");
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
}
function draw() {
  const p = T.q[T.i]; if (!p) return;
  bar.classList.toggle("work", p.phase === "work");
  $("#t-phase").textContent = p.title;
  $("#t-label").textContent = p.sub || "";
  $("#t-clock").textContent = fmtClock(T.left);
  $("#t-bar").style.width = (T.total ? (1 - T.left / T.total) * 100 : 100) + "%";
}
$("#t-pause").addEventListener("click", () => {
  if (!T.q.length) return;
  if (T.running) { T.running = false; T.left = Math.max(0, (T.end - Date.now()) / 1000); $("#t-pause").textContent = "Resume"; }
  else { ensureAudio(); T.end = Date.now() + T.left * 1000; T.running = true; $("#t-pause").textContent = "Pause"; }
});
$("#t-add").addEventListener("click", () => {
  if (!T.q.length) return;
  if (T.running) { T.end += 15000; T.left = (T.end - Date.now()) / 1000; } else T.left += 15;
  T.total += 15; draw();
});
$("#t-skip").addEventListener("click", () => { if (T.q.length) { T.running = true; $("#t-pause").textContent = "Pause"; advance(); } });
$("#t-stop").addEventListener("click", stopTimer);

/* ---------- sound, voice, vibration, screen ---------- */
let ac = null;
function ensureAudio() {
  try {
    if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (A) ac = new A(); }
    if (ac && ac.state === "suspended") ac.resume();
  } catch (e) {}
}
function beep(freq, dur) {
  if (!ac || !db.settings.sound) return;
  try {
    const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime;
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) {}
}
let voice = null;
function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => v.lang === "en-GB" && /female/i.test(v.name)) || vs.find(v => v.lang === "en-GB") || vs.find(v => /^en/.test(v.lang)) || null;
  } catch (e) {}
}
if (window.speechSynthesis) { pickVoice(); try { speechSynthesis.addEventListener("voiceschanged", pickVoice); } catch (e) {} }
function speak(text) {
  if (!db.settings.voice || !window.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : "en-GB"; u.rate = 1.02;
    speechSynthesis.speak(u);
  } catch (e) {}
}
function vib(p) { if (!db.settings.vibrate) return; try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

let lock = null;
async function wake(on) {
  try {
    if (on && "wakeLock" in navigator && !lock) { lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => { lock = null; }); }
    else if (!on && lock) { await lock.release(); lock = null; }
  } catch (e) {}
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (T.running || (db.active && route.startsWith("workout-"))) wake(true);
  if (route === "today" && !$("#sheet-root").innerHTML) renderToday();
});

/* ---------- inputs that save as you type ---------- */
document.addEventListener("change", ev => {
  const id = ev.target.id;
  if (id === "lunch") { db.settings.lunch = ev.target.value || "12:15"; save(); const c = $("#cal-link"); if (c) c.href = calendarUrl(); }
  if (id === "name") { db.settings.name = ev.target.value.trim() || "Rachel"; save(); }
  if (id === "stepgoal") { db.settings.stepGoal = Math.max(1000, Number(ev.target.value) || 8000); save(); }
});

function applyTheme() {
  const th = db.settings.theme;
  if (th === "light" || th === "dark") root.dataset.theme = th; else delete root.dataset.theme;
}

/* ---------- start ---------- */
load();
applyTheme();
render();

if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && !window.RW_NO_SW) {
  navigator.serviceWorker.register("sw.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => { if (nw.state === "installed" && navigator.serviceWorker.controller) toast("A new version is ready.", {act: "reload", label: "Reload"}); });
    });
  }).catch(() => {});
}

window.RW = {db: () => db, estimate: estimate, stageCtx: stageCtx};
})();
