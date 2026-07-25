import { UpgradeModule } from './gameLogic.js';
const canvas = document.getElementById('upgrade-canvas');
const ctx = canvas.getContext('2d');
const chanceEl = document.getElementById('upgrade-chance');
const resultEl = document.getElementById('upgrade-result');
const betInput = document.getElementById('upgrade-bet-input');
const targetInput = document.getElementById('upgrade-target-input');
const btnGo = document.getElementById('upgrade-btn-go');
const upgBtnHalf   = document.getElementById('upgrade-btn-half');
const upgBtnDouble = document.getElementById('upgrade-btn-double');
const upgBtnMax    = document.getElementById('upgrade-btn-max');

let isSpinning = false;
let chance = 0;
let currentRotation = 0;

function resizeCanvas() {
  const size = window.innerWidth <= 768 ? 280 : 360;
  canvas.width = size;
  canvas.height = size;
  drawCircle(currentRotation);
}
window.addEventListener('resize', resizeCanvas);

// ── Формула: 115% RTP ────────────────────
function calcChance(bet, target) {
  if (target > bet && bet > 0) {
    return UpgradeModule.calculateChance(bet, target);
  }
  return 0;
}

function updateChance() {
  const bet = parseFloat(betInput.value) || 0;
  const target = parseFloat(targetInput.value) || 0;
  chance = calcChance(bet, target);
  chanceEl.textContent = chance.toFixed(2) + '%';
  drawCircle(currentRotation);
}

// Убираем жёсткую валидацию из oninput — только пересчёт шанса
betInput.addEventListener('input', updateChance);
targetInput.addEventListener('input', updateChance);

// ── Валидация только при потере фокуса ──────────────────────────────────────
window.validateUpgradeTarget = function() {
  const bet = parseFloat(betInput.value) || 0;
  const target = parseFloat(targetInput.value) || 0;
  const minTarget = bet * 1.05;
  if (target > 0 && target < minTarget) {
    window.showNotification(`Цель должна быть минимум ${Math.ceil(minTarget)} ₽ (Ставка + 5%)`, 'error');
    targetInput.value = Math.ceil(minTarget);
    updateChance();
  }
};

// ── Пресеты шансов ────────────────────────────────────────────────────────────
// При нажатии вычисляем Цель
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const pct = parseInt(btn.dataset.pct);
    const bet = parseFloat(betInput.value) || 0;
    if (bet <= 0) {
      window.showNotification('Сначала введите ставку', 'error');
      return;
    }
    const target = Math.ceil(bet * 115 / pct);
    targetInput.value = target;
    updateChance();
  });
});

resizeCanvas();
updateChance();

// ── Кнопки быстрых ставок (Апгрейд) ─────────────────────────────────
upgBtnHalf.addEventListener('click', () => {
  let val = parseFloat(betInput.value) || 0;
  betInput.value = Math.max(1, Math.floor(val / 2));
  updateChance();
});

upgBtnDouble.addEventListener('click', () => {
  let val = parseFloat(betInput.value) || 0;
  betInput.value = Math.min(window.currentBalance || 0, Math.floor(val * 2));
  updateChance();
});

upgBtnMax.addEventListener('click', () => {
  betInput.value = Math.floor(window.currentBalance || 0);
  updateChance();
});

// ── Кнопка апгрейд ────────────────────────────────────────────────────────────
btnGo.addEventListener('click', () => {
  if (!window.currentUser) {
    window.showNotification('Пожалуйста, авторизуйтесь', 'error');
    return;
  }
  if (isSpinning) return;

  const bet = Math.floor(parseFloat(betInput.value));
  const target = Math.floor(parseFloat(targetInput.value));

  if (isNaN(bet) || bet <= 0 || bet > (window.currentBalance || 0)) {
    window.showNotification('Неверная ставка', 'error');
    return;
  }
  if (isNaN(target) || target <= bet) {
    window.showNotification('Неверная цель — должна быть больше ставки', 'error');
    return;
  }

  const minTarget = bet * 1.05;
  if (target < minTarget) {
    window.showNotification(`Цель должна быть минимум ${Math.ceil(minTarget)} ₽`, 'error');
    return;
  }

  window.updateBalance(window.currentBalance - bet);
  startSpin(bet, target);
});

// ── Отрисовка: полукруг SUCCESS начинается снизу (6 часов) и расходится симметрично ─
function drawCircle(arrowAngle) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = cx - 20;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const successAngle = (chance / 100) * Math.PI * 2;

  // Начало снизу (6 часов = Math.PI/2), расходится влево и вправо
  const startAngle = Math.PI / 2 - successAngle / 2;
  const endAngle   = Math.PI / 2 + successAngle / 2;

  // Сектор провала (остаток)
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, radius, endAngle, startAngle + Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#2a2d45';
  ctx.fill();

  // Сектор успеха
  if (successAngle > 0) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    // Градиент от синего к зелёному
    const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    grad.addColorStop(0, '#00e5ff');
    grad.addColorStop(1, '#00c853');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Тёмный центр (пончик)
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = '#0d0f18';
  ctx.fill();

  // Граница пончика
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.68, 0, Math.PI * 2);
  ctx.strokeStyle = '#2a2d45';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Стрелка — вращается от Math.PI/2 (т.е. от 6 часов)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 2 + arrowAngle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(radius * 0.88, 0);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(radius * 0.88, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  // Центральная точка
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
}

function startSpin(bet, target) {
  isSpinning = true;
  btnGo.disabled = true;
  resultEl.textContent = '';
  resultEl.classList.add('hidden');

  const simulation = UpgradeModule.simulateUpgrade(bet, target);
  const isWin = simulation.success;

  // Сектор успеха занимает successAngle радиан, симметрично от Math.PI/2
  const successAngle = (chance / 100) * Math.PI * 2;
  // Углы в системе стрелки: [−successAngle/2 .. +successAngle/2] = win, остальное = lose
  let finalAngle;
  if (isWin) {
    finalAngle = (Math.random() - 0.5) * successAngle; // в зоне успеха
  } else {
    // В зоне провала: от successAngle/2 до (2π - successAngle/2)
    const failSize = Math.PI * 2 - successAngle;
    finalAngle = successAngle / 2 + Math.random() * failSize;
  }

  // 5 полных оборотов + финальный угол
  const rotations = 5 * Math.PI * 2;
  const totalSpin = rotations + finalAngle;

  const startTime = performance.now();
  const duration = 3000;

  function animate(time) {
    let elapsed = time - startTime;
    if (elapsed > duration) elapsed = duration;

    const t = elapsed / duration;
    const easeOut = 1 - Math.pow(1 - t, 3);

    currentRotation = totalSpin * easeOut;
    drawCircle(currentRotation % (Math.PI * 2));

    if (elapsed < duration) {
      requestAnimationFrame(animate);
    } else {
      finishSpin(isWin, target);
    }
  }
  requestAnimationFrame(animate);
}

function finishSpin(isWin, target) {
  isSpinning = false;
  btnGo.disabled = false;
  resultEl.classList.remove('hidden');
  if (isWin) {
    window.updateBalance(window.currentBalance + target);
    resultEl.innerHTML = `<span style="color:#00c853; font-weight:bold; font-size:18px;">УСПЕХ! +${target} ₽</span>`;
  } else {
    resultEl.innerHTML = `<span style="color:#ff0055; font-weight:bold; font-size:18px;">ПРОВАЛ</span>`;
  }
}
