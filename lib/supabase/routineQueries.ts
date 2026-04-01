/**
 * Supabase query helpers for the Routine Builder.
 */
import { SupabaseClient } from "@supabase/supabase-js";
import { Exercise, Routine, RoutineExercise } from "@/types";

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

/**
 * Fetch exercises available to a user given their current inventory.
 * Uses the v_available_exercises view (hardware-first filter).
 */
export async function fetchAvailableExercises(
  supabase: SupabaseClient,
  userId: string
): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from("v_available_exercises")
    .select(
      "exercise_id, name, met_value, required_equipment_slugs, muscle_focus"
    )
    .eq("user_id", userId)
    .order("name");

  if (error) throw new Error(error.message);

  // Remap view columns to the Exercise shape
  return (data ?? []).map((row) => ({
    id: row.exercise_id,
    name: row.name,
    met_value: row.met_value,
    required_equipment_slugs: row.required_equipment_slugs,
    muscle_focus: row.muscle_focus,
    created_at: "",
  }));
}

// ---------------------------------------------------------------------------
// Routines
// ---------------------------------------------------------------------------

export async function fetchUserRoutines(
  supabase: SupabaseClient,
  userId: string
): Promise<Routine[]> {
  const { data, error } = await supabase
    .from("routines")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Routine[];
}

export async function createRoutine(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<Routine> {
  const { data, error } = await supabase
    .from("routines")
    .insert({ user_id: userId, name })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Routine;
}

export async function updateRoutineName(
  supabase: SupabaseClient,
  routineId: string,
  name: string
): Promise<void> {
  const { error } = await supabase
    .from("routines")
    .update({ name })
    .eq("id", routineId);

  if (error) throw new Error(error.message);
}

export async function deleteRoutine(
  supabase: SupabaseClient,
  routineId: string
): Promise<void> {
  const { error } = await supabase
    .from("routines")
    .delete()
    .eq("id", routineId);

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Routine exercises
// ---------------------------------------------------------------------------

export async function fetchRoutineExercises(
  supabase: SupabaseClient,
  routineId: string
): Promise<RoutineExercise[]> {
  const { data, error } = await supabase
    .from("routine_exercises")
    .select("*")
    .eq("routine_id", routineId)
    .order("position");

  if (error) throw new Error(error.message);
  return data as RoutineExercise[];
}

export async function addRoutineExercise(
  supabase: SupabaseClient,
  entry: Omit<RoutineExercise, "id">
): Promise<RoutineExercise> {
  const { data, error } = await supabase
    .from("routine_exercises")
    .insert(entry)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as RoutineExercise;
}

export async function updateRoutineExercise(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<
    Pick<
      RoutineExercise,
      "sets" | "reps" | "duration_seconds" | "rest_seconds" | "weight_kg" | "position" | "notes"
    >
  >
): Promise<void> {
  const { error } = await supabase
    .from("routine_exercises")
    .update(patch)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function removeRoutineExercise(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("routine_exercises")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
