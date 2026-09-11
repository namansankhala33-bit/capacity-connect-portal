import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProfiles from './pages/admin/AdminProfiles';
import AdminCompetencies from './pages/admin/AdminCompetencies';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import TrainerDashboard from './pages/trainer/TrainerDashboard';
import CourseBuilder from './pages/trainer/CourseBuilder';
import TrainerExams from './pages/trainer/TrainerExams';
import TraineeDashboard from './pages/trainee/TraineeDashboard';
import TraineeLearning from './pages/trainee/TraineeLearning';
import TraineeCompetencies from './pages/trainee/TraineeCompetencies';
import TraineeSkillGaps from './pages/trainee/TraineeSkillGaps';
import './App.css';

const adminLinks = [
  { to: '/admin/dashboard', label: 'Control Room', icon: '📊' },
  { to: '/admin/profiles', label: 'Profile Approval', icon: '🛂' },
  { to: '/admin/competencies', label: 'Competency Register', icon: '🎯' },
  { to: '/admin/analytics', label: 'Analytics & Reports', icon: '📈' },
];

const trainerLinks = [
  { to: '/trainer/dashboard', label: 'Programme Overview', icon: '📊' },
  { to: '/trainer/course-builder', label: 'Model Course Builder', icon: '📝' },
  { to: '/trainer/exams', label: 'Assessment Design', icon: '📋' },
];

const traineeLinks = [
  { to: '/trainee/dashboard', label: 'My Dashboard', icon: '📊' },
  { to: '/trainee/learning', label: 'Learning Programmes', icon: '📚' },
  { to: '/trainee/competencies', label: 'Competency Profile', icon: '🎯' },
  { to: '/trainee/skill-gaps', label: 'Skill Gap Analysis', icon: '🔍' },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

function Sidebar() {
  const { currentUser, logout } = useApp();
  const role = currentUser?.role;
  const links = role === 'Admin' ? adminLinks : role === 'Trainer' ? trainerLinks : traineeLinks;
  const title = role === 'Admin' ? 'Administration' : role === 'Trainer' ? 'Training Wing' : 'Meteorologist Workspace';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>Capacity Connect</h2>
        <span>IMD · Ministry of Earth Sciences</span>
        <span>{title}</span>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section">Navigation</div>
        {links.map(link => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="avatar">{currentUser?.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'U'}</div>
          <div>
            <div className="user-name">{currentUser?.name}</div>
            <div className="user-role">{currentUser?.role} · {currentUser?.designation}</div>
          </div>
        </div>
        <button onClick={logout}>Sign Out</button>
      </div>
    </aside>
  );
}

function BottomDock() {
  const { currentUser, logout } = useApp();
  const role = currentUser?.role;
  const links = role === 'Admin' ? adminLinks : role === 'Trainer' ? trainerLinks : traineeLinks;

  return (
    <nav className="bottom-dock">
      {links.map(link => (
        <NavLink key={link.to} to={link.to} className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="dock-icon">{link.icon}</span>
          <span className="dock-label">{link.label}</span>
        </NavLink>
      ))}
      <button type="button" className="dock-logout" onClick={logout} aria-label="Sign out">
        <span className="dock-icon">⎋</span>
        <span className="dock-label">Exit</span>
      </button>
    </nav>
  );
}

function Topbar({ title }) {
  const { isOffline, mode } = useApp();
  return (
    <>
      {isOffline && <div className="offline-banner">You're currently offline. Your progress is being saved safely on this device.</div>}
      <div className="topbar" style={isOffline ? { marginTop: '40px' } : {}}>
        <div>
          <h1>{title}</h1>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            India Meteorological Department — Training & Outreach
          </div>
        </div>
        <div className="topbar-actions">
          <span className={`badge ${mode === 'live' ? 'badge-success' : 'badge-neutral'}`}>
            {mode === 'live' ? 'Cloud Connected' : 'Local Prototype Mode'}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>
    </>
  );
}

function DashboardShell({ title, children }) {
  const isMobile = useIsMobile();
  return (
    <div className="app-layout">
      {!isMobile && <Sidebar />}
      <main className="main-content">
        <Topbar title={title} />
        <div className={`page-content animate-in${isMobile ? ' mobile-scroll' : ''}`}>{children}</div>
      </main>
      {isMobile && <BottomDock />}
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, loading } = useApp();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p>Loading IMD training registry…</p>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={`/${currentUser.role.toLowerCase()}/dashboard`} replace />;
  }

  const path = location.pathname;
  const t =
    path.includes('dashboard') ? 'Dashboard' :
    path.includes('profiles') ? 'Profile Approval Queue' :
    path.includes('competencies') ? 'Meteorological Competency Register' :
    path.includes('analytics') ? 'Analytics & Reports' :
    path.includes('learning') ? 'Learning Programmes' :
    path.includes('skill-gaps') ? 'Skill Gap Analysis' :
    path.includes('course-builder') ? 'Model Course Builder' :
    path.includes('exams') ? 'Assessment Design' :
    'Capacity Connect';

  return <DashboardShell title={t}>{children}</DashboardShell>;
}

function AppRoutes() {
  const { currentUser, loading } = useApp();
  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to={`/${currentUser.role.toLowerCase()}/dashboard`} replace /> : <AppLoading><LoginPage /></AppLoading>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/profiles" element={<ProtectedRoute allowedRoles={['Admin']}><AdminProfiles /></ProtectedRoute>} />
      <Route path="/admin/competencies" element={<ProtectedRoute allowedRoles={['Admin']}><AdminCompetencies /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['Admin']}><AdminAnalytics /></ProtectedRoute>} />
      <Route path="/trainer/dashboard" element={<ProtectedRoute allowedRoles={['Trainer']}><TrainerDashboard /></ProtectedRoute>} />
      <Route path="/trainer/course-builder" element={<ProtectedRoute allowedRoles={['Trainer']}><CourseBuilder /></ProtectedRoute>} />
      <Route path="/trainer/exams" element={<ProtectedRoute allowedRoles={['Trainer']}><TrainerExams /></ProtectedRoute>} />
      <Route path="/trainee/dashboard" element={<ProtectedRoute allowedRoles={['Trainee']}><TraineeDashboard /></ProtectedRoute>} />
      <Route path="/trainee/learning" element={<ProtectedRoute allowedRoles={['Trainee']}><TraineeLearning /></ProtectedRoute>} />
      <Route path="/trainee/competencies" element={<ProtectedRoute allowedRoles={['Trainee']}><TraineeCompetencies /></ProtectedRoute>} />
      <Route path="/trainee/skill-gaps" element={<ProtectedRoute allowedRoles={['Trainee']}><TraineeSkillGaps /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function AppLoading({ children }) {
  const { loading } = useApp();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p>Loading IMD training registry…</p>
      </div>
    );
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;