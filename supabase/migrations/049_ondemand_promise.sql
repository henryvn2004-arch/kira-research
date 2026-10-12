-- 049_ondemand_promise.sql — S18: a requested report has a promised date, and we can say how many are ahead of it.
--   topics.promise_at       when we told the first requester it would be ready (set once, on the first email request)
--   topic_queue_ahead(id)   how many reports will be made before this topic if it is requested now:
--                           requested topics that asked earlier and are not published, plus planner topics a runner
--                           is working on right now. Used for the "ready by" date (api/_lib/eta.js).
alter table public.topics add column if not exists promise_at timestamptz;
create index if not exists topics_promise_idx on public.topics (promise_at) where promise_at is not null and report_id is null;

create or replace function public.topic_queue_ahead(p_topic uuid)
returns integer
language sql stable security definer
set search_path = public, pg_temp
as $$
  with fr as (
    select topic_id, min(created_at) as f from topic_requests where topic_id is not null group by topic_id
  ),
  me as (select coalesce((select f from fr where topic_id = p_topic), now()) as f)
  select (
    select count(*) from fr join topics t on t.id = fr.topic_id
     where fr.topic_id <> p_topic and t.report_id is null and fr.f < (select f from me)
  )::int + (
    select count(*) from report_queue q
     where q.status in ('en_in_progress', 'ja_in_progress', 'ko_in_progress', 'zh_in_progress', 'en_done', 'ja_done', 'ko_done')
       and q.id <> coalesce((select slug from topics where id = p_topic), '')
       and not exists (select 1 from topics t2 join fr on fr.topic_id = t2.id where t2.slug = q.id)
  )::int
$$;
revoke execute on function public.topic_queue_ahead(uuid) from public, anon, authenticated;
