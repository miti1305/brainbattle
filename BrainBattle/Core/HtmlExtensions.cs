// Small helpers for Razor views.
//   @Html.JsonData("page-data", Model)  -> <script type="application/json" id="page-data">...</script>
//        (page scripts in wwwroot/js read it with BB.data("page-data"))
//   @await Html.PartialIfExistsAsync("_ReportButton", model)  -> renders the partial only if a member
//        has added it (keeps pages working before every feature is merged)
using System.Text.Json;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewEngines;

namespace BrainBattle.Core;

public static class HtmlExtensions
{
    public static IHtmlContent JsonData(this IHtmlHelper html, string id, object value)
    {
        // The default encoder escapes <, > and &, so the JSON cannot close the script tag.
        var json = JsonSerializer.Serialize(value, Json.Options);
        return new HtmlString($"<script type=\"application/json\" id=\"{id}\">{json}</script>");
    }

    public static async Task<IHtmlContent> PartialIfExistsAsync(this IHtmlHelper html, string partialName, object model = null)
    {
        var engine = html.ViewContext.HttpContext.RequestServices.GetRequiredService<ICompositeViewEngine>();
        var found = engine.FindView(html.ViewContext, partialName, isMainPage: false);
        return found.Success ? await html.PartialAsync(partialName, model) : HtmlString.Empty;
    }

    // "2 minutes ago" style text for dates.
    public static string Ago(DateTime? date)
    {
        if (date == null) return "";
        var span = DateTime.UtcNow - date.Value.ToUniversalTime();
        if (span.TotalMinutes < 1) return "just now";
        if (span.TotalHours < 1) return $"{(int)span.TotalMinutes} min ago";
        if (span.TotalDays < 1) return $"{(int)span.TotalHours} h ago";
        if (span.TotalDays < 30) return $"{(int)span.TotalDays} d ago";
        return Local(date);
    }

    // Date and time in the server's local time zone (Bangladesh on the team's computers).
    public static string Local(DateTime? date, string format = "dd MMM yyyy, HH:mm") =>
        date == null ? "" : date.Value.ToLocalTime().ToString(format);
}
