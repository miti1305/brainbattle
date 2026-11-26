// Unique indexes for the shared collections (users, categories).
using BrainBattle.Models;
using MongoDB.Driver;

namespace BrainBattle.Core;

public class BaseIndexes : IIndexSetup
{
    public async Task CreateIndexesAsync(Db db)
    {
        var users = db.Collection<User>("users");
        await users.Indexes.CreateManyAsync(new[]
        {
            new CreateIndexModel<User>(Builders<User>.IndexKeys.Ascending(u => u.Email), new CreateIndexOptions { Unique = true }),
            new CreateIndexModel<User>(Builders<User>.IndexKeys.Ascending(u => u.Username), new CreateIndexOptions { Unique = true }),
        });
        await db.Collection<Category>("categories").Indexes.CreateOneAsync(
            new CreateIndexModel<Category>(Builders<Category>.IndexKeys.Ascending(c => c.Name), new CreateIndexOptions { Unique = true }));
    }
}
