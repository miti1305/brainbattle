// CONTROLLER (F16 Moontaha, admin only): dashboard statistics, user & role management,
// game settings and ranked seasons.
// Pages:  GET /admin            -> Views/Admin/Dashboard.cshtml (statistics + chart: wwwroot/js/admin.js)
//         GET /admin/users      -> Views/Admin/Users.cshtml
//         GET /admin/settings   -> Views/Admin/Settings.cshtml
//         GET /admin/seasons    -> Views/Admin/Seasons.cshtml
// Forms:  POST /admin/users/{id}/role | ban | unban, POST /admin/settings,
//         POST /admin/seasons (start), POST /admin/seasons/{id}/end
using System.Text.RegularExpressions;
using BrainBattle.Core;
using BrainBattle.Models;
using BrainBattle.Services;
using BrainBattle.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BrainBattle.Controllers;

[Authorize(Roles = "admin")]
public class AdminController : AppController
{
    private const string TimeZoneName = "Asia/Dhaka";
    private readonly SeasonService _seasons;
    private readonly EventBus _bus;
    private readonly RealtimeService _realtime;

    public AdminController(SeasonService seasons, EventBus bus, RealtimeService realtime)
    {
        _seasons = seasons;
        _bus = bus;
        _realtime = realtime;
    }

    private IMongoCollection<User> Users => Db.Collection<User>("users");
    private IMongoCollection<Season> Seasons => Db.Collection<Season>("seasons");
    private static DateTime DaysAgo(int n) => DateTime.UtcNow.AddDays(-n);

