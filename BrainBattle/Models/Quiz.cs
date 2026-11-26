// MODEL: Quiz with embedded questions (shared contract).
// Extended by F8 Quiz Authoring (Farin); read by F1 Battle, F4 Rooms, F7 Daily, F19 Practice, F10 Admin content.
// If you need a new field, agree with the team first, then add it here in a small PR.
using System.Text.Json.Serialization;
using BrainBattle.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BrainBattle.Models;

public class Quiz : Entity
{
    public static readonly string[] Difficulties = { "easy", "medium", "hard" };
    public static readonly string[] QuestionTypes = { "mcq", "truefalse", "image" };

    public string Title { get; set; }
    public string Description { get; set; } = "";

    [BsonRepresentation(BsonType.ObjectId)]
    public string Category { get; set; }

    public string Difficulty { get; set; } = "medium";
    public string Status { get; set; } = "draft"; // draft | published
    public bool IsOfficial { get; set; } // approved into the official question bank (F10)
    public bool IsFeatured { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string Author { get; set; }

    public List<Question> Questions { get; set; } = new();
    public int PlayCount { get; set; }
}

public class Question
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    [JsonPropertyName("_id")]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string Text { get; set; }
    public string Type { get; set; } = "mcq"; // mcq | truefalse | image
    public string ImageUrl { get; set; } = "";
    public List<string> Options { get; set; } = new();
    public int CorrectIndex { get; set; }
    public string Explanation { get; set; } = "";
}
