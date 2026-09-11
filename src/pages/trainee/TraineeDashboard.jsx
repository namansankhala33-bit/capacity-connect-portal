import LearningLoop from '../../components/LearningLoop';
import { useApp } from '../../context/AppContext';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { radarDomains, resolveRadarCompetency } from '../../utils/radarDomains';
import { useState } from 'react';

export default function TraineeDashboard() {
  const { currentUser, courses, competencies, getTraineeGaps, getRecommendedCourses, getCompletedCoursesFor, exams, evaluations, scores, trainerLibrary } = useApp();

  const profile = currentUser;
  if (!profile || profile.approved_by_admin !== true) {
    return <AccreditationLock profile={profile} />;
  }
  const gaps = getTraineeGaps(profile.id);
  const highPriority = gaps.filter(g => g.priority === 'HIGH PRIORITY');
  const recommendations = getRecommendedCourses(profile.id);
  const completedCourses = getCompletedCoursesFor(profile.id);

  const myScores = [];
  competencies.forEach(comp => {
    const gap = gaps.find(g => g.id === comp.id);
    if (gap) myScores.push({ ...comp, current_score: gap.current_score, target_score: gap.target_score });
    else myScores.push({ ...comp, current_score: 0, target_score: comp.department_target });
  });
  const avgCompetency = myScores.reduce((a, c) => a + c.current_score, 0) / Math.max(1, myScores.length);

  const myEvals = evaluations.filter(e => e.trainee_id === profile.id).length;
  const pendingExams = exams.filter(ex => {
    const c = courses.find(x => x.id === ex.course_id);
    if (!c) return false;
    return !completedCourses.includes(c.id) && new Date(ex.submission_deadline) > new Date();
  });

  const scoreMap = {};
  scores.filter(s => s.trainee_id === profile.id).forEach(s => { scoreMap[s.competency_id] = s.current_score; });
  const radarData = radarDomains.map(d => {
    const comp = resolveRadarCompetency(competencies, d);
    const id = comp ? comp.id : d.competencyId;
    const score = scoreMap[id] ?? 0;
    const target = comp ? comp.department_target : 75;
    return { domain: d.short, full: d.label, score, target, gap: Math.max(0, target - score) };
  });

  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function downloadResource(resource) {
    if (resource.fileData) {
      const a = document.createElement('a');
      a.href = resource.fileData;
      a.download = resource.fileName || 'study-material';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    const text = `${resource.title}\n\nType: ${resource.type}\nAuthor: ${resource.author}\nDate: ${resource.date}\n\n${resource.description}\n\nIMD Capacity Connect — Trainer Technical Library (CI/CD onboarding material).`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resource.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <LearningLoop activeIndex={3} />

      {highPriority.length > 0 && (
        <div className="skill-gap-alert high" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong>⚠ Competency Gap Alert:</strong> You have {highPriority.length} meteorological competency gap(s) of 25+ points.
              Complete the recommended training below to close them — a passing score of <strong>≥80%</strong> awards the IMD Domain
              Competency Badge, boosts the Radar Matrix by +15 index points and removes the topic from this deficit alert.
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
            {highPriority.map(g => {
              const d = radarDomains.find(x => {
                const r = resolveRadarCompetency(competencies, x);
                return r && r.id === g.id;
              });
              return (
                <span key={g.id} className="badge badge-danger">
                  {d ? d.label : g.competency_name} · {g.current_score}% vs {g.target_score}%
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: '24px' }}>
        <div className="stat-card primary">
          <div className="stat-label">Overall Competency</div>
          <div className="stat-value">{Math.round(avgCompetency)}%</div>
          <div className="stat-change up">Across {competencies.length} WMO competencies</div>
        </div>
        <div className="stat-card secondary">
          <div className="stat-label">Critical Gaps</div>
          <div className="stat-value" style={{ color: highPriority.length > 0 ? 'var(--danger)' : 'var(--success)' }}>{highPriority.length}</div>
          <div className="stat-change">{highPriority.length > 0 ? '↓ Requires intervention' : '✓ No critical gaps'}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Completed Programmes</div>
          <div className="stat-value">{completedCourses.length}</div>
          <div className="stat-change up">Assessments passed</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Pending Assessments</div>
          <div className="stat-value">{pendingExams.length}</div>
          <div className="stat-change">Open until deadline</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>🎯 Recommended Training Programmes</div>
          {recommendations.length > 0 ? recommendations.slice(0, 3).map(({ course, reason, gaps: matches }) => (
            <div className="recommendation-card" key={course.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <div className="course-title">{course.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {course.category} · {course.duration} · 👨‍🏫 {course.trainer?.name || 'IMD Training Wing'}
                  </div>
                </div>
                <span className="badge badge-danger">HIGH PRIORITY</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>{course.description}</p>
              <div className="reason">
                <strong style={{ color: 'var(--primary)' }}>Why this programme was recommended:</strong><br />
                {reason}
              </div>
              <div style={{ marginTop: '14px' }}>
                <a href={`/trainee/learning?course=${course.id}`} className="btn btn-primary btn-sm">Open Programme →</a>
              </div>
            </div>
          )) : (
            <div className="card"><div className="card-body"><div className="empty-state"><p>No high-priority gaps. Strong operational posture!</p></div></div></div>
          )}
        </div>

        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>📡 Trainee Scientific Matrix</div>
          <div className="card">
            <div className="card-body">
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="domain" tick={{ fill: 'var(--text)', fontSize: 11, fontWeight: 700 }} />
                  <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={{ fontSize: 9 }} /> 
                  <Tooltip
                    formatter={(value, name, entry) => {
                      const pl = (entry && entry.payload) || {};
                      return [pl[name] ?? value, name === 'score' ? 'Current score (%)' : name === 'target' ? 'IMD target (%)' : name];
                    }}
                    labelFormatter={l => { const row = radarData.find(d => d.domain === l); return row ? row.full : l; }}
                  />
                  <Radar name="Current score" dataKey="score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.45} dot={{ r: 3 }} isAnimationActive={true} />
                  <Radar name="IMD target" dataKey="target" stroke="var(--secondary)" fill="rgba(14,165,233,0.12)" strokeDasharray="5 4" dot={false} isAnimationActive={true} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                ▍ 5 operational science domains · Current score (navy) vs IMD department target (blue dashed) · Passing an assessment at ≥80% shifts
                the linked domains +15 index points upward and clears them from the Critical Skill-Gap Deficit Alert.
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <h3>Assessment Windows</h3>
            </div>
            <div className="card-body" style={{ padding: '12px 24px' }}>
              {pendingExams.slice(0, 4).map(exam => {
                const course = courses.find(c => c.id === exam.course_id);
                const daysLeft = Math.ceil((new Date(exam.submission_deadline) - new Date()) / 86400000);
                return (
                  <div key={exam.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{course?.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Deadline {new Date(exam.submission_deadline).toLocaleDateString('en-IN')} · {daysLeft} day(s) remaining
                    </div>
                  </div>
                );
              })}
              {pendingExams.length === 0 && <div className="empty-state"><p>No open assessment windows.</p></div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── KNOWLEDGE HUB ──────────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '24px', borderLeft: '6px solid var(--secondary)' }}>
        <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <h3>Knowledge Hub — Trainer Technical Library</h3>
          <span className="badge badge-info">
            {trainerLibrary.length} shared resources by IMD faculty
          </span>
        </div>
        <div className="card-body">
          <div className="library-grid">
            {trainerLibrary.slice().reverse().map(resource => {
              const typeClass = resource.type.includes('Video')
                ? 'lib-type lib-type-video'
                : resource.type.includes('Slide')
                  ? 'lib-type lib-type-slide'
                  : 'lib-type lib-type-manual';
              const typeIcon = resource.type.includes('Video') ? '🎬' : resource.type.includes('Slide') ? '📊' : '📘';
              return (
                <div className="library-card animate-in" key={resource.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <span className={typeClass}>{typeIcon} {resource.type}</span>
                    <span className="badge badge-neutral">{resource.author}</span>
                  </div>
                  <div className="library-title">{resource.title}</div>
                  <div className="library-desc">{resource.description}</div>
                  {resource.fileName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginTop: '6px', fontWeight: 600, color: 'var(--primary)' }}>
                      📎 {resource.fileName} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>· {formatSize(resource.fileSize)}</span>
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Published {resource.date} · IMD Faculty Archive
                  </div>
                  <button className="btn btn-outline btn-sm btn-block" style={{ marginTop: '10px' }} onClick={() => downloadResource(resource)}>
                    ⬇ Download Study Material
                  </button>
                </div>
              );
            })}
            {trainerLibrary.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <p>No study materials published yet. Faculty uploads will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccreditationLock({ profile }) {
  const { submitProfileForApproval } = useApp();
  const initialQ = Array.isArray(profile?.qualifications?.list) ? profile.qualifications.list.filter(Boolean) : [];
  const initialE = Array.isArray(profile?.work_experience) ? profile.work_experience.filter(Boolean) : [];
  const initialI = Array.isArray(profile?.interests) ? profile.interests.filter(Boolean) : [];

  const [qualifications, setQualifications] = useState(initialQ);
  const [experience, setExperience] = useState(initialE);
  const [interests, setInterests] = useState(initialI);
  const [phase, setPhase] = useState(profile?.profile_submitted ? 'submitted' : 'editing');
  const [processing, setProcessing] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function push(kind) {
    if (kind === 'q') setQualifications(p => [...p, '']);
    else if (kind === 'e') setExperience(p => [...p, '']);
    else setInterests(p => [...p, '']);
  }

  function update(kind, idx, value) {
    if (kind === 'q') setQualifications(p => p.map((v, i) => (i === idx ? value : v)));
    else if (kind === 'e') setExperience(p => p.map((v, i) => (i === idx ? value : v)));
    else setInterests(p => p.map((v, i) => (i === idx ? value : v)));
  }

  function remove(kind, idx) {
    if (kind === 'q') setQualifications(p => p.filter((_, i) => i !== idx));
    else if (kind === 'e') setExperience(p => p.filter((_, i) => i !== idx));
    else setInterests(p => p.filter((_, i) => i !== idx));
  }

  async function transmit() {
    if (qualifications.every(x => !x.trim()) && experience.every(x => !x.trim()) && interests.every(x => !x.trim())) return;
    setSubmitError('');
    setProcessing(true);
    try {
      await submitProfileForApproval(profile.id, { qualifications, work_experience: experience, interests });
      setPhase('submitted');
    } catch (err) {
      setSubmitError(err.message || 'Transmission failed. Retry the submission.');
    }
    setProcessing(false);
  }

  const chips = (items, empty) => (items.length > 0
    ? items.filter(Boolean).map((q, i) => <span key={i} className="badge badge-neutral">{q}</span>)
    : <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{empty}</span>
  );

  return (
    <div>
      <div className="accred-lock">
        <div className="accred-lock-bar">⚠️ ACCREDITATION LOCK</div>
        <div className="accred-lock-body">
          <strong style={{ fontSize: '15px' }}>Official Profile Verification Required.</strong>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            The course catalogue, Scientific Matrix analytics and assessment windows are commissioned only after the Director General verifies
            your professional credentials. Please configure your professional credentials below to submit your portfolio
            to the Director General for review.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {chips(initialQ, 'No qualifications configured')}
            {chips(initialI, 'No scientific interests added')}
          </div>
        </div>
      </div>

      {processing && (
        <div className="skill-gap-alert normal processing-banner" style={{ marginBottom: '20px' }}>
          <div className="ai-spinner" />
          <div>
            <strong>Processing Validation…</strong>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Securely transmitting your portfolio to the Director General commissioning queue. Please await confirmation.
            </div>
          </div>
        </div>
      )}

      {submitError && (
        <div className="skill-gap-alert high" style={{ marginBottom: '20px' }}>
          <strong>✗ {submitError}</strong>
        </div>
      )}

      {phase === 'submitted' && !processing ? (
        <div className="card animate-in" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="card-body">
            <div style={{ fontWeight: 700, fontSize: '15px' }}>✅ Credentials Transmitted — Awaiting Commissioning</div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 12px' }}>
              Your portfolio has been forwarded to the Director General review queue. Your workspace unlocks automatically upon approval.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Academic Qualifications</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{chips(qualifications, '—')}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Operational Work Experience</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{chips(experience, '—')}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Scientific Interests</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{chips(interests, '—')}</div>
              </div>
            </div>
            <button className="btn btn-outline btn-sm" style={{ marginTop: '16px' }} onClick={() => setPhase('editing')}>
              ✏ Edit & Resubmit Credentials
            </button>
          </div>
        </div>
      ) : (
        phase === 'editing' && !processing && (
          <div className="card">
            <div className="card-header">
              <h3>Official Professional Credentials — Dynamic Portfolio Builder</h3>
            </div>
            <div className="card-body">
              <CredentialList label="Academic Qualifications" hint="e.g., M.Sc. Meteorology, University of Delhi (2021)" kind="q"
                items={qualifications} onChange={update} onRemove={remove} onAdd={() => push('q')} placeholder="M.Sc. Aerology / B.Sc. Physics / Ph.D. …" />
              <CredentialList label="Operational Work Experience" hint="e.g., 2 Years Cyber Cell Observer, RMC Pune" kind="e"
                items={experience} onChange={update} onRemove={remove} onAdd={() => push('e')} placeholder="e.g., 3 Years Doppler Radar Data Logger" />
              <CredentialList label="Scientific Interests" hint="e.g., Numerical Weather Prediction, Cyclone Tracking" kind="i"
                items={interests} onChange={update} onRemove={remove} onAdd={() => push('i')} placeholder="e.g., INSAT-3DR Products" />

              <button className="btn btn-amber btn-lg" style={{ width: '100%' }} onClick={transmit} disabled={processing}>
                🛰 Transmit Credentials for Commissioning Approval
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function CredentialList({ label, hint, kind, items, onChange, onRemove, onAdd, placeholder }) {
  return (
    <div style={{ marginBottom: '22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>{label}</div>
        <button type="button" className="plus-btn" onClick={onAdd}>＋ Add item</button>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>{hint}</div>
      {items.map((value, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input type="text" value={value} placeholder={placeholder}
            onChange={e => onChange(kind, idx, e.target.value)}
            style={{ flex: 1 }} />
          <button type="button" className="plus-btn remove" onClick={() => onRemove(kind, idx)} title="Remove item">✕</button>
        </div>
      ))}
      {items.length === 0 && (
        <div style={{ fontSize: '12px', color: 'var(--text-light)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '12px' }}>
          No entries yet. Click “＋ Add item” to append a credential line.
        </div>
      )}
    </div>
  );
}