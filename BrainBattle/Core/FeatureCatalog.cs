// Read-only list of the 20 features (who owns them and where their page is).
// Used by the dashboard, the navbar and the "Coming soon" page for features that are not merged yet.
namespace BrainBattle.Core;

public record FeatureInfo(string Id, string Name, string Owner, string Level, string Path, string[] Roles = null);

public static class FeatureCatalog
{
    public static readonly FeatureInfo[] All =
    {
        new("F1", "Real-Time Multiplayer Quiz Battle", "Abrar", "Hard", "/battle"),
        new("F2", "Skill-Based Matchmaking", "Abrar", "Medium", "/ranked"),
        new("F3", "Ranked Rating & Leaderboards", "Abrar", "Medium", "/leaderboards"),
        new("F4", "Private Game Rooms", "Abrar", "Easy", "/rooms"),
        new("F5", "Match History & Review", "Abrar", "Easy", "/history"),
        new("F6", "Interactive Puzzle Engine", "Farin", "Hard", "/puzzles"),
        new("F7", "Daily Challenge", "Farin", "Medium", "/daily"),
        new("F8", "Quiz Authoring & Publishing Workflow", "Farin", "Medium", "/my-quizzes"),
        new("F9", "Personalized Quiz Recommendations", "Farin", "Easy", "/recommended"),
        new("F10", "Category & Official Question Bank Management (Admin)", "Farin", "Easy", "/admin/content", new[] { "admin" }),
        new("F11", "Tournament Management", "Mim", "Hard", "/tournaments"),
        new("F12", "Friends & Social Connections", "Mim", "Medium", "/friends"),
        new("F13", "Clans / Study Groups", "Mim", "Medium", "/clans"),
        new("F14", "Activity Feed & Result Sharing", "Mim", "Easy", "/feed"),
        new("F15", "Performance Analytics Dashboard", "Mim", "Easy", "/analytics"),
        new("F16", "Admin Dashboard, User & Season Management (Admin)", "Moontaha", "Hard", "/admin", new[] { "admin" }),
        new("F17", "Progression System (XP, Levels, Streaks & Badges)", "Moontaha", "Medium", "/achievements"),
        new("F18", "Content Moderation & Reporting", "Moontaha", "Medium", "/moderation", new[] { "moderator", "admin" }),
        new("F19", "Solo Practice Mode", "Moontaha", "Easy", "/practice"),
        new("F20", "Notification Center", "Moontaha", "Easy", "/notifications"),
    };

    public static readonly string[] Members = { "Abrar", "Farin", "Mim", "Moontaha" };

    // Main navbar links (same as before).
    public static readonly (string Path, string Label)[] MainLinks =
    {
        ("/practice", "Practice"), ("/ranked", "Ranked"), ("/puzzles", "Puzzles"), ("/daily", "Daily"),
        ("/tournaments", "Tournaments"), ("/leaderboards", "Leaderboards"), ("/friends", "Friends"), ("/feed", "Feed"),
    };

    // The feature whose page path is the longest match for this URL path (e.g. /rooms/ABC123 -> F4).
    public static FeatureInfo ForPath(string path)
    {
        path = (path ?? "").ToLowerInvariant().TrimEnd('/');
        return All.Where(f => path == f.Path || path.StartsWith(f.Path + "/"))
            .OrderByDescending(f => f.Path.Length)
            .FirstOrDefault();
    }

    public static bool Allowed(FeatureInfo f, string role) => f.Roles == null || f.Roles.Contains(role);
}
