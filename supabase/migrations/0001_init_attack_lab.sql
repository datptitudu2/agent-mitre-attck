-- ==============================================================================
-- ATT&CK Lab — Migration 0001: Khởi tạo Schema, Allowlist Auth & Row Level Security
-- Chạy file này trong Supabase SQL Editor (hoặc qua Supabase CLI).
-- ==============================================================================

create extension if not exists pgcrypto;

-- ==============================================================================
-- 1. QUẢN TRỊ ALLOWLIST & HỒ SƠ NGƯỜI DÙNG (AUTH ALLOWLIST + PROFILES)
-- ==============================================================================

create table if not exists public.allowed_emails (
  email text primary key check (email = lower(btrim(email))),
  role text not null default 'member' check (role in ('admin', 'member')),
  note text not null default '',
  added_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Hàm kiểm tra email có nằm trong allowlist trước khi cho phép tạo tài khoản Auth
create or replace function public.enforce_allowed_email_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
begin
  normalized_email := lower(btrim(coalesce(new.email, '')));
  if normalized_email = '' or not exists (
    select 1 from public.allowed_emails where email = normalized_email
  ) then
    raise exception 'Email "%" khong nam trong danh sach cho phep (allowlist) cua ATT&CK Lab.', coalesce(new.email, 'unknown')
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_allowed_email on auth.users;
create trigger trg_enforce_allowed_email
  before insert on auth.users
  for each row
  execute function public.enforce_allowed_email_on_signup();

-- Tự động tạo bản ghi profiles ngay sau khi user hợp lệ được thêm vào auth.users
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  assigned_role text;
  default_name text;
begin
  normalized_email := lower(btrim(coalesce(new.email, '')));
  select role into assigned_role
  from public.allowed_emails
  where email = normalized_email;

  assigned_role := coalesce(assigned_role, 'member');
  default_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    split_part(normalized_email, '@', 1)
  );

  insert into public.profiles (id, email, display_name, role)
  values (new.id, normalized_email, default_name, assigned_role)
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- Đồng bộ role sang profiles khi admin cập nhật role trong allowed_emails
create or replace function public.sync_profile_role_from_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set role = new.role,
      updated_at = now()
  where lower(email) = new.email;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_role on public.allowed_emails;
create trigger trg_sync_profile_role
  after insert or update of role on public.allowed_emails
  for each row
  execute function public.sync_profile_role_from_allowlist();

-- Các hàm kiểm tra quyền dùng trong RLS (SECURITY DEFINER tránh đệ quy trên bảng profiles)
create or replace function public.is_allowed_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.uid() is not null and exists (
      select 1
      from public.profiles p
      join public.allowed_emails a on lower(p.email) = a.email
      where p.id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.uid() is not null and exists (
      select 1
      from public.profiles p
      join public.allowed_emails a on lower(p.email) = a.email
      where p.id = auth.uid()
        and p.role = 'admin'
        and a.role = 'admin'
    ),
    false
  );
$$;

-- ==============================================================================
-- 2. BẢNG DỮ LIỆU MITRE ATT&CK (CHỈ ĐỌC ĐỐI VỚI THÀNH VIÊN, GHI BỞI SERVICE ROLE)
-- ==============================================================================

create table if not exists public.attack_versions (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('enterprise-attack', 'mobile-attack', 'ics-attack')),
  version text not null,
  released_at timestamptz,
  is_latest boolean not null default false,
  stats jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (domain, version)
);

-- Khoá chính (domain, stix_id) vì Group/Software/Campaign dùng chung stix_id giữa các domain
create table if not exists public.attack_objects (
  domain text not null,
  stix_id text not null,
  version_id uuid not null references public.attack_versions(id) on delete cascade,
  type text not null,
  attack_id text not null,
  name text not null,
  description text not null default '',
  platforms text[] not null default '{}',
  tactics text[] not null default '{}',
  is_subtechnique boolean not null default false,
  parent_attack_id text,
  revoked boolean not null default false,
  deprecated boolean not null default false,
  replaced_by_attack_id text,
  usage_count integer not null default 0,
  is_new boolean not null default false,
  is_changed boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(attack_id, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(left(description, 4000), '')), 'B')
  ) stored,
  primary key (domain, stix_id)
);

create index if not exists idx_attack_objects_domain_type_id
  on public.attack_objects (domain, type, attack_id);
create index if not exists idx_attack_objects_attack_id
  on public.attack_objects (attack_id);
create index if not exists idx_attack_objects_parent
  on public.attack_objects (domain, parent_attack_id)
  where parent_attack_id is not null;
