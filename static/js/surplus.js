window.onload = function () {
  const name = localStorage.getItem('greenlife_user');
  if (!name) {
    window.location.href = '/';
    return;
  }

  if (typeof updateDailyStreak === 'function') updateDailyStreak();
  refreshCoins();
  loadSurplus();
};

function refreshCoins() {
  const el = document.getElementById('coinBalance');
  if (el && typeof getCoins === 'function') el.textContent = getCoins();
}

async function loadSurplus() {
  const list = document.getElementById('surplusList');
  if (!list) return;

  list.innerHTML = `
    <div class="card strong pad">
      <div class="card-title">Loading…</div>
      <div class="card-subtitle">Fetching today’s surplus items.</div>
    </div>
  `;

  try {
    const res = await fetch('/api/get-surplus');
    const items = await res.json();
    renderSurplus(items || []);
  } catch (e) {
    list.innerHTML = `
      <div class="card strong pad">
        <div class="card-title">Couldn’t load items</div>
        <div class="card-subtitle">Try refreshing the page.</div>
      </div>
    `;
  }
}

function renderSurplus(items) {
  const list = document.getElementById('surplusList');
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `
      <div class="card strong pad">
        <div class="card-title">No surplus right now</div>
        <div class="card-subtitle">Check back later — new listings appear throughout the day.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = items.map((it, idx) => {
    const title = it.item || it.name || `Surplus item #${idx + 1}`;
    const place = it.restaurant || it.location || 'Nearby partner';
    const price = it.price || it.discount || 'Free/Discounted';
    const qty = it.quantity ? `Qty: ${it.quantity}` : '';
    const time = it.pickup_time || it.pickup || it.time || 'Pickup today';

    return `
      <div class="card strong pad">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap: 12px;">
          <div>
            <div class="card-title">${escapeHtml(title)}</div>
            <div class="card-subtitle">${escapeHtml(place)} • ${escapeHtml(time)}</div>
          </div>
          <div class="pill" style="background: rgba(11,18,32,0.06); border-color: rgba(11,18,32,0.10); color: rgba(11,18,32,0.82);">
            ${escapeHtml(String(price))}
          </div>
        </div>
        ${qty ? `<div class="help">${escapeHtml(qty)}</div>` : ``}
        <div style="height:12px;"></div>
        <button class="btn btn-primary btn-block" onclick="bookSurplus('${it.id ?? idx}', '${escapeAttr(title)}')">
          Book & rescue (+30 coins)
        </button>
      </div>
    `;
  }).join('');
}

function bookSurplus(id, title) {
  if (typeof isActionDoneToday === 'function' && isActionDoneToday('surplus_booked')) {
    showToast('Surplus already booked today.');
    return;
  }

  if (typeof markActionDone === 'function') markActionDone('surplus_booked');
  if (typeof addCoins === 'function') addCoins(30, 'Surplus food booked', 'SDG 12 — Responsible Consumption');

  showToast(`Booked: ${title} (+30 coins)`);
  refreshCoins();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll('`', '&#096;');
}

