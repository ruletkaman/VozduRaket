import { CaseModule } from './gameLogic.js';

// Цвета редкости по индексу: 0,1 — серый/синий; 2,3 — фиолетовый; 4 — золото (красный 3)
const RARITY_COLORS = ['#8b8b8b', '#4b69ff', '#a855f7', '#ff0055', '#ffaa00'];
const RARITY_NAMES  = ['common', 'common', 'classified', 'classified', 'legendary'];

function assignColor(amount, price, maxAmount) {
  if (amount === maxAmount) return RARITY_COLORS[4]; // Желтый (Джекпот)
  if (amount >= price * 5) return RARITY_COLORS[3];  // Красный (ебать дорогой)
  if (amount >= price * 1.5) return RARITY_COLORS[2]; // Фиолетовый (нормально дороже)
  if (amount >= price) return RARITY_COLORS[1];      // Синий (равен или чуток больше)
  return RARITY_COLORS[0];                           // Серый (дешевле кейса)
}

function processConfig(configArray, price) {
  const maxWin = Math.max(...configArray.map(c => c.win));
  return configArray.map(c => ({
    name: c.name || (c.win + ' ₽'),
    win: c.win,
    amount: c.win,
    chance: c.chance,
    color: assignColor(c.win, price, maxWin)
  }));
}

const SPAIN_IMAGES = [
  'assets/SPAINcucurella.PNG', 'assets/SPAINmikelmerino.PNG', 'assets/SPAINoyarzabal.PNG',
  'assets/SPAINrodri.PNG', 'assets/SPAINunaisimon.PNG', 'assets/SPAINcubarsi.PNG',
  'assets/SPAINferrantorres.PNG', 'assets/SPAINdelaFuente.PNG', 'assets/SPAINpedri.PNG', 'assets/SPAINlamineyamal.PNG'
];
const ARGENTINA_IMAGES = [
  'assets/ARGENTINAmolina.PNG', 'assets/ARGENTINAparedes.PNG', 'assets/ARGENTINAsimeone.PNG',
  'assets/ARGENTINAdePaul.PNG', 'assets/ARGENTINAmacAllister.PNG', 'assets/ARGENTINAenzoFernandes.PNG',
  'assets/ARGENTINAscaloni.PNG', 'assets/ARGENTINAemiMartinez.PNG', 'assets/ARGENTINAalvarez.PNG', 'assets/ARGENTINAmessi.PNG'
];

function processFootball(configArray, images, price) {
  const maxWin = 50000;
  return configArray.map((c, i) => {
    let color = assignColor(c.win, price, maxWin);
    return { name: c.name, win: c.win, amount: c.win, chance: c.chance, color, image: images[i] };
  });
}

const CASES_CONFIG = {
  spain: { name: 'ИСПАНИЯ', price: 1000, getItems: () => processFootball(CaseModule.getFootballConfig(), SPAIN_IMAGES, 1000) },
  argentina: { name: 'АРГЕНТИНА', price: 1000, getItems: () => processFootball(CaseModule.getFootballConfig(), ARGENTINA_IMAGES, 1000) },
  sotka: { name: 'Сотка', price: 100, getItems: () => processConfig(CaseModule.getSotkaConfig(), 100) },
  basic: { name: 'Базовый', price: 1000, getItems: () => processConfig(CaseModule.getBasicConfig(), 1000) },
  pyzh: { name: 'Пыжик', price: 500, getItems: () => processConfig(CaseModule.getPyzhikConfig(), 500) },
  power: { name: 'Мощь', price: 5000, getItems: () => processConfig(CaseModule.getMightConfig(), 5000) }
};

// ─── Состояние ─────────────────────────────────────────────────────────────
let currentCaseKey = null;
let isSpinning = false;

