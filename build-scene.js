#!/usr/bin/env node
/**
 * 정원 배경(scene.css) 생성 스크립트
 *
 * 실행:  node tools/build-scene.js
 *
 * 참고한 CodePen 처럼 "그라디언트 한 겹 = 픽셀 한 줄"로 장면을 그립니다.
 * 식물 위치/종류, 달, 별, 반딧불, 꽃잎 개수 등을 바꾸고 다시 실행하면
 * 프로젝트 루트의 scene.css 가 새로 만들어집니다.
 */
'use strict';
const fs = require('fs');
const path = require('path');

/* ------------------------------------------------------------------ */
/* 기본 도구                                                           */
/* ------------------------------------------------------------------ */
let seed = 20261116;
const rand = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const rnd = (a, b) => a + (b - a) * rand();
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const r2 = (n) => Math.round(n * 100) / 100;

const LAWN = 16; // 잔디 높이(px)

const COLORS = {
  'leaf-d': 'oklch(32% 0.09 160)',
  'leaf': 'oklch(46% 0.12 155)',
  'leaf-l': 'oklch(60% 0.15 150)',
  'leaf-h': 'oklch(74% 0.16 142)',
  'stem': 'oklch(38% 0.09 150)',
  'edge': 'oklch(70% 0.13 118)',
  'pot-d': 'oklch(32% 0.08 38)',
  'pot': 'oklch(48% 0.12 42)',
  'pot-l': 'oklch(60% 0.13 48)',
  'soil': 'oklch(20% 0.03 50)',
  'pink': 'oklch(84% 0.10 5)',
  'pink-d': 'oklch(66% 0.19 8)',
  'gold': 'oklch(88% 0.15 95)',
  'white': 'oklch(93% 0.04 100)',
  'cactus': 'oklch(54% 0.11 168)',
  'cactus-d': 'oklch(38% 0.09 170)',
  'cactus-l': 'oklch(68% 0.12 165)',
  'succ': 'oklch(62% 0.09 182)',
  'succ-d': 'oklch(46% 0.09 190)',
  'succ-l': 'oklch(78% 0.09 170)',
  'trunk': 'oklch(34% 0.07 55)',
  'trunk-l': 'oklch(46% 0.08 58)',
  'lawn-l': 'oklch(42% 0.12 150)',
  'lawn': 'oklch(33% 0.10 152)',
  'lawn-d': 'oklch(25% 0.08 158)',
  'hill-near': 'oklch(21% 0.07 205)',
  'hill-far': 'oklch(29% 0.09 265)',
  'moon': 'oklch(95% 0.05 95)',
  'moon-d': 'oklch(83% 0.07 90)',
};

/* ------------------------------------------------------------------ */
/* 픽셀 스프라이트                                                     */
/* ------------------------------------------------------------------ */
class Sprite {
  constructor() {
    this.m = new Map();
    this.base = 0; // 화분 위 식물이 시작되는 행 (이 아래는 흔들리지 않음)
  }
  set(x, y, c) {
    if (c === null) this.m.delete(x + ',' + y);
    else this.m.set(x + ',' + y, c);
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  line(x0, y0, x1, y1, c) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
  ellipse(cx, cy, rx, ry, base, dark, light) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d > 1) continue;
        let c = base;
        if (d > 0.62) c = dark;
        else if (x - cx <= -rx * 0.2 && y - cy >= ry * 0.1 && d < 0.5) c = light;
        this.set(x, y, c);
      }
    }
  }
  bounds() {
    let minX = 1e9, maxX = -1e9, maxY = 0;
    for (const k of this.m.keys()) {
      const [x, y] = k.split(',').map(Number);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    return { minX, maxX, maxY };
  }
  // 같은 줄에서 이어지는 같은 색 픽셀을 하나의 가로선으로 합칩니다.
  runs() {
    const rows = new Map();
    for (const [k, c] of this.m) {
      const [x, y] = k.split(',').map(Number);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push([x, c]);
    }
    const out = [];
    for (const [y, arr] of rows) {
      arr.sort((a, b) => a[0] - b[0]);
      let i = 0;
      while (i < arr.length) {
        let j = i;
        while (j + 1 < arr.length && arr[j + 1][0] === arr[j][0] + 1 && arr[j + 1][1] === arr[i][1]) j++;
        out.push({ x: arr[i][0], y, w: j - i + 1, c: arr[i][1] });
        i = j + 1;
      }
    }
    return out;
  }
}

