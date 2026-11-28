// PAGE SCRIPT (F2 Abrar): ranked queue (Views/Ranked/Index.cshtml).
// Find match -> hub "ranked:join". The server pushes "ranked:searching" every 2 s while we wait,
// then "ranked:matched" { matchId } -> we go to the battle page (F1).
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let searching = false;
  let clock = null;
  let started = 0;

  function show(panel) {
    ['idle', 'searching', 'found'].forEach((p) => $(p).classList.toggle('d-none', p !== panel));
  }

  function stopClock() {
    clearInterval(clock);
    clock = null;
  }

  async function join() {
    $('find').disabled = true;
    try {
      const res = await BB.invoke('ranked:join', { categoryId: $('categoryId').value || null });
      if (!res.ok) {
        if (res.matchId) { location.href = `/battle/${res.matchId}`; return; }
        BB.toast(res.message, { type: 'danger' });
        show('idle');
        return;
      }
      searching = true;
      started = Date.now();
      $('window').textContent = `±${res.window}`;
      $('elapsed').textContent = '0s';
      stopClock();
      clock = setInterval(() => { $('elapsed').textContent = `${Math.floor((Date.now() - started) / 1000)}s`; }, 1000);
      show('searching');
    } catch (err) {
      BB.toast('Could not connect to the live server. Refresh the page.', { type: 'danger' });
    } finally {
      $('find').disabled = false;
    }
  }

  async function cancel() {
    searching = false;
    stopClock();
    show('idle');
    try { await BB.invoke('ranked:leave', {}); } catch { /* page is leaving anyway */ }
  }

  $('find').addEventListener('click', join);
  $('cancel').addEventListener('click', cancel);

  BB.on('ranked:searching', (s) => {
    if (!searching) return;
    $('window').textContent = `±${s.window}`;
    $('queue').textContent = s.inQueue > 1 ? `${s.inQueue} players in the queue.` : '';
  });

  BB.on('ranked:matched', (m) => {
    searching = false;
    stopClock();
    $('opponent').innerHTML = `You vs <strong>${BB.esc(m.opponent)}</strong> (rating ${m.opponentRating})`;
    show('found');
    setTimeout(() => { location.href = `/battle/${m.matchId}`; }, 1500);
  });

  BB.on('ranked:error', (e) => {
    searching = false;
    stopClock();
    show('idle');
    BB.toast(e.message || 'Could not start the battle', { type: 'danger' });
  });

  // The connection dropped and came back: the old ticket was removed, so queue again.
  document.addEventListener('bb:reconnected', () => { if (searching) join(); });
})();
