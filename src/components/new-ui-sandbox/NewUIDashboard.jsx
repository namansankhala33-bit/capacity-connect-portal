import { useState } from 'react';
import NewUIBackground from './NewUIBackground';
import NewUISidebar from './NewUISidebar';
import { NewUIOceanHero, NewUIStatGrid, NewUIRankStreak, NewUIRadarPreview, NewUIGradientPreview, NewUIQuoteCard } from './NewUIPreviews';
import mikuAvatar from '../../assets/new-ui/miku_sidebar_pointing_1789233602826.jpg';

export default function NewUIDashboard() {
  const [activeNav, setActiveNav] = useState('home');
  const [sound, setSound] = useState(true);
  const [bright, setBright] = useState(false);

  return (
    <div className="new-ui-scope">
      <NewUIBackground />
      <div className="new-ui-shell">
        <NewUISidebar activeNav={activeNav} onSelectNav={setActiveNav} />

        <main className="new-ui-main">
          <div className="new-ui-preview-note">
            <span>🧪</span>
            <span>
              SANDBOXED NEW-UI PREVIEW. Pure visual shell — all data hooks are empty string placeholders. Toggle in
              <code> src/App.jsx → debugNewUI</code>
              (true = preview, false = stable app).
            </span>
          </div>

          <div className="new-ui-topbar">
            <div>
              <h1>Command Overview Dashboard</h1>
              <p>Ministry of Earth Sciences · Government of India</p>
            </div>
            <div className="new-ui-actions">
              <span className="new-ui-streak">🔥 <span>Streak</span> · <span /></span>
              <input className="new-ui-search" type="search" placeholder="Command search…" aria-label="Command search" />
              <button type="button" className="new-ui-icon-btn" aria-label="Toggle sound" onClick={() => setSound(s => !s)}>
                {sound ? '🔊' : '🔇'}
              </button>
              <button type="button" className="new-ui-icon-btn" aria-label="Toggle theme" onClick={() => setBright(b => !b)}>
                {bright ? '☀️' : '🌙'}
              </button>
              <div className="new-ui-avatar">
                <img src={mikuAvatar} alt="Guide avatar" />
              </div>
            </div>
          </div>

          <div className="new-ui-content">
            <div className="new-ui-row">
              <NewUIOceanHero />
              <NewUIRankStreak />
            </div>

            <NewUIStatGrid />

            <div className="new-ui-grid-3">
              <NewUIRadarPreview />
              <NewUIGradientPreview />
              <NewUIQuoteCard />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}