function addPot(s, w, h) {
  const rim = (w - 1) / 2;
  for (let y = 0; y < h - 1; y++) {
    const half = rim - 2 + (y >= (h - 1) / 2 ? 1 : 0);
    for (let x = -half; x <= half; x++) s.set(x, y, x === half ? 'pot-d' : x === -half ? 'pot-l' : 'pot');
  }
  for (let x = -rim; x <= rim; x++) s.set(x, h - 1, x === rim ? 'pot-d' : 'pot-l');
  for (let x = -rim + 1; x <= rim - 1; x++) s.set(x, h, 'soil');
  s.base = h + 1;
  return h + 1;
}

/* ------------------------------------------------------------------ */
/* 식물 도안                                                           */
/* ------------------------------------------------------------------ */
const PLANTS = {};

PLANTS.monstera = () => {
  const s = new Sprite();
  const b = addPot(s, 11, 6);
  const leaves = [
    [-5, b + 7, 5, 4],
    [5, b + 10, 5, 4],
    [0, b + 14, 5, 5],
  ];
  for (const [lx, ly, , ry] of leaves) s.line(0, b - 1, lx, ly - ry, 'stem');
  for (const [lx, ly, rx, ry] of leaves) {
    s.ellipse(lx, ly, rx, ry, 'leaf', 'leaf-d', 'leaf-l');
    for (let i = 2; i <= rx; i++) s.set(lx + i, ly - 1, null);
    for (let i = 2; i <= rx; i++) s.set(lx - i, ly + 1, null);
    s.line(lx, ly - ry + 1, lx, ly + ry - 1, 'leaf-d');
  }
  return s;
};

PLANTS.cactus = () => {
  const s = new Sprite();
  const b = addPot(s, 9, 5);
  const H = 15;
  const col = { '-2': 'cactus-d', '-1': 'cactus-l', '0': 'cactus', '1': 'cactus', '2': 'cactus-d' };
  for (let y = 0; y < H; y++) {
    const half = y === H - 1 ? 1 : 2;
    for (let x = -half; x <= half; x++) s.set(x, b + y, col[x]);
  }
  // 오른쪽 팔
  s.rect(3, b + 5, 3, 2, 'cactus');
  s.rect(4, b + 5, 2, 5, 'cactus');
  s.rect(5, b + 5, 1, 5, 'cactus-d');
  s.rect(4, b + 5, 1, 5, 'cactus-l');
  // 왼쪽 팔
  s.rect(-5, b + 8, 3, 2, 'cactus');
  s.rect(-5, b + 8, 2, 4, 'cactus');
  s.rect(-5, b + 8, 1, 4, 'cactus-d');
  s.rect(-4, b + 8, 1, 4, 'cactus-l');
  // 가시
  for (const [x, y] of [[0, 3], [1, 7], [-1, 10], [0, 12], [1, 4]]) s.set(x, b + y, 'white');
  // 꽃
  s.rect(-1, b + H, 3, 1, 'pink');
  s.set(0, b + H, 'gold');
  s.set(0, b + H + 1, 'pink-d');
  return s;
};

PLANTS.succulent = () => {
  const s = new Sprite();
  const b = addPot(s, 9, 4);
  s.ellipse(0, b + 3, 5, 3.2, 'succ', 'succ-d', 'succ');
  s.ellipse(0, b + 4, 3, 2.4, 'succ-l', 'succ', 'succ-l');
  for (const [x, y] of [[-5, 3], [5, 3], [-3, 0], [3, 0], [0, 6]]) s.set(x, b + y, 'pink-d');
  s.set(0, b + 4, 'pink');
  return s;
};

PLANTS.tulip = () => {
  const s = new Sprite();
  const b = addPot(s, 9, 5);
  const stems = [[-3, 8], [0, 13], [3, 10]];
  for (const [x, h] of stems) {
    s.line(x, b - 1, x, b + h, 'stem');
    s.line(x, b + 1, x + (x < 0 ? -3 : x > 0 ? 3 : -2), b + 6, 'leaf');
    s.line(x, b + 2, x + (x < 0 ? -2 : x > 0 ? 2 : 2), b + 7, 'leaf-l');
  }
  for (const [x, h] of stems) {
    const top = b + h;
    s.set(x, top, 'pink');
    s.rect(x - 1, top + 1, 3, 1, 'pink');
    s.set(x, top + 1, 'pink-d');
    s.set(x - 1, top + 2, 'pink');
    s.set(x + 1, top + 2, 'pink');
  }
  return s;
};

