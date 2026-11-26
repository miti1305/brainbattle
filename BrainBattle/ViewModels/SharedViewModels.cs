// Small view models used by the shared views (layout, error page, report button).
using BrainBattle.Core;

namespace BrainBattle.ViewModels;

public class ErrorViewModel
{
    public int Status { get; set; }
    public string Message { get; set; }
}

// Model for the optional "Report" button partial (Views/Shared/_ReportButton.cshtml, added by F18 Moontaha).
// targetType: quiz | question | user | activity. Pages render it with Html.PartialIfExistsAsync, so they
// work before F18 is merged (the button simply does not appear).
public class ReportButtonModel
{
    public string TargetType { get; set; }
    public string TargetId { get; set; }
    public int? QuestionIndex { get; set; }
    public string Label { get; set; } = "Report";

    public ReportButtonModel() { }

    public ReportButtonModel(string targetType, string targetId, int? questionIndex = null, string label = "Report")
    {
        TargetType = targetType;
        TargetId = targetId;
        QuestionIndex = questionIndex;
        Label = label;
    }
}

public class ComingSoonViewModel
{
    public FeatureInfo Feature { get; set; }
}
