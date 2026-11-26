// Last safety net for errors that happen outside a controller action (e.g. while rendering a view).
// /api and /hub requests get JSON { "message": "..." }; pages get a short HTML error page.
// Errors thrown inside controller actions are handled earlier by PageExceptionFilter.
using System.Net;
using MongoDB.Driver;

namespace BrainBattle.Core;

public class ErrorMiddleware
{
    private readonly RequestDelegate _next;

    public ErrorMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            if (context.Response.HasStarted) throw;
            var (status, message) = Describe(ex);
            if (status == 500) Console.Error.WriteLine(ex);
            context.Response.Clear();
            context.Response.StatusCode = status;
            if (IsApi(context.Request))
            {
                await context.Response.WriteAsJsonAsync(new { message }, Json.Options);
            }
            else
            {
                context.Response.ContentType = "text/html; charset=utf-8";
                await context.Response.WriteAsync(
                    $"<!doctype html><title>Error</title><div style=\"font-family:sans-serif;padding:2rem\"><h1>{status}</h1><p>{WebUtility.HtmlEncode(message)}</p><a href=\"/\">Home</a></div>");
            }
        }
    }

    public static bool IsApi(HttpRequest r) => r.Path.StartsWithSegments("/api") || r.Path.StartsWithSegments("/hub");

    public static (int status, string message) Describe(Exception ex)
    {
        if (ex is HttpError he) return (he.Status, he.Message);
        if (IsDuplicateKey(ex)) return (409, "This value already exists");
        if (ex is FormatException) return (400, "Invalid value: " + ex.Message);
        return (500, "Server error");
    }

    public static bool IsDuplicateKey(Exception ex) =>
        (ex is MongoWriteException w && w.WriteError?.Category == ServerErrorCategory.DuplicateKey) ||
        (ex is MongoCommandException c && c.Code == 11000) ||
        (ex is MongoBulkWriteException b && b.WriteErrors.Any(e => e.Category == ServerErrorCategory.DuplicateKey));
}
