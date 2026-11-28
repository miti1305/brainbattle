// SERVICE (F1 Abrar): runs real-time multiplayer quiz battles (2-4 players).
//
// How a battle works:
//   1. CreateMatchAsync  -> a "waiting" match is saved in MongoDB with its questions already picked.
//   2. Players open /battle/{id}; the page calls the hub method "battle:join".
//        - ranked / private / tournament: starts by itself when every player has joined
//          (or after 30 s with whoever is there, if at least 2).
//        - casual: anyone with the link can join; the host (first player) presses Start.
//   3. Each question: players have QuestionTime seconds. When everybody has answered, or the time is up,
//      the right answer is revealed for 3 s, then the next question comes.
//   4. After the last question the winner is decided, the match is saved as "finished" and the
//      MatchFinished event is sent so other features (ratings, XP, feed, tournaments...) can react.
//
// Every change to a match happens inside a per-match lock, so two answers arriving at the same time
// can never overwrite each other. After every change the full state is pushed to the players
// with the SignalR event "battle:state" (the page simply redraws itself).
using System.Collections.Concurrent;
using BrainBattle.Core;
using BrainBattle.Models;
using MongoDB.Driver;

namespace BrainBattle.Services;

public class BattleService : IBattleLauncher, IConnectionHook
{
    public const int MinPlayers = 2;
    public const int MaxPlayers = 4;
    public const int RevealSeconds = 3;       // how long the right answer is shown
    public const int ReconnectSeconds = 15;   // a disconnected player has this long to come back
    public const int StartTimeoutSeconds = 30; // ranked/private/tournament: wait this long for everybody

    private readonly Db _db;
    private readonly RealtimeService _realtime;
    private readonly QuestionPickerService _picker;
    private readonly EventBus _bus;

    // One lock per match id.
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    // SignalR connection id -> which battle page it has open.
    private readonly ConcurrentDictionary<string, (string MatchId, string UserId)> _connections = new();

    public BattleService(Db db, RealtimeService realtime, QuestionPickerService picker, EventBus bus)
    {
        _db = db;
        _realtime = realtime;
        _picker = picker;
        _bus = bus;
    }

    private IMongoCollection<Match> Matches => _db.Collection<Match>("matches");

    private static string Group(string matchId) => $"match:{matchId}";

    // ======================================================================
    // Creating a battle (also used by F2 matchmaking, F4 rooms, F11 tournaments)
    // ======================================================================

    public async Task<string> CreateMatchAsync(CreateMatchOptions o)
    {
        var userIds = o.UserIds.Where(Ids.IsValid).Distinct().ToList();
        if (userIds.Count == 0) throw new HttpError(400, "A battle needs at least one player");
        if (userIds.Count > MaxPlayers) throw new HttpError(400, $"A battle can have at most {MaxPlayers} players");

        var count = Math.Clamp(o.QuestionCount, 3, 20);
        var seconds = Math.Clamp(o.QuestionTime, 5, 60);
        var difficulty = string.IsNullOrEmpty(o.Difficulty) ? null : o.Difficulty;
        var category = Ids.IsValid(o.CategoryId) ? o.CategoryId : null;

        var picked = await _picker.PickQuestionsAsync(category, difficulty, count);
        if (picked.Count == 0) throw new HttpError(400, "No published questions found for these settings");

        var users = await _db.Collection<User>("users").Find(u => userIds.Contains(u.Id)).ToListAsync();
        if (users.Count != userIds.Count) throw new HttpError(404, "Player not found");

        var match = new Match
        {
            Mode = string.IsNullOrEmpty(o.Mode) ? "casual" : o.Mode,
            Status = "waiting",
            Category = category,
            QuestionTime = seconds,
            Questions = picked.Select(q => new MatchQuestion
            {
                Quiz = q.Quiz,
                Text = q.Text,
                Type = q.Type,
                ImageUrl = q.ImageUrl,
                Options = q.Options,
                CorrectIndex = q.CorrectIndex,
                Explanation = q.Explanation,
            }).ToList(),
            // Keep the order of userIds: the first player is the host of a casual battle.
            Players = userIds.Select(id => new MatchPlayer
            {
                User = id,
                Username = users.First(u => u.Id == id).Username,
            }).ToList(),
            Room = Ids.IsValid(o.RoomId) ? o.RoomId : null,
            Tournament = Ids.IsValid(o.TournamentId) ? o.TournamentId : null,
            BracketIndex = o.BracketIndex,
        };
        match.Stamp();
        await Matches.InsertOneAsync(match);

        if (match.Mode != "casual")
        {
            var id = match.Id;
            After(StartTimeoutSeconds, () => RunLockedAsync(id, StartTimeoutAsync));
        }
        return match.Id;
    }

