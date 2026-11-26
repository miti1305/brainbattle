// Unit tests for F16 (Moontaha): ratings move halfway back to 1200 when a season ends.
// Run from the repo root: dotnet test BrainBattle.Tests
using BrainBattle.Models;
using BrainBattle.Services;
using Xunit;

namespace BrainBattle.Tests.Moontaha;

public class SeasonTests
{
    [Theory]
    [InlineData(1600, 1400)]
    [InlineData(1000, 1100)]
    [InlineData(1200, 1200)]
    public void Ratings_move_halfway_back_to_1200(int before, int after)
    {
        Assert.Equal(after, SeasonService.SoftReset(before));
    }

    [Fact]
    public void Default_game_settings()
    {
        var s = new SystemSettings();
        Assert.Equal(100, s.LevelBase);
        Assert.Equal(50, s.MatchmakingRangeStep);
        Assert.Equal(25, s.XpValues.MatchWon);
    }
}
