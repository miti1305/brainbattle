// SignalR hub = the real-time connection between the open pages and the server.
// Every page of a logged-in user connects to /hub (wwwroot/js/site.js) with the login cookie,
// and the connection joins the group "user:<id>" automatically.
//
// This is a PARTIAL class: each feature adds its own file (e.g. GameHub.Battle.cs) with its
// hub methods, so nobody edits this shared file. Name methods like the events:
//     [HubMethodName("battle:join")] public async Task<object> BattleJoin(JsonElement data) { ... }
using BrainBattle.Core;
using BrainBattle.Models;
using BrainBattle.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;

namespace BrainBattle.Hubs;

[Authorize]
public partial class GameHub : Hub
{
    private readonly IServiceProvider _sp;

    public GameHub(IServiceProvider sp)
    {
        _sp = sp;
    }

    protected T Svc<T>() => _sp.GetRequiredService<T>();

    // The logged-in user's id for this connection (set in OnConnectedAsync).
    protected string UserId => Context.Items.TryGetValue("userId", out var id) ? id as string : null;

    // Loads the current user from the database (fresh copy).
    protected async Task<User> CurrentUserAsync() =>
        await Svc<Db>().Collection<User>("users").Find(u => u.Id == UserId).FirstOrDefaultAsync();

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier; // from the login cookie (ClaimTypes.NameIdentifier)
        var user = Ids.IsValid(userId) ? await Svc<Db>().Collection<User>("users").Find(u => u.Id == userId).FirstOrDefaultAsync() : null;
        if (user == null || user.IsSuspended)
        {
            Context.Abort();
            return;
        }

        Context.Items["userId"] = user.Id;
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{user.Id}");
        Svc<PresenceService>().Add(user.Id);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        var userId = UserId;
        if (userId != null)
        {
            Svc<PresenceService>().Remove(userId);
            foreach (var hook in _sp.GetServices<IConnectionHook>())
            {
                try { await hook.OnDisconnectedAsync(userId, Context.ConnectionId); }
                catch (Exception ex) { Console.Error.WriteLine($"Disconnect hook {hook.GetType().Name} failed: {ex.Message}"); }
            }
        }
        await base.OnDisconnectedAsync(exception);
    }

    // Turns an exception into the reply shape page scripts expect: { ok: false, message }.
    protected static object Fail(Exception ex) => new { ok = false, message = ex.Message };
}
