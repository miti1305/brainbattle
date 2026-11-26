// Reads values from the JSON object that a page script sends to a hub method or /api action, e.g. { matchId, qIndex }.
// Missing or wrong values return the fallback instead of throwing.
using System.Text.Json;

namespace BrainBattle.Core;

public static class Arg
{
    private static bool TryGet(JsonElement data, string name, out JsonElement value)
    {
        value = default;
        return data.ValueKind == JsonValueKind.Object && data.TryGetProperty(name, out value);
    }

    public static string Str(JsonElement data, string name, string fallback = null)
    {
        if (!TryGet(data, name, out var v)) return fallback;
        return v.ValueKind switch
        {
            JsonValueKind.String => v.GetString(),
            JsonValueKind.Number => v.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            _ => fallback,
        };
    }

    public static int Int(JsonElement data, string name, int fallback = 0)
    {
        if (!TryGet(data, name, out var v)) return fallback;
        if (v.ValueKind == JsonValueKind.Number && v.TryGetDouble(out var d)) return (int)d;
        if (v.ValueKind == JsonValueKind.String && double.TryParse(v.GetString(), out var p)) return (int)p;
        return fallback;
    }

    public static bool Bool(JsonElement data, string name, bool fallback = false)
    {
        if (!TryGet(data, name, out var v)) return fallback;
        if (v.ValueKind == JsonValueKind.True) return true;
        if (v.ValueKind == JsonValueKind.False) return false;
        return fallback;
    }
}
