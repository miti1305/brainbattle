# BrainBattle — Social Puzzle, Quiz & Competition Platform

CSE470 Software Engineering project by **Abrar, Farin, Mim and Moontaha**.

**Stack:** ASP.NET Core 10 MVC (C#) with **Razor Views** · **MongoDB Atlas** (MongoDB .NET driver) · SignalR for real-time pages · Bootstrap 5 · Chart.js

## MVC in this project

| Layer | Where | What it does |
|---|---|---|
| **Model** | `BrainBattle/Models/` | C# classes stored in MongoDB (User, Quiz, Match, Tournament, ...) |
| **View** | `BrainBattle/Views/<Page>/*.cshtml` | Razor pages the user sees (HTML + Bootstrap). Small scripts for live pages are in `wwwroot/js/` |
| **Controller** | `BrainBattle/Controllers/` | Receive the request, check the user and input, call services/models, choose the view |

Other folders: `Services/` (business logic), `ViewModels/` (data passed to views), `Hubs/` (SignalR real-time),
`Jobs/` (timed background jobs), `Listeners/` (react to events from other features), `Core/` (shared plumbing).

## Project structure

```
brainbattle/
├── BrainBattle.sln
├── BrainBattle/                 The web app (ASP.NET Core MVC)
│   ├── Program.cs               Starts the app (no need to edit it when adding features)
│   ├── .env.example             Copy to .env and add the MongoDB connection string
│   ├── Core/                    Login (cookies), errors, MongoDB access, auto-registration of features
│   ├── Models/                  M: shared models (User, Category, Quiz, Match, PlayerRating, GameRoom)
│   ├── Controllers/             C: Home, Account (login/register), Category, Health
│   ├── Views/                   V: _Layout (navbar), Home, Account, Shared (Error, Coming soon)
│   ├── Services/                EventBus, RealtimeService (SignalR), QuestionPickerService, PresenceService
│   ├── Hubs/GameHub.cs          SignalR hub (each feature adds GameHub.<Feature>.cs)
│   ├── Seed/                    dotnet run -- seed (categories, admin, sample quizzes)
│   └── wwwroot/                 css/site.css, js/site.js (shared page helpers)
├── BrainBattle.Tests/           xUnit unit tests
├── docs/FEATURES.md             Who owns which feature and files
└── CONTRIBUTING.md              Git rules for the team
```

## Setup (every member, once)

Install: **.NET 10 SDK**, **VS Code** with the **C# Dev Kit** extension, and **Git**.

```bash
git clone https://github.com/miti1305/brainbattle.git
cd brainbattle/BrainBattle
copy .env.example .env        # Windows
# cp .env.example .env        # macOS
```

Open `BrainBattle/.env` and paste the real `MONGODB_URI` (get it **privately** from Moontaha; it is the same database as before).

## Run

```bash
cd BrainBattle
dotnet run
```

Open **http://localhost:5050**. Stop with `Ctrl + C`.

- `dotnet run -- seed` creates the default categories, the admin account and sample quizzes. It is safe to run again (nothing is duplicated).
- Old accounts from the previous version still work (same database, same passwords).
- Pages of features that are not added yet show **"Coming soon"**.

## Tests

From the repo root:

```bash
dotnet test
```

## Real-time pages

Battles, private room lobbies, the ranked queue and notifications use SignalR. Every page of a logged-in user
connects to `/hub` automatically (`wwwroot/js/site.js`). To test a battle, log in with two different accounts
(for example one normal browser window and one private/incognito window).
