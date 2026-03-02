do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'climbing_logs'
      and column_name = 'result'
  ) then
    alter table public.climbing_logs
      rename column result to gym;
  end if;
end $$;

create or replace function public.get_shared_logs(p_token text)
returns setof public.climbing_logs
language sql
security definer
set search_path = public
as $$
  select l.*
  from public.share_links s
  join public.climbing_logs l
    on l.user_id = s.owner_user_id
  where s.token = p_token
    and (s.expires_at is null or s.expires_at > now())
  order by l.date asc;
$$;

grant execute on function public.get_shared_logs(text) to anon, authenticated;
