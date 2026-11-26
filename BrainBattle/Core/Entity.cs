// Base class of every MongoDB document: _id plus createdAt / updatedAt timestamps.
// The id is a string in C#, stored as an ObjectId in MongoDB and sent to the browser as "_id".
using System.Text.Json.Serialization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BrainBattle.Core;

public abstract class Entity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    [JsonPropertyName("_id")]
    public string Id { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Call before inserting a new document.
    public void Stamp()
    {
        if (string.IsNullOrEmpty(Id)) Id = ObjectId.GenerateNewId().ToString();
        var now = DateTime.UtcNow;
        if (CreatedAt == default) CreatedAt = now;
        UpdatedAt = now;
    }
}
