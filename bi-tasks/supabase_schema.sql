-- ================================================
-- BI Tasks — SQL схема для Supabase (v2)
-- Supabase → SQL Editor → New query → Run
-- ================================================

-- 1. Профили
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  role text not null default 'manager' check (role in ('chief', 'manager')),
  created_at timestamptz default now()
);

-- 2. Проекты
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  manager_id uuid references public.profiles(id) on delete set null,
  deadline date,
  status text default 'active' check (status in ('active', 'pause', 'done')),
  created_at timestamptz default now()
);

-- 3. Задачи
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text default 'active' check (status in ('active', 'done')),
  deadline date,
  assignee_id uuid references public.profiles(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- 4. Шаги
create table if not exists public.steps (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  title text not null,
  done boolean default false,
  "order" integer default 0,
  created_at timestamptz default now()
);

-- 5. Комментарии
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz default now()
);

-- 6. Файлы
create table if not exists public.files (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  name text not null,
  url text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ================================================
-- Row Level Security
-- ================================================
alter table public.profiles  enable row level security;
alter table public.projects  enable row level security;
alter table public.tasks     enable row level security;
alter table public.steps     enable row level security;
alter table public.comments  enable row level security;
alter table public.files     enable row level security;

-- Profiles
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Projects: chief = all, manager = own
create policy "projects_chief" on public.projects for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'chief'));
create policy "projects_manager_sel" on public.projects for select using (manager_id = auth.uid());

-- Tasks: chief = all, manager = own
create policy "tasks_chief" on public.tasks for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'chief'));
create policy "tasks_manager_sel" on public.tasks for select using (assignee_id = auth.uid());
create policy "tasks_manager_upd" on public.tasks for update using (assignee_id = auth.uid());

-- Steps: via task ownership
create policy "steps_chief" on public.steps for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'chief'));
create policy "steps_manager" on public.steps for all
  using (exists (select 1 from public.tasks t where t.id = task_id and t.assignee_id = auth.uid()));

-- Comments: anyone in system can read/write on visible tasks
create policy "comments_chief" on public.comments for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'chief'));
create policy "comments_manager_sel" on public.comments for select
  using (exists (select 1 from public.tasks t where t.id = task_id and t.assignee_id = auth.uid()));
create policy "comments_manager_ins" on public.comments for insert
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.assignee_id = auth.uid()));

-- Files: same logic
create policy "files_chief" on public.files for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'chief'));
create policy "files_manager_sel" on public.files for select
  using (exists (select 1 from public.tasks t where t.id = task_id and t.assignee_id = auth.uid()));
create policy "files_manager_ins" on public.files for insert
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.assignee_id = auth.uid()));

-- ================================================
-- Storage bucket for files (run separately if needed)
-- ================================================
-- insert into storage.buckets (id, name, public) values ('task-files', 'task-files', true);
-- create policy "storage_all" on storage.objects for all using (bucket_id = 'task-files');

-- ================================================
-- Триггер: авто-создание профиля
-- ================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), coalesce(new.raw_user_meta_data->>'role', 'manager'))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ================================================
-- После регистрации Зубова — выполни это:
-- update public.profiles set full_name = 'Зубов Максим', role = 'chief'
-- where id = (select id from auth.users where email = 'zubov@bi.kz');
-- ================================================
