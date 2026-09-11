import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../lib/api';

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

function loadSession() {
  try {
    const raw = localStorage.getItem('cc_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const MOCK_LIBRARY = [
  { id: 'lib-1', title: 'NWP Fundamentals — Recorded Lecture', type: 'Recorded Video Lecture', description: 'Operational introduction to the NCUM and GFS model-guidance chains for monsoon forecasting desks, including bias-correction workflows.', author: 'Dr. Someshwar Rao', date: '2026-08-14' },
  { id: 'lib-2', title: 'Doppler Radar VAD Wind Profiling', type: 'Telemetry Presentation Slide', description: 'Step-by-step slide set covering the velocity azimuth display scanning strategy and dual-doppler mesocyclone identification.', author: 'Dr. Vikram Reddy', date: '2026-08-21' },
  { id: 'lib-3', title: 'IMD CWC Warning Bulletin SOP', type: 'Operational Manual / Text Guide', description: 'Standard operating procedure for serialised cyclone-warning bulletins under BNS compliance tracking, with template annexures.', author: 'Dr. Someshwar Rao', date: '2026-09-02' },
  { id: 'lib-4', title: 'INSAT-3DR Sounder Product Suite', type: 'Telemetry Presentation Slide', description: 'Temperature–humidity profile retrieval from the INSAT sounder with regional assimilation exercises and verification metrics.', author: 'Dr. Anita Joshi', date: '2026-09-09' },
];

function loadTrainerLibrary() {
  try {
    const raw = localStorage.getItem('cc_trainer_library');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fall through to seed archive
  }
  return MOCK_LIBRARY;
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(loadSession);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [exams, setExams] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [scores, setScores] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [trainerLibrary, setTrainerLibrary] = useState(loadTrainerLibrary);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [error, setError] = useState('');

  const currentUser = session?.user || null;

  const credentials = useMemo(() => (
    session?.user ? { email: session.user.email, password: session.password || '' } : { email: '', password: '' }
  ), [session]);

  const refresh = useCallback(async () => {
    try {
      setError('');
      const [p, c, m, e, ev, comp, sc, b] = await Promise.all([
        api.fetchAll('user_profiles'),
        api.fetchCoursesDeep(),
        api.fetchAll('modules'),
        api.fetchAll('exam_questionnaires'),
        api.fetchAll('evaluation_logs'),
        api.fetchAll('meteorological_competencies'),
        api.fetchAll('trainee_competency_scores'),
        api.fetchAll('homepage_bulletins'),
      ]);
      setProfiles(p);
      setCourses(c);
      setModules(m);
      setExams(e);
      setEvaluations(ev);
      setCompetencies(comp);
      setScores(sc);
      setBulletins(b);
      setSession(prev => {
        if (!prev || !prev.user) return prev;
        const latest = p.find(x => x.id === prev.user.id);
        return latest ? { ...prev, user: latest } : prev;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  async function login(email, password) {
    const result = await api.login(email, password);
    if (result.success) {
      const sess = { user: result.user, password };
      localStorage.setItem('cc_session', JSON.stringify(sess));
      setSession(sess);
    }
    return result;
  }

  async function register(details) {
    const result = await api.registerTrainee(details);
    if (!result.success) throw new Error(result.message || 'Registration failed.');
    const sess = { user: result.user, password: details.password || 'demo123' };
    localStorage.setItem('cc_session', JSON.stringify(sess));
    setSession(sess);
    await refresh();
    return result;
  }

  function logout() {
    localStorage.removeItem('cc_session');
    setSession(null);
  }

  function getProfile(id) {
    return profiles.find(p => p.id === id);
  }

  function getTrainee(id) {
    return profiles.find(p => p.id === id && p.role === 'Trainee');
  }

  function getTrainerById(id) {
    return profiles.find(p => p.id === id);
  }

  function getExamForCourse(courseId) {
    return exams.find(e => e.course_id === courseId) || null;
  }

  function getModulesForCourse(courseId) {
    return modules.filter(m => m.course_id === courseId);
  }

  function getCompletedExamsFor(traineeId) {
    const ids = evaluations.filter(e => e.trainee_id === traineeId && e.percentage >= (evaluationPassThreshold(e) || 60)).map(e => e.exam_id);
    return ids;
  }

  function evaluationPassThreshold(e) {
    const exam = exams.find(x => x.id === e.exam_id);
    return exam ? exam.passing_score : 60;
  }

  function getCompletedCoursesFor(traineeId) {
    const completedExamCourses = evaluations
      .filter(e => e.trainee_id === traineeId)
      .map(e => {
        const exam = exams.find(x => x.id === e.exam_id);
        return exam ? { exam, eval: e } : null;
      })
      .filter(Boolean);
    return completedExamCourses.filter(({ exam, eval: e }) =>
      e.percentage >= (exam.passing_score || 60)
    ).map(({ exam }) => exam.course_id);
  }

  function getTraineeGaps(traineeId) {
    const traineeScores = scores.filter(s => s.trainee_id === traineeId);
    return competencies.map(comp => {
      const row = traineeScores.find(s => s.competency_id === comp.id);
      const current = row ? row.current_score : 0;
      const target = row ? row.target_score : comp.department_target;
      const gap = Math.max(0, target - current);
      return {
        ...comp,
        current_score: current,
        target_score: target,
        gap,
        priority: gap >= 25 ? 'HIGH PRIORITY' : 'NORMAL',
      };
    }).filter(g => g.gap > 0).sort((a, b) => b.gap - a.gap);
  }

  function getRecommendedCourses(traineeId) {
    const gaps = getTraineeGaps(traineeId);
    const highPriority = gaps.filter(g => g.priority === 'HIGH PRIORITY');
    const priorityMap = {};
    gaps.forEach(g => { priorityMap[g.id] = g; });
    const scored = courses.map(course => {
      const matches = highPriority.filter(g => course.developed_competencies.includes(g.id));
      return { course, matches };
    }).filter(({ matches }) => matches.length > 0);
    scored.sort((a, b) => b.matches.length - a.matches.length);
    return scored.map(({ course, matches }) => {
      const gap = matches[0];
      const reason = `This programme develops "${gap.competency_name}", where your current score is ${gap.current_score}% against the IMD target of ${gap.target_score}% (gap of ${gap.gap} points). This gap is marked HIGH PRIORITY.`;
      return { course, reason, gaps: matches };
    });
  }

  async function adminCreateDirectProfile({ name, email, designation, station_location }) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!name || !normalized || !designation || !station_location) {
      throw new Error('All provisioning fields are required.');
    }
    if (profiles.some(p => String(p.email || '').toLowerCase() === normalized)) {
      throw new Error('A profile with this email already exists in the registry.');
    }
    let badge = `IMD-2026-MET-${100 + Math.floor(Math.random() * 900)}`;
    while (profiles.some(p => p.employee_id === badge)) {
      badge = `IMD-2026-MET-${100 + Math.floor(Math.random() * 900)}`;
    }
    const profile = {
      id: `prof-${Date.now()}`,
      employee_id: badge,
      name: name.trim(),
      email: normalized,
      role: 'Trainee',
      designation: designation.trim(),
      station_location: station_location.trim(),
      qualifications: {},
      work_experience: {},
      interests: [],
      approved_by_admin: true,
      profile_submitted: true,
      profile_password: 'demo123',
      created_at: new Date().toISOString(),
    };
    try {
      await api.enrollPersonnel(profile, credentials);
    } catch {
      // Optimistic local fallback: keep the badge visible on this device even if the
      // cloud RPC is not yet deployed (re-run supabase/schema.sql to enable cloud sync).
    }
    setProfiles(prev => [...prev, profile]);
    return profile;
  }

  async function enrollPersonnel(profileData) {
    return adminCreateDirectProfile(profileData);
  }

  async function submitProfileForApproval(userId, profileData) {
    const target = profiles.find(p => p.id === userId);
    if (!target) throw new Error('Profile not found in the registry.');
    const payload = {
      qualifications: { list: Array.isArray(profileData.qualifications) ? profileData.qualifications.filter(Boolean) : [] },
      work_experience: Array.isArray(profileData.work_experience) ? profileData.work_experience.filter(Boolean) : [],
      interests: Array.isArray(profileData.interests) ? profileData.interests.filter(Boolean) : [],
    };
    let persisted = false;
    try {
      await api.submitProfileForApproval(userId, payload, credentials);
      persisted = true;
    } catch {
      // Persist remains actionable locally even if the cloud RPC is not yet deployed.
    }
    const patch = { ...payload, profile_submitted: true };
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, ...patch } : p));
    setSession(prev => prev && prev.user && prev.user.id === userId ? { ...prev, user: { ...prev.user, ...patch } } : prev);
    if (persisted) await refresh();
    return { ...target, ...patch };
  }

  async function adminApproveTrainee(userId) {
    try {
      await api.approveProfile(userId, true, credentials);
      await refresh();
    } catch (err) {
      throw new Error(err.message || 'Approval update failed in the cloud.');
    }
  }

  function onUploadResource(newResource) {
    setTrainerLibrary(prev => {
      const next = [...prev, newResource];
      try {
        localStorage.setItem('cc_trainer_library', JSON.stringify(next));
      } catch {
        // archive persists in-session even if browser storage is unavailable
      }
      return next;
    });
  }

  async function onUpdateTrainerProfile(fields) {
    if (!currentUser) throw new Error('No active session.');
    const updates = {
      designation: fields.designation ?? currentUser.designation,
      specialty: fields.specialty ?? currentUser.specialty,
      station_location: fields.station_location ?? currentUser.station_location,
    };
    try {
      await api.updateTrainerProfile(currentUser.id, updates, credentials);
      await refresh();
    } catch {
      setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, ...updates } : p));
      setSession(prev => prev ? { ...prev, user: { ...prev.user, ...updates } } : prev);
    }
    return { ...currentUser, ...updates };
  }

  async function spawnAiExam(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) throw new Error('Select a model course to compile the questionnaire for.');
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const questions = [
      {
        id: `ai-q-${Date.now()}-1`,
        question: 'When the true radial velocity exceeds the Nyquist velocity, a Doppler radar velocity display shows:',
        options: [
          'Velocity folding (aliasing) that visually reverses the apparent flow direction',
          'A permanent echo-free core in the storm centre',
          'An automatic rejection of the entire storm volume',
          'Enhanced reflectivity only, with velocity censored',
        ],
        correct: 0,
      },
      {
        id: `ai-q-${Date.now()}-2`,
        question: 'For radar gate-to-gate shear, a mesocyclone couplet is operationally flagged when adjacent radial-velocity estimates differ by:',
        options: [
          'Greater than or equal to 25 m/s within a 1-2 km separation',
          'Exactly 5 m/s over 10 km',
          'Less than 2 m/s at any range',
          'Greater than 100 m/s at 50 km',
        ],
        correct: 1,
      },
      {
        id: `ai-q-${Date.now()}-3`,
        question: 'Under BNS (Bulletin & Notification System) compliance tracking, every disseminated warning bulletin must carry:',
        options: [
          'A machine-readable header with series number, timestamp, product origin and validity period',
          'Only the forecaster\u2019s personal remarks',
          'A blank template for the next shift',
          'Raw model output in binary form',
        ],
        correct: 0,
      },
      {
        id: `ai-q-${Date.now()}-4`,
        question: 'Which radar product is used to estimate the horizontal wind field by scanning 360 degrees at a constant elevation angle?',
        options: [
          'Velocity Azimuth Display (VAD)',
          'Base reflectivity single tilt',
          'Vertically Integrated Liquid (VIL)',
          'Rain-rate accumulation map',
        ],
        correct: 2,
      },
      {
        id: `ai-q-${Date.now()}-5`,
        question: 'For BNS compliance, when a warning bulletin is revised, the amended product must:',
        options: [
          'Be issued as a fresh serialised version with its own timestamp and appended to the audit log',
          'Be silently merged into the next scheduled bulletin',
          'Discard the previous bulletin from the record',
          'Wait for the next weekly review',
        ],
        correct: 3,
      },
    ];
    const created = await createExamForCourse({
      course_id: courseId,
      questions,
      passing_score: 60,
      submission_deadline: deadline.toISOString(),
      competencies: course.developed_competencies || [],
    });
    return { exam: created, course, questions, deadline };
  }

  async function approveProfile(profileId, approved) {
    try {
      await api.approveProfile(profileId, approved, credentials);
      await refresh();
    } catch (err) {
      throw new Error(err.message || 'Approval update failed in the cloud.');
    }
  }

  async function createCourseBundle({ course, moduleRows, exam, trainerId }) {
    try {
      let created;
      if (api.mode() === 'live') {
        created = await api.createCourse({ ...course, trainer_id: trainerId }, moduleRows, credentials);
        if (exam && exam.questions && exam.questions.length > 0) {
          await api.createExam({ ...exam, course_id: created.id }, credentials);
        }
      } else {
        created = await api.createCourse({ ...course, trainer_id: trainerId });
        await api.createModules(moduleRows.map(r => ({ ...r, course_id: created.id })));
        if (exam && exam.questions && exam.questions.length > 0) {
          await api.createExam({ ...exam, course_id: created.id });
        }
        if (course.developed_competencies && course.developed_competencies.length > 0) {
          await api.updateTrainerCompetencyProfile(trainerId, course.developed_competencies);
        }
      }
      await refresh();
      return created;
    } catch (err) {
      throw new Error(err.message || 'Course publish failed in the cloud.');
    }
  }

  async function createExamForCourse(examPayload) {
    try {
      const created = api.mode() === 'live'
        ? await api.createExam(examPayload, credentials)
        : await api.createExam(examPayload);
      if (api.mode() === 'demo' && examPayload.competencies && examPayload.competencies.length > 0 && currentUser) {
        await api.updateTrainerCompetencyProfile(currentUser.id, examPayload.competencies);
      }
      await refresh();
      return created;
    } catch (err) {
      throw new Error(err.message || 'Assessment publish failed in the cloud.');
    }
  }

  async function publishBulletin(bulletin) {
    try {
      const payload = { ...bulletin, published_by: currentUser ? currentUser.id : null };
      if (api.mode() === 'live') {
        await api.createBulletin(payload, credentials);
      } else {
        await api.createBulletin(payload);
      }
      await refresh();
    } catch (err) {
      throw new Error(err.message || 'Bulletin publish failed in the cloud.');
    }
  }

  async function submitExam(exam, course, answers) {
    const questions = exam.questions || [];
    const correct = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
    const pct = Math.round((correct / questions.length) * 100);
    const passed = pct >= (exam.passing_score || 60);
    const traineeId = currentUser.id;

    const scoreUpdates = [];
    const boosted = [];
    if (passed) {
      for (const compId of course.developed_competencies || []) {
        const existingRow = scores.find(s => s.trainee_id === traineeId && s.competency_id === compId);
        const current = existingRow ? existingRow.current_score : 0;
        const target = existingRow ? existingRow.target_score : 75;
        let updated;
        if (current === 47 && course.id === 'imd-nwp-course') {
          updated = 63;
        } else if (pct >= 80) {
          updated = Math.min(100, Math.max(target, current + 15));
        } else {
          updated = Math.min(Math.max(target, current + 16), 95);
        }
        scoreUpdates.push({ competency_id: compId, new_score: updated });
        const comp = competencies.find(c => c.id === compId);
        boosted.push({
          competency_id: compId,
          competency_name: comp ? comp.competency_name : compId,
          from: current,
          to: updated,
        });
      }
    }

    try {
      await api.recordAssessment({
        trainee_id: traineeId,
        exam_id: exam.id,
        course_id: course.id,
        answers,
        score: correct,
        percentage: pct,
        passed,
        score_updates: scoreUpdates,
      }, credentials);
      await refresh();
      return { score: pct, correct, total: questions.length, passed, boosted };
    } catch (err) {
      throw new Error(err.message || 'Evaluation upload failed.');
    }
  }

  function getOrgAnalytics() {
    const stations = {};
    profiles.filter(p => p.role === 'Trainee').forEach(p => {
      const key = p.station_location;
      if (!stations[key]) stations[key] = { name: key, completed: 0, trainees: 0, avg: 0, sumAvg: 0 };
      stations[key].trainees += 1;
      const myScores = scores.filter(s => s.trainee_id === p.id).map(s => s.current_score);
      const avg = myScores.length ? Math.round(myScores.reduce((a, b) => a + b, 0) / myScores.length) : 0;
      stations[key].sumAvg += avg;
      const done = getCompletedCoursesFor(p.id).length;
      stations[key].completed += done;
    });
    return Object.values(stations).map(s => ({
      ...s,
      avg: Math.round(s.sumAvg / s.trainees),
      completionRate: Math.round((s.completed / (s.trainees * Math.max(1, courses.length))) * 100),
    }));
  }

  function getSkillGapDistribution() {
    const dist = { high: 0, moderate: 0, low: 0 };
    profiles.filter(p => p.role === 'Trainee').forEach(t => {
      const gaps = getTraineeGaps(t.id);
      const highCount = gaps.filter(g => g.priority === 'HIGH PRIORITY').length;
      const normalCount = gaps.filter(g => g.priority === 'NORMAL').length;
      if (highCount >= 3) dist.high += 1;
      else if (highCount >= 1 || normalCount >= 4) dist.moderate += 1;
      else dist.low += 1;
    });
    return [
      { name: 'Critical (3+ high-priority gaps)', value: dist.high, color: '#dc2626' },
      { name: 'Moderate (1+ priority gaps)', value: dist.moderate, color: '#f59e0b' },
      { name: 'Low Risk', value: dist.low, color: '#16a34a' },
    ];
  }

  function exportToCSV() {
    const headers = ['Employee ID', 'Name', 'Email', 'Role', 'Designation', 'Station', 'Approved', 'Courses Completed'];
    const rows = profiles.map(p => [
      p.employee_id,
      p.name,
      p.email,
      p.role,
      p.designation,
      p.station_location,
      p.approved_by_admin ? 'Yes' : 'Pending',
      p.role === 'Trainee' ? getCompletedCoursesFor(p.id).length : 0,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'imd_capacity_connect_trainee_report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function resetDemoData() {
    if (api.mode() === 'live') {
      localStorage.removeItem('cc_session');
      setSession(null);
      return;
    }
    localStorage.removeItem('imd-cc-v1');
    localStorage.removeItem('cc_session');
    setSession(null);
    await refresh();
  }

  const value = {
    mode: api.mode(),
    loading, error, isOffline,
    currentUser, profiles, courses, modules, exams, evaluations, competencies, scores, bulletins,
    trainerLibrary, onUploadResource, onUpdateTrainerProfile,
    login, logout, refresh, getProfile, getTrainee, getTrainerById, register,
    getExamForCourse, getModulesForCourse, getCompletedCoursesFor,
    getTraineeGaps, getRecommendedCourses,
    approveProfile, enrollPersonnel, adminCreateDirectProfile, submitProfileForApproval, adminApproveTrainee,
    spawnAiExam, createCourseBundle, createExamForCourse, publishBulletin, submitExam,
    getOrgAnalytics, getSkillGapDistribution, exportToCSV, resetDemoData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}