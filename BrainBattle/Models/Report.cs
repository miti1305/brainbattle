// MODEL (F18 Moontaha): a user report about content or another user.
using BrainBattle.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BrainBattle.Models;

public class Report : Entity
{
    public static readonly string[] TargetTypes = { "quiz", "question", "user", "activity" };

    [BsonRepresentation(BsonType.ObjectId)]
    public string Reporter { get; set; }

    public string TargetType { get; set; }  // quiz | question | user | activity

    [BsonRepresentation(BsonType.ObjectId)]
    public string TargetId { get; set; }    // quiz id for "question"

    public int? QuestionIndex { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string TargetOwner { get; set; } // who made the content

    public string Preview { get; set; }     // short text so moderators see what was reported
    public string Reason { get; set; }
    public string Details { get; set; } = ""; // max 500 characters
    public string Status { get; set; } = "open"; // open | dismissed | actioned

    [BsonRepresentation(BsonType.ObjectId)]
    public string ResolvedBy { get; set; }

    public DateTime? ResolvedAt { get; set; }
    public string Resolution { get; set; }
}
