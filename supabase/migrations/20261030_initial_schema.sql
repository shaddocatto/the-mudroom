-- Enums
create type involvement_level as enum ('old_pro', 'moderate', 'terrified_but_trying');
create type connection_appetite as enum ('just_a_few', 'small_circle', 'as_many_as_possible');
create type conversation_status as enum ('active', 'nudged', 'planning', 'met', 'stalled');
create type post_status as enum ('pending', 'live', 'blocked');
create type appeal_status as enum ('open', 'resolved_ai', 'resolved_human');

-- Profiles (one row per auth user)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  involvement_level involvement_level not null default 'moderate',
  connection_appetite connection_appetite not null default 'small_circle',
  bio text,
  interests jsonb not null default '[]'::jsonb,
  interests_other text,
  -- per-field visibility: { "bio": true, "interests": false, ... } true = public
  field_visibility jsonb not null default '{}'::jsonb,
  open_to_signals boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are readable by authenticated users (public fields filtered in app layer)"
  on profiles for select
  to authenticated
  using (true);

create policy "users manage their own profile"
  on profiles for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Conversations (private 1:1 threads; may originate from a suggested match)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  status conversation_status not null default 'active',
  started_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint different_users check (user_a <> user_b),
  constraint ordered_pair check (user_a < user_b)
);

alter table conversations enable row level security;

create policy "participants can view their conversation"
  on conversations for select
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "participants can update their conversation"
  on conversations for update
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Messages (actual private content; never read by matching logic, only metadata is)
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  length_chars int not null generated always as (char_length(body)) stored,
  sent_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "participants can view messages in their conversation"
  on messages for select
  to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "participants can send messages in their conversation"
  on messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create index on messages (conversation_id, sent_at);

-- Keep conversations.last_message_at current (used by signal calculations)
create or replace function touch_conversation_last_message()
returns trigger as $$
begin
  update conversations set last_message_at = new.sent_at where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger messages_touch_conversation
  after insert on messages
  for each row execute function touch_conversation_last_message();

-- Nudges (soft, dismissible prompts sent toward planning a meetup)
create table nudges (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  kind text not null default 'plan_meetup',
  sent_at timestamptz not null default now(),
  dismissed_at timestamptz,
  dismissed_by uuid references profiles(id)
);

alter table nudges enable row level security;

create policy "participants can view and dismiss nudges"
  on nudges for select
  to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "participants can dismiss nudges"
  on nudges for update
  to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

-- Planning sessions (opt-in logistics tool; separate from the private conversation)
create table planning_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_a_identity_confirmed boolean not null default false,
  user_b_identity_confirmed boolean not null default false,
  user_a_activity_choices jsonb, -- { first: {type, area}, second: {type, area} }
  user_b_activity_choices jsonb,
  resolved_activity text,
  resolved_location text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table planning_sessions enable row level security;

create policy "participants can view their planning session"
  on planning_sessions for select
  to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "participants can update their planning session"
  on planning_sessions for update
  to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "participants can create their planning session"
  on planning_sessions for insert
  to authenticated
  with check (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

-- Community wall posts (pre-screened by AI moderation before going live)
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  status post_status not null default 'pending',
  ai_confidence text, -- 'confident_clean' | 'uncertain' | 'confident_violation'
  block_reason text,
  created_at timestamptz not null default now(),
  live_at timestamptz
);

alter table posts enable row level security;

create policy "live posts are readable by everyone authenticated"
  on posts for select
  to authenticated
  using (status = 'live' or author_id = auth.uid());

create policy "users create their own posts"
  on posts for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "authors can undo their own pending post"
  on posts for delete
  to authenticated
  using (author_id = auth.uid() and status = 'pending');

-- Moderation review queue (shared queue, any reviewer can pick up any item)
create table moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  reviewer_id uuid references profiles(id),
  decision text, -- 'approved' | 'blocked'
  notes text,
  created_at timestamptz not null default now()
);

alter table moderation_reviews enable row level security;
-- No public policy: service role / reviewer-only access handled at the app layer.

-- Appeals (require added context, go to AI first)
create table appeals (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  context text not null,
  status appeal_status not null default 'open',
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table appeals enable row level security;

create policy "users manage their own appeals"
  on appeals for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Post-meetup feedback (scoped to the app's own performance, not the relationship)
create table meetup_feedback (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  nudge_quality int check (nudge_quality between 1 and 5),
  spot_quality int check (spot_quality between 1 and 5),
  open_feedback text,
  created_at timestamptz not null default now()
);

alter table meetup_feedback enable row level security;

create policy "users manage their own feedback"
  on meetup_feedback for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
