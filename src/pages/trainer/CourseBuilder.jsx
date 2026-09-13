import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { uuidv4 } from '../../utils/uuid';

export default function CourseBuilder() {
  const { currentUser, createCourseBundle, competencies, courses, exams, generateExamQuestions, onDispatchNewExam } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Forecasting Science');
  const [duration, setDuration] = useState('12 hours');
  const [developedComps, setDevelopedComps] = useState([]);
  const [moduleRows, setModuleRows] = useState([
    { title: '', content_text: '', video_placeholder_url: '' },
    { title: '', content_text: '', video_placeholder_url: '' },
  ]);
  const [saved, setSaved] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const [aiCourseId, setAiCourseId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [customDeadline, setCustomDeadline] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiPreview, setAiPreview] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiFlash, setAiFlash] = useState(false);

  const myCourses = courses.filter(c => c.trainer_id === currentUser?.id);
  const myExamArchive = exams.filter(e => e.trainer_id === currentUser?.id);

  function toggleComp(id) {
    setDevelopedComps(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  function updateModule(idx, field, value) {
    setModuleRows(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }

  function addModule() {
    setModuleRows(prev => [...prev, { title: '', content_text: '', video_placeholder_url: '' }]);
  }

  function removeModule(idx) {
    setModuleRows(prev => prev.filter((_, i) => i !== idx));
  }

  function handleAiCompile() {
    if (!aiCourseId) return;
    setAiError('');
    setAiBusy(true);
    window.setTimeout(() => {
      try {
        const questions = generateExamQuestions(aiCourseId);
        setAiPreview({ courseId: aiCourseId, questions });
      } catch (err) {
        setAiError(err.message || 'Questionnaire compilation failed.');
      } finally {
        setAiBusy(false);
      }
    }, 1200);
  }

  async function handleCommissionDispatch() {
    if (!aiPreview) return;
    setAiError('');
    setAiBusy(true);
    const course = courses.find(c => c.id === aiPreview.courseId);
    const deadline = customDeadline
      ? new Date(customDeadline)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const targetId = uuidv4();
    try {
      const dispatched = await onDispatchNewExam({
        id: targetId,
        course_id: aiPreview.courseId,
        questions: aiPreview.questions,
        passing_score: 60,
        submission_deadline: deadline.toISOString(),
        title: customTitle.trim() || 'Untitled Assessment',
        subject: selectedSubject || 'General Meteorology',
        deadline: deadline.toISOString(),
        is_active: true,
        trainer_id: currentUser?.id,
        submitted_count: 0,
        competencies: course?.developed_competencies || [],
      });
      setAiResult({ exam: dispatched, course, questions: aiPreview.questions, deadline });
      setAiPreview(null);
      setCustomTitle('');
      setSelectedSubject('');
      setCustomDeadline('');
      setAiFlash(true);
      window.setTimeout(() => setAiFlash(false), 6000);
    } catch (err) {
      setAiError(err.message || 'Exam dispatch failed in the cloud.');
    } finally {
      setAiBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrMsg('');
    const cleanModules = moduleRows
      .filter(m => m.title.trim() !== '')
      .map((m, i) => ({ ...m, title: m.title.trim(), content_text: m.content_text.trim() }));
    try {
      await createCourseBundle({
        course: { title, description, category, duration, developed_competencies: developedComps, materials_library: {} },
        moduleRows: cleanModules,
        exam: null,
        trainerId: currentUser.id,
      });
      setSaved(true);
      setTimeout(() => {
        setTitle(''); setDescription(''); setDevelopedComps([]);
        setModuleRows([{ title: '', content_text: '', video_placeholder_url: '' }, { title: '', content_text: '', video_placeholder_url: '' }]);
        setSaved(false);
      }, 2000);
    } catch (err) {
      setErrMsg(err.message || 'Course publish failed.');
    }
  }

  return (
    <div>
      {saved && (
        <div className="skill-gap-alert normal" style={{ marginBottom: '20px' }}>
          <strong>✅ Model course published!</strong> Modules are stored and the course is now live in the programme corpus.
          Design its assessment from the Assessment Design view.
        </div>
      )}
      {errMsg && (
        <div className="skill-gap-alert high" style={{ marginBottom: '20px' }}>
          <strong>✗ {errMsg}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-2" style={{ marginBottom: '20px' }}>
          <div className="card">
            <div className="card-header"><h3>Course Profile</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label>Course Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Data Assimilation Techniques for NWP" required />
              </div>
              <div className="form-group">
                <label>Course Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Operational objective of this training model course" rows={4} required />
              </div>
              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}>
                    {['Forecasting Science', 'Remote Sensing', 'Radar Meteorology', 'Severe Weather', 'Applied Services', 'Hydrometeorology', 'Climate Science', 'Aviation'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Contact Hours</label>
                  <select value={duration} onChange={e => setDuration(e.target.value)}>
                    {['6 hours', '8 hours', '10 hours', '12 hours', '14 hours', '16 hours', '18 hours', '20 hours'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Developed Meteorological Competencies</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {competencies.map(comp => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => toggleComp(comp.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '20px',
                        border: developedComps.includes(comp.id) ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: developedComps.includes(comp.id) ? 'var(--primary)' : 'var(--bg-card)',
                        color: developedComps.includes(comp.id) ? '#fff' : 'var(--text)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      {comp.competency_name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Training Modules</h3>
              <button type="button" className="btn btn-outline btn-sm" onClick={addModule}>+ Add Module</button>
            </div>
            <div className="card-body">
              {moduleRows.map((mod, idx) => (
                <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px', background: 'var(--bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>Module {idx + 1}</span>
                    {moduleRows.length > 1 && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removeModule(idx)}>Remove</button>
                    )}
                  </div>
                  <div className="form-group">
                    <input type="text" value={mod.title} onChange={e => updateModule(idx, 'title', e.target.value)} placeholder="Module title" />
                  </div>
                  <div className="form-group">
                    <textarea value={mod.content_text} onChange={e => updateModule(idx, 'content_text', e.target.value)} placeholder="Module study content (operational notes)" rows={3} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input type="text" value={mod.video_placeholder_url} onChange={e => updateModule(idx, 'video_placeholder_url', e.target.value)} placeholder="Recorded lecture / material URL" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-success btn-lg" style={{ width: '100%' }}>
          💾 Publish Model Course
        </button>
      </form>

      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header"><h3>Programme Corpus</h3></div>
        <div className="card-body" style={{ padding: '12px 24px' }}>
          {myCourses.map(course => (
            <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{course.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{course.category} · {course.duration} · {course.developed_competencies?.length} competencies mapped</div>
              </div>
              <span className="badge badge-success">Published</span>
            </div>
          ))}
          {myCourses.length === 0 && (
            <div className="empty-state"><h3>No authored courses yet</h3><p>Use the builder above to publish your first meteorological model course.</p></div>
          )}
        </div>
      </div>

      {/* ── INTERNAL QUALITY CONTROL: EXAM TELEMETRY VERIFICATION NODE ─────── */}
      <div className="card" style={{ marginTop: '24px', borderLeft: '6px solid var(--secondary)' }}>
        <div className="card-header">
          <h3>📋 INTERNAL QUALITY CONTROL: EXAM TELEMETRY VERIFICATION NODE</h3>
        </div>
        <div className="card-body">
          <div className="skill-gap-alert normal" style={{ marginBottom: '16px' }}>
            <strong>No external AI APIs.</strong> The builder compiles a pre-formatted complex meteorological questionnaire from the local
            NWP &amp; Satellite Radar syllabus configuration and broadcasts it to the active force registry. Configure the custom title,
            subject tracker, and submission deadline before commissioning.
          </div>

          {aiError && (
            <div className="skill-gap-alert high" style={{ marginBottom: '16px' }}>
              <strong>✗ {aiError}</strong>
            </div>
          )}

          <div className="grid grid-2" style={{ alignItems: 'center', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Target Model Course (syllabus source)</label>
              <select
                value={aiCourseId}
                onChange={e => { setAiCourseId(e.target.value); setAiResult(null); setAiPreview(null); setAiFlash(false); }}
              >
                <option value="">Select a model course…</option>
                {(myCourses.length ? myCourses : courses).map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <button className="btn btn-secondary btn-lg btn-block" onClick={handleAiCompile} disabled={aiBusy || !aiCourseId}>
                {aiBusy && !aiPreview ? 'Compiling…' : aiPreview ? '↺ Re-run Compilation' : 'Compile & Verify AI Questionnaire'}
              </button>
            </div>
          </div>

          {aiBusy && !aiPreview && !aiResult && (
            <div className="ai-loader animate-in" style={{ marginTop: '20px' }}>
              <div className="ai-spinner" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Compiling NWP &amp; Satellite Radar syllabus configurations…</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Generating meteorological metrics · answer parameters · target grading keys · stamping deployment window…
                </div>
              </div>
            </div>
          )}

          {aiPreview && !aiBusy && (
            <div className="audit-node animate-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px' }}>📋</span>
                <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.4px' }}>INTERNAL QUALITY CONTROL: EXAM TELEMETRY VERIFICATION NODE</div>
              </div>
              <div style={{ fontSize: '12px', color: '#9fb6d2', marginBottom: '18px', lineHeight: 1.5 }}>
                Verify the generated meteorological metrics, set the custom assignment attributes, and broadcast the syllabus to the active force registry.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '14px', marginBottom: '18px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#9fb6d2', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Assignment Custom Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    placeholder="e.g., Severe Cyclonic Storm Tracking Lab Exam"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#9fb6d2', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Core Meteorological Subject / Topic</label>
                    <select
                      value={selectedSubject}
                      onChange={e => setSelectedSubject(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="">Select meteorological subject…</option>
                      <option>Radar Meteorology</option>
                      <option>NWP &amp; Data Assimilation</option>
                      <option>Satellite Remote Sensing</option>
                      <option>Severe Weather &amp; Mesoscale</option>
                      <option>BNS Warning Compliance</option>
                      <option>Hydrometeorology &amp; Climate</option>
                      <option>Aviation Meteorology</option>
                      <option>General Meteorology</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#9fb6d2', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Submission Deadline</label>
                    <input
                      type="datetime-local"
                      value={customDeadline}
                      onChange={e => setCustomDeadline(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
                <span className="badge badge-info">{aiPreview.questions.length} multi-selection metrics</span>
                <span className="badge badge-info">Marks weightage: 20 / question</span>
                <span className="badge badge-info">{customTitle.trim() || courses.find(c => c.id === aiPreview.courseId)?.title || 'Untitled Assessment'}</span>
                <span className="badge badge-info">{selectedSubject || 'General Meteorology'}</span>
                <span className="badge badge-info">{customDeadline ? new Date(customDeadline).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '+7 day window'}</span>
              </div>

              {aiPreview.questions.map((q, i) => (
                <div className="audit-q" key={q.id}>
                  <div className="audit-q-head">
                    <span style={{ fontWeight: 700, minWidth: '26px' }}>Q{i + 1}.</span>
                    <span style={{ fontWeight: 600 }}>{q.question_text}</span>
                  </div>
                  {q.options.map((opt, oi) => {
                    const valid = oi === q.correct_answer_index;
                    return (
                      <div key={oi} className={`audit-opt ${valid ? 'valid' : ''}`}>
                        <span style={{ fontWeight: 700, minWidth: '24px' }}>{String.fromCharCode(65 + oi)}.</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div>{opt}</div>
                          {valid && <div className="audit-key">• SYSTEM VALIDATED ANSWER KEY</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: '18px' }}>
                <button className="btn btn-amber btn-lg btn-block" onClick={handleCommissionDispatch} disabled={aiBusy}>
                  {aiBusy ? 'Commissioning…' : '🚀 COMMISSION & DISPATCH EXAM SYLLABUS'}
                </button>
                <div style={{ fontSize: '11px', color: '#8fb0d8', textAlign: 'center', marginTop: '10px' }}>
                  Node verifies the compiled answer indices and grading keys before committing the payload to the global active force registry.
                </div>
              </div>
            </div>
          )}

          {aiResult && !aiBusy && (
            <div className="card animate-in" style={{ marginTop: '20px', borderLeft: '4px solid var(--success)', background: 'var(--bg)' }}>
              <div className="card-body">
                {aiFlash && (
                  <div className="skill-gap-alert success-wide" style={{ marginBottom: '14px' }}>
                    <strong>✓ DISPATCH SUCCESS: Training module exam parameters officially commissioned and broadcasted to all assigned Trainee terminals.</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{aiResult.exam.title} — exam syllabus commissioned &amp; broadcasted</div>
                  <span className="badge badge-success">Registered in global assessments</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  {(aiResult.exam?.questions || aiResult.questions).length} complex MCQs · Subject {selectedSubject || 'General Meteorology'} · Active until{' '}
                  <strong>{aiResult.deadline.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong> · Pass at 60%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SENT ASSESSMENT ARCHIVES LOG ───────────────────────────────────── */}
      <div className="card" style={{ marginTop: '24px', borderLeft: '6px solid var(--secondary)' }}>
        <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <h3>📋 SENT ASSESSMENT ARCHIVES LOG</h3>
          <span className="badge badge-info">{myExamArchive.length} dispatched syllabus record(s)</span>
        </div>
        <div className="card-body" style={{ padding: '12px 24px' }}>
          {myExamArchive.length > 0 ? myExamArchive.slice().reverse().map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.title}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span className="badge badge-info">{item.subject || 'General Meteorology'}</span>
                  <span>🗓 Deadline {new Date(item.deadline || item.submission_deadline).toLocaleString('en-IN')}</span>
                  <span>· {(item.questions || []).length} MCQ(s)</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                <span className="badge badge-success">ACTIVE</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.id}</span>
              </div>
            </div>
          )) : (
            <div className="empty-state"><p>No assessment syllabus records yet. Compile and commission an exam above to log it in the global registry.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}