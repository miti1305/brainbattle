// A question copied out of a quiz by QuestionPickerService (shared by battles and practice).
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BrainBattle.Models;

public class PickedQuestion
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string Quiz { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string Category { get; set; }

    public string Text { get; set; }
    public string Type { get; set; } = "mcq";
    public string ImageUrl { get; set; } = "";
    public List<string> Options { get; set; } = new();
    public int CorrectIndex { get; set; }
    public string Explanation { get; set; } = "";
}
