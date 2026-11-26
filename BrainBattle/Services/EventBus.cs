// Shared in-process event bus so features can react to each other without editing each other's code.
//
// Emit (example, when a match ends):
//   _bus.Emit(Events.MatchFinished, new EventData { ["matchId"] = match.Id, ["mode"] = match.Mode, ... });
// Listen (put a class implementing IEventListener in the Listeners folder; it is loaded automatically):
//   bus.On(Events.MatchFinished, async data => { ... });
//
// A failing listener never breaks the feature that emitted the event (errors are only logged).
using BrainBattle.Core;

namespace BrainBattle.Services;

// Event names. The payload keys of each event are written next to it; keep these shapes.
public static class Events
{
    // matchId, mode, categoryId, tournamentId, bracketIndex,
    // players: List<EventData> { userId, username, score, result ("win"|"loss"|"draw"|"forfeit"), correctCount, total }
    public const string MatchFinished = "match.finished";
    // userId, attemptId, puzzleType, difficulty, isDaily, score
    public const string PuzzleSolved = "puzzle.solved";
    // quizId, authorId, title
    public const string QuizPublished = "quiz.published";
    // quizId, authorId, title
    public const string QuizApproved = "quiz.approved";
    // userId, sessionId, score, correct, total
    public const string PracticeCompleted = "practice.completed";
    // fromId, fromUsername, toId
    public const string FriendRequestSent = "friend.requestSent";
    // fromId (who accepted), fromUsername, toId (who sent the request)
    public const string FriendRequestAccepted = "friend.requestAccepted";
    // fromId, fromUsername, toId, roomCode
    public const string FriendChallenge = "friend.challenge";
    // tournamentId, tournamentName, bracketIndex, userIds (List<string> with 2 ids)
    public const string TournamentMatchReady = "tournament.matchReady";
    // tournamentId, name, championId
    public const string TournamentFinished = "tournament.finished";
    // userId, badgeKey, badgeName
    public const string BadgeEarned = "badge.earned";
    // userId, level
    public const string LevelUp = "progress.levelUp";
    // userId, until, reason
    public const string UserSuspended = "user.suspended";
    // userId, message
    public const string ModerationWarning = "moderation.warning";
}

public class EventBus
{
    private readonly Dictionary<string, List<Func<EventData, Task>>> _handlers = new();
    private readonly object _lock = new();

    public void On(string name, Func<EventData, Task> handler)
    {
        lock (_lock)
        {
            if (!_handlers.TryGetValue(name, out var list)) _handlers[name] = list = new List<Func<EventData, Task>>();
            list.Add(handler);
        }
    }

    // Runs every listener in the background and returns immediately.
    public void Emit(string name, EventData payload)
    {
        List<Func<EventData, Task>> list;
        lock (_lock)
        {
            if (!_handlers.TryGetValue(name, out var found)) return;
            list = found.ToList();
        }
        foreach (var handler in list)
        {
            _ = Task.Run(async () =>
            {
                try { await handler(payload); }
                catch (Exception ex) { Console.Error.WriteLine($"Listener for {name} failed: {ex.Message}"); }
            });
        }
    }
}
