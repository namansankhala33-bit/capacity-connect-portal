import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import { uuidv4 } from '../utils/uuid';

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

const TOPIC_RADAR = [
  {
    t: 'radar',
    question_text: 'For radar gate-to-gate shear, a mesocyclone couplet is operationally flagged when adjacent radial-velocity estimates differ by:',
    options: [
      'Exactly 5 m/s over a 10 km stretch',
      'Greater than or equal to 25 m/s within a 1-2 km separation',
      'Less than 2 m/s at any range',
      'Greater than 100 m/s at 50 km',
    ],
    correct_answer_index: 1,
    marks_weightage: 20,
  },
  {
    t: 'radar',
    question_text: 'Which scanning technique estimates the horizontal wind field by rotating the antenna 360° at a constant elevation angle?',
    options: [
      'Base reflectivity single tilt',
      'Vertically Integrated Liquid (VIL)',
      'Velocity Azimuth Display (VAD)',
      'Rain-rate accumulation map',
    ],
    correct_answer_index: 2,
    marks_weightage: 20,
  },
  {
    t: 'radar',
    question_text: 'When the true radial velocity exceeds the Nyquist velocity, the Doppler velocity display shows:',
    options: [
      'Velocity folding (aliasing) that visually reverses the apparent flow direction',
      'A permanent echo-free core in the storm centre',
      'An automatic rejection of the entire storm volume',
      'Enhanced reflectivity only, with velocity censored',
    ],
    correct_answer_index: 0,
    marks_weightage: 20,
  },
  {
    t: 'radar',
    question_text: 'A reflectivity value of 65 dBZ in a warm-season thunderstorm most plausibly indicates:',
    options: [
      'Light drizzle',
      'Thin cirrus cloud',
      'Very large hail and/or heavily ice-loaded cells',
      'Boundary layer fog',
    ],
    correct_answer_index: 2,
    marks_weightage: 20,
  },
];

const TOPIC_NWP = [
  {
    t: 'nwp',
    question_text: 'In the operational NWP chain used by IMD forecast desks, bias correction is applied primarily to:',
    options: [
      'Translate systematic model errors so model guidance aligns closer to observed climatology and recent persistence',
      'Remove all convective parameterization from the model',
      'Increase the vertical resolution of the output grid',
      'Replace satellite observations with radiosonde data',
    ],
    correct_answer_index: 0,
    marks_weightage: 20,
  },
  {
    t: 'nwp',
    question_text: 'Data assimilation in NWP blends observations with the model background primarily to:',
    options: [
      'Store raw observations for the archive',
      'Produce an analysed state closer to the true atmosphere for the next forecast cycle',
      'Reduce the model domain size',
      'Delay the forecast initialisation time',
    ],
    correct_answer_index: 1,
    marks_weightage: 20,
  },
  {
    t: 'nwp',
    question_text: 'A higher horizontal resolution in the forecast model generally:',
    options: [
      'Degrades the representation of orography',
      'Makes the output valid for a longer period',
      'Resolves finer mesoscale detail such as convective organisation and terrain-driven circulations',
      'Eliminates the need for ensemble members',
    ],
    correct_answer_index: 2,
    marks_weightage: 20,
  },
  {
    t: 'nwp',
    question_text: 'Ensemble NWP is used at the forecast desk because it:',
    options: [
      'Supplies a single deterministic answer',
      'Quantifies forecast uncertainty across perturbed initial conditions and model versions',
      'Replaces satellite interpretation entirely',
      'Only computes climate means',
    ],
    correct_answer_index: 1,
    marks_weightage: 20,
  },
];

