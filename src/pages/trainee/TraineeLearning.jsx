import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { radarDomainForCompetency } from '../../utils/radarDomains';

export default function TraineeLearning() {
  const { currentUser, courses, exams, getExamForCourse, getModulesForCourse, getRecommendedCourses, getCompletedCoursesFor } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCourseId = searchParams.get('course');

  const [activeCourse, setActiveCourse] = useState(null);

  useEffect(() => {
    if (activeCourseId) {
      const course = courses.find(c => c.id === activeCourseId);
      if (course) setActiveCourse(course);
    } else {
      setActiveCourse(null);
    }
  }, [activeCourseId, courses]);

  const recommended = getRecommendedCourses(currentUser.id);
  const recommendedIds = recommended.map(r => r.course.id);
  const completedCourses = getCompletedCoursesFor(currentUser.id);

  let display;
  if (recommendedIds.length > 0) {
    display = courses.filter(c => recommendedIds.includes(c.id) || completedCourses.includes(c.id));
  } else {
    display = courses;
  }

  function beginCourse(course) {
    setActiveCourse(course);
    setSearchParams({ course: course.id });
  }

  return (
    <div>
      {activeCourse ? (
        <QuizView course={activeCourse} onExit={() => { setActiveCourse(null); setSearchParams({}); }} />
      ) : (
        <>
          {recommended.length > 0 && (
            <div className="skill-gap-alert high" style={{ marginBottom: '20px' }}>
              <strong>⚠ Prioritised for you:</strong> {recommended.length} programme(s) matched to your critical meteorological skill gaps.
            </div>
          )}
          <div className="grid grid-2">
            {display.map(course => {
              const isCompleted = completedCourses.includes(course.id);
              const isRecommended = recommendedIds.includes(course.id);
              const rec = recommended.find(r => r.course.id === course.id);
              const exam = getExamForCourse(course.id);
              const courseModules = getModulesForCourse(course.id);
              return (
                <div className="recommendation-card" key={course.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div className="course-title" style={{ marginBottom: 0 }}>{course.title}</div>
                    {isRecommended && <span className="badge badge-danger">Recommended</span>}
                    {isCompleted && <span className="badge badge-success">Completed</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {course.category} · {course.duration} · {courseModules.length} modules · 👨‍🏫 {course.trainer?.name || 'IMD Training Wing'}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{course.description}</p>
                  {rec && (
                    <div className="reason" style={{ marginTop: '8px' }}>
                      <strong>Why recommended:</strong> {rec.reason}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {exam ? <span className="badge badge-info">Assessment: {exam.passing_score}% to pass</span> : <span className="badge badge-neutral">No assessment</span>}
                    </div>
                    {!isCompleted ? (
                      <button className="btn btn-primary btn-sm" onClick={() => beginCourse(course)}>Open Programme →</button>
                    ) : (
                      <span style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>✓ Competency updated</span>
                    )}
                  </div>
                </div>
              );
            })}
            {display.length === 0 && <div className="card"><div className="card-body"><div className="empty-state"><p>No programmes available.</p></div></div></div>}
          </div>
        </>
      )}
    </div>
  );
}

function QuizView({ course, onExit }) {
  const { currentUser, getExamForCourse, submitExam, getModulesForCourse, competencies } = useApp();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const exam = getExamForCourse(course.id);
  const questions = exam?.questions || [];
  const courseModules = getModulesForCourse(course.id);
  const answeredCount = Object.keys(answers).length;

  function selectAnswer(qIndex, optIndex) {
    setAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
  }

  async function handleSubmit() {
    setBusy(true);
    setUploadError('');
    try {
      const res = await submitExam(exam, course, answers);
      setResult(res);
      setSubmitted(true);
    } catch (err) {
      setUploadError(err.message || 'Evaluation upload failed.');
    }
    setBusy(false);
  }

  if (!exam) {
    return (
      <div className="quiz-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{course.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Assessment not yet published by the Training Wing.</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onExit}>× Exit</button>
        </div>
        <div className="card"><div className="card-body"><div className="empty-state"><p>The examiner will publish an assessment with a submission deadline for this programme.</p></div></div></div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{course.title}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Assessment · Pass at {exam.passing_score}% · Deadline {new Date(exam.submission_deadline).toLocaleString('en-IN')}
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={onExit}>× Exit</button>
      </div>

      {!submitted ? (
        <>
          {uploadError && (
            <div className="skill-gap-alert high" style={{ marginBottom: '16px' }}>
              <strong>✗ {uploadError}</strong>
            </div>
          )}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Module Review</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{courseModules.length} module(s)</span>
              </div>
              {courseModules.slice(0, 3).map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '13px' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓</span> {i + 1}. {m.title}
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Question {currentQuestion + 1} of {questions.length}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{answeredCount}/{questions.length} answered</span>
              </div>
              <div className="progress-bar-container" style={{ marginBottom: '20px' }}>
                <div className="progress-bar blue" style={{ width: `${(currentQuestion / questions.length) * 100}%` }} />
              </div>

              <div className="quiz-question">
                <h4>{questions[currentQuestion]?.question_text ?? questions[currentQuestion]?.question}</h4>
                {questions[currentQuestion]?.options.map((opt, idx) => {
                  const isSelected = answers[currentQuestion] === idx;
                  return (
                    <button key={idx} className={`quiz-option ${isSelected ? 'selected' : ''}`} onClick={() => selectAnswer(currentQuestion, idx)}>
                      <span style={{ fontWeight: 700, marginRight: '8px' }}>{String.fromCharCode(65 + idx)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn btn-outline" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0}>← Previous</button>
                {currentQuestion < questions.length - 1 ? (
                  <button className="btn btn-secondary" onClick={() => setCurrentQuestion(currentQuestion + 1)}>Next →</button>
                ) : (
                  <button className="btn btn-success" onClick={handleSubmit} disabled={answeredCount < questions.length || busy}>
                    {busy ? 'Submitting…' : answeredCount < questions.length ? `Answer all ${questions.length} to submit` : 'Submit Assessment ✓'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card animate-in">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{result.passed ? '🎉' : '📝'}</div>
            <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>
              {result.passed ? 'Assessment Passed' : 'Reassessment Required'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {result.correct} / {result.total} correct · {result.score}% (pass at {exam.passing_score}%)
            </p>
            <div className="progress-bar-container" style={{ maxWidth: '300px', margin: '0 auto 24px' }}>
              <div className={`progress-bar ${result.passed ? 'green' : 'red'}`} style={{ width: `${result.score}%` }} />
            </div>

            {result.passed && (
              <div className="recommendation-card" style={{ textAlign: 'left', maxWidth: '460px', margin: '0 auto 24px' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>🔄 Dynamic Competency Re-baseline</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Passing this assessment recomputed your <strong>{course.title}</strong> linked competencies in{' '}
                  <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: '4px' }}>trainee_competency_scores</code>.
                  {course.id === 'imd-nwp-course' && (
                    <div style={{ background: 'var(--bg)', padding: '8px 12px', borderRadius: '6px', marginTop: '8px' }}>
                      <strong>Numerical Weather Prediction (NWP):</strong> <span style={{ fontWeight: 800 }}>47% → 63%</span>
                    </div>
                  )}
                  Your EVALUATION_LOG entry confirms this assessment window is complete. Track the improvement live in your Trainee Scientific Matrix.
                </div>
              </div>
            )}

            {result.passed && result.score >= 80 && (
              <div className="imd-badge-flash" key={result.score}>
                <div className="imd-badge">
                  <div className="imd-badge-rings">
                    <span className="ring r1" /><span className="ring r2" /><span className="ring r3" />
                    <div className="imd-badge-core">✦</div>
                  </div>
                  <div className="imd-badge-title">IMD DOMAIN COMPETENCY BADGE</div>
                  <div className="imd-badge-sub">Awarded for assessment excellence at ≥80%</div>
                </div>
                <div className="imd-badge-meta">
                  Radar Matrix dimensions shifted <strong>+15 index points during the re-baseline</strong> and the corresponding
                  topics were removed from your Critical Skill-Gap Deficit Alert.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {(result.boosted || []).map(b => {
                    const dom = radarDomainForCompetency(competencies, b.competency_id);
                    return (
                      <div key={b.competency_id} className="boost-tile">
                        <div className="boost-domain">{dom ? dom.label : b.competency_name}</div>
                        <div className="boost-shift">{b.from}% → <strong>{b.to}%</strong></div>
                        <div className="boost-tag">{dom ? 'Radar Matrix · +15 pts' : 'Competency re-baselined'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={onExit}>Back to Programmes →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}