import { CrashModule } from './gameLogic.js';
const canvas = document.getElementById('crash-canvas');
const ctx = canvas.getContext('2d');
const multiplierEl = document.getElementById('crash-multiplier');
const statusEl = document.getElementById('crash-status');
const historyEl = document.getElementById('crash-history');
const betInput = document.getElementById('crash-bet-input');
const btnHalf = document.getElementById('crash-btn-half');
const btnDouble = document.getElementById('crash-btn-double');
const btnMax = document.getElementById('crash-btn-max');
const autoCashoutInput = document.getElementById('crash-auto-cashout');
const playBtn = document.getElementById('crash-btn-play');

let isFlying = false;
let isCashedOut = false;
let currentMultiplier = 1.00;
let crashPoint = 1.00;
let betAmount = 0;
let animationId = null;
let lastTime = 0;
let virtualTime = 0;
let isTurbo = false;

// ── Canvas resize: привязываем к открытию таба через ResizeObserver ──────────
function resizeCanvas() {
  const board = canvas.parentElement;
  canvas.width = board.clientWidth - 40; // учёт padding
  canvas.height = window.innerWidth <= 768 ? 200 : 300;
  isFlying ? drawChart(currentMultiplier, false) : drawIdle();
}

// ResizeObserver на родителя canvas — срабатывает при открытии вкладки
const ro = new ResizeObserver(() => resizeCanvas());
ro.observe(canvas.parentElement);
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── Кнопки ставки (НЕ УДАЛЯТЬ) ───────────────────────────────────────────────
btnHalf.addEventListener('click', () => {
  let val = parseFloat(betInput.value) || 0;
  betInput.value = Math.max(1, Math.floor(val / 2));
});

btnDouble.addEventListener('click', () => {
  let val = parseFloat(betInput.value) || 0;
  betInput.value = Math.min(window.currentBalance || 0, Math.floor(val * 2));
});

btnMax.addEventListener('click', () => {
  betInput.value = Math.floor(window.currentBalance || 0);
});

// ── Главная кнопка ─────────────────────────────────────────────────────────
playBtn.addEventListener('click', () => {
  if (!window.currentUser) {
    window.showNotification('Пожалуйста, авторизуйтесь', 'error');
    return;
  }

  if (isFlying && !isCashedOut) {
    cashOut();
    return;
  }

  if (isFlying) return; // already cashed out, waiting for crash

  const bet = Math.floor(parseFloat(betInput.value));
  if (isNaN(bet) || bet <= 0 || bet > (window.currentBalance || 0)) {
    window.showNotification('Неверная сумма ставки', 'error');
    return;
  }

  startGame(bet);
});

// ── Генерация краш-точки ────────────────────────────────────────────────────
function generateCrashPoint() {
  return CrashModule.generateCrashPoint();
}

// ── Агрессивная экспонента: медленно до 2х, резко после ─────────────────────
// t_seconds → multiplier
function multFromTime(t) {
  // До 2.00× — мягкая экспонента (k=0.06)
  // После 2.00× — резкая (k=0.25), с непрерывностью
  const SLOW_K = 0.06;
  const FAST_K = 0.8;
  const T_BREAK = Math.log(2) / SLOW_K; // время, когда медленная ветка = 2.00

  if (t <= T_BREAK) {
    return Math.exp(SLOW_K * t);
  } else {
    // Непрерывная стыковка: mult(T_BREAK) = 2.00
    return 2.00 * Math.exp(FAST_K * (t - T_BREAK));
  }
}

function startGame(bet) {
  betAmount = bet;
  window.updateBalance(window.currentBalance - bet);
  isFlying = true;
  isCashedOut = false;
  currentMultiplier = 1.00;
  multiplierEl.style.color = '';
  statusEl.textContent = 'В ПОЛЕТЕ...';

  // Пункт 4: ставим флаг активной игры
  window.isGameActive = true;

  crashPoint = generateCrashPoint();

  lastTime = performance.now();
  virtualTime = 0;
  isTurbo = false;
  playBtn.textContent = 'ЗАБРАТЬ (×1.00)';

  if (crashPoint <= 1.00) {
    currentMultiplier = 1.00;
    crashGame();
    return;
  }

  animationId = requestAnimationFrame(animate);
}

function animate(currentTime) {
  const delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  // Ускоряем время в 7 раз, если включен турбо-режим (игрок вывел деньги)
  virtualTime += isTurbo ? delta * 7 : delta;
  const t_seconds = virtualTime;
  currentMultiplier = multFromTime(t_seconds);

  // Пункт 3: АВТОВЫВОД проверяем СТРОГО ДО проверки краша!
  // Если autoCashout === crashPoint (напр. оба 1.50×), игрок забирает выигрыш, а не проигрывает.
  const autoCashout = parseFloat(autoCashoutInput.value);
  if (!isNaN(autoCashout) && autoCashout > 1.00 && currentMultiplier >= autoCashout && !isCashedOut) {
    cashOut();
    // После cashOut продолжаем анимацию, чтобы краш всё равно отобразился
  }

  // Проверка краша — всегда ПОСЛЕ автовывода
  if (currentMultiplier >= crashPoint) {
    currentMultiplier = crashPoint;
    crashGame();
    return;
  }

  multiplierEl.textContent = currentMultiplier.toFixed(2) + '×';
  if (!isCashedOut) {
    playBtn.textContent = `ЗАБРАТЬ (×${currentMultiplier.toFixed(2)})`;
  }

  drawChart(currentMultiplier, false);
  animationId = requestAnimationFrame(animate);
}

