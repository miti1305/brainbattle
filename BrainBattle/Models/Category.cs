// MODEL: Category (shared). Managed by admins in F10 (Farin); used by quizzes, practice, battles, leaderboards.
using BrainBattle.Core;
using MongoDB.Driver;

namespace BrainBattle.Models;

public class Category : Entity
{
    public string Name { get; set; }
    public string Icon { get; set; } = "";
    public int Order { get; set; }

    // All categories in display order (used by many pages for dropdowns).
    public static Task<List<Category>> AllAsync(Db db) =>
        db.Collection<Category>("categories").Find(_ => true).SortBy(c => c.Order).ThenBy(c => c.Name).ToListAsync();

    // id -> name for the given ids (like Mongoose populate('category', 'name')).
    public static async Task<Dictionary<string, string>> NamesAsync(Db db, IEnumerable<string> ids)
    {
        var list = ids.Where(Ids.IsValid).Distinct().ToList();
        if (list.Count == 0) return new Dictionary<string, string>();
        return (await db.Collection<Category>("categories").Find(c => list.Contains(c.Id)).ToListAsync())
            .ToDictionary(c => c.Id, c => c.Name);
    }
}
