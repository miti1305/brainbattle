// Small interfaces that let each feature plug itself in WITHOUT editing shared files.
// Program.cs finds these classes automatically (see AutoRegister.cs), which keeps merges conflict-free.
namespace BrainBattle.Core;

// A class in Listeners/ that subscribes to EventBus events.
public interface IEventListener
{
    void Register(Services.EventBus bus);
}

// A class that wants to know when a user's SignalR connection closes (e.g. battle forfeits).
public interface IConnectionHook
{
    Task OnDisconnectedAsync(string userId, string connectionId);
}

// A class that creates the MongoDB indexes for its own collections on startup.
public interface IIndexSetup
{
    Task CreateIndexesAsync(Db db);
}

// Base class for scheduled background jobs (Jobs/ folder). Override Interval and RunOnceAsync.
public abstract class ScheduledJob : BackgroundService
{
    protected abstract TimeSpan Interval { get; }
    protected virtual TimeSpan FirstDelay => TimeSpan.FromSeconds(5);
    protected abstract Task RunOnceAsync(CancellationToken ct);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try { await Task.Delay(FirstDelay, stoppingToken); } catch (TaskCanceledException) { return; }
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                Console.Error.WriteLine($"{GetType().Name} failed: {ex.Message}");
            }
            try { await Task.Delay(Interval, stoppingToken); } catch (TaskCanceledException) { return; }
        }
    }
}