function cashOut() {
  if (!isFlying || isCashedOut) return;
  isCashedOut = true;
  const win = Math.floor(betAmount * currentMultiplier);
  window.updateBalance(window.currentBalance + win);
  statusEl.textContent = `ЗАБРАЛ ×${currentMultiplier.toFixed(2)} = ${win} ₽`;
  playBtn.textContent = 'ОЖИДАНИЕ...';
  playBtn.disabled = true;
  // Пункт 4: игра завершена по выводу
  window.isGameActive = false;
  isTurbo = true;
}

function crashGame() {
  isFlying = false;
  cancelAnimationFrame(animationId);
  multiplierEl.textContent = crashPoint.toFixed(2) + '×';
  statusEl.textContent = 'КРАШ!';
  multiplierEl.style.color = '#ff0055';
  drawChart(crashPoint, true);

  playBtn.disabled = false;
  playBtn.textContent = 'СТАВКА';

  // Пункт 4: игра завершена по крашу
  window.isGameActive = false;

  addHistory(crashPoint);

  setTimeout(() => {
    multiplierEl.style.color = '';
    statusEl.textContent = 'Ожидание...';
    drawIdle();
  }, 3000);
}

// ── История (flex-shrink: 0 через inline стили) ───────────────────────────
function addHistory(val) {
  const div = document.createElement('div');
  div.textContent = val.toFixed(2) + '×';
  div.style.cssText = `
    padding: 4px 10px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 0.85rem;
    font-family: var(--font-display, monospace);
    border: 1px solid;
    white-space: nowrap;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  `;
  if (val >= 2) {
    div.style.color = '#00c853';
    div.style.borderColor = 'rgba(0, 200, 83, 0.3)';
    div.style.background = '#1a1d2e';
  } else if (val >= 1.5) {
    div.style.color = '#ffaa00';
    div.style.borderColor = 'rgba(255,170,0,0.3)';
    div.style.background = '#1a1d2e';
  } else {
    div.style.color = '#ff0055';
    div.style.borderColor = 'rgba(255, 0, 85, 0.3)';
    div.style.background = '#1a1d2e';
  }

  historyEl.prepend(div);
  if (historyEl.children.length > 15) {
    historyEl.lastChild.remove();
  }
}

// ── Canvas рендер ─────────────────────────────────────────────────────────
function drawIdle() {
  if (canvas.width === 0 || canvas.height === 0) return;
  ctx.fillStyle = '#0d0f18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
}

function drawGrid() {
  ctx.strokeStyle = '#1a1d2e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < canvas.width; x += 50) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  for (let y = 0; y < canvas.height; y += 50) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();
}

// Агрессивная кривая: до 2.00 — плавно, после — резко вверх
function drawChart(mult, isCrashed) {
  if (canvas.width === 0 || canvas.height === 0) return;
  ctx.fillStyle = '#0d0f18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  const maxH = canvas.height - 20;
  const maxW = canvas.width - 20;
  const PAD = 10;

  // Нормируем прогресс по логарифму: log(mult)/log(50) ≈ [0..1]
  // Используем агрессивное масштабирование для x-оси
  const LOG_MAX = Math.log(50);
  const progress = Math.min(1, Math.log(Math.max(1, mult)) / LOG_MAX);

  // X-ось — равномерный прогресс
  const endX = PAD + maxW * progress;

  // Y-ось: до 2.0 — медленно (нижняя треть), после — резко
  let yNorm;
  if (mult <= 2.0) {
    yNorm = ((mult - 1) / 1.0) * 0.3; // 0..0.3 для 1x..2x
  } else {
    yNorm = 0.3 + Math.pow((mult - 2.0) / 48.0, 0.4) * 0.7; // 0.3..1 для 2x..50x
  }
  yNorm = Math.min(1, yNorm);
  const endY = canvas.height - PAD - maxH * yNorm;

  // Кривая Безье — контрольная точка для плавного изгиба
  const cpX = PAD + maxW * progress * 0.6;
  const cpY = canvas.height - PAD;

  ctx.beginPath();
  ctx.moveTo(PAD, canvas.height - PAD);
  ctx.quadraticCurveTo(cpX, cpY, endX, endY);

  ctx.lineWidth = 3;
  if (isCrashed) {
    ctx.strokeStyle = '#ff0055';
  } else {
    const grad = ctx.createLinearGradient(PAD, canvas.height - PAD, endX, endY);
    grad.addColorStop(0, '#00e5ff');
    grad.addColorStop(1, '#00c853');
    ctx.strokeStyle = grad;
  }
  ctx.stroke();

  // Заливка под кривой
  ctx.lineTo(endX, canvas.height - PAD);
  ctx.lineTo(PAD, canvas.height - PAD);
  ctx.closePath();
  ctx.fillStyle = isCrashed
    ? 'rgba(255,0,85,0.06)'
    : 'rgba(0,229,255,0.05)';
  ctx.fill();

  // Ракета / взрыв на кончике
  ctx.font = '20px sans-serif';
  if (isCrashed) {
    ctx.fillText('💥', endX - 10, endY + 10);
  } else {
    ctx.fillText('🚀', endX - 10, endY + 10);
  }
}
