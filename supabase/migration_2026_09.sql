-- CAPACITY CONNECT — IMD / Ministry of Earth Sciences
-- UPGRADE MIGRATION (delta style) — 2026-09
-- For an EXISTING Supabase project: run THIS file first, then seed.sql.
-- No `create table` here, so the Supabase SQL editor will not inject the
-- automatic "enable row level security" footer that broke full schema.sql.
-- Idempotent: safe to run more than once.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ===================== COLUMN ALIGNS (idempotent) =====================
alter table public.user_profiles add column if not exists profile_password text not null default 'demo123';
alter table public.user_profiles add column if not exists profile_submitted boolean not null default false;
alter table public.user_profiles add column if not exists specialty text default '';

-- ===================== ROW LEVEL SECURITY (already may be on) =========
alter table public.user_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.exam_questionnaires enable row level security;
alter table public.evaluation_logs enable row level security;
alter table public.meteorological_competencies enable row level security;
alter table public.trainee_competency_scores enable row level security;
alter table public.homepage_bulletins enable row level security;

-- ===================== IDEMPOTENT UNIQUE INDEXES (seed-safe) ========
-- These indexes let seed.sql use "on conflict ... do nothing/update" so the
-- whole database stack is safe to re-run without breaking on duplicates.
create unique index if not exists ux_courses_title on public.courses(title);
create unique index if not exists ux_modules_course_title on public.modules(course_id, title);
create unique index if not exists ux_exams_one_per_course on public.exam_questionnaires(course_id);
create unique index if not exists ux_bulletins_title_message on public.homepage_bulletins(title, message);
create unique index if not exists ux_evals_seed on public.evaluation_logs(trainee_id, exam_id, completion_date);

-- ===================== AUTH HELPERS ==============================
create or replace function public.get_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role from public.user_profiles where id = auth.uid()),
    'anonymous'
  );
$$;

create or replace function public.get_user_profile_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid();
$$;

-- ===================== STRICT WRITE POLICIES =====================
drop policy if exists "profiles_select_self_or_admin" on public.user_profiles;
create policy "profiles_select_self_or_admin" on public.user_profiles
  for select using (
    id = auth.uid()
    or get_user_role() = 'Admin'
  );

drop policy if exists "profiles_update_self_or_admin" on public.user_profiles;
create policy "profiles_update_self_or_admin" on public.user_profiles
  for update using (
    id = auth.uid()
    or get_user_role() = 'Admin'
  );

drop policy if exists "profiles_insert_admin" on public.user_profiles;
create policy "profiles_insert_admin" on public.user_profiles
  for insert with check (get_user_role() = 'Admin');

drop policy if exists "courses_select_authenticated" on public.courses;
create policy "courses_select_authenticated" on public.courses
  for select using (get_user_role() in ('Trainee', 'Trainer', 'Admin'));

drop policy if exists "courses_insert_trainer_or_admin" on public.courses;
create policy "courses_insert_trainer_or_admin" on public.courses
  for insert with check (get_user_role() in ('Trainer', 'Admin'));

drop policy if exists "courses_update_trainer_or_admin" on public.courses;
create policy "courses_update_trainer_or_admin" on public.courses
  for update using (trainer_id = auth.uid() or get_user_role() = 'Admin');

drop policy if exists "modules_select_authenticated" on public.modules;
create policy "modules_select_authenticated" on public.modules
  for select using (get_user_role() in ('Trainee', 'Trainer', 'Admin'));

drop policy if exists "modules_insert_trainer_or_admin" on public.modules;
create policy "modules_insert_trainer_or_admin" on public.modules
  for insert with check (get_user_role() in ('Trainer', 'Admin'));

drop policy if exists "exams_select_authenticated" on public.exam_questionnaires;
create policy "exams_select_authenticated" on public.exam_questionnaires
  for select using (get_user_role() in ('Trainee', 'Trainer', 'Admin'));

drop policy if exists "exams_insert_trainer_or_admin" on public.exam_questionnaires;
create policy "exams_insert_trainer_or_admin" on public.exam_questionnaires
  for insert with check (get_user_role() in ('Trainer', 'Admin'));

drop policy if exists "evals_select_own_or_staff" on public.evaluation_logs;
create policy "evals_select_own_or_staff" on public.evaluation_logs
  for select using (
    trainee_id = auth.uid()
    or get_user_role() in ('Trainer', 'Admin')
  );

