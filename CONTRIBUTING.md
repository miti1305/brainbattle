# Team rules (Git)

1. **Never push to `main`.** Each member works on their own branch:
   `feature/abrar-features`, `feature/farin-features`, `feature/mim-features`, `feature/moontaha-features`.
2. Commit each feature separately with a clear message, for example:
   `F1: real-time quiz battle (BattleController, BattleService, Battle views)`.
3. Never commit `BrainBattle/.env` (it contains the database password). It is in `.gitignore`.
4. Only add or change files of your own features. Shared files (`Program.cs`, `Core/`, `Views/Shared/_Layout.cshtml`,
   shared models) are changed only after agreeing with the team.
5. Run `dotnet build` and `dotnet test` before you push.

## How features plug in without editing shared files

- Controllers, services (`Services/*Service.cs`), background jobs (`Jobs/`), event listeners (`Listeners/`),
  index setups and hub methods (`Hubs/GameHub.<Feature>.cs`) are found automatically when the app starts.
- Each page is a Razor view in its own folder under `Views/`. The navbar links already exist.
- Features talk to each other through events (`Services/EventBus.cs`) or by reading MongoDB collections,
  so every member's code builds on its own.