// ─── DOM ────────────────────────────────────────────────────────────────────
const casesMenu    = document.getElementById('cases-menu');
const casesInner   = document.getElementById('cases-inner');
const casesBackBtn = document.getElementById('cases-back-btn');
const casesTitle   = document.getElementById('cases-inner-title');
const prizesGrid   = document.getElementById('cases-prizes-grid');
const rouletteInner = document.getElementById('cases-roulette-inner');
const resultEl     = document.getElementById('cases-result');
const btnOpen      = document.getElementById('cases-btn-open');
const btnChances   = document.getElementById('btn-chances');
const chancesModal = document.getElementById('chances-modal');
const chancesClose = document.getElementById('chances-close');
// ─── Открыть кейс (плитка клик) ────────────────────────────────────────────
document.querySelectorAll('.cases-tile').forEach(tile => {
  tile.addEventListener('click', () => {
    const key = tile.dataset.case;
    if (!CASES_CONFIG[key]) return;
    currentCaseKey = key;
    openCaseInner(key);
  });
});

function openCaseInner(key) {
  const cfg = CASES_CONFIG[key];
  casesMenu.classList.add('hidden');
  casesInner.classList.remove('hidden');
  casesTitle.textContent = `${cfg.name} — ${cfg.price} ₽`;
  btnOpen.textContent = `ОТКРЫТЬ КЕЙС — ${cfg.price} ₽`;
  rouletteInner.innerHTML = '';
  rouletteInner.style.transition = 'none';
  rouletteInner.style.transform = 'translateX(0)';
  renderPrizes(key);
}

// ─── Назад ──────────────────────────────────────────────────────────────────
casesBackBtn.addEventListener('click', () => {
  casesMenu.classList.remove('hidden');
  casesInner.classList.add('hidden');
  currentCaseKey = null;
});

// ─── Шансы (модальное окно) ────────────────────────────────────────────────
if (btnChances && chancesModal && chancesClose) {
  btnChances.addEventListener('click', () => {
    chancesModal.classList.remove('hidden');
  });
  chancesClose.addEventListener('click', () => {
    chancesModal.classList.add('hidden');
  });
  chancesModal.addEventListener('click', (e) => {
    if (e.target === chancesModal) chancesModal.classList.add('hidden');
  });
}

// ─── Рендер призов ──────────────────────────
function renderPrizes(key) {
  const cfg = CASES_CONFIG[key];
  prizesGrid.innerHTML = '';

  const items = cfg.getItems();
  if (items) {
    items.forEach((item, i) => {
      const pct = item.chance.toFixed(2);
      const card = document.createElement('div');
      card.className = 'prize-card';
      card.style.borderBottomColor = item.color;
      card.style.borderBottomWidth = '3px';
      card.style.borderBottomStyle = 'solid';
      let bg = 'var(--bg-lighter)';
      if (item.color === RARITY_COLORS[4]) bg = 'linear-gradient(to bottom, #2a2010, #1a1d2e)'; // Jackpot
      else if (item.color === RARITY_COLORS[2] || item.color === RARITY_COLORS[3]) bg = 'linear-gradient(to bottom, #1e1230, #1a1d2e)'; // Purple/Red
      card.style.background = bg;
      
      let imgHtml = '';
      if (item.image) {
        imgHtml = `<div style="height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 5px;"><img src="${item.image}" style="max-height: 100%; max-width: 100%; object-fit: contain;"></div>`;
      }
      
      card.innerHTML = `
        ${imgHtml}
        <div class="prize-card-amount" style="color:${item.color}">${item.amount} ₽</div>
        <div class="prize-card-pct">${pct}%</div>
      `;
      prizesGrid.appendChild(card);
    });
  }
}

// ─── Получить случайный приз (115% RTP) ──────────────────────────
function getRandomPrize(key) {
  const cfg = CASES_CONFIG[key];
  const { item, index } = CaseModule.openCase(cfg.getItems());
  return { amount: item.amount, index: index };
}

