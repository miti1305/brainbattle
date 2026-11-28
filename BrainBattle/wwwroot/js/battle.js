// PAGE SCRIPT (F1 Abrar): live quiz battle (Views/Battle/Play.cshtml).
// The server is the boss: it sends the whole state in "battle:state" and this script just draws it.
//   waiting   -> share link, player list, Start button (casual host)
//   active    -> question + countdown; after reveal: right answer + explanation
//   finished  -> final scores and result
(function () {
  'use strict';
  const { matchId } = BB.data('page-data');
  const me = document.body.dataset.userId;
  const box = document.getElementById('battle');
  const playersBox = document.getElementById('players');

  let state = null;
  let timer = null;
  let timerFor = null;      // question index the running timer belongs to
  let selected = {};        // qIndex -> choice I clicked

  const myPlayer = () => state?.players.find((p) => p.userId === me);

  function stopTimer() {
    timer?.stop();
    timer = null;
    timerFor = null;
  }

  // ---------- drawing ----------
  function drawPlayers() {
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    playersBox.innerHTML = sorted.map((p) => {
      let badge = '';
      if (p.forfeited) badge = '<span class="badge bg-secondary">left</span>';
      else if (!p.connected) badge = '<span class="badge bg-warning text-dark">offline</span>';
      else if (state.status === 'active' && p.answered && !state.reveal) badge = '<span class="badge bg-success">answered</span>';
      if (p.result) {
        const color = { win: 'success', draw: 'info', loss: 'danger', forfeit: 'secondary' }[p.result];
        badge = `<span class="badge bg-${color}">${p.result}</span>`;
      }
      const host = state.mode === 'casual' && p.userId === state.hostId ? ' <small class="text-muted">(host)</small>' : '';
      const you = p.userId === me ? ' <small class="text-primary">(you)</small>' : '';
      return `<li class="list-group-item d-flex justify-content-between align-items-center">
        <span>${BB.esc(p.username)}${host}${you}</span>
        <span>${badge} <strong class="ms-2">${p.score}</strong></span></li>`;
    }).join('');
  }

  function drawWaiting() {
    stopTimer();
    const connected = state.players.filter((p) => p.connected).length;
    const isHost = state.hostId === me;
    let actions;
    if (state.mode === 'casual') {
      actions = isHost
        ? `<button id="start" class="btn btn-success" ${connected < 2 ? 'disabled' : ''}>Start battle (${connected} players)</button>
           ${connected < 2 ? '<div class="small text-muted mt-2">At least 2 players are needed.</div>' : ''}`
        : '<p class="text-muted mb-0">Waiting for the host to start…</p>';
    } else {
      actions = '<p class="text-muted mb-0">Waiting for every player to join. The battle starts automatically.</p>';
    }
    const share = state.mode === 'casual'
      ? `<label class="form-label small">Share this link with friends (max 4 players):</label>
         <div class="input-group mb-3"><input id="link" class="form-control" readonly value="${BB.esc(location.href)}">
         <button id="copy" class="btn btn-outline-secondary">Copy</button></div>`
      : '';
    box.innerHTML = `<div class="card shadow-sm"><div class="card-body">
      <h5>Waiting room</h5>${share}${actions}</div></div>`;

    document.getElementById('copy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(location.href).then(() => BB.toast('Link copied'));
    });
    document.getElementById('start')?.addEventListener('click', async (e) => {
      e.target.disabled = true;
      const res = await BB.invoke('battle:start', { matchId });
      if (!res.ok) { BB.toast(res.message, { type: 'danger' }); e.target.disabled = false; }
    });
  }

  function drawQuestion() {
    const q = state.question;
    const i = state.currentIndex;
    const mine = myPlayer();
    const answered = selected[i] != null || mine?.answered || mine?.forfeited;

    if (!document.getElementById('bb-q')) {
      box.innerHTML = '<div id="bb-timer"></div><div id="bb-q"></div><div id="bb-info" class="mt-3"></div>';
    }

    // Countdown: start a new one only when a new question arrives.
    if (state.reveal) stopTimer();
    else if (timerFor !== i) {
      stopTimer();
      timerFor = i;
      timer = BB.timer(document.getElementById('bb-timer'), state.questionTime, null, state.timeLeft);
    }
    if (state.reveal) document.getElementById('bb-timer').innerHTML = '';

    BB.questionCard(document.getElementById('bb-q'), q, {
      number: i + 1,
      total: state.total,
      selectedIndex: selected[i],
      correctIndex: state.reveal ? state.reveal.correctIndex : null,
      disabled: answered || !!state.reveal,
      onAnswer: (choice) => answer(i, choice),
    });

    const info = document.getElementById('bb-info');
    if (state.reveal) {
      const right = selected[i] === state.reveal.correctIndex;
      const verdict = selected[i] == null
        ? '<span class="text-muted">No answer.</span>'
        : right ? '<span class="text-success fw-bold">Correct!</span>' : '<span class="text-danger fw-bold">Wrong.</span>';
      info.innerHTML = `<div class="alert alert-light border">${verdict}
        ${state.reveal.explanation ? `<div class="small mt-1">${BB.esc(state.reveal.explanation)}</div>` : ''}
        <div class="small text-muted mt-1">${i + 1 < state.total ? 'Next question in a moment…' : 'Final results in a moment…'}</div></div>`;
    } else if (mine?.forfeited) {
      info.innerHTML = '<div class="alert alert-secondary">You left this battle.</div>';
    } else if (answered) {
      info.innerHTML = '<div class="text-muted">Answer locked in. Waiting for the others…</div>';
    } else {
      info.innerHTML = '';
    }
  }

  function drawFinished() {
    stopTimer();
    const mine = myPlayer();
    const title = { win: '🏆 You won!', draw: '🤝 Draw!', loss: 'You lost', forfeit: 'You left the battle' }[mine?.result] || 'Battle finished';
    const rows = [...state.players].sort((a, b) => b.score - a.score).map((p, n) =>
      `<tr class="${p.userId === me ? 'table-primary' : ''}"><td>${n + 1}</td><td>${BB.esc(p.username)}</td>
       <td>${p.correctCount}/${state.total}</td><td>${p.score}</td><td>${p.result || ''}</td></tr>`).join('');
    box.innerHTML = `<div class="card shadow-sm"><div class="card-body text-center">
      <h3 class="mb-3">${title}</h3>
      <table class="table text-start"><thead><tr><th>#</th><th>Player</th><th>Correct</th><th>Points</th><th>Result</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <a class="btn btn-primary" href="/battle">New battle</a>
      <a class="btn btn-outline-primary" href="/ranked">Ranked</a>
      <a class="btn btn-outline-secondary" href="/history/${matchId}">Review answers</a>
    </div></div>`;
    document.getElementById('leave').classList.add('d-none');
  }

  function render() {
    if (!state) return;
    drawPlayers();
    if (state.status === 'waiting') drawWaiting();
    else if (state.status === 'active') drawQuestion();
    else if (state.status === 'finished') drawFinished();
    else {
      stopTimer();
      box.innerHTML = '<div class="alert alert-secondary">This battle was cancelled (not enough players joined). <a href="/battle">Back</a></div>';
      document.getElementById('leave').classList.add('d-none');
    }
  }

  // ---------- actions ----------
  async function answer(qIndex, choice) {
    if (selected[qIndex] != null) return;
    selected[qIndex] = choice;
    render(); // lock the buttons right away
    const res = await BB.invoke('battle:answer', { matchId, qIndex, choice });
    if (!res.ok) {
      BB.toast(res.message, { type: 'danger' });
      if (res.message !== 'You already answered') delete selected[qIndex];
      render();
    }
  }

  async function join() {
    try {
      const res = await BB.invoke('battle:join', { matchId });
      if (!res.ok) {
        box.innerHTML = `<div class="alert alert-danger">${BB.esc(res.message)} <a href="/battle">Back</a></div>`;
        return;
      }
      state = res.state;
      render();
    } catch (err) {
      box.innerHTML = '<div class="alert alert-danger">Could not connect to the live server. Refresh the page.</div>';
    }
  }

  document.getElementById('leave').addEventListener('click', async () => {
    if (state?.status === 'active' && !window.confirm('Leave the battle? It counts as a forfeit.')) return;
    await BB.invoke('battle:leave', { matchId });
    location.href = '/battle';
  });

  BB.on('battle:state', (s) => {
    if (s.matchId !== matchId) return;
    state = s;
    render();
  });
  document.addEventListener('bb:reconnected', join); // internet came back: join again with the new connection
  join();
})();
