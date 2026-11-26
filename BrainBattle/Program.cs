// Entry point of BrainBattle (ASP.NET Core 10 MVC with Razor Views + MongoDB + SignalR).
//   dotnet run            -> starts the website on http://localhost:5050 (PORT in .env)
//   dotnet run -- seed    -> fills the database with categories, an admin and sample quizzes
// Feature classes (services, listeners, jobs, hub methods, controllers, views) are found automatically,
// so this file does not need to change when a member adds a feature.
using BrainBattle.Core;
using BrainBattle.Hubs;
using Microsoft.AspNetCore.Mvc;

DotNetEnv.Env.TraversePath().Load(); // reads BrainBattle/.env

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls($"http://localhost:{AppConfig.Port}");

builder.Services.AddSingleton<Db>();
builder.Services.AddFeatureServices();

// Login with a cookie (see Core/AuthSetup.cs). [Authorize] and [Authorize(Roles = "admin")] protect actions.
builder.Services.AddBrainBattleAuth();

// Forms and JavaScript requests must send the anti-forgery token (protects against CSRF).
builder.Services.AddAntiforgery(o => o.HeaderName = "RequestVerificationToken");

builder.Services.AddControllersWithViews(o =>
    {
        o.Filters.Add(new AutoValidateAntiforgeryTokenAttribute());
        o.Filters.Add<PageExceptionFilter>(); // HttpError -> flash message, error page or JSON
        o.AllowEmptyInputInBodyModelBinding = true;
    })
    .AddJsonOptions(o => Json.Configure(o.JsonSerializerOptions));

builder.Services.AddSignalR().AddJsonProtocol(o => Json.Configure(o.PayloadSerializerOptions));

var app = builder.Build();

var db = app.Services.GetRequiredService<Db>();
await db.CheckConnectionAsync();

if (args.Contains("seed"))
{
    await BrainBattle.Seed.Seeder.RunAsync(db);
    return;
}

await app.Services.StartFeaturesAsync();

app.UseMiddleware<ErrorMiddleware>();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();                       // every controller uses attribute routes, e.g. [HttpGet("/friends")]
app.MapHub<GameHub>("/hub");

// Unknown /api routes -> 404 { message }
app.MapFallback("/api/{**path}", (HttpContext ctx) =>
    Results.Json(new { message = $"Route not found: {ctx.Request.Method} {ctx.Request.Path}" }, statusCode: 404));
// Unknown pages -> "Coming soon" for features not merged yet, otherwise "Page not found".
app.MapFallbackToController("NotFoundPage", "Home");

app.Lifetime.ApplicationStarted.Register(() =>
    Console.WriteLine($"BrainBattle running on http://localhost:{AppConfig.Port}"));

await app.RunAsync();
