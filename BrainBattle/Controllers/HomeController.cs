// CONTROLLER: home page, dashboard and the "not found / coming soon" pages.
using BrainBattle.Core;
using BrainBattle.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BrainBattle.Controllers;

public class HomeController : AppController
{
    // GET /
    [HttpGet("/")]
    public IActionResult Index() => Page("Home/Index");

    // GET /dashboard  - links to all 20 features
    [HttpGet("/dashboard")]
    [Authorize]
    public IActionResult Dashboard() => Page("Home/Dashboard", FeatureCatalog.All);

    // GET /denied  - shown when a page needs another role (e.g. admin)
    [HttpGet("/denied")]
    public IActionResult Denied()
    {
        Response.StatusCode = 403;
        return Page("Shared/Error", new ErrorViewModel { Status = 403, Message = "You do not have permission to open this page." });
    }

    // Any page that does not exist. Feature pages that are not merged yet show "Coming soon".
    // (Used by app.MapFallbackToController in Program.cs, so it has no route of its own.)
    public IActionResult NotFoundPage()
    {
        var feature = FeatureCatalog.ForPath(Request.Path);
        Response.StatusCode = 404;
        if (feature != null) return Page("Shared/ComingSoon", new ComingSoonViewModel { Feature = feature });
        return Page("Shared/Error", new ErrorViewModel { Status = 404, Message = "Page not found." });
    }
}
