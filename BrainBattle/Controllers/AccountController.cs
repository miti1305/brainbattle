// CONTROLLER: register, log in, log out. (Supporting functionality, not a counted feature.)
// Views: Views/Account/Login.cshtml, Views/Account/Register.cshtml
using BrainBattle.Core;
using BrainBattle.Models;
using BrainBattle.ViewModels;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace BrainBattle.Controllers;

public class AccountController : AppController
{
    private IMongoCollection<User> Users => Db.Collection<User>("users");

    private static string SafeReturnUrl(string returnUrl) =>
        !string.IsNullOrEmpty(returnUrl) && returnUrl.StartsWith("/") && !returnUrl.StartsWith("//") ? returnUrl : "/dashboard";

    private Task SignInAsync(User user) =>
        HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, AuthSetup.CreatePrincipal(user),
            new AuthenticationProperties { IsPersistent = true });

    // GET /login
    [HttpGet("/login")]
    public IActionResult Login(string returnUrl = null)
    {
        if (CurrentUser != null) return Redirect("/dashboard");
        return Page("Account/Login", new LoginViewModel { ReturnUrl = returnUrl });
    }

    // POST /login
    [HttpPost("/login")]
    public async Task<IActionResult> Login(LoginViewModel form)
    {
        var email = form.Email?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(form.Password))
            return LoginError(form, "Email and password are required");

        var user = await Users.Find(u => u.Email == email).FirstOrDefaultAsync();
        if (user == null || !user.MatchPassword(form.Password)) return LoginError(form, "Wrong email or password");
        if (user.IsSuspended) return LoginError(form, "Your account is suspended");

        await SignInAsync(user);
        return Redirect(SafeReturnUrl(form.ReturnUrl));
    }

    private IActionResult LoginError(LoginViewModel form, string message)
    {
        form.Error = message;
        form.Password = null;
        Response.StatusCode = 400;
        return Page("Account/Login", form);
    }

    // GET /register
    [HttpGet("/register")]
    public IActionResult Register()
    {
        if (CurrentUser != null) return Redirect("/dashboard");
        return Page("Account/Register", new RegisterViewModel());
    }

    // POST /register
    [HttpPost("/register")]
    public async Task<IActionResult> Register(RegisterViewModel form)
    {
        var username = form.Username?.Trim();
        var email = form.Email?.Trim().ToLowerInvariant();
        var password = form.Password;
        string error = null;
        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            error = "Username, email and password are required";
        else if (username.Length < 3 || username.Length > 30) error = "Username must be 3-30 characters";
        else if (password.Length < 6) error = "Password must be at least 6 characters";
        else if (await Users.Find(u => u.Email == email || u.Username == username).AnyAsync())
            error = "Username or email is already registered";

        if (error != null)
        {
            form.Error = error;
            form.Password = null;
            Response.StatusCode = 400;
            return Page("Account/Register", form);
        }

        var user = new User { Username = username, Email = email, PasswordHash = Models.User.HashPassword(password) };
        user.Stamp();
        await Users.InsertOneAsync(user);
        await SignInAsync(user);
        return Redirect("/dashboard");
    }

    // POST /logout
    [HttpPost("/logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Redirect("/login");
    }

    // GET /api/auth/me  - the logged-in user (used by page scripts)
    [HttpGet("/api/auth/me")]
    [Authorize]
    public IActionResult Me() => Ok(new { user = CurrentUser });
}
