// HUB METHODS (F2 Abrar): ranked queue calls from /ranked (wwwroot/js/ranked.js).
//   await BB.invoke('ranked:join',  { categoryId })  -> { ok, rating, window }  or { ok: false, message, matchId? }
//   await BB.invoke('ranked:leave', {})              -> { ok }
// The server pushes "ranked:searching", "ranked:matched" { matchId, opponent } and "ranked:error".
using System.Text.Json;
using BrainBattle.Core;
using BrainBattle.Services;
using Microsoft.AspNetCore.SignalR;

namespace BrainBattle.Hubs;

public partial class GameHub
{
    [HubMethodName("ranked:join")]
    public async Task<object> RankedJoin(JsonElement data)
    {
        try { return await Svc<MatchmakingService>().JoinAsync(UserId, Context.ConnectionId, Arg.Str(data, "categoryId")); }
        catch (Exception ex) { return Fail(ex); }
    }

    [HubMethodName("ranked:leave")]
    public object RankedLeave(JsonElement data)
    {
        Svc<MatchmakingService>().Leave(UserId);
        return new { ok = true };
    }
}
