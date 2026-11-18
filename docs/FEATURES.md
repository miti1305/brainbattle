# Feature ownership map

**Merge order:** Moontaha pushes the base first, then features are merged **Abrar → Mim → Farin → Moontaha**.
Later members may use earlier members' code (e.g. Mim's tournaments use Abrar's battle engine), never the other way round.

Each member works **only in their own files** below. This keeps merge conflicts rare.

## Shared files (change only after telling the team, in a small separate PR)

| File | Why it's shared |
|---|---|
| `server/src/models/User.js`, `Category.js`, `Quiz.js` | Used by many features |
| `server/src/services/eventBus.js` | Event names + payloads features use to talk to each other |
| `server/src/services/questionPicker.js` | Random questions for F1/F4 battles and F19 practice |
| `server/src/services/presence.js` | Who is online (F12) |
| `server/src/listeners/index.js` | Auto-loads every listener file in `listeners/` (just add your own file) |
| `client/src/components/ReportButton.jsx` | Report button used by F8, F14 → handled by F18 |
| `server/src/routes/index.js`, `client/src/App.jsx` | Already register every feature, normally no edits needed |
| `client/src/components/QuestionCard.jsx`, `Timer.jsx` | Used by F1, F4, F7, F19 |
| `server/package.json`, `client/package.json` | New npm packages: tell the team, everyone runs `npm install` after pulling |

## Cross-feature contracts

| From | Event (eventBus) | Used by |
|---|---|---|
| F1/F2/F4 Abrar | `match.finished` | F3, F5 (Abrar), F14, F15 (Mim), F17, F20 (Moontaha) |
| F6/F7 Farin | `puzzle.solved` | F14 (Mim), F17 (Moontaha) |
| F8 Farin | `quiz.published` | F14 (Mim), F20 (Moontaha) |
| F19 Moontaha | `practice.completed` | F17 (Moontaha) |
| F12 Mim | `friend.requestSent` | F20 (Moontaha) |
| F11 Mim | `tournament.matchReady` | F20 (Moontaha) |
| F17 Moontaha | `badge.earned` | F14 (Mim), F20 (Moontaha) |
| F16/F18 Moontaha | `user.suspended` | F20 (Moontaha) |

## Abrar

### F1 Real-Time Multiplayer Quiz Battle (Hard)
- Route file (exists): `server/src/routes/battleRoutes.js` → `/api/battles`
- Create: `server/src/controllers/battleController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/Battle.jsx` → `/battle`
- Create: `client/src/api/battleApi.js`, components in `client/src/components/Battle/`

### F2 Skill-Based Matchmaking (Medium)
- Route file (exists): `server/src/routes/matchmakingRoutes.js` → `/api/matchmaking`
- Create: `server/src/controllers/matchmakingController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/RankedQueue.jsx` → `/ranked`
- Create: `client/src/api/matchmakingApi.js`, components in `client/src/components/RankedQueue/`

### F3 Ranked Rating & Leaderboards (Medium)
- Route file (exists): `server/src/routes/leaderboardRoutes.js` → `/api/leaderboards`
- Create: `server/src/controllers/leaderboardController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/Leaderboards.jsx` → `/leaderboards`
- Create: `client/src/api/leaderboardApi.js`, components in `client/src/components/Leaderboards/`

### F4 Private Game Rooms (Easy)
- Route file (exists): `server/src/routes/roomRoutes.js` → `/api/rooms`
- Create: `server/src/controllers/roomController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/PrivateRooms.jsx` → `/rooms`
- Create: `client/src/api/roomApi.js`, components in `client/src/components/PrivateRooms/`

### F5 Match History & Review (Easy)
- Route file (exists): `server/src/routes/matchHistoryRoutes.js` → `/api/matches`
- Create: `server/src/controllers/matchHistoryController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/MatchHistory.jsx` → `/history`
- Create: `client/src/api/matchHistoryApi.js`, components in `client/src/components/MatchHistory/`

## Farin

### F6 Interactive Puzzle Engine (Hard)
- Route file (exists): `server/src/routes/puzzleRoutes.js` → `/api/puzzles`
- Create: `server/src/controllers/puzzleController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/Puzzles.jsx` → `/puzzles`
- Create: `client/src/api/puzzleApi.js`, components in `client/src/components/Puzzles/`

### F7 Daily Challenge (Medium)
- Route file (exists): `server/src/routes/dailyChallengeRoutes.js` → `/api/daily`
- Create: `server/src/controllers/dailyChallengeController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/DailyChallenge.jsx` → `/daily`
- Create: `client/src/api/dailyChallengeApi.js`, components in `client/src/components/DailyChallenge/`

