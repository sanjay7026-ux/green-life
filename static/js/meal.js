window.onload = function () {
  const name = localStorage.getItem('greenlife_user');
  if (!name) {
    window.location.href = '/';
    return;
  }

  if (typeof updateDailyStreak === 'function') updateDailyStreak();
  refreshCoins();

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
  const btn   = document.getElementById('analyzeBtn');
  const text  = (input?.value || '').trim();

  if (!text) {
    showToast('Type your meal first.');
    input?.focus();
    return;
  }

  if (!btn) return;
  btn.disabled    = true;
  btn.textContent = 'Analysing…';

  try {
    const res = await fetch('/api/analyze-meal', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ meal: text }),
    });

    const data = await res.json();

    // FIX 5: Treat HTTP errors the same as a failed parse — still try to
    // render whatever we got back (the fallback object is valid), but also
    // show a warning toast.
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Server error — showing estimates.');
    }

    renderMealResult(data);
    handleCoinsAfterAnalysis(data);

  } catch (e) {
    // FIX 6: On any network/server error still show a graceful result card
    // built from the fallback shape so the UI doesn't stay blank.
    showToast(e.message || 'Could not reach server — showing estimates.');

    // Attempt to re-fetch the fallback (the backend always returns 200 for
    // fallbacks), or synthesise a client-side one if the network is down.
    try {
      const fb = await fetch('/api/analyze-meal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ meal: text }),
      });
      const fbData = await fb.json();
      if (fbData && !fbData.error) {
        renderMealResult(fbData);
        handleCoinsAfterAnalysis(fbData);
      }
    } catch (_) {
      // Fully offline — render a hardcoded fallback card
      renderMealResult({
        calories:     450,
        health_score: 6,
        grade:        'C',
        summary:      `Could not analyse "${text}" — showing estimates.`,
        tip:          'Try again when your internet connection is stable.',
        sdg_message:  'By logging your meal you contributed to SDG 3 - Good Health',
        is_fallback:  true,
      });
    }
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Analyse meal';
  }
}

function handleCoinsAfterAnalysis(data) {
  if (typeof isActionDoneToday === 'function' && !isActionDoneToday('meal_logged')) {
    if (typeof markActionDone === 'function') markActionDone('meal_logged');
    const coins = data.coins_earned ?? 15;
    if (typeof addCoins === 'function') {
      addCoins(coins, 'Meal logged', data.sdg_message || 'SDG 3 — Good Health');
    }
    // Keep total_earned in sync so the wallet page shows the right figure
    if (typeof getCoins === 'function') {
      localStorage.setItem('greenlife_total_earned', String(getCoins()));
    }
    showToast(`Meal logged! +${coins} coins 🪙`);
  } else {
    showToast('Meal analysed. (Coins already claimed today.)');
  }
  refreshCoins();
}

function renderMealResult(data) {
  const card = document.getElementById('resultCard');
  if (!card) return;
  card.style.display = 'block';

  const score    = Number(data.health_score ?? 0);
  const grade    = String(data.grade ?? '').toUpperCase() || '—';
  const calories = data.calories ?? '—';

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set('resultTitle',    'Your score');
  set('resultSummary',  data.summary   || '');
  set('resultGrade',    grade);
  set('resultScore',    String(score));
  set('resultCalories', String(calories));
  set('resultTip',      data.tip       || '');
  set('resultSDG',      data.sdg_message || '');

  // Show a subtle banner when displaying fallback/estimated values
  const banner = document.getElementById('fallbackBanner');
  if (banner) banner.style.display = data.is_fallback ? 'block' : 'none';

  // Scroll result into view smoothly
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
