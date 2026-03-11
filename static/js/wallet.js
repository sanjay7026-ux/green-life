// ============================================================
// wallet.js — EcoCoin Wallet Logic  (FIXED)
// ============================================================

window.onload = function () {
  const name = localStorage.getItem('greenlife_user');
  if (!name) {
    window.location.href = '/';
    return;
  }

  loadWalletData();
  loadTransactionHistory();
  updateRedeemButtons();
};

function loadWalletData() {
  const coins  = getCoins();
  const streak = typeof getStreak === 'function' ? getStreak() : 0;
  const today  = typeof getCoinsToday === 'function' ? getCoinsToday() : 0;

  document.getElementById('walletBalance').textContent = coins;
  document.getElementById('streakStat').textContent    = streak;
  document.getElementById('todayStat').textContent     = today;

  // FIX 7: total_earned must be at least the current balance (it can never
  // be less than what you currently have).
  const stored      = parseInt(localStorage.getItem('greenlife_total_earned') || '0');
  const totalEarned = Math.max(stored, coins);
  localStorage.setItem('greenlife_total_earned', String(totalEarned));
  document.getElementById('totalEarned').textContent = totalEarned;

  updateProgressBar(coins);
}

function updateProgressBar(coins) {
  let percent = 0;
  let label   = '';

  if (coins < 500) {
    percent = (coins / 500) * 100;
    label   = `${coins} / 500 coins — ₹5 Airtime`;
    document.getElementById('nextRewardText').textContent =
      `${500 - coins} more coins for ₹5 airtime!`;
  } else if (coins < 1000) {
    percent = (coins / 1000) * 100;
    label   = `${coins} / 1000 coins — ₹10 Voucher`;
    document.getElementById('nextRewardText').textContent =
      `${1000 - coins} more coins for ₹10 voucher!`;
  } else if (coins < 2000) {
    percent = (coins / 2000) * 100;
    label   = `${coins} / 2000 coins — ₹20 Cash`;
    document.getElementById('nextRewardText').textContent =
      `${2000 - coins} more coins for ₹20 cash!`;
  } else {
    percent = 100;
    label   = 'All rewards unlocked! 🎉';
    document.getElementById('nextRewardText').textContent =
      'You can redeem all rewards!';
  }

  document.getElementById('progressLabel').textContent          = label;
  document.getElementById('walletProgressFill').style.width     = percent + '%';
}

function updateRedeemButtons() {
  const coins   = getCoins();
  const rewards = [
    { id: 'airtime', cost: 500  },
    { id: 'voucher', cost: 1000 },
    { id: 'cash',    cost: 2000 },
  ];

  rewards.forEach(r => {
    const btn = document.getElementById('btn-' + r.id);
    if (!btn) return;

    if (coins >= r.cost) {
      btn.classList.remove('locked');
      btn.classList.add('active');
      btn.textContent = 'Redeem Now ✨';
      btn.disabled    = false;
    } else {
      btn.classList.remove('active');
      btn.classList.add('locked');
      btn.textContent = `Need ${r.cost - coins} more coins`;
      btn.disabled    = true;
    }
  });
}

function redeemReward(type, cost, name) {
  const coins = getCoins();

  if (coins < cost) {
    showToast(`Need ${cost - coins} more coins for this reward!`);
    return;
  }

  // FIX 8: Actually deduct the coins from localStorage
  const newBalance = coins - cost;
  localStorage.setItem('greenlife_coins', String(newBalance));

  // Show confirmation modal
  const emojis = { airtime: '📱', voucher: '🎁', cash: '💵' };
  document.getElementById('modalEmoji').textContent = emojis[type] || '🎉';
  document.getElementById('modalTitle').textContent = name + ' Requested!';
  document.getElementById('modalDesc').textContent  =
    'Your request has been submitted. Your new balance has been updated.';

  const code = 'GL' + type.toUpperCase().slice(0, 3) + Date.now().toString().slice(-6);

  document.getElementById('modalDetails').innerHTML = `
    <div style="margin-bottom:8px;"><strong>Reward:</strong> ${name}</div>
    <div style="margin-bottom:8px;"><strong>Coins Used:</strong> ${cost} 🪙</div>
    <div style="margin-bottom:8px;"><strong>New Balance:</strong> ${newBalance} 🪙</div>
    <div style="margin-bottom:8px;">
      <strong>Redemption Code:</strong><br/>
      <span style="font-size:18px;font-weight:700;color:#1B4332;letter-spacing:2px;">${code}</span>
    </div>
    <div><strong>Status:</strong> <span style="color:#52B788;">✅ Processing</span></div>
  `;

  saveTransaction(name, cost, code);
  document.getElementById('redeemModal').classList.add('show');

  // Refresh UI with updated balance
  loadWalletData();
  loadTransactionHistory();
  updateRedeemButtons();
}

function closeRedeemModal() {
  document.getElementById('redeemModal').classList.remove('show');
}

function saveTransaction(name, cost, code) {
  const key          = 'greenlife_transactions';
  const transactions = JSON.parse(localStorage.getItem(key) || '[]');

  transactions.unshift({
    name: name,
    cost: cost,
    code: code,
    icon: '🎁',
    time: new Date().toLocaleString(),
    type: 'redeem',
  });

  if (transactions.length > 20) transactions.pop();
  localStorage.setItem(key, JSON.stringify(transactions));
}

function loadTransactionHistory() {
  const key          = 'greenlife_transactions';
  const transactions = JSON.parse(localStorage.getItem(key) || '[]');
  const demoTx       = buildDemoTransactions();
  const allTx        = [...transactions, ...demoTx];
  const container    = document.getElementById('txHistory');

  if (allTx.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i>🪙</i>
        <p>No transactions yet.<br/>Start earning by completing habits!</p>
      </div>`;
    return;
  }

  container.innerHTML = allTx.map(tx => `
    <div class="transaction-item">
      <div class="tx-left">
        <div class="tx-icon">${tx.icon || '🪙'}</div>
        <div>
          <div class="tx-name">${tx.name}</div>
          <div class="tx-time">${tx.time}</div>
        </div>
      </div>
      <div class="tx-amount" style="color:${tx.type === 'redeem' ? '#E63946' : '#2D6A4F'}">
        ${tx.type === 'redeem' ? '-' : '+'}${tx.cost} 🪙
      </div>
    </div>
  `).join('');
}

function buildDemoTransactions() {
  if (typeof isActionDoneToday !== 'function') return [];

  const txList  = [];
  const actions = [
    { key: 'meal_logged',    name: 'Meal Logged',         icon: '🍽️', coins: 15 },
    { key: 'mood_logged',    name: 'Mood Check-in',       icon: '😊', coins: 10 },
    { key: 'surplus_booked', name: 'Surplus Food Booked', icon: '🍱', coins: 30 },
    { key: 'learn_done',     name: 'Learn & Earn',        icon: '📚', coins: 30 },
  ];

  actions.forEach(action => {
    if (isActionDoneToday(action.key)) {
      txList.push({ name: action.name, cost: action.coins, icon: action.icon, time: 'Today', type: 'earn' });
    }
  });

  if (typeof getTodayKey === 'function') {
    const water = parseInt(localStorage.getItem('water_' + getTodayKey()) || '0');
    if (water > 0) {
      txList.push({
        name: 'Water Tracked',
        cost: Math.floor(water / 250) * 5,
        icon: '💧',
        time: 'Today',
        type: 'earn',
      });
    }
  }

  return txList;
}
