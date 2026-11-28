// Tests for F1 Real-Time Quiz Battle (Abrar): scoring and winner rules.
using BrainBattle.Models;
using BrainBattle.Services;
using Xunit;

namespace BrainBattle.Tests;

public class BattleTests
{
    [Fact]
    public void Wrong_answer_scores_zero() => Assert.Equal(0, BattleService.PointsFor(false, 1000, 15));

    [Fact]
    public void Instant_correct_answer_scores_200() => Assert.Equal(200, BattleService.PointsFor(true, 0, 15));

    [Fact]
    public void Correct_answer_at_half_time_scores_150() => Assert.Equal(150, BattleService.PointsFor(true, 7500, 15));

    [Fact]
    public void Late_correct_answer_still_scores_100() => Assert.Equal(100, BattleService.PointsFor(true, 16000, 15));

    [Fact]
    public void Highest_score_wins()
    {
        var players = new List<MatchPlayer> { new() { Score = 900 }, new() { Score = 400 } };
        BattleService.DecideResults(players);
        Assert.Equal("win", players[0].Result);
        Assert.Equal("loss", players[1].Result);
    }

    [Fact]
    public void Equal_top_scores_are_a_draw()
    {
        var players = new List<MatchPlayer> { new() { Score = 500 }, new() { Score = 500 }, new() { Score = 100 } };
        BattleService.DecideResults(players);
        Assert.Equal(new[] { "draw", "draw", "loss" }, players.Select(p => p.Result));
    }

    [Fact]
    public void Player_who_left_forfeits_even_with_more_points()
    {
        var players = new List<MatchPlayer> { new() { Score = 900, Forfeited = true }, new() { Score = 0 } };
        BattleService.DecideResults(players);
        Assert.Equal("forfeit", players[0].Result);
        Assert.Equal("win", players[1].Result);
    }
}