// ─── Создать карточку для рулетки (с цветом редкости) ──────────────────────
function createRouletteCard(amount, prizeIndex) {
  const cfg = CASES_CONFIG[currentCaseKey];
  
  const items = cfg.getItems();
  const item = items[prizeIndex];
  const color = item.color;
  let bg = 'linear-gradient(to bottom, #1a1d2e, #252840)';
  if (item.color === RARITY_COLORS[4]) bg = 'linear-gradient(to bottom, #2a2010, #1a1d2e)'; // Jackpot
  else if (item.color === RARITY_COLORS[2] || item.color === RARITY_COLORS[3]) bg = 'linear-gradient(to bottom, #1e1230, #1a1d2e)'; // Purple/Red
  
  const div = document.createElement('div');
  div.className = 'case-item';
  div.style.background = bg;
  div.style.borderBottom = `3px solid ${color}`;
  
  let imgHtml = '';
  if (item.image) {
    imgHtml = `<div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 5px;"><img src="${item.image}" style="max-height: 80px; max-width: 100%; object-fit: contain;"></div>`;
  } else {
    imgHtml = `<div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 5px;"></div>`;
  }
  
  div.innerHTML = `
    ${imgHtml}
    <div class="item-price orbitron" style="font-size:1.2rem; color:${color}; margin-bottom: 10px;">${amount} ₽</div>
  `;
  return div;
}

// ─── Кнопка открыть ─────────────────────────────────────────────────────────
btnOpen.addEventListener('click', () => {
  if (!window.currentUser) {
    window.showNotification('Пожалуйста, авторизуйтесь', 'error');
    return;
  }
  if (!currentCaseKey) return;
  if (isSpinning) return;

  const cfg = CASES_CONFIG[currentCaseKey];
  if ((window.currentBalance || 0) < cfg.price) {
    window.showNotification('Недостаточно средств', 'error');
    return;
  }

  window.updateBalance(window.currentBalance - cfg.price);
  openCase();
});

function openCase() {
  isSpinning = true;
  btnOpen.disabled = true;
  rouletteInner.innerHTML = '';
  rouletteInner.style.transition = 'none';
  rouletteInner.style.transform = 'translateX(0)';

  const winner = getRandomPrize(currentCaseKey);
  const cfg = CASES_CONFIG[currentCaseKey];

  const TOTAL = 50;
  const WIN_INDEX = 35;

  for (let i = 0; i < TOTAL; i++) {
    // На победной позиции — нужный приз, остальные — случайные
    let amount, prizeIdx;
    if (i === WIN_INDEX) {
      amount = winner.amount;
      prizeIdx = winner.index;
    } else {
      const randPrize = getRandomPrize(currentCaseKey);
      prizeIdx = randPrize.index;
      amount = randPrize.amount;
    }
    rouletteInner.appendChild(createRouletteCard(amount, prizeIdx));
  }

  void rouletteInner.offsetWidth; // reflow

  setTimeout(() => {
    const CARD_W = 150; // .case-item width(140) + margins(5*2)
    const containerWidth = rouletteInner.parentElement.clientWidth;
    const randomOffset = Math.floor(Math.random() * 40) - 20;
    const centerOffset = containerWidth / 2 - CARD_W / 2;
    const finalOffset = WIN_INDEX * CARD_W - centerOffset + randomOffset;

    rouletteInner.style.transition = 'transform 5s cubic-bezier(0.15, 0.85, 0.25, 1)';
    rouletteInner.style.transform = `translateX(-${finalOffset}px)`;

    rouletteInner.addEventListener('transitionend', function handler(e) {
      if (e.propertyName === 'transform') {
        rouletteInner.removeEventListener('transitionend', handler);
        onCaseOpened(winner);
      }
    });
  }, 50);
}

function onCaseOpened(winner) {
  window.updateBalance(window.currentBalance + winner.amount);

  isSpinning = false;
  btnOpen.disabled = false;
}
