-- Ejecutar una sola vez en Supabase > SQL Editor.
alter table public.players add column if not exists force_logout_version bigint not null default 0;

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  casino_online boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.app_settings (id, casino_online) values (1, true) on conflict (id) do nothing;

alter table public.app_settings enable row level security;
drop policy if exists "settings readable" on public.app_settings;
create policy "settings readable" on public.app_settings for select using (true);

create or replace function public.admin_set_casino_online(p_online boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.players where auth_user_id=auth.uid() and is_admin=true) then
    raise exception 'Acceso denegado';
  end if;
  update public.app_settings set casino_online=p_online, updated_at=now(), updated_by=auth.uid() where id=1;
  if not p_online then
    update public.players set force_logout_version=force_logout_version+1 where is_admin=false;
  end if;
end; $$;
grant execute on function public.admin_set_casino_online(boolean) to authenticated;
