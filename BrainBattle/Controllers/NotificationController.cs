// CONTROLLER (F20 Moontaha): notification list, unread count, mark read, preferences.
// Page:   GET /notifications?unread=true&page=1  -> Views/Notifications/Index.cshtml
//         GET /notifications/{id}/open           -> marks it read and opens its link
// Forms:  POST /notifications/read-all, /notifications/{id}/delete, /notifications/preferences
// JSON:   GET /api/notifications/unread-count (navbar badge in site.js), GET /api/notifications
// NotificationListener creates notifications from other features' events; they are pushed live with SignalR.
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
public class NotificationController : AppController
{
    private const int PageSize = 30;

    private IMongoCollection<Notification> Notifications => Db.Collection<Notification>("notifications");
    private IMongoCollection<NotificationPreference> Preferences => Db.Collection<NotificationPreference>("notificationpreferences");

    private async Task<(List<Notification> items, bool hasMore)> ListAsync(bool unreadOnly, int page)
    {
        page = Math.Max(1, page);
        var filter = new BsonDocument("user", ObjectId.Parse(MeId));
        if (unreadOnly) filter["read"] = false;
        var items = await Notifications.Find(filter).SortByDescending(n => n.CreatedAt).Skip((page - 1) * PageSize).Limit(PageSize + 1).ToListAsync();
        return (items.Take(PageSize).ToList(), items.Count > PageSize);
    }

    // GET /notifications
    [HttpGet("/notifications")]
    public async Task<IActionResult> Index(bool unread = false, int page = 1)
    {
        var me = MeId;
        var (items, hasMore) = await ListAsync(unread, page);
        var pref = await Preferences.Find(p => p.User == me).FirstOrDefaultAsync();
        return Page("Notifications/Index", new NotificationsViewModel
        {
            UnreadOnly = unread,
            Page = Math.Max(1, page),
            HasMore = hasMore,
            Items = items,
            Disabled = pref?.Disabled ?? new List<string>(),
        });
    }

    // GET /notifications/{id}/open  - mark as read, then go to the notification's page
    [HttpGet("/notifications/{id}/open")]
    public async Task<IActionResult> Open(string id)
    {
        var me = MeId;
        if (!Ids.IsValid(id)) throw new HttpError(404, "Notification not found");
        var n = await Notifications.Find(x => x.Id == id && x.User == me).FirstOrDefaultAsync();
        if (n == null) throw new HttpError(404, "Notification not found");
        if (!n.Read) await Notifications.UpdateOneAsync(x => x.Id == id, Builders<Notification>.Update.Set(x => x.Read, true));
        var link = n.Link ?? "";
        return Redirect(link.StartsWith("/") && !link.StartsWith("//") ? link : "/notifications");
    }

    // POST /notifications/read-all
    [HttpPost("/notifications/read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var me = MeId;
        await Notifications.UpdateManyAsync(n => n.User == me && !n.Read, Builders<Notification>.Update.Set(n => n.Read, true));
        return Back("/notifications");
    }

    // POST /notifications/{id}/delete
    [HttpPost("/notifications/{id}/delete")]
    public async Task<IActionResult> Remove(string id)
    {
        var me = MeId;
        if (Ids.IsValid(id)) await Notifications.DeleteOneAsync(n => n.Id == id && n.User == me);
        return Back("/notifications");
    }

    // POST /notifications/preferences  (enabled = the ticked types)
    [HttpPost("/notifications/preferences")]
    public async Task<IActionResult> UpdatePreferences(List<string> enabled)
    {
        var me = MeId;
        enabled ??= new List<string>();
        var disabled = Notification.Types.Where(t => !enabled.Contains(t) && !NotificationService.AlwaysSent.Contains(t)).ToList();
        var pref = await Preferences.Find(p => p.User == me).FirstOrDefaultAsync() ?? new NotificationPreference { Id = Ids.NewId(), User = me };
        pref.Disabled = disabled;
        await Preferences.ReplaceOneAsync(p => p.User == me, pref, new ReplaceOptions { IsUpsert = true });
        return Done("Preferences saved");
    }

    // GET /api/notifications/unread-count  (navbar badge)
    [HttpGet("/api/notifications/unread-count")]
    public async Task<IActionResult> UnreadCount()
    {
        var me = MeId;
        return Ok(new { count = await Notifications.CountDocumentsAsync(n => n.User == me && !n.Read) });
    }

    // GET /api/notifications?unread=true&page=1
    [HttpGet("/api/notifications")]
    public async Task<IActionResult> List(bool unread = false, int page = 1)
    {
        var (items, hasMore) = await ListAsync(unread, page);
        return Ok(new { items, hasMore, page = Math.Max(1, page) });
    }
}
