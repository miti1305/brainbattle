// MODEL (F20 Moontaha): an in-app notification.
using BrainBattle.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

namespace BrainBattle.Models;

public class Notification : Entity
{
    public static readonly string[] Types =
        { "friend_request", "friend_accepted", "challenge", "tournament", "badge", "level_up", "quiz_approved", "moderation" };

    [BsonRepresentation(BsonType.ObjectId)]
    public string User { get; set; }

    public string Type { get; set; }
    public string Title { get; set; }
    public string Message { get; set; } = "";
    public string Link { get; set; } = "";
    public bool Read { get; set; }
}

public class NotificationIndexes : IIndexSetup
{
    public Task CreateIndexesAsync(Db db) =>
        db.Raw("notifications").Indexes.CreateOneAsync(
            new CreateIndexModel<BsonDocument>(new BsonDocument { { "user", 1 }, { "read", 1 }, { "createdAt", -1 } }));
}
