import {
  auth, db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  signOut,
  ref, set, get, update
} from './firebase-config.js';

window.currentBalance = 0;
window.currentUser = null;
window.userData = null;
window.lastBonusTime = 0;
// Пункт 4: глобальный флаг активной игры (выставляется crash.js / double.js)
window.isGameActive = false;

// DOM Elements
const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const loginNicknameInput = document.getElementById('login-nickname');
const loginPasswordInput = document.getElementById('login-password');

const registerDisplayNameInput = document.getElementById('register-display-name');
const registerNicknameInput = document.getElementById('register-nickname');
const registerPasswordInput = document.getElementById('register-password');

const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnShowRegister = document.getElementById('btn-show-register');
const btnShowLogin = document.getElementById('btn-show-login');

const userBalanceEl = document.getElementById('user-balance');
const userNameEl = document.getElementById('user-name');
const btnBonus = document.getElementById('btn-bonus');
const btnLeaderboard = document.getElementById('btn-leaderboard');
const btnLogout = document.getElementById('btn-logout');

const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardList = document.getElementById('leaderboard-list');
const leaderboardSearch = document.getElementById('leaderboard-search');
const leaderboardClose = document.getElementById('leaderboard-close');

const toastContainer = document.getElementById('toast-container');

// Remove stale reference to old notification el
const userProfileBtn = document.getElementById('user-profile-btn');
const userDropdown = document.getElementById('user-dropdown');

window.showNotification = function(message, type = 'info') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Trigger animation on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('visible'));
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 350);
  }, 3000);
};

window.updateBalance = async function(newBalance) {
  try {
    const floorBalance = Math.floor(newBalance);
    window.currentBalance = floorBalance;
    if (userBalanceEl) {
      userBalanceEl.textContent = floorBalance.toLocaleString('ru-RU');
    }
    
    if (window.currentUser) {
      const updates = { b: floorBalance };
      if (window.userData && floorBalance > window.userData.max) {
        updates.max = floorBalance;
        window.userData.max = floorBalance;
      }
      await update(ref(db, `users/${window.currentUser.uid}`), updates);
    }
  } catch (error) {
    console.error("Error updating balance:", error);
    window.showNotification('Ошибка обновления баланса', 'error');
  }
};

window.getBalance = function() {
  return window.currentBalance;
};

window.showGame = function(gameName) {
  const containers = document.querySelectorAll('.game-container');
  containers.forEach(c => c.classList.add('hidden'));
  
  const targetGame = document.getElementById(`game-${gameName}`);
  if (targetGame) {
    targetGame.classList.remove('hidden');
  }
  
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.dataset.game === gameName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
};

