// View models for F16 Admin Dashboard, User & Season Management (Moontaha, admin only).
using BrainBattle.Models;

namespace BrainBattle.ViewModels;

public class AdminStatsViewModel
{
    public long TotalUsers { get; set; }
    public long NewUsers7d { get; set; }
    public long SuspendedUsers { get; set; }
    public long MatchesToday { get; set; }
    public long PublishedQuizzes { get; set; }
    public long PuzzlesSolved { get; set; }
    public int ActivePlayers7d { get; set; }
    public List<DayCount> MatchesPerDay { get; set; } = new();
    public List<NameCount> PopularCategories { get; set; } = new();
}

public record DayCount(string Date, int Matches);

public record NameCount(string Name, int Matches);

public class AdminUsersViewModel
{
    public string Q { get; set; }
    public string Role { get; set; }
    public string Suspended { get; set; }
    public int Page { get; set; } = 1;
    public int Pages { get; set; } = 1;
    public long Total { get; set; }
    public List<User> Users { get; set; } = new();
    public string MeId { get; set; }

    public string PageUrl(int page) =>
        $"/admin/users?q={Uri.EscapeDataString(Q ?? "")}&role={Role}&suspended={Suspended}&page={page}";
}

public class AdminSettingsViewModel
{
    public static readonly (string Key, string Label)[] XpLabels =
    {
        ("MatchPlayed", "Play a battle"),
        ("MatchWon", "Win a battle (extra)"),
        ("PuzzleSolved", "Solve a puzzle"),
        ("DailySolved", "Solve the Daily Challenge (extra)"),
        ("PracticeCompleted", "Finish a practice session"),
        ("QuizPublished", "Publish a quiz"),
    };

    public SystemSettings Settings { get; set; }

    public int XpValue(string key) => key switch
    {
        "MatchPlayed" => Settings.XpValues.MatchPlayed,
        "MatchWon" => Settings.XpValues.MatchWon,
        "PuzzleSolved" => Settings.XpValues.PuzzleSolved,
        "DailySolved" => Settings.XpValues.DailySolved,
        "PracticeCompleted" => Settings.XpValues.PracticeCompleted,
        "QuizPublished" => Settings.XpValues.QuizPublished,
        _ => 0,
    };
}

// Form fields of the game settings page.
public class AdminSettingsForm
{
    public XpValues XpValues { get; set; } = new();
    public int LevelBase { get; set; }
    public int MatchmakingRangeStep { get; set; }
}

public class AdminSeasonsViewModel
{
    public List<Season> Seasons { get; set; } = new();
    public Season Active => Seasons.FirstOrDefault(s => s.Status == "active");
    public Season Viewing { get; set; } // ended season whose final standings are shown
}
