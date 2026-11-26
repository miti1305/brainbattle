// Unit tests for F17 (Moontaha): XP levels, streaks and badge rules.
// Run from the repo root: dotnet test BrainBattle.Tests
using BrainBattle.Models;
using BrainBattle.Services;
using Xunit;

namespace BrainBattle.Tests.Moontaha;

public class ProgressTests
{
    [Fact]
    public void Level_thresholds()
    {
        Assert.Equal(100, Levels.XpForLevel(2));
        Assert.Equal(1000, Levels.XpForLevel(5));
        Assert.Equal(1, Levels.LevelFromXp(0));
        Assert.Equal(1, Levels.LevelFromXp(99));
        Assert.Equal(2, Levels.LevelFromXp(100));
        Assert.Equal(5, Levels.LevelFromXp(1000));
    }

    [Fact]
    public void Streak_grows_on_consecutive_days_and_resets_after_a_missed_day()
    {
        var s = Levels.NextStreak(new Streak(), "2026-11-10");
        Assert.Equal(1, s.Current);
        s = Levels.NextStreak(s, "2026-11-11");
        Assert.Equal(2, s.Current);
        s = Levels.NextStreak(s, "2026-11-11"); // same day: no change
        Assert.Equal(2, s.Current);
        s = Levels.NextStreak(s, "2026-11-13"); // missed the 12th
        Assert.Equal(1, s.Current);
        Assert.Equal(2, s.Best);
    }

    private static UserProgress WithWins(int wins) => new() { Counters = new ProgressCounters { MatchesWon = wins } };

    [Fact]
    public void Badge_unlocks_when_the_condition_is_met()
    {
        var first = Badges.All.First(b => b.Key == "first_win");
        Assert.False(first.IsSatisfied(WithWins(0)));
        Assert.True(first.IsSatisfied(WithWins(1)));
    }

    [Fact]
    public void Progress_percentage()
    {
        var tenWins = Badges.All.First(b => b.Key == "ten_wins");
        Assert.Equal(40, tenWins.ProgressPercent(WithWins(4)));
    }

    [Fact]
    public void BadgeRule_is_abstract_and_keys_are_unique()
    {
        Assert.True(typeof(BadgeRule).IsAbstract);
        Assert.Equal(Badges.All.Count, Badges.All.Select(b => b.Key).Distinct().Count());
    }
}
