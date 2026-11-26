// GET /api/health -> { status: "ok" } (quick check that the app is running).
using BrainBattle.Core;
using Microsoft.AspNetCore.Mvc;

namespace BrainBattle.Controllers;

public class HealthController : AppController
{
    [HttpGet("/api/health")]
    public IActionResult Get() => Ok(new { status = "ok", app = "BrainBattle" });
}
