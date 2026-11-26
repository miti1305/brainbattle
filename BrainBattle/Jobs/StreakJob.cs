// F17 (Moontaha): shortly after midnight -> reset streaks of users who missed a day.
// F16/F18 (Moontaha): every hour -> lift suspensions that have expired.
using BrainBattle.Core;
using BrainBattle.Services;
using MongoDB.Bson;

namespace BrainBattle.Jobs;

public class StreakJob : ScheduledJob
{
    private readonly Db _db;
    private string _streaksResetFor;
    private DateTime _lastUnsuspend = DateTime.MinValue;

    public StreakJob(Db db)
    {
        _db = db;
    }

    protected override TimeSpan Interval => TimeSpan.FromMinutes(1);

    protected override async Task RunOnceAsync(CancellationToken ct)
    {
        var now = DateTime.Now;
        var today = Levels.LocalDate(now);
        if (_streaksResetFor != today && now.TimeOfDay >= TimeSpan.FromMinutes(5))
        {
            _streaksResetFor = today;
            await ResetMissedStreaksAsync(today);
        }
        if (DateTime.UtcNow - _lastUnsuspend >= TimeSpan.FromHours(1))
        {
            _lastUnsuspend = DateTime.UtcNow;
            await LiftExpiredSuspensionsAsync();
        }
    }

    private async Task ResetMissedStreaksAsync(string today)
    {
        var res = await _db.Raw("userprogresses").UpdateManyAsync(
            new BsonDocument
            {
                { "streak.current", new BsonDocument("$gt", 0) },
                { "streak.lastActiveDate", new BsonDocument("$nin", new BsonArray { today, Levels.YesterdayOf(today) }) },
            },
            new BsonDocument("$set", new BsonDocument("streak.current", 0)));
        if (res.ModifiedCount > 0) Console.WriteLine($"Streaks reset: {res.ModifiedCount}");
    }

    private Task LiftExpiredSuspensionsAsync() =>
        _db.Raw("users").UpdateManyAsync(
            new BsonDocument { { "isSuspended", true }, { "suspendedUntil", new BsonDocument("$lte", DateTime.UtcNow) } },
            new BsonDocument { { "$set", new BsonDocument("isSuspended", false) }, { "$unset", new BsonDocument("suspendedUntil", 1) } });
}
