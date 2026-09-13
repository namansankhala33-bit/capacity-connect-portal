import { useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { useApp } from '../../context/AppContext';

const ROLE_COLORS = { Admin: 'var(--danger)', Trainer: 'var(--secondary)', Trainee: 'var(--success)' };
const STATION_COLORS = ['#0ea5e9', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#dc2626', '#14b8a6'];
const BROADCAST_TYPES = ['Notification', 'Announcement', 'Achievement', 'New Content'];
const ACTIVITY_EPOCH_MS = Date.now();

function bulTagClass(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('achievement')) return 'amber';
  if (t.includes('new content')) return 'violet';
  if (t.includes('announcement')) return 'green';
  return 'red';
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(d || '');
  }
}

function RoleGatewaySelect({ person, busyId, onRoleChange }) {
  return (
    <div className="role-gateway">
      <select
        className="role-select"
        value={person.role}
        disabled={busyId === person.id}
        onChange={e => onRoleChange(person.id, e.target.value)}
      >
        <option value="Trainee">Trainee</option>
        <option value="Trainer">Trainer</option>
        <option value="Admin">Admin</option>
      </select>
      {busyId === person.id && <div className="ai-spinner" />}
    </div>
  );
}

function renderChips(items, empty) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (list.length === 0) return <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{empty}</span>;
  return list.map((q, i) => <span key={i} className="badge badge-neutral">{q}</span>);
}

