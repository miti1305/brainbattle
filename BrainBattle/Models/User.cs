// MODEL: User (shared by every feature). Owner of auth/base: whole team.
using System.Text.Json.Serialization;
using BrainBattle.Core;

namespace BrainBattle.Models;

public class User : Entity
{
    public static readonly string[] Roles = { "player", "moderator", "admin" };

    public string Username { get; set; }
    public string Email { get; set; }

    [JsonIgnore] // never send the password hash to the browser
    public string PasswordHash { get; set; }

    public string Role { get; set; } = "player";
    public string AvatarUrl { get; set; } = "";
    public string Bio { get; set; } = "";
    public bool IsSuspended { get; set; }
    public DateTime? SuspendedUntil { get; set; }

    public bool MatchPassword(string plain) =>
        !string.IsNullOrEmpty(PasswordHash) && BCrypt.Net.BCrypt.Verify(plain, PasswordHash);

    public static string HashPassword(string plain) => BCrypt.Net.BCrypt.HashPassword(plain, 10);
}
