// F20 (Moontaha): live notifications.
// Server pushes "notification:new" to the group "user:<id>" (see Services/NotificationService.cs).
// A page script can call "notifications:readAll" to mark everything as read.
using System.Text.Json;
using BrainBattle.Core;
using MongoDB.Bson;
using Microsoft.AspNetCore.SignalR;

namespace BrainBattle.Hubs;

public partial class GameHub
{
    [HubMethodName("notifications:readAll")]
    public async Task<object> NotificationsReadAll(JsonElement data)
    {
        try
        {
            await Svc<Db>().Raw("notifications").UpdateManyAsync(
                new BsonDocument { { "user", ObjectId.Parse(UserId) }, { "read", false } },
                new BsonDocument("$set", new BsonDocument("read", true)));
            return new { ok = true };
        }
        catch (Exception ex) { return Fail(ex); }
    }
}
