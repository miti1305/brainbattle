// Registers every feature class automatically, so members never edit Program.cs:
//   - classes in the Services namespace whose name ends with "Service" (and EventBus)
//                                                -> singletons (also registered by their Core interfaces)
//   - classes implementing IEventListener       -> event listeners
//   - classes deriving from ScheduledJob        -> background jobs
//   - classes implementing IIndexSetup          -> index creation on startup
// Controllers are found by ASP.NET Core itself (attribute routing).
using System.Reflection;

namespace BrainBattle.Core;

public static class AutoRegister
{
    private static IEnumerable<Type> AppTypes() =>
        Assembly.GetExecutingAssembly().GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract && !t.IsGenericTypeDefinition && t.IsPublic);

    public static void AddFeatureServices(this IServiceCollection services)
    {
        foreach (var t in AppTypes())
        {
            if (t.Namespace == "BrainBattle.Services" && (t.Name.EndsWith("Service") || t.Name == "EventBus"))
            {
                services.AddSingleton(t);
                foreach (var iface in t.GetInterfaces().Where(i => i.Namespace == "BrainBattle.Core"))
                    services.AddSingleton(iface, sp => sp.GetRequiredService(t));
            }
            else if (typeof(IEventListener).IsAssignableFrom(t))
            {
                services.AddSingleton(typeof(IEventListener), t);
            }
            else if (typeof(ScheduledJob).IsAssignableFrom(t))
            {
                services.AddSingleton(typeof(IHostedService), t);
            }
            else if (typeof(IIndexSetup).IsAssignableFrom(t))
            {
                services.AddSingleton(typeof(IIndexSetup), t);
            }
        }
    }

    // Called once on startup, after the app is built.
    public static async Task StartFeaturesAsync(this IServiceProvider sp)
    {
        var db = sp.GetRequiredService<Db>();
        foreach (var setup in sp.GetServices<IIndexSetup>())
        {
            try { await setup.CreateIndexesAsync(db); }
            catch (Exception ex) { Console.Error.WriteLine($"Index setup {setup.GetType().Name} failed: {ex.Message}"); }
        }

        var bus = sp.GetRequiredService<Services.EventBus>();
        var names = new List<string>();
        foreach (var listener in sp.GetServices<IEventListener>())
        {
            listener.Register(bus);
            names.Add(listener.GetType().Name);
        }
        if (names.Count > 0) Console.WriteLine($"Event listeners loaded: {string.Join(", ", names)}");
    }
}
