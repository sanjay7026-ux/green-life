function getStreak() {
  return parseInt(localStorage.getItem('greenlife_streak') || '0');
}

function setStreak(value) {
  localStorage.setItem('greenlife_streak', String(Math.max(0, value || 0)));
}

function getLastActiveDayKey() {
  return localStorage.getItem('greenlife_last_active_day') || '';
}

function setLastActiveDayKey(key) {
  localStorage.setItem('greenlife_last_active_day', key);
}

function daysBetween(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / ms);
}

function updateDailyStreak() {
  if (typeof getTodayKey !== 'function') return getStreak();

  const today = getTodayKey();
  const last = getLastActiveDayKey();

  if (!last) {
    setLastActiveDayKey(today);
    setStreak(1);
    return getStreak();
  }

  if (last === today) return getStreak();

  const diff = daysBetween(last, today);
  if (diff === 1) {
    setStreak(getStreak() + 1);
  } else {
    setStreak(1);
  }

  setLastActiveDayKey(today);
  return getStreak();
}

