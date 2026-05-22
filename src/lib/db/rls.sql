-- =============================================================================
-- ExamForge -- Row-Level Security policies
--
-- Idempotent: every block uses CREATE OR REPLACE / DROP IF EXISTS so it can
-- be reapplied any time. Run after the Drizzle migration creates the tables.
--
-- Apply with: `npm run db:seed` (the seed script runs this file first)
-- or paste into Supabase Studio -> SQL Editor.
--
-- Policy model
-- -----------------------------------------------------------------------------
-- Reference tables (exams, subjects, topics, mock_tests, mock_questions,
--   pyqs, current_affairs):  PUBLIC READ, service-role write.
-- User-owned tables (everything else):  user_id = auth.uid() for SELECT/INSERT
--   /UPDATE/DELETE.
-- subscriptions:  user can SELECT their own row only; webhook writes via
--   service role (which bypasses RLS).
-- =============================================================================

-- --- Enable RLS on every table ----------------------------------------------
alter table public.exams                enable row level security;
alter table public.subjects             enable row level security;
alter table public.topics               enable row level security;
alter table public.profiles             enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.usage_events         enable row level security;
alter table public.study_plans          enable row level security;
alter table public.study_plan_tasks     enable row level security;
alter table public.mock_tests           enable row level security;
alter table public.mock_questions       enable row level security;
alter table public.mock_attempts        enable row level security;
alter table public.mock_answers         enable row level security;
alter table public.evaluations          enable row level security;
alter table public.doubt_threads        enable row level security;
alter table public.doubt_messages       enable row level security;
alter table public.pyqs                 enable row level security;
alter table public.current_affairs      enable row level security;


-- --- Public read on reference tables ---------------------------------------
-- Anyone (anon or authenticated) can read the catalog. The service role
-- bypasses RLS for writes from seed scripts.

drop policy if exists "exams_select_public"            on public.exams;
create policy "exams_select_public" on public.exams
  for select using (true);

drop policy if exists "subjects_select_public"         on public.subjects;
create policy "subjects_select_public" on public.subjects
  for select using (true);

drop policy if exists "topics_select_public"           on public.topics;
create policy "topics_select_public" on public.topics
  for select using (true);

drop policy if exists "mock_tests_select_public"       on public.mock_tests;
create policy "mock_tests_select_public" on public.mock_tests
  for select using (true);

drop policy if exists "mock_questions_select_public"   on public.mock_questions;
create policy "mock_questions_select_public" on public.mock_questions
  for select using (true);

drop policy if exists "pyqs_select_public"             on public.pyqs;
create policy "pyqs_select_public" on public.pyqs
  for select using (true);

drop policy if exists "current_affairs_select_public"  on public.current_affairs;
create policy "current_affairs_select_public" on public.current_affairs
  for select using (true);


-- --- Profiles (1:1 with auth.users) ----------------------------------------

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);


-- --- Subscriptions: read-only for the user; webhook writes via service role -

drop policy if exists "subs_select_own" on public.subscriptions;
create policy "subs_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);
-- (no insert/update/delete policies = users cannot mutate from the client)


-- --- usage_events: append-only ---------------------------------------------

drop policy if exists "usage_select_own" on public.usage_events;
create policy "usage_select_own" on public.usage_events
  for select using (auth.uid() = user_id);
drop policy if exists "usage_insert_own" on public.usage_events;
create policy "usage_insert_own" on public.usage_events
  for insert with check (auth.uid() = user_id);


-- --- study_plans: full CRUD on own rows ------------------------------------

drop policy if exists "plans_select_own" on public.study_plans;
create policy "plans_select_own" on public.study_plans
  for select using (auth.uid() = user_id);
drop policy if exists "plans_insert_own" on public.study_plans;
create policy "plans_insert_own" on public.study_plans
  for insert with check (auth.uid() = user_id);
drop policy if exists "plans_update_own" on public.study_plans;
create policy "plans_update_own" on public.study_plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "plans_delete_own" on public.study_plans;
create policy "plans_delete_own" on public.study_plans
  for delete using (auth.uid() = user_id);


-- --- study_plan_tasks: scoped through the parent plan ----------------------

drop policy if exists "plan_tasks_select_own" on public.study_plan_tasks;
create policy "plan_tasks_select_own" on public.study_plan_tasks
  for select using (
    exists (select 1 from public.study_plans p
            where p.id = plan_id and p.user_id = auth.uid())
  );
