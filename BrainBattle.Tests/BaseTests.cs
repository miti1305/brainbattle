// Tests for the shared base (passwords, feature list, rating tiers).
using BrainBattle.Core;
using BrainBattle.Models;
using Xunit;

namespace BrainBattle.Tests;

public class BaseTests
{
    [Fact]
    public void Passwords_are_hashed_and_checked()
    {
        var user = new User { PasswordHash = User.HashPassword("secret123") };
        Assert.True(user.MatchPassword("secret123"));
        Assert.False(user.MatchPassword("wrong"));
    }

    [Fact]
    public void Feature_pages_are_found_by_url()
    {
        Assert.Equal("F4", FeatureCatalog.ForPath("/rooms/ABC123").Id);
        Assert.Equal("F10", FeatureCatalog.ForPath("/admin/content").Id);
        Assert.Equal("F16", FeatureCatalog.ForPath("/admin/users").Id);
        Assert.Null(FeatureCatalog.ForPath("/nothing-here"));
    }

    [Fact]
    public void There_are_20_features_5_per_member()
    {
        Assert.Equal(20, FeatureCatalog.All.Length);
        Assert.All(FeatureCatalog.Members, m => Assert.Equal(5, FeatureCatalog.All.Count(f => f.Owner == m)));
    }

    [Theory]
    [InlineData(1000, "Bronze")]
    [InlineData(1200, "Silver")]
    [InlineData(1350, "Gold")]
    [InlineData(1600, "Platinum")]
    [InlineData(1800, "Diamond")]
    public void Rating_tiers(int rating, string tier) => Assert.Equal(tier, PlayerRating.TierFor(rating));
}
