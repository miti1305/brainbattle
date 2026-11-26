// MODEL (shared contract, owned by F4 Abrar): private game room with invite code and custom settings.
// Created by F4 rooms (Abrar) and F12 friend challenges (Mim); updated by F1 when a room's game ends.
using BrainBattle.Core;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

namespace BrainBattle.Models;

public class GameRoom : Entity
{
    public const string CodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

    public string Code { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string Host { get; set; }

    public RoomSettings Settings { get; set; } = new();
    public int MaxPlayers { get; set; } = 4; // 2-4
    public List<RoomPlayer> Players { get; set; } = new();
    public string Status { get; set; } = "open"; // open | playing | closed

    [BsonRepresentation(BsonType.ObjectId)]
    public string Match { get; set; }

    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(2);

    // A new random 6-character code that no other room uses.
    public static async Task<string> UniqueCodeAsync(Db db)
    {
        var rooms = db.Collection<GameRoom>("gamerooms");
        for (var attempt = 0; attempt < 10; attempt++)
        {
            var code = new string(Enumerable.Range(0, 6)
                .Select(_ => CodeAlphabet[System.Security.Cryptography.RandomNumberGenerator.GetInt32(CodeAlphabet.Length)]).ToArray());
            if (!await rooms.Find(r => r.Code == code).AnyAsync()) return code;
        }
        throw new HttpError(500, "Could not create a room code, try again");
    }
}

public class RoomSettings
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string Category { get; set; }

    public int QuestionCount { get; set; } = 10; // 3-20
    public int QuestionTime { get; set; } = 15;  // 5-60 seconds
    public string Difficulty { get; set; } = ""; // "" = any
}

public class RoomPlayer
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string User { get; set; }

    public string Username { get; set; }
}

public class GameRoomIndexes : IIndexSetup
{
    public Task CreateIndexesAsync(Db db) =>
        db.Raw("gamerooms").Indexes.CreateOneAsync(new CreateIndexModel<BsonDocument>(new BsonDocument("code", 1), new CreateIndexOptions { Unique = true }));
}
