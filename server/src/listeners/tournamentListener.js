// F11 (Mim): when a tournament battle (F1, Abrar) finishes, advance the bracket.
const { eventBus, EVENTS } = require('../services/eventBus');
const { handleMatchFinished } = require('../services/tournamentService');

eventBus.on(EVENTS.MATCH_FINISHED, async (data) => {
  if (!data.tournamentId) return;
  try {
    await handleMatchFinished(data);
  } catch (err) {
    console.error('Tournament update failed:', err.message);
  }
});
