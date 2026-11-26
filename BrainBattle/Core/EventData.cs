// Payload of an EventBus event: a dictionary with small helpers to read values safely.
namespace BrainBattle.Core;

public class EventData : Dictionary<string, object>
{
    public string Str(string key) => TryGetValue(key, out var v) && v != null ? v.ToString() : null;

    public int Int(string key, int fallback = 0)
    {
        if (!TryGetValue(key, out var v) || v == null) return fallback;
        return v switch
        {
            int i => i,
            long l => (int)l,
            double d => (int)Math.Round(d),
            _ => int.TryParse(v.ToString(), out var p) ? p : fallback,
        };
    }

    public int? IntOrNull(string key) => TryGetValue(key, out var v) && v != null ? Int(key) : null;

    public bool Bool(string key) => TryGetValue(key, out var v) && v is bool b && b;

    public DateTime? Date(string key) => TryGetValue(key, out var v) && v is DateTime d ? d : null;

    public List<EventData> List(string key) =>
        TryGetValue(key, out var v) && v is IEnumerable<EventData> items ? items.ToList() : new List<EventData>();

    public List<string> Strings(string key) =>
        TryGetValue(key, out var v) && v is IEnumerable<string> items ? items.ToList() : new List<string>();
}
