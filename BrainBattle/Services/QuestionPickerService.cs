// SHARED: picks random questions from published quizzes (official ones first).
// Used by F1 Battle / F4 Rooms (Abrar) and F19 Solo Practice (Moontaha).
using BrainBattle.Core;
using BrainBattle.Models;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;

namespace BrainBattle.Services;

public class QuestionPickerService
{
    private readonly Db _db;

    public QuestionPickerService(Db db)
    {
        _db = db;
    }

    /// <param name="categoryId">only this category (optional)</param>
    /// <param name="difficulty">"easy" | "medium" | "hard" (optional)</param>
    public async Task<List<PickedQuestion>> PickQuestionsAsync(string categoryId = null, string difficulty = null, int count = 10)
    {
        var baseMatch = new BsonDocument("status", "published");
        if (Ids.IsValid(categoryId)) baseMatch["category"] = ObjectId.Parse(categoryId);
        if (!string.IsNullOrEmpty(difficulty)) baseMatch["difficulty"] = difficulty;

        var official = baseMatch.DeepClone().AsBsonDocument;
        official["isOfficial"] = true;

        var questions = await SampleAsync(official, count);
        if (questions.Count < count)
        {
            var seen = new HashSet<string>(questions.Select(q => q.Text));
            var extra = (await SampleAsync(baseMatch, count * 2)).Where(q => !seen.Contains(q.Text));
            questions = questions.Concat(extra).Take(count).ToList();
        }

        var quizIds = questions.Select(q => q.Quiz).Distinct().Select(ObjectId.Parse).ToList();
        if (quizIds.Count > 0)
        {
            await _db.Raw("quizzes").UpdateManyAsync(
                new BsonDocument("_id", new BsonDocument("$in", new BsonArray(quizIds))),
                new BsonDocument("$inc", new BsonDocument("playCount", 1)));
        }
        return questions;
    }

    private async Task<List<PickedQuestion>> SampleAsync(BsonDocument match, int size)
    {
        var pipeline = new[]
        {
            new BsonDocument("$match", match),
            new BsonDocument("$unwind", "$questions"),
            new BsonDocument("$sample", new BsonDocument("size", size)),
            new BsonDocument("$project", new BsonDocument
            {
                { "_id", 0 },
                { "quiz", "$_id" },
                { "category", "$category" },
                { "text", "$questions.text" },
                { "type", "$questions.type" },
                { "imageUrl", "$questions.imageUrl" },
                { "options", "$questions.options" },
                { "correctIndex", "$questions.correctIndex" },
                { "explanation", "$questions.explanation" },
            }),
        };
        var docs = await _db.AggregateAsync("quizzes", pipeline);
        return docs.Select(d => BsonSerializer.Deserialize<PickedQuestion>(d)).ToList();
    }

    // Removes answers before sending questions to players.
    public static object HideAnswer(string text, string type, string imageUrl, List<string> options) =>
        new { text, type, imageUrl, options };
}
