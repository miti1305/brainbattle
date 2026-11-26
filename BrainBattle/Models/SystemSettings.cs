// MODEL (F16 Moontaha): one document with game settings admins can change.
using BrainBattle.Core;
using MongoDB.Driver;

namespace BrainBattle.Models;

public class SystemSettings : Entity
{
    public XpValues XpValues { get; set; } = new();
    public int LevelBase { get; set; } = 100;          // XP for level 2; each level needs more (min 10)
    public int MatchmakingRangeStep { get; set; } = 50; // used by F2 (Abrar), 10-300

    // The single settings document (created with defaults the first time).
    public static async Task<SystemSettings> GetSingletonAsync(Db db)
    {
        var collection = db.Collection<SystemSettings>("systemsettings");
        var settings = await collection.Find(_ => true).FirstOrDefaultAsync();
        if (settings != null) return settings;
        settings = new SystemSettings();
        settings.Stamp();
        await collection.InsertOneAsync(settings);
        return settings;
    }
}

public class XpValues
{
    public int MatchPlayed { get; set; } = 10;
    public int MatchWon { get; set; } = 25;
    public int PuzzleSolved { get; set; } = 20;
    public int DailySolved { get; set; } = 30;
    public int PracticeCompleted { get; set; } = 10;
    public int QuizPublished { get; set; } = 15;
}
