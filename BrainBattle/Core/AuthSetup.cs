// Cookie login for the whole site (pages, /api requests from page scripts and the SignalR hub).
// After login the browser keeps an encrypted cookie with the user's id and role.
// On every request the user is loaded again from MongoDB, so suspended or deleted users are logged out
// at once and role changes take effect immediately. Controllers read it as CurrentUser (AppController).
using System.Security.Claims;
using BrainBattle.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using MongoDB.Driver;

namespace BrainBattle.Core;

public static class AuthSetup
{
    public const string UserKey = "bb_user";

    public static void AddBrainBattleAuth(this IServiceCollection services)
    {
        services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(o =>
            {
                o.Cookie.Name = "brainbattle.auth";
                o.Cookie.HttpOnly = true;
                o.LoginPath = "/login";
                o.LogoutPath = "/logout";
                o.AccessDeniedPath = "/denied";
                o.ExpireTimeSpan = TimeSpan.FromDays(7);
                o.SlidingExpiration = true;
                o.Events = new CookieAuthenticationEvents
                {
                    OnValidatePrincipal = ValidateAsync,
                    // Page scripts and the hub get a JSON error instead of being redirected to the login page.
                    OnRedirectToLogin = ctx => IsApi(ctx.Request) ? Json(ctx.Response, 401, "Not logged in") : Redirect(ctx),
                    OnRedirectToAccessDenied = ctx => IsApi(ctx.Request) ? Json(ctx.Response, 403, "You do not have permission to do this") : Redirect(ctx),
                };
            });
        services.AddAuthorization();
    }

    private static bool IsApi(HttpRequest r) => r.Path.StartsWithSegments("/api") || r.Path.StartsWithSegments("/hub");

    private static Task Json(HttpResponse response, int status, string message)
    {
        response.StatusCode = status;
        return response.WriteAsJsonAsync(new { message });
    }

    private static Task Redirect(RedirectContext<CookieAuthenticationOptions> ctx)
    {
        ctx.Response.Redirect(ctx.RedirectUri);
        return Task.CompletedTask;
    }

    // Runs on every request that carries the login cookie.
    private static async Task ValidateAsync(CookieValidatePrincipalContext ctx)
    {
        var id = ctx.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var db = ctx.HttpContext.RequestServices.GetRequiredService<Db>();
        var user = Ids.IsValid(id) ? await db.Collection<User>("users").Find(u => u.Id == id).FirstOrDefaultAsync() : null;
        if (user == null || user.IsSuspended)
        {
            ctx.RejectPrincipal();
            await ctx.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return;
        }
        if (ctx.Principal.FindFirst(ClaimTypes.Role)?.Value != user.Role || ctx.Principal.Identity?.Name != user.Username)
        {
            ctx.ReplacePrincipal(CreatePrincipal(user)); // role or name changed by an admin
            ctx.ShouldRenew = true;
        }
        ctx.HttpContext.Items[UserKey] = user;
    }

    public static ClaimsPrincipal CreatePrincipal(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.Username ?? ""),
            new(ClaimTypes.Role, user.Role ?? "player"),
        };
        return new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));
    }

    // The logged-in user loaded for this request (null when not logged in).
    public static User CurrentUser(this HttpContext http) =>
        http.Items.TryGetValue(UserKey, out var u) ? u as User : null;
}
