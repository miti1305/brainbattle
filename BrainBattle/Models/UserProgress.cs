// MODEL (F17 Moontaha): XP, level, activity streak and counters used by badge rules.
using BrainBattle.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

namespace BrainBattle.Models;

public class UserProgress : Entity
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string User { get; set; }

    public int Xp { get; set; }
    public int Level { get; set; } = 1;
    public ProgressCounters Counters { get; set; } = new();
    public Streak Streak { get; set; } = new();
}

public class ProgressCounters
{
    public int MatchesPlayed { get; set; }
    public int MatchesWon { get; set; }
    public int PuzzlesSolved { get; set; }
    public int HardPuzzlesSolved { get; set; }
    public int DailySolved { get; set; }
    public int PracticeCompleted { get; set; }
    public int QuizzesPublished { get; set; }
}

public class Streak
{
    public int Current { get; set; }
    public int Best { get; set; }
    public string LastActiveDate { get; set; } // "YYYY-MM-DD"
}

public class UserProgressIndexes : IIndexSetup
{
    public Task CreateIndexesAsync(Db db) =>
        db.Raw("userprogresses").Indexes.CreateOneAsync(
            new CreateIndexModel<BsonDocument>(new BsonDocument("user", 1), new CreateIndexOptions { Unique = true }));
}
