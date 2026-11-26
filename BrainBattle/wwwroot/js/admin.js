// F16 (Moontaha): "matches per day" chart on the admin dashboard (Views/Admin/Dashboard.cshtml).
(function () {
  'use strict';
  const days = BB.data('page-data');
  if (!days || !window.Chart) return;
  new Chart(document.getElementById('chart-matches'), {
    type: 'line',
    data: {
      labels: days.map((d) => d.date.slice(5)),
      datasets: [{ label: 'Matches', data: days.map((d) => d.matches), borderColor: '#0d6efd', tension: 0.2 }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
  });
})();