    // The waiting or running battle of this user (null if none). Used by the battle and ranked pages.
    public Task<Match> FindCurrentMatchAsync(string userId) =>
        Matches.Find(m => m.Players.Any(p => p.User == userId) && (m.Status == "waiting" || m.Status == "active"))
            .SortByDescending(m => m.CreatedAt)
            .FirstOrDefaultAsync();

    // ======================================================================
    // Actions coming from the page (through Hubs/GameHub.Battle.cs)
    // ======================================================================

    public Task<object> JoinAsync(string matchId, string userId, string connectionId)
    {
        Ids.Oid(matchId, "matchId");
        return WithMatchAsync<object>(matchId, async m =>
        {
            var player = m.PlayerOf(userId);
            if (player == null)
            {
                // Only casual battles that have not started can take new players (through the shared link).
                if (m.Mode != "casual" || m.Status != "waiting") throw new HttpError(403, "You are not a player in this battle");
                if (m.Players.Count >= MaxPlayers) throw new HttpError(400, "This battle is full");
                var user = await _db.Collection<User>("users").Find(u => u.Id == userId).FirstOrDefaultAsync()
                    ?? throw new HttpError(404, "User not found");
                player = new MatchPlayer { User = userId, Username = user.Username };
                m.Players.Add(player);
            }

            _connections[connectionId] = (m.Id, userId);
            await _realtime.JoinGroup(connectionId, Group(m.Id));

            if (m.Status == "waiting" || m.Status == "active")
            {
                if (!player.Forfeited) player.Connected = true;
                await SaveAsync(m);

                if (m.Status == "waiting" && m.Mode != "casual" && m.Players.All(p => p.Connected))
                    await StartAsync(m); // everybody is here
                else
                    await BroadcastAsync(m);
            }
            return State(m);
        });
    }

    // Casual battles: the host presses "Start".
    public Task<object> StartByHostAsync(string matchId, string userId)
    {
        Ids.Oid(matchId, "matchId");
        return WithMatchAsync<object>(matchId, async m =>
        {
            if (m.Mode != "casual") throw new HttpError(400, "This battle starts by itself when every player has joined");
            if (m.Status != "waiting") throw new HttpError(400, "The battle has already started");
            if (!Ids.Same(m.Players.FirstOrDefault()?.User, userId)) throw new HttpError(403, "Only the host can start the battle");

            m.Players.RemoveAll(p => !p.Connected); // players who closed the page are dropped
            if (m.Players.Count < MinPlayers) throw new HttpError(400, "At least 2 players are needed. Share the link with a friend!");

            await StartAsync(m);
            return new { ok = true };
        });
    }