    private static TimeZoneInfo Zone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById(TimeZoneName); }
        catch { return TimeZoneInfo.CreateCustomTimeZone("BD", TimeSpan.FromHours(6), "Bangladesh", "Bangladesh"); }
    }

    // ---------- overview ----------

    private async Task<AdminStatsViewModel> StatsAsync()
    {
        var zone = Zone();
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone);
        var startOfToday = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localNow.Date, DateTimeKind.Unspecified), zone);
        var matches = Db.Raw("matches");
        var sevenDaysAgo = DaysAgo(7);

        var activePlayers = await (await matches.DistinctAsync<BsonValue>("players.user", new BsonDocument
            { { "status", "finished" }, { "finishedAt", new BsonDocument("$gte", sevenDaysAgo) } })).ToListAsync();

        var perDay = await Db.AggregateAsync("matches",
            new BsonDocument("$match", new BsonDocument { { "status", "finished" }, { "finishedAt", new BsonDocument("$gte", DaysAgo(14)) } }),
            new BsonDocument("$group", new BsonDocument
            {
                { "_id", new BsonDocument("$dateToString", new BsonDocument { { "format", "%Y-%m-%d" }, { "date", "$finishedAt" }, { "timezone", "+06:00" } }) },
                { "matches", new BsonDocument("$sum", 1) },
            }),
            new BsonDocument("$sort", new BsonDocument("_id", 1)));

        var popular = await Db.AggregateAsync("matches",
            new BsonDocument("$match", new BsonDocument { { "status", "finished" }, { "category", new BsonDocument("$ne", BsonNull.Value) } }),
            new BsonDocument("$group", new BsonDocument { { "_id", "$category" }, { "matches", new BsonDocument("$sum", 1) } }),
            new BsonDocument("$sort", new BsonDocument("matches", -1)),
            new BsonDocument("$limit", 5),
            new BsonDocument("$lookup", new BsonDocument { { "from", "categories" }, { "localField", "_id" }, { "foreignField", "_id" }, { "as", "cat" } }),
            new BsonDocument("$project", new BsonDocument
            {
                { "_id", 0 },
                { "name", new BsonDocument("$ifNull", new BsonArray { new BsonDocument("$arrayElemAt", new BsonArray { "$cat.name", 0 }), "Unknown" }) },
                { "matches", 1 },
            }));

        // Fill missing days with 0 so the chart has 14 points.
        var counts = perDay.ToDictionary(d => d["_id"].AsString, d => d["matches"].ToInt32());
        var series = new List<DayCount>();
        for (var i = 13; i >= 0; i--)
        {
            var label = localNow.AddDays(-i).ToString("yyyy-MM-dd");
            series.Add(new DayCount(label, counts.GetValueOrDefault(label)));
        }

        return new AdminStatsViewModel
        {
            TotalUsers = await Users.CountDocumentsAsync(_ => true),
            NewUsers7d = await Users.CountDocumentsAsync(u => u.CreatedAt >= sevenDaysAgo),
            SuspendedUsers = await Users.CountDocumentsAsync(u => u.IsSuspended),
            MatchesToday = await matches.CountDocumentsAsync(new BsonDocument
                { { "status", "finished" }, { "finishedAt", new BsonDocument("$gte", startOfToday) } }),
            PublishedQuizzes = await Db.Collection<Quiz>("quizzes").CountDocumentsAsync(q => q.Status == "published"),
            // Read straight from the collection, so this works before F6 (Farin) is merged.
            PuzzlesSolved = await Db.Raw("puzzleattempts").CountDocumentsAsync(new BsonDocument("solved", true)),
            ActivePlayers7d = activePlayers.Count,
            MatchesPerDay = series,
            PopularCategories = popular.Select(p => new NameCount(p["name"].ToString(), p["matches"].ToInt32())).ToList(),
        };
    }

    // GET /admin
    [HttpGet("/admin")]
    public async Task<IActionResult> Dashboard() => Page("Admin/Dashboard", await StatsAsync());

    // GET /api/admin/stats
    [HttpGet("/api/admin/stats")]
    public async Task<IActionResult> Stats() => Ok(await StatsAsync());

    // ---------- users ----------

    // GET /admin/users?q=&role=&suspended=&page=
    [HttpGet("/admin/users")]
    public async Task<IActionResult> UsersPage(string q, string role, string suspended, int page = 1)
    {
        var filter = new BsonDocument();
        if (!string.IsNullOrEmpty(q))
        {
            var rx = new BsonRegularExpression(Regex.Escape(q), "i");
            filter["$or"] = new BsonArray { new BsonDocument("username", rx), new BsonDocument("email", rx) };
        }
        if (Models.User.Roles.Contains(role)) filter["role"] = role;
        if (suspended == "true") filter["isSuspended"] = true;
        page = Math.Max(1, page);
        var total = await Users.CountDocumentsAsync(filter);
        var users = await Users.Find(filter).SortByDescending(u => u.CreatedAt).Skip((page - 1) * 25).Limit(25).ToListAsync();
        return Page("Admin/Users", new AdminUsersViewModel
        {
            Q = q, Role = role, Suspended = suspended, Page = page, Total = total, Users = users, MeId = MeId,
            Pages = Math.Max(1, (int)Math.Ceiling(total / 25.0)),
        });
    }

    private async Task<User> TargetUserAsync(string id)
    {
        if (!Ids.IsValid(id)) throw new HttpError(404, "User not found");
        if (id == MeId) throw new HttpError(400, "You cannot change your own account here");
        var user = await Users.Find(u => u.Id == id).FirstOrDefaultAsync();
        if (user == null) throw new HttpError(404, "User not found");
        return user;
    }

    private Task SaveUserAsync(User user)
    {
        user.UpdatedAt = DateTime.UtcNow;
        return Users.ReplaceOneAsync(u => u.Id == user.Id, user);
    }

    // POST /admin/users/{id}/role  (role)
    [HttpPost("/admin/users/{id}/role")]
    public async Task<IActionResult> ChangeRole(string id, string role)
    {
        if (!Models.User.Roles.Contains(role)) throw new HttpError(400, "Role must be player, moderator or admin");
        var user = await TargetUserAsync(id);
        user.Role = role;
        await SaveUserAsync(user);
        return Done($"{user.Username} is now {role}");
    }

    // POST /admin/users/{id}/ban  (days, reason)  - days empty = until unbanned
    [HttpPost("/admin/users/{id}/ban")]
    public async Task<IActionResult> Ban(string id, double? days, string reason)
    {
        var user = await TargetUserAsync(id);
        var d = days ?? 0;
        user.IsSuspended = true;
        user.SuspendedUntil = d > 0 ? DateTime.UtcNow.AddDays(d) : null;
        await SaveUserAsync(user);
        _bus.Emit(Events.UserSuspended, new EventData
        {
            ["userId"] = user.Id,
            ["until"] = user.SuspendedUntil,
            ["reason"] = string.IsNullOrEmpty(reason) ? "Banned by an admin" : reason,
        });
        // Tell the user's open pages; their next request logs them out (Core/AuthSetup.cs).
        await _realtime.ToUser(user.Id, "account:suspended", new { until = user.SuspendedUntil });
        return Done($"{user.Username} is suspended");
    }

    // POST /admin/users/{id}/unban
    [HttpPost("/admin/users/{id}/unban")]
    public async Task<IActionResult> Unban(string id)
    {
        var user = await TargetUserAsync(id);
        user.IsSuspended = false;
        user.SuspendedUntil = null;
        await SaveUserAsync(user);
        await Users.UpdateOneAsync(new BsonDocument("_id", ObjectId.Parse(user.Id)), new BsonDocument("$unset", new BsonDocument("suspendedUntil", 1)));
        return Done($"{user.Username} is active again");
    }

    // ---------- game settings ----------

    // GET /admin/settings
    [HttpGet("/admin/settings")]
    public async Task<IActionResult> SettingsPage() =>
        Page("Admin/Settings", new AdminSettingsViewModel { Settings = await SystemSettings.GetSingletonAsync(Db) });

    // POST /admin/settings  (XpValues.*, LevelBase, MatchmakingRangeStep)
    [HttpPost("/admin/settings")]
    public async Task<IActionResult> UpdateSettings(AdminSettingsForm form)
    {
        var x = form.XpValues ?? new XpValues();
        foreach (var v in new[] { x.MatchPlayed, x.MatchWon, x.PuzzleSolved, x.DailySolved, x.PracticeCompleted, x.QuizPublished })
            if (v < 0 || v > 1000) throw new HttpError(400, "Every XP value must be between 0 and 1000");
        if (form.LevelBase < 10) throw new HttpError(400, "Level base must be at least 10");
        if (form.MatchmakingRangeStep < 10 || form.MatchmakingRangeStep > 300) throw new HttpError(400, "Matchmaking range step must be between 10 and 300");

        var settings = await SystemSettings.GetSingletonAsync(Db);
        settings.XpValues = x;
        settings.LevelBase = form.LevelBase;
        settings.MatchmakingRangeStep = form.MatchmakingRangeStep;
        settings.UpdatedAt = DateTime.UtcNow;
        await Db.Collection<SystemSettings>("systemsettings").ReplaceOneAsync(s => s.Id == settings.Id, settings);
        return Done("Settings saved");
    }

    // ---------- seasons ----------

    // GET /admin/seasons?view=<seasonId>
    [HttpGet("/admin/seasons")]
    public async Task<IActionResult> SeasonsPage(string view)
    {
        var seasons = await Seasons.Find(_ => true).SortByDescending(s => s.Number).ToListAsync();
        return Page("Admin/Seasons", new AdminSeasonsViewModel
        {
            Seasons = seasons,
            Viewing = Ids.IsValid(view) ? seasons.FirstOrDefault(s => s.Id == view) : null,
        });
    }

    // POST /admin/seasons  (name)  - start a new season
    [HttpPost("/admin/seasons")]
    public async Task<IActionResult> StartSeason(string name)
    {
        if (await Seasons.Find(s => s.Status == "active").AnyAsync()) throw new HttpError(400, "End the current season first");
        var last = await Seasons.Find(_ => true).SortByDescending(s => s.Number).FirstOrDefaultAsync();
        var number = last == null ? 1 : last.Number + 1;
        var season = new Season { Number = number, Name = string.IsNullOrWhiteSpace(name) ? $"Season {number}" : name.Trim() };
        season.Stamp();
        await Seasons.InsertOneAsync(season);
        return Done($"{season.Name} started");
    }

    // POST /admin/seasons/{id}/end  - archive the leaderboard + soft-reset all ratings
    [HttpPost("/admin/seasons/{id}/end")]
    public async Task<IActionResult> EndSeason(string id)
    {
        var season = Ids.IsValid(id) ? await Seasons.Find(s => s.Id == id).FirstOrDefaultAsync() : null;
        if (season == null || season.Status != "active") throw new HttpError(400, "Season is not active");
        await _seasons.EndSeasonAsync(season);
        return Done($"{season.Name} ended. Ratings were moved halfway back to {PlayerRating.DefaultRating}.", $"/admin/seasons?view={season.Id}");
    }
}
