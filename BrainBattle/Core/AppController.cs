// Base class for every controller (the "C" in MVC).
// - CurrentUser / MeId: the logged-in user (on actions protected with [Authorize])
// - Page("Friends/Index", model): shows the Razor view Views/Friends/Index.cshtml
// - Done("Saved!"): shows a green message and goes back to the page the form came from
// - JSON actions for page scripts return Ok(new { ... }) like a normal Web API.
using BrainBattle.Models;
using Microsoft.AspNetCore.Mvc;

namespace BrainBattle.Core;

public abstract class AppController : Controller
{
    protected User CurrentUser => HttpContext.CurrentUser();

    protected string MeId => CurrentUser?.Id;

    protected Db Db => HttpContext.RequestServices.GetRequiredService<Db>();

    // Razor view by path inside Views/, e.g. Page("Rooms/Lobby", model).
    protected ViewResult Page(string view, object model = null) => View($"~/Views/{view}.cshtml", model);

    // Returns { message } with any status code (for page scripts).
    protected ObjectResult Message(int status, string message) => StatusCode(status, new { message });

    // Back to the page that sent the form (or the fallback URL).
    protected IActionResult Back(string fallback = "/")
    {
        var referer = Request.Headers.Referer.ToString();
        if (Uri.TryCreate(referer, UriKind.Absolute, out var uri) && uri.Host == Request.Host.Host)
            return Redirect(uri.PathAndQuery);
        return Redirect(fallback);
    }

    // Green success message + back to the previous page.
    protected IActionResult Done(string message, string redirectTo = null)
    {
        TempData["Success"] = message;
        return redirectTo == null ? Back() : Redirect(redirectTo);
    }
}
