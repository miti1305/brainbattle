// MODEL (F20 Moontaha): notification types a user turned off.
using System.Text.Json.Serialization;
using BrainBattle.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

namespace BrainBattle.Models;

public class NotificationPreference
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    [JsonPropertyName("_id")]
    public string Id { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string User { get; set; }

    public List<string> Disabled { get; set; } = new();
}

public class NotificationPreferenceIndexes : IIndexSetup
{
    public Task CreateIndexesAsync(Db db) =>
        db.Raw("notificationpreferences").Indexes.CreateOneAsync(
            new CreateIndexModel<BsonDocument>(new BsonDocument("user", 1), new CreateIndexOptions { Unique = true }));
}
