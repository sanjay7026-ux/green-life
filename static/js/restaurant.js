window.onload = function () {
  const name = localStorage.getItem('greenlife_user');
  if (!name) {
    window.location.href = '/';
    return;
  }
  if (typeof updateDailyStreak === 'function') updateDailyStreak();

  const bal = document.getElementById('coinBalance');
  if (bal && typeof getCoins === 'function') bal.textContent = getCoins();
};

async function submitListing() {
  const item = document.getElementById('itemName')?.value?.trim();
  const quantity = document.getElementById('itemQty')?.value?.trim();
  const pickup = document.getElementById('itemTime')?.value?.trim();
  const hint = document.getElementById('publishHint');

  if (!item) {
    showToast('Enter an item name.');
    return;
  }

  try {
    const res = await fetch('/api/add-surplus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, quantity, pickup })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed');

    showToast('Listing published (demo).');
    if (hint) hint.textContent = data.message || 'Published!';

    document.getElementById('itemName').value = '';
    document.getElementById('itemQty').value = '';
    document.getElementById('itemTime').value = '';
  } catch (e) {
    showToast('Could not publish listing.');
    if (hint) hint.textContent = 'Try again in a moment.';
  }
}

