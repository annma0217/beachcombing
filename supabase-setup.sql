-- 拾物圖鑑：Supabase 初始設定
-- 用法：Supabase 後台 → SQL Editor → New query → 貼上全部 → Run
-- 只有 weool1255@gmail.com 可以編輯；要換 Email 就改 admin_email() 那一行。

-- 只有這個 Email 可以新增、編輯、刪除；其他人只能瀏覽
create or replace function public.admin_email() returns text
language sql immutable as $$ select 'weool1255@gmail.com'::text $$;

create or replace function public.is_admin() returns boolean
language sql stable as $$ select coalesce(auth.jwt() ->> 'email', '') = public.admin_email() $$;

-- 收藏品
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  num integer not null,
  category_id text,
  name text not null default '',
  date date,
  place text default '',
  kind text default '',
  l numeric, w numeric, h numeric,
  weight numeric,
  tags text[] default '{}',
  notes text default '',
  photos text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 分類、外觀等設定
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

alter table public.items enable row level security;
alter table public.settings enable row level security;

drop policy if exists "items read" on public.items;
drop policy if exists "items write" on public.items;
create policy "items read"  on public.items for select using (true);
create policy "items write" on public.items for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings read" on public.settings;
drop policy if exists "settings write" on public.settings;
create policy "settings read"  on public.settings for select using (true);
create policy "settings write" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.items, public.settings to anon, authenticated;
grant insert, update, delete on public.items, public.settings to authenticated;

-- 照片儲存空間（公開讀取）
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

drop policy if exists "photos read" on storage.objects;
drop policy if exists "photos insert" on storage.objects;
drop policy if exists "photos update" on storage.objects;
drop policy if exists "photos delete" on storage.objects;
create policy "photos read"   on storage.objects for select using (bucket_id = 'photos');
create policy "photos insert" on storage.objects for insert to authenticated with check (bucket_id = 'photos' and public.is_admin());
create policy "photos update" on storage.objects for update to authenticated using (bucket_id = 'photos' and public.is_admin());
create policy "photos delete" on storage.objects for delete to authenticated using (bucket_id = 'photos' and public.is_admin());