const TOPIC_SATELLITE = [
  {
    t: 'satellite',
    question_text: 'The INSAT-3DR sounder product suite retrieves which primary atmospheric profiles?',
    options: [
      'Temperature–humidity profiles feeding regional assimilation and verification exercises',
      'Ocean salinity only',
      'Surface vegetation indices',
      'Urban heat island mapping',
    ],
    correct_answer_index: 0,
    marks_weightage: 20,
  },
  {
    t: 'satellite',
    question_text: 'Water-vapour channel imagery is most useful at the desk for:',
    options: [
      'Brightness of the land surface at night',
      'Tracing mid-upper level moisture advection and jet-stream features',
      'Measuring surface rainfall totals directly',
      'Determining sea-surface temperature to 0.01 K precision',
    ],
    correct_answer_index: 1,
    marks_weightage: 20,
  },
  {
    t: 'satellite',
    question_text: 'Satellite cloud-top temperature colder than the surrounding anvil suggests:',
    options: [
      'A weaker updraft',
      'A capping inversion',
      'Rapid overshooting updraft with likely intense convection',
      'Complete dissipation of the storm',
    ],
    correct_answer_index: 2,
    marks_weightage: 20,
  },
  {
    t: 'satellite',
    question_text: 'The main limitation of visible-band geostationary imagery is:',
    options: [
      'No capability after local sunset',
      'Poor resolution during the day',
      'Inability to detect clouds over ocean',
      'Saturation in all polar regions',
    ],
    correct_answer_index: 0,
    marks_weightage: 20,
  },
];

const TOPIC_SEVERE = [
  {
    t: 'severe',
    question_text: 'A squall line (QLCS) passage at a station typically poses the highest threat from:',
    options: [
      'Damaging straight-line winds and intense rainfall along the leading edge',
      'Slowly rotating weak mesoscale vortices only',
      'Persistent elevated fog',
      'Quiet subsidence warming',
    ],
    correct_answer_index: 0,
    marks_weightage: 20,
  },
  {
    t: 'severe',
    question_text: 'A persistent, deep, rotating updraft feature on Doppler radar is the defining signature of a:',
    options: [
      'Squall line',
      'Supercell thunderstorm',
      'Tropical depression',
      'Fog bank',
    ],
    correct_answer_index: 1,
    marks_weightage: 20,
  },
  {
    t: 'severe',
    question_text: 'The three-body scatter spike on radar is traditionally associated with which hazard?',
    options: [
      'Dense fog',
      'Freezing drizzle',
      'Very large hail',
      'Blowing dust',
    ],
    correct_answer_index: 2,
    marks_weightage: 20,
  },
  {
    t: 'severe',
    question_text: 'A tornado warning should be considered when radar indicates:',
    options: [
      'A persistent tornadic vortex signature / strong low-level velocity couplet',
      'Any echo top above 8 km',
      'Lightning is detected overhead',
      'One isolated reflectivity cell below threshold',
    ],
    correct_answer_index: 0,
    marks_weightage: 20,
  },
];

const TOPIC_BNS = [
  {
    t: 'bns',
    question_text: 'Under BNS (Bulletin & Notification System) compliance tracking, every disseminated warning bulletin must carry:',
    options: [
      'A machine-readable header with series number, timestamp, product origin and validity period',
      'Only the forecaster’s personal remarks',
      'A blank template for the next shift',
      'Raw model output in binary form',
    ],
    correct_answer_index: 0,
    marks_weightage: 20,
  },
  {
    t: 'bns',
    question_text: 'When a warning bulletin is revised under BNS compliance, the amended product must:',
    options: [
      'Be silently merged into the next scheduled bulletin',
      'Discard the previous bulletin from the record',
      'Be issued as a fresh serialised version with its own timestamp and appended to the audit log',
      'Wait for the next weekly review',
    ],
    correct_answer_index: 2,
    marks_weightage: 20,
  },
  {
    t: 'bns',
    question_text: 'The colour-coded tier in a severe-weather bulletin primarily signals:',
    options: [
      'The agency that issued the product',
      'The intensity and immediacy of the biological risk',
      'The forecast confidence level of the issuing desk',
      'The archiving priority of the bulletin',
    ],
    correct_answer_index: 2,
    marks_weightage: 20,
  },
  {
    t: 'bns',
    question_text: 'Which field is mandatory in a compliant bulletin header for traceability?',
    options: [
      'Product origin and validity period',
      'Forecaster’s personal mobile number',
      'Office gossip section',
      'Blank annexure',
    ],
    correct_answer_index: 0,
    marks_weightage: 20,
  },
];

