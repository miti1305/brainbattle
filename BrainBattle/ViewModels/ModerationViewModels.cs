// View models for F18 Content Moderation & Reporting (Moontaha).
using BrainBattle.Models;

namespace BrainBattle.ViewModels;

public class ReportRow
{
    public Report Report { get; set; }
    public string ReporterName { get; set; }
    public string OwnerName { get; set; }
    public bool OwnerSuspended { get; set; }
    public string ResolvedByName { get; set; }
}

public class LogRow
{
    public ModerationLog Log { get; set; }
    public string ModeratorName { get; set; }
    public string TargetUserName { get; set; }
}

public class ModerationViewModel
{
    public static readonly (string Key, string Label)[] Tabs =
        { ("open", "Open"), ("actioned", "Actioned"), ("dismissed", "Dismissed"), ("logs", "Audit log") };

    public static readonly string[] Reasons = { "Wrong answer", "Offensive content", "Spam", "Cheating", "Other" };

    public string Tab { get; set; } = "open";
    public List<ReportRow> Reports { get; set; } = new();
    public List<LogRow> Logs { get; set; } = new();
}
