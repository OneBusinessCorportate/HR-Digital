-- ============================================================================
-- OneBusiness HR Digital — Recruitment MVP
-- Migration 0001: core schema (enums, tables, constraints, indexes, triggers)
--
-- All tables are additive and recruitment-specific. Nothing existing is
-- dropped or altered. Designed for the OneBusiness Supabase stack.
-- ============================================================================

-- ─── Enums ──────────────────────────────────────────────────────────────────

-- Recruitment funnel stages (approved brief). Stored as enum, never free text.
do $$ begin
  create type recruitment_stage as enum (
    'first_contact',   -- Первый контакт / Заявка
    'test',            -- Тест
    'screening',       -- Отбор
    'interview',       -- Собеседование
    'experience_eval', -- Оценка опыта
    'offer',           -- Оффер / Решение
    'probation',       -- Испытательный срок
    'hired',           -- Принят
    'rejected'         -- Отклонён
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type candidate_source as enum (
    'application',    -- Заявка
    'target',         -- Таргет
    'recommendation', -- Рекомендация
    'linkedin',       -- LinkedIn
    'telegram',       -- Telegram
    'job_platform',   -- Job platform
    'other'           -- Другое
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_channel as enum ('phone','telegram','whatsapp','email','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_result as enum (
    'contacted',      -- Связались
    'no_answer',      -- Не ответил
    'interested',     -- Заинтересован
    'not_interested', -- Не заинтересован
    'follow_up',      -- Повторный контакт
    'moved_to_test'   -- Перешёл к тесту
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type interview_format as enum ('google_meet','office','phone','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type interview_status as enum ('scheduled','completed','no_show','cancelled','rescheduled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type evaluation_recommendation as enum (
    'strong',      -- Сильный кандидат
    'proceed',     -- Можно продолжить
    'needs_check', -- Нужна дополнительная проверка
    'reject'       -- Не подходит
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type offer_status as enum (
    'not_prepared', -- Не подготовлен
    'sent',         -- Отправлен
    'accepted',     -- Принят
    'declined',     -- Отклонён
    'withdrawn'     -- Отозван
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type offer_decision as enum ('approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type probation_status as enum (
    'not_started', -- Не начат
    'in_progress', -- В процессе
    'passed',      -- Прошёл
    'failed',      -- Не прошёл
    'resigned',    -- Уволился
    'terminated'   -- Прекращён компанией
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type hr_role as enum ('admin','hr','manager');
exception when duplicate_object then null; end $$;

-- ─── Shared helpers ───────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── Profiles (roles) ─────────────────────────────────────────────────────────
-- One row per authenticated staff member. Role drives authorization.
create table if not exists public.hr_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        hr_role not null default 'manager',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_hr_profiles_updated on public.hr_profiles;
create trigger trg_hr_profiles_updated before update on public.hr_profiles
  for each row execute function public.set_updated_at();

-- ─── Recruitment settings (key/value) ────────────────────────────────────────
create table if not exists public.recruitment_settings (
  key         text primary key,
  value       text not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.hr_profiles(id)
);
drop trigger if exists trg_settings_updated on public.recruitment_settings;
create trigger trg_settings_updated before update on public.recruitment_settings
  for each row execute function public.set_updated_at();

-- ─── Candidates ───────────────────────────────────────────────────────────────
create table if not exists public.candidates (
  id                    uuid primary key default gen_random_uuid(),
  full_name             text not null,
  phone                 text,
  phone_normalized      text,
  email                 text,
  email_normalized      text,
  telegram              text,
  telegram_normalized   text,
  position              text,
  source                candidate_source not null default 'application',
  resume_url            text,
  resume_file_path      text,
  first_contact_date    date,
  first_contact_comment text,
  responsible_user_id   uuid references public.hr_profiles(id),
  stage                 recruitment_stage not null default 'first_contact',
  next_action           text,
  next_action_date      date,
  -- Rejection (preserved even after rejection; history is never overwritten)
  rejection_stage       recruitment_stage,
  rejection_reason      text,
  rejection_date        date,
  rejection_comment     text,
  last_activity_at      timestamptz not null default now(),
  created_by            uuid references public.hr_profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint candidates_rejection_ck check (
    stage <> 'rejected'
    or (rejection_reason is not null and rejection_stage is not null)
  )
);
drop trigger if exists trg_candidates_updated on public.candidates;
create trigger trg_candidates_updated before update on public.candidates
  for each row execute function public.set_updated_at();

-- Keep normalized dedup columns in sync automatically.
create or replace function public.normalize_candidate()
returns trigger language plpgsql as $$
begin
  new.phone_normalized := nullif(regexp_replace(coalesce(new.phone,''), '[^0-9]', '', 'g'), '');
  new.email_normalized := nullif(lower(trim(coalesce(new.email,''))), '');
  new.telegram_normalized := nullif(lower(regexp_replace(trim(coalesce(new.telegram,'')), '^@+', '')), '');
  return new;
end $$;
drop trigger if exists trg_candidates_normalize on public.candidates;
create trigger trg_candidates_normalize before insert or update on public.candidates
  for each row execute function public.normalize_candidate();

create index if not exists idx_candidates_stage on public.candidates(stage);
create index if not exists idx_candidates_source on public.candidates(source);
create index if not exists idx_candidates_responsible on public.candidates(responsible_user_id);
create index if not exists idx_candidates_phone_norm on public.candidates(phone_normalized);
create index if not exists idx_candidates_email_norm on public.candidates(email_normalized);
create index if not exists idx_candidates_telegram_norm on public.candidates(telegram_normalized);
create index if not exists idx_candidates_first_contact on public.candidates(first_contact_date);

-- ─── Stage history ────────────────────────────────────────────────────────────
create table if not exists public.candidate_stage_history (
  id                 uuid primary key default gen_random_uuid(),
  candidate_id       uuid not null references public.candidates(id) on delete cascade,
  from_stage         recruitment_stage,
  to_stage           recruitment_stage not null,
  note               text,
  is_manual_override boolean not null default false,
  changed_by         uuid references public.hr_profiles(id),
  created_at         timestamptz not null default now()
);
create index if not exists idx_stage_history_candidate on public.candidate_stage_history(candidate_id, created_at);

-- ─── First-contact log ────────────────────────────────────────────────────────
create table if not exists public.candidate_contacts (
  id                 uuid primary key default gen_random_uuid(),
  candidate_id       uuid not null references public.candidates(id) on delete cascade,
  contact_at         timestamptz not null default now(),
  channel            contact_channel not null default 'phone',
  note               text,
  result             contact_result,
  next_action        text,
  next_action_date   date,
  replied            boolean,
  agreed_to_continue boolean,
  created_by         uuid references public.hr_profiles(id),
  created_at         timestamptz not null default now()
);
create index if not exists idx_contacts_candidate on public.candidate_contacts(candidate_id, contact_at);

-- ─── Tests ────────────────────────────────────────────────────────────────────
create table if not exists public.candidate_tests (
  id                 uuid primary key default gen_random_uuid(),
  candidate_id       uuid not null references public.candidates(id) on delete cascade,
  test_link          text,
  sent_date          date,
  completed_date     date,
  score              numeric,
  max_score          numeric,
  score_percent      numeric,
  passed             boolean,
  threshold_used     numeric,
  is_manual_override boolean not null default false,
  comment            text,
  created_by         uuid references public.hr_profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint tests_score_ck   check (score is null or score >= 0),
  constraint tests_max_ck     check (max_score is null or max_score > 0),
  constraint tests_percent_ck check (score_percent is null or (score_percent >= 0 and score_percent <= 100))
);
drop trigger if exists trg_tests_updated on public.candidate_tests;
create trigger trg_tests_updated before update on public.candidate_tests
  for each row execute function public.set_updated_at();
create index if not exists idx_tests_candidate on public.candidate_tests(candidate_id);

-- ─── Interviews ───────────────────────────────────────────────────────────────
create table if not exists public.interviews (
  id               uuid primary key default gen_random_uuid(),
  candidate_id     uuid not null references public.candidates(id) on delete cascade,
  scheduled_start  timestamptz not null,
  duration_minutes integer not null default 45,
  timezone         text not null default 'Asia/Yerevan',
  format           interview_format not null default 'google_meet',
  meet_link        text,
  status           interview_status not null default 'scheduled',
  reminder_sent    boolean not null default false,
  notes_before     text,
  -- Completion
  actual_start     timestamptz,
  recording_url    text,
  transcript_url   text,
  transcript_text  text,
  summary          text,
  strengths        text,
  concerns         text,
  expected_salary  text,
  availability     text,
  language_level   text,
  recommendation   text,
  notes_after      text,
  created_by       uuid references public.hr_profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint interviews_duration_ck check (duration_minutes > 0)
);
drop trigger if exists trg_interviews_updated on public.interviews;
create trigger trg_interviews_updated before update on public.interviews
  for each row execute function public.set_updated_at();
create index if not exists idx_interviews_candidate on public.interviews(candidate_id);
create index if not exists idx_interviews_start on public.interviews(scheduled_start);
create index if not exists idx_interviews_status on public.interviews(status);

-- ─── Interview participants (interviewers) ────────────────────────────────────
create table if not exists public.interview_participants (
  id           uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  user_id      uuid references public.hr_profiles(id),
  name         text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_participants_interview on public.interview_participants(interview_id);

-- ─── Evaluations ──────────────────────────────────────────────────────────────
-- Scale is configurable (default 1..5). scale_max stored per row for integrity.
create table if not exists public.candidate_evaluations (
  id                 uuid primary key default gen_random_uuid(),
  candidate_id       uuid not null references public.candidates(id) on delete cascade,
  interview_id       uuid references public.interviews(id) on delete set null,
  scale_max          integer not null default 5,
  professional_score numeric not null,
  communication_score numeric not null,
  motivation_score   numeric not null,
  skills_score       numeric not null,
  culture_fit_score  numeric not null,
  overall_score      numeric not null,
  recommendation     evaluation_recommendation not null,
  comment            text,
  evaluated_by       uuid references public.hr_profiles(id),
  created_at         timestamptz not null default now(),
  constraint eval_scale_ck check (scale_max between 2 and 100),
  constraint eval_scores_ck check (
    professional_score  between 1 and scale_max and
    communication_score between 1 and scale_max and
    motivation_score    between 1 and scale_max and
    skills_score        between 1 and scale_max and
    culture_fit_score   between 1 and scale_max and
    overall_score       between 1 and scale_max
  )
);
create index if not exists idx_evaluations_candidate on public.candidate_evaluations(candidate_id);

-- ─── Offers ───────────────────────────────────────────────────────────────────
create table if not exists public.offers (
  id                 uuid primary key default gen_random_uuid(),
  candidate_id       uuid not null references public.candidates(id) on delete cascade,
  decision_date      date,
  decision_by        uuid references public.hr_profiles(id),
  decision           offer_decision,
  position           text,
  salary             text,
  expected_start_date date,
  status             offer_status not null default 'not_prepared',
  comment            text,
  created_by         uuid references public.hr_profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
drop trigger if exists trg_offers_updated on public.offers;
create trigger trg_offers_updated before update on public.offers
  for each row execute function public.set_updated_at();
create index if not exists idx_offers_candidate on public.offers(candidate_id);

-- ─── Probation ────────────────────────────────────────────────────────────────
create table if not exists public.probation_periods (
  id                uuid primary key default gen_random_uuid(),
  candidate_id      uuid not null references public.candidates(id) on delete cascade,
  start_date        date not null,
  planned_end_date  date,
  actual_end_date   date,
  manager_id        uuid references public.hr_profiles(id),
  status            probation_status not null default 'in_progress',
  -- first-month retention flag: null=unknown, true=retained, false=left
  first_month_retained boolean,
  comment           text,
  final_decision    text,
  created_by        uuid references public.hr_profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint probation_planned_ck check (planned_end_date is null or planned_end_date >= start_date),
  constraint probation_actual_ck  check (actual_end_date is null or actual_end_date >= start_date)
);
drop trigger if exists trg_probation_updated on public.probation_periods;
create trigger trg_probation_updated before update on public.probation_periods
  for each row execute function public.set_updated_at();
create index if not exists idx_probation_candidate on public.probation_periods(candidate_id);

-- ─── Notes ────────────────────────────────────────────────────────────────────
create table if not exists public.candidate_notes (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  body         text not null,
  created_by   uuid references public.hr_profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists idx_notes_candidate on public.candidate_notes(candidate_id, created_at);

-- ─── Files ────────────────────────────────────────────────────────────────────
create table if not exists public.candidate_files (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  file_name    text not null,
  file_path    text not null,
  file_type    text,
  file_size    integer,
  uploaded_by  uuid references public.hr_profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists idx_files_candidate on public.candidate_files(candidate_id);

-- ─── Activity log (audit + timeline) ──────────────────────────────────────────
create table if not exists public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates(id) on delete cascade,
  actor_id     uuid references public.hr_profiles(id),
  action       text not null,          -- e.g. 'candidate.created', 'stage.changed'
  entity       text,                   -- table name
  entity_id    uuid,
  summary      text,                   -- human-readable, Russian
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_activity_candidate on public.activity_log(candidate_id, created_at);
create index if not exists idx_activity_actor on public.activity_log(actor_id, created_at);
create index if not exists idx_activity_action on public.activity_log(action, created_at);

-- Bump candidate.last_activity_at whenever activity is logged.
create or replace function public.touch_candidate_activity()
returns trigger language plpgsql as $$
begin
  if new.candidate_id is not null then
    update public.candidates set last_activity_at = new.created_at where id = new.candidate_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_activity_touch on public.activity_log;
create trigger trg_activity_touch after insert on public.activity_log
  for each row execute function public.touch_candidate_activity();

-- Auto-provision a profile (read-only manager by default) for new auth users.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.hr_profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'manager')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();
