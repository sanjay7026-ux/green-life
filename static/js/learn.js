window.onload = async function () {
  const name = localStorage.getItem('greenlife_user');
  if (!name) {
    window.location.href = '/';
    return;
  }

  if (typeof updateDailyStreak === 'function') updateDailyStreak();
  refreshCoins();

  await Promise.all([loadCards(), loadQuiz()]);
};

function refreshCoins() {
  const el = document.getElementById('coinBalance');
  if (el && typeof getCoins === 'function') el.textContent = getCoins();
}

async function loadCards() {
  const el = document.getElementById('cards');
  if (!el) return;

  el.innerHTML = `
    <div class="card strong pad">
      <div class="card-title">Loading…</div>
      <div class="card-subtitle">Getting today’s lessons.</div>
    </div>
  `;

  try {
    const res = await fetch('/api/get-learn-cards');
    const cards = await res.json();
    renderCards(Array.isArray(cards) ? cards : []);
  } catch (e) {
    renderCards([]);
  }
}

function renderCards(cards) {
  const el = document.getElementById('cards');
  if (!el) return;

  if (!cards.length) {
    el.innerHTML = `
      <div class="card strong pad">
        <div class="card-title">No cards found</div>
        <div class="card-subtitle">Add ` + '`data/learn_cards.json`' + ` to enable today’s lessons.</div>
      </div>
    `;
    return;
  }

  el.innerHTML = cards.map((c, idx) => `
    <div class="card strong pad">
      <div class="pill" style="background: rgba(11,18,32,0.06); border-color: rgba(11,18,32,0.10); color: rgba(11,18,32,0.82); width: fit-content;">
        Card <strong>${idx + 1}</strong>
      </div>
      <div style="height:10px;"></div>
      <div class="card-title">${escapeHtml(c.title || 'Lesson')}</div>
      <div class="card-subtitle">${escapeHtml(c.subtitle || '')}</div>
      <div style="height:10px;"></div>
      <div style="color: rgba(11,18,32,0.78); font-weight: 700; line-height: 1.55;">
        ${escapeHtml(c.content || c.text || '')}
      </div>
    </div>
  `).join('');
}

async function loadQuiz() {
  const el = document.getElementById('quiz');
  if (!el) return;

  el.innerHTML = `<div class="help">Loading quiz…</div>`;
  try {
    const res = await fetch('/api/get-quiz');
    const quiz = await res.json();
    renderQuiz(Array.isArray(quiz) ? quiz : []);
  } catch (e) {
    renderQuiz([]);
  }
}

function renderQuiz(questions) {
  const el = document.getElementById('quiz');
  if (!el) return;

  if (!questions.length) {
    el.innerHTML = `<div class="help">No quiz found. Add ` + '`data/quiz_questions.json`' + ` to enable.</div>`;
    return;
  }

  el.innerHTML = questions.map((q, idx) => {
    const opts = q.options || q.choices || [];
    return `
      <div class="card pad" style="background: rgba(11,18,32,0.04); border-color: rgba(11,18,32,0.08);">
        <div style="font-weight:1000; color:#1B4332; margin-bottom:8px;">
          ${idx + 1}. ${escapeHtml(q.question || q.prompt || 'Question')}
        </div>
        <div style="display:grid; gap: 8px;">
          ${opts.map((o, oi) => `
            <label style="display:flex; gap:10px; align-items:flex-start; cursor:pointer;">
              <input type="radio" name="q${idx}" value="${oi}" style="margin-top: 3px;">
              <span style="color: rgba(11,18,32,0.80); font-weight: 800;">${escapeHtml(o)}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }).join('<div style="height:10px;"></div>');

  window.__greenlifeQuiz = questions;
}

function submitQuiz() {
  const hint = document.getElementById('quizHint');
  const questions = window.__greenlifeQuiz || [];

  if (!questions.length) {
    showToast('Quiz not available yet.');
    return;
  }

  if (typeof isActionDoneToday === 'function' && isActionDoneToday('learn_done')) {
    showToast('Quiz already completed today.');
    return;
  }

  let correct = 0;
  let answered = 0;

  questions.forEach((q, idx) => {
    const selected = document.querySelector(`input[name="q${idx}"]:checked`);
    if (!selected) return;
    answered += 1;
    const val = parseInt(selected.value);
    const ans = q.answer_index ?? q.answer ?? q.correct_index;
    if (val === ans) correct += 1;
  });

  if (answered < questions.length) {
    showToast('Answer all questions first.');
    if (hint) hint.textContent = 'Tip: answer every question to claim coins.';
    return;
  }

  if (correct === questions.length) {
    markActionDone('learn_done');
    addCoins(30, 'Learn & Earn', 'SDG 5 — Quality learning for all');
    showToast('Perfect! +30 coins 🪙');
    refreshCoins();
    if (hint) hint.textContent = 'Claimed for today. Come back tomorrow for new cards.';
  } else {
    showToast(`You got ${correct}/${questions.length}. Try again.`);
    if (hint) hint.textContent = 'No worries—review the cards and retry.';
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