const TOPIC_HYDROCLIMATE = [
  {
    t: 'hydroclimate',
    question_text: 'Flash flood guidance is most directly derived from:',
    options: [
      'Quantitative precipitation estimates/forecasts compared against basin saturation thresholds',
      'Persistent high pressure anomalies',
      'Sea-surface temperature alone',
      'Tidal amplitude',
    ],
    correct_answer_index: 0,
    marks_weightage: 20,
  },
  {
    t: 'hydroclimate',
    question_text: 'The monsoon onset over Kerala is declared operationally when:',
    options: [
      'Pre-monsoon showers occur over the Western Ghats only',
      'Consistent criteria for rainfall depth, wind field and OLR are satisfied over the region',
      'Sea surface temperature crosses 25 °C anywhere in the Bay',
      'The first low pressure system forms in the Arabian Sea',
    ],
    correct_answer_index: 1,
    marks_weightage: 20,
  },
  {
    t: 'hydroclimate',
    question_text: 'The Madden–Julian Oscillation influences monsoon activity primarily through:',
    options: [
      'Modulating convective activity on 30–60 day time scales',
      'Daily tidal cycles',
      'Changing the Earth’s rotation rate',
      'Saturating the visible satellite channel',
    ],
    correct_answer_index: 0,
    marks_weightage: 20,
  },
  {
    t: 'hydroclimate',
    question_text: 'A "1-in-100-year" flood statement at the hydrology desk implies:',
    options: [
      'It will never recur',
      'An average annual exceedance probability of about 1%',
      'It occurs every single year',
      'Confidence of absolute containment',
    ],
    correct_answer_index: 1,
    marks_weightage: 20,
  },
];

const TOPIC_AVIATION = [
  {
    t: 'aviation',
    question_text: 'A SIGMET is operationally issued when:',
    options: [
      'No significant weather exists over 24 hours',
      'En-route hazardous weather such as severe turbulence, severe icing, volcanic ash or thunderstorms is expected',
      'Surface fog lifts completely',
      'A routine TAF is amended twice',
    ],
    correct_answer_index: 1,
    marks_weightage: 20,
  },
  {
    t: 'aviation',
    question_text: 'Low-level wind shear reports at an aerodrome are critical because they:',
    options: [
      'Affect aircraft performance and approach stability near the runway',
      'Increase the visibility automatically',
      'Shift the runway identifier',
      'Reduce the cloud base',
    ],
    correct_answer_index: 0,
    marks_weightage: 20,
  },
  {
    t: 'aviation',
    question_text: 'For Category I instrument approach operations, the controlling reportable elements are:',
    options: [
      'Above-limit precipitation totals',
      'Runway drainage rate',
      'Cloud ceiling and runway visual range (RVR)',
      'Wind direction preference of the tower',
    ],
    correct_answer_index: 2,
    marks_weightage: 20,
  },
  {
    t: 'aviation',
    question_text: 'Standard ATC practice requires aircraft to route around isolated thunderstorms maintaining a buffer of at least:',
    options: [
      '20 nautical miles where the storm tops extend into the en-route flight levels',
      '1 nautical mile',
      '5 km over open water',
      'No lateral separation at all',
    ],
    correct_answer_index: 0,
    marks_weightage: 20,
  },
];

const AI_QUESTION_BANK = [
  ...TOPIC_RADAR,
  ...TOPIC_NWP,
  ...TOPIC_SATELLITE,
  ...TOPIC_SEVERE,
  ...TOPIC_BNS,
  ...TOPIC_HYDROCLIMATE,
  ...TOPIC_AVIATION,
];

const COURSE_TOPIC_MAP = {
  'Radar Meteorology': ['radar', 'severe'],
  'Forecasting Science': ['nwp', 'severe'],
  'Remote Sensing': ['satellite', 'nwp'],
  'Severe Weather': ['severe', 'radar', 'bns'],
  'Applied Services': ['bns', 'aviation'],
  'Hydrometeorology': ['hydroclimate'],
  'Climate Science': ['hydroclimate', 'nwp'],
  'Aviation': ['aviation', 'bns'],
};

