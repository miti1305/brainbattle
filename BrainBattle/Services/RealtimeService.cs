// Sends real-time messages to the open pages through SignalR (the browser script is wwwroot/js/site.js).
// Groups:  "user:<userId>"  (every connection of one user, joined automatically)
//          "match:<matchId>", "room:<CODE>" ... (joined by feature hub methods)
// Usage:   await _realtime.ToUser(userId, "notification:new", payload);
//          await _realtime.ToGroup($"match:{id}", "battle:state", state);
using BrainBattle.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace BrainBattle.Services;

public class RealtimeService
{
    private readonly IHubContext<GameHub> _hub;

    public RealtimeService(IHubContext<GameHub> hub)
    {
        _hub = hub;
    }

    public Task ToUser(string userId, string eventName, object payload) =>
        _hub.Clients.Group($"user:{userId}").SendAsync(eventName, payload);

    public Task ToGroup(string group, string eventName, object payload) =>
        _hub.Clients.Group(group).SendAsync(eventName, payload);

    public Task ToConnection(string connectionId, string eventName, object payload) =>
        _hub.Clients.Client(connectionId).SendAsync(eventName, payload);

    public Task JoinGroup(string connectionId, string group) => _hub.Groups.AddToGroupAsync(connectionId, group);

    public Task LeaveGroup(string connectionId, string group) => _hub.Groups.RemoveFromGroupAsync(connectionId, group);
}
