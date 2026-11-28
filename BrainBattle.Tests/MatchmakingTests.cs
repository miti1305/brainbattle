// Tests for F2 Skill-Based Matchmaking (Abrar): search window and pairing rules.
using BrainBattle.Services;
using Xunit;

namespace BrainBattle.Tests;

public class MatchmakingTests
{
    private static readonly DateTime Now = new(2026, 11, 28, 12, 0, 0, DateTimeKind.Utc);

    private static QueueTicket T(string id, int rating, int waitedSeconds = 0, string category = null) => new()
    {
        UserId = id.PadLeft(24, '0'),
        Username = id,
        Rating = rating,
        CategoryId = category,
        JoinedAt = Now.AddSeconds(-waitedSeconds),
    };

    [Theory]
    [InlineData(0, 100)]
    [InlineData(4, 100)]
    [InlineData(5, 150)]
    [InlineData(12, 200)]
    [InlineData(300, 400)] // never wider than MaxWindow
    public void Window_grows_while_waiting(int seconds, int window) =>
        Assert.Equal(window, MatchmakingService.WindowFor(seconds));

    [Fact]
    public void Close_ratings_are_paired_at_once() =>
        Assert.True(MatchmakingService.CanPair(T("a", 1200), T("b", 1290), Now));

    [Fact]
    public void Far_ratings_wait_until_the_window_is_wide_enough()
    {
        Assert.False(MatchmakingService.CanPair(T("a", 1200), T("b", 1450), Now));
        Assert.True(MatchmakingService.CanPair(T("a", 1200, 20), T("b", 1450, 20), Now)); // window 300 after 20 s
    }

    [Fact]
    public void Different_categories_are_not_paired_but_any_fits_all()
    {
        Assert.False(MatchmakingService.CanPair(T("a", 1200, 0, "cat1"), T("b", 1200, 0, "cat2"), Now));
        Assert.True(MatchmakingService.CanPair(T("a", 1200, 0, "cat1"), T("b", 1200), Now));
    }

    [Fact]
    public void Longest_waiting_player_gets_the_closest_opponent()
    {
        var queue = new List<QueueTicket> { T("far", 1290, 1), T("old", 1200, 10), T("close", 1210, 2) };
        var pairs = MatchmakingService.FindPairs(queue, Now);
        Assert.Single(pairs);
        Assert.Equal("old", pairs[0].A.Username);
        Assert.Equal("close", pairs[0].B.Username);
    }

    [Fact]
    public void Nobody_is_paired_twice()
    {
        var queue = new List<QueueTicket> { T("a", 1200), T("b", 1200), T("c", 1200), T("d", 1200), T("e", 1200) };
        var pairs = MatchmakingService.FindPairs(queue, Now);
        Assert.Equal(2, pairs.Count);
        var used = pairs.SelectMany(p => new[] { p.A.UserId, p.B.UserId }).ToList();
        Assert.Equal(used.Count, used.Distinct().Count());
    }
}
