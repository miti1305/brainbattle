// Short helpers for atomic MongoDB updates written as BSON (like Mongoose findOneAndUpdate).
// Example:
//   var match = await matches.FindAndUpdateAsync(
//       new BsonDocument { { "_id", Ids.Oid(id) }, { "status", "waiting" } },
//       new BsonDocument("$set", new BsonDocument("status", "active")));
// Plain updates work directly with BSON too:  await matches.UpdateOneAsync(filterBson, updateBson);
using MongoDB.Bson;
using MongoDB.Driver;

namespace BrainBattle.Core;

public static class MongoExtensions
{
    // Updates one document and returns the NEW version (or null if nothing matched).
    public static Task<T> FindAndUpdateAsync<T>(this IMongoCollection<T> collection, BsonDocument filter, BsonDocument update, bool upsert = false)
    {
        var options = new FindOneAndUpdateOptions<T, T> { ReturnDocument = ReturnDocument.After, IsUpsert = upsert };
        return collection.FindOneAndUpdateAsync<T>(filter, update, options);
    }

    public static Task<List<T>> FindAllAsync<T>(this IMongoCollection<T> collection, BsonDocument filter) =>
        collection.Find(new BsonDocumentFilterDefinition<T>(filter)).ToListAsync();

    public static Task<T> FindFirstAsync<T>(this IMongoCollection<T> collection, BsonDocument filter) =>
        collection.Find(new BsonDocumentFilterDefinition<T>(filter)).FirstOrDefaultAsync();
}
