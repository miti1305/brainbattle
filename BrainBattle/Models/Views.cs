// Small read-only shapes used by views and page scripts (like Mongoose .populate("user", "username")).
using System.Text.Json.Serialization;

namespace BrainBattle.Models;

// { _id, username } of a user.
public class UserRef
{
    [JsonPropertyName("_id")]
    public string Id { get; set; }
    public string Username { get; set; }

    public UserRef() { }
    public UserRef(string id, string username) { Id = id; Username = username; }
}

// { _id, name } of a category.
public class CategoryRef
{
    [JsonPropertyName("_id")]
    public string Id { get; set; }
    public string Name { get; set; }

    public CategoryRef() { }
    public CategoryRef(string id, string name) { Id = id; Name = name; }
}
