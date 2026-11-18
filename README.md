# BrainBattle — Social Puzzle, Quiz & Competition Platform

CSE470 Software Engineering project by **Abrar, Farin, Mim and Moontaha**.

**Stack (MERN):** MongoDB Atlas + Mongoose · Express.js (MVC) · React (JavaScript, Vite) · Node.js · Socket.IO

## Project structure

```
brainbattle/
├── server/                 Backend: Node.js + Express (MVC)
│   ├── server.js           Starts DB connection, HTTP server, Socket.IO, jobs
│   └── src/
│       ├── models/         M: Mongoose schemas (User, Category, Quiz, ...)
│       ├── controllers/    C: request handling + logic
│       ├── routes/         URL -> controller (one file per feature, all pre-registered)
│       ├── middleware/     auth (protect, authorize), error handling
│       ├── services/       bigger shared logic + eventBus.js
│       ├── sockets/        Socket.IO handlers (battle, lobby, notifications)
│       ├── jobs/           node-cron scheduled jobs
│       ├── seed/           npm run seed (categories + admin account)
│       └── utils/
├── client/                 Frontend: React (V in MVC)
│   └── src/
│       ├── pages/          Home, Login, Register, Dashboard
│       ├── pages/features/ One page per feature (F1-F20), all pre-registered in App.jsx
│       ├── components/     Shared UI: Navbar, QuestionCard, Timer, ProtectedRoute
│       ├── api/            axios client + one API file per feature
│       ├── context/        AuthContext (logged-in user)
│       └── socket/         shared Socket.IO connection
├── docs/FEATURES.md        Who owns which files
└── CONTRIBUTING.md         Git workflow for the team (read this!)
```

## First-time setup (every member, on your own computer)

Requirements: **Node.js 20+**, **Git**, **VS Code**.

```bash
git clone https://github.com/miti1305/brainbattle.git
cd brainbattle

# Backend
cd server
npm install
copy .env.example .env        # Windows (PowerShell/CMD)
# cp .env.example .env        # macOS/Linux
```

Open `server/.env` and paste the real `MONGODB_URI` and `JWT_SECRET` (get them **privately** from Moontaha).

```bash
npm run seed                  # only needed once for the whole team (creates categories + admin)

# Frontend (in a second terminal)
cd client
npm install
```

## Running the app (two terminals)

| Terminal 1 (backend) | Terminal 2 (frontend) |
|---|---|
| `cd server` then `npm run dev` | `cd client` then `npm run dev` |
| API on http://localhost:5000 | App on **http://localhost:5173** |

Check the backend: open http://localhost:5000/api/health. It should show `{"status":"ok"}`.

Admin login after seeding: the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`.

## Scripts

| Folder | Command | What it does |
|---|---|---|
| server | `npm run dev` | Start API with auto-restart (nodemon) |
| server | `npm test` | Run Jest + Supertest tests |
| server | `npm run seed` | Create default categories and admin user |
| client | `npm run dev` | Start React app |
| client | `npm run build` | Production build |

## Features

| ID | Feature | Owner | Level | API | Page |
|---|---|---|---|---|---|
| F1 | Real-Time Multiplayer Quiz Battle | Abrar | Hard | `/api/battles` | `/battle` |
| F2 | Skill-Based Matchmaking | Abrar | Medium | `/api/matchmaking` | `/ranked` |
| F3 | Ranked Rating & Leaderboards | Abrar | Medium | `/api/leaderboards` | `/leaderboards` |
| F4 | Private Game Rooms | Abrar | Easy | `/api/rooms` | `/rooms` |
| F5 | Match History & Review | Abrar | Easy | `/api/matches` | `/history` |
| F6 | Interactive Puzzle Engine | Farin | Hard | `/api/puzzles` | `/puzzles` |
| F7 | Daily Challenge | Farin | Medium | `/api/daily` | `/daily` |
| F8 | Quiz Authoring & Publishing Workflow | Farin | Medium | `/api/quizzes` | `/my-quizzes` |
| F9 | Personalized Quiz Recommendations | Farin | Easy | `/api/recommendations` | `/recommended` |
| F10 | Category & Official Question Bank Management (Admin) | Farin | Easy | `/api/admin/content` | `/admin/content` |
| F11 | Tournament Management | Mim | Hard | `/api/tournaments` | `/tournaments` |
| F12 | Friends & Social Connections | Mim | Medium | `/api/friends` | `/friends` |
| F13 | Clans / Study Groups | Mim | Medium | `/api/clans` | `/clans` |
| F14 | Activity Feed & Result Sharing | Mim | Easy | `/api/feed` | `/feed` |
| F15 | Performance Analytics Dashboard | Mim | Easy | `/api/analytics` | `/analytics` |
| F16 | Admin Dashboard, User & Season Management (Admin) | Moontaha | Hard | `/api/admin` | `/admin` |
| F17 | Progression System (XP, Levels, Streaks & Badges) | Moontaha | Medium | `/api/progress` | `/achievements` |
| F18 | Content Moderation & Reporting | Moontaha | Medium | `/api/moderation` | `/moderation` |
| F19 | Solo Practice Mode | Moontaha | Easy | `/api/practice` | `/practice` |
| F20 | Notification Center | Moontaha | Easy | `/api/notifications` | `/notifications` |

Supporting functionality (login, registration, roles) is shared and not counted as a feature.
