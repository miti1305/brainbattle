// View models for F17 Progression System - XP, Levels, Streaks & Badges (Moontaha).
using BrainBattle.Models;

namespace BrainBattle.ViewModels;

public class BadgeCard
{
    public string Key { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public string Icon { get; set; }
    public int Target { get; set; }
    public int Current { get; set; }
    public int Progress { get; set; } // percent
    public bool Earned { get; set; }
    public DateTime? EarnedAt { get; set; }
}

public class AchievementsViewModel
{
    public int Xp { get; set; }
    public int Level { get; set; }
    public int LevelStartXp { get; set; }
    public int NextLevelXp { get; set; }
    public int StreakCurrent { get; set; }
    public int StreakBest { get; set; }
    public bool ActiveToday { get; set; }
    public ProgressCounters Counters { get; set; }
    public XpValues XpValues { get; set; }
    public List<BadgeCard> Badges { get; set; } = new();

    public int LevelPercent
    {
        get
        {
            var span = NextLevelXp - LevelStartXp;
            return span > 0 ? (int)Math.Round((Xp - LevelStartXp) * 100.0 / span) : 100;
        }
    }
}
