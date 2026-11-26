// CONTROLLER (F18 Moontaha): users report content; moderators review a queue and
// dismiss, remove content, warn or suspend. Every action is written to the audit log.
// Page:   GET /moderation?tab=open|actioned|dismissed|logs  -> Views/Moderation/Index.cshtml (moderators/admins)
// Forms:  POST /moderation/reports  (any user, from the shared Report button: Views/Shared/_ReportButton.cshtml)
//         POST /moderation/reports/{id}/dismiss | remove | warn | suspend  (moderators/admins)
// JSON:   POST /api/moderation/reports, GET /api/moderation/reports/mine
using System.Text.Json;
using BrainBattle.Core;
using BrainBattle.Models;
using BrainBattle.Services;
using BrainBattle.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BrainBattle.Controllers;

[Authorize]
public class ModerationController : AppController
{
    private readonly EventBus _bus;
    private readonly RealtimeService _realtime;

    public ModerationController(EventBus bus, RealtimeService realtime)
    {
        _bus = bus;
        _realtime = realtime;
    }

    private IMongoCollection<Report> Reports => Db.Collection<Report>("reports");
    private IMongoCollection<Quiz> Quizzes => Db.Collection<Quiz>("quizzes");
    private IMongoCollection<User> Users => Db.Collection<User>("users");

    // Finds who owns the reported thing and a short preview for moderators.
    // Feed posts (F14, Mim) are read straight from the "activities" collection.
    private async Task<(string owner, string preview)> DescribeTargetAsync(string targetType, string targetId, int? questionIndex)
    {
        if (targetType == "quiz" || targetType == "question")
        {
            var quiz = await Quizzes.Find(q => q.Id == targetId).FirstOrDefaultAsync();
            if (quiz == null) throw new HttpError(404, "Quiz not found");
            if (targetType == "question")
            {
                var i = questionIndex ?? -1;
                if (i < 0 || i >= quiz.Questions.Count) throw new HttpError(400, "Question not found");
                return (quiz.Author, $"{quiz.Title} - Q{i + 1}: {quiz.Questions[i].Text}");
            }
            return (quiz.Author, $"Quiz: {quiz.Title}");
        }
        if (targetType == "activity")
        {
            var a = await Db.Raw("activities").Find(new BsonDocument("_id", ObjectId.Parse(targetId))).FirstOrDefaultAsync();
            if (a == null) throw new HttpError(404, "Post not found");
            return (a["user"].ToString(), $"{a.GetValue("username", "")} {a.GetValue("text", "")}");
        }
        var user = await Users.Find(u => u.Id == targetId).FirstOrDefaultAsync();
        if (user == null) throw new HttpError(404, "User not found");
        return (user.Id, $"User: {user.Username}");
    }

    private async Task<Report> CreateReportAsync(string targetType, string targetId, int? questionIndex, string reason, string details)
    {
        var me = MeId;
        details ??= "";
        if (!Report.TargetTypes.Contains(targetType)) throw new HttpError(400, "Unknown report type");
        if (!Ids.IsValid(targetId)) throw new HttpError(400, "Invalid target");
        if (string.IsNullOrWhiteSpace(reason)) throw new HttpError(400, "Choose a reason");
        if (targetType == "question" && (questionIndex == null || questionIndex < 0)) throw new HttpError(400, "Question number is missing");
        if (targetType != "question") questionIndex = null;
        if (details.Length > 500) throw new HttpError(400, "Details can be at most 500 characters");

        var duplicate = await Reports.Find(r => r.Reporter == me && r.TargetType == targetType && r.TargetId == targetId &&
                                                r.QuestionIndex == questionIndex && r.Status == "open").AnyAsync();
        if (duplicate) throw new HttpError(409, "You already reported this. A moderator will review it.");

        var (owner, preview) = await DescribeTargetAsync(targetType, targetId, questionIndex);
        if (owner == me) throw new HttpError(400, "You cannot report your own content");

        var report = new Report
        {
            Reporter = me, TargetType = targetType, TargetId = targetId, QuestionIndex = questionIndex,
            TargetOwner = owner, Preview = preview, Reason = reason, Details = details,
        };
        report.Stamp();
        await Reports.InsertOneAsync(report);
        return report;
    }

    // POST /moderation/reports  (targetType, targetId, questionIndex, reason, details)  - any user
    [HttpPost("/moderation/reports")]
    public async Task<IActionResult> CreateReportForm(string targetType, string targetId, int? questionIndex, string reason, string details)
    {
        await CreateReportAsync(targetType, targetId, questionIndex, reason, details);
        return Done("Report sent. Thank you!");
    }

