-- 系统思考练习工作台 · Supabase schema
-- 在 Supabase Dashboard → SQL Editor 中粘贴执行一次即可

-- 练习作品表：一种表存三种练习（iceberg 冰山分析 / archetype 基模诊断 / loop 回路图）
create table if not exists works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('iceberg', 'archetype', 'loop')),
  title text not null default '未命名练习',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists works_user_updated_idx on works (user_id, updated_at desc);

-- updated_at 自动更新
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists works_touch_updated_at on works;
create trigger works_touch_updated_at
  before update on works
  for each row execute function touch_updated_at();

-- 行级安全：用户只能读写自己的数据
alter table works enable row level security;

drop policy if exists "works_owner_all" on works;
create policy "works_owner_all" on works
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
