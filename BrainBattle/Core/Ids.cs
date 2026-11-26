// Helpers for MongoDB ObjectIds (24 hex characters).
using MongoDB.Bson;

namespace BrainBattle.Core;

public static class Ids
{
    public static bool IsValid(string id) => !string.IsNullOrEmpty(id) && ObjectId.TryParse(id, out _);

    // Parses an id coming from the URL or the request body; invalid ids become a 400 error.
    public static ObjectId Oid(string id, string name = "id")
    {
        if (!string.IsNullOrEmpty(id) && ObjectId.TryParse(id, out var oid)) return oid;
        throw new HttpError(400, $"Invalid {name}");
    }

    public static string NewId() => ObjectId.GenerateNewId().ToString();

    public static bool Same(string a, string b) => string.Equals(a, b, StringComparison.Ordinal);
}
