// HUB METHODS (F1 Abrar): real-time calls from the battle page (wwwroot/js/battle.js).
//   await BB.invoke('battle:join',   { matchId })               -> { ok, state }
//   await BB.invoke('battle:start',  { matchId })               -> { ok }   (casual host only)
//   await BB.invoke('battle:answer', { matchId, qIndex, choice }) -> { ok }
//   await BB.invoke('battle:leave',  { matchId })               -> { ok }
// The server pushes "battle:state" to everybody in the battle after every change.
using System.Text.Json;
using BrainBattle.Core;
using BrainBattle.Services;
using Microsoft.AspNetCore.SignalR;

namespace BrainBattle.Hubs;

public partial class GameHub
{
    [HubMethodName("battle:join")]
    public async Task<object> BattleJoin(JsonElement data)
    {
        try
        {
            var state = await Svc<BattleService>().JoinAsync(Arg.Str(data, "matchId"), UserId, Context.ConnectionId);
            return new { ok = true, state };
        }
        catch (Exception ex) { return Fail(ex); }
    }

    [HubMethodName("battle:start")]
    public async Task<object> BattleStart(JsonElement data)
    {
        try { return await Svc<BattleService>().StartByHostAsync(Arg.Str(data, "matchId"), UserId); }
        catch (Exception ex) { return Fail(ex); }
    }

    [HubMethodName("battle:answer")]
    public async Task<object> BattleAnswer(JsonElement data)
    {
        try
        {
            return await Svc<BattleService>().AnswerAsync(
                Arg.Str(data, "matchId"), UserId, Arg.Int(data, "qIndex", -1), Arg.Int(data, "choice", -1));
        }
        catch (Exception ex) { return Fail(ex); }
    }

    [HubMethodName("battle:leave")]
    public async Task<object> BattleLeave(JsonElement data)
    {
        try { return await Svc<BattleService>().LeaveAsync(Arg.Str(data, "matchId"), UserId); }
        catch (Exception ex) { return Fail(ex); }
    }
}