    // POST /api/moderation/reports  { targetType, targetId, questionIndex, reason, details }  - any user
    [HttpPost("/api/moderation/reports")]
    public async Task<IActionResult> CreateReport([FromBody] JsonElement body)
    {
        int? questionIndex = body.ValueKind == JsonValueKind.Object && body.TryGetProperty("questionIndex", out var qi) && qi.ValueKind != JsonValueKind.Null
            ? Arg.Int(body, "questionIndex", -1)
            : null;
        var report = await CreateReportAsync(Arg.Str(body, "targetType"), Arg.Str(body, "targetId"), questionIndex,
            Arg.Str(body, "reason"), Arg.Str(body, "details", ""));
        return StatusCode(201, new { report });
    }

    // GET /api/moderation/reports/mine
    [HttpGet("/api/moderation/reports/mine")]
    public async Task<IActionResult> MyReports()
    {
        var me = MeId;
        var reports = await Reports.Find(r => r.Reporter == me).SortByDescending(r => r.CreatedAt).Limit(50).ToListAsync();
        return Ok(new { reports });
    }

    // ---------- moderators / admins only ----------

    private async Task<Dictionary<string, User>> UsersByIdAsync(IEnumerable<string> ids)
    {
        var list = ids.Where(Ids.IsValid).Distinct().ToList();
        return (await Users.Find(u => list.Contains(u.Id)).ToListAsync()).ToDictionary(u => u.Id);
    }

    // GET /moderation?tab=open|actioned|dismissed|logs
    [HttpGet("/moderation")]
    [Authorize(Roles = "moderator,admin")]
    public async Task<IActionResult> Index(string tab = "open")
    {
        tab = ModerationViewModel.Tabs.Any(t => t.Key == tab) ? tab : "open";
        var model = new ModerationViewModel { Tab = tab };
        if (tab == "logs")
        {
            var logs = await Db.Collection<ModerationLog>("moderationlogs").Find(_ => true).SortByDescending(l => l.CreatedAt).Limit(200).ToListAsync();
            var users = await UsersByIdAsync(logs.SelectMany(l => new[] { l.Moderator, l.TargetUser }));
            string Name(string id) => id != null && users.TryGetValue(id, out var u) ? u.Username : null;
            model.Logs = logs.Select(l => new LogRow { Log = l, ModeratorName = Name(l.Moderator), TargetUserName = Name(l.TargetUser) }).ToList();
        }
        else
        {
            var sort = tab == "open" ? Builders<Report>.Sort.Ascending(r => r.CreatedAt) : Builders<Report>.Sort.Descending(r => r.CreatedAt);
            var reports = await Reports.Find(r => r.Status == tab).Sort(sort).Limit(100).ToListAsync();
            var users = await UsersByIdAsync(reports.SelectMany(r => new[] { r.Reporter, r.TargetOwner, r.ResolvedBy }));
            model.Reports = reports.Select(r => new ReportRow
            {
                Report = r,
                ReporterName = users.GetValueOrDefault(r.Reporter ?? "")?.Username,
                OwnerName = users.GetValueOrDefault(r.TargetOwner ?? "")?.Username,
                OwnerSuspended = users.GetValueOrDefault(r.TargetOwner ?? "")?.IsSuspended ?? false,
                ResolvedByName = users.GetValueOrDefault(r.ResolvedBy ?? "")?.Username,
            }).ToList();
        }
        return Page("Moderation/Index", model);
    }

    private async Task<Report> OpenReportAsync(string id)
    {
        if (!Ids.IsValid(id)) throw new HttpError(404, "Report not found");
        var report = await Reports.Find(r => r.Id == id).FirstOrDefaultAsync();
        if (report == null) throw new HttpError(404, "Report not found");
        if (report.Status != "open") throw new HttpError(400, "This report is already resolved");
        return report;
    }

    private async Task ResolveAsync(Report report, string status, string action, string note)
    {
        var now = DateTime.UtcNow;
        report.Status = status;
        report.ResolvedBy = MeId;
        report.ResolvedAt = now;
        report.Resolution = string.IsNullOrEmpty(note) ? action : note;
        report.UpdatedAt = now;
        await Reports.ReplaceOneAsync(r => r.Id == report.Id, report);

        var log = new ModerationLog
        {
            Moderator = MeId, Action = action, Report = report.Id, TargetType = report.TargetType,
            TargetId = report.TargetId, TargetUser = report.TargetOwner, Note = note,
        };
        log.Stamp();
        await Db.Collection<ModerationLog>("moderationlogs").InsertOneAsync(log);

        // Close other open reports about exactly the same thing.
        var filter = new BsonDocument
        {
            { "_id", new BsonDocument("$ne", ObjectId.Parse(report.Id)) },
            { "status", "open" },
            { "targetType", report.TargetType },
            { "targetId", ObjectId.Parse(report.TargetId) },
        };
        if (report.QuestionIndex.HasValue) filter["questionIndex"] = report.QuestionIndex.Value;
        else filter["questionIndex"] = new BsonDocument("$exists", false);
        await Reports.UpdateManyAsync(filter, new BsonDocument("$set", new BsonDocument
        {
            { "status", status }, { "resolvedBy", ObjectId.Parse(MeId) }, { "resolvedAt", now },
            { "resolution", $"Resolved with report {report.Id}" },
        }));
    }