drop policy if exists "evals_insert_self" on public.evaluation_logs;
create policy "evals_insert_self" on public.evaluation_logs
  for insert with check (trainee_id = auth.uid());

drop policy if exists "competencies_select_authenticated" on public.meteorological_competencies;
create policy "competencies_select_authenticated" on public.meteorological_competencies
  for select using (get_user_role() in ('Trainee', 'Trainer', 'Admin'));

drop policy if exists "competencies_insert_admin" on public.meteorological_competencies;
create policy "competencies_insert_admin" on public.meteorological_competencies
  for insert with check (get_user_role() = 'Admin');

drop policy if exists "competencies_update_admin" on public.meteorological_competencies;
create policy "competencies_update_admin" on public.meteorological_competencies
  for update using (get_user_role() = 'Admin');

drop policy if exists "scores_select_own_or_staff" on public.trainee_competency_scores;
create policy "scores_select_own_or_staff" on public.trainee_competency_scores
  for select using (
    trainee_id = auth.uid()
    or get_user_role() in ('Trainer', 'Admin')
  );

drop policy if exists "scores_update_trainer_or_admin" on public.trainee_competency_scores;
create policy "scores_update_trainer_or_admin" on public.trainee_competency_scores
  for update using (get_user_role() in ('Trainer', 'Admin'));

drop policy if exists "scores_insert_trainer_or_admin" on public.trainee_competency_scores;
create policy "scores_insert_trainer_or_admin" on public.trainee_competency_scores
  for insert with check (get_user_role() in ('Trainer', 'Admin'));

drop policy if exists "bulletins_select_authenticated" on public.homepage_bulletins;
create policy "bulletins_select_authenticated" on public.homepage_bulletins
  for select using (get_user_role() in ('Trainee', 'Trainer', 'Admin'));

drop policy if exists "bulletins_insert_trainer_or_admin" on public.homepage_bulletins;
create policy "bulletins_insert_trainer_or_admin" on public.homepage_bulletins
  for insert with check (get_user_role() in ('Trainer', 'Admin'));

-- ===================== RELAXED APP READS (anon key can hydrate) ====
drop policy if exists "profiles_read_all_app" on public.user_profiles;
create policy "profiles_read_all_app" on public.user_profiles for select using (true);

drop policy if exists "courses_read_all_app" on public.courses;
create policy "courses_read_all_app" on public.courses for select using (true);

drop policy if exists "modules_read_all_app" on public.modules;
create policy "modules_read_all_app" on public.modules for select using (true);

drop policy if exists "exams_read_all_app" on public.exam_questionnaires;
create policy "exams_read_all_app" on public.exam_questionnaires for select using (true);

drop policy if exists "evals_read_all_app" on public.evaluation_logs;
create policy "evals_read_all_app" on public.evaluation_logs for select using (true);

drop policy if exists "competencies_read_all_app" on public.meteorological_competencies;
create policy "competencies_read_all_app" on public.meteorological_competencies for select using (true);

drop policy if exists "scores_read_all_app" on public.trainee_competency_scores;
create policy "scores_read_all_app" on public.trainee_competency_scores for select using (true);

drop policy if exists "bulletins_read_all_app" on public.homepage_bulletins;
create policy "bulletins_read_all_app" on public.homepage_bulletins for select using (true);

-- ===================== WMO COMPETENCIES SEED ======================
insert into public.meteorological_competencies (id, competency_name, department_target) values
  (gen_random_uuid(), 'Numerical Weather Prediction (NWP)', 75),
  (gen_random_uuid(), 'Satellite Remote Sensing & Data Interpretation', 80),
  (gen_random_uuid(), 'Radar Meteorology & Doppler Data Interpretation', 75),
  (gen_random_uuid(), 'Cyclone Tracking & Warning Systems', 80),
  (gen_random_uuid(), 'Agro-Meteorology & Crop Weather Advisory', 70),
  (gen_random_uuid(), 'Hydrology & Rain Gauge Calibration', 70),
  (gen_random_uuid(), 'Climate Modeling & Monsoon Dynamics', 75),
  (gen_random_uuid(), 'Thunderstorm & Severe Weather Nowcasting', 80),
  (gen_random_uuid(), 'Aviation Meteorology & SIGMET Issuance', 70),
  (gen_random_uuid(), 'Air Quality & Atmospheric Chemistry', 65)
