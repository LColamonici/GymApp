-- =============================================================================
-- Digital Twin Gym — Initial Schema Migration
-- =============================================================================
-- Run order matters: referenced tables must exist before foreign keys are added.
-- All tables use Row Level Security (RLS). Policies enforce user data isolation.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";


-- ---------------------------------------------------------------------------
-- 1. PROFILES
-- Extends Supabase auth.users 1-to-1. Created automatically on signup via trigger.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  weight_kg   numeric(5, 2)  not null check (weight_kg  > 0),
  height_cm   numeric(5, 2)  not null check (height_cm  > 0),
  fitness_level text         not null default 'beginner'
                             check (fitness_level in ('beginner', 'intermediate', 'advanced')),
  created_at  timestamptz    not null default now(),
  updated_at  timestamptz    not null default now()
);

comment on table public.profiles is
  'One profile per authenticated user. weight_kg is required for calorie estimation.';

-- Trigger: keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Trigger: auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, weight_kg, height_cm)
  values (
    new.id,
    70,   -- sensible defaults; user must update in onboarding
    170
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 2. EQUIPMENT_MASTER
-- Catalogue of all recognisable gym equipment. Managed by admins, not users.
-- ---------------------------------------------------------------------------
create table public.equipment_master (
  id          uuid         primary key default uuid_generate_v4(),
  name        text         not null,
  slug        text         not null unique,   -- machine-readable key used in exercises
  category    text         not null
              check (category in (
                'cardio', 'strength_machine', 'free_weights',
                'cables', 'bodyweight', 'accessories'
              )),
  image_url   text,
  created_at  timestamptz  not null default now()
);

comment on column public.equipment_master.slug is
  'Stable identifier referenced by exercises.required_equipment_slugs.';

-- Seed: core equipment catalogue
insert into public.equipment_master (name, slug, category, image_url) values
  ('Barbell',                 'barbell',               'free_weights',     null),
  ('Flat Bench',              'flat-bench',             'accessories',      null),
  ('Incline Bench',           'incline-bench',          'accessories',      null),
  ('Squat Rack',              'squat-rack',             'strength_machine', null),
  ('Dumbbells',               'dumbbells',              'free_weights',     null),
  ('Pull-up Bar',             'pullup-bar',             'bodyweight',       null),
  ('Cable Machine',           'cable-machine',          'cables',           null),
  ('Lat Pulldown',            'lat-pulldown',           'strength_machine', null),
  ('Leg Press',               'leg-press',              'strength_machine', null),
  ('Chest Press Machine',     'chest-press-machine',    'strength_machine', null),
  ('Rowing Machine',          'rowing-machine',         'cardio',           null),
  ('Treadmill',               'treadmill',              'cardio',           null),
  ('Stationary Bike',         'stationary-bike',        'cardio',           null),
  ('Kettlebell',              'kettlebell',             'free_weights',     null),
  ('Resistance Bands',        'resistance-bands',       'accessories',      null),
  ('Yoga Mat',                'yoga-mat',               'accessories',      null),
  ('Foam Roller',             'foam-roller',            'accessories',      null),
  ('Dip Station',             'dip-station',            'bodyweight',       null),
  ('Smith Machine',           'smith-machine',          'strength_machine', null),
  ('Leg Curl Machine',        'leg-curl-machine',       'strength_machine', null),
  ('Leg Extension Machine',   'leg-extension-machine',  'strength_machine', null),
  ('Pec Deck / Fly Machine',  'pec-deck',               'strength_machine', null),
  ('T-Bar Row',               'tbar-row',               'strength_machine', null),
  ('EZ-Curl Bar',             'ez-curl-bar',            'free_weights',     null),
  ('Ab Wheel',                'ab-wheel',               'accessories',      null);


-- ---------------------------------------------------------------------------
-- 3. USER_INVENTORY
-- Items the user has placed on their "Gym Floor."
-- settings JSONB stores grid coordinates and, for free-weights, available loads.
--
-- Example settings for dumbbells:
--   { "x": 3, "y": 2, "available_weights": [5, 10, 15, 20] }
-- Example settings for a treadmill:
--   { "x": 0, "y": 0 }
-- ---------------------------------------------------------------------------
create table public.user_inventory (
  id            uuid         primary key default uuid_generate_v4(),
  user_id       uuid         not null references public.profiles (id) on delete cascade,
  equipment_id  uuid         not null references public.equipment_master (id) on delete cascade,
  settings      jsonb        not null default '{}'::jsonb,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),

  -- A user can only have one instance of each piece of equipment on their floor.
  -- If they need two sets of dumbbells they adjust the weight range in settings.
  unique (user_id, equipment_id)
);

