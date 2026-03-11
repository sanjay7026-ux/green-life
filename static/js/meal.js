window.onload = function () {
  const name = localStorage.getItem('greenlife_user');
  if (!name) {
    window.location.href = '/';
    return;
  }

  if (typeof updateDailyStreak === 'function') updateDailyStreak();
  refreshCoins();

  // Enter to submit (Ctrl/Cmd+Enter)
  const input = document.getElementById('mealInput');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analyzeMeal();
    });
  }
};

function refreshCoins() {
  const el = document.getElementById('coinBalance');
  if (el && typeof getCoins === 'function') el.textContent = getCoins();
}

async function analyzeMeal() {
  const input = document.getElementById('mealInput');
  const btn = document.getElementById('analyzeBtn');
  const text = (input?.value || '').trim();

  if (!text) {
    showToast('Type your meal first.');
    input?.focus();
    return;
  }

  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Analyzing…';

  try {
    const res = await fetch('/api/analyze-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meal: text })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to analyze meal');
    }

    renderMealResult(data);

    // Reward once/day
    if (typeof isActionDoneToday === 'function' && !isActionDoneToday('meal_logged')) {
      if (typeof markActionDone === 'function') markActionDone('meal_logged');
      if (typeof addCoins === 'function') addCoins(15, 'Meal logged', data.sdg_message || 'SDG 3 — Good Health');
      localStorage.setItem('greenlife_total_earned', String(getCoins()));
      showToast('Meal logged! +15 coins 🪙');
    } else {
      showToast('Meal analyzed. (Coins already claimed today)');
    }

    refreshCoins();
  } catch (e) {
    showToast('Could not analyze — showing best-effort result.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Analyze meal';
  }
}

function renderMealResult(data) {
  const card = document.getElementById('resultCard');
  if (!card) return;
  card.style.display = 'block';

  const score = Number(data.health_score ?? 0);
  const grade = String(data.grade ?? '').toUpperCase() || '—';
  const calories = data.calories ?? '—';

  const title = document.getElementById('resultTitle');
  if (title) title.textContent = 'Your score';

  const sum = document.getElementById('resultSummary');
  if (sum) sum.textContent = data.summary || '';

  const gradeEl = document.getElementById('resultGrade');
  if (gradeEl) gradeEl.textContent = grade;

  const scoreEl = document.getElementById('resultScore');
  if (scoreEl) scoreEl.textContent = String(score);

  const calEl = document.getElementById('resultCalories');
  if (calEl) calEl.textContent = String(calories);

  const tipEl = document.getElementById('resultTip');
  if (tipEl) tipEl.textContent = data.tip || '';

  const sdgEl = document.getElementById('resultSDG');
  if (sdgEl) sdgEl.textContent = data.sdg_message || '';
}

