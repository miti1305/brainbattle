// MODEL (shared contract, owned by F3 Abrar): Elo rating, tier and weekly points of one player.
// Written by F1/F3 (Abrar); read by F13 clans, F15 analytics (Mim) and F16 seasons (Moontaha).
using BrainBattle.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

namespace BrainBattle.Models;

public class PlayerRating : Entity
{
    public const int DefaultRating = 1200;

    // Tier names and the minimum rating of each tier.
    public static readonly (string Name, int Min)[] Tiers =
    {
        ("Bronze", 0), ("Silver", 1100), ("Gold", 1300), ("Platinum", 1500), ("Diamond", 1700),
    };

    public static string TierFor(int rating)
    {
        var tier = Tiers[0].Name;
        foreach (var t in Tiers) if (rating >= t.Min) tier = t.Name;
        return tier;
    }

    [BsonRepresentation(BsonType.ObjectId)]
    public string User { get; set; }

    public int Rating { get; set; } = DefaultRating;
    public string Tier { get; set; } = "Silver";
    public int PeakRating { get; set; } = DefaultRating;
    public int GamesPlayed { get; set; }
    public int Wins { get; set; }
    public int Losses { get; set; }
    public int Draws { get; set; }
    public int WeeklyPoints { get; set; }
    public DateTime WeeklyUpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime RatedAt { get; set; } = DateTime.UtcNow; // when rating last changed (tie-breaker)
}

public class PlayerRatingIndexes : IIndexSetup
{
    public async Task CreateIndexesAsync(Db db)
    {
        var raw = db.Raw("playerratings");
        await raw.Indexes.CreateOneAsync(new CreateIndexModel<BsonDocument>(new BsonDocument("user", 1), new CreateIndexOptions { Unique = true }));
        await raw.Indexes.CreateOneAsync(new CreateIndexModel<BsonDocument>(new BsonDocument { { "rating", -1 }, { "ratedAt", 1 } }));
        await raw.Indexes.CreateOneAsync(new CreateIndexModel<BsonDocument>(new BsonDocument { { "weeklyPoints", -1 }, { "weeklyUpdatedAt", 1 } }));
    }
}
