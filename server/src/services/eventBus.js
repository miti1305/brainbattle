// Shared in-process event bus so features can react to each other without tight coupling.
//
// Emit (example, when a match ends):
//   eventBus.emit(EVENTS.MATCH_FINISHED, { matchId, mode, players: [...] });
// Listen (put the file in server/src/listeners/, it is loaded automatically):
//   eventBus.on(EVENTS.MATCH_FINISHED, (data) => { ... });
//
// Payload of each event is written next to it. Keep these shapes so everyone's code fits together.
const { EventEmitter } = require('events');

const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);

const EVENTS = Object.freeze({
  // { matchId, mode, categoryId, tournamentId, bracketIndex,
  //   players: [{ userId, username, score, result: 'win'|'loss'|'draw'|'forfeit', correctCount, total }] }
  MATCH_FINISHED: 'match.finished',
  // { userId, attemptId, puzzleType, difficulty, isDaily, score }
  PUZZLE_SOLVED: 'puzzle.solved',
  // { quizId, authorId, title }
  QUIZ_PUBLISHED: 'quiz.published',
  // { quizId, authorId, title }
  QUIZ_APPROVED: 'quiz.approved',
  // { userId, sessionId, score, correct, total }
  PRACTICE_COMPLETED: 'practice.completed',
  // { fromId, fromUsername, toId }
  FRIEND_REQUEST_SENT: 'friend.requestSent',
  // { fromId (who accepted), fromUsername, toId (who sent the request) }
  FRIEND_REQUEST_ACCEPTED: 'friend.requestAccepted',
  // { fromId, fromUsername, toId, roomCode }
  FRIEND_CHALLENGE: 'friend.challenge',
  // { tournamentId, tournamentName, bracketIndex, userIds: [a, b] }
  TOURNAMENT_MATCH_READY: 'tournament.matchReady',
  // { tournamentId, name, championId }
  TOURNAMENT_FINISHED: 'tournament.finished',
  // { userId, badgeKey, badgeName }
  BADGE_EARNED: 'badge.earned',
  // { userId, level }
  LEVEL_UP: 'progress.levelUp',
  // { userId, until, reason }
  USER_SUSPENDED: 'user.suspended',
  // { userId, message }
  MODERATION_WARNING: 'moderation.warning',
});

// Safe emit: one failing listener never breaks the feature that emitted the event.
function emitEvent(name, payload) {
  for (const listener of eventBus.listeners(name)) {
    Promise.resolve()
      .then(() => listener(payload))
      .catch((err) => console.error(`Listener for ${name} failed:`, err.message));
  }
}

module.exports = { eventBus, EVENTS, emitEvent };