on conflict (competency_name) do nothing;

-- ===================== 1. LOGIN ===================================
create or replace function public.login_with_credentials(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_profile public.user_profiles;
begin
  select * into v_profile
  from public.user_profiles
  where email = lower(trim(p_email))
  limit 1;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  if v_profile.profile_password is distinct from p_password then
    return jsonb_build_object('error', 'bad_password');
  end if;

  return to_jsonb(v_profile);
end;
$$;

-- ===================== 1b. TRAINEE PROFILE SUBMISSION =============
create or replace function public.trainee_submit_profile(
  p_trainee_email text,
  p_trainee_password text,
  p_qualifications jsonb,
  p_work_experience jsonb,
  p_interests text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_trainee public.user_profiles;
begin
  select * into v_trainee
  from public.user_profiles
  where email = lower(trim(p_trainee_email))
    and profile_password = p_trainee_password
  limit 1;

  if not found then
    raise exception 'Unauthorized: valid Trainee credentials required' using errcode = '42501';
  end if;

  update public.user_profiles
  set qualifications = coalesce(p_qualifications, qualifications),
      work_experience = coalesce(p_work_experience, work_experience),
      interests = coalesce(p_interests, interests),
      profile_submitted = true
  where id = v_trainee.id
  returning * into v_trainee;

  return to_jsonb(v_trainee);
end;
$$;

-- ===================== 2. ADMIN APPROVAL TOGGLE ===================
create or replace function public.admin_toggle_approval(
  p_admin_email text,
  p_admin_password text,
  p_profile_id uuid,
  p_approved boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_admin public.user_profiles;
  v_row public.user_profiles;
begin
  select * into v_admin
  from public.user_profiles
  where role = 'Admin'
    and email = lower(trim(p_admin_email))
    and profile_password = p_admin_password
  limit 1;

  if not found then
    raise exception 'Unauthorized: valid Admin credentials required' using errcode = '42501';
  end if;

  update public.user_profiles
  set approved_by_admin = p_approved
  where id = p_profile_id
  returning * into v_row;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  return to_jsonb(v_row);
end;
$$;

-- ===================== 2b. TRAINER PROFILE MAINTENANCE ============
create or replace function public.update_trainer_profile(
  p_trainer_email text,
  p_trainer_password text,
  p_designation text,
  p_specialty text,
  p_station_location text
)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_trainer public.user_profiles;
begin
  select * into v_trainer
  from public.user_profiles
  where role = 'Trainer'
    and email = lower(trim(p_trainer_email))
    and profile_password = p_trainer_password
  limit 1;

  if not found then
    raise exception 'Unauthorized: valid Trainer credentials required' using errcode = '42501';
  end if;

  update public.user_profiles
  set designation = coalesce(nullif(trim(p_designation), ''), designation),
      specialty = coalesce(nullif(trim(p_specialty), ''), specialty),
      station_location = coalesce(nullif(trim(p_station_location), ''), station_location)
  where id = v_trainer.id
  returning * into v_trainer;

  return to_jsonb(v_trainer);
end;
$$;

-- ===================== 2c. TRAINEE SELF-REGISTRATION ==============
create or replace function public.register_trainee(
  p_email text,
  p_password text,
  p_name text,
  p_designation text,
  p_station_location text
)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_row public.user_profiles;
  v_code text;
begin
  if exists (
    select 1 from public.user_profiles where email = lower(trim(p_email))
  ) then
    raise exception 'A profile with this email already exists' using errcode = '23505';
  end if;

  v_code := 'IMD/OPS/RTR-' || lpad((100 + floor(random() * 900))::int::text, 3, '0');
  while exists (select 1 from public.user_profiles where employee_id = v_code) loop
    v_code := 'IMD/OPS/RTR-' || lpad((100 + floor(random() * 900))::int::text, 3, '0');
  end loop;

  insert into public.user_profiles (
    employee_id, name, email, role, designation, station_location,
    qualifications, work_experience, interests, approved_by_admin, profile_submitted, profile_password
  )
  values (
    v_code, p_name, lower(trim(p_email)), 'Trainee', p_designation, p_station_location,
    '{}'::jsonb, '{}'::jsonb, '{}'::text[], false, false, coalesce(p_password, 'demo123')
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- ===================== 2d. ADMIN DIRECT ENROLLMENT ================
create or replace function public.admin_enroll_personnel(
  p_admin_email text,
  p_admin_password text,
  p_employee_id text,
  p_name text,
  p_email text,
  p_designation text,
  p_station_location text,
  p_default_password text default 'demo123',
  p_profile_submitted boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_admin public.user_profiles;
  v_row public.user_profiles;
begin
  select * into v_admin
  from public.user_profiles
  where role = 'Admin'
    and email = lower(trim(p_admin_email))
    and profile_password = p_admin_password
  limit 1;

  if not found then
    raise exception 'Unauthorized: valid Admin credentials required' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.user_profiles
    where email = lower(trim(p_email)) or employee_id = p_employee_id
  ) then
    raise exception 'A profile with this email or employee ID already exists' using errcode = '23505';
  end if;

  insert into public.user_profiles (
    employee_id, name, email, role, designation, station_location, interests,
    approved_by_admin, profile_submitted, profile_password
  )
  values (
    p_employee_id, p_name, lower(trim(p_email)), 'Trainee', p_designation, p_station_location,
    '{}'::text[], true, p_profile_submitted, p_default_password
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- ===================== 2e. ADMIN ROLE MANAGEMENT ==============
create or replace function public.update_user_role(
  p_admin_email text,
  p_admin_password text,
  p_profile_id uuid,
  p_new_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_admin public.user_profiles;
  v_row public.user_profiles;
begin
  if p_new_role not in ('Trainee', 'Trainer', 'Admin') then
    raise exception 'Invalid role assignment, must be Trainee, Trainer or Admin' using errcode = '22023';
  end if;

  select * into v_admin
  from public.user_profiles
  where role = 'Admin'
    and email = lower(trim(p_admin_email))
    and profile_password = p_admin_password
  limit 1;

  if not found then
    raise exception 'Unauthorized: valid Admin credentials required' using errcode = '42501';
  end if;

  update public.user_profiles
  set role = p_new_role
  where id = p_profile_id
  returning * into v_row;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  return to_jsonb(v_row);
end;
$$;

-- ===================== 3. TRAINER COURSE + MODULE BUNDLE ==========
create or replace function public.save_course_with_modules(
  p_trainer_email text,
  p_trainer_password text,
  p_course jsonb,
  p_modules jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_trainer public.user_profiles;
  v_course public.courses;
  v_mod jsonb;
  v_seen text[];
begin
  select * into v_trainer
  from public.user_profiles
  where role = 'Trainer'
    and email = lower(trim(p_trainer_email))
    and profile_password = p_trainer_password
  limit 1;

  if not found then
    raise exception 'Unauthorized: valid Trainer credentials required' using errcode = '42501';
  end if;

  insert into public.courses (
    title, description, category, duration, trainer_id, developed_competencies, materials_library
  )
  values (
    p_course->>'title',
    coalesce(p_course->>'description', ''),
    coalesce(p_course->>'category', 'Forecasting Science'),
    coalesce(p_course->>'duration', '12 hours'),
    v_trainer.id,
    coalesce(array(select jsonb_array_elements_text(p_course->'developed_competencies')), '{}'),
    coalesce(p_course->'materials_library', '{}'::jsonb)
  )
  returning * into v_course;

  if p_modules is not null and jsonb_typeof(p_modules) = 'array' then
    for v_mod in select value from jsonb_array_elements(p_modules)
    loop
      insert into public.modules (course_id, title, content_text, video_placeholder_url)
      values (
        v_course.id,
        coalesce(v_mod->>'title', ''),
        coalesce(v_mod->>'content_text', ''),
        coalesce(v_mod->>'video_placeholder_url', '')
      );
    end loop;
  end if;

  select coalesce(array_agg(distinct t.elem), '{}')
  into v_seen
  from jsonb_array_elements_text(p_course->'developed_competencies') as t(elem);

  update public.user_profiles
  set interests = array(
    select distinct x
    from unnest(coalesce(v_trainer.interests, '{}'::text[]) || coalesce(v_seen, '{}'::text[])) as u(x)
    where x is not null
  )
  where id = v_trainer.id;

  return to_jsonb(v_course);
end;
$$;

-- ===================== 4. TRAINER EXAM PUBLISH ====================
create or replace function public.insert_exam(
  p_trainer_email text,
  p_trainer_password text,
  p_exam jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_trainer public.user_profiles;
  v_exam public.exam_questionnaires;
  v_seen text[];
begin
  select * into v_trainer
  from public.user_profiles
  where role = 'Trainer'
    and email = lower(trim(p_trainer_email))
    and profile_password = p_trainer_password
  limit 1;

  if not found then
    raise exception 'Unauthorized: valid Trainer credentials required' using errcode = '42501';
  end if;

  insert into public.exam_questionnaires (
    course_id, questions, passing_score, submission_deadline
  )
  values (
    (p_exam->>'course_id')::uuid,
    coalesce(p_exam->'questions', '[]'::jsonb),
    coalesce((p_exam->>'passing_score')::int, 60),
    (nullif(p_exam->>'submission_deadline', ''))::timestamptz
  )
  returning * into v_exam;

  select coalesce(array_agg(distinct t.elem), '{}')
  into v_seen
  from jsonb_array_elements_text(p_exam->'competencies') as t(elem);

  update public.user_profiles
  set interests = array(
    select distinct x
    from unnest(coalesce(v_trainer.interests, '{}'::text[]) || coalesce(v_seen, '{}'::text[])) as u(x)
    where x is not null
  )
  where id = v_trainer.id;

  return to_jsonb(v_exam);
end;
$$;

-- ===================== 5. TRAINEE ASSESSMENT + UPSERT =============
create or replace function public.record_assessment(
  p_trainee_email text,
  p_trainee_password text,
  p_exam_id uuid,
  p_course_id uuid,
  p_answers jsonb,
  p_score int,
  p_percentage numeric,
  p_passed boolean,
  p_score_updates jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_trainee public.user_profiles;
  v_eval public.evaluation_logs;
  v_item jsonb;
  v_comp_id uuid;
  v_score int;
begin
  select * into v_trainee
  from public.user_profiles
  where role = 'Trainee'
    and email = lower(trim(p_trainee_email))
    and profile_password = p_trainee_password
  limit 1;

  if not found then
    raise exception 'Unauthorized: valid Trainee credentials required' using errcode = '42501';
  end if;

  insert into public.evaluation_logs (
    trainee_id, exam_id, score, percentage, completion_date, feedback_text
  )
  values (
    v_trainee.id, p_exam_id, p_score, p_percentage, now(),
    case when p_passed then 'Assessment passed. Competency scores updated.'
         else 'Assessment review required.' end
  )
  returning * into v_eval;

  if p_score_updates is not null and jsonb_typeof(p_score_updates) = 'array' then
    for v_item in select value from jsonb_array_elements(p_score_updates)
    loop
      v_comp_id := (v_item->>'competency_id')::uuid;
      v_score := (v_item->>'new_score')::int;

      insert into public.trainee_competency_scores (
        trainee_id, competency_id, current_score, target_score, last_updated
      )
      values (v_trainee.id, v_comp_id, v_score, 75, now())
      on conflict (trainee_id, competency_id)
      do update set
        current_score = excluded.current_score,
        target_score = case when public.trainee_competency_scores.target_score is null then 75 else public.trainee_competency_scores.target_score end,
        last_updated = excluded.last_updated;
    end loop;
  end if;

  return jsonb_build_object(
    'evaluation_id', v_eval.id,
    'percentage', p_percentage,
    'passed', p_passed
  );
end;
$$;

-- ===================== 6. BULLETIN PUBLISH ========================
create or replace function public.publish_bulletin(
  p_author_email text,
  p_author_password text,
  p_bulletin jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_author public.user_profiles;
  v_bul public.homepage_bulletins;
begin
  select * into v_author
  from public.user_profiles
  where role in ('Admin', 'Trainer')
    and email = lower(trim(p_author_email))
    and profile_password = p_author_password
  limit 1;

  if not found then
    raise exception 'Unauthorized: valid Admin/Trainer credentials required' using errcode = '42501';
  end if;

  insert into public.homepage_bulletins (type, title, message, published_by, date_created)
  values (
    coalesce(p_bulletin->>'type', 'Notification'),
    p_bulletin->>'title',
    coalesce(p_bulletin->>'message', ''),
    v_author.id,
    now()
  )
  returning * into v_bul;

  return to_jsonb(v_bul);
end;
$$;