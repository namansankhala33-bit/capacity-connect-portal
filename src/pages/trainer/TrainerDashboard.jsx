import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';

export default function TrainerDashboard() {
  const { courses, profiles, competencies, exams, currentUser, spawnAiExam } = useApp();

  const [aiCourseId, setAiCourseId] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const aiTimer = useRef(null);

  const myCourses = courses.filter(c => c.trainer_id === currentUser?.id);
  const allCourses = courses;
  const trainees = profiles.filter(p => p.role === 'Trainee' && p.approved_by_admin);
  const trainers = profiles.filter(p => p.role === 'Trainer');
  const totalEnrolled = allCourses.length;
  const examCount = exams.length;

  function handleAiCompile() {
    if (!aiCourseId) { setAiError('Select a model course to compile the AI questionnaire for.'); return; }
    setAiError('');
    setAiBusy(true);
    setAiResult(null);
    aiTimer.current = setTimeout(async () => {
      try {
        const result = await spawnAiExam(aiCourseId);
        setAiResult(result);
      } catch (err) {
        setAiError(err.message || 'AI questionnaire compilation failed.');
      } finally {
        setAiBusy(false);
      }
    }, 1500);
  }

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: '24px' }}>
        <div className="stat-card primary">
          <div className="stat-label">Model Courses</div>
          <div className="stat-value">{allCourses.length}</div>
          <div className="stat-change up">{myCourses.length} authored by you</div>
        </div>
        <div className="stat-card secondary">
          <div className="stat-label">Trainees in Training</div>
          <div className="stat-value">{trainees.length}</div>
          <div className="stat-change up">Approved profiles</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Assessments Built</div>
          <div className="stat-value">{examCount}</div>
          <div className="stat-change up">With deadlines</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Training Scientists</div>
          <div className="stat-value">{trainers.length}</div>
          <div className="stat-change up">Across specialisations</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Training Programme Corpus</h3>
            <a href="/trainer/course-builder" className="btn btn-primary btn-sm">+ Author Model Course</a>
          </div>
          <div className="card-body" style={{ padding: '12px 24px' }}>
            {allCourses.map(course => {
              const trainer = profiles.find(p => p.id === course.trainer_id);
              const courseExam = exams.find(e => e.course_id === course.id);
              const compNames = (course.developed_competencies || []).map(id => {
                const c = competencies.find(x => x.id === id);
                return c ? c.competency_name : id;
              });
              return (
                <div key={course.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{course.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {course.category} · {course.duration} · {course.description}
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {compNames.slice(0, 2).map((n, i) => <span key={i} className="badge badge-neutral">{n}</span>)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px' }}>
                    <div style={{ fontWeight: 600 }}>{trainer ? trainer.name : '—'}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {courseExam ? 'Assessment live' : 'No assessment yet'}
                    </div>
                  </div>
                </div>
              );
            })}
            {allCourses.length === 0 && <div className="empty-state"><h3>No programme courses</h3></div>}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h3>Quick Actions</h3>
            </div>
            <div className="card-body">
              <div className="skill-gap-alert normal">
                <strong>💡 Model Course Protocol:</strong> Author a course with modules tied to WMO meteorological competencies, then design an
                assessment (EXAM_QUESTIONNAIRE) with a submission deadline. Passing assessments automatically re-baseline trainee competency scores.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                <a href="/trainer/course-builder" className="btn btn-secondary btn-block">📝 Author Model Course →</a>
                <a href="/trainer/exams" className="btn btn-outline btn-block">📋 Design Assessment & Set Deadline →</a>
                <button className="btn btn-outline btn-block" onClick={() => document.getElementById('ai-questionnaire-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  ⚡ Local-AI Questionnaire Builder
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>My Authoring Profile</h3>
            </div>
            <div className="card-body" style={{ padding: '12px 24px' }}>
              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{currentUser?.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{currentUser?.designation} · {currentUser?.station_location}</div>
              </div>
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Specialisation interests mapped to competency IDs:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(currentUser?.interests || []).slice(0, 6).map((it, i) => <span key={i} className="badge badge-info">{it}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" id="ai-questionnaire-builder" style={{ borderLeft: '6px solid var(--secondary)' }}>
      <div className="card-header">
        <h3>🧠 Local-AI Questionnaire Builder</h3>
      </div>
      <div className="card-body">
        <div className="skill-gap-alert normal" style={{ marginBottom: '16px' }}>
          <strong>⚙ No external AI APIs.</strong> The builder compiles a pre-formatted complex meteorological questionnaire (Doppler Radar velocity
          thresholds · BNS compliance tracking) from the local NWP & Satellite Radar syllabus configuration, attaches an active 7-day deadline window,
          and appends it to the global active assessments state.
        </div>

        {aiError && (
          <div className="skill-gap-alert high" style={{ marginBottom: '16px' }}>
            <strong>✗ {aiError}</strong>
          </div>
        )}

        <div className="grid grid-2" style={{ alignItems: 'center', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Target Model Course (syllabus source)</label>
            <select value={aiCourseId} onChange={e => { setAiCourseId(e.target.value); setAiResult(null); }}>
              <option value="">Select a model course…</option>
              {(myCourses.length ? myCourses : allCourses).map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <button className="btn btn-secondary btn-lg btn-block" onClick={handleAiCompile} disabled={aiBusy || !aiCourseId}>
              {aiBusy ? 'Compiling…' : '🚀 Compile & Inject AI Questionnaire'}
            </button>
          </div>
        </div>

        {aiBusy && (
          <div className="ai-loader animate-in" style={{ marginTop: '20px' }}>
            <div className="ai-spinner" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Compiling NWP & Satellite Radar syllabus configurations…</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Simulating server pass · generating Doppler velocity & BNS compliance items · stamping 7-day deadline…
              </div>
            </div>
          </div>
        )}

        {aiResult && !aiBusy && (
          <div className="card animate-in" style={{ marginTop: '20px', borderLeft: '4px solid var(--success)', background: 'var(--bg)' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>✅ Questionnaire compiled & injected</div>
                <span className="badge badge-success">Appended to global assessments</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                <strong>{aiResult.course.title}</strong> · {(aiResult.exam?.questions || aiResult.questions).length} complex MCQs · Active until{' '}
                <strong>{aiResult.deadline.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong> (7-day window) · Pass at 60%
              </div>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(aiResult.exam?.questions || aiResult.questions).map((q, i) => (
                  <div key={q.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--secondary)', minWidth: '20px' }}>Q{i + 1}.</span>
                    <span>{q.question}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}