PLANTS.fern = () => {
  const s = new Sprite();
  const b = addPot(s, 11, 6);
  const fronds = [
    [-1, 11, 14],
    [1, 11, 13],
    [-0.55, 7, 18],
    [0.55, 7, 17],
    [-0.12, 2, 20],
  ];
  const pts = (dir, Xf, Hf) => {
    const out = [];
    for (let t = 0; t <= 1.0001; t += 0.045) {
      out.push([Math.round(dir * Xf * t), Math.round(b + Hf * (1.9 * t - 1.2 * t * t)), t]);
    }
    return out;
  };
  for (const [dir, Xf, Hf] of fronds) {
    pts(dir, Xf, Hf).forEach(([x, y, t], i) => {
      if (t < 0.12) return;
      const c = i % 2 ? 'leaf' : 'leaf-l';
      s.set(x - 1, y, c);
      s.set(x + 1, y, c);
      if (t > 0.3) s.set(x, y + 1, 'leaf-l');
    });
  }
  for (const [dir, Xf, Hf] of fronds) {
    for (const [x, y] of pts(dir, Xf, Hf)) s.set(x, y, 'leaf-d');
  }
  return s;
};

PLANTS.snake = () => {
  const s = new Sprite();
  const b = addPot(s, 9, 5);
  const blade = (cx, h, half) => {
    for (let y = 0; y < h; y++) {
      const hw = y >= h - 2 ? 0 : half;
      for (let x = -hw; x <= hw; x++) {
        let c = 'leaf';
        if (x === -hw && hw > 0) c = 'edge';
        else if (x === hw && hw > 0) c = 'leaf-d';
        else if (y % 4 === 1) c = 'leaf-d';
        s.set(cx + x, b + y, c);
      }
    }
  };
  blade(-5, 9, 0);
  blade(5, 11, 0);
  blade(-3, 15, 1);
  blade(3, 18, 1);
  blade(0, 23, 1);
  return s;
};

PLANTS.bonsai = () => {
  const s = new Sprite();
  s.rect(-5, 0, 11, 3, 'pot');
  s.rect(-5, 2, 11, 1, 'pot-l');
  s.rect(5, 0, 1, 3, 'pot-d');
  s.rect(-4, 3, 9, 1, 'soil');
  const b = 4;
  s.base = b;
  const trunk = [[0, 0], [0, 1], [-1, 2], [-1, 3], [-1, 4], [0, 5], [0, 6], [1, 7], [1, 8], [0, 9]];
  for (const [x, y] of trunk) {
    s.set(x, b + y, 'trunk');
    s.set(x + 1, b + y, 'trunk-l');
  }
  s.line(1, b + 6, 6, b + 9, 'trunk');
  s.line(0, b + 8, -6, b + 7, 'trunk');
  s.ellipse(-7, b + 9, 5, 3, 'leaf', 'leaf-d', 'leaf-l');
  s.ellipse(7, b + 11, 5, 3, 'leaf', 'leaf-d', 'leaf-l');
  s.ellipse(0, b + 13, 6, 4, 'leaf', 'leaf-d', 'leaf-l');
  return s;
};

/* ------------------------------------------------------------------ */
/* 배치 (cx: 화면 가운데 기준 가로 위치, g: 바닥에서의 높이)            */
/* ------------------------------------------------------------------ */
const GARDEN = [
  { id: 'fern', cx: -52, g: 9, wind: 'w1', mult: 1.2 },
  { id: 'bonsai', cx: 50, g: 9, wind: 'w2', mult: 0.6 },
  { id: 'monstera', cx: 0, g: 8, wind: 'w2', mult: 0.9 },
  { id: 'succulent', cx: -16, g: 6, wind: 'w1', mult: 0 },
  { id: 'tulip', cx: 15, g: 5, wind: 'w1', mult: 1.2 },
  { id: 'snake', cx: 33, g: 4, wind: 'w2', mult: 0.4 },
  { id: 'cactus', cx: -33, g: 3, wind: 'w1', mult: 0 },
].sort((a, b) => a.g - b.g); // 앞쪽(낮은 g)이 먼저 = 위에 그려짐

/* ------------------------------------------------------------------ */
/* 레이어 문자열                                                       */
/* ------------------------------------------------------------------ */
const L = (color, x, y, w, h) => `linear-gradient(var(--c-${color}) 0 100%) ${x} ${y} / ${w}px ${h}px no-repeat`;
const X = (n) => `calc(var(--W) / 2 + ${n}px)`;
const Y = (g) => `calc(var(--H) - ${g}px)`;

