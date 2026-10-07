-- Plate Mate: meals (uploaded food photos), AI pairings, and votes.
-- Also turns on strict RLS for every table in the public schema.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.meals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    image_path text not null,
    image_url text not null,
    note text check (char_length(note) <= 200),
    dish_name text not null,
    -- The exact prompt and model used to generate the pairings.
    prompt text not null,
    model text not null,
    raw_response jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.pairings (
    id uuid primary key default gen_random_uuid(),
    meal_id uuid not null references public.meals (id) on delete cascade,
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    category text not null check (category in ('drink', 'side', 'sauce', 'upgrade')),
    title text not null check (char_length(title) <= 120),
    reason text not null check (char_length(reason) <= 400),
    -- Maintained by the votes trigger below; users cannot write it directly.
    score integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists pairings_meal_id_idx on public.pairings (meal_id);
create index if not exists pairings_score_idx on public.pairings (score desc, created_at desc);

create table if not exists public.votes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    pairing_id uuid not null references public.pairings (id) on delete cascade,
    value smallint not null check (value in (-1, 1)),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, pairing_id)
);

-- ---------------------------------------------------------------------------
-- Keep pairings.score in sync with votes. SECURITY DEFINER so it can update
-- pairings even though users have no UPDATE policy on that table.
-- ---------------------------------------------------------------------------

create or replace function public.apply_vote_to_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op = 'INSERT' then
        update public.pairings set score = score + new.value where id = new.pairing_id;
    elsif tg_op = 'UPDATE' then
        update public.pairings set score = score - old.value + new.value where id = new.pairing_id;
    elsif tg_op = 'DELETE' then
        update public.pairings set score = score - old.value where id = old.pairing_id;
    end if;
    return null;
end;
$$;

revoke execute on function public.apply_vote_to_score() from public, anon, authenticated;

drop trigger if exists votes_apply_score on public.votes;
create trigger votes_apply_score
    after insert or update of value or delete on public.votes
    for each row execute function public.apply_vote_to_score();

-- ---------------------------------------------------------------------------
-- Row Level Security: enable on every public table, then start from a clean
-- slate so no older, looser policies linger.
-- ---------------------------------------------------------------------------

do $$
declare
    t record;
    p record;
begin
    for t in select tablename from pg_tables where schemaname = 'public' loop
        execute format('alter table public.%I enable row level security', t.tablename);
    end loop;

    for p in select policyname, tablename from pg_policies where schemaname = 'public' loop
        execute format('drop policy %I on public.%I', p.policyname, p.tablename);
    end loop;
end;
$$;

-- profiles: each user can only see and edit their own row. Rows are created
-- by the existing signup trigger, so no INSERT policy is needed.
create policy "profiles: read own" on public.profiles
    for select to authenticated
    using ((select auth.uid()) = id);

create policy "profiles: update own" on public.profiles
    for update to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

-- health_resources: no longer used by the app. RLS on with no policies means
-- nobody can read or write it through the API.

-- meals: anyone can browse; only the owner can create or delete.
create policy "meals: public read" on public.meals
    for select to anon, authenticated
    using (true);

create policy "meals: insert own" on public.meals
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

create policy "meals: delete own" on public.meals
    for delete to authenticated
    using ((select auth.uid()) = user_id);

-- pairings: anyone can browse; inserts only onto the user's own meal.
-- No UPDATE policy, so the score column can't be tampered with.
create policy "pairings: public read" on public.pairings
    for select to anon, authenticated
    using (true);

create policy "pairings: insert on own meal" on public.pairings
    for insert to authenticated
    with check (
        (select auth.uid()) = user_id
        and exists (
            select 1 from public.meals m
            where m.id = meal_id and m.user_id = (select auth.uid())
        )
    );

-- votes: private to the voter. Totals are exposed via pairings.score.
create policy "votes: read own" on public.votes
    for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "votes: insert own" on public.votes
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

create policy "votes: update own" on public.votes
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "votes: delete own" on public.votes
    for delete to authenticated
    using ((select auth.uid()) = user_id);

-- Column-level hardening: users may only change a vote's value.
revoke update on public.votes from anon, authenticated;
grant update (value, updated_at) on public.votes to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public meal-photos bucket; users can only write inside a folder
-- named after their own user id.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "meal-photos: insert own folder" on storage.objects;
create policy "meal-photos: insert own folder" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'meal-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

-- avatars: the bucket is public, so image URLs work without a SELECT policy.
-- The old "Public can view avatars" policy let anyone list every file;
-- narrow it to the owner's folder (needed for upsert on re-upload).
drop policy if exists "Public can view avatars" on storage.objects;
drop policy if exists "avatars: read own folder" on storage.objects;
create policy "avatars: read own folder" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

-- Storage deletes need SELECT too (used to clean up non-food uploads).
drop policy if exists "meal-photos: read own folder" on storage.objects;
create policy "meal-photos: read own folder" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'meal-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "meal-photos: delete own" on storage.objects;
create policy "meal-photos: delete own" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'meal-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );
