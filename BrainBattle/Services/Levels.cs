// F17 (Moontaha): XP and level maths. Pure functions, unit tested.
// XP needed to reach a level: base x (level-1) x level / 2  -> with base 100: L2=100, L3=300, L4=600, L5=1000
using BrainBattle.Models;

namespace BrainBattle.Services;

public static class Levels
{
    public static int XpForLevel(int level, int levelBase = 100) => levelBase * (level - 1) * level / 2;

    public static int LevelFromXp(int xp, int levelBase = 100)
    {
        var level = 1;
        while (xp >= XpForLevel(level + 1, levelBase)) level++;
        return level;
    }

    // Local calendar date "YYYY-MM-DD".
    public static string LocalDate(DateTime? d = null) => (d ?? DateTime.Now).ToString("yyyy-MM-dd");

    public static string YesterdayOf(string date) =>
        DateTime.ParseExact(date, "yyyy-MM-dd", null).AddDays(-1).ToString("yyyy-MM-dd");

    /// New streak after activity on `today`.
    public static Streak NextStreak(Streak streak, string today = null)
    {
        streak ??= new Streak();
        today ??= LocalDate();
        if (streak.LastActiveDate == today)
        {
            var same = Math.Max(streak.Current, 1);
            return new Streak { Current = same, Best = Math.Max(streak.Best, same), LastActiveDate = today };
        }
        var current = streak.LastActiveDate == YesterdayOf(today) ? streak.Current + 1 : 1;
        return new Streak { Current = current, Best = Math.Max(streak.Best, current), LastActiveDate = today };
    }
}