    public Task<object> AnswerAsync(string matchId, string userId, int qIndex, int choice)
    {
        Ids.Oid(matchId, "matchId");
        return WithMatchAsync<object>(matchId, async m =>
        {
            if (m.Status != "active") throw new HttpError(400, "The battle is not running");
            var p = m.PlayerOf(userId) ?? throw new HttpError(403, "You are not a player in this battle");
            if (p.Forfeited) throw new HttpError(400, "You left this battle");
            if (qIndex != m.CurrentIndex || m.RevealedIndex >= qIndex) throw new HttpError(400, "Too late for this question");
            if (p.Answers.Any(a => a.QIndex == qIndex)) throw new HttpError(400, "You already answered");

            var q = m.Questions[qIndex];
            if (choice < 0 || choice >= q.Options.Count) throw new HttpError(400, "Invalid choice");

            var timeMs = (long)(DateTime.UtcNow - (m.QuestionStartedAt ?? DateTime.UtcNow)).TotalMilliseconds;
            if (timeMs > m.QuestionTime * 1000L + 1000) throw new HttpError(400, "Time is up"); // 1 s grace for network delay

            var correct = choice == q.CorrectIndex;
            var points = PointsFor(correct, timeMs, m.QuestionTime);
            p.Answers.Add(new MatchAnswer { QIndex = qIndex, Choice = choice, IsCorrect = correct, TimeMs = timeMs, Points = points });
            p.Score += points;
            if (correct) p.CorrectCount++;
            await SaveAsync(m);

            if (EveryoneAnswered(m, qIndex)) await RevealAsync(m, qIndex);
            else await BroadcastAsync(m); // others see "answered" next to this player's name

            return new { ok = true };
        });
    }

    // The player clicks "Leave" (counts as forfeit once the battle is running).
    public Task<object> LeaveAsync(string matchId, string userId)
    {
        Ids.Oid(matchId, "matchId");
        return WithMatchAsync<object>(matchId, async m =>
        {
            var p = m.PlayerOf(userId) ?? throw new HttpError(403, "You are not a player in this battle");
            if (m.Status == "waiting") await RemoveWaitingPlayerAsync(m, p);
            else if (m.Status == "active" && !p.Forfeited) await ForfeitAsync(m, p);
            return new { ok = true };
        });
    }

    // Called by GameHub when a SignalR connection closes (tab closed, internet lost...).
    public async Task OnDisconnectedAsync(string userId, string connectionId)
    {
        if (!_connections.TryRemove(connectionId, out var info)) return;
        // Still has the battle open in another tab?
        if (_connections.Values.Any(v => v.MatchId == info.MatchId && v.UserId == info.UserId)) return;

        await RunLockedAsync(info.MatchId, async m =>
        {
            var p = m.PlayerOf(userId);
            if (p == null || !(m.Status == "waiting" || m.Status == "active")) return;
            p.Connected = false;
            await SaveAsync(m);
            await BroadcastAsync(m);
        });

        // Give the player some seconds to come back (automatic reconnect or page refresh).
        After(ReconnectSeconds, () => RunLockedAsync(info.MatchId, async m =>
        {
            var p = m.PlayerOf(userId);
            if (p == null || p.Connected || p.Forfeited) return;
            if (m.Status == "active") await ForfeitAsync(m, p);
            else if (m.Status == "waiting" && m.Mode == "casual") await RemoveWaitingPlayerAsync(m, p);
        }));
    }

    // ======================================================================
    // Game flow (always called while holding the match lock)
    // ======================================================================

    private async Task StartAsync(Match m)
    {
        foreach (var p in m.Players.Where(p => !p.Connected)) p.Forfeited = true; // never showed up
        m.Status = "active";
        m.StartedAt = DateTime.UtcNow;
        await NextQuestionAsync(m);
    }

    private async Task NextQuestionAsync(Match m)
    {
        m.CurrentIndex++;
        m.QuestionStartedAt = DateTime.UtcNow;
        await SaveAsync(m);
        await BroadcastAsync(m);

        var id = m.Id;
        var index = m.CurrentIndex;
        After(m.QuestionTime, () => RunLockedAsync(id, mm => RevealAsync(mm, index))); // time is up
    }

