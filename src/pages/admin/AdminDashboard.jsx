import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function AdminDashboard() {
  const { profiles, courses, competencies, scores, bulletins, adminCreateDirectProfile, adminApproveTrainee } = useApp();

  const [enroll, setEnroll] = useState({ name: '', email: '', designation: '', station_location: '' });
  const [enrolling, setEnrolling] = useState(false);
  const [issuedOfficer, setIssuedOfficer] = useState(null);
  const [enrollMsg, setEnrollMsg] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [approveMsg, setApproveMsg] = useState('');

  function handleEnrollSubmit(e) {
    e.preventDefault();
    setEnrolling(true);
    setEnrollMsg('');
    adminCreateDirectProfile(enroll)
      .then(officer => {
        setIssuedOfficer(officer);
        setEnroll({ name: '', email: '', designation: '', station_location: '' });
      })
      .catch(err => { setEnrollMsg(err.message || 'Provisioning failed.'); setIssuedOfficer(null); })
      .finally(() => setEnrolling(false));
  }

  function approveRow(id) {
    setApprovingId(id);
    setApproveMsg('');
    adminApproveTrainee(id)
      .then(() => setApproveMsg('✅ Profile commissioned. Trainee workspace unlocked.'))
      .catch(err => setApproveMsg('✗ ' + (err.message || 'Approval failed.')))
      .finally(() => setApprovingId(null));
  }

  const trainees = profiles.filter(p => p.role === 'Trainee');
  const pending = profiles.filter(p => p.role === 'Trainee' && !p.approved_by_admin);
  const trainerCount = profiles.filter(p => p.role === 'Trainer').length;
  const avgCompetency = scores.length
    ? Math.round(scores.reduce((a, s) => a + s.current_score, 0) / scores.length)
    : 0;
  const priorityCount = scores.filter(s => (s.target_score - s.current_score) >= 25).length;

  const stationStats = {};
  trainees.forEach(t => {
    if (!stationStats[t.station_location]) stationStats[t.station_location] = { trainees: 0, sum: 0, scores: 0 };
    stationStats[t.station_location].trainees += 1;
    const myScores = scores.filter(s => s.trainee_id === t.id);
    myScores.forEach(s => { stationStats[t.station_location].sum += s.current_score; stationStats[t.station_location].scores += 1; });
  });
  const stationRows = Object.entries(stationStats).map(([station, data]) => ({
    station,
    trainees: data.trainees,
    avg: data.scores ? Math.round(data.sum / data.scores) : 0,
  }));

  return (
    <div>
      <div className="loop-indicator">
        <span className="loop-step completed">Learn</span>
        <span className="loop-arrow">→</span>
        <span className="loop-step completed">Assess</span>
        <span className="loop-arrow">→</span>
        <span className="loop-step active">Measure Competencies</span>
        <span className="loop-arrow">→</span>
        <span className="loop-step">Identify Gaps</span>
        <span className="loop-arrow">→</span>
        <span className="loop-step">Recommend</span>
        <span className="loop-arrow">→</span>
        <span className="loop-step">Reassess</span>
        <span className="loop-arrow">→</span>
        <span className="loop-step">Track</span>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', borderLeft: '6px solid var(--danger)' }}>
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <h3>🟧 Section A — Pending Verification Queue</h3>
            {approveMsg && (
              <span className="processing-banner" style={{ color: approveMsg.startsWith('✗') ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{approveMsg}</span>
            )}
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {pending.map(p => (
              <div key={p.id} className={`accred-row${approvingId === p.id ? ' processing' : ''}`}>
                <div className="accred-row-grid">
                  <div className="accred-row-id">
                    <div className="accred-row-name">{p.name} · <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{p.employee_id || 'NO BADGE'}</span></div>
                    <div className="accred-row-meta">{p.email} · {p.designation} · {p.station_location}</div>
                    <span style={{
                      display: 'inline-block', marginTop: '8px', padding: '3px 10px', borderRadius: 'var(--radius)',
                      fontSize: '10px', fontWeight: 700, letterSpacing: '1px',
                      background: p.profile_submitted ? 'rgba(34,197,94,0.12)' : 'rgba(120,120,128,0.14)',
                      color: p.profile_submitted ? 'var(--success)' : 'var(--text-secondary)',
                    }}>
                      {p.profile_submitted ? '✔ CREDENTIALS SUBMITTED' : '· REGISTERED, NO SUBMISSION'}
                    </span>
                  </div>
                  <div className="accred-row-chips">
                    <div className="accred-chip-group">
                      <span className="accred-chip-label">Qualifications</span>
                      <div>{renderChips(p.qualifications?.list, '—')}</div>
                    </div>
                    <div className="accred-chip-group">
                      <span className="accred-chip-label">Work Experience</span>
                      <div>{renderChips(p.work_experience, '—')}</div>
                    </div>
                    <div className="accred-chip-group">
                      <span className="accred-chip-label">Interests</span>
                      <div>{renderChips(p.interests, '—')}</div>
                    </div>
                  </div>
                  <div className="accred-row-action">
                    {approvingId === p.id ? (
                      <div className="processing-banner" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)', maxWidth: '200px' }}>
                        <div className="ai-spinner" /> Verifying portfolio against department records…
                      </div>
                    ) : (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => approveRow(p.id)}>
                        Grant Access&nbsp;&nbsp;&amp;&nbsp;&nbsp;Verify Profile
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {pending.length === 0 && (
        <div className="card" style={{ marginBottom: '24px', borderLeft: '6px solid var(--success)' }}>
          <div className="card-body" style={{ padding: '16px 24px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>✅ Commissioning Queue Empty</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              All registered profiles have been verified by the Director General. New credentials transmitted by trainees will appear here in Section A.
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px', borderLeft: '6px solid var(--warning)' }}>
        <div className="card-header">
          <h3>🎖 Section B — Direct Provisioning Node</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-2">
            <div>
              {enrollMsg && (
                <div className="skill-gap-alert high" style={{ marginBottom: '16px' }}>
                  <strong>✗ {enrollMsg}</strong>
                </div>
              )}
              <form onSubmit={handleEnrollSubmit}>
                <div className="grid grid-2" style={{ gap: '12px' }}>
                  <div className="form-group">
                    <label>Officer Name</label>
                    <input type="text" value={enroll.name} onChange={e => setEnroll({ ...enroll, name: e.target.value })} placeholder="e.g., Dr. Meera Joshi" required />
                  </div>
                  <div className="form-group">
                    <label>Official Email</label>
                    <input type="email" value={enroll.email} onChange={e => setEnroll({ ...enroll, email: e.target.value })} placeholder="name@imd.gov.in" required />
                  </div>
                </div>
                <div className="grid grid-2" style={{ gap: '12px' }}>
                  <div className="form-group">
                    <label>Rank / Designation</label>
                    <input type="text" value={enroll.designation} onChange={e => setEnroll({ ...enroll, designation: e.target.value })} placeholder="e.g., Scientist-C" required />
                  </div>
                  <div className="form-group">
                    <label>Station Location</label>
                    <input type="text" value={enroll.station_location} onChange={e => setEnroll({ ...enroll, station_location: e.target.value })} placeholder="e.g., RMC Chennai" required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={enrolling}>
                  {enrolling ? 'Accrediting officer…' : '🪪 Issue Credentials Card'}
                </button>
              </form>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                Bypasses Section A review: a unique formatted badge (<code>IMD-2026-MET-###</code>) is generated, the record is pushed to the
                <code> user_profiles</code> registry as an <strong>immediately commissioned</strong> Trainee, and a printable Officer Credentials Token Card is issued.
              </div>
            </div>

            <div>
              {issuedOfficer ? (
                <OfficerTokenCard officer={issuedOfficer} />
              ) : (
                <div className="empty-state" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', height: '100%' }}>
                  <div className="icon">🪪</div>
                  <h3>No active credential token</h3>
                  <p>Enrol an officer to issue the printable Credentials Token Card.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '24px' }}>
        <div className="stat-card primary">
          <div className="stat-label">Registered Trainees</div>
          <div className="stat-value">{trainees.length}</div>
          <div className="stat-change up">Across stations nationwide</div>
        </div>
        <div className="stat-card secondary">
          <div className="stat-label">Active Model Courses</div>
          <div className="stat-value">{courses.length}</div>
          <div className="stat-change up">{trainerCount} training scientists</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Avg Competency</div>
          <div className="stat-value">{avgCompetency}%</div>
          <div className="stat-change up">Org-wide measure</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Critical Gaps</div>
          <div className="stat-value" style={{ color: priorityCount > 0 ? 'var(--danger)' : 'var(--success)' }}>{priorityCount}</div>
          <div className="stat-change">25+ pts below target</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Competency Register — Organisation Snapshot</h3>
          </div>
          <div className="card-body" style={{ padding: '12px 24px' }}>
            {competencies.map(comp => {
              const compRows = scores.filter(s => s.competency_id === comp.id);
              const avg = compRows.length ? Math.round(compRows.reduce((a, s) => a + s.current_score, 0) / compRows.length) : 0;
              const gap = comp.department_target - avg;
              return (
                <div key={comp.id} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{comp.competency_name}</span>
                    <span style={{ fontWeight: 700 }}>
                      {avg}% <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>/ target {comp.department_target}%</span>
                    </span>
                  </div>
                  <div className="progress-bar-container" style={{ height: '8px' }}>
                    <div className="progress-bar" style={{
                      width: `${Math.min(100, avg)}%`,
                      background: gap >= 25 ? 'var(--danger)' : gap >= 10 ? 'var(--warning)' : 'var(--success)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h3>Station Overview</h3>
            </div>
            <div className="card-body" style={{ padding: '12px 24px' }}>
              {stationRows.map(row => (
                <div key={row.station} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{row.station}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.trainees} trainee(s)</div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Avg competency: {row.avg}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Headquarters Bulletin</h3>
            </div>
            <div className="card-body" style={{ padding: '12px 24px' }}>
              {bulletins.slice(0, 4).map(b => (
                <div key={b.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{b.title}</span>
                    <span className="badge badge-info">{b.type}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{b.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderChips(items, empty) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (list.length === 0) return <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{empty}</span>;
  return list.map((q, i) => <span key={i} className="badge badge-neutral">{q}</span>);
}

function OfficerTokenCard({ officer }) {
  const issuedOn = new Date(officer.created_at || Date.now()).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return (
    <div className="token-card" id="officer-token-card">
      <div className="token-header">
        <div className="token-org">
          <strong>Capacity Connect</strong>
          <span>IMD · Ministry of Earth Sciences</span>
        </div>
        <span className="token-mark">OFFICER CREDENTIALS TOKEN</span>
      </div>
      <div className="token-body">
        <div className="token-badge">{officer.employee_id}</div>
        <div className="token-name">{officer.name}</div>
        <div className="token-rows">
          <div><span>Designation</span><strong>{officer.designation}</strong></div>
          <div><span>Station</span><strong>{officer.station_location}</strong></div>
          <div><span>Email</span><strong>{officer.email}</strong></div>
          <div><span>Role</span><strong>Meteorology Trainee</strong></div>
          <div><span>ID Status</span><strong className="token-live">● Approved & Active</strong></div>
        </div>
      </div>
      <div className="token-foot">
        <span>Issued {issuedOn}</span>
        <span>Badge sequence auto-generated by the Accreditation Engine</span>
      </div>
      <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: '12px' }} onClick={() => window.print()}>
        🖨 Print Credentials Card
      </button>
    </div>
  );
}