drop policy if exists "plan_tasks_insert_own" on public.study_plan_tasks;
create policy "plan_tasks_insert_own" on public.study_plan_tasks
  for insert with check (
    exists (select 1 from public.study_plans p
            where p.id = plan_id and p.user_id = auth.uid())
  );
drop policy if exists "plan_tasks_update_own" on public.study_plan_tasks;
create policy "plan_tasks_update_own" on public.study_plan_tasks
  for update using (
    exists (select 1 from public.study_plans p
            where p.id = plan_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.study_plans p
            where p.id = plan_id and p.user_id = auth.uid())
  );
drop policy if exists "plan_tasks_delete_own" on public.study_plan_tasks;
create policy "plan_tasks_delete_own" on public.study_plan_tasks
  for delete using (
    exists (select 1 from public.study_plans p
            where p.id = plan_id and p.user_id = auth.uid())
  );


-- --- mock_attempts: full CRUD on own rows ----------------------------------

drop policy if exists "attempts_select_own" on public.mock_attempts;
create policy "attempts_select_own" on public.mock_attempts
  for select using (auth.uid() = user_id);
drop policy if exists "attempts_insert_own" on public.mock_attempts;
create policy "attempts_insert_own" on public.mock_attempts
  for insert with check (auth.uid() = user_id);
drop policy if exists "attempts_update_own" on public.mock_attempts;
create policy "attempts_update_own" on public.mock_attempts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- --- mock_answers: scoped through the parent attempt ----------------------

drop policy if exists "answers_select_own" on public.mock_answers;
create policy "answers_select_own" on public.mock_answers
  for select using (
    exists (select 1 from public.mock_attempts a
            where a.id = attempt_id and a.user_id = auth.uid())
  );
drop policy if exists "answers_insert_own" on public.mock_answers;
create policy "answers_insert_own" on public.mock_answers
  for insert with check (
    exists (select 1 from public.mock_attempts a
            where a.id = attempt_id and a.user_id = auth.uid())
  );
drop policy if exists "answers_update_own" on public.mock_answers;
create policy "answers_update_own" on public.mock_answers
  for update using (
    exists (select 1 from public.mock_attempts a
            where a.id = attempt_id and a.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.mock_attempts a
            where a.id = attempt_id and a.user_id = auth.uid())
  );


-- --- evaluations: full CRUD on own rows ------------------------------------

drop policy if exists "evals_select_own" on public.evaluations;
create policy "evals_select_own" on public.evaluations
  for select using (auth.uid() = user_id);
drop policy if exists "evals_insert_own" on public.evaluations;
create policy "evals_insert_own" on public.evaluations
  for insert with check (auth.uid() = user_id);
drop policy if exists "evals_delete_own" on public.evaluations;
create policy "evals_delete_own" on public.evaluations
  for delete using (auth.uid() = user_id);


-- --- doubt_threads: full CRUD on own rows ----------------------------------

drop policy if exists "threads_select_own" on public.doubt_threads;
create policy "threads_select_own" on public.doubt_threads
  for select using (auth.uid() = user_id);
drop policy if exists "threads_insert_own" on public.doubt_threads;
create policy "threads_insert_own" on public.doubt_threads
  for insert with check (auth.uid() = user_id);
drop policy if exists "threads_update_own" on public.doubt_threads;
create policy "threads_update_own" on public.doubt_threads
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "threads_delete_own" on public.doubt_threads;
create policy "threads_delete_own" on public.doubt_threads
  for delete using (auth.uid() = user_id);


-- --- doubt_messages: scoped through the parent thread ---------------------

drop policy if exists "msgs_select_own" on public.doubt_messages;
create policy "msgs_select_own" on public.doubt_messages
  for select using (
    exists (select 1 from public.doubt_threads t
            where t.id = thread_id and t.user_id = auth.uid())
  );
drop policy if exists "msgs_insert_own" on public.doubt_messages;
create policy "msgs_insert_own" on public.doubt_messages
  for insert with check (
    exists (select 1 from public.doubt_threads t
            where t.id = thread_id and t.user_id = auth.uid())
  );


-- --- Auto-create profile + free subscription on auth.users INSERT ---------
-- Standard Supabase pattern. Runs as the postgres role so it bypasses RLS.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- --- updated_at maintenance trigger (used by profiles + subscriptions) ----

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

drop trigger if exists doubt_threads_touch_updated_at on public.doubt_threads;
create trigger doubt_threads_touch_updated_at
  before update on public.doubt_threads
  for each row execute function public.touch_updated_at();