    private async Task RevealAsync(Match m, int index)
    {
        // Already revealed (everybody answered early) or the battle moved on: nothing to do.
        if (m.Status != "active" || m.CurrentIndex != index || m.RevealedIndex >= index) return;

        m.RevealedIndex = index;
        await SaveAsync(m);
        await BroadcastAsync(m);

        var id = m.Id;
        After(RevealSeconds, () => RunLockedAsync(id, async mm =>
        {
            if (mm.Status != "active" || mm.CurrentIndex != index) return;
            if (index + 1 < mm.Questions.Count) await NextQuestionAsync(mm);
            else await FinishAsync(mm);
        }));
    }

    private async Task ForfeitAsync(Match m, MatchPlayer p)
    {
        p.Forfeited = true;
        p.Connected = false;

        if (m.Players.Count(x => !x.Forfeited) < MinPlayers)
        {
            await FinishAsync(m); // only one player left: they win
            return;
        }
        await SaveAsync(m);
        if (EveryoneAnswered(m, m.CurrentIndex)) await RevealAsync(m, m.CurrentIndex);
        else await BroadcastAsync(m);
    }

    private async Task RemoveWaitingPlayerAsync(Match m, MatchPlayer p)
    {
        if (m.Mode == "casual")
        {
            m.Players.Remove(p); // the next player becomes host
            if (m.Players.Count == 0) m.Status = "cancelled";
        }
        else
        {
            p.Connected = false; // fixed players: StartTimeoutAsync decides
        }
        await SaveAsync(m);
        await BroadcastAsync(m);
    }

    private async Task StartTimeoutAsync(Match m)
    {
        if (m.Status != "waiting") return;
        if (m.Players.Count(p => p.Connected) >= MinPlayers)
        {
            await StartAsync(m);
            return;
        }
        m.Status = "cancelled";
        m.FinishedAt = DateTime.UtcNow;
        await SaveAsync(m);
        await BroadcastAsync(m);
        await ReopenRoomAsync(m);
        ForgetConnections(m.Id);
    }

    private async Task FinishAsync(Match m)
    {
        if (m.Status == "finished" || m.Status == "cancelled") return;

        m.Status = "finished";
        m.FinishedAt = DateTime.UtcNow;
        m.RevealedIndex = m.CurrentIndex; // show every score
        DecideResults(m.Players);
        await SaveAsync(m);
        await BroadcastAsync(m);
        await ReopenRoomAsync(m);

        // Tell the other features. Payload shape is fixed in Services/EventBus.cs.
        _bus.Emit(Events.MatchFinished, new EventData
        {
            ["matchId"] = m.Id,
            ["mode"] = m.Mode,
            ["categoryId"] = m.Category,
            ["tournamentId"] = m.Tournament,
            ["bracketIndex"] = m.BracketIndex,
            ["players"] = m.Players.Select(p => new EventData
            {
                ["userId"] = p.User,
                ["username"] = p.Username,
                ["score"] = p.Score,
                ["result"] = p.Result,
                ["correctCount"] = p.CorrectCount,
                ["total"] = m.Questions.Count,
            }).ToList(),
        });
        ForgetConnections(m.Id);
    }

    // F4 private room: the room goes back to "open" so the host can start another game.
    private async Task ReopenRoomAsync(Match m)
    {
        if (!Ids.IsValid(m.Room)) return;
        await _db.Collection<GameRoom>("gamerooms").UpdateOneAsync(r => r.Id == m.Room,
            Builders<GameRoom>.Update.Set(r => r.Status, "open").Set(r => r.UpdatedAt, DateTime.UtcNow));
    }

    // ======================================================================
    // Pure rules (unit tested in BrainBattle.Tests/BattleTests.cs)
    // ======================================================================

    // Correct answer: 100 points + up to 100 bonus points for speed. Wrong or no answer: 0.
    public static int PointsFor(bool correct, long timeMs, int questionTime)
    {
        if (!correct) return 0;
        var speed = Math.Clamp(1 - timeMs / (questionTime * 1000.0), 0.0, 1.0);
        return 100 + (int)Math.Round(100 * speed);
    }

