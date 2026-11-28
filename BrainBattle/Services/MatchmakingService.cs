// SERVICE (F2 Abrar): skill-based matchmaking for ranked battles.
//
// How it works:
//   - A player presses "Find match" on /ranked -> hub "ranked:join" -> they get a ticket in the queue
//     with their rating (PlayerRating, 1200 if they never played ranked) and optional category.
//   - Jobs/MatchmakingJob calls MatchPlayersAsync every 2 seconds. Two players are paired when their
//     ratings are close enough. The allowed gap starts at ±100 and grows by 50 every 5 seconds of waiting
//     (max ±400), so nobody waits forever but close opponents are always preferred.
//   - For each pair a "ranked" battle is created through F1 (BattleService) and both players get
//     "ranked:matched" { matchId } and are sent to /battle/{matchId}.
//   - The queue lives in memory: closing the page (SignalR disconnect) removes the ticket.
using BrainBattle.Core;
using BrainBattle.Models;
using MongoDB.Driver;

namespace BrainBattle.Services;

// One player waiting in the ranked queue.
public class QueueTicket
{
    public string UserId { get; set; }
    public string Username { get; set; }
    public int Rating { get; set; }
    public string CategoryId { get; set; } // null = any category
    public string ConnectionId { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

public class MatchmakingService : IConnectionHook
{
    public const int BaseWindow = 100;      // ± rating gap allowed at the start
    public const int WindowGrowth = 50;     // extra gap ...
    public const int GrowEverySeconds = 5;  // ... every 5 seconds of waiting
    public const int MaxWindow = 400;
    public const int QuestionCount = 10;
    public const int QuestionTime = 15;

    private readonly Db _db;
    private readonly RealtimeService _realtime;
    private readonly BattleService _battles;

    private readonly List<QueueTicket> _queue = new();
    private readonly object _lock = new();

    public MatchmakingService(Db db, RealtimeService realtime, BattleService battles)
    {
        _db = db;
        _realtime = realtime;
        _battles = battles;
    }

    // ---------- called from Hubs/GameHub.Ranked.cs ----------

    public async Task<object> JoinAsync(string userId, string connectionId, string categoryId)
    {
        var current = await _battles.FindCurrentMatchAsync(userId);
        if (current != null) return new { ok = false, message = "You are already in a battle", matchId = current.Id };

        var user = await _db.Collection<User>("users").Find(u => u.Id == userId).FirstOrDefaultAsync()
            ?? throw new HttpError(404, "User not found");
        var rating = await RatingOfAsync(userId);

        lock (_lock)
        {
            _queue.RemoveAll(t => t.UserId == userId); // pressing the button twice keeps one ticket
            _queue.Add(new QueueTicket
            {
                UserId = userId,
                Username = user.Username,
                Rating = rating,
                CategoryId = Ids.IsValid(categoryId) ? categoryId : null,
                ConnectionId = connectionId,
            });
        }
        return new { ok = true, rating, window = BaseWindow };
    }

    public void Leave(string userId)
    {
        lock (_lock) _queue.RemoveAll(t => t.UserId == userId);
    }

    public Task OnDisconnectedAsync(string userId, string connectionId)
    {
        lock (_lock) _queue.RemoveAll(t => t.ConnectionId == connectionId);
        return Task.CompletedTask;
    }

    public async Task<int> RatingOfAsync(string userId)
    {
        var r = await _db.Collection<PlayerRating>("playerratings").Find(x => x.User == userId).FirstOrDefaultAsync();
        return r?.Rating ?? PlayerRating.DefaultRating;
    }

    // ---------- called by Jobs/MatchmakingJob every 2 seconds ----------

    public async Task MatchPlayersAsync()
    {
        var now = DateTime.UtcNow;
        List<(QueueTicket A, QueueTicket B)> pairs;
        List<QueueTicket> waiting;
        lock (_lock)
        {
            pairs = FindPairs(_queue, now);
            foreach (var (a, b) in pairs)
            {
                _queue.Remove(a);
                _queue.Remove(b);
            }
            waiting = _queue.ToList();
        }

        foreach (var (a, b) in pairs)
        {
            try
            {
                var matchId = await _battles.CreateMatchAsync(new CreateMatchOptions
                {
                    UserIds = { a.UserId, b.UserId },
                    Mode = "ranked",
                    CategoryId = a.CategoryId ?? b.CategoryId,
                    QuestionCount = QuestionCount,
                    QuestionTime = QuestionTime,
                });
                await _realtime.ToUser(a.UserId, "ranked:matched", new { matchId, opponent = b.Username, opponentRating = b.Rating });
                await _realtime.ToUser(b.UserId, "ranked:matched", new { matchId, opponent = a.Username, opponentRating = a.Rating });
            }
            catch (Exception ex)
            {
                await _realtime.ToUser(a.UserId, "ranked:error", new { message = ex.Message });
                await _realtime.ToUser(b.UserId, "ranked:error", new { message = ex.Message });
            }
        }

        // Show each waiting player how wide their search is now.
        foreach (var t in waiting)
        {
            var waited = (now - t.JoinedAt).TotalSeconds;
            await _realtime.ToConnection(t.ConnectionId, "ranked:searching",
                new { waited = (int)waited, window = WindowFor(waited), inQueue = waiting.Count });
        }
    }

    // ---------- pure rules (unit tested in BrainBattle.Tests/MatchmakingTests.cs) ----------

    // Allowed rating gap after waiting this many seconds.
    public static int WindowFor(double waitedSeconds) =>
        Math.Min(MaxWindow, BaseWindow + WindowGrowth * (int)(Math.Max(0, waitedSeconds) / GrowEverySeconds));

    // Two tickets can play each other if the categories fit and the gap is inside BOTH players' windows.
    public static bool CanPair(QueueTicket a, QueueTicket b, DateTime now)
    {
        if (Ids.Same(a.UserId, b.UserId)) return false;
        if (a.CategoryId != null && b.CategoryId != null && !Ids.Same(a.CategoryId, b.CategoryId)) return false;
        var window = Math.Min(WindowFor((now - a.JoinedAt).TotalSeconds), WindowFor((now - b.JoinedAt).TotalSeconds));
        return Math.Abs(a.Rating - b.Rating) <= window;
    }

    // Whoever waited longest is served first and gets the closest-rated opponent that fits.
    public static List<(QueueTicket A, QueueTicket B)> FindPairs(List<QueueTicket> queue, DateTime now)
    {
        var free = queue.OrderBy(t => t.JoinedAt).ToList();
        var pairs = new List<(QueueTicket A, QueueTicket B)>();
        while (free.Count > 1)
        {
            var a = free[0];
            free.RemoveAt(0);
            var b = free.Where(t => CanPair(a, t, now)).OrderBy(t => Math.Abs(t.Rating - a.Rating)).FirstOrDefault();
            if (b == null) continue;
            free.Remove(b);
            pairs.Add((a, b));
        }
        return pairs;
    }
}
