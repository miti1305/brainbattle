// F19 (Moontaha): solo practice screen (Views/Practice/Play.cshtml).
// Each answer goes to POST /api/practice/{id}/answer (choice -1 = time ran out);
// after the last question POST /api/practice/{id}/finish, then the result page /practice?result={id}.
(function () {
  'use strict';
  const page = BB.data('page-data');
  const $ = (id) => document.getElementById(id);
  const total = page.questions.length;
  let index = page.startIndex;
  let feedback = null; // { choice, isCorrect, correctIndex, explanation }
  let startedAt = Date.now();
  let timer = null;

  function showError(text) {
    $('practice-error').textContent = text;
    $('practice-error').classList.remove('d-none');
  }

  async function finish() {
    try {
      await BB.api('POST', `/api/practice/${page.sessionId}/finish`);
      window.location.href = `/practice?result=${page.sessionId}`;
    } catch (err) {
      showError(err.message);
    }
  }

  function render() {
    if (index >= total) { finish(); return; }
    const q = page.questions[index];
    BB.questionCard($('practice-question'), q, {
      number: index + 1,
      total,
      onAnswer: answer,
      selectedIndex: feedback ? feedback.choice : null,
      correctIndex: feedback ? feedback.correctIndex : null,
      disabled: !!feedback,
    });
    if (feedback) {
      const title = feedback.isCorrect ? 'Correct!' : feedback.choice === -1 ? 'Time is up.' : 'Not quite.';
      $('practice-feedback').innerHTML = `<div class="alert mt-3 alert-${feedback.isCorrect ? 'success' : 'danger'}">
        <strong>${title}</strong>${feedback.explanation ? `<div>${BB.esc(feedback.explanation)}</div>` : ''}
        <button type="button" class="btn btn-sm btn-primary mt-2 d-block" id="practice-next">${index + 1 < total ? 'Next question' : 'See results'}</button></div>`;
      $('practice-next').onclick = next;
    } else {
      $('practice-feedback').innerHTML = '';
    }
  }

  function startTimer() {
    if (timer) timer.stop();
    timer = BB.timer($('practice-timer'), page.questionTime, () => answer(-1));
  }

  async function answer(choice) {
    if (feedback) return;
    if (timer) timer.stop();
    $('practice-timer').innerHTML = '';
    try {
      const res = await BB.api('POST', `/api/practice/${page.sessionId}/answer`, { qIndex: index, choice, timeMs: Date.now() - startedAt });
      feedback = { choice, ...res };
      render();
    } catch (err) {
      showError(err.message);
    }
  }

  function next() {
    index += 1;
    feedback = null;
    startedAt = Date.now();
    if (index < total) startTimer();
    render();
  }

  if (index < total) startTimer();
  render();
})();
