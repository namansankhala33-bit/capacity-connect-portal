import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useIsMobile } from '../utils/useIsMobile';
import { demoAccounts } from '../data/imdSeedData';

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
    <div className="login-page">
      <div
        className="login-split"
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'stretch',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          gap: '30px',
          padding: '20px',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="home-feed"
          style={{
            width: isMobile ? '100%' : '50%',
            minWidth: isMobile ? '100%' : '400px',
            boxSizing: 'border-box',
          }}
        >
          <div className="home-feed-header">
            <div className="home-feed-title">
              <span className="home-feed-live" />
              <h2>Homepage Bulletin Feed</h2>
            </div>
            <span className="badge badge-danger">● LIVE</span>
          </div>
          <div className="home-feed-sub">
            Notifications · Announcements · Achievements · New Content — transmitted by the Administration Control Room.
          </div>
          <div className="home-feed-list">
            {bulletinBoard.length === 0 && (
              <div className="home-feed-empty">No broadcasts published yet. The Director General will post updates here.</div>
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
          <div className="home-feed-foot">{bulletinBoard.length} transmission(s) on the homepage</div>
        </div>

        <div
          className="login-card"
          style={{
            width: isMobile ? '100%' : '50%',
            minWidth: isMobile ? '100%' : '400px',
            boxSizing: 'border-box',
          }}
        >
          <div className="login-header">
            <h1>Capacity Connect</h1>
            <p>IMD Workforce Development Platform</p>
            <p>Ministry of Earth Sciences · India Meteorological Department</p>
          </div>
          <div className="login-body">
            {view === 'signin' ? (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Official Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="officer@imd.gov.in" required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
                </div>
                {error && <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
                  {busy ? 'Authenticating…' : 'Sign In'}
                </button>
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <button type="button" className="link-btn" onClick={() => { setView('register'); setError(''); }}>
                    New Trainee? Register for an IMD Accreditation account →
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="e.g., Dr. Ananya Deshpande" required />
                </div>
                <div className="form-group">
                  <label>Official Email</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="name@imd.gov.in" required />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input type="text" value={regDesignation} onChange={e => setRegDesignation(e.target.value)} placeholder="e.g., Met Assistant" required />
                </div>
                <div className="form-group">
                  <label>Station Location</label>
                  <input type="text" value={regStation} onChange={e => setRegStation(e.target.value)} placeholder="e.g., RMC Bhubaneswar" required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Create password" />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 12px' }}>
                  Registration commissions no badge automatically — the Director General verifies your credentials in the Accreditation Lock.
                </p>
                {error && <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
                <button type="submit" className="btn btn-amber btn-block btn-lg" disabled={busy}>
                  {busy ? 'Registering…' : '🛰 Register & Open Accreditation Lock'}
                </button>
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <button type="button" className="link-btn" onClick={() => { setView('signin'); setError(''); }}>
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}
            {view === 'signin' && (
            <div className="demo-accounts">
              <h4>Demo Accounts — One-Click Access</h4>
              {demoAccounts.map(acc => (
                <button key={acc.email} className="demo-btn" onClick={() => quickLogin(acc)} disabled={busy}>
                  <span className="role-label">{acc.role === 'Admin' ? '🔐' : acc.role === 'Trainer' ? '📋' : '👤'} {acc.role}</span>
                  <span className="email-label">{acc.name}</span>
                  <span className="email-label">{acc.email}</span>
                </button>
              ))}
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                {mode === 'live' ? 'Connected to live Supabase cloud. Unapproved trainees sign in to the Accreditation Lock portal before Admin commissioning.' : 'Local prototype mode. Add Supabase keys in .env.local to go live.'}
              </div>
              {mode !== 'live' && (
                <button
                  onClick={handleReset}
                  style={{ marginTop: '10px', width: '100%', padding: '6px', fontSize: '11px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  ↺ Reset local demo data
                </button>
              )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}