// MODEL (F18 Moontaha): audit log - every moderator action is recorded here.
using BrainBattle.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BrainBattle.Models;

public class ModerationLog : Entity
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string Moderator { get; set; }

    public string Action { get; set; } // dismiss | remove_content | warn | suspend

    [BsonRepresentation(BsonType.ObjectId)]
    public string Report { get; set; }

    public string TargetType { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string TargetId { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string TargetUser { get; set; }

    public string Note { get; set; }
}
