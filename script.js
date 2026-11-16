'use strict';

/* ------------------------------------------------------------------ */
/* 내 식물 목록 — 아래 내용을 직접 고쳐 주세요 (현재는 예시 데이터)       */
/*   id    : 정원 배경의 식물 그림과 연결되는 이름 (바꾸지 마세요)        */
/*   since : 함께하기 시작한 날 (YYYY-MM-DD)                            */
/*   water : 물 주는 주기(일)                                          */
/* ------------------------------------------------------------------ */
const PLANTS = [
  {
    id: 'monstera',
    name: '몬스테라',
    latin: 'Monstera deliciosa',
    kind: '관엽식물',
    note: '새 잎이 돌돌 말려 나올 때가 제일 설레요. 잎이 갈라지는 걸 지켜보는 재미가 있어요.',
    light: '밝은 간접광',
    water: 7,
    since: '2024-03-02',
  },
  {
    id: 'cactus',
    name: '선인장',
    latin: 'Cactaceae',
    kind: '다육·선인장',
    note: '물 주는 걸 깜빡해도 묵묵히 버텨 주는 든든한 친구. 봄이면 꽃을 보여 줘요.',
    light: '직사광선',
    water: 21,
    since: '2023-06-10',
  },
  {
    id: 'succulent',
    name: '에케베리아',
    latin: 'Echeveria elegans',
    kind: '다육·선인장',
    note: '장미꽃처럼 겹겹이 펼쳐진 잎. 햇빛을 많이 받으면 끝이 분홍빛으로 물들어요.',
    light: '밝은 햇빛',
    water: 14,
    since: '2024-09-15',
  },
  {
    id: 'tulip',
    name: '튤립',
    latin: 'Tulipa gesneriana',
    kind: '꽃',
    note: '봄을 알려 주는 꽃. 꽃이 지고 나면 구근을 쉬게 해 줘요.',
    light: '밝은 곳, 서늘하게',
    water: 4,
    since: '2025-02-20',
  },
  {
    id: 'fern',
    name: '고사리',
    latin: 'Nephrolepis exaltata',
    kind: '관엽식물',
    note: '습한 걸 좋아해서 자주 분무해 줘요. 아치처럼 늘어지는 잎이 매력이에요.',
    light: '반그늘',
    water: 3,
    since: '2024-05-18',
  },
  {
    id: 'snake',
    name: '산세베리아',
    latin: 'Dracaena trifasciata',
    kind: '관엽식물',
    note: '공기 정화 식물로 유명하지만, 사실은 키우기 쉬워서 좋아해요.',
    light: '어디서나 OK',
    water: 14,
    since: '2022-11-05',
  },
  {
    id: 'bonsai',
    name: '미니 분재',
    latin: 'Ficus microcarpa',
    kind: '나무',
    note: '가지를 다듬는 시간이 하루 중 가장 조용한 시간이에요.',
    light: '밝은 간접광',
    water: 7,
    since: '2023-01-22',
  },
];

/* ------------------------------------------------------------------ */
/* 배경 장면 크기 맞추기                                               */
/* 화면 크기에 맞춰 정수 배율로 키워서 도트가 또렷하게 보이도록 합니다.   */
/* ------------------------------------------------------------------ */
const scene = document.querySelector('.scene');
let fitQueued = false;

function fitScene() {
  fitQueued = false;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const s = Math.max(3, Math.floor(Math.min(vh / 100, vw / 120)));
  scene.style.setProperty('--s', s);
  scene.style.setProperty('--W', Math.ceil(vw / s) + 'px');
  scene.style.setProperty('--H', Math.ceil(vh / s) + 'px');
}

function queueFit() {
  if (fitQueued) return;
  fitQueued = true;
  requestAnimationFrame(fitScene);
}

fitScene();
window.addEventListener('resize', queueFit);

/* ------------------------------------------------------------------ */
/* 물 준 날 기록 (이 브라우저의 localStorage 에만 저장됩니다)            */
/* ------------------------------------------------------------------ */
const STORE_KEY = 'my-garden-watered';

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveRecords(records) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(records));
  } catch (e) {
    /* 저장이 막힌 환경(사생활 보호 모드 등)에서는 그냥 넘어갑니다 */
  }
}

