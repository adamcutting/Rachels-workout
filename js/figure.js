/* Animated exercise demonstrations.
   A side-on figure is posed with a few keyframes (hip, torso angle, hand and foot targets);
   knees and elbows are solved with two-bone IK, so the feet stay planted between frames.
   Angles: 0 = straight down, 90 = forward (right), 180 = straight up, -90 = back (left). */
(function () {
"use strict";

const L = {torso: 52, neck: 5, head: 13, thigh: 44, shin: 44, foot: 13, upper: 32, fore: 30};
const FLOOR = 186;
const vec = (a, len) => [Math.sin(a * Math.PI / 180) * len, Math.cos(a * Math.PI / 180) * len];
const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
const lerp = (a, b, t) => a + (b - a) * t;

/* two-bone IK: root, target, bone lengths, bend (+1 / -1). Out of reach: the limb points straight at the target. */
function ik(root, target, a, b, bend) {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  const reach = Math.hypot(dx, dy) || 0.001;
  if (reach >= a + b - 0.01) {
    const ux = dx / reach, uy = dy / reach;
    return {j: [root[0] + ux * a, root[1] + uy * a], e: [root[0] + ux * (a + b), root[1] + uy * (a + b)]};
  }
  const d = Math.max(Math.abs(a - b) + 0.01, reach);
  const th = Math.atan2(dy, dx);
  const al = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
  return {j: [root[0] + a * Math.cos(th + bend * al), root[1] + a * Math.sin(th + bend * al)], e: target};
}

/* Normalise a keyframe: expand the plank shorthand, turn relative hands into absolute ones,
   and fill every key so any two frames can be blended. */
function resolve(p) {
  const q = {h: p.h, t: p.t, hd: p.hd, nf: p.nf, ff: p.ff, nh: p.nh, fh: p.fh,
    ta: p.ta || [90, 90], bo: p.bo || [0, 12], kb: p.kb || [-1, -1], eb: p.eb || [1, 1], bell: p.bell || null};
  if (p.plank) {
    const a = p.plank.a, s = p.plank.s;
    const dx = a[0] - s[0], dy = a[1] - s[1], len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    q.h = [s[0] + ux * L.torso, s[1] + uy * L.torso];
    q.t = Math.atan2(-ux, -uy) * 180 / Math.PI;
    const ank = [q.h[0] + ux * (L.thigh + L.shin), q.h[1] + uy * (L.thigh + L.shin)];
    if (!p.nf) q.nf = ank;
    if (!p.ff) q.ff = [ank[0] - 3, ank[1]];
  }
  if (q.hd == null) q.hd = q.t;
  const sh = add(q.h, vec(q.t, L.torso));
  if (p.nhs) q.nh = add(sh, p.nhs); else if (p.nhh) q.nh = add(q.h, p.nhh);
  if (p.fhs) q.fh = add(sh, p.fhs); else if (p.fhh) q.fh = add(q.h, p.fhh);
  return q;
}

/* Pose -> drawable points */
function solve(p) {
  const hip = p.h;
  const sh = add(hip, vec(p.t, L.torso));
  const neckEnd = add(sh, vec(p.hd, L.neck));
  const head = add(sh, vec(p.hd, L.neck + L.head));
  const kb = p.kb.map(Math.sign), eb = p.eb.map(Math.sign);
  const nl = ik(hip, p.nf, L.thigh, L.shin, kb[0]);
  const fl = ik(hip, p.ff, L.thigh, L.shin, kb[1]);
  const na = ik(sh, p.nh, L.upper, L.fore, eb[0]);
  const fa = ik(sh, p.fh, L.upper, L.fore, eb[1]);
  const ta = p.ta;
  const u = [sh[0] - hip[0], sh[1] - hip[1]];
  const ul = Math.hypot(u[0], u[1]) || 1;
  const face = [-u[1] / ul, u[0] / ul];
  return {
    hip: hip, sh: sh, neck: neckEnd, head: head, face: face, up: [u[0] / ul, u[1] / ul],
    nk: nl.j, na: nl.e, nt: add(nl.e, vec(ta[0], L.foot)),
    fk: fl.j, fa: fl.e, ft: add(fl.e, vec(ta[1], L.foot)),
    ne: na.j, nh: na.e, fe: fa.j, fh: fa.e,
    bell: p.bell, bo: p.bo
  };
}

/* numeric interpolation of two resolved poses (same shape) */
function mix(a, b, t) {
  const out = {};
  for (const k in a) {
    const va = a[k], vb = b[k];
    if (Array.isArray(va) && typeof va[0] === "number") out[k] = va.map((x, i) => lerp(x, vb[i], t));
    else if (typeof va === "number") out[k] = lerp(va, vb, t);
    else out[k] = t < 0.5 ? va : vb;
  }
  return out;
}
const ease = t => 0.5 - Math.cos(Math.PI * t) / 2;

function pt(p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }
function limb(a, b, c) { return `M${pt(a)} L${pt(b)} L${pt(c)}`; }

function propSvg(pr) {
  if (!pr) return "";
  return pr.map(x => {
    if (x.type === "box") return `<rect class="fg-prop" x="${x.x}" y="${x.y}" width="${x.w}" height="${FLOOR - x.y}" rx="4"/>`;
    if (x.type === "chair") return `<rect class="fg-prop" x="${x.x}" y="${x.y}" width="${x.w}" height="8" rx="3"/><path class="fg-prop-line" d="M${x.x + 5} ${x.y + 8} V${FLOOR} M${x.x + x.w - 5} ${x.y + 8} V${FLOOR} M${x.x + x.w - 5} ${x.y} V${x.y - 44}"/>`;
    if (x.type === "cushion") return `<rect class="fg-prop" x="${x.x}" y="${FLOOR - 7}" width="${x.w}" height="7" rx="3.5"/>`;
    return "";
  }).join("");
}

function bellSvg(s) {
  if (!s.bell) return "";
  let at;
  if (s.bell === "near") at = s.nh;
  else if (s.bell === "far") at = s.fh;
  else if (s.bell === "hip") at = s.hip;
  else at = [(s.nh[0] + s.fh[0]) / 2, (s.nh[1] + s.fh[1]) / 2];
  const c = [at[0] + s.bo[0], at[1] + s.bo[1]];
  const hx = at[0], hy = at[1];
  return `<g class="fg-bell"><path class="fg-bell-handle" d="M${(c[0] - 6).toFixed(1)} ${(c[1] - 5).toFixed(1)} Q${hx.toFixed(1)} ${(hy - 6).toFixed(1)} ${(c[0] + 6).toFixed(1)} ${(c[1] - 5).toFixed(1)}"/><circle class="fg-bell-body" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="9.5"/></g>`;
}

function figureSvg(s) {
  const pony = add(add(s.head, [-s.face[0] * 12, -s.face[1] * 12]), [-s.up[0] * 1, -s.up[1] * 1]);
  const ponyCtrl = add(s.head, [-s.face[0] * 8 + s.up[0] * 6, -s.face[1] * 8 + s.up[1] * 6]);
  return `<g class="fg-far"><path d="${limb(s.hip, s.fk, s.fa)} L${pt(s.ft)}"/><path d="${limb(s.sh, s.fe, s.fh)}"/></g>
    <g class="fg-near"><path class="fg-torso" d="M${pt(s.hip)} L${pt(s.sh)} L${pt(s.neck)}"/>
    <path class="fg-pony" d="M${pt(add(s.head, [-s.face[0] * 6, -s.face[1] * 6]))} Q${pt(ponyCtrl)} ${pt(pony)}"/>
    <circle class="fg-head" cx="${s.head[0].toFixed(1)}" cy="${s.head[1].toFixed(1)}" r="${L.head}"/>
    <path d="${limb(s.hip, s.nk, s.na)} L${pt(s.nt)}"/></g>
    ${bellSvg(s)}
    <g class="fg-near"><path d="${limb(s.sh, s.ne, s.nh)}"/></g>`;
}

const cache = {};
function framesFor(id) {
  if (cache[id]) return cache[id];
  const d = window.DEMOS && window.DEMOS[id];
  if (!d) return null;
  const base = d.base || {};
  cache[id] = {demo: d, poses: d.frames.map(f => resolve(Object.assign({}, base, f)))};
  return cache[id];
}

function poseAt(id, time) {
  const F = framesFor(id);
  if (!F) return null;
  const fr = F.demo.frames;
  const n = fr.length;
  let total = 0;
  const seg = fr.map(f => { const move = f.d == null ? 0.9 : f.d, hold = f.hold == null ? 0.35 : f.hold; total += move + hold; return {move: move, hold: hold}; });
  let t = time % total;
  for (let i = 0; i < n; i++) {
    const nx = (i + 1) % n;
    if (t < seg[i].hold) return solve(F.poses[i]);
    t -= seg[i].hold;
    if (t < seg[i].move) return solve(mix(F.poses[i], F.poses[nx], ease(t / seg[i].move)));
    t -= seg[i].move;
  }
  return solve(F.poses[0]);
}

function staticFrame(id, i) {
  const F = framesFor(id);
  return F ? solve(F.poses[Math.min(i, F.poses.length - 1)]) : null;
}

function svgShell(id, inner, cls) {
  const d = window.DEMOS[id];
  return `<svg class="fg ${cls || ""}" viewBox="0 -34 240 226" role="img" aria-label="${(d.alt || "Demonstration").replace(/"/g, "&quot;")}">
    <line class="fg-floor" x1="0" y1="${FLOOR}" x2="240" y2="${FLOOR}"/>${propSvg(d.props)}<g class="fg-body">${inner}</g></svg>`;
}

const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* markup for a demo: animated, or start/end stills when motion is reduced */
function demoMarkup(id, cls) {
  if (!window.DEMOS || !window.DEMOS[id]) return "";
  if (reduce) {
    const F = framesFor(id);
    const mid = Math.floor(F.poses.length / 2);
    return `<div class="fg-stills">${svgShell(id, figureSvg(staticFrame(id, 0)), cls)}${svgShell(id, figureSvg(staticFrame(id, mid)), cls)}</div>`;
  }
  return `<div class="fg-anim" data-demo="${id}">${svgShell(id, figureSvg(staticFrame(id, 0)), cls)}</div>`;
}

let t0 = performance.now();
function loop(now) {
  const nodes = document.querySelectorAll(".fg-anim[data-demo]");
  const time = (now - t0) / 1000;
  nodes.forEach(n => {
    if (!n.offsetParent) return; /* hidden */
    const r = n.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    const id = n.dataset.demo;
    const s = poseAt(id, time * (window.DEMOS[id].speed || 1));
    const g = n.querySelector(".fg-body");
    if (s && g) g.innerHTML = figureSvg(s);
  });
  requestAnimationFrame(loop);
}
if (!reduce) requestAnimationFrame(loop);

window.Figure = {markup: demoMarkup, has: id => !!(window.DEMOS && window.DEMOS[id]), frame: (id, i) => svgShell(id, figureSvg(staticFrame(id, i)))};
})();
