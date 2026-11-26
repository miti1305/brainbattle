// F17 (Moontaha): XP and badges for activity in every feature.
using BrainBattle.Core;
using BrainBattle.Services;

namespace BrainBattle.Listeners;

public class ProgressListener : IEventListener
{
    private readonly ProgressService _progress;

    public ProgressListener(ProgressService progress)
    {
        _progress = progress;
    }

    public void Register(EventBus bus)
    {
        bus.On(Events.MatchFinished, async d =>
        {
            foreach (var p in d.List("players"))
            {
                if (p.Str("result") == "forfeit") continue;
                await _progress.AwardAsync(p.Str("userId"), "matchPlayed", new() { ["matchesPlayed"] = 1 });
                if (p.Str("result") == "win") await _progress.AwardAsync(p.Str("userId"), "matchWon", new() { ["matchesWon"] = 1 });
            }
        });

        bus.On(Events.PuzzleSolved, async d =>
        {
            var userId = d.Str("userId");
            await _progress.AwardAsync(userId, "puzzleSolved", new()
            {
                ["puzzlesSolved"] = 1,
                ["hardPuzzlesSolved"] = d.Str("difficulty") == "hard" ? 1 : 0,
            });
            if (d.Bool("isDaily")) await _progress.AwardAsync(userId, "dailySolved", new() { ["dailySolved"] = 1 });
        });

        bus.On(Events.PracticeCompleted, d => _progress.AwardAsync(d.Str("userId"), "practiceCompleted", new() { ["practiceCompleted"] = 1 }));

        bus.On(Events.QuizPublished, d => _progress.AwardAsync(d.Str("authorId"), "quizPublished", new() { ["quizzesPublished"] = 1 }));
    }
}
