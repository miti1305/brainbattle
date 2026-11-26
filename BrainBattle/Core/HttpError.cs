// Throw `new HttpError(404, "Quiz not found")` anywhere in a controller or service.
// ErrorMiddleware turns it into the JSON response { "message": "Quiz not found" } with that status code.
namespace BrainBattle.Core;

public class HttpError : Exception
{
    public int Status { get; }

    public HttpError(int status, string message) : base(message)
    {
        Status = status;
    }
}
