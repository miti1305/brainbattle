// JSON settings shared by the REST API and SignalR.
// - camelCase names (C# "QuestionTime" is sent to the browser as "questionTime")
// - numbers may arrive as strings ("10") from HTML forms
// - free-form MongoDB values (BsonValue) are written as normal JSON
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using MongoDB.Bson;
using MongoDB.Bson.IO;

namespace BrainBattle.Core;

public static class Json
{
    public static void Configure(JsonSerializerOptions o)
    {
        o.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        o.DictionaryKeyPolicy = null;
        o.PropertyNameCaseInsensitive = true;
        o.NumberHandling = JsonNumberHandling.AllowReadingFromString;
        o.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
        o.Converters.Add(new BsonValueConverter<BsonValue>());
        o.Converters.Add(new BsonValueConverter<BsonDocument>());
        o.Converters.Add(new BsonValueConverter<BsonArray>());
    }

    public static readonly JsonSerializerOptions Options = Create();

    private static JsonSerializerOptions Create()
    {
        var o = new JsonSerializerOptions();
        Configure(o);
        return o;
    }

    // Converts a JSON value sent by a page script into a MongoDB value (for free-form fields).
    public static BsonValue ToBson(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                var doc = new BsonDocument();
                foreach (var p in element.EnumerateObject()) doc[p.Name] = ToBson(p.Value);
                return doc;
            case JsonValueKind.Array:
                var arr = new BsonArray();
                foreach (var item in element.EnumerateArray()) arr.Add(ToBson(item));
                return arr;
            case JsonValueKind.String:
                return new BsonString(element.GetString());
            case JsonValueKind.Number:
                if (element.TryGetInt32(out var i)) return new BsonInt32(i);
                if (element.TryGetInt64(out var l)) return new BsonInt64(l);
                return new BsonDouble(element.GetDouble());
            case JsonValueKind.True:
                return BsonBoolean.True;
            case JsonValueKind.False:
                return BsonBoolean.False;
            default:
                return BsonNull.Value;
        }
    }

    // Converts a MongoDB value into plain JSON (ObjectIds become strings, dates become ISO strings).
    public static JsonNode ToNode(BsonValue value)
    {
        if (value == null || value.IsBsonNull) return null;
        switch (value.BsonType)
        {
            case BsonType.Document:
                var obj = new JsonObject();
                foreach (var e in value.AsBsonDocument) obj[e.Name] = ToNode(e.Value);
                return obj;
            case BsonType.Array:
                var arr = new JsonArray();
                foreach (var item in value.AsBsonArray) arr.Add(ToNode(item));
                return arr;
            case BsonType.ObjectId: return JsonValue.Create(value.AsObjectId.ToString());
            case BsonType.DateTime: return JsonValue.Create(value.ToUniversalTime().ToString("o"));
            case BsonType.Boolean: return JsonValue.Create(value.AsBoolean);
            case BsonType.Int32: return JsonValue.Create(value.AsInt32);
            case BsonType.Int64: return JsonValue.Create(value.AsInt64);
            case BsonType.Double: return JsonValue.Create(value.AsDouble);
            case BsonType.Decimal128: return JsonValue.Create((decimal)value.AsDecimal128);
            case BsonType.String: return JsonValue.Create(value.AsString);
            default: return JsonValue.Create(value.ToString());
        }
    }
}

public class BsonValueConverter<T> : JsonConverter<T> where T : BsonValue
{
    public override T Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using var doc = JsonDocument.ParseValue(ref reader);
        return (T)Json.ToBson(doc.RootElement);
    }

    public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
    {
        var node = Json.ToNode(value);
        if (node == null) writer.WriteNullValue();
        else node.WriteTo(writer, options);
    }
}
