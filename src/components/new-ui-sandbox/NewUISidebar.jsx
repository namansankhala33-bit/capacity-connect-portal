const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'skill-tree', label: 'Skill Tree', icon: '⚡' },
  { id: 'courses', label: 'Courses', icon: '📚' },
  { id: 'quests', label: 'Quests', icon: '🎯' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'badges', label: 'Badges', icon: '🎖️' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function NewUISidebar({ activeNav, onSelectNav }) {
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
            Ministry of Earth Sciences<br />
            <span style={{ color: '#94a3b8' }}>Government of India</span>
          </div>
        </div>
      </div>

      <nav className="new-ui-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            type="button"
            className={`new-ui-nav-item${activeNav === item.id ? ' active' : ''}`}
            onClick={() => onSelectNav(item.id)}
          >
            <span className="new-ui-nav-ico">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="new-ui-sandbox-tag" style={{ marginTop: 8 }}>New-UI Preview Shell</div>
    </aside>
  );
}