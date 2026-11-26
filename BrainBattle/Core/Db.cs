// MongoDB connection (shared by every feature). Collection names match the old Mongoose names,
// so the existing data in MongoDB Atlas keeps working.
// Usage in a service:  _db.Collection<Quiz>("quizzes").Find(q => q.Status == "published")
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;

namespace BrainBattle.Core;

public class Db
{
    private static bool _conventionsRegistered;
    public IMongoDatabase Database { get; }

    public Db()
    {
        RegisterConventions();
        var uri = AppConfig.MongoUri;
        if (string.IsNullOrEmpty(uri))
            throw new InvalidOperationException("MONGODB_URI is missing. Create server/.env from server/.env.example");

        var url = new MongoUrl(uri);
        var client = new MongoClient(MongoClientSettings.FromUrl(url));
        Database = client.GetDatabase(string.IsNullOrEmpty(url.DatabaseName) ? "brainbattle" : url.DatabaseName);
    }

    public IMongoCollection<T> Collection<T>(string name) => Database.GetCollection<T>(name);

    // Untyped access, used for aggregation pipelines and reports.
    public IMongoCollection<BsonDocument> Raw(string name) => Database.GetCollection<BsonDocument>(name);

    // Runs an aggregation pipeline and returns the result documents.
    public async Task<List<BsonDocument>> AggregateAsync(string collection, params BsonDocument[] pipeline)
    {
        var cursor = await Raw(collection).AggregateAsync<BsonDocument>(pipeline);
        return await cursor.ToListAsync();
    }

    public static void RegisterConventions()
    {
        if (_conventionsRegistered) return;
        _conventionsRegistered = true;
        var pack = new ConventionPack
        {
            new CamelCaseElementNameConvention(),   // C# Username  <->  MongoDB "username"
            new IgnoreExtraElementsConvention(true), // ignore old fields such as "__v"
            new IgnoreIfNullConvention(true),        // do not store null values
        };
        ConventionRegistry.Register("BrainBattle", pack, _ => true);
        // Allow free-form values (e.g. puzzle grids) to be stored as plain objects.
        BsonSerializer.RegisterSerializer(new ObjectSerializer(_ => true));
    }

    // Ping on startup so a wrong connection string fails fast with a clear message.
    public async Task CheckConnectionAsync()
    {
        await Database.RunCommandAsync((Command<BsonDocument>)"{ ping: 1 }");
        var url = new MongoUrl(AppConfig.MongoUri);
        Console.WriteLine($"MongoDB connected: {string.Join(",", url.Servers.Select(s => s.Host))}/{Database.DatabaseNamespace.DatabaseName}");
    }
}
