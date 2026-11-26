// View models for F19 Solo Practice Mode (Moontaha).
using BrainBattle.Models;

namespace BrainBattle.ViewModels;

public class PracticeHistoryRow
{
    public string Id { get; set; }
    public string Label { get; set; }
    public string Difficulty { get; set; }
    public int Correct { get; set; }
    public int Total { get; set; }
    public int Score { get; set; }
    public DateTime? FinishedAt { get; set; }
}

// Settings form of a new practice session.
public class PracticeSetupForm
{
    public string CategoryId { get; set; } = "";
    public string Difficulty { get; set; } = "";
    public int Count { get; set; } = 10;
    public int QuestionTime { get; set; } = 20;
    public string QuizId { get; set; } // practise one published quiz (from F8/F9 "Practise" buttons)
}

public class PracticeIndexViewModel
{
    public PracticeSetupForm Setup { get; set; } = new();
    public string QuizTitle { get; set; }
    public List<Category> Categories { get; set; } = new();
    public List<PracticeHistoryRow> History { get; set; } = new();
    public PracticeSession Result { get; set; } // the session that was just finished
}

// Sent to wwwroot/js/practice.js as JSON.
public class PracticePlayViewModel
{
    public string SessionId { get; set; }
    public int QuestionTime { get; set; }
    public List<object> Questions { get; set; } = new(); // without answers
    public int StartIndex { get; set; }                  // first question not answered yet (resume)
}