create index if not exists idx_attack_objects_platforms
  on public.attack_objects using gin (platforms);
create index if not exists idx_attack_objects_tactics
  on public.attack_objects using gin (tactics);
create index if not exists idx_attack_objects_search
  on public.attack_objects using gin (search_tsv);

create table if not exists public.attack_relationships (
  domain text not null,
  id text not null,
  version_id uuid not null references public.attack_versions(id) on delete cascade,
  source_ref text not null,
  target_ref text not null,
  rel_type text not null,
  source_type text not null default '',
  target_type text not null default '',
  description text not null default '',
  primary key (domain, id)
);

create index if not exists idx_attack_rel_source
  on public.attack_relationships (domain, source_ref, rel_type);
create index if not exists idx_attack_rel_target
  on public.attack_relationships (domain, target_ref, rel_type);
create index if not exists idx_attack_rel_type
  on public.attack_relationships (domain, rel_type);

-- JSON dựng sẵn cho từng domain để endpoint /api/matrix/{domain} đọc 1 dòng duy nhất (< 50ms)
create table if not exists public.attack_matrix_views (
  domain text primary key,
  version text not null,
  etag text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Bảng băm siêu nhẹ (~2-3 MB/version) phục vụ trang "Có gì mới" (/api/diff) mà không tốn 500 MB DB
create table if not exists public.attack_object_snapshots (
  domain text not null,
  version text not null,
  stix_id text not null,
  attack_id text not null,
  type text not null,
  name text not null,
  is_subtechnique boolean not null default false,
  revoked boolean not null default false,
  deprecated boolean not null default false,
  replaced_by_attack_id text,
  tactics text[] not null default '{}',
  content_hash text not null,
  primary key (domain, version, stix_id)
);

create index if not exists idx_attack_snapshots_domain_ver
  on public.attack_object_snapshots (domain, version);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('queued', 'running', 'success', 'error')),
  trigger_source text not null default 'cli',
  domain text not null default 'all',
  version text,
  counts jsonb not null default '{}'::jsonb,
  added integer not null default 0,
  updated integer not null default 0,
  removed integer not null default 0,
  db_size_bytes bigint,
  log text not null default ''
);

-- ==============================================================================
-- 3. BẢNG DỮ LIỆU CÁ NHÂN CỦA NGƯỜI DÙNG (BẢO VỆ BỞI RLS CHỦ SỞ HỮU)
-- ==============================================================================

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  domain text not null default 'enterprise-attack',
  attack_id text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, domain, attack_id)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  attack_id text not null,
  body_md text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, attack_id)
);

create table if not exists public.progress (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lesson_slug text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_slug)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  quiz_slug text not null,
  score integer not null,
  total integer not null default 0,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.coverage_layers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  domain text not null default 'enterprise-attack',
  techniques jsonb not null default '[]'::jsonb,
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==============================================================================
-- 4. HÀM ĐO DUNG LƯỢNG DATABASE THỰC TẾ (< 500 MB SUPABASE FREE)
-- ==============================================================================

create or replace function public.get_db_size_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  -- Chỉ cho phép service_role (auth.uid() is null khi gọi bằng service key) hoặc admin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role'
     and session_user not like 'postgres%'
     and session_user <> 'supabase_admin'
     and not public.is_admin() then
    raise exception 'Chi Admin hoac Service Role moi duoc xem thong ke dung luong DB.'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'database_pretty', pg_size_pretty(pg_database_size(current_database())),
    'limit_bytes', 524288000,
    'tables', (
      select coalesce(jsonb_object_agg(relname, jsonb_build_object(
        'bytes', pg_total_relation_size(c.oid),
        'pretty', pg_size_pretty(pg_total_relation_size(c.oid))
      )), '{}'::jsonb)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    )
  ) into result;

  return result;
end;
$$;

-- ==============================================================================
-- 5. BẬT ROW LEVEL SECURITY (RLS) & POLICIES CHO TẤT CẢ CÁC BẢNG
-- ==============================================================================

alter table public.allowed_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.attack_versions enable row level security;
alter table public.attack_objects enable row level security;
alter table public.attack_relationships enable row level security;
alter table public.attack_matrix_views enable row level security;
alter table public.attack_object_snapshots enable row level security;
alter table public.sync_runs enable row level security;
alter table public.bookmarks enable row level security;
alter table public.notes enable row level security;
alter table public.progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.coverage_layers enable row level security;

