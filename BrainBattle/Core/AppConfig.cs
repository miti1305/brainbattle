// Reads settings from BrainBattle/.env (loaded in Program.cs) and environment variables.
namespace BrainBattle.Core;

public static class AppConfig
{
    public static string Get(string key, string fallback = null)
    {
        var value = Environment.GetEnvironmentVariable(key);
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }

    public static int Port => int.TryParse(Get("PORT", "5050"), out var p) ? p : 5050;
    public static string MongoUri => Get("MONGODB_URI");
}