comment on column public.user_inventory.settings is
  'Grid position {x, y} plus equipment-specific config. '
  'Dumbbells: { "x":int, "y":int, "available_weights": [kg,...] }. '
  'Other equipment: { "x":int, "y":int }.';

create trigger trg_user_inventory_updated_at
  before update on public.user_inventory
  for each row execute procedure public.set_updated_at();

-- Index: fast lookup of all equipment a user owns (used by inventory filter)
create index idx_user_inventory_user_id on public.user_inventory (user_id);


-- ---------------------------------------------------------------------------
-- 4. EXERCISES
-- Master list of exercises with MET values, required equipment, and muscle focus.
--
-- required_equipment_slugs: array of slugs from equipment_master.
--   An exercise is available iff ALL slugs are present in the user's inventory.
--   Empty array means bodyweight (no equipment required).
--
-- muscle_focus: JSONB mapping muscle-group keys to intensity ratios (0–1).
--   Keys: "chest", "back", "shoulders", "biceps", "triceps",
--          "core", "quads", "hamstrings", "glutes", "calves", "cardio"
--   Ratios must sum to ~1.0 (enforced by application layer, not DB constraint,
--   to allow partial entries during seed authoring).
--
-- Example:
--   { "chest": 0.6, "triceps": 0.3, "shoulders": 0.1 }  -- Bench Press
-- ---------------------------------------------------------------------------
create table public.exercises (
  id                        uuid         primary key default uuid_generate_v4(),
  name                      text         not null unique,
  met_value                 numeric(4,2) not null check (met_value > 0),
  required_equipment_slugs  text[]       not null default '{}',
  muscle_focus              jsonb        not null default '{}'::jsonb,
  created_at                timestamptz  not null default now()
);

comment on column public.exercises.met_value is
  'Metabolic Equivalent of Task. Calorie formula: MET × weight_kg × (duration_min / 60).';
comment on column public.exercises.required_equipment_slugs is
  'All slugs must exist in user_inventory for this exercise to be suggested.';

-- Index: GIN index for fast array containment checks (the inventory filter)
create index idx_exercises_equipment_slugs
  on public.exercises using gin (required_equipment_slugs);

-- GIN index on muscle_focus for JSONB queries used in balance analysis
create index idx_exercises_muscle_focus
  on public.exercises using gin (muscle_focus);

-- Seed: core exercise catalogue
-- MET values sourced from the Compendium of Physical Activities (Ainsworth et al.)
insert into public.exercises
  (name, met_value, required_equipment_slugs, muscle_focus)
