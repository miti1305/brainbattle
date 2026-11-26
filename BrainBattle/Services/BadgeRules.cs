// F17 (Moontaha): badge definitions, written with OOP.
// BadgeRule is the abstract base class (shown in the SRS class diagram);
// each subclass decides how a user's progress is measured.
using BrainBattle.Models;

namespace BrainBattle.Services;

public abstract class BadgeRule
{
    public string Key { get; }
    public string Name { get; }
    public string Description { get; }
    public string Icon { get; }
    public int Target { get; }

    protected BadgeRule(string key, string name, string description, string icon, int target)
    {
        Key = key;
        Name = name;
        Description = description;
        Icon = icon;
        Target = target;
    }

    // How far the user is (e.g. number of wins). Each subclass decides.
    public abstract int CurrentValue(UserProgress progress);

    public bool IsSatisfied(UserProgress progress) => CurrentValue(progress) >= Target;

    public int ProgressPercent(UserProgress progress) =>
        Math.Min(100, (int)Math.Floor(CurrentValue(progress) * 100.0 / Target + 0.5));
}

// Badge earned when a counter (e.g. MatchesWon) reaches the target.
public class CounterBadgeRule : BadgeRule
{
    private readonly Func<ProgressCounters, int> _counter;

    public CounterBadgeRule(string key, string name, string description, string icon, int target, Func<ProgressCounters, int> counter)
        : base(key, name, description, icon, target)
    {
        _counter = counter;
    }

    public override int CurrentValue(UserProgress progress) => progress.Counters == null ? 0 : _counter(progress.Counters);
}

public class LevelBadgeRule : BadgeRule
{
    public LevelBadgeRule(string key, string name, string description, string icon, int target)
        : base(key, name, description, icon, target) { }

    public override int CurrentValue(UserProgress progress) => Math.Max(progress.Level, 1);
}

public class StreakBadgeRule : BadgeRule
{
    public StreakBadgeRule(string key, string name, string description, string icon, int target)
        : base(key, name, description, icon, target) { }

    public override int CurrentValue(UserProgress progress) => progress.Streak?.Best ?? 0;
}

public static class Badges
{
    public static readonly List<BadgeRule> All = new()
    {
        new CounterBadgeRule("first_win", "First Victory", "Win your first battle", "⚔️", 1, c => c.MatchesWon),
        new CounterBadgeRule("ten_wins", "Battle Hardened", "Win 10 battles", "🛡️", 10, c => c.MatchesWon),
        new CounterBadgeRule("veteran", "Veteran", "Play 50 battles", "🎖️", 50, c => c.MatchesPlayed),
        new CounterBadgeRule("puzzle_starter", "Puzzle Starter", "Solve your first puzzle", "🧩", 1, c => c.PuzzlesSolved),
        new CounterBadgeRule("puzzle_master", "Puzzle Master", "Solve 5 hard puzzles", "🧠", 5, c => c.HardPuzzlesSolved),
        new CounterBadgeRule("dedicated", "Dedicated", "Solve 7 Daily Challenges", "📅", 7, c => c.DailySolved),
        new CounterBadgeRule("practice_10", "Practice Makes Perfect", "Finish 10 practice sessions", "🎯", 10, c => c.PracticeCompleted),
        new CounterBadgeRule("author", "Quiz Author", "Publish your first quiz", "✍️", 1, c => c.QuizzesPublished),
        new StreakBadgeRule("on_fire", "On Fire", "Be active 7 days in a row", "🔥", 7),
        new LevelBadgeRule("rising_star", "Rising Star", "Reach level 5", "⭐", 5),
    };
}
