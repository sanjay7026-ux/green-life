window.onload = function () {
  const name = localStorage.getItem('greenlife_user');
  if (!name) {
    window.location.href = '/';
    return;
  }

  // Greeting + name
  const now = new Date();
  const h = now.getHours();
  const greeting =
    h < 12 ? 'Good morning' :
    h < 17 ? 'Good afternoon' :
    'Good evening';

  const greetEl = document.getElementById('greetingMsg');
  const nameEl = document.getElementById('userName');
  if (greetEl) greetEl.textContent = `${greeting} 👋`;
  if (nameEl) nameEl.textContent = name;

  // Streak
  if (typeof updateDailyStreak === 'function') updateDailyStreak();
  const streakEl = document.getElementById('streakCount');
  if (streakEl && typeof getStreak === 'function') streakEl.textContent = getStreak();

  // Coins + reward
  refreshCoinsUI();

  // Habits completion state
  syncHabitUI();

  // Water
  syncWaterUI();

  // Summary + progress ring
  refreshSummaryAndProgress();
};

function refreshCoinsUI() {
  const balanceEl = document.getElementById('coinBalance');
  if (balanceEl && typeof getCoins === 'function') balanceEl.textContent = getCoins();

  const nextEl = document.getElementById('nextRewardMsg');
  if (nextEl && typeof getNextRewardInfo === 'function') nextEl.textContent = getNextRewardInfo();

  const coinsTodayEl = document.getElementById('coinsToday');
  if (coinsTodayEl && typeof getCoinsToday === 'function') coinsTodayEl.textContent = getCoinsToday();
}

function syncHabitUI() {
  setHabitDone('meal_logged', 'habit-meal', 'check-meal');
  setHabitDone('mood_logged', 'habit-mood', 'check-mood');
  setHabitDone('learn_done', 'habit-learn', 'check-learn');
}

function setHabitDone(actionKey, cardId, checkId) {
  const card = document.getElementById(cardId);
  const check = document.getElementById(checkId);
  if (!card || !check || typeof isActionDoneToday !== 'function') return;

  if (isActionDoneToday(actionKey)) {
    card.classList.add('completed');
  } else {
    card.classList.remove('completed');
  }
}

function refreshSummaryAndProgress() {
  // Meals
  const mealsLoggedEl = document.getElementById('mealsLogged');
  if (mealsLoggedEl) mealsLoggedEl.textContent = isActionDoneToday('meal_logged') ? '1' : '0';

  // Water
  const today = typeof getTodayKey === 'function' ? getTodayKey() : '';
  const waterMl = parseInt(localStorage.getItem('water_' + today) || '0');
  const waterLiters = Math.round((waterMl / 1000) * 10) / 10;
  const waterTodayEl = document.getElementById('waterToday');
  if (waterTodayEl) waterTodayEl.textContent = `${waterLiters}L`;

  // SDG count
  const sdgs = {
    sdg2: isActionDoneToday('surplus_booked'),
    sdg3: isActionDoneToday('meal_logged'),
    sdg5: isActionDoneToday('learn_done'),
    sdg6: waterMl > 0,
    sdg12: isActionDoneToday('surplus_booked'),
  };

  let active = 0;
  Object.entries(sdgs).forEach(([id, on]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', !!on);
    if (on) active += 1;
  });

  const sdgCountEl = document.getElementById('sdgCount');
  if (sdgCountEl) sdgCountEl.textContent = `${active}/5`;

  // Progress ring: meal + mood + learn + water(>=250ml) = 4 items
  const itemsDone =
    (isActionDoneToday('meal_logged') ? 1 : 0) +
    (isActionDoneToday('mood_logged') ? 1 : 0) +
    (isActionDoneToday('learn_done') ? 1 : 0) +
    (waterMl >= 250 ? 1 : 0);

  const percent = Math.round((itemsDone / 4) * 100);
  const percentEl = document.getElementById('progressPercent');
  if (percentEl) percentEl.textContent = `${percent}%`;

  const ring = document.getElementById('progressRing');
  if (ring) {
    const circumference = 283;
    const offset = circumference - (percent / 100) * circumference;
    ring.style.strokeDashoffset = String(offset);
  }

  const label = document.getElementById('progressLabel');
  if (label) {
    label.textContent = percent === 100
      ? 'Amazing — you completed today’s habits!'
      : 'Complete your habits to earn coins.';
  }
}

function syncWaterUI() {
  const today = typeof getTodayKey === 'function' ? getTodayKey() : '';
  const waterMl = parseInt(localStorage.getItem('water_' + today) || '0');
  const liters = Math.round((waterMl / 1000) * 10) / 10;

  const amountEl = document.getElementById('waterAmount');
  if (amountEl) amountEl.textContent = liters.toFixed(1);

  const percent = Math.min(100, (liters / 3) * 100);
  const bar = document.getElementById('waterBar');
  if (bar) bar.style.width = percent + '%';
}

function addWater(ml) {
  if (typeof getTodayKey !== 'function') return;

  const today = getTodayKey();
  const key = 'water_' + today;
  const current = parseInt(localStorage.getItem(key) || '0');
  const next = Math.min(3000, current + ml);
  localStorage.setItem(key, String(next));

  // coins: 5 per 250ml increments, but only once per day total (based on new total)
  // store last rewarded bucket (0..12) to prevent spamming
  const bucketKey = 'water_reward_bucket_' + today;
  const prevBucket = parseInt(localStorage.getItem(bucketKey) || '0');
  const newBucket = Math.floor(next / 250);
  const deltaBuckets = Math.max(0, newBucket - prevBucket);

  if (deltaBuckets > 0 && typeof addCoins === 'function') {
    const coins = deltaBuckets * 5;
    localStorage.setItem(bucketKey, String(newBucket));
    addCoins(coins, 'Water tracked', 'SDG 6 — Clean Water & Sanitation');
    showToast(`Nice! +${coins} coins for tracking water 💧`);
  }

  syncWaterUI();
  refreshCoinsUI();
  refreshSummaryAndProgress();
}

function showMoodPicker() {
  const popup = document.getElementById('moodPopup');
  if (popup) popup.classList.add('show');
}

function closeMoodPicker() {
  const popup = document.getElementById('moodPopup');
  if (popup) popup.classList.remove('show');
}

function selectMood(emoji, label) {
  if (typeof isActionDoneToday !== 'function') return;

  if (isActionDoneToday('mood_logged')) {
    showToast('Mood already logged today.');
    closeMoodPicker();
    return;
  }

  localStorage.setItem('mood_' + getTodayKey(), JSON.stringify({ emoji, label, time: new Date().toISOString() }));
  markActionDone('mood_logged');
  if (typeof addCoins === 'function') addCoins(10, 'Mood check-in', 'SDG 3 — Good Health & Well-being');

  showToast(`Mood saved: ${emoji} ${label} (+10 coins)`);
  closeMoodPicker();
  syncHabitUI();
  refreshCoinsUI();
  refreshSummaryAndProgress();
}

function goToMeal() {
  window.location.href = '/meal';
}

