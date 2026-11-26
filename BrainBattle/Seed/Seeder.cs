// Run with:  dotnet run -- seed   (from the server folder)
// Creates the default categories, one admin account and sample official quizzes. Safe to run more than once.
using BrainBattle.Core;
using BrainBattle.Models;
using MongoDB.Driver;

namespace BrainBattle.Seed;

public static class Seeder
{
    private static readonly string[] Categories =
        { "General Knowledge", "Science", "Mathematics", "History", "Programming", "Bangladesh", "Sports", "Movies & Music" };

    public static async Task RunAsync(Db db)
    {
        var categories = db.Collection<Category>("categories");
        for (var i = 0; i < Categories.Length; i++)
        {
            var name = Categories[i];
            if (await categories.Find(c => c.Name == name).AnyAsync()) continue;
            var cat = new Category { Name = name, Order = i };
            cat.Stamp();
            await categories.InsertOneAsync(cat);
        }
        Console.WriteLine($"Categories ready ({Categories.Length})");

        var users = db.Collection<User>("users");
        var email = (AppConfig.Get("SEED_ADMIN_EMAIL", "admin@brainbattle.local")).ToLowerInvariant();
        var admin = await users.Find(u => u.Email == email).FirstOrDefaultAsync();
        if (admin == null)
        {
            admin = new User
            {
                Username = AppConfig.Get("SEED_ADMIN_USERNAME", "admin"),
                Email = email,
                PasswordHash = User.HashPassword(AppConfig.Get("SEED_ADMIN_PASSWORD", "Admin@12345")),
                Role = "admin",
            };
            admin.Stamp();
            await users.InsertOneAsync(admin);
            Console.WriteLine($"Admin created: {email}");
        }
        else
        {
            Console.WriteLine($"Admin already exists: {email}");
        }

        var quizzes = db.Collection<Quiz>("quizzes");
        var added = 0;
        foreach (var q in SampleQuizzes.All)
        {
            if (await quizzes.Find(x => x.Title == q.Title).AnyAsync()) continue;
            var category = await categories.Find(c => c.Name == q.Category).FirstOrDefaultAsync();
            if (category == null) continue;
            var quiz = new Quiz
            {
                Title = q.Title,
                Description = $"Sample {q.Category} quiz",
                Category = category.Id,
                Difficulty = q.Difficulty,
                Status = "published",
                IsOfficial = true,
                Author = admin.Id,
                Questions = q.Questions.Select(x => new Question
                {
                    Text = x.Text,
                    Type = "mcq",
                    Options = x.Options.ToList(),
                    CorrectIndex = x.CorrectIndex,
                    Explanation = x.Explanation,
                }).ToList(),
            };
            quiz.Stamp();
            await quizzes.InsertOneAsync(quiz);
            added++;
        }
        Console.WriteLine($"Sample quizzes added: {added}");
    }
}
