// VIEW MODELS (F1 Abrar + F2 Abrar): data passed from the battle and ranked controllers to their Razor views.
using BrainBattle.Models;

namespace BrainBattle.ViewModels;

// Views/Battle/Index.cshtml
public class BattleIndexViewModel
{
    public List<Category> Categories { get; set; } = new();
    public string CurrentMatchId { get; set; } // battle the user is already in (link "Rejoin")
}

// Views/Battle/Play.cshtml
public class BattlePlayViewModel
{
    public string MatchId { get; set; }
    public string Mode { get; set; }
    public string CategoryName { get; set; }
}

// Body of POST /api/battles
public class CreateBattleRequest
{
    public string CategoryId { get; set; }
    public string Difficulty { get; set; }
    public int QuestionCount { get; set; } = 10;
    public int QuestionTime { get; set; } = 15;
}

// Views/Ranked/Index.cshtml (F2)
public class RankedIndexViewModel
{
    public List<Category> Categories { get; set; } = new();
    public int Rating { get; set; }
    public string Tier { get; set; }
    public int GamesPlayed { get; set; }
    public int Wins { get; set; }
    public int Losses { get; set; }
    public int Draws { get; set; }
    public string CurrentMatchId { get; set; }
}