function spriteLayers(s, cx, g, wind, mult) {
  const b = s.bounds();
  const out = [];
  for (const r of s.runs()) {
    const f = r.y >= s.base ? ((r.y - s.base) / Math.max(1, b.maxY - s.base)) * mult : 0;
    const x = f >= 0.26
      ? `calc(var(--W) / 2 + ${cx + r.x}px + round(nearest, var(--${wind}) * ${r2(f)}, 1px))`
      : X(cx + r.x);
    out.push(L(r.c, x, Y(g + r.y + 1), r.w, 1));
  }
  return out;
}

function thumbCss(id, s) {
  const b = s.bounds();
  const w = b.maxX - b.minX + 1;
  const h = b.maxY + 1;
  const layers = s.runs().map((r) => L(r.c, `${r.x - b.minX}px`, `${b.maxY - r.y}px`, r.w, 1));
  return `.thumb-${id} {\n  width: ${w}px;\n  height: ${h}px;\n  background:\n    ${layers.join(',\n    ')};\n}\n`;
}

/* ------------------------------------------------------------------ */
/* 풀, 들꽃                                                            */
/* ------------------------------------------------------------------ */
function grass() {
  const front = [];
  const back = [];
  for (let i = 0; i < 120; i++) {
    const x = rint(-170, 170);
    const g = rint(0, 13);
    const h = rint(2, 5);
    const c = pick(['leaf', 'leaf-l', 'leaf-d', 'lawn-l', 'lawn-l']);
    const wind = pick(['w1', 'w2']);
    const layer = L(c, `calc(var(--W) / 2 + ${x}px + round(nearest, var(--${wind}) * 0.5, 1px))`, Y(g + h), 1, h);
    (g <= 2 ? front : back).push(layer);
  }
  return { front, back };
}

