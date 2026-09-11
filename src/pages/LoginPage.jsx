import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { demoAccounts } from '../data/imdSeedData';

export default function LoginPage() {
  const { login, mode, resetDemoData } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <div className="login-card">
        <div className="login-header">
          <h1>Capacity Connect</h1>
          <p>IMD Workforce Development Platform</p>
          <p>Ministry of Earth Sciences · India Meteorological Department</p>
        </div>
        <div className="login-body">
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
          </form>
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
        </div>
      </div>
    </div>
  );
}