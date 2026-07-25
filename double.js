import { RouletteModule } from './gameLogic.js';
const historyEl = document.getElementById('double-history');
const rouletteInner = document.getElementById('double-roulette-inner');
const betInput = document.getElementById('double-bet-input');
const btnRed = document.getElementById('double-btn-red');
const btnGreen = document.getElementById('double-btn-green');
const btnBlack = document.getElementById('double-btn-black');
const dblBtnHalf   = document.getElementById('double-btn-half');
const dblBtnDouble = document.getElementById('double-btn-double');
const dblBtnMax    = document.getElementById('double-btn-max');
const btnDoubleChances = document.getElementById('btn-double-chances');

if (btnDoubleChances) {
  btnDoubleChances.addEventListener('click', () => {
    let mode = (window.userData && window.userData.rtpMode) ? window.userData.rtpMode : 'casino';
    if (mode === 'honest') {
      window.showNotification('Честный: Шанс победы Красное/Черное: 40%. Зеро: ~7% (x14.37)', 'info');
    } else if (mode === 'boost') {
      window.showNotification('Буст: Шанс победы Красное/Черное: 46%. Зеро: ~8% (x14.37)', 'info');
    } else {
      window.showNotification('Казино: Шанс победы Красное/Черное: 38%. Зеро: ~6.6% (x14.37)', 'info');
    }
  });
}

// ── Кнопки быстрых ставок ─────────────────────────────────────────────────
dblBtnHalf.addEventListener('click', () => {
  let val = parseFloat(betInput.value) || 0;
  betInput.value = Math.max(1, Math.floor(val / 2));
});
dblBtnDouble.addEventListener('click', () => {
  let val = parseFloat(betInput.value) || 0;
  betInput.value = Math.min(window.currentBalance || 0, Math.floor(val * 2));
});
dblBtnMax.addEventListener('click', () => {
  betInput.value = Math.floor(window.currentBalance || 0);
});

const SECTORS = [
  'red','black','red','black','red','black','red','green','black','red','black','red','black','red','black'
];

const COLORS = {
  'red': '#ff0055',
  'black': '#2a2d45',
  'green': '#00c853'
};

const CARD_W = 80; // совпадает с CSS .double-item width
let isSpinning = false;

[btnRed, btnGreen, btnBlack].forEach(btn => {
  btn.addEventListener('click', () => {
    if (!window.currentUser) {
      window.showNotification('Пожалуйста, авторизуйтесь', 'error');
      return;
    }
    if (isSpinning) return;

    const bet = Math.floor(parseFloat(betInput.value));
    if (isNaN(bet) || bet <= 0 || bet > (window.currentBalance || 0)) {
      window.showNotification('Неверная сумма ставки', 'error');
      return;
    }

    const choice = btn.id.replace('double-btn-', '');
    window.updateBalance(window.currentBalance - bet);
    startSpin(bet, choice);
  });
});

function createCard(color) {
  const div = document.createElement('div');
  div.className = `double-item bg-${color}`;
  return div;
}

function startSpin(bet, choice) {
  isSpinning = true;
  [btnRed, btnGreen, btnBlack].forEach(b => b.disabled = true);

  // Генерируем результат ДО анимации — независимо от ширины экрана
  const spinResult = RouletteModule.spin(choice);
  const resultColor = spinResult.color;
  
  let matchingIndices = [];
  for (let i = 0; i < SECTORS.length; i++) {
    if (SECTORS[i] === resultColor) matchingIndices.push(i);
  }
  const resultSectorIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];

  // Строим ленту: N полных оборотов + позиция результата в конце
  const FULL_LOOPS = 5;
  const targetIndex = SECTORS.length * FULL_LOOPS + resultSectorIndex;
  const totalCards = targetIndex + 15; // Добавляем 15 фейковых карточек после победной

  rouletteInner.style.transition = 'none';
  rouletteInner.style.transform = 'translateX(0)';
  rouletteInner.innerHTML = '';

  for (let i = 0; i < totalCards; i++) {
    rouletteInner.appendChild(createCard(SECTORS[i % SECTORS.length]));
  }

  // Принудительный reflow перед запуском анимации
  void rouletteInner.offsetWidth;

  setTimeout(() => {
    // Целевой элемент (победитель) — последняя карта в ленте
    const winnerEl = rouletteInner.children[totalCards - 1];

    // Вычисляем translateX так, чтобы центр winnerEl оказался под маркером
    const container = rouletteInner.parentElement;
    const containerCenter = container.clientWidth / 2;
    // offsetLeft относительно rouletteInner (0-based)
    const winnerLeft = targetIndex * CARD_W; // Центрируем строго на целевом индексе
    const winnerCenter = winnerLeft + CARD_W / 2;
    const finalOffset = winnerCenter - containerCenter;

    rouletteInner.style.transition = 'transform 4s cubic-bezier(0.15, 0.85, 0.25, 1)';
    rouletteInner.style.transform = `translateX(-${finalOffset}px)`;

    rouletteInner.addEventListener('transitionend', function handler(e) {
      if (e.propertyName === 'transform') {
        rouletteInner.removeEventListener('transitionend', handler);
        finishSpin(bet, choice, spinResult);
      }
    });
  }, 50);
}

function finishSpin(bet, choice, spinResult) {
  const resultColor = spinResult.color;
  isSpinning = false;
  [btnRed, btnGreen, btnBlack].forEach(b => b.disabled = false);

  addHistory(resultColor);

  if (choice === resultColor) {
    const win = Math.floor(bet * spinResult.multiplier);
    window.updateBalance(window.currentBalance + win);
  }
}

const MAX_HISTORY = 12;

function addHistory(color) {
  const dot = document.createElement('div');
  dot.style.cssText = `
    width: 22px; height: 22px;
    border-radius: 50%;
    background: ${COLORS[color]};
    flex-shrink: 0;
    box-shadow: 0 0 6px ${COLORS[color]}88;
    transition: opacity 0.3s ease;
  `;

  historyEl.prepend(dot);

  // Лимит истории — плавное удаление старых
  while (historyEl.children.length > MAX_HISTORY) {
    const old = historyEl.lastChild;
    old.style.opacity = '0';
    setTimeout(() => old.remove(), 300);
  }
}
