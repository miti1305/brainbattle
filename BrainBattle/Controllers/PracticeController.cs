// CONTROLLER (F19 Moontaha): Solo Practice Mode - timed questions with an explanation after each answer.
// Practice never changes the ranked rating.
// Pages:  GET /practice?category=&quiz=&result=  -> Views/Practice/Index.cshtml (setup, last result, history)
//         GET /practice/{sessionId}             -> Views/Practice/Play.cshtml  (questions: wwwroot/js/practice.js)
// Forms:  POST /practice/start
// JSON:   POST /api/practice/{id}/answer { qIndex, choice, timeMs }, POST /api/practice/{id}/finish,
//         POST /api/practice/start, GET /api/practice/history
using System.Text.Json;
using BrainBattle.Core;
using BrainBattle.Models;
using BrainBattle.Services;
using BrainBattle.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BrainBattle.Controllers;

[Authorize]
public class PracticeController : AppController
{
    private const int PointsPerCorrect = 10;
    private readonly QuestionPickerService _picker;
    private readonly EventBus _bus;

    public PracticeController(QuestionPickerService picker, EventBus bus)
    {
        _picker = picker;
        _bus = bus;
    }

    private IMongoCollection<PracticeSession> Sessions => Db.Collection<PracticeSession>("practicesessions");

    private async Task<PracticeSession> LoadMineAsync(string id)
    {
        if (!Ids.IsValid(id)) throw new HttpError(404, "Session not found");
        var me = MeId;
        var s = await Sessions.Find(x => x.Id == id && x.User == me).FirstOrDefaultAsync();
        if (s == null) throw new HttpError(404, "Session not found");
        return s;
    }

    private Task SaveAsync(PracticeSession s)
    {
        s.UpdatedAt = DateTime.UtcNow;
        return Sessions.ReplaceOneAsync(x => x.Id == s.Id, s);
    }

    // Creates a session from the settings (same rules as before: 3-20 questions, 5-60 seconds).
    private async Task<PracticeSession> CreateSessionAsync(PracticeSetupForm f)
    {
        var count = Math.Min(20, Math.Max(3, f.Count <= 0 ? 10 : f.Count));
        var questionTime = Math.Min(60, Math.Max(5, f.QuestionTime <= 0 ? 20 : f.QuestionTime));
        var categoryId = f.CategoryId;
        var difficulty = f.Difficulty;

        List<PickedQuestion> questions;
        string quizId = null;
        if (!string.IsNullOrEmpty(f.QuizId))
        {
            var quizzes = Db.Collection<Quiz>("quizzes");
            var quiz = Ids.IsValid(f.QuizId) ? await quizzes.Find(q => q.Id == f.QuizId && q.Status == "published").FirstOrDefaultAsync() : null;
            if (quiz == null) throw new HttpError(404, "Quiz not found");
            quizId = quiz.Id;
            questions = quiz.Questions.OrderBy(_ => Random.Shared.Next()).Take(count).Select(q => new PickedQuestion
            {
                Quiz = quiz.Id, Category = quiz.Category, Text = q.Text, Type = q.Type, ImageUrl = q.ImageUrl,
                Options = q.Options, CorrectIndex = q.CorrectIndex, Explanation = q.Explanation,
            }).ToList();
            await quizzes.UpdateOneAsync(new BsonDocument("_id", ObjectId.Parse(quiz.Id)), new BsonDocument("$inc", new BsonDocument("playCount", 1)));
        }
        else
        {
            questions = await _picker.PickQuestionsAsync(categoryId, string.IsNullOrEmpty(difficulty) ? null : difficulty, count);
        }
        if (questions.Count == 0) throw new HttpError(400, "No questions found for these settings");

        var session = new PracticeSession
        {
            User = MeId,
            Category = Ids.IsValid(categoryId) ? categoryId : null,
            Quiz = quizId,
            Difficulty = string.IsNullOrEmpty(difficulty) ? null : difficulty,
            QuestionTime = questionTime,
            Questions = questions,
        };
        session.Stamp();
        await Sessions.InsertOneAsync(session);
        return session;
    }

    private async Task<List<PracticeHistoryRow>> HistoryAsync()
    {
        var me = MeId;
        var sessions = await Sessions.Find(s => s.User == me && s.Finished).SortByDescending(s => s.FinishedAt).Limit(20).ToListAsync();
        var cats = await Category.NamesAsync(Db, sessions.Select(s => s.Category));
        var quizIds = sessions.Select(s => s.Quiz).Where(Ids.IsValid).Distinct().ToList();
        var titles = (await Db.Collection<Quiz>("quizzes").Find(q => quizIds.Contains(q.Id)).ToListAsync()).ToDictionary(q => q.Id, q => q.Title);
        return sessions.Select(s => new PracticeHistoryRow
        {
            Id = s.Id,
            Label = s.Quiz != null && titles.TryGetValue(s.Quiz, out var t) ? t
                : s.Category != null && cats.TryGetValue(s.Category, out var c) ? c : "Mixed",
            Difficulty = s.Difficulty ?? "any",
            Correct = s.Correct,
            Total = s.Questions.Count,
            Score = s.Score,
            FinishedAt = s.FinishedAt,
        }).ToList();
    }

    // ---------- pages ----------

