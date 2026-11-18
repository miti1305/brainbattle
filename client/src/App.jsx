// All pages and their URLs. Every feature page is already registered, so members
// only edit their own page files (fewer merge conflicts).
// Feature routes end with /* so each feature page can have its own sub-pages
// (e.g. /battle/:matchId) using <Routes> inside the page file.
import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import Battle from './pages/features/Battle.jsx';
import RankedQueue from './pages/features/RankedQueue.jsx';
import Leaderboards from './pages/features/Leaderboards.jsx';
import PrivateRooms from './pages/features/PrivateRooms.jsx';
import MatchHistory from './pages/features/MatchHistory.jsx';
import Puzzles from './pages/features/Puzzles.jsx';
import DailyChallenge from './pages/features/DailyChallenge.jsx';
import QuizAuthoring from './pages/features/QuizAuthoring.jsx';
import Recommendations from './pages/features/Recommendations.jsx';
import AdminContent from './pages/features/AdminContent.jsx';
import Tournaments from './pages/features/Tournaments.jsx';
import Friends from './pages/features/Friends.jsx';
import Clans from './pages/features/Clans.jsx';
import ActivityFeed from './pages/features/ActivityFeed.jsx';
import Analytics from './pages/features/Analytics.jsx';
import AdminDashboard from './pages/features/AdminDashboard.jsx';
import Achievements from './pages/features/Achievements.jsx';
import Moderation from './pages/features/Moderation.jsx';
import SoloPractice from './pages/features/SoloPractice.jsx';
import Notifications from './pages/features/Notifications.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        <Route path="/battle/*" element={<ProtectedRoute><Battle /></ProtectedRoute>} /> {/* F1 Abrar */}
        <Route path="/ranked/*" element={<ProtectedRoute><RankedQueue /></ProtectedRoute>} /> {/* F2 Abrar */}
        <Route path="/leaderboards/*" element={<ProtectedRoute><Leaderboards /></ProtectedRoute>} /> {/* F3 Abrar */}
        <Route path="/rooms/*" element={<ProtectedRoute><PrivateRooms /></ProtectedRoute>} /> {/* F4 Abrar */}
        <Route path="/history/*" element={<ProtectedRoute><MatchHistory /></ProtectedRoute>} /> {/* F5 Abrar */}
        <Route path="/puzzles/*" element={<ProtectedRoute><Puzzles /></ProtectedRoute>} /> {/* F6 Farin */}
        <Route path="/daily/*" element={<ProtectedRoute><DailyChallenge /></ProtectedRoute>} /> {/* F7 Farin */}
        <Route path="/my-quizzes/*" element={<ProtectedRoute><QuizAuthoring /></ProtectedRoute>} /> {/* F8 Farin */}
        <Route path="/recommended/*" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} /> {/* F9 Farin */}
        <Route path="/admin/content/*" element={<ProtectedRoute roles={['admin']}><AdminContent /></ProtectedRoute>} /> {/* F10 Farin */}
        <Route path="/tournaments/*" element={<ProtectedRoute><Tournaments /></ProtectedRoute>} /> {/* F11 Mim */}
        <Route path="/friends/*" element={<ProtectedRoute><Friends /></ProtectedRoute>} /> {/* F12 Mim */}
        <Route path="/clans/*" element={<ProtectedRoute><Clans /></ProtectedRoute>} /> {/* F13 Mim */}
        <Route path="/feed/*" element={<ProtectedRoute><ActivityFeed /></ProtectedRoute>} /> {/* F14 Mim */}
        <Route path="/analytics/*" element={<ProtectedRoute><Analytics /></ProtectedRoute>} /> {/* F15 Mim */}
        <Route path="/admin/*" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} /> {/* F16 Moontaha */}
        <Route path="/achievements/*" element={<ProtectedRoute><Achievements /></ProtectedRoute>} /> {/* F17 Moontaha */}
        <Route path="/moderation/*" element={<ProtectedRoute roles={['moderator', 'admin']}><Moderation /></ProtectedRoute>} /> {/* F18 Moontaha */}
        <Route path="/practice/*" element={<ProtectedRoute><SoloPractice /></ProtectedRoute>} /> {/* F19 Moontaha */}
        <Route path="/notifications/*" element={<ProtectedRoute><Notifications /></ProtectedRoute>} /> {/* F20 Moontaha */}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
