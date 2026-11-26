// View models for F20 Notification Center (Moontaha).
using BrainBattle.Models;

namespace BrainBattle.ViewModels;

public class NotificationsViewModel
{
    public static readonly Dictionary<string, string> Labels = new()
    {
        ["friend_request"] = "Friend requests",
        ["friend_accepted"] = "Accepted friend requests",
        ["challenge"] = "Challenges from friends",
        ["tournament"] = "Tournament matches",
        ["badge"] = "Badges earned",
        ["level_up"] = "Level ups",
        ["quiz_approved"] = "Quiz approvals",
        ["moderation"] = "Moderation messages",
    };

    public bool UnreadOnly { get; set; }
    public int Page { get; set; } = 1;
    public bool HasMore { get; set; }
    public List<Notification> Items { get; set; } = new();
    public List<string> Disabled { get; set; } = new();
}
