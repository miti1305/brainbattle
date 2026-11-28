// BACKGROUND JOB (F2 Abrar): every 2 seconds, pairs players waiting in the ranked queue.
// Found automatically on startup (Core/AutoRegister.cs), so Program.cs does not change.
using BrainBattle.Core;
using BrainBattle.Services;

namespace BrainBattle.Jobs;

public class MatchmakingJob : ScheduledJob
{
    private readonly MatchmakingService _matchmaking;

    public MatchmakingJob(MatchmakingService matchmaking)
    {
        _matchmaking = matchmaking;
    }

    protected override TimeSpan Interval => TimeSpan.FromSeconds(2);
    protected override TimeSpan FirstDelay => TimeSpan.FromSeconds(2);

    protected override Task RunOnceAsync(CancellationToken ct) => _matchmaking.MatchPlayersAsync();
}
