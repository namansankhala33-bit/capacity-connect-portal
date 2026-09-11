import { useApp } from '../../context/AppContext';

export default function AdminCompetencies() {
  const { profiles, competencies, scores, getTraineeGaps } = useApp();

  const trainees = profiles.filter(p => p.role === 'Trainee' && p.approved_by_admin);

  function getCompStats(compId) {
    const rows = scores.filter(s => s.competency_id === compId);
    if (!rows.length) return { avg: 0, min: 0, max: 0, below: 0 };
    const acc = rows.map(r => r.current_score);
    const comp = competencies.find(c => c.id === compId);
    return {
      avg: Math.round(acc.reduce((a, b) => a + b, 0) / acc.length),
      min: Math.min(...acc),
      max: Math.max(...acc),
      below: rows.filter(r => r.current_score < (comp ? comp.department_target : r.target_score)).length,
    };
  }

  const highPriorityTrainees = trainees.filter(t => {
    return getTraineeGaps(t.id).some(g => g.priority === 'HIGH PRIORITY');
  });

  return (
    <div>
      {highPriorityTrainees.length > 0 && (
        <div className="skill-gap-alert high" style={{ marginBottom: '24px' }}>
          <strong>⚠ High-Priority Skill Gaps:</strong> {highPriorityTrainees.length} trainee(s) hold competencies 25+ points below the IMD department target.
          Training scientists should schedule targeted model courses.
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3>WMO-Aligned Competency Register — Organisation Overview</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Meteorological Competency</th>
                <th>Department Target</th>
                <th>Org Avg</th>
                <th>Min / Max</th>
                <th>Below Target</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {competencies.map(comp => {
                const stats = getCompStats(comp.id);
                const gap = comp.department_target - stats.avg;
                return (
                  <tr key={comp.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{comp.competency_name}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{comp.department_target}%</td>
                    <td style={{ fontWeight: 700 }}>{stats.avg}%</td>
                    <td>{stats.min}% — {stats.max}%</td>
                    <td>
                      <span style={{ color: stats.below > 2 ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: stats.below > 2 ? 700 : 400 }}>
                        {stats.below} / {trainees.length}
                      </span>
                    </td>
                    <td>
                      {gap > 20 ? <span className="badge badge-danger">Critical</span> :
                       gap > 10 ? <span className="badge badge-warning">Needs Model Course</span> :
                       <span className="badge badge-success">On Track</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Trainee Competency Heatmap — Approved Trainees</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Trainee</th>
                {competencies.slice(0, 6).map(c => (
                  <th key={c.id} style={{ textAlign: 'center', fontSize: '10px', maxWidth: '90px' }}>{c.competency_name.split(' ').slice(0, 3).join(' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trainees.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{t.name}</td>
                  {competencies.slice(0, 6).map(comp => {
                    const row = scores.find(s => s.trainee_id === t.id && s.competency_id === comp.id);
                    const score = row ? row.current_score : 0;
                    const gap = (row ? row.target_score : comp.department_target) - score;
                    return (
                      <td key={comp.id} style={{ textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-block',
                          width: '40px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '12px',
                          background: gap >= 25 ? '#fee2e2' : gap >= 10 ? '#fef3c7' : '#dcfce7',
                          color: gap >= 25 ? '#b91c1c' : gap >= 10 ? '#92400e' : '#15803d'
                        }}>
                          {score}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}