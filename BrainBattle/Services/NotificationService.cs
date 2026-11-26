// F20 (Moontaha): creates notifications (respecting preferences) and pushes them live.
using BrainBattle.Core;
using BrainBattle.Models;
using MongoDB.Driver;

namespace BrainBattle.Services;

public class NotificationService
{
    public static readonly string[] AlwaysSent = { "moderation" }; // safety messages cannot be turned off

    private readonly Db _db;
    private readonly RealtimeService _realtime;

    public NotificationService(Db db, RealtimeService realtime)
    {
        _db = db;
        _realtime = realtime;
    }

    public async Task<Notification> NotifyAsync(string userId, string type, string title, string message = "", string link = "")
    {
        if (!Ids.IsValid(userId)) return null;
        if (!AlwaysSent.Contains(type))
        {
            var pref = await _db.Collection<NotificationPreference>("notificationpreferences").Find(p => p.User == userId).FirstOrDefaultAsync();
            if (pref != null && pref.Disabled.Contains(type)) return null;
        }
        var n = new Notification { User = userId, Type = type, Title = title, Message = message ?? "", Link = link ?? "" };
        n.Stamp();
        await _db.Collection<Notification>("notifications").InsertOneAsync(n);
        try
        {
            await _realtime.ToUser(userId, "notification:new", n);
        }
        catch
        {
            // Live push failed (e.g. nobody connected): the notification is still saved.
        }
        return n;
    }
}