const todayStr = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD (내 시간대 기준)
const toDate = (str) => new Date(str + 'T00:00:00');
const DAY = 24 * 60 * 60 * 1000;

function daysSince(str) {
  return Math.round((toDate(todayStr()) - toDate(str)) / DAY);
}

function togetherText(since) {
  const from = toDate(since);
  const now = new Date();
  let months = (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  if (now.getDate() < from.getDate()) months -= 1;
  if (months < 1) return '새 식구';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}개월`;
  return m === 0 ? `${y}년` : `${y}년 ${m}개월`;
}

function waterStatus(plant, last) {
  if (!last) return { state: 'none', text: '물 준 기록이 없어요' };
  const d = daysSince(last);
  if (d <= 0) return { state: 'ok', text: '오늘 물 줬어요' };
  const left = plant.water - d;
  if (left > 0) return { state: 'ok', text: `${d}일 전에 물 줬어요 · ${left}일 뒤 차례` };
  if (left === 0) return { state: 'due', text: '오늘 물 줄 차례예요' };
  return { state: 'due', text: `물 줄 때가 ${-left}일 지났어요` };
}

/* ------------------------------------------------------------------ */
/* 카드 그리기                                                         */
/* ------------------------------------------------------------------ */
const grid = document.getElementById('plant-grid');
const filters = document.getElementById('filters');
let records = loadRecords();
let currentKind = '전체';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function careItem(label, value) {
  const wrap = el('div');
  wrap.append(el('dt', '', label), el('dd', '', value));
  return wrap;
}

function renderCard(plant) {
  const li = el('li', 'card');
  li.dataset.kind = plant.kind;

  const box = el('div', 'thumb-box');
  box.setAttribute('aria-hidden', 'true');
  box.append(el('div', `thumb thumb-${plant.id}`));

  const body = el('div', 'card-body');
  const care = el('dl', 'care');
  care.append(
    careItem('빛', plant.light),
    careItem('물', `${plant.water}일마다`),
    careItem('함께한 지', togetherText(plant.since))
  );

  const water = el('div', 'water');
  const status = el('span', 'water-status');
  status.setAttribute('aria-live', 'polite');
  const actions = el('div', 'water-actions');
  const waterBtn = el('button', 'btn', '물 줬어요');
  waterBtn.type = 'button';
  const clearBtn = el('button', 'btn-text', '기록 지우기');
  clearBtn.type = 'button';
  actions.append(waterBtn, clearBtn);
  water.append(status, actions);

  const refresh = () => {
    const info = waterStatus(plant, records[plant.id]);
    status.textContent = info.text;
    status.dataset.state = info.state;
    clearBtn.hidden = !records[plant.id];
  };

  waterBtn.addEventListener('click', () => {
    records[plant.id] = todayStr();
    saveRecords(records);
    refresh();
  });
  clearBtn.addEventListener('click', () => {
    delete records[plant.id];
    saveRecords(records);
    refresh();
  });

  body.append(
    el('span', 'tag', plant.kind),
    el('h3', '', plant.name),
    el('p', 'latin', plant.latin),
    el('p', 'note', plant.note),
    care,
    water
  );
  li.append(box, body);
  refresh();
  return li;
}

function renderGrid() {
  grid.replaceChildren(
    ...PLANTS.filter((p) => currentKind === '전체' || p.kind === currentKind).map(renderCard)
  );
}

function renderFilters() {
  const kinds = ['전체', ...new Set(PLANTS.map((p) => p.kind))];
  filters.replaceChildren(
    ...kinds.map((kind) => {
      const chip = el('button', 'chip', kind);
      chip.type = 'button';
      chip.setAttribute('aria-pressed', String(kind === currentKind));
      chip.addEventListener('click', () => {
        currentKind = kind;
        filters.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
        renderGrid();
      });
      return chip;
    })
  );
}

renderFilters();
renderGrid();
