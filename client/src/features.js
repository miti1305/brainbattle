// Read-only list of the 20 features. Used for the navbar and dashboard.
export const FEATURES = [
  { id: 'F1', name: 'Real-Time Multiplayer Quiz Battle', owner: 'Abrar', level: 'Hard', path: '/battle' },
  { id: 'F2', name: 'Skill-Based Matchmaking', owner: 'Abrar', level: 'Medium', path: '/ranked' },
  { id: 'F3', name: 'Ranked Rating & Leaderboards', owner: 'Abrar', level: 'Medium', path: '/leaderboards' },
  { id: 'F4', name: 'Private Game Rooms', owner: 'Abrar', level: 'Easy', path: '/rooms' },
  { id: 'F5', name: 'Match History & Review', owner: 'Abrar', level: 'Easy', path: '/history' },
  { id: 'F6', name: 'Interactive Puzzle Engine', owner: 'Farin', level: 'Hard', path: '/puzzles' },
  { id: 'F7', name: 'Daily Challenge', owner: 'Farin', level: 'Medium', path: '/daily' },
  { id: 'F8', name: 'Quiz Authoring & Publishing Workflow', owner: 'Farin', level: 'Medium', path: '/my-quizzes' },
  { id: 'F9', name: 'Personalized Quiz Recommendations', owner: 'Farin', level: 'Easy', path: '/recommended' },
  { id: 'F10', name: 'Category & Official Question Bank Management (Admin)', owner: 'Farin', level: 'Easy', path: '/admin/content', roles: ['admin'] },
  { id: 'F11', name: 'Tournament Management', owner: 'Mim', level: 'Hard', path: '/tournaments' },
  { id: 'F12', name: 'Friends & Social Connections', owner: 'Mim', level: 'Medium', path: '/friends' },
  { id: 'F13', name: 'Clans / Study Groups', owner: 'Mim', level: 'Medium', path: '/clans' },
  { id: 'F14', name: 'Activity Feed & Result Sharing', owner: 'Mim', level: 'Easy', path: '/feed' },
  { id: 'F15', name: 'Performance Analytics Dashboard', owner: 'Mim', level: 'Easy', path: '/analytics' },
  { id: 'F16', name: 'Admin Dashboard, User & Season Management (Admin)', owner: 'Moontaha', level: 'Hard', path: '/admin', roles: ['admin'] },
  { id: 'F17', name: 'Progression System (XP, Levels, Streaks & Badges)', owner: 'Moontaha', level: 'Medium', path: '/achievements' },
  { id: 'F18', name: 'Content Moderation & Reporting', owner: 'Moontaha', level: 'Medium', path: '/moderation', roles: ['moderator', 'admin'] },
  { id: 'F19', name: 'Solo Practice Mode', owner: 'Moontaha', level: 'Easy', path: '/practice' },
  { id: 'F20', name: 'Notification Center', owner: 'Moontaha', level: 'Easy', path: '/notifications' },
];

export const MEMBERS = ['Abrar', 'Farin', 'Mim', 'Moontaha'];
