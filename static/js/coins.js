function getCoins() {
  return parseInt(localStorage.getItem('greenlife_coins') || '0');
}

// ── Add coins and show popup ──
function addCoins(amount, reason, sdgMessage) {
  const current = getCoins();
  const newTotal = current + amount;
  localStorage.setItem('greenlife_coins', newTotal.toString());

  // Save to today's coin log
  const today = getTodayKey();
  const todayCoins = parseInt(localStorage.getItem('coins_today_' + today) || '0');
  localStorage.setItem('coins_today_' + today, (todayCoins + amount).toString());

  // Show the coin popup animation
  showCoinPopup(amount, sdgMessage || '');

  // Update balance display if on dashboard
  const balanceEl = document.getElementById('coinBalance');
  if (balanceEl) balanceEl.textContent = newTotal;

  const coinsTodayEl = document.getElementById('coinsToday');
  if (coinsTodayEl) coinsTodayEl.textContent = todayCoins + amount;

  return newTotal;
}

// ── Check if action already done today ──
// This prevents cheating — each action only rewarded once per day
function isActionDoneToday(actionName) {
  const today = getTodayKey();
  return localStorage.getItem('action_' + actionName + '_' + today) === 'done';
}

// ── Mark action as done today ──
function markActionDone(actionName) {
  const today = getTodayKey();
  localStorage.setItem('action_' + actionName + '_' + today, 'done');
}

// ── Get today's date as a string key (e.g. "2024-01-15") ──
function getTodayKey() {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
}

// ── Show coin popup animation ──
function showCoinPopup(amount, sdgMessage) {
  const popup = document.getElementById('coinPopup');
  const amountEl = document.getElementById('coinPopupAmount');
  const sdgEl = document.getElementById('coinPopupSDG');

  if (!popup) return;

  amountEl.textContent = '+' + amount;
  if (sdgEl) sdgEl.textContent = sdgMessage || '';

  // Show popup
  popup.classList.add('show');

  // Hide after 2.5 seconds
  setTimeout(() => {
    popup.classList.remove('show');
  }, 2500);
}

// ── Show toast notification ──
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Get coins earned today ──
function getCoinsToday() {
  const today = getTodayKey();
  return parseInt(localStorage.getItem('coins_today_' + today) || '0');
}

// ── Get next reward info ──
function getNextRewardInfo() {
  const coins = getCoins();
  if (coins < 500) {
    return `${500 - coins} more coins for ₹5 airtime`;
  } else if (coins < 1000) {
    return `${1000 - coins} more coins for ₹10 voucher`;
  } else {
    return `${2000 - coins} more coins for ₹20 cash`;
  }
}