export default function AdminDashboard() {
  const {
    profiles, users, courses, modules, scores,
    bulletinBoard, certifications,
    exams, evaluations, adminCreateDirectProfile, adminApproveTrainee, onChangeUserRole, onPublishBulletin,
  } = useApp();

  const [enroll, setEnroll] = useState({ name: '', email: '', designation: '', station_location: '' });
  const [enrolling, setEnrolling] = useState(false);
  const [issuedOfficer, setIssuedOfficer] = useState(null);
  const [enrollMsg, setEnrollMsg] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [approveMsg, setApproveMsg] = useState('');
  const [roleBusy, setRoleBusy] = useState(null);
  const [roleMsg, setRoleMsg] = useState('');
  const [post, setPost] = useState({ title: '', type: 'Notification', message: '' });
  const [pubMsg, setPubMsg] = useState('');
  const [pubError, setPubError] = useState('');

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

  async function handleRoleChange(id, newRole) {
    const current = profiles.find(p => p.id === id);
    if (!current || current.role === newRole) return;
    setRoleBusy(id);
    setRoleMsg('');
    try {
      await onChangeUserRole(id, newRole);
      setRoleMsg(`✅ Actual role reassigned → ${newRole} for ${current.name}.`);
    } catch (err) {
      setRoleMsg('✗ ' + (err.message || 'Role update failed.'));
    } finally {
      setRoleBusy(null);
    }
  }

  function handleBroadcast(e) {
    e.preventDefault();
    setPubMsg('');
    if (!post.title.trim()) {
      setPubError('Headline Title is mandatory before transmitting to the homepage.');
      return;
    }
    if (!post.message.trim()) {
      setPubError('Public Bulletin Body Message is empty — nothing to broadcast.');
      return;
    }
    setPubError('');
    onPublishBulletin({ title: post.title.trim(), type: post.type, message: post.message.trim() });
    setPubMsg(`✓ "…${post.title.trim()}…" is now LIVE on the Capacity Connect homepage as a ${post.type}.`);
    setPost(prev => ({ ...prev, title: '', message: '' }));
  }

  /* ---------- Header A telemetry derivations ---------- */
  const trainees = profiles.filter(p => p.role === 'Trainee');
  const enrolled = trainees.filter(p => p.approved_by_admin);
  const pending = trainees.filter(p => !p.approved_by_admin);
  const modulesCount = modules.length;
  const avgCompetency = scores.length
    ? Math.round(scores.reduce((a, s) => a + s.current_score, 0) / scores.length)
    : 0;

  const passThreshold = e => exams.find(x => x.id === e.exam_id)?.passing_score || 60;
  const passedEvals = evaluations.filter(e => e.percentage >= passThreshold(e));
  const failedEvals = evaluations.filter(e => e.percentage < passThreshold(e));

  const courseChartData = courses.map(c => {
    const exam = exams.find(x => x.course_id === c.id);
    let enrolledCount = 0;
    if (exam) {
      enrolledCount = new Set(evaluations.filter(e => e.exam_id === exam.id).map(e => e.trainee_id)).size;
    }
    const raw = String(c.title || 'Course').replace(/^Model Course\s*[-–—: ]*/i, '');
    const name = raw.length > 17 ? raw.slice(0, 16) + '…' : raw;
    return { name, Enrolled: enrolledCount, Capacity: 180 };
  });

  const examQueueData = [
    { name: 'Passed · Certifications', value: passedEvals.length, color: '#16a34a' },
    { name: 'Failed · Retake Queue', value: failedEvals.length, color: '#dc2626' },
  ];

  const traineeStations = {};
  trainees.forEach(t => { traineeStations[t.id] = t.station_location || 'HQ New Delhi'; });
  const stations = [...new Set(Object.values(traineeStations))];
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(ACTIVITY_EPOCH_MS - i * 86400000);
    last7Days.push(d.toISOString().slice(0, 10));
  }
  const activityData = last7Days.map(day => {
    const row = { name: day.slice(5) };
    stations.forEach(st => { row[st] = 0; });
    evaluations.forEach(e => {
      const st = traineeStations[e.trainee_id];
      if (st && row[st] !== undefined && String(e.completion_date || '').slice(0, 10) === day) row[st] += 1;
    });
    scores.forEach(s => {
      const st = traineeStations[s.trainee_id];
      if (st && row[st] !== undefined && String(s.last_updated || '').slice(0, 10) === day) row[st] += 1;
    });
    return row;
  });

  const roleOrder = { Admin: 0, Trainer: 1, Trainee: 2 };
  const roleRows = [...users].sort(
    (a, b) => roleOrder[a.role] - roleOrder[b.role] || a.name.localeCompare(b.name)
  );

  const priorityCount = scores.filter(s => (s.target_score - s.current_score) >= 25).length;

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

      {/*================ HEADER A — LIVE ADVANCED MONITORING DASHBOARD ================*/}
      <div className="card admin-monitor-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3>📡 Header A — Live Advanced Monitoring Dashboard</h3>
          <span className="badge badge-success">● LIVE TELEMETRY</span>
        </div>
        <div className="card-body">
          <div className="grid grid-4" style={{ marginBottom: '22px' }}>
            <div className="stat-card primary">
              <div className="stat-label">Total Enrolled</div>
              <div className="stat-value">1,248</div>
              <div className="stat-change up">Personnel across IMD divisions</div>
            </div>
            <div className="stat-card secondary">
              <div className="stat-label">Active Certifications</div>
              <div className="stat-value">412</div>
              <div className="stat-change up">Validated competency passes</div>
            </div>
            <div className="stat-card success">
              <div className="stat-label">Completion Rate</div>
              <div className="stat-value">84%</div>
              <div className="stat-change up">Org-wide course throughput</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-label">Total Exams Logged</div>
              <div className="stat-value">1,680</div>
              <div className="stat-change">Assessments on record</div>
            </div>
          </div>

          <div className="live-registry-strip">
            <span className="live-chip">👥 Live registry: <strong>{enrolled.length}</strong> commissioned learners</span>
            <span className="live-chip">📚 <strong>{courses.length}</strong> model courses · <strong>{modulesCount}</strong> modules</span>
            <span className="live-chip">📋 <strong>{evaluations.length}</strong> assessments submitted</span>
            <span className="live-chip">🪪 <strong>{certifications.length}</strong> certifications issued here</span>
            <span className="live-chip">⏳ <strong>{pending.length}</strong> pending commissions</span>
            <span className="live-chip">🎯 Avg competency <strong>{avgCompetency}%</strong> · <strong>{priorityCount}</strong> critical gaps</span>
          </div>

          <div className="grid grid-3" style={{ marginTop: '22px' }}>
            <div className="chart-card">
              <h4>Courses · Enrolment vs Capacity</h4>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Enrolled" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Capacity" fill="#0f294a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <h4>Exam Success vs Retake Queues</h4>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={examQueueData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={52} outerRadius={80}
                      paddingAngle={3}
                      label={({ name, value }) => `${name.split('·')[1].trim()} ${value}`}
                    >
                      {examQueueData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <h4>Daily Active Sessions · Station Sectors</h4>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {stations.map((st, i) => (
                      <Line key={st} type="monotone" dataKey={st} stroke={STATION_COLORS[i % STATION_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/*================ HEADER B — PERSONNEL ROLE ARCHITECTURE & GATEWAYS ================*/}
      <div className="card" style={{ marginBottom: '24px', borderLeft: '6px solid var(--secondary)' }}>
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <h3>🔐 Header B — Personnel Role Architecture &amp; Managed Gateways</h3>
          {roleMsg && (
            <span className="processing-banner" style={{ color: roleMsg.startsWith('✗') ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{roleMsg}</span>
          )}
        </div>
        <div className="card-body" style={{ padding: '0' }}>
          <div className="data-table">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Personnel</th>
                    <th>Employee ID</th>
                    <th>Rank / Designation</th>
                    <th>Station</th>
                    <th>Current Assigned Role</th>
                    <th>Role Gateway</th>
                  </tr>
                </thead>
                <tbody>
                  {roleRows.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar-sm">{p.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><code>{p.employee_id || '—'}</code></td>
                      <td>{p.designation || '—'}</td>
                      <td>{p.station_location || '—'}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(15,41,74,0.08)', color: ROLE_COLORS[p.role], border: `1px solid ${ROLE_COLORS[p.role]}` }}>{p.role}</span>
                      </td>
                      <td>
                        <RoleGatewaySelect person={p} busyId={roleBusy} onRoleChange={handleRoleChange} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="role-card-grid">
            {roleRows.map(p => (
              <div className="role-card" key={p.id}>
                <div className="role-card-top">
                  <div className="avatar-sm">{p.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                  <div className="role-card-person">
                    <div className="role-card-name">{p.name}</div>
                    <div className="role-card-detail">{p.email}</div>
                  </div>
                </div>
                <div className="role-card-row">
                  <span className="role-card-label">Employee ID</span>
                  <code>{p.employee_id || '—'}</code>
                </div>
                <div className="role-card-row">
                  <span className="role-card-label">Designation</span>
                  <span>{p.designation || '—'}</span>
                </div>
                <div className="role-card-row">
                  <span className="role-card-label">Station</span>
                  <span>{p.station_location || '—'}</span>
                </div>
                <div className="role-card-row">
                  <span className="role-card-label">Current Role</span>
                  <span className="badge" style={{ background: 'rgba(15,41,74,0.08)', color: ROLE_COLORS[p.role], border: `1px solid ${ROLE_COLORS[p.role]}` }}>{p.role}</span>
                </div>
                <div className="role-card-row">
                  <span className="role-card-label">Role Gateway</span>
                  <RoleGatewaySelect person={p} busyId={roleBusy} onRoleChange={handleRoleChange} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            Role reassignments propagate instantly to the <code>user_profiles</code> registry (live RPC <code>update_user_role</code>), unlock the matching navigation shell,
            and resync the signed-in session if the acting officer is the gate being switched.
          </div>
        </div>
      </div>

      {/*================ HEADER C — HOMEPAGE BROADCAST TRANSMITTER ================*/}
      <div className="card" style={{ marginBottom: '24px', borderLeft: '6px solid var(--danger)' }}>
        <div className="card-header">
          <h3>📢 Header C — Homepage Broadcast Transmitter</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-2">
            <div>
              {pubMsg && (
                <div className="skill-gap-alert" style={{ borderLeftColor: 'var(--success)', background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)' }}>
                  <strong style={{ color: 'var(--success)' }}>{pubMsg}</strong>
                </div>
              )}
              {pubError && (
                <div className="skill-gap-alert high" style={{ marginBottom: '16px' }}>
                  <strong>✗ {pubError}</strong>
                </div>
              )}
              <form onSubmit={handleBroadcast}>
                <div className="form-group">
                  <label>Headline Title</label>
                  <input
                    type="text"
                    value={post.title}
                    onChange={e => setPost({ ...post, title: e.target.value })}
                    placeholder="e.g., Monsoon Mission Phase-III training cohort opens"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Broadcast Type</label>
                  <select value={post.type} onChange={e => setPost({ ...post, type: e.target.value })}>
                    {BROADCAST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Public Bulletin Body Message</label>
                  <textarea
                    rows={4}
                    value={post.message}
                    onChange={e => setPost({ ...post, message: e.target.value })}
                    placeholder="Official text displayed on the Capacity Connect homepage…"
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  📡 Broadcast to System Homepage
                </button>
              </form>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                Transmissions prepend to the global <code>bulletinBoard</code> and appear on the public Login/Homepage frame with colour-coded
                classification tags (Notifications red, Achievements blue, Announcements green, New Content violet).
              </div>
            </div>

            <div>
              <div className="card" style={{ background: 'rgba(15,41,74,0.04)', border: '1px solid var(--border)' }}>
                <div className="card-header" style={{ justifyContent: 'space-between' }}>
                  <h3>🌐 Live Broadcast Feed — {bulletinBoard.length} post(s)</h3>
                  <span className="badge badge-danger">PUBLIC HOMEPAGE</span>
                </div>
                <div className="card-body" style={{ padding: '12px 20px' }}>
                  {bulletinBoard.length === 0 && (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Nothing broadcast yet. Compose the first homepage transmission.</div>
                  )}
                  {bulletinBoard.slice(0, 6).map(b => (
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/*================ SECTION A — PENDING VERIFICATION QUEUE ================*/}
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
                        🎖 Grant Commissioning
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

      {/*================ SECTION B — DIRECT PROVISIONING NODE ================*/}
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
                <div className="provision-grid">
                  <div className="form-group">
                    <label>Officer Name</label>
                    <input type="text" value={enroll.name} onChange={e => setEnroll({ ...enroll, name: e.target.value })} placeholder="e.g., Dr. Meera Joshi" required />
                  </div>
                  <div className="form-group">
                    <label>Official Email</label>
                    <input type="email" value={enroll.email} onChange={e => setEnroll({ ...enroll, email: e.target.value })} placeholder="name@imd.gov.in" required />
                  </div>
                </div>
                <div className="provision-grid">
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
    </div>
  );
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