    // GET /practice?category=&quiz=&result=
    [HttpGet("/practice")]
    public async Task<IActionResult> Index(string category, string quiz, string result)
    {
        var model = new PracticeIndexViewModel
        {
            Setup = new PracticeSetupForm { CategoryId = category ?? "", QuizId = Ids.IsValid(quiz) ? quiz : null },
            Categories = await Category.AllAsync(Db),
            History = await HistoryAsync(),
        };
        if (model.Setup.QuizId != null)
        {
            var q = await Db.Collection<Quiz>("quizzes").Find(x => x.Id == model.Setup.QuizId).FirstOrDefaultAsync();
            model.QuizTitle = q?.Title;
        }
        if (Ids.IsValid(result))
        {
            var s = await LoadMineAsync(result);
            if (s.Finished) model.Result = s;
        }
        return Page("Practice/Index", model);
    }

    // POST /practice/start
    [HttpPost("/practice/start")]
    public async Task<IActionResult> StartForm(PracticeSetupForm form)
    {
        var session = await CreateSessionAsync(form);
        return Redirect($"/practice/{session.Id}");
    }

    // GET /practice/{sessionId}
    [HttpGet("/practice/{sessionId}")]
    public async Task<IActionResult> Play(string sessionId)
    {
        var s = await LoadMineAsync(sessionId);
        if (s.Finished) return Redirect($"/practice?result={s.Id}");
        var startIndex = Enumerable.Range(0, s.Questions.Count).FirstOrDefault(i => !s.Answers.Any(a => a.QIndex == i), s.Questions.Count);
        return Page("Practice/Play", new PracticePlayViewModel
        {
            SessionId = s.Id,
            QuestionTime = s.QuestionTime,
            Questions = s.Questions.Select(q => QuestionPickerService.HideAnswer(q.Text, q.Type, q.ImageUrl, q.Options)).ToList(),
            StartIndex = startIndex,
        });
    }

    // ---------- JSON for the practice script ----------

    // POST /api/practice/start  { categoryId?, difficulty?, count?, quizId?, questionTime? }
    [HttpPost("/api/practice/start")]
    public async Task<IActionResult> Start([FromBody] JsonElement body)
    {
        var session = await CreateSessionAsync(new PracticeSetupForm
        {
            CategoryId = Arg.Str(body, "categoryId"),
            Difficulty = Arg.Str(body, "difficulty"),
            Count = Arg.Int(body, "count"),
            QuestionTime = Arg.Int(body, "questionTime"),
            QuizId = Arg.Str(body, "quizId"),
        });
        return StatusCode(201, new
        {
            sessionId = session.Id,
            questionTime = session.QuestionTime,
            questions = session.Questions.Select(q => QuestionPickerService.HideAnswer(q.Text, q.Type, q.ImageUrl, q.Options)),
        });
    }

    public class AnswerBody
    {
        public int QIndex { get; set; }
        public int Choice { get; set; } = -1; // -1 = time ran out
        public long TimeMs { get; set; }
    }

    // POST /api/practice/{id}/answer  { qIndex, choice, timeMs }  (choice -1 = time ran out)
    [HttpPost("/api/practice/{id}/answer")]
    public async Task<IActionResult> Answer(string id, [FromBody] AnswerBody body)
    {
        var s = await LoadMineAsync(id);
        if (s.Finished) throw new HttpError(400, "This session is finished");
        var qIndex = body?.QIndex ?? -1;
        if (qIndex < 0 || qIndex >= s.Questions.Count) throw new HttpError(400, "Invalid question");
        if (s.Answers.Any(a => a.QIndex == qIndex)) throw new HttpError(400, "Already answered");
        var q = s.Questions[qIndex];
        var choice = body.Choice;
        var isCorrect = choice == q.CorrectIndex;
        s.Answers.Add(new PracticeAnswer { QIndex = qIndex, Choice = choice, IsCorrect = isCorrect, TimeMs = Math.Max(0, body.TimeMs) });
        if (isCorrect) s.Correct += 1;
        await SaveAsync(s);
        return Ok(new { isCorrect, correctIndex = q.CorrectIndex, explanation = q.Explanation });
    }

    // POST /api/practice/{id}/finish
    [HttpPost("/api/practice/{id}/finish")]
    public async Task<IActionResult> Finish(string id)
    {
        var s = await LoadMineAsync(id);
        if (!s.Finished)
        {
            s.Finished = true;
            s.FinishedAt = DateTime.UtcNow;
            s.Score = s.Correct * PointsPerCorrect;
            await SaveAsync(s);
            _bus.Emit(Events.PracticeCompleted, new EventData
            {
                ["userId"] = MeId, ["sessionId"] = s.Id, ["score"] = s.Score, ["correct"] = s.Correct, ["total"] = s.Questions.Count,
            });
        }
        return Ok(new
        {
            score = s.Score,
            correct = s.Correct,
            total = s.Questions.Count,
            review = s.Questions.Select((q, i) =>
            {
                var a = s.Answers.FirstOrDefault(x => x.QIndex == i);
                return new
                {
                    text = q.Text, options = q.Options, correctIndex = q.CorrectIndex, explanation = q.Explanation,
                    choice = a == null ? (int?)null : a.Choice,
                    isCorrect = a != null && a.IsCorrect,
                };
            }),
        });
    }

    // GET /api/practice/history
    [HttpGet("/api/practice/history")]
    public async Task<IActionResult> History() => Ok(new { sessions = await HistoryAsync() });
}
