// Turns errors thrown in controller actions into the right answer for the browser:
//   - request from a page script (/api/...)  -> JSON { message } with the status code
//   - form POST (e.g. "Accept request")      -> red message on the previous page
//   - normal page GET                         -> Views/Shared/Error.cshtml with the status code
// So controllers and services can simply  throw new HttpError(404, "Quiz not found");
using BrainBattle.ViewModels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

namespace BrainBattle.Core;

public class PageExceptionFilter : IExceptionFilter
{
    private readonly IModelMetadataProvider _metadata;
    private readonly ITempDataDictionaryFactory _tempData;

    public PageExceptionFilter(IModelMetadataProvider metadata, ITempDataDictionaryFactory tempData)
    {
        _metadata = metadata;
        _tempData = tempData;
    }

    public void OnException(ExceptionContext ctx)
    {
        var http = ctx.HttpContext;
        var (status, message) = ErrorMiddleware.Describe(ctx.Exception);
        if (status == 500) Console.Error.WriteLine(ctx.Exception);

        if (ErrorMiddleware.IsApi(http.Request))
        {
            ctx.Result = new ObjectResult(new { message }) { StatusCode = status };
        }
        else if (!HttpMethods.IsGet(http.Request.Method))
        {
            _tempData.GetTempData(http)["Error"] = message;
            var referer = http.Request.Headers.Referer.ToString();
            var back = Uri.TryCreate(referer, UriKind.Absolute, out var uri) && uri.Host == http.Request.Host.Host ? uri.PathAndQuery : "/";
            ctx.Result = new RedirectResult(back);
        }
        else
        {
            ctx.Result = new ViewResult
            {
                ViewName = "~/Views/Shared/Error.cshtml",
                StatusCode = status,
                ViewData = new ViewDataDictionary(_metadata, ctx.ModelState) { Model = new ErrorViewModel { Status = status, Message = message } },
            };
        }
        ctx.ExceptionHandled = true;
    }
}
