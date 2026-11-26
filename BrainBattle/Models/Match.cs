// MODEL (shared contract, owned by F1 Abrar): one quiz battle between 2-4 players.
// Created by F1 battles, F2 ranked, F4 private rooms and F11 tournaments; read by F3, F5, F9, F13, F14, F15, F16.
// It lives in the base so every feature can read matches before F1 is merged.
// If you need a new field, agree with the team first, then add it here in a small PR.
using BrainBattle.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

namespace BrainBattle.Models;

public class Match : Entity
{
    public string Mode { get; set; } = "casual";     // ranked | private | tournament | casual
    public string Status { get; set; } = "waiting";  // waiting | active | finished | cancelled

    [BsonRepresentation(BsonType.ObjectId)]
    public string Category { get; set; }

    public List<MatchQuestion> Questions { get; set; } = new();
    public int QuestionTime { get; set; } = 15; // seconds per question
    public int CurrentIndex { get; set; } = -1;
    public int RevealedIndex { get; set; } = -1;
    public DateTime? QuestionStartedAt { get; set; }
    public List<MatchPlayer> Players { get; set; } = new();

    [BsonRepresentation(BsonType.ObjectId)]
    public string Room { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string Tournament { get; set; } // set by F11 (Mim)

    public int? BracketIndex { get; set; } // set by F11 (Mim)
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }

    public MatchPlayer PlayerOf(string userId) => Players.FirstOrDefault(p => p.User == userId);
}

public class MatchPlayer
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string User { get; set; }

    public string Username { get; set; }
    public int Score { get; set; }
    public int CorrectCount { get; set; }
    public List<MatchAnswer> Answers { get; set; } = new();
    public string Result { get; set; } // win | loss | draw | forfeit | null
    public bool Connected { get; set; }
    public bool Forfeited { get; set; }
    public int? RatingBefore { get; set; }
    public int? RatingAfter { get; set; }
}

public class MatchAnswer
{
    public int QIndex { get; set; }
    public int Choice { get; set; }
    public bool IsCorrect { get; set; }
    public long TimeMs { get; set; }
    public int Points { get; set; }
}

public class MatchQuestion
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string Quiz { get; set; }

    public string Text { get; set; }
    public string Type { get; set; }
    public string ImageUrl { get; set; }
    public List<string> Options { get; set; } = new();
    public int CorrectIndex { get; set; }
    public string Explanation { get; set; }
}

public class MatchIndexes : IIndexSetup
{
    public Task CreateIndexesAsync(Db db) =>
        db.Raw("matches").Indexes.CreateOneAsync(new CreateIndexModel<BsonDocument>(
            new BsonDocument { { "players.user", 1 }, { "status", 1 }, { "finishedAt", -1 } }));
}
