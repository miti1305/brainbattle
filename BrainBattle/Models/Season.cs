// MODEL (F16 Moontaha): a ranked season. When it ends, the top players are archived.
using BrainBattle.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

namespace BrainBattle.Models;

public class Season : Entity
{
    public int Number { get; set; }
    public string Name { get; set; }
    public string Status { get; set; } = "active"; // active | ended
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAt { get; set; }
    public List<SeasonArchiveEntry> Archive { get; set; } = new();
}

public class SeasonArchiveEntry
{
    public int Rank { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string User { get; set; }

    public string Username { get; set; }
    public int Rating { get; set; }
    public string Tier { get; set; }
    public int Wins { get; set; }
}

public class SeasonIndexes : IIndexSetup
{
    public Task CreateIndexesAsync(Db db) =>
        db.Raw("seasons").Indexes.CreateOneAsync(
            new CreateIndexModel<BsonDocument>(new BsonDocument("number", 1), new CreateIndexOptions { Unique = true }));
}
