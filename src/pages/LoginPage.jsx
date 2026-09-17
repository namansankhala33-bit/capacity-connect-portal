import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useIsMobile } from '../utils/useIsMobile';
import { demoAccounts } from '../data/imdSeedData';
import NewUIBackground from '../components/new-ui-sandbox/NewUIBackground';

function bulTagClass(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('achievement')) return 'amber';
  if (t.includes('new content')) return 'violet';
  if (t.includes('announcement')) return 'green';
  return 'red';
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(d || '');
  }
}

function LoginBrand() {
  return (
    <div className="new-ui-login-brand">
      <div className="new-ui-emblem">
        <svg viewBox="0 0 100 100" fill="none" aria-label="Emblem of India">
          <circle cx="50" cy="50" r="38" stroke="#0369a1" strokeWidth="3" fill="none" />
          <circle cx="50" cy="50" r="12" stroke="#ea580c" strokeWidth="2.5" fill="none" />
          <path d="M50 12 V88 M12 50 H88 M23 23 L77 77 M23 77 L77 23" stroke="#0284c7" strokeWidth="1.5" />
        </svg>
      </div>
      <div>
        <div className="new-ui-brand-name">Capacity Connect</div>
        <div className="new-ui-brand-sub">IMD Workforce Development Platform</div>
        <div className="new-ui-brand-sub">Ministry of Earth Sciences · India Meteorological Department</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login, register, mode, resetDemoData, bulletinBoard } = useApp();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [view, setView] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDesignation, setRegDesignation] = useState('');
  const [regStation, setRegStation] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(`/${result.user.role.toLowerCase()}/dashboard`);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message || 'Sign-in failed');
    }
    setBusy(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register({
        name: regName,
        email: regEmail,
        designation: regDesignation,
        station_location: regStation,
        password: regPassword || 'demo123',
      });
      navigate('/trainee/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
    setBusy(false);
  }

  async function quickLogin(account) {
    setError('');
    setBusy(true);
    try {
      const result = await login(account.email, account.password);
      if (result.success) {
        navigate(`/${result.user.role.toLowerCase()}/dashboard`);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message || 'Sign-in failed');
    }
    setBusy(false);
  }

  async function handleReset() {
    await resetDemoData();
    setError('');
    setEmail('');
    setPassword('');
  }

  return (
    <div className="new-ui-scope">
      <NewUIBackground />

      <div className="new-ui-login-wrap">
        <div className="new-ui-panel new-ui-login-card">
          <LoginBrand />

          <div className="new-ui-login-body">
            {view === 'signin' ? (
              <form onSubmit={handleSubmit}>
                <div className="new-ui-login-field">
                  <label>Official Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="officer@imd.gov.in" required />
                </div>
                <div className="new-ui-login-field">
                  <label>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
                </div>
                {error && <div className="new-ui-login-err">{error}</div>}
                <button type="submit" className="new-ui-login-submit" disabled={busy}>
                  {busy ? 'Authenticating…' : 'Sign In'}
                </button>
                <div style={{ marginTop: 14, textAlign: 'center' }}>
                  <button type="button" className="new-ui-login-toggle" onClick={() => { setView('register'); setError(''); }}>
                    New Trainee? Register for an IMD Accreditation account →
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="new-ui-login-field">
                  <label>Full Name</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="e.g., Dr. Ananya Deshpande" required />
                </div>
                <div className="new-ui-login-field">
                  <label>Official Email</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="name@imd.gov.in" required />
                </div>
                <div className="new-ui-login-field">
                  <label>Designation</label>
                  <input type="text" value={regDesignation} onChange={e => setRegDesignation(e.target.value)} placeholder="e.g., Met Assistant" required />
                </div>
                <div className="new-ui-login-field">
                  <label>Station Location</label>
                  <input type="text" value={regStation} onChange={e => setRegStation(e.target.value)} placeholder="e.g., RMC Bhubaneswar" required />
                </div>
                <div className="new-ui-login-field">
                  <label>Password</label>
                  <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Create password" />
                </div>
                <div className="new-ui-login-hint">
                  Registration commissions no badge automatically — the Director General verifies your credentials in the Accreditation Lock.
                </div>
                {error && <div className="new-ui-login-err">{error}</div>}
                <button type="submit" className="new-ui-login-submit" disabled={busy}>
                  {busy ? 'Registering…' : '🛰 Register & Open Accreditation Lock'}
                </button>
                <div style={{ marginTop: 14, textAlign: 'center' }}>
                  <button type="button" className="new-ui-login-toggle" onClick={() => { setView('signin'); setError(''); }}>
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {view === 'signin' && (
              <div className="new-ui-login-demo">
                <h4>Demo Accounts — One-Click Access</h4>
                {demoAccounts.map(acc => (
                  <button key={acc.email} type="button" className="new-ui-login-demo-item" onClick={() => quickLogin(acc)} disabled={busy}>
                    <span className="role-badge">{acc.role === 'Admin' ? 'Admin' : acc.role === 'Trainer' ? 'Train' : 'Grad'}</span>
                    <span>
                      <span className="acc-name">{acc.name}</span>
                      <span className="acc-email">{acc.email}</span>
                    </span>
                    <span className="role-emoji">{acc.role === 'Admin' ? '🔐' : acc.role === 'Trainer' ? '📋' : '👤'}</span>
                  </button>
                ))}
                <div className="new-ui-login-foot">
                  {mode === 'live'
                    ? 'Connected to live Supabase cloud. Unapproved trainees sign in to the Accreditation Lock portal before Admin commissioning.'
                    : 'Network standby. Configure cloud credentials to activate live dispersion.'}
                </div>
                {mode !== 'live' && (
                  <button type="button" className="new-ui-login-reset" onClick={handleReset}>
                    ↺ Reset local demo data
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="new-ui-panel new-ui-login-feed" style={isMobile ? { maxHeight: 420 } : {}}>
          <div className="new-ui-feed-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="new-ui-feed-live" />
              <h2 className="new-ui-panel-title">Homepage Bulletin Feed</h2>
            </div>
            <span className="new-ui-chip">● LIVE</span>
          </div>
          <div className="new-ui-panel-sub" style={{ paddingBottom: 12 }}>
            Notifications · Announcements · Achievements · New Content — transmitted by the Administration Control Room.
          </div>
          <div className="new-ui-feed-list">
            {bulletinBoard.length === 0 && (
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, padding: '10px 0' }}>
                No broadcasts published yet. The Director General will post updates here.
              </div>
            )}
            {bulletinBoard.map(b => (
              <div key={b.id} className="bul-row">
                <span className={`bul-tag bul-tag-${bulTagClass(b.type)}`}>{b.type}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="bul-title">{b.title}</div>
                  <div className="bul-meta">{formatDate(b.date_created || b.date)}</div>
                  <div className="bul-msg">{b.message}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="new-ui-feed-foot">{bulletinBoard.length} transmission(s) on the homepage</div>
        </div>
      </div>
    </div>
  );
}