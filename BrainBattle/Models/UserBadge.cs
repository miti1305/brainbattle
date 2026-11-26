// MODEL (F17 Moontaha): a badge earned by a user. The unique index makes double awards impossible.
using System.Text.Json.Serialization;
using BrainBattle.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

namespace BrainBattle.Models;

public class UserBadge
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    [JsonPropertyName("_id")]
    public string Id { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string User { get; set; }

    public string BadgeKey { get; set; }
    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;
}

public class UserBadgeIndexes : IIndexSetup
{
    public Task CreateIndexesAsync(Db db) =>
        db.Raw("userbadges").Indexes.CreateOneAsync(
            new CreateIndexModel<BsonDocument>(new BsonDocument { { "user", 1 }, { "badgeKey", 1 } }, new CreateIndexOptions { Unique = true }));
}
