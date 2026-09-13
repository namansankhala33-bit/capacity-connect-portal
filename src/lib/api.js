import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import {
  user_profiles as seedProfiles,
  courses as seedCourses,
  modules as seedModules,
  exam_questionnaires as seedExams,
  evaluation_logs as seedEvaluations,
  meteorological_competencies as seedCompetencies,
  trainee_competency_scores as seedScores,
  homepage_bulletins as seedBulletins,
  demoAccounts,
} from '../data/imdSeedData';

const DB_VERSION = 'imd-cc-v3';

function demoLoadAll() {
  const raw = localStorage.getItem(DB_VERSION);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through to seed */ }
  }
  const db = {
    user_profiles: seedProfiles,
    courses: seedCourses,
    modules: seedModules,
    exam_questionnaires: seedExams,
    evaluation_logs: seedEvaluations,
    meteorological_competencies: seedCompetencies,
    trainee_competency_scores: seedScores,
    homepage_bulletins: seedBulletins,
  };
  localStorage.setItem(DB_VERSION, JSON.stringify(db));
  return db;
}

function demoPersist(db) {
  localStorage.setItem(DB_VERSION, JSON.stringify(db));
}

function getDemoTable(table) {
  const db = demoLoadAll();
  return db[table] || [];
}

function setDemoTable(table, rows) {
  const db = demoLoadAll();
  db[table] = rows;
  demoPersist(db);
}

function serverTimestamp() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function rpc(name, params) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(error.message);
  return data;
}

const tables = {
  user_profiles: 'user_profiles',
  courses: 'courses',
  modules: 'modules',
  exam_questionnaires: 'exam_questionnaires',
  evaluation_logs: 'evaluation_logs',
  meteorological_competencies: 'meteorological_competencies',
  trainee_competency_scores: 'trainee_competency_scores',
  homepage_bulletins: 'homepage_bulletins',
};

