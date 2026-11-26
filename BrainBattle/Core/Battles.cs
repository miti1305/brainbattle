// SHARED CONTRACT between features that start quiz battles.
// F1 Battle (Abrar) implements IBattleLauncher in BattleService. Other features (F4 rooms, F11 tournaments,
// F2 matchmaking) ask for it, so their code compiles even before F1 is merged:
//     var launcher = HttpContext.RequestServices.GetService<IBattleLauncher>();
//     if (launcher == null) throw new HttpError(503, "Battles are not available yet");
//     var matchId = await launcher.CreateMatchAsync(new CreateMatchOptions { ... });
namespace BrainBattle.Core;

public class CreateMatchOptions
{
    public List<string> UserIds { get; set; } = new();
    public string Mode { get; set; } = "casual";   // ranked | private | tournament | casual
    public string CategoryId { get; set; }          // null = mixed categories
    public string Difficulty { get; set; }          // null = any
    public int QuestionCount { get; set; } = 10;
    public int QuestionTime { get; set; } = 15;     // seconds per question
    public string RoomId { get; set; }              // F4 private room
    public string TournamentId { get; set; }        // F11 tournament
    public int? BracketIndex { get; set; }          // F11 bracket match index
}

public interface IBattleLauncher
{
    // Creates a waiting battle and returns its id. Players then open /battle/{id}.
    Task<string> CreateMatchAsync(CreateMatchOptions options);
}
