import { useState } from 'react';
import { useApp } from '../../context/AppContext';

const EMPTY_QUESTION = { question_text: '', options: ['', '', '', ''], correct_answer_index: 0, marks_weightage: 20 };

export default function TrainerExams() {
  const { currentUser, courses, exams, competencies, createExamForCourse } = useApp();
  const [courseId, setCourseId] = useState('');
  const [passingScore, setPassingScore] = useState(60);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [questions, setQuestions] = useState([{ ...EMPTY_QUESTION }]);
  const [mappedComps, setMappedComps] = useState([]);
  const [saved, setSaved] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const selectedCourse = courses.find(c => c.id === courseId);

  function buildDeadline() {
    if (!deadlineDate) return null;
    const iso = `${deadlineDate}T${deadlineTime || '23:59'}:00+05:30`;
    return new Date(iso).toISOString();
  }

  function toggleComp(id) {
    setMappedComps(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  function updateQuestion(idx, field, value) {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  }

  function updateOption(idx, optIdx, value) {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, options: q.options.map((o, oi) => oi === optIdx ? value : o) } : q));
  }

  function addQuestion() { setQuestions(prev => [...prev, { ...EMPTY_QUESTION }]); }
  function removeQuestion(idx) { setQuestions(prev => prev.filter((_, i) => i !== idx)); }

  async function handleSubmit(e) {
    e.preventDefault();
    const deadline = buildDeadline();
    if (!deadline) { setSaved('Set a submission deadline first.'); return; }
    const cleanQuestions = questions.filter(q => q.question_text.trim() !== '' && q.options.every(o => o.trim() !== ''));
    if (cleanQuestions.length === 0) { setSaved('Add at least one valid question.'); return; }
    const competenciesToMap = selectedCourse?.developed_competencies?.length
      ? selectedCourse.developed_competencies
      : mappedComps;

    setErrMsg('');
    try {
      await createExamForCourse({
        course_id: courseId,
        questions: cleanQuestions.map((q, i) => ({ id: `q-${Date.now()}-${i}`, ...q })),
        passing_score: passingScore,
        submission_deadline: deadline,
        competencies: competenciesToMap,
      });
      setSaved(`Assessment for "${selectedCourse?.title}" published with deadline ${new Date(deadline).toLocaleString('en-IN')}. Competencies mapped to your authoring profile.`);
      setTimeout(() => {
        setQuestions([{ ...EMPTY_QUESTION }]);
        setMappedComps([]);
        setSaved('');
      }, 3000);
    } catch (err) {
      setErrMsg(err.message || 'Assessment publish failed.');
    }
  }

  return (
    <div>
      {saved && (
        <div className="skill-gap-alert normal" style={{ marginBottom: '20px' }}>
          <strong>✅ {saved}</strong>
        </div>
      )}
      {errMsg && (
        <div className="skill-gap-alert high" style={{ marginBottom: '20px' }}>
          <strong>✗ {errMsg}</strong>
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header"><h3>Existing Assessments & Deadlines</h3></div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Questions</th>
                <th>Passing Score</th>
                <th>Submission Deadline</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(exam => {
                const course = courses.find(c => c.id === exam.course_id);
                const deadline = new Date(exam.submission_deadline);
                const open = deadline > new Date();
                return (
                  <tr key={exam.id}>
                    <td style={{ fontWeight: 600 }}>{course ? course.title : exam.course_id}</td>
                    <td>{(exam.questions || []).length}</td>
                    <td>{exam.passing_score}%</td>
                    <td>{deadline.toLocaleString('en-IN')}</td>
                    <td>{open ? <span className="badge badge-success">Open</span> : <span className="badge badge-danger">Closed</span>}</td>
                  </tr>
                );
              })}
              {exams.length === 0 && <tr><td colSpan="5"><div className="empty-state"><p>No assessments yet.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-2" style={{ marginBottom: '20px' }}>
          <div className="card">
            <div className="card-header"><h3>Target Course & Deadline</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label>Course to Assess</label>
                <select value={courseId} onChange={e => setCourseId(e.target.value)} required>
                  <option value="">Select a model course…</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label>Submission Date</label>
                  <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Closing Time (IST)</label>
                  <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Passing Score (%)</label>
                <input type="number" min="0" max="100" value={passingScore} onChange={e => setPassingScore(parseInt(e.target.value) || 60)} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Competency Mapping</h3></div>
            <div className="card-body">
              {selectedCourse && selectedCourse.developed_competencies?.length > 0 && (
                <div className="skill-gap-alert normal" style={{ marginBottom: '12px' }}>
                  <strong>Course-linked competencies auto-mapped:</strong>{' '}
                  {selectedCourse.developed_competencies.map(id => competencies.find(c => c.id === id)?.competency_name).join(' · ')}
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Additional Competencies for this assessment</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {competencies.map(comp => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => toggleComp(comp.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '20px',
                        border: mappedComps.includes(comp.id) ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: mappedComps.includes(comp.id) ? 'var(--primary)' : 'var(--bg-card)',
                        color: mappedComps.includes(comp.id) ? '#fff' : 'var(--text)',
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
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <h3>Question Bank (Stored in EXAM_QUESTIONNAIRE.questions)</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={addQuestion}>+ Add Question</button>
          </div>
          <div className="card-body">
            {questions.map((q, idx) => (
              <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px', background: 'var(--bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>Question {idx + 1}</span>
                  {questions.length > 1 && <button type="button" className="btn btn-danger btn-sm" onClick={() => removeQuestion(idx)}>Remove</button>}
                </div>
                <div className="form-group">
                  <input type="text" value={q.question_text} onChange={e => updateQuestion(idx, 'question_text', e.target.value)} placeholder="Meteorological assessment question" />
                </div>
                <div className="grid grid-2" style={{ gap: '12px' }}>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="form-group" style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="radio" name={`correct-${idx}`} checked={q.correct_answer_index === oi} onChange={() => updateQuestion(idx, 'correct_answer_index', oi)} />
                        <input type="text" value={opt} onChange={e => updateOption(idx, oi, e.target.value)} placeholder={`Option ${oi + 1}`} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Select the radio button next to the correct answer</div>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-success btn-lg" style={{ width: '100%' }}>
          📋 Publish Assessment & Dead Line
        </button>
      </form>
    </div>
  );
}