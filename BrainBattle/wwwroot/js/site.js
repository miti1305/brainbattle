// SHARED page helpers for every Razor view (loaded by Views/Shared/_Layout.cshtml).
//   BB.api('POST', '/api/rooms', { questionCount: 10 })   -> JSON (throws Error(message) on failure)
//   BB.data('page-data')                                  -> data written by @Html.JsonData("page-data", ...)
//   BB.on('battle:state', fn) / await BB.invoke('battle:join', { matchId })   -> SignalR hub (/hub)
//   BB.toast('Saved!')  BB.esc(text)  BB.timer(el, 15, onExpire)  BB.questionCard(el, q, options)
(function () {
  'use strict';
  const BB = (window.BB = {});
  const token = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

  BB.esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  BB.data = (id) => {
    const el = document.getElementById(id);
    return el ? JSON.parse(el.textContent) : null;
  };

  // Calls a JSON action of a controller. Sends the anti-forgery token like a form does.
  BB.api = async (method, url, body) => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', RequestVerificationToken: token() },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
      const err = new Error((data && data.message) || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  };

  // ---------- toasts ----------
  BB.toast = (message, { link, type = 'dark', delay = 5000 } = {}) => {
    let box = document.querySelector('.bb-toasts');
    if (!box) {
      box = document.createElement('div');
      box.className = 'bb-toasts';
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${BB.esc(message)}${link ? ` <a class="link-light fw-bold" href="${BB.esc(link)}">Open</a>` : ''}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto"></button></div>`;
    el.querySelector('button').onclick = () => el.remove();
    box.appendChild(el);
    setTimeout(() => el.remove(), delay);
  };

  // ---------- SignalR hub ----------
  const handlers = [];
  let connection = null;
  let started = null;

  BB.on = (event, fn) => {
    handlers.push([event, fn]);
    if (connection) connection.on(event, fn);
  };
  BB.off = (event, fn) => { if (connection) connection.off(event, fn); };

  BB.invoke = async (method, data) => {
    if (!started) throw new Error('Not connected');
    await started;
    return connection.invoke(method, data ?? {});
  };

  BB.connected = () => started || Promise.reject(new Error('Not logged in'));

  function startHub() {
    if (!document.body.dataset.userId || !window.signalR) return;
    connection = new signalR.HubConnectionBuilder().withUrl('/hub').withAutomaticReconnect().build();
    handlers.forEach(([e, fn]) => connection.on(e, fn));
    started = connection.start().catch((err) => {
      console.warn('Live connection failed', err);
      throw err;
    });
    started.catch(() => {});
    connection.onreconnected(() => document.dispatchEvent(new CustomEvent('bb:reconnected')));
  }

  // ---------- shared widgets ----------
  // Countdown bar (like the old <Timer>). Returns { stop() }.
  BB.timer = (el, seconds, onExpire, startLeft) => {
    let left = startLeft ?? seconds;
    let stopped = false;
    const draw = () => {
      const pct = Math.max(0, (left / seconds) * 100);
      const color = pct > 50 ? 'bg-success' : pct > 20 ? 'bg-warning' : 'bg-danger';
      el.innerHTML = `<div class="bb-timer mb-3"><div class="d-flex justify-content-between small mb-1"><span>Time left</span><strong>${Math.max(0, left)}s</strong></div>
        <div class="progress"><div class="progress-bar ${color}" style="width:${pct}%"></div></div></div>`;
    };
    draw();
    const id = setInterval(() => {
      if (stopped) return;
      left -= 1;
      draw();
      if (left <= 0) {
        clearInterval(id);
        stopped = true;
        onExpire?.();
      }
    }, 1000);
    return { stop() { stopped = true; clearInterval(id); } };
  };

  // Question with A/B/C/D buttons (like the old <QuestionCard>).
  // options: { number, total, selectedIndex, correctIndex, disabled, onAnswer(i) }
  BB.questionCard = (el, q, o = {}) => {
    if (!q) { el.innerHTML = ''; return; }
    const style = (i) => {
      if (o.correctIndex != null && i === o.correctIndex) return 'btn-success';
      if (o.correctIndex != null && i === o.selectedIndex) return 'btn-danger';
      if (i === o.selectedIndex) return 'btn-primary';
      return 'btn-outline-primary';
    };
    el.innerHTML = `<div class="card shadow-sm"><div class="card-body">
      ${o.total ? `<div class="text-muted small mb-2">Question ${o.number} of ${o.total}</div>` : ''}
      <h5 class="card-title mb-3">${BB.esc(q.text)}</h5>
      ${q.imageUrl ? `<img src="${BB.esc(q.imageUrl)}" alt="" class="img-fluid rounded mb-3">` : ''}
      <div class="d-grid gap-2">${(q.options || []).map((opt, i) =>
        `<button type="button" data-i="${i}" class="btn text-start ${style(i)}" ${o.disabled ? 'disabled' : ''}>${String.fromCharCode(65 + i)}. ${BB.esc(opt)}</button>`).join('')}</div>
    </div></div>`;
    el.querySelectorAll('button[data-i]').forEach((b) => { b.onclick = () => o.onAnswer?.(Number(b.dataset.i)); });
  };

  // Unread notification badge in the navbar (F20 Moontaha). Stays hidden until F20 is merged.
  function notificationBadge() {
    const badge = document.getElementById('bb-unread');
    if (!badge) return;
    let count = 0;
    const show = () => { badge.textContent = count; badge.classList.toggle('d-none', count <= 0); };
    const load = () => BB.api('GET', '/api/notifications/unread-count').then((r) => { count = r.count || 0; show(); }).catch(() => {});
    load();
    BB.on('notification:new', (n) => {
      count += 1;
      show();
      BB.toast(n?.title || 'New notification', { link: n?.link || '/notifications' });
    });
    window.addEventListener('notifications:changed', load);
  }

  // Forms with data-confirm="Are you sure?" ask before submitting.
  document.addEventListener('submit', (e) => {
    const msg = e.target.dataset?.confirm;
    if (msg && !window.confirm(msg)) e.preventDefault();
  });

  startHub();
  document.addEventListener('DOMContentLoaded', notificationBadge);
})();