function wildflowers() {
  const out = [];
  for (let i = 0; i < 30; i++) {
    const x = rint(-168, 168);
    const g = rint(3, 12);
    const c = pick(['pink', 'white', 'gold', 'pink-d']);
    out.push(L('leaf-d', X(x), Y(g + 2), 1, 2));
    out.push(L(c, X(x), Y(g + 4), 2, 2));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 하늘, 달, 별, 언덕                                                   */
/* ------------------------------------------------------------------ */
function sky() {
  const cols = [
    'oklch(12% 0.05 268)',
    'oklch(15% 0.06 272)',
    'oklch(18% 0.08 278)',
    'oklch(22% 0.09 285)',
    'oklch(27% 0.10 295)',
    'oklch(32% 0.11 308)',
    'oklch(38% 0.11 322)',
    'oklch(44% 0.11 338)',
  ];
  const step = 100 / cols.length;
  const stops = cols.map((c, i) => `${c} ${r2(i * step)}% ${r2((i + 1) * step)}%`).join(', ');
  return `linear-gradient(to bottom, ${stops}) 0 0 / 100% 100% no-repeat`;
}

function glow() {
  const stops = [
    'oklch(62% 0.15 345 / 0.55) 0 12px',
    'oklch(58% 0.14 335 / 0.38) 12px 24px',
    'oklch(54% 0.13 325 / 0.24) 24px 38px',
    'oklch(50% 0.12 315 / 0.12) 38px 54px',
    'transparent 54px',
  ].join(', ');
  return `linear-gradient(to top, ${stops}) 0 calc(var(--H) - 80px) / 100% 80px no-repeat`;
}

function moonRuns() {
  const out = [];
  const R = 6;
  const cx = `round(nearest, var(--W) * 0.8, 1px)`;
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.floor(Math.sqrt(R * R + 0.6 - dy * dy));
    const cells = [];
    for (let dx = -half; dx <= half; dx++) {
      const crater = (dx === -2 && dy === -1) || (dx === 2 && dy === 2) || (dx === 1 && dy === -3) || (dx === 3 && dy === 0);
      const shade = dx + dy * 0.6 > 3.5;
      cells.push([dx, crater || shade ? 'moon-d' : 'moon']);
    }
    let i = 0;
    while (i < cells.length) {
      let j = i;
      while (j + 1 < cells.length && cells[j + 1][1] === cells[i][1]) j++;
      out.push(L(cells[i][1], `calc(${cx} + ${cells[i][0]}px)`, `${22 + dy}px`, j - i + 1, 1));
      i = j + 1;
    }
  }
  return out;
}

function moonHalo() {
  return `radial-gradient(circle 34px at calc(round(nearest, var(--W) * 0.8, 1px) + 0.5px) 22.5px, oklch(88% 0.07 95 / 0.30), oklch(80% 0.08 300 / 0.10) 60%, transparent) 0 0 / 100% 100% no-repeat`;
}

function stars() {
  const out = [];
  for (let i = 0; i < 34; i++) {
    const fx = rnd(0.02, 0.98);
    const fy = rnd(0.02, 0.5);
    const a = r2(rnd(0.25, 0.7));
    out.push(
      `linear-gradient(oklch(95% 0.03 100 / ${a}) 0 100%) round(nearest, var(--W) * ${r2(fx)}, 1px) round(nearest, var(--H) * ${r2(fy)}, 1px) / 1px 1px no-repeat`
    );
  }
  return out;
}

function hills(color, base, ampA, ampB, phase) {
  const heights = [];
  for (let i = -180; i <= 180; i++) {
    heights.push(Math.round(base + ampA * Math.sin(i * 0.05 + phase) + ampB * Math.sin(i * 0.13 + phase * 1.7)));
  }
  const minH = Math.min(...heights);
  const out = [];
  let i = 0;
  while (i < heights.length) {
    let j = i;
    while (j + 1 < heights.length && heights[j + 1] === heights[i]) j++;
    const h = heights[i];
    out.push(L(color, X(-180 + i), Y(LAWN + h), j - i + 1, h + LAWN));
    i = j + 1;
  }
  out.push(`linear-gradient(var(--c-${color}) 0 100%) 0 ${Y(LAWN + minH)} / 100% ${LAWN + minH}px no-repeat`);
  return out;
}

function lawn() {
  return `linear-gradient(var(--c-lawn-l) 0 2px, var(--c-lawn) 2px 7px, var(--c-lawn-d) 7px 100%) 0 ${Y(LAWN)} / 100% ${LAWN}px no-repeat`;
}

/* ------------------------------------------------------------------ */
/* 움직이는 것들: 반딧불, 꽃잎, 반짝이는 별                              */
/* ------------------------------------------------------------------ */
function sparkles() {
  const out = [];
  // 반짝이는 별
  for (let i = 0; i < 14; i++) {
    const k = rint(1, 4);
    const p = rint(0, 359);
    out.push(
      `linear-gradient(oklch(97% 0.04 100 / calc(0.55 + 0.45 * sin(var(--a) * ${k} + ${p}deg))) 0 100%) round(nearest, var(--W) * ${r2(rnd(0.03, 0.97))}, 1px) round(nearest, var(--H) * ${r2(rnd(0.03, 0.45))}, 1px) / 1px 1px no-repeat`
    );
  }
  return out;
}

function fireflies() {
  const out = [];
  for (let i = 0; i < 16; i++) {
    const fx = r2(rnd(0.05, 0.95));
    const y0 = rint(14, 46);
    const kx = rint(1, 3);
    const ky = rint(1, 3);
    const px = rint(0, 359);
    const py = rint(0, 359);
    const bk = rint(2, 5);
    const pb = rint(0, 359);
    const ax = rint(4, 9);
    const ay = rint(3, 6);
    const xe = `calc(var(--W) * ${fx} + round(nearest, ${ax}px * sin(var(--a) * ${kx} + ${px}deg), 1px))`;
    const ye = `calc(var(--H) - ${y0}px + round(nearest, ${ay}px * sin(var(--a) * ${ky} + ${py}deg), 1px))`;
    const alpha = `(0.55 + 0.45 * sin(var(--a) * ${bk} + ${pb}deg))`;
    out.push(`linear-gradient(oklch(93% 0.17 110 / calc(${alpha})) 0 100%) ${xe} ${ye} / 1px 1px no-repeat`);
    out.push(
      `linear-gradient(oklch(90% 0.15 110 / calc(${alpha} * 0.22)) 0 100%) calc(${xe} - 1px) calc(${ye} - 1px) / 3px 3px no-repeat`
    );
  }
  return out;
}

function petals() {
  const out = [];
  for (let i = 0; i < 18; i++) {
    const v = pick([1, 1, 2, 3]);
    const o = rint(0, 300);
    const fx = r2(rnd(0.02, 0.98));
    const k = rint(2, 4);
    const p = rint(0, 359);
    const amp = rint(4, 9);
    const color = pick(['oklch(86% 0.10 5 / 0.9)', 'oklch(92% 0.05 10 / 0.9)', 'oklch(80% 0.13 355 / 0.9)']);
    const ye = `round(down, calc(mod(var(--t) * ${v} * (var(--H) + 6px) + ${o}px, var(--H) + 6px) - 6px), 1px)`;
    const xe = `calc(var(--W) * ${fx} + round(nearest, ${amp}px * sin(var(--a) * ${k} + ${p}deg), 1px))`;
    out.push(`linear-gradient(${color} 0 100%) ${xe} ${ye} / 2px 1px no-repeat`);
  }
  return out;
}

function vignette() {
  return `radial-gradient(ellipse 85% 80% at 50% 45%, transparent 55%, oklch(8% 0.04 270 / 0.55)) 0 0 / 100% 100% no-repeat`;
}

/* ------------------------------------------------------------------ */
/* CSS 조립                                                            */
/* ------------------------------------------------------------------ */
const join = (arr) => arr.join(',\n    ');

const sprites = {};
for (const id of Object.keys(PLANTS)) sprites[id] = PLANTS[id]();

const plantLayers = [];
for (const p of GARDEN) plantLayers.push(...spriteLayers(sprites[p.id], p.cx, p.g, p.wind, p.mult));

const gr = grass();

const sceneBg = [
  lawn(),
  ...hills('hill-near', 18, 4, 2.5, 1.3),
  ...hills('hill-far', 31, 5, 3, 3.1),
  glow(),
  ...moonRuns(),
  ...stars(),
  moonHalo(),
  sky(),
];

const beforeBg = [...gr.front, ...plantLayers, ...wildflowers(), ...gr.back];
const afterBg = [...fireflies(), ...petals(), ...sparkles(), vignette()];

let css = `/* 이 파일은 tools/build-scene.js 로 생성됩니다.
   수정하려면 스크립트를 고치고 \`node tools/build-scene.js\` 를 다시 실행하세요. */

@property --a { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
@property --t { syntax: "<number>"; initial-value: 0; inherits: false; }
@property --w1 { syntax: "<length>"; initial-value: 0px; inherits: false; }
@property --w2 { syntax: "<length>"; initial-value: 0px; inherits: false; }

:root {
${Object.entries(COLORS).map(([k, v]) => `  --c-${k}: ${v};`).join('\n')}
}

/* 장면 크기와 배율(--W, --H, --s)은 script.js 가 화면 크기에 맞춰 덮어씁니다. */
.scene {
  --W: 160px;
  --H: 100px;
  --s: 6;
  position: fixed;
  left: 50%;
  bottom: 0;
  width: var(--W);
  height: var(--H);
  translate: -50% 0;
  scale: var(--s);
  transform-origin: 50% 100%;
  z-index: 0;
  pointer-events: none;
  background:
    ${join(sceneBg)};
}

.scene::before,
.scene::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* 식물 + 풀: 바람에 맞춰 위쪽이 살짝 흔들립니다 */
.scene::before {
  background:
    ${join(beforeBg)};
  animation: wind1 8s steps(8) infinite alternate, wind2 13s steps(13) infinite alternate;
}

/* 반딧불 + 떨어지는 꽃잎 + 반짝이는 별 */
.scene::after {
  background:
    ${join(afterBg)};
  animation: drift 48s steps(480) infinite, fall 60s steps(600) infinite;
}

@keyframes wind1 { from { --w1: -2px; } to { --w1: 2px; } }
@keyframes wind2 { from { --w2: 2px; } to { --w2: -2px; } }
@keyframes drift { to { --a: 360deg; } }
@keyframes fall { to { --t: 1; } }

@media (prefers-reduced-motion: reduce) {
  .scene::before,
  .scene::after { animation: none; }
}

/* 카드에 쓰는 식물 썸네일 (같은 도안을 작게 그립니다) */
.thumb {
  position: absolute;
  left: 50%;
  bottom: 0;
  translate: -50% 0;
  scale: 5;
  transform-origin: 50% 100%;
}
`;

for (const id of Object.keys(sprites)) css += '\n' + thumbCss(id, sprites[id]);

const out = path.join(__dirname, '..', 'scene.css');
fs.writeFileSync(out, css);

const count = (arr) => arr.length;
console.log('written', out, `(${Math.round(css.length / 1024)} KB)`);
console.log('layers  scene:', count(sceneBg), ' before:', count(beforeBg), ' after:', count(afterBg));
for (const id of Object.keys(sprites)) {
  const b = sprites[id].bounds();
  console.log(' ', id.padEnd(10), `${b.maxX - b.minX + 1}x${b.maxY + 1}`, sprites[id].runs().length, 'runs');
}
