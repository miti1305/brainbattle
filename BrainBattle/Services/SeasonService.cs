// F16 (Moontaha): season soft reset. Pure function + database part.
using BrainBattle.Core;
using BrainBattle.Models;
using MongoDB.Driver;

namespace BrainBattle.Services;

public class SeasonService
{
    private readonly Db _db;

    public SeasonService(Db db)
    {
        _db = db;
    }

    /// New rating after a season ends: halfway back to the default (1200).
    public static int SoftReset(int rating) => (int)Math.Floor((rating + PlayerRating.DefaultRating) / 2.0 + 0.5);

    public async Task<Season> EndSeasonAsync(Season season)
    {
        var ratingsCol = _db.Collection<PlayerRating>("playerratings"); // shared model, written by F1/F3 (Abrar)
        var ratings = await ratingsCol.Find(r => r.GamesPlayed > 0).SortByDescending(r => r.Rating).ThenBy(r => r.RatedAt).ToListAsync();
        var ids = ratings.Select(r => r.User).ToList();
        var names = (await _db.Collection<User>("users").Find(u => ids.Contains(u.Id)).ToListAsync()).ToDictionary(u => u.Id, u => u.Username);

        season.Archive = ratings.Where(r => names.ContainsKey(r.User)).Take(100)
            .Select((r, i) => new SeasonArchiveEntry { Rank = i + 1, User = r.User, Username = names[r.User], Rating = r.Rating, Tier = r.Tier, Wins = r.Wins })
            .ToList();
        season.Status = "ended";
        season.EndedAt = DateTime.UtcNow;
        season.UpdatedAt = DateTime.UtcNow;
        await _db.Collection<Season>("seasons").ReplaceOneAsync(s => s.Id == season.Id, season);

        foreach (var r in ratings)
        {
            r.Rating = SoftReset(r.Rating);
            r.Tier = PlayerRating.TierFor(r.Rating);
            r.WeeklyPoints = 0;
            r.UpdatedAt = DateTime.UtcNow;
            await ratingsCol.ReplaceOneAsync(x => x.Id == r.Id, r);
        }
        return season;
    }
}