// Setup Event Listeners
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      if (this.dataset.game) {
        window.showGame(this.dataset.game);
      }
    });
  });

  // Toggle Forms
  if (btnShowRegister) {
    btnShowRegister.addEventListener('click', (e) => {
      e.preventDefault();
      if(loginForm) loginForm.classList.add('hidden');
      if(registerForm) registerForm.classList.remove('hidden');
    });
  }

  if (btnShowLogin) {
    btnShowLogin.addEventListener('click', (e) => {
      e.preventDefault();
      if(registerForm) registerForm.classList.add('hidden');
      if(loginForm) loginForm.classList.remove('hidden');
    });
  }

  // Register
  if (btnRegister) {
    btnRegister.addEventListener('click', async () => {
      const displayName = registerDisplayNameInput ? registerDisplayNameInput.value.trim() : '';
      let nickname = registerNicknameInput ? registerNicknameInput.value.trim().replace(/^@/, '') : '';
      const password = registerPasswordInput ? registerPasswordInput.value : '';

      if (!displayName) return window.showNotification('Введите имя', 'error');
      if (nickname.length < 3 || nickname.length > 16 || !/^[a-zA-Z0-9_]+$/.test(nickname)) {
        return window.showNotification('Никнейм должен быть 3-16 символов (буквы, цифры, _)', 'error');
      }
      if (password.length < 6) return window.showNotification('Пароль минимум 6 символов', 'error');

      const email = `${nickname}@vozduraket.app`;

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: displayName });
        
        await set(ref(db, `users/${user.uid}`), {
          u: nickname,
          d: displayName,
          b: 1000,
          max: 1000,
          rtpMode: 'casino'
        });
        
        window.showNotification('Успешная регистрация!', 'success');
      } catch (error) {
        console.error("Register error:", error);
        window.showNotification('Ошибка при регистрации: ' + error.message, 'error');
      }
    });
  }

  // Login
  if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
      let nickname = loginNicknameInput ? loginNicknameInput.value.trim().replace(/^@/, '') : '';
      const password = loginPasswordInput ? loginPasswordInput.value : '';

      if (!nickname || !password) return window.showNotification('Заполните все поля', 'error');

      const email = `${nickname}@vozduraket.app`;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        window.showNotification('Успешный вход!', 'success');
      } catch (error) {
        console.error("Login error:", error);
        window.showNotification('Ошибка при входе: неверный никнейм или пароль', 'error');
      }
    });
  }

  // Logout
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.currentBalance = 0;
        window.currentUser = null;
        window.userData = null;
        if (userDropdown) userDropdown.classList.add('hidden');
      } catch (error) {
        console.error("Logout error:", error);
      }
    });
  }

  // Ежедневный Бонус — с защитой от абюза (Пункт 4)
  if (btnBonus) {
    btnBonus.addEventListener('click', async () => {
      if (userDropdown) userDropdown.classList.add('hidden');

      // Проверка 1: игра идёт — запрещаем
      if (window.isGameActive) {
        window.showNotification('Дождитесь окончания игры', 'error');
        return;
      }

      if (!window.currentUser) {
        window.showNotification('Не авторизован', 'error');
        return;
      }

      try {
        // Проверка 2: кулдаун 30 секунд — читаем lastBonusTime из Firebase
        const bonusRef = ref(db, `users/${window.currentUser.uid}/lastBonusTime`);
        const snap = await get(bonusRef);
        const lastBonus = snap.exists() ? snap.val() : 0;
        const now = Date.now();
        const COOLDOWN_MS = 30000; // 30 секунд

        if (now - lastBonus < COOLDOWN_MS) {
          const remaining = Math.ceil((COOLDOWN_MS - (now - lastBonus)) / 1000);
          window.showNotification(`Подождите ещё ${remaining} сек.`, 'error');
          return;
        }

        // Проверка 3: баланс должен быть ниже 50
        if (window.currentBalance >= 50) {
          window.showNotification('Доступно только при балансе ниже 50 ₽', 'error');
          return;
        }

        // Записываем время выдачи бонуса в Firebase
        await set(bonusRef, now);
        window.lastBonusTime = now;
        await window.updateBalance(1000);
        window.showNotification('Баланс восстановлен до 1000 ₽!', 'success');
      } catch (err) {
        console.error('Bonus error:', err);
        window.showNotification('Ошибка при выдаче бонуса', 'error');
      }
    });
  }

  // User Dropdown toggle
  if (userProfileBtn && userDropdown) {
    userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!userProfileBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.add('hidden');
      }
    });
  }

  // Leaderboard
  let leaderboardData = [];
  let currentLbFilter = 'all'; // all, casino, honest, boost

  const renderLeaderboard = (data, filterText = '') => {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '';
    
    let filtered = data;
    
    // 1. Filter by mode
    if (currentLbFilter !== 'all') {
      filtered = filtered.filter(item => (item.rtpMode || 'casino') === currentLbFilter);
    }
    
    // 2. Filter by search text
    if (filterText) {
      filtered = filtered.filter(item => item.u && item.u.toLowerCase().includes(filterText.toLowerCase()));
    }
      
    filtered.forEach((item, index) => {
      const mode = item.rtpMode || 'casino';
      let icon = '';
      if (currentLbFilter === 'all') {
        if (mode === 'casino') icon = ' 😈';
        else if (mode === 'honest') icon = ' ⚖️';
        else if (mode === 'boost') icon = ' 🚀';
      }

      const row = document.createElement('div');
      row.className = 'lb-row';
      row.innerHTML = `
        <span class="lb-rank${index < 3 ? ' top-' + (index+1) : ''}">#${index + 1}</span>
        <span class="lb-name">@${item.u}${icon}</span>
        <span class="lb-balance">${(item.max || 0).toLocaleString('ru-RU')} ₽</span>
      `;
      leaderboardList.appendChild(row);
    });
  };

  // Tabs for leaderboard
  const lbTabs = document.querySelectorAll('.lb-tab');
  lbTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      lbTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentLbFilter = tab.dataset.tab;
      renderLeaderboard(leaderboardData, leaderboardSearch ? leaderboardSearch.value : '');
    });
  });

  if (btnLeaderboard) {
    btnLeaderboard.addEventListener('click', async () => {
      if (userDropdown) userDropdown.classList.add('hidden');
      if (leaderboardModal) leaderboardModal.classList.remove('hidden');
      
      try {
        const snapshot = await get(ref(db, 'users'));
        const data = [];
        snapshot.forEach(child => {
          data.push(child.val());
        });
        leaderboardData = data
          .sort((a, b) => (b.max || b.b || 0) - (a.max || a.b || 0))
          .slice(0, 150); // Get more so filters work well
        renderLeaderboard(leaderboardData, leaderboardSearch ? leaderboardSearch.value : '');
      } catch (error) {
        console.error("Leaderboard fetch error:", error);
        window.showNotification('Ошибка загрузки таблицы лидеров', 'error');
      }
    });
  }

  if (leaderboardClose) {
    leaderboardClose.addEventListener('click', () => {
      if (leaderboardModal) leaderboardModal.classList.add('hidden');
    });
  }

  if (leaderboardSearch) {
    leaderboardSearch.addEventListener('input', (e) => {
      renderLeaderboard(leaderboardData, e.target.value);
    });
  }

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
  window.currentUser = user;
  
  const headerEl = document.getElementById('header');
  const bottomNav = document.getElementById('bottom-nav');

  if (user) {
    if (authModal) authModal.classList.add('hidden');
    if (headerEl) headerEl.classList.remove('hidden');
    if (bottomNav) bottomNav.classList.remove('hidden');
    try {
      const snapshot = await get(ref(db, `users/${user.uid}`));
      if (snapshot.exists()) {
        window.userData = snapshot.val();
        if (!window.userData.rtpMode) window.userData.rtpMode = 'casino';
        
        const modeSelect = document.getElementById('rtp-mode-select');
        if (modeSelect) modeSelect.value = window.userData.rtpMode;

        const bSnap = await get(ref(db, `users/${user.uid}/lastBonusTime`));
        if (bSnap.exists()) window.lastBonusTime = bSnap.val();
        window.currentBalance = window.userData.b || 0;
        if (userBalanceEl) {
          userBalanceEl.textContent = window.currentBalance.toLocaleString('ru-RU');
        }
        if (userNameEl) {
          userNameEl.textContent = user.displayName || window.userData.d || window.userData.u;
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
    
    // Show default game
    window.showGame('crash');
  } else {
    if (authModal) authModal.classList.remove('hidden');
    if (headerEl) headerEl.classList.add('hidden');
    if (bottomNav) bottomNav.classList.add('hidden');
    const containers = document.querySelectorAll('.game-container');
    containers.forEach(c => c.classList.add('hidden'));
  }
});

// RTP Mode Switcher Logic
const modeSelect = document.getElementById('rtp-mode-select');
const confirmModal = document.getElementById('confirm-modal');
const btnYes = document.getElementById('confirm-btn-yes');
const btnNo = document.getElementById('confirm-btn-no');
let pendingMode = null;
let previousMode = null;

if (modeSelect) {
  modeSelect.addEventListener('change', (e) => {
    if (window.isGameActive) {
      window.showNotification('Нельзя менять режим во время активной игры', 'error');
      modeSelect.value = window.userData ? (window.userData.rtpMode || 'casino') : 'casino';
      return;
    }
    pendingMode = e.target.value;
    previousMode = window.userData ? (window.userData.rtpMode || 'casino') : 'casino';
    if (pendingMode !== previousMode) {
      if (userDropdown) userDropdown.classList.add('hidden');
      if (confirmModal) confirmModal.classList.remove('hidden');
    }
  });
}

if (btnYes) {
  btnYes.addEventListener('click', async () => {
    if (!window.currentUser || !pendingMode) return;
    try {
      await update(ref(db, `users/${window.currentUser.uid}`), {
        rtpMode: pendingMode,
        b: 1000,
        max: 1000
      });
      window.userData.rtpMode = pendingMode;
      window.userData.max = 1000;
      await window.updateBalance(1000);
      window.showNotification('Режим успешно изменен!', 'success');
    } catch (error) {
      console.error("Error updating mode:", error);
      window.showNotification('Ошибка при смене режима', 'error');
      modeSelect.value = previousMode;
    } finally {
      if (confirmModal) confirmModal.classList.add('hidden');
      pendingMode = null;
    }
  });
}

if (btnNo) {
  btnNo.addEventListener('click', () => {
    if (modeSelect && previousMode) modeSelect.value = previousMode;
    if (confirmModal) confirmModal.classList.add('hidden');
    pendingMode = null;
  });
}


setInterval(() => {
  const btn = document.getElementById('btn-bonus');
  if (!btn || !window.currentUser) return;
  
  const now = Date.now();
  const diff = now - (window.lastBonusTime || 0);
  
  if (diff < 30000) {
    const sec = Math.ceil((30000 - diff) / 1000);
    btn.innerHTML = `<i class="fa-solid fa-clock"></i> Бонус через ${sec}с`;
    btn.style.color = 'var(--text-muted)';
    btn.style.pointerEvents = 'none';
  } else {
    btn.innerHTML = `<i class="fa-solid fa-gift"></i> Получить 1000₽ (Бонус)`;
    btn.style.color = 'var(--gold)';
    btn.style.pointerEvents = 'auto';
  }
}, 1000);
