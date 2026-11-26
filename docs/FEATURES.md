# Feature ownership

Each member owns 5 features. Sprint 1 = the first two steps of each member; Sprint 2 = the other three.

| ID | Feature | Owner | Sprint | Main files |
|---|---|---|---|---|
| F1 | Real-Time Multiplayer Quiz Battle | Abrar | Sprint 1 | Battle/Index.cshtml, Battle/Play.cshtml, BattleController.cs |
| F2 | Skill-Based Matchmaking | Abrar | Sprint 1 | MatchmakingController.cs, Ranked/Index.cshtml |
| F3 | Ranked Rating & Leaderboards | Abrar | Sprint 2 | LeaderboardController.cs, Leaderboards/Index.cshtml |
| F4 | Private Game Rooms | Abrar | Sprint 2 | RoomController.cs, Rooms/Index.cshtml, Rooms/Lobby.cshtml, Rooms/_SettingsFields.cshtml |
| F5 | Match History & Review | Abrar | Sprint 2 | History/Index.cshtml, History/Review.cshtml, MatchHistoryController.cs |
| F8 | Quiz Authoring & Publishing Workflow | Farin | Sprint 1 | QuizController.cs, Quizzes/Details.cshtml, Quizzes/Edit.cshtml, Quizzes/Index.cshtml |
| F10 | Category & Official Question Bank Management (Admin) | Farin | Sprint 1 | AdminContent/Categories.cshtml, AdminContent/QuestionBank.cshtml, AdminContent/_Tabs.cshtml, AdminContentController.cs |
| F6 | Interactive Puzzle Engine | Farin | Sprint 2 | PuzzleController.cs, Puzzles/Index.cshtml, Puzzles/Play.cshtml |
| F7 | Daily Challenge | Farin | Sprint 2 | Daily/Index.cshtml, DailyChallengeController.cs |
| F9 | Personalized Quiz Recommendations | Farin | Sprint 2 | RecommendationController.cs, Recommendations/Index.cshtml |
| F12 | Friends & Social Connections | Mim | Sprint 1 | FriendController.cs, Friends/Index.cshtml |
| F13 | Clans / Study Groups | Mim | Sprint 1 | ClanController.cs, Clans/Details.cshtml, Clans/Index.cshtml |
| F11 | Tournament Management | Mim | Sprint 2 | TournamentController.cs, Tournaments/Details.cshtml, Tournaments/Index.cshtml |
| F14 | Activity Feed & Result Sharing | Mim | Sprint 2 | Feed/Index.cshtml, FeedController.cs |
| F15 | Performance Analytics Dashboard | Mim | Sprint 2 | Analytics/Index.cshtml, AnalyticsController.cs |
| F16 | Admin Dashboard, User & Season Management (Admin) | Moontaha | Sprint 1 | Admin/Dashboard.cshtml, Admin/Seasons.cshtml, Admin/Settings.cshtml, Admin/Users.cshtml, Admin/_Tabs.cshtml, AdminController.cs |
| F19 | Solo Practice Mode | Moontaha | Sprint 1 | Practice/Index.cshtml, Practice/Play.cshtml, PracticeController.cs |
| F17 | Progression System (XP, Levels, Streaks & Badges) | Moontaha | Sprint 2 | Achievements/Index.cshtml, ProgressController.cs |
| F18 | Content Moderation & Reporting | Moontaha | Sprint 2 | Moderation/Index.cshtml, ModerationController.cs, Shared/_ReportButton.cshtml |
| F20 | Notification Center | Moontaha | Sprint 2 | NotificationController.cs, Notifications/Index.cshtml |

Shared (base, whole team): `Core/`, `Program.cs`, `Views/Shared/_Layout.cshtml`, `Models/User.cs`, `Models/Category.cs`,
`Models/Quiz.cs`, `Models/Match.cs` (F1), `Models/PlayerRating.cs` (F3), `Models/GameRoom.cs` (F4), `Services/`, `Hubs/GameHub.cs`.
