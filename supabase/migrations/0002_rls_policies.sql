-- ============================================================================
-- Migration 0002: Row Level Security
--
-- Model:
--   * Only authenticated staff with an active profile may read candidate data.
--   * Roles 'admin' and 'hr' may write (Inga = hr). 'manager' is read-only.
--   * Authorization is enforced in the database, independent of the client.
-- ============================================================================

-- Returns the caller's role, or null if no active profile. SECURITY DEFINER so
-- it can read hr_profiles without triggering recursive RLS on that table.
create or replace function public.hr_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.hr_profiles where id = auth.uid() and is_active
$$;

create or replace function public.hr_can_edit()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.hr_role() in ('admin','hr'), false)
$$;

create or replace function public.hr_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.hr_role() is not null
$$;

-- Enable RLS everywhere.
alter table public.hr_profiles            enable row level security;
alter table public.recruitment_settings   enable row level security;
alter table public.candidates             enable row level security;
alter table public.candidate_stage_history enable row level security;
alter table public.candidate_contacts     enable row level security;
alter table public.candidate_tests        enable row level security;
alter table public.interviews             enable row level security;
alter table public.interview_participants enable row level security;
alter table public.candidate_evaluations  enable row level security;
alter table public.offers                 enable row level security;
alter table public.probation_periods      enable row level security;
alter table public.candidate_notes        enable row level security;
alter table public.candidate_files        enable row level security;
alter table public.activity_log           enable row level security;

-- ─── Profiles ─────────────────────────────────────────────────────────────────
drop policy if exists profiles_select on public.hr_profiles;
create policy profiles_select on public.hr_profiles
  for select to authenticated
  using (id = auth.uid() or public.hr_is_staff());

drop policy if exists profiles_admin_write on public.hr_profiles;
create policy profiles_admin_write on public.hr_profiles
  for all to authenticated
  using (public.hr_role() = 'admin')
  with check (public.hr_role() = 'admin');

-- ─── Settings ─────────────────────────────────────────────────────────────────
drop policy if exists settings_select on public.recruitment_settings;
create policy settings_select on public.recruitment_settings
  for select to authenticated using (public.hr_is_staff());

drop policy if exists settings_admin_write on public.recruitment_settings;
create policy settings_admin_write on public.recruitment_settings
  for all to authenticated
  using (public.hr_role() = 'admin')
  with check (public.hr_role() = 'admin');

-- ─── Generic policy generator for candidate-data tables ───────────────────────
-- staff read; hr/admin write.
do $$
declare t text;
  tbls text[] := array[
    'candidates','candidate_stage_history','candidate_contacts','candidate_tests',
    'interviews','interview_participants','candidate_evaluations','offers',
    'probation_periods','candidate_notes','candidate_files','activity_log'
  ];
begin
  foreach t in array tbls loop
    execute format('drop policy if exists %I on public.%I', t || '_staff_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.hr_is_staff())',
      t || '_staff_select', t);

    execute format('drop policy if exists %I on public.%I', t || '_editor_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.hr_can_edit())',
      t || '_editor_insert', t);

    execute format('drop policy if exists %I on public.%I', t || '_editor_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.hr_can_edit()) with check (public.hr_can_edit())',
      t || '_editor_update', t);

    execute format('drop policy if exists %I on public.%I', t || '_editor_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.hr_can_edit())',
      t || '_editor_delete', t);
  end loop;
end $$;