export const api = {
  mode: () => (isSupabaseConfigured ? 'live' : 'demo'),

  async fetchAll(table) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw new Error(error.message);
      return data || [];
    }
    return [...getDemoTable(table)];
  },

  async fetchBy(table, column, value) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from(table).select('*').eq(column, value);
      if (error) throw new Error(error.message);
      return data || [];
    }
    return getDemoTable(table).filter(row => row[column] === value);
  },

  async fetchIn(table, column, values) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from(table).select('*').in(column, values);
      if (error) throw new Error(error.message);
      return data || [];
    }
    return getDemoTable(table).filter(row => values.includes(row[column]));
  },

  async fetchBy2(table, column, value) {
    return this.fetchBy(table, column, value);
  },

  async login(email, password) {
    const normalized = normalizeEmail(email);

    if (isSupabaseConfigured) {
      try {
        const res = await rpc('login_with_credentials', {
          p_email: normalized,
          p_password: password,
        });
        if (!res) return { success: false, message: 'Profile not found in the cloud. Run supabase/seed.sql in the SQL editor to load the IMD demo dataset.' };
        if (res.error === 'bad_password') return { success: false, message: 'Incorrect password.' };
        if (res.error) return { success: false, message: 'Sign-in failed. Verify your credentials.' };
        const { profile_password: _pw, ...clean } = res;
        return {
          success: true,
          user: {
            ...clean,
            accreditation: res.approved_by_admin ? 'commissioned' : res.profile_submitted ? 'submitted' : 'locked',
          },
        };
      } catch (err) {
        return { success: false, message: err.message || 'Supabase login unavailable.' };
      }
    }

    const profile = getDemoTable('user_profiles').find(p => String(p.email || '').toLowerCase() === normalized);
    if (!profile) return { success: false, message: 'No profile matches this email. Register a new trainee account or use a demo account below.' };
    if (String(profile.profile_password || '') !== password) return { success: false, message: 'Incorrect password.' };
    const { profile_password: _pw, ...clean } = profile;
    return {
      success: true,
      user: {
        ...clean,
        accreditation: profile.approved_by_admin ? 'commissioned' : profile.profile_submitted ? 'submitted' : 'locked',
      },
    };
  },

  async registerTrainee({ name, email, designation, station_location, password = 'demo123' }) {
    const normalized = normalizeEmail(email);
    if (!name || !normalized || !designation || !station_location) {
      return { success: false, message: 'All registration fields are required.' };
    }
    if (isSupabaseConfigured) {
      try {
        const row = await rpc('register_trainee', {
          p_email: normalized,
          p_password: password,
          p_name: name.trim(),
          p_designation: designation.trim(),
          p_station_location: station_location.trim(),
        });
        const { profile_password: _pw, ...clean } = row || {};
        return { success: true, user: { ...clean, accreditation: 'locked' } };
      } catch (err) {
        const msg = String(err.message || err.hint || '');
        if (msg.includes('already exists')) return { success: false, message: 'A profile with this email already exists. Sign in instead.' };
        return { success: false, message: 'Cloud registration failed. Re-run supabase/schema.sql in the SQL editor.' };
      }
    }
    const rows = getDemoTable('user_profiles');
    if (rows.some(p => String(p.email || '').toLowerCase() === normalized)) {
      return { success: false, message: 'A profile with this email already exists. Sign in instead.' };
    }
    let badge = `IMD/OPS/RTR-${100 + Math.floor(Math.random() * 900)}`;
    while (rows.some(p => p.employee_id === badge)) {
      badge = `IMD/OPS/RTR-${100 + Math.floor(Math.random() * 900)}`;
    }
    const created = {
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
      approved_by_admin: false,
      profile_submitted: false,
      profile_password: password || 'demo123',
      created_at: new Date().toISOString(),
    };
    setDemoTable('user_profiles', [...rows, created]);
    return { success: true, user: { ...created, accreditation: 'locked' } };
  },

  async submitProfileForApproval(traineeId, payload, creds = {}) {
    if (isSupabaseConfigured) {
      return rpc('trainee_submit_profile', {
        p_trainee_email: creds.email || '',
        p_trainee_password: creds.password || '',
        p_qualifications: payload.qualifications || {},
        p_work_experience: payload.work_experience || {},
        p_interests: payload.interests || [],
      });
    }
    setDemoTable('user_profiles', getDemoTable('user_profiles').map(p =>
      p.id === traineeId
        ? {
            ...p,
            qualifications: payload.qualifications || {},
            work_experience: payload.work_experience || {},
            interests: payload.interests || [],
            profile_submitted: true,
          }
        : p
    ));
    return true;
  },

  async updateTrainerProfile(userId, fields, creds = {}) {
    if (isSupabaseConfigured) {
      return rpc('update_trainer_profile', {
        p_trainer_email: creds.email || '',
        p_trainer_password: creds.password || '',
        p_designation: fields.designation || '',
        p_specialty: fields.specialty || '',
        p_station_location: fields.station_location || '',
      });
    }
    setDemoTable('user_profiles', getDemoTable('user_profiles').map(p =>
      p.id === userId
        ? {
            ...p,
            designation: fields.designation ?? p.designation,
            specialty: fields.specialty ?? p.specialty,
            station_location: fields.station_location ?? p.station_location,
          }
        : p
    ));
    return true;
  },

  async updateUserRole(userId, newRole, creds = {}) {
    const role = String(newRole || '').trim();
    const validRoles = ['Trainee', 'Trainer', 'Admin'];
    if (!validRoles.includes(role)) throw new Error('Role must be one of Trainee, Trainer or Admin.');
    if (isSupabaseConfigured) {
      return rpc('update_user_role', {
        p_admin_email: creds.email || '',
        p_admin_password: creds.password || '',
        p_profile_id: userId,
        p_new_role: role,
      });
    }
    setDemoTable('user_profiles', getDemoTable('user_profiles').map(p =>
      p.id === userId ? { ...p, role } : p
    ));
    return true;
  },

  async approveProfile(profileId, approved, creds = {}) {
    if (isSupabaseConfigured) {
      await rpc('admin_toggle_approval', {
        p_admin_email: creds.email || '',
        p_admin_password: creds.password || '',
        p_profile_id: profileId,
        p_approved: approved,
      });
      return true;
    }
    setDemoTable('user_profiles', getDemoTable('user_profiles').map(p =>
      p.id === profileId ? { ...p, approved_by_admin: approved } : p
    ));
    return true;
  },

  async enrollPersonnel(profile, creds = {}) {
    if (isSupabaseConfigured) {
      return rpc('admin_enroll_personnel', {
        p_admin_email: creds.email || '',
        p_admin_password: creds.password || '',
        p_name: profile.name,
        p_email: profile.email,
        p_designation: profile.designation,
        p_station_location: profile.station_location,
        p_employee_id: profile.employee_id,
        p_default_password: profile.profile_password || 'demo123',
        p_profile_submitted: profile.profile_submitted ?? true,
      });
    }
    setDemoTable('user_profiles', [...getDemoTable('user_profiles'), profile]);
    return profile;
  },

  async createCourse(course, moduleRows = [], creds = {}) {
    if (isSupabaseConfigured) {
      return rpc('save_course_with_modules', {
        p_trainer_email: creds.email || '',
        p_trainer_password: creds.password || '',
        p_course: course,
        p_modules: moduleRows || [],
      });
    }
    const row = { ...course, id: `imd-${Date.now()}`, trainer_id: course.trainer_id || 'prof-kavi01' };
    setDemoTable('courses', [...getDemoTable('courses'), row]);
    const enriched = moduleRows.map(r => ({
      ...r,
      id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      course_id: row.id,
    }));
    setDemoTable('modules', [...getDemoTable('modules'), ...enriched]);
    return row;
  },

  async createModules(rows) {
    const enriched = rows.map(row => ({
      ...row,
      id: row.id || `mod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }));
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('modules').insert(enriched);
      if (error) throw new Error(error.message);
      return enriched;
    }
    setDemoTable('modules', [...getDemoTable('modules'), ...enriched]);
    return enriched;
  },

  async createExam(exam, creds = {}) {
    if (isSupabaseConfigured) {
      return rpc('insert_exam', {
        p_trainer_email: creds.email || '',
        p_trainer_password: creds.password || '',
        p_exam: {
          course_id: exam.course_id,
          questions: exam.questions || [],
          passing_score: exam.passing_score,
          submission_deadline: exam.submission_deadline,
          competencies: exam.competencies || [],
        },
      });
    }
    const row = { ...exam, id: `exam-${Date.now()}`, questions: exam.questions || [] };
    setDemoTable('exam_questionnaires', [...getDemoTable('exam_questionnaires'), row]);
    return row;
  },

  async updateExam(examId, exam) {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('exam_questionnaires')
        .update({
          questions: exam.questions || [],
          passing_score: exam.passing_score,
          submission_deadline: exam.submission_deadline,
        })
        .eq('id', examId);
      if (error) throw new Error(error.message);
      return { ...exam, id: examId };
    }
    const rows = getDemoTable('exam_questionnaires');
    const existing = rows.find(r => r.id === examId);
    if (existing) {
      setDemoTable('exam_questionnaires', rows.map(r => r.id === examId ? { ...r, ...exam, id: examId } : r));
    } else {
      setDemoTable('exam_questionnaires', [...rows, { ...exam, id: examId }]);
    }
    return { ...exam, id: examId };
  },

  async updateTrainerCompetencyProfile(trainerId, competencyIds) {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('user_profiles')
        .update({ interests: competencyIds })
        .eq('id', trainerId);
      if (error) throw new Error(error.message);
      return true;
    }
    setDemoTable('user_profiles', getDemoTable('user_profiles').map(p =>
      p.id === trainerId ? { ...p, interests: competencyIds } : p
    ));
    return true;
  },

  async submitEvaluation(evalRow) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('evaluation_logs').insert(evalRow).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    const row = { ...evalRow, id: `eval-${Date.now()}` };
    setDemoTable('evaluation_logs', [...getDemoTable('evaluation_logs'), row]);
    return row;
  },

  async updateCompetencyScore(traineeId, competencyId, newScore) {
    const now = serverTimestamp();
    if (isSupabaseConfigured) {
      const existing = await this.fetchBy('trainee_competency_scores', 'trainee_id', traineeId);
      const row = existing.find(r => r.competency_id === competencyId);
      if (row) {
        const { error } = await supabase
          .from('trainee_competency_scores')
          .update({ current_score: newScore, last_updated: now })
          .eq('id', row.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('trainee_competency_scores')
          .insert({ trainee_id: traineeId, competency_id: competencyId, current_score: newScore, target_score: 75, last_updated: now });
        if (error) throw new Error(error.message);
      }
      return true;
    }
    setDemoTable('trainee_competency_scores', getDemoTable('trainee_competency_scores').map(row => {
      if (row.trainee_id === traineeId && row.competency_id === competencyId) {
        return { ...row, current_score: newScore, last_updated: now };
      }
      return row;
    }));
    return true;
  },

  async recordAssessment(payload, creds = {}) {
    const { trainee_id, exam_id, course_id, answers, score, percentage, passed, score_updates } = payload;
    if (isSupabaseConfigured) {
      await rpc('record_assessment', {
        p_trainee_email: creds.email || '',
        p_trainee_password: creds.password || '',
        p_exam_id: exam_id,
        p_course_id: course_id,
        p_answers: answers || [],
        p_score: score,
        p_percentage: percentage,
        p_passed: passed,
        p_score_updates: score_updates || [],
      });
      return true;
    }
    const created = await this.submitEvaluation({
      trainee_id,
      exam_id,
      score,
      percentage,
      completion_date: new Date().toISOString(),
      feedback_text: passed ? 'Assessment passed. Competency scores updated.' : 'Assessment review required.',
    });
    for (const u of score_updates || []) {
      await this.updateCompetencyScore(trainee_id, u.competency_id, u.new_score);
    }
    return created;
  },

  async createBulletin(bulletin, creds = {}) {
    if (isSupabaseConfigured) {
      return rpc('publish_bulletin', {
        p_author_email: creds.email || '',
        p_author_password: creds.password || '',
        p_bulletin: {
          type: bulletin.type || 'Notice',
          title: bulletin.title,
          message: bulletin.message || '',
        },
      });
    }
    const row = { ...bulletin, id: `bul-${Date.now()}`, date_created: serverTimestamp() };
    setDemoTable('homepage_bulletins', [row, ...getDemoTable('homepage_bulletins')]);
    return row;
  },

  async fetchCoursesDeep() {
    const all = await this.fetchAll('courses');
    const trainers = await this.fetchAll('user_profiles');
    const trainerMap = {};
    trainers.forEach(t => { trainerMap[t.id] = t; });
    return all.map(c => ({ ...c, trainer: trainerMap[c.trainer_id] || null }));
  },

  async getQuizForCourse(courseId) {
    const all = await this.fetchAll('exam_questionnaires');
    return all.find(e => e.course_id === courseId) || null;
  },
};

export { tables, demoAccounts };