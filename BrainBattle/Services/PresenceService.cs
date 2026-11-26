// Tracks who is online (has an open SignalR connection). Used by F12 Friends (online status).
using System.Collections.Concurrent;

namespace BrainBattle.Services;

public class PresenceService
{
    private readonly ConcurrentDictionary<string, int> _counts = new(); // userId -> open connections

    public void Add(string userId) => _counts.AddOrUpdate(userId, 1, (_, n) => n + 1);

    public void Remove(string userId)
    {
        if (_counts.AddOrUpdate(userId, 0, (_, n) => n - 1) <= 0) _counts.TryRemove(userId, out _);
    }

    public bool IsOnline(string userId) => userId != null && _counts.ContainsKey(userId);
}
