import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useIsMobile } from '../../utils/useIsMobile';
import NewUIBackground from './NewUIBackground';

const ROLE_LINKS = {
  Admin: [
    { to: '/admin/dashboard', label: 'Control Room', icon: '💠' },
    { to: '/admin/profiles', label: 'Profile Approval', icon: '🛂' },
    { to: '/admin/competencies', label: 'Competency Register', icon: '🎯' },
    { to: '/admin/analytics', label: 'Analytics & Reports', icon: '📈' },
  ],
  Trainer: [
    { to: '/trainer/dashboard', label: 'Programme Overview', icon: '📊' },
    { to: '/trainer/course-builder', label: 'Model Course Builder', icon: '🧩' },
    { to: '/trainer/exams', label: 'Assessment Design', icon: '📋' },
  ],
  Trainee: [
    { to: '/trainee/dashboard', label: 'My Dashboard', icon: '💠' },
    { to: '/trainee/learning', label: 'Learning Programmes', icon: '📚' },
    { to: '/trainee/competencies', label: 'Competency Profile', icon: '🎯' },
    { to: '/trainee/skill-gaps', label: 'Skill Gap Analysis', icon: '🔍' },
  ],
};

const ROLE_TITLE = { Admin: 'Administration', Trainer: 'Training Wing', Trainee: 'Meteorologist Workspace' };

function NewUIDock({ links, onLogout }) {
  return (
    <nav className="new-ui-dock" aria-label="Primary">
      {links.map(link => (
        <NavLink key={link.to} to={link.to} className={({ isActive }) => `new-ui-dock-item${isActive ? ' active' : ''}`}>
          <span className="new-ui-dock-icon">{link.icon}</span>
          <span className="new-ui-dock-label">{link.label}</span>
        </NavLink>
      ))}
      <button type="button" className="new-ui-dock-item new-ui-dock-logout" onClick={onLogout} aria-label="Sign out">
        <span className="new-ui-dock-icon">⎋</span>
        <span className="new-ui-dock-label">Exit</span>
      </button>
    </nav>
  );
}

function NewUIAppSidebar() {
  const { currentUser, logout } = useApp();
  const role = currentUser?.role;
  const links = ROLE_LINKS[role] || [];
  const initials = (currentUser?.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2);

  return (
    <aside className="new-ui-sidebar">
      <div className="new-ui-brand">
        <div className="new-ui-emblem">
          <svg viewBox="0 0 100 100" fill="none" aria-label="Emblem of India">
            <circle cx="50" cy="50" r="38" stroke="#0369a1" strokeWidth="3" fill="none" />
            <circle cx="50" cy="50" r="12" stroke="#ea580c" strokeWidth="2.5" fill="none" />
            <path d="M50 12 V88 M12 50 H88 M23 23 L77 77 M23 77 L77 23" stroke="#0284c7" strokeWidth="1.5" />
          </svg>
        </div>
        <div>
          <div className="new-ui-brand-name">Capacity Connect</div>
          <div className="new-ui-brand-sub">
            IMD · Ministry of Earth Sciences<br />
            <span style={{ color: '#4f46e5', fontWeight: 700 }}>{ROLE_TITLE[role]}</span>
          </div>
        </div>
      </div>

      <nav className="new-ui-nav">
        {links.map(link => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => `new-ui-nav-item${isActive ? ' active' : ''}`}>
            <span className="new-ui-nav-ico">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ borderTop: '1px solid rgba(226,232,240,0.8)', paddingTop: 12 }}>
        <div className="user-info">
          <div className="avatar" style={{ color: 'var(--nui-ink)' }}>{initials}</div>
          <div>
            <div className="user-name">{currentUser?.name}</div>
            <div className="user-role">{currentUser?.role} · {currentUser?.designation}</div>
          </div>
        </div>
        <button className="new-ui-signout" onClick={logout}>Sign Out</button>
      </div>
    </aside>
  );
}

export default function NewUIAppShell({ title, children }) {
  const { isOffline, mode, currentUser, logout } = useApp();
  const isMobile = useIsMobile();
  const [sound, setSound] = useState(true);
  const [bright, setBright] = useState(false);
  const initials = (currentUser?.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2);
  const links = ROLE_LINKS[currentUser?.role] || [];

  return (
    <div className="new-ui-scope">
      <NewUIBackground />

      <div className="offline-banner-new" style={{ display: isOffline ? 'block' : 'none' }}>
        You're currently offline. Your progress is being saved safely on this device.
      </div>

      <div className="new-ui-shell">
        {!isMobile && <NewUIAppSidebar />}

        <main className="new-ui-main">
          <div className="new-ui-topbar">
            <div>
              <h1>{title}</h1>
              <p>India Meteorological Department · Training &amp; Outreach</p>
            </div>
            <div className="new-ui-actions">
              <span className="new-ui-streak">🔥 <span>New-UI Integrated</span></span>
              <span className={`new-ui-mode new-ui-mode-${mode === 'live' ? 'live' : 'standby'}`}>
                {mode === 'live' ? 'Cloud Connected' : 'Network Standby'}
              </span>
              <span className="new-ui-date">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <button type="button" className="new-ui-icon-btn" aria-label="Toggle sound" onClick={() => setSound(s => !s)}>
                {sound ? '🔊' : '🔇'}
              </button>
              <button type="button" className="new-ui-icon-btn" aria-label="Toggle theme" onClick={() => setBright(b => !b)}>
                {bright ? '☀️' : '🌙'}
              </button>
              <div className="new-ui-avatar">
                {initials}
              </div>
            </div>
          </div>

          <div className={`new-ui-content${isMobile ? ' new-ui-mobile-pad' : ''}`}>
            {children}
          </div>
        </main>
      </div>

      {isMobile && <NewUIDock links={links} onLogout={logout} />}
    </div>
  );
}