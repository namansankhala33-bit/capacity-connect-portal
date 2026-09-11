import LearningLoop from '../../components/LearningLoop';
import { useApp } from '../../context/AppContext';

export default function TraineeSkillGaps() {
  const { currentUser, getTraineeGaps, getRecommendedCourses, courses } = useApp();

  const skillGaps = getTraineeGaps(currentUser.id);
  const highPriority = skillGaps.filter(g => g.priority === 'HIGH PRIORITY');
  const recommendations = getRecommendedCourses(currentUser.id);

  function getCoursesForComp(compId) {
    return courses.filter(c => (c.developed_competencies || []).includes(compId)).slice(0, 2);
  }

  return (
    <div>
      <LearningLoop activeIndex={4} />

      {highPriority.length > 0 && (
        <div className="skill-gap-alert high" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong>🚨 {highPriority.length} High-Priority Competency Gap(s)</strong>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Gaps of 25+ points against the IMD department target are marked HIGH PRIORITY and trigger automatic training recommendations.
              </div>
            </div>
            <span className="badge badge-danger">{highPriority.length} critical</span>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3>Complete Skill Gap Analysis</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Meteorological Competency</th>
                <th>Current Score</th>
                <th>IMD Target</th>
                <th>Gap</th>
                <th>Priority</th>
                <th>Training Programmes</th>
              </tr>
            </thead>
            <tbody>
              {skillGaps.map(gap => (
                <tr key={gap.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{gap.competency_name}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{gap.current_score}%</td>
                  <td>{gap.target_score}%</td>
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontWeight: 700,
                      fontSize: '12px',
                      background: gap.priority === 'HIGH PRIORITY' ? '#fee2e2' : '#fef3c7',
                      color: gap.priority === 'HIGH PRIORITY' ? '#b91c1c' : '#92400e'
                    }}>
                      {gap.gap} pts
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${gap.priority === 'HIGH PRIORITY' ? 'badge-danger' : 'badge-neutral'}`}>{gap.priority}</span>
                  </td>
                  <td style={{ minWidth: '200px' }}>
                    {getCoursesForComp(gap.id).map(course => (
                      <a key={course.id} href={`/trainee/learning?course=${course.id}`} style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        margin: '2px',
                        borderRadius: '6px',
                        background: 'var(--bg)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        border: '1px solid var(--border)'
                      }}>
                        {course.title} →
                      </a>
                    ))}
                    {getCoursesForComp(gap.id).length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>Awaiting model course</span>}
                  </td>
                </tr>
              ))}
              {skillGaps.length === 0 && <tr><td colSpan="6"><div className="empty-state"><p>No skill gaps. Outstanding operational readiness.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>📚 Recommended Training Plan</div>
      <div className="grid grid-2">
        {recommendations.map(({ course, reason }) => (
          <div className="recommendation-card" key={course.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div className="course-title" style={{ marginBottom: 0 }}>{course.title}</div>
              <span className="badge badge-danger">HIGH PRIORITY</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{course.category} · {course.duration} · 👨‍🏫 {course.trainer?.name || 'IMD Training Wing'}</div>
            <div className="reason">
              <strong>Why this programme was recommended:</strong><br />
              {reason}
            </div>
            <a href={`/trainee/learning?course=${course.id}`} className="btn btn-primary btn-sm" style={{ marginTop: '14px' }}>
              Enrol & Take Assessment →
            </a>
          </div>
        ))}
        {recommendations.length === 0 && (
          <div className="card"><div className="card-body"><div className="empty-state"><p>No urgent recommendations. Keep up the strong performance.</p></div></div></div>
        )}
      </div>
    </div>
  );
}