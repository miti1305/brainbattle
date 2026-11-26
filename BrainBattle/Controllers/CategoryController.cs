// CONTROLLER: read-only category list for page scripts. Admin create/edit/delete lives in F10 (Farin).
using BrainBattle.Core;
using BrainBattle.Models;
using Microsoft.AspNetCore.Mvc;

namespace BrainBattle.Controllers;

public class CategoryController : AppController
{
    // GET /api/categories
    [HttpGet("/api/categories")]
    public async Task<IActionResult> List() => Ok(new { categories = await Category.AllAsync(Db) });
}
