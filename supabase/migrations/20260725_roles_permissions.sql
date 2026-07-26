-- Jackpot Palace
-- Migración 1: roles y jerarquía básica
-- No elimina datos ni columnas existentes.
-- Mantiene is_admin para compatibilidad con el panel actual.

begin;

alter table public.players
  add column if not exists role text,
  add column if not exists parent_id uuid,
  add column if not exists is_active boolean not null default true,
  add column if not exists max_cashiers integer not null default 100;

update public.players
set role = case
  when coalesce(is_admin, false) then 'super_admin'
  else 'player'
end
where role is null;

alter table public.players
  alter column role set default 'player',
  alter column role set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'players_role_check'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_role_check
      check (role in ('super_admin', 'admin', 'cashier', 'player'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'players_max_cashiers_check'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_max_cashiers_check
      check (max_cashiers between 0 and 1000);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'players_parent_id_fkey'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_parent_id_fkey
      foreign key (parent_id)
      references public.players(id)
      on delete set null;
  end if;
end $$;

create index if not exists players_role_idx on public.players(role);
create index if not exists players_parent_id_idx on public.players(parent_id);
create index if not exists players_role_parent_idx on public.players(role, parent_id);

create or replace function public.sync_player_admin_flag()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.is_admin := new.role in ('super_admin', 'admin');
  return new;
end;
$$;

drop trigger if exists trg_sync_player_admin_flag on public.players;
create trigger trg_sync_player_admin_flag
before insert or update of role
on public.players
for each row
execute function public.sync_player_admin_flag();

create or replace function public.validate_player_hierarchy()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  parent_role text;
  parent_limit integer;
  cashier_count integer;
begin
  if new.parent_id = new.id then
    raise exception 'Un usuario no puede depender de sí mismo';
  end if;

  if new.role = 'super_admin' then
    if new.parent_id is not null then
      raise exception 'Un super_admin no puede tener parent_id';
    end if;
    return new;
  end if;

  if new.role = 'admin' then
    if new.parent_id is not null then
      select role into parent_role
      from public.players
      where id = new.parent_id;

      if parent_role is distinct from 'super_admin' then
        raise exception 'Un admin solo puede depender de un super_admin';
      end if;
    end if;
    return new;
  end if;

  if new.role = 'cashier' then
    if new.parent_id is null then
      raise exception 'Un cajero debe pertenecer a un admin';
    end if;

    select role, max_cashiers
      into parent_role, parent_limit
    from public.players
    where id = new.parent_id;

    if parent_role is distinct from 'admin' then
      raise exception 'Un cajero solo puede depender de un admin';
    end if;

    select count(*)
      into cashier_count
    from public.players
    where role = 'cashier'
      and parent_id = new.parent_id
      and id is distinct from new.id;

    if cashier_count >= coalesce(parent_limit, 100) then
      raise exception 'El administrador alcanzó su límite de cajeros';
    end if;
    return new;
  end if;

  if new.role = 'player' and new.parent_id is not null then
    select role into parent_role
    from public.players
    where id = new.parent_id;

    if parent_role is distinct from 'cashier' then
      raise exception 'Un jugador solo puede depender de un cajero';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_player_hierarchy on public.players;
create trigger trg_validate_player_hierarchy
before insert or update of role, parent_id
on public.players
for each row
execute function public.validate_player_hierarchy();

update public.players
set is_admin = role in ('super_admin', 'admin');

commit;
