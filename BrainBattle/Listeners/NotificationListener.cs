// F20 (Moontaha): turns events from all features into notifications.
using BrainBattle.Core;
using BrainBattle.Services;

namespace BrainBattle.Listeners;

public class NotificationListener : IEventListener
{
    private readonly NotificationService _n;

    public NotificationListener(NotificationService notifications)
    {
        _n = notifications;
    }

    public void Register(EventBus bus)
    {
        bus.On(Events.FriendRequestSent, d =>
            _n.NotifyAsync(d.Str("toId"), "friend_request", "New friend request", $"{d.Str("fromUsername")} wants to be your friend", "/friends"));

        bus.On(Events.FriendRequestAccepted, d =>
            _n.NotifyAsync(d.Str("toId"), "friend_accepted", "Friend request accepted", $"{d.Str("fromUsername")} accepted your friend request", "/friends"));

        bus.On(Events.FriendChallenge, d =>
            _n.NotifyAsync(d.Str("toId"), "challenge", "You were challenged!", $"{d.Str("fromUsername")} invited you to room {d.Str("roomCode")}", $"/rooms/{d.Str("roomCode")}"));

        bus.On(Events.TournamentMatchReady, async d =>
        {
            foreach (var id in d.Strings("userIds"))
                await _n.NotifyAsync(id, "tournament", "Tournament match ready",
                    $"Your next match in \"{d.Str("tournamentName")}\" is ready", $"/tournaments/{d.Str("tournamentId")}");
        });

        bus.On(Events.TournamentFinished, d =>
            _n.NotifyAsync(d.Str("championId"), "tournament", "You won the tournament! 🏆", $"Champion of \"{d.Str("name")}\"", $"/tournaments/{d.Str("tournamentId")}"));

        bus.On(Events.BadgeEarned, d =>
            _n.NotifyAsync(d.Str("userId"), "badge", "New badge earned", $"You earned \"{d.Str("badgeName")}\"", "/achievements"));

        bus.On(Events.LevelUp, d =>
            _n.NotifyAsync(d.Str("userId"), "level_up", $"Level {d.Int("level")}!", $"You reached level {d.Int("level")}", "/achievements"));

        bus.On(Events.QuizApproved, d =>
            _n.NotifyAsync(d.Str("authorId"), "quiz_approved", "Quiz approved", $"\"{d.Str("title")}\" is now in the official question bank", "/my-quizzes"));

        bus.On(Events.ModerationWarning, d =>
            _n.NotifyAsync(d.Str("userId"), "moderation", "Message from the moderators", d.Str("message"), ""));

        bus.On(Events.UserSuspended, d =>
        {
            var until = d.Date("until");
            var untilText = until.HasValue ? $" Until {until.Value.ToLocalTime():g}." : "";
            return _n.NotifyAsync(d.Str("userId"), "moderation", "Account suspended", $"Reason: {d.Str("reason")}.{untilText}", "");
        });
    }
}