values
  -- ── BODYWEIGHT ──────────────────────────────────────────────────────────
  ('Push-up',
   8.0,  '{}',
   '{"chest":0.5,"triceps":0.3,"shoulders":0.2}'),

  ('Pull-up',
   8.0,  '{pullup-bar}',
   '{"back":0.6,"biceps":0.35,"core":0.05}'),

  ('Dip',
   8.0,  '{dip-station}',
   '{"triceps":0.5,"chest":0.35,"shoulders":0.15}'),

  ('Plank',
   4.0,  '{}',
   '{"core":0.85,"shoulders":0.15}'),

  ('Burpee',
   10.0, '{}',
   '{"cardio":0.5,"chest":0.15,"quads":0.2,"core":0.15}'),

  ('Squat (Bodyweight)',
   5.0,  '{}',
   '{"quads":0.5,"glutes":0.35,"hamstrings":0.15}'),

  -- ── DUMBBELL ────────────────────────────────────────────────────────────
  ('Dumbbell Bicep Curl',
   3.5,  '{dumbbells}',
   '{"biceps":0.8,"forearms":0.2}'),

  ('Dumbbell Shoulder Press',
   6.0,  '{dumbbells}',
   '{"shoulders":0.65,"triceps":0.35}'),

  ('Dumbbell Romanian Deadlift',
   6.0,  '{dumbbells}',
   '{"hamstrings":0.5,"glutes":0.35,"back":0.15}'),

  ('Dumbbell Lateral Raise',
   3.5,  '{dumbbells}',
   '{"shoulders":1.0}'),

  ('Dumbbell Goblet Squat',
   6.0,  '{dumbbells}',
   '{"quads":0.5,"glutes":0.35,"core":0.15}'),

  ('Dumbbell Row',
   5.0,  '{dumbbells}',
   '{"back":0.7,"biceps":0.3}'),

  ('Dumbbell Chest Fly',
   4.0,  '{dumbbells,flat-bench}',
   '{"chest":0.75,"shoulders":0.25}'),

  ('Dumbbell Bench Press',
   6.0,  '{dumbbells,flat-bench}',
   '{"chest":0.6,"triceps":0.25,"shoulders":0.15}'),

  ('Dumbbell Incline Press',
   6.0,  '{dumbbells,incline-bench}',
   '{"chest":0.5,"shoulders":0.3,"triceps":0.2}'),

  -- ── BARBELL ─────────────────────────────────────────────────────────────
  ('Barbell Back Squat',
   8.0,  '{barbell,squat-rack}',
   '{"quads":0.5,"glutes":0.3,"hamstrings":0.15,"core":0.05}'),

  ('Barbell Bench Press',
   6.0,  '{barbell,flat-bench,squat-rack}',
   '{"chest":0.6,"triceps":0.25,"shoulders":0.15}'),

  ('Barbell Deadlift',
   6.0,  '{barbell}',
   '{"hamstrings":0.35,"glutes":0.25,"back":0.3,"core":0.1}'),

  ('Barbell Overhead Press',
   6.0,  '{barbell,squat-rack}',
   '{"shoulders":0.6,"triceps":0.3,"core":0.1}'),

  ('Barbell Row',
   6.0,  '{barbell}',
   '{"back":0.65,"biceps":0.25,"core":0.1}'),

  ('EZ-Bar Curl',
   3.5,  '{ez-curl-bar}',
   '{"biceps":0.85,"forearms":0.15}'),

  -- ── CABLE ───────────────────────────────────────────────────────────────
  ('Cable Tricep Pushdown',
   4.0,  '{cable-machine}',
   '{"triceps":0.9,"forearms":0.1}'),

  ('Cable Chest Fly',
   4.0,  '{cable-machine}',
   '{"chest":0.75,"shoulders":0.25}'),

  ('Cable Row',
   5.0,  '{cable-machine}',
   '{"back":0.65,"biceps":0.25,"core":0.1}'),

  ('Cable Lateral Raise',
   3.5,  '{cable-machine}',
   '{"shoulders":1.0}'),

  ('Cable Face Pull',
   4.0,  '{cable-machine}',
   '{"shoulders":0.6,"back":0.3,"biceps":0.1}'),

  -- ── MACHINES ────────────────────────────────────────────────────────────
  ('Lat Pulldown',
   5.0,  '{lat-pulldown}',
   '{"back":0.65,"biceps":0.3,"shoulders":0.05}'),

  ('Leg Press',
   5.0,  '{leg-press}',
   '{"quads":0.55,"glutes":0.3,"hamstrings":0.15}'),

  ('Leg Curl',
   4.0,  '{leg-curl-machine}',
   '{"hamstrings":0.85,"glutes":0.15}'),

  ('Leg Extension',
   4.0,  '{leg-extension-machine}',
   '{"quads":1.0}'),

  ('Pec Deck Fly',
   4.0,  '{pec-deck}',
   '{"chest":0.85,"shoulders":0.15}'),

  ('Chest Press Machine',
   5.0,  '{chest-press-machine}',
   '{"chest":0.6,"triceps":0.25,"shoulders":0.15}'),

  ('T-Bar Row',
   6.0,  '{tbar-row}',
   '{"back":0.7,"biceps":0.2,"core":0.1}'),

  -- ── CARDIO ──────────────────────────────────────────────────────────────
  ('Treadmill Run',
   11.0, '{treadmill}',
   '{"cardio":0.85,"quads":0.1,"calves":0.05}'),

  ('Treadmill Walk',
   3.5,  '{treadmill}',
   '{"cardio":0.8,"quads":0.15,"calves":0.05}'),

  ('Stationary Bike (Moderate)',
   7.0,  '{stationary-bike}',
   '{"cardio":0.7,"quads":0.2,"calves":0.1}'),

  ('Rowing Machine',
   7.0,  '{rowing-machine}',
   '{"cardio":0.5,"back":0.25,"legs":0.15,"core":0.1}'),

  -- ── KETTLEBELL ──────────────────────────────────────────────────────────
  ('Kettlebell Swing',
   9.0,  '{kettlebell}',
   '{"glutes":0.35,"hamstrings":0.3,"back":0.2,"core":0.15}'),

  ('Kettlebell Goblet Squat',
   6.0,  '{kettlebell}',
   '{"quads":0.5,"glutes":0.35,"core":0.15}'),

  ('Kettlebell Turkish Get-up',
   5.0,  '{kettlebell}',
   '{"core":0.4,"shoulders":0.3,"glutes":0.2,"quads":0.1}');


