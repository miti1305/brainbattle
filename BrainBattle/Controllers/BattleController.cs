// CONTROLLER (F1 Abrar): battle pages.
//   GET  /battle        -> Views/Battle/Index.cshtml  (create a casual battle, rejoin a running one)
//   POST /api/battles   -> creates a casual battle, returns { matchId }
//   GET  /battle/{id}   -> Views/Battle/Play.cshtml   (the live battle; real-time part is in battle.js)
using BrainBattle.Core;
using BrainBattle.Models;
using BrainBattle.Services;
using BrainBattle.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace BrainBattle.Controllers;

[Authorize]
public class BattleController : AppController
{
    private readonly BattleService _battles;

    public BattleController(BattleService battles)
    {
        _battles = battles;
    }

    [HttpGet("/battle")]
    public async Task<IActionResult> Index()
    {
        var current = await _battles.FindCurrentMatchAsync(MeId);
        return Page("Battle/Index", new BattleIndexViewModel
        {
            Categories = await Category.AllAsync(Db),
            CurrentMatchId = current?.Id,
        });
    }

    [HttpPost("/api/battles")]
    public async Task<IActionResult> Create([FromBody] CreateBattleRequest body)
    {
        body ??= new CreateBattleRequest();
        var current = await _battles.FindCurrentMatchAsync(MeId);
        if (current != null) throw new HttpError(409, "You are already in a battle. Finish or leave it first.");

        var matchId = await _battles.CreateMatchAsync(new CreateMatchOptions
        {
            UserIds = { MeId },
            Mode = "casual",
            CategoryId = body.CategoryId,
            Difficulty = body.Difficulty,
            QuestionCount = body.QuestionCount,
            QuestionTime = body.QuestionTime,
        });
        return Ok(new { matchId });
    }

    [HttpGet("/battle/{id}")]
    public async Task<IActionResult> Play(string id)
    {
        Ids.Oid(id, "battle id");
        var match = await Db.Collection<Match>("matches").Find(m => m.Id == id).FirstOrDefaultAsync()
            ?? throw new HttpError(404, "Battle not found");
        var names = await Category.NamesAsync(Db, new[] { match.Category });

        return Page("Battle/Play", new BattlePlayViewModel
        {
            MatchId = match.Id,
            Mode = match.Mode,
            CategoryName = match.Category != null && names.TryGetValue(match.Category, out var n) ? n : "Mixed",
        });
    }
}
