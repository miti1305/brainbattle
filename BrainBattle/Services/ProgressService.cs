// F17 (Moontaha): awards XP, updates level/streak/counters and unlocks badges.
using BrainBattle.Core;
using BrainBattle.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BrainBattle.Services;

public class ProgressService
{
    private readonly Db _db;
    private readonly EventBus _bus;

    public ProgressService(Db db, EventBus bus)
    {
        _db = db;
        _bus = bus;
    }

    private IMongoCollection<UserProgress> Progresses => _db.Collection<UserProgress>("userprogresses");

    public async Task<UserProgress> GetProgressAsync(string userId)
    {
        var progress = await Progresses.Find(p => p.User == userId).FirstOrDefaultAsync();
        if (progress != null) return progress;
        try
        {
            progress = new UserProgress { User = userId };
            progress.Stamp();
            await Progresses.InsertOneAsync(progress);
            return progress;
        }
        catch (Exception ex) when (ErrorMiddleware.IsDuplicateKey(ex))
        {
            return await Progresses.Find(p => p.User == userId).FirstAsync();
        }
    }

    // XP for an action, read from the admin settings (F16).
    public static int XpFor(XpValues xp, string action) => action switch
    {
        "matchPlayed" => xp.MatchPlayed,
        "matchWon" => xp.MatchWon,
        "puzzleSolved" => xp.PuzzleSolved,
        "dailySolved" => xp.DailySolved,
        "practiceCompleted" => xp.PracticeCompleted,
        "quizPublished" => xp.QuizPublished,
        _ => 0,
    };

    /// <param name="action">key of SystemSettings.XpValues (matchPlayed, matchWon, puzzleSolved, ...)</param>
    /// <param name="counters">counters to increase, e.g. { ["matchesPlayed"] = 1 }</param>
    public async Task<UserProgress> AwardAsync(string userId, string action, Dictionary<string, int> counters = null)
    {
        var settings = await SystemSettings.GetSingletonAsync(_db);
        var inc = new BsonDocument("xp", XpFor(settings.XpValues, action));
        foreach (var (key, value) in counters ?? new Dictionary<string, int>()) inc[$"counters.{key}"] = value;

        await GetProgressAsync(userId);
        var progress = await Progresses.FindAndUpdateAsync(
            new BsonDocument("user", Ids.Oid(userId)),
            new BsonDocument("$inc", inc));

        progress.Streak = Levels.NextStreak(progress.Streak);
        var oldLevel = progress.Level;
        progress.Level = Levels.LevelFromXp(progress.Xp, settings.LevelBase);
        progress.UpdatedAt = DateTime.UtcNow;
        await Progresses.UpdateOneAsync(
            new BsonDocument("_id", Ids.Oid(progress.Id)),
            new BsonDocument("$set", new BsonDocument
            {
                { "level", progress.Level },
                { "streak", new BsonDocument
                    { { "current", progress.Streak.Current }, { "best", progress.Streak.Best }, { "lastActiveDate", progress.Streak.LastActiveDate } } },
                { "updatedAt", progress.UpdatedAt },
            }));

        if (progress.Level > oldLevel) _bus.Emit(Events.LevelUp, new EventData { ["userId"] = userId, ["level"] = progress.Level });
        await CheckBadgesAsync(userId, progress);
        return progress;
    }

    public async Task CheckBadgesAsync(string userId, UserProgress progress)
    {
        var badges = _db.Collection<UserBadge>("userbadges");
        var owned = (await badges.Find(b => b.User == userId).ToListAsync()).Select(b => b.BadgeKey).ToHashSet();
        foreach (var rule in Badges.All)
        {
            if (owned.Contains(rule.Key) || !rule.IsSatisfied(progress)) continue;
            try
            {
                await badges.InsertOneAsync(new UserBadge { Id = Ids.NewId(), User = userId, BadgeKey = rule.Key });
                _bus.Emit(Events.BadgeEarned, new EventData { ["userId"] = userId, ["badgeKey"] = rule.Key, ["badgeName"] = rule.Name });
            }
            catch (Exception ex) when (ErrorMiddleware.IsDuplicateKey(ex))
            {
                // already awarded at the same moment: never award twice
            }
        }
    }
}