-- ---------------------------------------------------------------------------
-- 5. ROUTINES
-- A saved workout plan belonging to a user.
-- ---------------------------------------------------------------------------
create table public.routines (
  id          uuid         primary key default uuid_generate_v4(),
  user_id     uuid         not null references public.profiles (id) on delete cascade,
  name        text         not null,
  notes       text,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create trigger trg_routines_updated_at
  before update on public.routines
  for each row execute procedure public.set_updated_at();

create index idx_routines_user_id on public.routines (user_id);


-- ---------------------------------------------------------------------------
-- 6. ROUTINE_EXERCISES
-- The ordered list of exercises within a routine, with per-set parameters.
-- ---------------------------------------------------------------------------
create table public.routine_exercises (
  id                uuid         primary key default uuid_generate_v4(),
  routine_id        uuid         not null references public.routines (id) on delete cascade,
  exercise_id       uuid         not null references public.exercises (id) on delete restrict,
  position          integer      not null,             -- display/execution order
  sets              integer      not null default 3    check (sets > 0),
  reps              integer,                           -- null for time-based exercises
  duration_seconds  integer,                           -- null for rep-based exercises
  rest_seconds      integer      not null default 60,
  weight_kg         numeric(6,2),                      -- null for bodyweight
  notes             text,

  check (reps is not null or duration_seconds is not null)  -- must have one
);

comment on column public.routine_exercises.position is
  'Zero-based ordering. Application must keep positions contiguous.';

create index idx_routine_exercises_routine_id
  on public.routine_exercises (routine_id, position);


-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.user_inventory   enable row level security;
alter table public.routines         enable row level security;
alter table public.routine_exercises enable row level security;
-- equipment_master and exercises are public read-only
alter table public.equipment_master enable row level security;
alter table public.exercises        enable row level security;

-- profiles: users can only see/edit their own row
create policy "profiles: owner access"
  on public.profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- user_inventory: users can only see/edit their own rows
create policy "user_inventory: owner access"
  on public.user_inventory for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- routines: users can only see/edit their own
create policy "routines: owner access"
  on public.routines for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- routine_exercises: accessible if the parent routine belongs to the user
create policy "routine_exercises: owner access"
  on public.routine_exercises for all
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_id
        and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.routines r
      where r.id = routine_id
        and r.user_id = auth.uid()
    )
  );

-- equipment_master: public read, no writes from clients
create policy "equipment_master: public read"
  on public.equipment_master for select
  using (true);

-- exercises: public read, no writes from clients
create policy "exercises: public read"
  on public.exercises for select
  using (true);


-- ---------------------------------------------------------------------------
-- HELPER VIEWS
-- ---------------------------------------------------------------------------

-- v_user_equipment_slugs
-- Returns the flat set of equipment slugs owned by each user.
-- Used by the inventory filter query in the application layer.
create or replace view public.v_user_equipment_slugs as
select
  ui.user_id,
  em.slug
from public.user_inventory ui
join public.equipment_master em on em.id = ui.equipment_id;

comment on view public.v_user_equipment_slugs is
  'Fast lookup: which equipment slugs does this user own?';

-- v_available_exercises
-- Returns exercises that a given user CAN perform given their inventory.
-- Usage: SELECT * FROM v_available_exercises WHERE user_id = auth.uid();
--
-- Logic: exercise is available iff
--   required_equipment_slugs = '{}'   (bodyweight, always available)
--   OR every slug in required_equipment_slugs is in the user's slug set.
create or replace view public.v_available_exercises as
select
  p.id         as user_id,
  e.id         as exercise_id,
  e.name,
  e.met_value,
  e.required_equipment_slugs,
  e.muscle_focus
from public.profiles p
cross join public.exercises e
where
  -- bodyweight: no equipment required
  e.required_equipment_slugs = '{}'
  or
  -- all required slugs are present in user's inventory
  (
    select array_agg(em.slug)
    from public.user_inventory ui
    join public.equipment_master em on em.id = ui.equipment_id
    where ui.user_id = p.id
  ) @> e.required_equipment_slugs;

comment on view public.v_available_exercises is
  'Hardware-first filter: only exercises the user has the equipment for.';