### F8 Quiz Authoring & Publishing Workflow (Medium)
- Route file (exists): `server/src/routes/quizRoutes.js` → `/api/quizzes`
- Create: `server/src/controllers/quizController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/QuizAuthoring.jsx` → `/my-quizzes`
- Create: `client/src/api/quizApi.js`, components in `client/src/components/QuizAuthoring/`

### F9 Personalized Quiz Recommendations (Easy)
- Route file (exists): `server/src/routes/recommendationRoutes.js` → `/api/recommendations`
- Create: `server/src/controllers/recommendationController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/Recommendations.jsx` → `/recommended`
- Create: `client/src/api/recommendationApi.js`, components in `client/src/components/Recommendations/`

### F10 Category & Official Question Bank Management (Admin) (Easy)
- Route file (exists): `server/src/routes/adminContentRoutes.js` → `/api/admin/content`
- Create: `server/src/controllers/adminContentController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/AdminContent.jsx` → `/admin/content`
- Create: `client/src/api/adminContentApi.js`, components in `client/src/components/AdminContent/`

## Mim

### F11 Tournament Management (Hard)
- Route file (exists): `server/src/routes/tournamentRoutes.js` → `/api/tournaments`
- Create: `server/src/controllers/tournamentController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/Tournaments.jsx` → `/tournaments`
- Create: `client/src/api/tournamentApi.js`, components in `client/src/components/Tournaments/`

### F12 Friends & Social Connections (Medium)
- Route file (exists): `server/src/routes/friendRoutes.js` → `/api/friends`
- Create: `server/src/controllers/friendController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/Friends.jsx` → `/friends`
- Create: `client/src/api/friendApi.js`, components in `client/src/components/Friends/`

### F13 Clans / Study Groups (Medium)
- Route file (exists): `server/src/routes/clanRoutes.js` → `/api/clans`
- Create: `server/src/controllers/clanController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/Clans.jsx` → `/clans`
- Create: `client/src/api/clanApi.js`, components in `client/src/components/Clans/`

### F14 Activity Feed & Result Sharing (Easy)
- Route file (exists): `server/src/routes/feedRoutes.js` → `/api/feed`
- Create: `server/src/controllers/feedController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/ActivityFeed.jsx` → `/feed`
- Create: `client/src/api/feedApi.js`, components in `client/src/components/ActivityFeed/`

### F15 Performance Analytics Dashboard (Easy)
- Route file (exists): `server/src/routes/analyticsRoutes.js` → `/api/analytics`
- Create: `server/src/controllers/analyticsController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/Analytics.jsx` → `/analytics`
- Create: `client/src/api/analyticsApi.js`, components in `client/src/components/Analytics/`

## Moontaha

### F16 Admin Dashboard, User & Season Management (Admin) (Hard)
- Route file (exists): `server/src/routes/adminRoutes.js` → `/api/admin`
- Create: `server/src/controllers/adminController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/AdminDashboard.jsx` → `/admin`
- Create: `client/src/api/adminApi.js`, components in `client/src/components/AdminDashboard/`

### F17 Progression System (XP, Levels, Streaks & Badges) (Medium)
- Route file (exists): `server/src/routes/progressRoutes.js` → `/api/progress`
- Create: `server/src/controllers/progressController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/Achievements.jsx` → `/achievements`
- Create: `client/src/api/progressApi.js`, components in `client/src/components/Achievements/`

### F18 Content Moderation & Reporting (Medium)
- Route file (exists): `server/src/routes/moderationRoutes.js` → `/api/moderation`
- Create: `server/src/controllers/moderationController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/Moderation.jsx` → `/moderation`
- Create: `client/src/api/moderationApi.js`, components in `client/src/components/Moderation/`

### F19 Solo Practice Mode (Easy)
- Route file (exists): `server/src/routes/practiceRoutes.js` → `/api/practice`
- Create: `server/src/controllers/practiceController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/SoloPractice.jsx` → `/practice`
- Create: `client/src/api/practiceApi.js`, components in `client/src/components/SoloPractice/`

### F20 Notification Center (Easy)
- Route file (exists): `server/src/routes/notificationRoutes.js` → `/api/notifications`
- Create: `server/src/controllers/notificationController.js`, models in `server/src/models/`
- Page (exists): `client/src/pages/features/Notifications.jsx` → `/notifications`
- Create: `client/src/api/notificationApi.js`, components in `client/src/components/Notifications/`