-- 5.1 allowed_emails: chỉ Admin được xem và quản lý
drop policy if exists "allowed_emails_admin_all" on public.allowed_emails;
create policy "allowed_emails_admin_all"
  on public.allowed_emails
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5.2 profiles: thành viên đọc hồ sơ nhóm; chỉ tự sửa display_name của mình (không tự nâng role!)
drop policy if exists "profiles_select_members" on public.profiles;
create policy "profiles_select_members"
  on public.profiles
  for select
  to authenticated
  using (public.is_allowed_member());

drop policy if exists "profiles_update_own_display_name" on public.profiles;
create policy "profiles_update_own_display_name"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id and public.is_allowed_member())
  with check (
    auth.uid() = id
    and public.is_allowed_member()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- 5.3 Bảng dữ liệu ATT&CK: chỉ đọc cho thành viên hợp lệ trong allowlist
drop policy if exists "attack_versions_read" on public.attack_versions;
create policy "attack_versions_read"
  on public.attack_versions for select to authenticated
  using (public.is_allowed_member());

drop policy if exists "attack_objects_read" on public.attack_objects;
create policy "attack_objects_read"
  on public.attack_objects for select to authenticated
  using (public.is_allowed_member());

drop policy if exists "attack_relationships_read" on public.attack_relationships;
create policy "attack_relationships_read"
  on public.attack_relationships for select to authenticated
  using (public.is_allowed_member());

drop policy if exists "attack_matrix_views_read" on public.attack_matrix_views;
create policy "attack_matrix_views_read"
  on public.attack_matrix_views for select to authenticated
  using (public.is_allowed_member());

drop policy if exists "attack_snapshots_read" on public.attack_object_snapshots;
create policy "attack_snapshots_read"
  on public.attack_object_snapshots for select to authenticated
  using (public.is_allowed_member());

drop policy if exists "sync_runs_read_members" on public.sync_runs;
create policy "sync_runs_read_members"
  on public.sync_runs for select to authenticated
  using (public.is_allowed_member());

-- 5.4 bookmarks: chỉ chủ sở hữu đọc/ghi/sửa/xoá
drop policy if exists "bookmarks_owner_all" on public.bookmarks;
create policy "bookmarks_owner_all"
  on public.bookmarks
  for all
  to authenticated
  using (auth.uid() = user_id and public.is_allowed_member())
  with check (auth.uid() = user_id and public.is_allowed_member());

-- 5.5 notes: chỉ chủ sở hữu đọc/ghi/sửa/xoá
drop policy if exists "notes_owner_all" on public.notes;
create policy "notes_owner_all"
  on public.notes
  for all
  to authenticated
  using (auth.uid() = user_id and public.is_allowed_member())
  with check (auth.uid() = user_id and public.is_allowed_member());

-- 5.6 progress: chỉ chủ sở hữu đọc/ghi/sửa/xoá
drop policy if exists "progress_owner_all" on public.progress;
create policy "progress_owner_all"
  on public.progress
  for all
  to authenticated
  using (auth.uid() = user_id and public.is_allowed_member())
  with check (auth.uid() = user_id and public.is_allowed_member());

-- 5.7 quiz_attempts: chỉ chủ sở hữu đọc/ghi
drop policy if exists "quiz_attempts_owner_all" on public.quiz_attempts;
create policy "quiz_attempts_owner_all"
  on public.quiz_attempts
  for all
  to authenticated
  using (auth.uid() = user_id and public.is_allowed_member())
  with check (auth.uid() = user_id and public.is_allowed_member());

-- 5.8 coverage_layers: chủ sở hữu toàn quyền; thành viên khác được SELECT nếu shared = true
drop policy if exists "coverage_layers_select" on public.coverage_layers;
create policy "coverage_layers_select"
  on public.coverage_layers
  for select
  to authenticated
  using (
    public.is_allowed_member()
    and (auth.uid() = user_id or shared = true)
  );

drop policy if exists "coverage_layers_insert_own" on public.coverage_layers;
create policy "coverage_layers_insert_own"
  on public.coverage_layers
  for insert
  to authenticated
  with check (auth.uid() = user_id and public.is_allowed_member());

drop policy if exists "coverage_layers_update_own" on public.coverage_layers;
create policy "coverage_layers_update_own"
  on public.coverage_layers
  for update
  to authenticated
  using (auth.uid() = user_id and public.is_allowed_member())
  with check (auth.uid() = user_id and public.is_allowed_member());

drop policy if exists "coverage_layers_delete_own" on public.coverage_layers;
create policy "coverage_layers_delete_own"
  on public.coverage_layers
  for delete
  to authenticated
  using (auth.uid() = user_id and public.is_allowed_member());
