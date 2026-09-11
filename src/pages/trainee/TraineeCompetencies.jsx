import LearningLoop from '../../components/LearningLoop';
import { useApp } from '../../context/AppContext';

export default function TraineeCompetencies() {
  const { currentUser, competencies, getTraineeGaps, evaluations, exams, courses } = useApp();

  const gaps = getTraineeGaps(currentUser.id);

  const merged = competencies.map(comp => {
    const found = gaps.find(g => g.id === comp.id);
    return found
      ? found
      : { ...comp, current_score: 0, target_score: comp.department_target, gap: comp.department_target, priority: 'NORMAL' };
  });

  const avg = Math.round(merged.reduce((a, c) => a + c.current_score, 0) / Math.max(1, merged.length));
  const aboveTarget = merged.filter(c => c.current_score >= c.target_score).length;
  const assessedCount = merged.filter(c => c.current_score > 0).length;

  const myEvals = evaluations.filter(e => e.trainee_id === currentUser.id).map(e => {
    const exam = exams.find(x => x.id === e.exam_id);
    return { ...e, exam };
  });

  return (
    <div>
      <LearningLoop activeIndex={2} />

      <div className="grid grid-3" style={{ marginBottom: '24px' }}>
        <div className="stat-card primary">
          <div className="stat-label">Overall Competency Score</div>
          <div className="stat-value">{avg}%</div>
          <div className="stat-change up">Consolidated against IMD targets</div>
        </div>
        <div className="stat-card secondary">
          <div className="stat-label">Competencies Measured</div>
          <div className="stat-value">{assessedCount}/{competencies.length}</div>
          <div className="stat-change">By assessment windows</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">At or Above Target</div>
          <div className="stat-value">{aboveTarget}</div>
          <div className="stat-change">Competencies meeting IMD bar</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3>Meteorological Competency Profile</h3>
        </div>
        <div className="card-body">
          {merged.map(comp => {
            const gap = comp.target_score - comp.current_score;
            const status = gap >= 25 ? { badge: 'badge-danger', text: 'Critical Gap' } : gap >= 10 ? { badge: 'badge-warning', text: 'Needs Training' } : { badge: 'badge-success', text: 'On Track' };
            return (
              <div key={comp.id} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{comp.competency_name}</span>
                    <span className={`badge ${status.badge}`} style={{ marginLeft: '8px' }}>{status.text}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>{comp.current_score}%</span> / IMD target {comp.target_score}%
                  </div>
                </div>
                <div className="progress-bar-container" style={{ height: '10px', position: 'relative' }}>
                  <div className="progress-bar" style={{
                    width: `${Math.min(100, comp.current_score)}%`,
                    background: status.badge === 'badge-danger' ? 'var(--danger)' : status.badge === 'badge-warning' ? 'var(--warning)' : 'var(--success)'
                  }} />
                  <div className="target-marker" style={{ left: `${Math.min(100, comp.target_score)}%`, top: '-3px' }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>IMD-wide competency register</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Assessment History (EVALUATION_LOG)</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Assessment</th>
                <th>Score</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {myEvals.map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.completion_date).toLocaleDateString('en-IN')}</td>
                  <td style={{ fontWeight: 600 }}>{e.exam ? courses?.find(c => c.id === e.exam.course_id)?.title || 'Assessment' : 'Assessment'}</td>
                  <td style={{ fontWeight: 700 }}>{e.score} / {(e.exam?.questions || []).length} ({e.percentage}%)</td>
                  <td>{e.percentage >= (e.exam?.passing_score || 60) ? <span className="badge badge-success">Passed</span> : <span className="badge badge-danger">Incomplete</span>}</td>
                </tr>
              ))}
              {myEvals.length === 0 && <tr><td colSpan="4"><div className="empty-state"><p>No assessments submitted yet.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}