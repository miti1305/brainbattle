// MODEL (F19 Moontaha): one solo practice run. Never affects ranked rating.
using BrainBattle.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BrainBattle.Models;

public class PracticeSession : Entity
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string User { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string Category { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string Quiz { get; set; } // when practising one specific quiz

    public string Difficulty { get; set; }
    public int QuestionTime { get; set; } = 20;
    public List<PickedQuestion> Questions { get; set; } = new();
    public List<PracticeAnswer> Answers { get; set; } = new();
    public int Correct { get; set; }
    public int Score { get; set; }
    public bool Finished { get; set; }
    public DateTime? FinishedAt { get; set; }
}

public class PracticeAnswer
{
    public int QIndex { get; set; }
    public int Choice { get; set; }
    public bool IsCorrect { get; set; }
    public long TimeMs { get; set; }
}
