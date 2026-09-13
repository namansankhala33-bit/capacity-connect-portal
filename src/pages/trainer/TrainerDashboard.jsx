import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function TrainerDashboard() {
  const {
    courses, profiles, competencies, exams, currentUser,
    generateExamQuestions, createExamForCourse, trainerLibrary, onUploadResource, onUpdateTrainerProfile,
    evaluations, getTraineeGaps, getCompletedCoursesFor,
  } = useApp();

  const [aiCourseId, setAiCourseId] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiPreview, setAiPreview] = useState(null);
  const [dispatchFlash, setDispatchFlash] = useState(false);
  const aiTimer = useRef(null);

  const [profileEdit, setProfileEdit] = useState(false);
  const [pfDesignation, setPfDesignation] = useState(currentUser?.designation || '');
  const [pfSpecialty, setPfSpecialty] = useState(currentUser?.specialty || '');
  const [pfStation, setPfStation] = useState(currentUser?.station_location || '');
  const [pfBusy, setPfBusy] = useState(false);

  const [resTitle, setResTitle] = useState('');
  const [resType, setResType] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resFile, setResFile] = useState(null);
  const [resFlash, setResFlash] = useState(false);
  const resTimer = useRef(null);

  const myCourses = courses.filter(c => c.trainer_id === currentUser?.id);
  const allCourses = courses;
  const trainees = profiles.filter(p => p.role === 'Trainee' && p.approved_by_admin);
  const trainers = profiles.filter(p => p.role === 'Trainer');
  const totalEnrolled = allCourses.length;
  const examCount = exams.length;

  const approvedTrainees = profiles.filter(p => p.role === 'Trainee' && p.approved_by_admin);
  const examsByCourse = exams.reduce((acc, ex) => {
    (acc[ex.course_id] = acc[ex.course_id] || []).push(ex);
    return acc;
  }, {});
  const courseParticipation = allCourses.map(course => {
    const courseExams = examsByCourse[course.id] || [];
    const examIds = courseExams.map(ex => ex.id);
    const relEvals = evaluations.filter(e => examIds.includes(e.exam_id));
    const submittedTrainees = new Set(relEvals.map(e => e.trainee_id));
    const avgScore = relEvals.length ? Math.round(relEvals.reduce((a, e) => a + e.percentage, 0) / relEvals.length) : 0;
    return {
      course,
      examCount: courseExams.length,
      approved: approvedTrainees.length,
      submitted: submittedTrainees.size,
      notStarted: Math.max(0, approvedTrainees.length - submittedTrainees.size),
      avgScore,
    };
  });
  const traineeMonitor = approvedTrainees.map(t => {
    const ev = evaluations.filter(e => e.trainee_id === t.id);
    const attempted = ev.length;
    const avg = attempted ? Math.round(ev.reduce((a, e) => a + e.percentage, 0) / attempted) : 0;
    const completed = getCompletedCoursesFor(t.id).length;
    const gaps = getTraineeGaps(t.id);
    const highGaps = gaps.filter(g => g.priority === 'HIGH PRIORITY').length;
    const lowCap = gaps.length ? Math.round(gaps.reduce((a, g) => a + g.current_score, 0) / gaps.length) : null;
    return { t, attempted, avg, completed, highGaps, lowCap };
  });

  function traineeStatus(row) {
    if (row.attempted === 0) return { label: 'Not started', cls: 'badge-neutral' };
    if (row.avg >= 85) return { label: 'Strong performance', cls: 'badge-success' };
    if (row.avg >= 60 && row.highGaps === 0) return { label: 'On track', cls: 'badge-info' };
    return { label: 'Needs support', cls: 'badge-danger' };
  }

  useEffect(() => () => { clearTimeout(aiTimer.current); clearTimeout(resTimer.current); }, []);

  function handleAiCompile() {
    if (!aiCourseId) { setAiError('Select a target model course for the evaluation audit node to generate against.'); return; }
    setAiError('');
    setAiBusy(true);
    setAiResult(null);
    setAiPreview(null);
    setDispatchFlash(false);
    aiTimer.current = setTimeout(() => {
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
    const course = (myCourses.length ? myCourses : allCourses).find(c => c.id === aiPreview.courseId);
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    try {
      const existing = exams.find(e => e.course_id === aiPreview.courseId);
      const exam = await createExamForCourse({
        course_id: aiPreview.courseId,
        questions: aiPreview.questions,
        passing_score: 60,
        submission_deadline: deadline.toISOString(),
        competencies: course?.developed_competencies || [],
      });
      setAiResult({ exam, course, questions: aiPreview.questions, deadline, updated: Boolean(existing) });
      setAiPreview(null);
      setDispatchFlash(true);
      setTimeout(() => setDispatchFlash(false), 6000);
    } catch (err) {
      setAiError(err.message || 'Exam dispatch failed in the cloud.');
    } finally {
      setAiBusy(false);
    }
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    if (!pfDesignation.trim() || !pfStation.trim()) return;
    setPfBusy(true);
    try {
      await onUpdateTrainerProfile({
        designation: pfDesignation.trim(),
        specialty: pfSpecialty.trim(),
        station_location: pfStation.trim(),
      });
      setProfileEdit(false);
    } catch (err) {
      window.alert(err.message || 'Profile update failed.');
    } finally {
      setPfBusy(false);
    }
  }

  function toggleProfileEdit() {
    if (profileEdit) { setProfileEdit(false); return; }
    setPfDesignation(currentUser?.designation || '');
    setPfSpecialty(currentUser?.specialty || '');
    setPfStation(currentUser?.station_location || '');
    setProfileEdit(true);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read the selected file.'));
      reader.readAsDataURL(file);
    });
  }

  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleResourcePublish(e) {
    e.preventDefault();
    if (!resTitle.trim() || !resType || !resDesc.trim()) return;
    let fileData = null;
    if (resFile) {
      try {
        fileData = await readFileAsDataUrl(resFile);
      } catch {
        window.alert('Could not read the selected file.');
        return;
      }
    }
    const newResource = {
      id: `lib-${Date.now()}`,
      title: resTitle.trim(),
      type: resType,
      description: resDesc.trim(),
      author: currentUser?.name || 'Faculty Member',
      date: new Date().toISOString().slice(0, 10),
      fileName: resFile ? resFile.name : null,
      fileSize: resFile ? resFile.size : null,
      fileType: resFile ? resFile.type : null,
      fileData: fileData || null,
    };
    onUploadResource(newResource);
    setResTitle('');
    setResType('');
    setResDesc('');
    setResFile(null);
    setResFlash(true);
    clearTimeout(resTimer.current);
    resTimer.current = setTimeout(() => setResFlash(false), 1500);
  }

  return (
    <div>
      {/* ── SECTION A ───────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '24px', borderLeft: '6px solid var(--primary)' }}>
        <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Section A — Faculty Profile Management Node</h3>
          <button className="btn btn-outline btn-sm" onClick={toggleProfileEdit} disabled={pfBusy}>
            {profileEdit ? '✕ Cancel' : '⚙ Modify Profile Parameters'}
          </button>
        </div>
        <div className="card-body">
          {!profileEdit ? (
            <div className="grid grid-4" style={{ fontSize: '13px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Faculty Name</div>
                <div style={{ fontWeight: 600 }}>{currentUser?.name || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Designation</div>
                <div>{currentUser?.designation || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Specialty / Core Domain</div>
                <div>{currentUser?.specialty || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Station Anchor</div>
                <div>{currentUser?.station_location || '—'}</div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileSave} style={{ maxWidth: '620px' }}>
              <div className="grid grid-2" style={{ gap: '14px', marginBottom: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Designation (e.g., Scientist-F)</label>
                  <input value={pfDesignation} onChange={e => setPfDesignation(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Specialty / Core Domain</label>
                  <input value={pfSpecialty} onChange={e => setPfSpecialty(e.target.value)} placeholder="e.g., NWP & Radar Meteorology" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Station Anchor (e.g., IMD Pune)</label>
                <input value={pfStation} onChange={e => setPfStation(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={pfBusy || !pfDesignation.trim() || !pfStation.trim()}>
                {pfBusy ? 'Committing…' : 'Commit Profile Parameters'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── SECTION B ───────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '24px', borderLeft: '6px solid var(--warning)' }}>
        <div className="card-header">
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Section B — Unified Resource Provisioning Library</h3>
        </div>
        <div className="card-body">
          {resFlash && (
            <div className="skill-gap-alert normal" style={{ marginBottom: '16px', fontWeight: 700, fontSize: '13px' }}>
              ✓ Scientific Resource Compiled &amp; Broadcasted to Trainee Library Shell!
            </div>
          )}
          <div className="grid grid-2" style={{ gap: '24px' }}>
            <form onSubmit={handleResourcePublish} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Material Title</label>
                <input
                  value={resTitle}
                  onChange={e => setResTitle(e.target.value)}
                  placeholder="e.g., Doppler Radar VAD Analysis — Training Module"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Material Classification</label>
                <select value={resType} onChange={e => setResType(e.target.value)} required>
                  <option value="">Select classification…</option>
                  <option value="Recorded Video Lecture">Recorded Video Lecture</option>
                  <option value="Telemetry Presentation Slide">Telemetry Presentation Slide</option>
                  <option value="Operational Manual / Text Guide">Operational Manual / Text Guide</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Syllabus Scope Description</label>
                <textarea
                  value={resDesc}
                  onChange={e => setResDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe the syllabus coverage, target competencies and use-case context…"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Attach Video / Document (optional)</label>
                <input
                  type="file"
                  accept="video/*,audio/*,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  onChange={e => setResFile(e.target.files?.[0] || null)}
                />
                {resFile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', fontSize: '12px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>📎 {resFile.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>· {formatSize(resFile.size)}</span>
                    <button
                      type="button"
                      className="link-btn"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => setResFile(null)}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  The chosen file is embedded into the resource and trainees download the exact file. Files above ~4&nbsp;MB may not persist
                  across all devices on the network.
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block"
                disabled={!resTitle.trim() || !resType || !resDesc.trim()}
              >
                Publish Resource to Core Archive
              </button>
            </form>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '10px' }}>
                Core Archive ({trainerLibrary.length} items)
              </div>
              {trainerLibrary.slice().reverse().map(r => (
                <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: '12px' }}>{r.title}</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                    <span className={`badge badge-${r.type.includes('Video') ? 'info' : r.type.includes('Slide') ? 'neutral' : 'success'}`}>
                      {r.type}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>by {r.author} · {r.date}</span>
                  </div>
                </div>
              ))}
              {trainerLibrary.length === 0 && (
                <div style={{ fontStyle: 'italic', padding: '16px 0' }}>No resources published yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS ──────────────────────────────────────────────────────────── */}
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

      {/* ── SECTION C: TRAINEE PARTICIPATION & PERFORMANCE MONITOR ─────────── */}
      <div className="card" style={{ marginBottom: '24px', borderLeft: '6px solid var(--success)' }}>
        <div className="card-header">
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Section C — Trainee Participation &amp; Performance Monitor</h3>
        </div>
        <div className="card-body" style={{ padding: '0 24px 20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, margin: '16px 0 10px' }}>Participation by Model Course</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Model Course</th>
                  <th>Assessment</th>
                  <th>Approved Trainees</th>
                  <th>Submitted</th>
                  <th>Not Started</th>
                  <th>Avg Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {courseParticipation.map(({ course, examCount: eCount, approved, submitted, notStarted, avgScore }) => (
                  <tr key={course.id}>
                    <td style={{ fontWeight: 600 }}>{course.title}</td>
                    <td>{eCount === 0 ? <span className="badge badge-neutral">No assessment</span> : <span className="badge badge-info">{eCount} live</span>}</td>
                    <td>{approved}</td>
                    <td>{submitted}</td>
                    <td>{notStarted}</td>
                    <td>{avgScore > 0 ? `${avgScore}%` : '—'}</td>
                    <td>
                      {eCount === 0
                        ? <span className="badge badge-neutral">Not yet assessed</span>
                        : submitted === 0
                          ? <span className="badge badge-danger">Awaiting participation</span>
                          : submitted >= approved
                            ? <span className="badge badge-success">Fully attempted</span>
                            : <span className="badge badge-info">{Math.round((submitted / approved) * 100)}% attempted</span>}
                    </td>
                  </tr>
                ))}
                {courseParticipation.length === 0 && (
                  <tr><td colSpan="7"><div className="empty-state"><p>No model courses in the corpus.</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 700, margin: '20px 0 10px' }}>Per-Trainee Performance</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Trainee</th>
                  <th>Station Anchor</th>
                  <th>Attempted</th>
                  <th>Avg Score</th>
                  <th>Completed</th>
                  <th>Critical Gaps</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {traineeMonitor.map((row) => {
                  const st = traineeStatus(row);
                  return (
                    <tr key={row.t.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.t.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{row.t.designation} · {row.t.employee_id}</div>
                      </td>
                      <td>{row.t.station_location}</td>
                      <td>{row.attempted}</td>
                      <td style={{ minWidth: '140px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="progress-bar-container" style={{ flex: 1, width: 'auto' }}>
                            <div className="progress-bar" style={{ width: `${row.avg}%`, background: row.avg >= 85 ? 'var(--success)' : row.avg >= 60 ? 'var(--secondary)' : 'var(--danger)' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>{row.avg}%</span>
                        </div>
                      </td>
                      <td>{row.completed}</td>
                      <td>{row.highGaps > 0 ? <span className="badge badge-danger">{row.highGaps}</span> : <span style={{ color: 'var(--success)', fontSize: '12px' }}>None</span>}</td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    </tr>
                  );
                })}
                {traineeMonitor.length === 0 && (
                  <tr><td colSpan="7"><div className="empty-state"><p>No approved trainees to monitor yet.</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px' }}>
            Participation counts unique trainees who submitted an assessment for that course. Avg score spans all submitted evaluations;
            critical gaps = competency deficits of 25+ index points (HIGH PRIORITY).
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* ── COURSE CORPUS ──────────────────────────────────────────────── */}
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
          {/* ── QUICK ACTIONS ────────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h3>Quick Actions</h3>
            </div>
            <div className="card-body">
              <div className="skill-gap-alert normal">
                <strong>Model Course Protocol:</strong> Author a course with modules tied to WMO meteorological competencies, then design an
                assessment (EXAM_QUESTIONNAIRE) with a submission deadline. Passing assessments automatically re-baseline trainee competency scores.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                <a href="/trainer/course-builder" className="btn btn-secondary btn-block">Author Model Course →</a>
                <a href="/trainer/exams" className="btn btn-outline btn-block">Design Assessment &amp; Set Deadline →</a>
                <button className="btn btn-outline btn-block" onClick={() => document.getElementById('ai-questionnaire-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  Local-AI Questionnaire Builder
                </button>
              </div>
            </div>
          </div>

          {/* ── AUTHOR PROFILE ───────────────────────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <h3>My Authoring Profile</h3>
            </div>
            <div className="card-body" style={{ padding: '12px 24px' }}>
              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{currentUser?.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{currentUser?.designation} · {currentUser?.specialty}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{currentUser?.station_location}</div>
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

      {/* ── IMD EVALUATION AUDIT NODE ─────────────────────────────────────── */}
      <div className="card" id="ai-questionnaire-builder" style={{ borderLeft: '6px solid var(--secondary)', marginTop: '24px' }}>
      <div className="card-header">
        <h3>Local-AI Questionnaire Builder</h3>
      </div>
      <div className="card-body">
        <div className="skill-gap-alert normal" style={{ marginBottom: '16px' }}>
          <strong>No external AI APIs.</strong> The builder compiles a pre-formatted complex meteorological questionnaire (Doppler Radar velocity
          thresholds · BNS compliance tracking) from the local NWP &amp; Satellite Radar syllabus configuration, attaches an active 7-day deadline window,
          and broadcasts it to the active force registry.
        </div>

        {aiError && (
          <div className="skill-gap-alert high" style={{ marginBottom: '16px' }}>
            <strong>{aiError}</strong>
          </div>
        )}

        <div className="grid grid-2" style={{ alignItems: 'center', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Target Model Course (syllabus source)</label>
            <select value={aiCourseId} onChange={e => { setAiCourseId(e.target.value); setAiResult(null); setAiPreview(null); setDispatchFlash(false); }}>
              <option value="">Select a model course…</option>
              {(myCourses.length ? myCourses : allCourses).map(c => (
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
                Generating meteorological metrics · answer parameters · target grading keys · stamping 7-day deadline…
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
              Verify the generated meteorological metrics, answer parameters, and target grading keys before broadcasting this syllabus to the active force registry.
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
              <span className="badge badge-info">5 multi-selection metrics</span>
              <span className="badge badge-info">Marks weightage: 20 / question</span>
              <span className="badge badge-info">Deadline: {(myCourses.length ? myCourses : allCourses).find(c => c.id === aiPreview.courseId)?.title || 'Linked syllabus'}</span>
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
                Node verifies the compiled answer indices and grading keys before committing the payload to the active force registry.
              </div>
            </div>
          </div>
        )}

        {aiResult && !aiBusy && !aiPreview && (
          <div className="card animate-in" style={{ marginTop: '20px', borderLeft: '4px solid var(--success)', background: 'var(--bg)' }}>
            <div className="card-body">
              {dispatchFlash && (
                <div className="skill-gap-alert success-wide" style={{ marginBottom: '14px' }}>
                  <strong>✓ DISPATCH SUCCESS: Training module exam parameters officially commissioned and broadcasted to all assigned Trainee terminals.</strong>
                </div>
              )}
              {aiResult.updated && !dispatchFlash && (
                <div className="skill-gap-alert normal" style={{ marginBottom: '14px' }}>
                  <strong>✓ Syllabus assessment matrix already on file — re-calibrated and re-commissioned for the active force registry.</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>Exam syllabus commissioned &amp; broadcasted</div>
                <span className="badge badge-success">{aiResult.updated ? 'Matrix re-calibrated' : 'Registered in global assessments'}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                <strong>{aiResult.course.title}</strong> · {(aiResult.exam?.questions || aiResult.questions).length} complex MCQs · Active until{' '}
                <strong>{aiResult.deadline.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong> (7-day window) · Pass at 60%
              </div>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(aiResult.exam?.questions || aiResult.questions).map((q, i) => (
                  <div key={q.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--secondary)', minWidth: '20px' }}>Q{i + 1}.</span>
                    <span>{q.question_text ?? q.question}</span>
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