    // Highest score wins; equal highest scores are a draw; players who left get "forfeit".
    public static void DecideResults(List<MatchPlayer> players)
    {
        foreach (var p in players.Where(p => p.Forfeited)) p.Result = "forfeit";
        var playing = players.Where(p => !p.Forfeited).ToList();
        if (playing.Count == 0) return;

        var best = playing.Max(p => p.Score);
        var winners = playing.Count(p => p.Score == best);
        foreach (var p in playing)
            p.Result = p.Score < best ? "loss" : winners == 1 ? "win" : "draw";
    }

    private static bool EveryoneAnswered(Match m, int qIndex) =>
        m.Players.Where(p => !p.Forfeited).All(p => p.Answers.Any(a => a.QIndex == qIndex));

    // What the page sees. The right answer is only included after it is revealed, and scores only
    // count revealed questions, so nobody can find out the answer from another player's score.
    public static object State(Match m)
    {
        var running = m.Status == "active" && m.CurrentIndex >= 0 && m.CurrentIndex < m.Questions.Count;
        var q = running ? m.Questions[m.CurrentIndex] : null;
        var revealed = running && m.RevealedIndex == m.CurrentIndex;
        var timeLeft = 0;
        if (running && !revealed && m.QuestionStartedAt != null)
            timeLeft = Math.Max(0, (int)Math.Ceiling(m.QuestionTime - (DateTime.UtcNow - m.QuestionStartedAt.Value).TotalSeconds));

        return new
        {
            matchId = m.Id,
            mode = m.Mode,
            status = m.Status,
            questionTime = m.QuestionTime,
            total = m.Questions.Count,
            currentIndex = m.CurrentIndex,
            timeLeft,
            hostId = m.Players.FirstOrDefault()?.User,
            question = q == null ? null : QuestionPickerService.HideAnswer(q.Text, q.Type, q.ImageUrl, q.Options),
            reveal = revealed ? new { correctIndex = q.CorrectIndex, explanation = q.Explanation } : null,
            players = m.Players.Select(p => new
            {
                userId = p.User,
                username = p.Username,
                score = p.Answers.Where(a => a.QIndex <= m.RevealedIndex).Sum(a => a.Points),
                correctCount = p.Answers.Count(a => a.QIndex <= m.RevealedIndex && a.IsCorrect),
                answered = running && p.Answers.Any(a => a.QIndex == m.CurrentIndex),
                connected = p.Connected,
                forfeited = p.Forfeited,
                result = p.Result,
            }).ToList(),
        };
    }

    // ======================================================================
    // Helpers
    // ======================================================================

    private Task BroadcastAsync(Match m) => _realtime.ToGroup(Group(m.Id), "battle:state", State(m));

    private Task SaveAsync(Match m)
    {
        m.UpdatedAt = DateTime.UtcNow;
        return Matches.ReplaceOneAsync(x => x.Id == m.Id, m);
    }

    private void ForgetConnections(string matchId)
    {
        foreach (var entry in _connections.Where(e => e.Value.MatchId == matchId).ToList())
            _connections.TryRemove(entry.Key, out _);
    }

    // Loads the match, runs `work` while holding the match lock, returns its result.
    private async Task<T> WithMatchAsync<T>(string matchId, Func<Match, Task<T>> work)
    {
        var gate = _locks.GetOrAdd(matchId, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync();
        try
        {
            var match = await Matches.Find(m => m.Id == matchId).FirstOrDefaultAsync()
                ?? throw new HttpError(404, "Battle not found");
            return await work(match);
        }
        finally
        {
            gate.Release();
        }
    }

    private Task RunLockedAsync(string matchId, Func<Match, Task> work) =>
        WithMatchAsync<bool>(matchId, async m =>
        {
            await work(m);
            return true;
        });

    // Runs `action` after some seconds in the background (question timer, reveal pause...).
    private static void After(int seconds, Func<Task> action)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(seconds));
                await action();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Battle timer failed: {ex.Message}");
            }
        });
    }
}
