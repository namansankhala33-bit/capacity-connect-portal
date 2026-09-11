import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function AdminProfiles() {
  const { profiles, approveProfile, getTraineeGaps } = useApp();
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState('');
  const [note, setNote] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const trainees = profiles.filter(p => p.role === 'Trainee');
  const filtered = filter === 'all'
    ? trainees
    : filter === 'pending'
      ? trainees.filter(t => !t.approved_by_admin)
      : trainees.filter(t => t.approved_by_admin);

  const pendingCount = trainees.filter(t => !t.approved_by_admin).length;

  async function handleApproval(profile, approve) {
    setBusyId(profile.id);
    setNote('');
    setErrMsg('');
    try {
      await approveProfile(profile.id, approve);
      if (approve) setNote(`${profile.name} approved and can now sign in.`);
    } catch (err) {
      setErrMsg(err.message || 'Approval update failed in the cloud.');
    }
    setBusyId('');
  }

  return (
    <div>
      {pendingCount > 0 && (
        <div className="skill-gap-alert high" style={{ marginBottom: '20px' }}>
          <strong>Verification Filter Active:</strong> {pendingCount} trainee profile(s) await Director General commissioning.
          Trainees can sign in to submit credentials via the Accreditation Lock portal.
        </div>
      )}
      {note && (
        <div className="skill-gap-alert normal" style={{ marginBottom: '20px' }}>
          <strong>✓ {note}</strong>
        </div>
      )}
      {errMsg && (
        <div className="skill-gap-alert high" style={{ marginBottom: '20px' }}>
          <strong>✗ {errMsg}</strong>
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '14px', minWidth: '180px' }}>
            <option value="pending">Pending Approval ({pendingCount})</option>
            <option value="approved">Approved</option>
            <option value="all">All Trainees</option>
          </select>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{filtered.length} profile(s)</span>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Officer</th>
                <th>Designation</th>
                <th>Station</th>
                <th>Qualifications</th>
                <th>Interests</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(profile => {
                const q = profile.qualifications || {};
                const interests = profile.interests || [];
                return (
                  <tr key={profile.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                          {profile.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{profile.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{profile.employee_id} · {profile.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{profile.designation}</td>
                    <td style={{ maxWidth: '180px' }}>{profile.station_location}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '220px' }}>
                        {(Array.isArray(q?.list) ? q.list.filter(Boolean) : []).map((it, i) => <span key={i} className="badge badge-neutral">{it}</span>)}
                        {(!Array.isArray(q?.list) || q.list.filter(Boolean).length === 0) && <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>—</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                        {interests.slice(0, 3).map((it, i) => <span key={i} className="badge badge-neutral">{it}</span>)}
                        {interests.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>—</span>}
                      </div>
                    </td>
                    <td>
                      {profile.approved_by_admin
                        ? <span className="badge badge-success">Approved</span>
                        : <span className="badge badge-danger">Pending</span>}
                    </td>
                    <td>
                      {profile.approved_by_admin ? (
                        <button className="btn btn-outline btn-sm" onClick={() => handleApproval(profile, false)} disabled={busyId === profile.id}>
                          Revoke
                        </button>
                      ) : (
                        <button className="btn btn-success btn-sm" onClick={() => handleApproval(profile, true)} disabled={busyId === profile.id}>
                          ✓ Approve Access
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="7"><div className="empty-state"><p>No profiles match this filter.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}