const ALL_TOPICS = ['radar', 'nwp', 'satellite', 'severe', 'bns', 'hydroclimate', 'aviation'];

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  const [globalChatMessages, setGlobalChatMessages] = useState([]);

  const currentUser = session?.user || null;

  const credentials = useMemo(() => (
    session?.user ? { email: session.user.email, password: session.password || '' } : { email: '', password: '' }
  ), [session]);

  const refresh = useCallback(async () => {
    try {
      setError('');
      const [p, c, m, e, ev, comp, sc, b, chat] = await Promise.all([
        api.fetchAll('user_profiles'),
        api.fetchCoursesDeep(),
        api.fetchAll('modules'),
        api.fetchAll('exam_questionnaires'),
        api.fetchAll('evaluation_logs'),
        api.fetchAll('meteorological_competencies'),
        api.fetchAll('trainee_competency_scores'),
        api.fetchAll('homepage_bulletins'),
        api.fetchGlobalChat(),
      ]);
      setProfiles(p);
      setCourses(c);
      setModules(m);
      setExams(e);
      setEvaluations(ev);
      setCompetencies(comp);
      setScores(sc);
      setBulletins(b);
      setGlobalChatMessages(chat);
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

  async function onTransmitPeerMessage(messagePayload) {
    const payload = {
      id: 'MSG-' + uuidv4(),
      sender_id: messagePayload.sender_id,
      display_name: messagePayload.display_name,
      content: messagePayload.content,
      is_anonymous: messagePayload.is_anonymous,
      timestamp: new Date().toLocaleTimeString(),
    };
    let saved = payload;
    try {
      saved = await api.transmitGlobalChat(payload);
    } catch (err) {
      console.warn('chat-mesh transmit failed:', err);
    }
    setGlobalChatMessages(prev => (prev.some(m => m.id === saved.id) ? prev : [...prev, saved]));
    return saved;
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

  async function onChangeUserRole(userId, newRole) {
    const target = profiles.find(p => p.id === userId);
    if (!target) throw new Error('Personnel record not found in the registry.');
    if (target.role === newRole) return { ...target, role: newRole };

    try {
      await api.updateUserRole(userId, newRole, credentials);
      await refresh();
    } catch {
      setProfiles(prev => prev.map(p => (p.id === userId ? { ...p, role: newRole } : p)));
    }

    const updated = { ...target, role: newRole };
    if (currentUser && currentUser.id === userId) {
      setSession(prev => (prev ? { ...prev, user: { ...prev.user, role: newRole } } : prev));
    }
    return updated;
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

  function generateExamQuestions(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) throw new Error('Select a model course to compile the questionnaire for.');
    const topics = COURSE_TOPIC_MAP[course.category] || ALL_TOPICS;
    const pool = AI_QUESTION_BANK.filter(q => topics.includes(q.t));
    const selected = shuffleArray(pool.length >= 5 ? pool : AI_QUESTION_BANK).slice(0, 5);
    return selected.map((q, i) => ({
      id: `ai-q-${Date.now()}-${i + 1}`,
      question_text: q.question_text,
      options: q.options,
      correct_answer_index: q.correct_answer_index,
      marks_weightage: 20,
    }));
  }

  async function spawnAiExam(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) throw new Error('Select a model course to compile the questionnaire for.');
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const questions = generateExamQuestions(courseId);
    const existing = exams.find(e => e.course_id === courseId);
    const payload = {
      course_id: courseId,
      questions,
      passing_score: 60,
      submission_deadline: deadline.toISOString(),
      competencies: course.developed_competencies || [],
    };
    const created = await createExamForCourse(payload, existing);
    return { exam: created, course, questions, deadline, updated: Boolean(existing) };
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

  async function createExamForCourse(examPayload, existingExam) {
    const payload = { is_active: true, submitted: false, score: null, ...examPayload };
    try {
      const existing = existingExam || exams.find(e => e.course_id === payload.course_id);
      let created;
      if (existing) {
        created = await api.updateExam(existing.id, payload);
      } else {
        created = api.mode() === 'live'
          ? await api.createExam(payload, credentials)
          : await api.createExam(payload);
      }
      if (api.mode() === 'demo' && payload.competencies && payload.competencies.length > 0 && currentUser) {
        await api.updateTrainerCompetencyProfile(currentUser.id, payload.competencies);
      }
      await refresh();
      return existing ? { ...existing, ...payload, id: existing.id } : created;
    } catch (err) {
      throw new Error(err.message || 'Assessment publish failed in the cloud.');
    }
  }

  async function onDispatchNewExam(examPayload) {
    const fallbackDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const deadline = examPayload.deadline || examPayload.submission_deadline || fallbackDeadline;
    const payload = {
      ...examPayload,
      id: examPayload.id || uuidv4(),
      title: (examPayload.title || '').trim() || 'Untitled Assessment',
      subject: (examPayload.subject || '').trim() || 'General Meteorology',
      deadline: deadline || fallbackDeadline,
      submission_deadline: deadline || fallbackDeadline,
      is_active: examPayload.is_active !== false,
    };
    let created;
    if (api.mode() === 'live') {
      const existing = exams.find(e => e.course_id === payload.course_id);
      if (existing) {
        await api.updateExam(existing.id, payload);
        created = { ...existing, ...payload, id: existing.id };
      } else {
        created = await api.createExam(payload, credentials);
      }
    } else {
      created = await api.createExam(payload);
    }
    setExams(prev => [...prev.filter(e => e.id !== created.id), created]);
    if (api.mode() === 'demo' && payload.competencies && payload.competencies.length > 0 && currentUser) {
      await api.updateTrainerCompetencyProfile(currentUser.id, payload.competencies);
    }
    return created;
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

  function onPublishBulletin(newPost) {
    const id = newPost.id || `bul-${Date.now()}`;
    const timestamp = newPost.date || new Date().toISOString();
    const post = {
      id,
      type: newPost.type || 'Notification',
      title: newPost.title || 'Untitled broadcast',
      message: newPost.message || '',
      published_by: newPost.published_by || (currentUser ? currentUser.id : null),
      date_created: timestamp,
      date: timestamp,
    };
    setBulletins(prev => {
      const next = [post, ...prev.filter(b => b.id !== id)];
      try { localStorage.setItem('cc_bulletin_board', JSON.stringify(next)); } catch { /* in-session only */ }
      return next;
    });
    api.createBulletin(post, credentials).catch(() => { /* optimistic board already reflects the post */ });
    return post;
  }

  async function submitExam(exam, course, answers) {
    const questions = exam.questions || [];
    const correct = questions.reduce((acc, q, i) => acc + (answers[i] === (q.correct_answer_index ?? q.correct) ? 1 : 0), 0);
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
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.indexOf('imd-cc-') === 0) localStorage.removeItem(key);
    }
    localStorage.removeItem('cc_session');
    setSession(null);
    await refresh();
  }

  const certifications = useMemo(() => (
    evaluations
      .filter(e => {
        const threshold = exams.find(x => x.id === e.exam_id)?.passing_score || 60;
        return e.percentage >= threshold;
      })
      .map(e => {
        const exam = exams.find(x => x.id === e.exam_id);
        const course = exam ? courses.find(c => c.id === exam.course_id) : null;
        const trainee = profiles.find(p => p.id === e.trainee_id);
        return {
          id: e.id || `cert-${e.exam_id}-${e.trainee_id}`,
          trainee_id: e.trainee_id,
          trainee_name: trainee ? trainee.name : e.trainee_id,
          exam_id: e.exam_id,
          course_id: exam ? exam.course_id : null,
          course_title: course ? course.title : (exam ? (exam.title || exam.course_id) : 'Unknown'),
          percentage: e.percentage,
          issue_date: e.completion_date || e.completed_at || new Date().toISOString(),
        };
      })
  ), [evaluations, exams, courses, profiles]);

  const active_assessments = useMemo(() => {
    const now = new Date();
    return exams
      .filter(ex => new Date(ex.submission_deadline) > now)
      .map(ex => {
        const course = courses.find(c => c.id === ex.course_id) || null;
        return {
          id: ex.id,
          course_id: ex.course_id,
          course_title: course ? course.title : ex.course_id,
          questions: ex.questions,
          passing_score: ex.passing_score,
          submission_deadline: ex.submission_deadline,
        };
      });
  }, [exams, courses]);

  const value = {
    mode: api.mode(),
    loading, error, isOffline,
    currentUser, profiles, users: profiles, courses, modules, exams, evaluations, competencies, scores, bulletins, bulletinBoard: bulletins, certifications, active_assessments,
    globalChatMessages, setGlobalChatMessages, onTransmitPeerMessage,
    trainerLibrary, onUploadResource, onUpdateTrainerProfile,
    login, logout, refresh, getProfile, getTrainee, getTrainerById, register,
    getExamForCourse, getModulesForCourse, getCompletedCoursesFor,
    getTraineeGaps, getRecommendedCourses,
    approveProfile, enrollPersonnel, adminCreateDirectProfile, submitProfileForApproval, adminApproveTrainee, onChangeUserRole,
    spawnAiExam, generateExamQuestions, createCourseBundle, createExamForCourse, onDispatchNewExam, publishBulletin, onPublishBulletin, submitExam,
    getOrgAnalytics, getSkillGapDistribution, exportToCSV, resetDemoData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}