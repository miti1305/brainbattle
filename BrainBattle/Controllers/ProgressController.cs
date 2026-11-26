// CONTROLLER (F17 Moontaha): my XP, level, activity streak and badges with progress.
// Page:  GET /achievements -> Views/Achievements/Index.cshtml
// JSON:  GET /api/progress/me, GET /api/progress/badges
// XP is awarded automatically by ProgressListener when other features emit events.
using BrainBattle.Core;
using BrainBattle.Models;
using BrainBattle.Services;
using BrainBattle.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace BrainBattle.Controllers;

[Authorize]
public class ProgressController : AppController
{
    private readonly ProgressService _progress;

    public ProgressController(ProgressService progress)
    {
        _progress = progress;
    }

    private async Task<AchievementsViewModel> BuildAsync()
    {
        var me = MeId;
        var p = await _progress.GetProgressAsync(me);
        var settings = await SystemSettings.GetSingletonAsync(Db);
        var today = Levels.LocalDate();
        var last = p.Streak?.LastActiveDate;
        var streakAlive = last == today || last == Levels.YesterdayOf(today);
        var earned = await Db.Collection<UserBadge>("userbadges").Find(b => b.User == me).ToListAsync();

        return new AchievementsViewModel
        {
            Xp = p.Xp,
            Level = p.Level,
            LevelStartXp = Levels.XpForLevel(p.Level, settings.LevelBase),
            NextLevelXp = Levels.XpForLevel(p.Level + 1, settings.LevelBase),
            StreakCurrent = streakAlive ? p.Streak.Current : 0,
            StreakBest = p.Streak?.Best ?? 0,
            ActiveToday = last == today,
            Counters = p.Counters,
            XpValues = settings.XpValues,
            Badges = Badges.All.Select(b =>
            {
                var e = earned.FirstOrDefault(x => x.BadgeKey == b.Key);
                return new BadgeCard
                {
                    Key = b.Key,
                    Name = b.Name,
                    Description = b.Description,
                    Icon = b.Icon,
                    Target = b.Target,
                    Current = Math.Min(b.CurrentValue(p), b.Target),
                    Progress = e != null ? 100 : b.ProgressPercent(p),
                    Earned = e != null,
                    EarnedAt = e?.EarnedAt,
                };
            }).ToList(),
        };
    }

    // GET /achievements
    [HttpGet("/achievements")]
    public async Task<IActionResult> Index() => Page("Achievements/Index", await BuildAsync());

    // GET /api/progress/me
    [HttpGet("/api/progress/me")]
    public async Task<IActionResult> Me()
    {
        var m = await BuildAsync();
        return Ok(new
        {
            xp = m.Xp,
            level = m.Level,
            levelStartXp = m.LevelStartXp,
            nextLevelXp = m.NextLevelXp,
            streak = new { current = m.StreakCurrent, best = m.StreakBest, activeToday = m.ActiveToday },
            counters = m.Counters,
            xpValues = m.XpValues,
        });
    }

    // GET /api/progress/badges
    [HttpGet("/api/progress/badges")]
    public async Task<IActionResult> GetBadges() => Ok(new { badges = (await BuildAsync()).Badges });
}
