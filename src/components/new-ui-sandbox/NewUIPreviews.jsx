import oceanHero from '../../assets/new-ui/ocean_hero_banner_1789233583380.jpg';
import mikuAvatar from '../../assets/new-ui/miku_suit_avatar_1789231458618.jpg';

const STAT_LABELS = ['Active Stations', 'Trainees on Duty', 'Courses Live', 'Competency Coverage'];

const TIERS = [
  { emoji: '🦝', label: 'Raccoon' },
  { emoji: '🐆', label: 'Baby Cheetah' },
  { emoji: '🦁', label: 'Champ Lion' },
  { emoji: '🐬', label: 'Star Dolphin' },
];

export function NewUIOceanHero() {
  return (
    <div className="new-ui-panel new-ui-hero">
      <img src={oceanHero} alt="Ocean operations banner" />
      <div className="new-ui-hero-veil" />
      <div className="new-ui-hero-cap">
        <h3>Oceanic Operations Command</h3>
        <p>Next-generation workforce development and operational weather command portal — visual preview shell with data hooks replaced by empty placeholders.</p>
      </div>
    </div>
  );
}

export function NewUIStatGrid() {
  return (
    <div className="new-ui-stat-grid">
      {STAT_LABELS.map(label => (
        <div className="new-ui-stat" key={label}>
          <div className="new-ui-stat-label">{label}</div>
          <div className="new-ui-stat-value empty"></div>
          <div className="new-ui-stat-foot">
            <span className="new-ui-skeleton" style={{ display: 'inline-block', width: '60%', height: 8 }}></span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NewUIRankStreak() {
  return (
    <div className="new-ui-panel">
      <div className="new-ui-panel-head">
        <div>
          <div className="new-ui-panel-title">Learner Rank &amp; Streak</div>
          <div className="new-ui-panel-sub">Empty data placeholders</div>
        </div>
        <span className="new-ui-chip">NEW-UI</span>
      </div>
      <div className="new-ui-rank">
        <div className="new-ui-rank-big">
          <div className="new-ui-rank-emoji">🦝</div>
          <div>
            <div className="new-ui-rank-name"></div>
            <div className="new-ui-rank-sub">Daily practice streak</div>
          </div>
        </div>
        {TIERS.map(tier => (
          <div className="new-ui-tier-row" key={tier.label}>
            <div className="new-ui-tier-emoji">{tier.emoji}</div>
            <div className="new-ui-tier-label">{tier.label}</div>
            <div className="new-ui-tier-xp"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewUIRadarPreview() {
  return (
    <div className="new-ui-panel">
      <div className="new-ui-panel-head">
        <div>
          <div className="new-ui-panel-title">Radar Simulation Lab</div>
          <div className="new-ui-panel-sub">Doppler sweep · static shell</div>
        </div>
        <span className="new-ui-chip">PREVIEW</span>
      </div>
      <div className="new-ui-radar">
        <div className="new-ui-radar-dish">
          <div className="new-ui-radar-sweep" />
          <div className="new-ui-radar-dot" style={{ top: '28%', left: '58%' }} />
          <div className="new-ui-radar-dot-2" style={{ top: '62%', left: '26%' }} />
          <div className="new-ui-radar-dot" style={{ top: '70%', left: '72%', width: 8, height: 8 }} />
        </div>
        <div className="new-ui-panel-sub">Sweep visualization · data episodes empty</div>
      </div>
    </div>
  );
}

export function NewUIGradientPreview() {
  return (
    <div className="new-ui-panel">
      <div className="new-ui-panel-head">
        <div>
          <div className="new-ui-panel-title">Maximalist Gradient Studio</div>
          <div className="new-ui-panel-sub">Cosmic Aurora · Sunset Doppler · Cyber Tempest · Prism</div>
        </div>
        <span className="new-ui-chip">THEME</span>
      </div>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['cosmic-aurora', 'sunset-doppler', 'cyber-tempest', 'prism-iridescent'].map((g, i) => (
          <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 88, height: 34, borderRadius: 10, border: '1px solid #e2e8f0', background: `linear-gradient(120deg, ${gradientColors[i]})` }} />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{g.replace('-', ' ')}</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>empty</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const gradientColors = [
  '#06b6d4, #10b981, #4f46e5',
  '#f472b6, #fb923c, #7c3aed',
  '#22d3ee, #818cf8, #4f46e5',
  '#f0abfc, #a5b4fc, #34d399',
];

export function NewUIQuoteCard() {
  return (
    <div className="new-ui-panel new-ui-quote">
      <div className="new-ui-panel-title" style={{ marginBottom: 10 }}>Ocean Quote Card</div>
      <div className="q">"The ocean whispers the forecast before the sky does."</div>
      <div className="a">— IMD Training Wing · static template</div>
      <div style={{ marginTop: 18, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
        <img
          src={mikuAvatar}
          alt="Guide avatar"
          style={{ width: 46, height: 46, borderRadius: 14, objectFit: 'cover', border: '1px solid #e2e8f0' }}
        />
      </div>
    </div>
  );
}