    // POST /moderation/reports/{id}/dismiss  (note)
    [HttpPost("/moderation/reports/{id}/dismiss")]
    [Authorize(Roles = "moderator,admin")]
    public async Task<IActionResult> Dismiss(string id, string note)
    {
        var report = await OpenReportAsync(id);
        await ResolveAsync(report, "dismissed", "dismiss", string.IsNullOrWhiteSpace(note) ? "No problem found" : note);
        return Done("Report dismissed");
    }

    // POST /moderation/reports/{id}/remove  (note)  - removes the reported content
    [HttpPost("/moderation/reports/{id}/remove")]
    [Authorize(Roles = "moderator,admin")]
    public async Task<IActionResult> RemoveContent(string id, string note)
    {
        var report = await OpenReportAsync(id);
        if (report.TargetType == "quiz")
        {
            await Quizzes.UpdateOneAsync(new BsonDocument("_id", ObjectId.Parse(report.TargetId)),
                new BsonDocument("$set", new BsonDocument { { "status", "draft" }, { "isOfficial", false }, { "isFeatured", false } }));
        }
        else if (report.TargetType == "question")
        {
            var quiz = await Quizzes.Find(q => q.Id == report.TargetId).FirstOrDefaultAsync();
            var i = report.QuestionIndex ?? -1;
            if (quiz != null && i >= 0 && i < quiz.Questions.Count)
            {
                quiz.Questions.RemoveAt(i);
                if (quiz.Questions.Count == 0) quiz.Status = "draft";
                quiz.UpdatedAt = DateTime.UtcNow;
                await Quizzes.ReplaceOneAsync(q => q.Id == quiz.Id, quiz);
            }
        }
        else if (report.TargetType == "activity")
        {
            await Db.Raw("activities").DeleteOneAsync(new BsonDocument("_id", ObjectId.Parse(report.TargetId)));
        }
        else
        {
            throw new HttpError(400, "Users cannot be removed. Warn or suspend them instead.");
        }
        await ResolveAsync(report, "actioned", "remove_content", string.IsNullOrWhiteSpace(note) ? report.Reason : note);
        _bus.Emit(Events.ModerationWarning, new EventData
        {
            ["userId"] = report.TargetOwner,
            ["message"] = $"Your content was removed by a moderator ({report.Reason}).",
        });
        return Done("Content removed");
    }

    // POST /moderation/reports/{id}/warn  (message)
    [HttpPost("/moderation/reports/{id}/warn")]
    [Authorize(Roles = "moderator,admin")]
    public async Task<IActionResult> Warn(string id, string message)
    {
        var report = await OpenReportAsync(id);
        message = string.IsNullOrWhiteSpace(message) ? $"Please follow the community rules ({report.Reason})." : message;
        await ResolveAsync(report, "actioned", "warn", message);
        _bus.Emit(Events.ModerationWarning, new EventData { ["userId"] = report.TargetOwner, ["message"] = message });
        return Done("Warning sent");
    }

    // POST /moderation/reports/{id}/suspend  (days, note)
    [HttpPost("/moderation/reports/{id}/suspend")]
    [Authorize(Roles = "moderator,admin")]
    public async Task<IActionResult> Suspend(string id, double? days, string note)
    {
        var report = await OpenReportAsync(id);
        var user = await Users.Find(u => u.Id == report.TargetOwner).FirstOrDefaultAsync();
        if (user == null) throw new HttpError(404, "User not found");
        if (user.Role == "admin") throw new HttpError(403, "Admins cannot be suspended");
        if (user.Role == "moderator" && CurrentUser.Role != "admin") throw new HttpError(403, "Only admins can suspend moderators");

        var d = (int)Math.Min(365, Math.Max(1, days is > 0 ? days.Value : 3));
        user.IsSuspended = true;
        user.SuspendedUntil = DateTime.UtcNow.AddDays(d);
        user.UpdatedAt = DateTime.UtcNow;
        await Users.ReplaceOneAsync(u => u.Id == user.Id, user);

        await ResolveAsync(report, "actioned", "suspend", string.IsNullOrWhiteSpace(note) ? $"Suspended for {d} day(s)" : note);
        _bus.Emit(Events.UserSuspended, new EventData { ["userId"] = user.Id, ["until"] = user.SuspendedUntil, ["reason"] = report.Reason });
        // Tell the user's open pages; their next request logs them out (Core/AuthSetup.cs).
        await _realtime.ToUser(user.Id, "account:suspended", new { until = user.SuspendedUntil });
        return Done($"{user.Username} is suspended for {d} day(s)");
    }
}
