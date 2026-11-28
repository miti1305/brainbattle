// CONTROLLER (F2 Abrar): the ranked page.
//   GET /ranked -> Views/Ranked/Index.cshtml (rating, tier, "Find match"; the queue itself runs over SignalR)
using BrainBattle.Models;
using BrainBattle.Services;
using BrainBattle.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using BrainBattle.Core;

namespace BrainBattle.Controllers;

[Authorize]
public class MatchmakingController : AppController
{
    private readonly BattleService _battles;

    public MatchmakingController(BattleService battles)
    {
        _battles = battles;
    }

    [HttpGet("/ranked")]
    public async Task<IActionResult> Index()
    {
        var me = MeId;
        var rating = await Db.Collection<PlayerRating>("playerratings").Find(r => r.User == me).FirstOrDefaultAsync();
        var current = await _battles.FindCurrentMatchAsync(me);
        var value = rating?.Rating ?? PlayerRating.DefaultRating;

        return Page("Ranked/Index", new RankedIndexViewModel
        {
            Categories = await Category.AllAsync(Db),
            Rating = value,
            Tier = PlayerRating.TierFor(value),
            GamesPlayed = rating?.GamesPlayed ?? 0,
            Wins = rating?.Wins ?? 0,
            Losses = rating?.Losses ?? 0,
            Draws = rating?.Draws ?? 0,
            CurrentMatchId = current?.Id,
        });
    }
}
