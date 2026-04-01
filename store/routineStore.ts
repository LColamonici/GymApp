/**
 * Zustand store for the Routine Builder.
 *
 * Holds:
 *  - The full list of user routines (sidebar navigation)
 *  - The currently active routine and its exercises
 *  - The available exercise catalogue (filtered by user inventory)
 *  - Derived: real-time calorie total + muscle balance map
 */
import { create } from "zustand";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  Exercise,
  Routine,
  RoutineExercise,
  MuscleFocus,
  MuscleGroup,
} from "@/types";
import {
  fetchAvailableExercises,
  fetchUserRoutines,
  createRoutine,
  updateRoutineName,
  deleteRoutine,
  fetchRoutineExercises,
  addRoutineExercise,
  updateRoutineExercise,
  removeRoutineExercise,
} from "@/lib/supabase/routineQueries";

// ---------------------------------------------------------------------------
// Calorie helpers
// ---------------------------------------------------------------------------

/**
 * Calories = MET × weight_kg × (duration_minutes / 60)
 * For rep-based exercises, estimate duration as: sets × reps × 4 seconds
 */
export function estimateCalories(
  entry: RoutineExercise,
  exercise: Exercise,
  weightKg: number
): number {
  let durationMinutes: number;

  if (entry.duration_seconds) {
    durationMinutes = (entry.sets * entry.duration_seconds) / 60;
  } else {
    // ~4 seconds per rep is a standard mid-tempo estimate
    const reps = entry.reps ?? 10;
    durationMinutes = (entry.sets * reps * 4) / 60;
  }

  return exercise.met_value * weightKg * (durationMinutes / 60);
}

// ---------------------------------------------------------------------------
// Balance analysis
// ---------------------------------------------------------------------------

export type BalanceMap = Map<MuscleGroup, number>; // group → 0–1 ratio of total volume

/**
 * Aggregate muscle_focus across all routine exercises.
 * Returns a normalised map (values sum to 1).
 */
export function computeBalanceMap(
  entries: RoutineExercise[],
  exerciseMap: Map<string, Exercise>
): BalanceMap {
  const raw = new Map<MuscleGroup, number>();

  for (const entry of entries) {
    const exercise = exerciseMap.get(entry.exercise_id);
    if (!exercise) continue;

    const volumeMultiplier = entry.sets * (entry.reps ?? 1);

    for (const [group, ratio] of Object.entries(exercise.muscle_focus) as [
      MuscleGroup,
      number
    ][]) {
      raw.set(group, (raw.get(group) ?? 0) + ratio * volumeMultiplier);
    }
  }

  // Normalise
  const total = [...raw.values()].reduce((sum, v) => sum + v, 0);
  const normalised = new Map<MuscleGroup, number>();
  if (total === 0) return normalised;

  for (const [group, value] of raw) {
    normalised.set(group, value / total);
  }

  return normalised;
}

/**
 * Push/Pull/Legs categorisation for high-level balance warnings.
 * Returns the dominant category and its percentage if > 70%.
 */
const PUSH_GROUPS: MuscleGroup[] = ["chest", "triceps", "shoulders"];
const PULL_GROUPS: MuscleGroup[] = ["back", "biceps"];
const LEG_GROUPS: MuscleGroup[] = ["quads", "hamstrings", "glutes", "calves"];
const CORE_GROUPS: MuscleGroup[] = ["core"];
const CARDIO_GROUPS: MuscleGroup[] = ["cardio"];

export type MovementCategory = "Push" | "Pull" | "Legs" | "Core" | "Cardio";

export interface BalanceWarning {
  dominant: MovementCategory;
  percentage: number;
  missing: MovementCategory[];
}

export function computeBalanceWarning(
  balance: BalanceMap
): BalanceWarning | null {
  const categories: Record<MovementCategory, number> = {
    Push: 0,
    Pull: 0,
    Legs: 0,
    Core: 0,
    Cardio: 0,
  };

  const sum = (groups: MuscleGroup[]) =>
    groups.reduce((acc, g) => acc + (balance.get(g) ?? 0), 0);

  categories.Push = sum(PUSH_GROUPS);
  categories.Pull = sum(PULL_GROUPS);
  categories.Legs = sum(LEG_GROUPS);
  categories.Core = sum(CORE_GROUPS);
  categories.Cardio = sum(CARDIO_GROUPS);

  const entries = Object.entries(categories) as [MovementCategory, number][];
  const [dominant, dominantValue] = entries.reduce((max, curr) =>
    curr[1] > max[1] ? curr : max
  );

  if (dominantValue < 0.7) return null;

  const missing = entries
    .filter(([cat, v]) => cat !== dominant && v === 0)
    .map(([cat]) => cat);

  return { dominant, percentage: Math.round(dominantValue * 100), missing };
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

/** A RoutineExercise enriched with its Exercise details for display */
export interface EnrichedEntry extends RoutineExercise {
  exercise: Exercise;
  estimatedCalories: number;
}

interface RoutineBuilderState {
  availableExercises: Exercise[];
  routines: Routine[];
  activeRoutineId: string | null;
  entries: RoutineExercise[];
  exerciseMap: Map<string, Exercise>;
  userWeightKg: number; // for calorie estimation
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  loadBuilder: (supabase: SupabaseClient, userId: string, userWeightKg: number) => Promise<void>;
  selectRoutine: (supabase: SupabaseClient, routineId: string) => Promise<void>;
  createNewRoutine: (supabase: SupabaseClient, userId: string, name: string) => Promise<void>;
  renameRoutine: (supabase: SupabaseClient, routineId: string, name: string) => Promise<void>;
  removeRoutine: (supabase: SupabaseClient, routineId: string) => Promise<void>;
  addExercise: (supabase: SupabaseClient, exercise: Exercise) => Promise<void>;
  updateEntry: (
    supabase: SupabaseClient,
    entryId: string,
    patch: Partial<Pick<RoutineExercise, "sets" | "reps" | "duration_seconds" | "rest_seconds" | "weight_kg">>
  ) => Promise<void>;
  removeEntry: (supabase: SupabaseClient, entryId: string) => Promise<void>;
  moveEntry: (supabase: SupabaseClient, entryId: string, direction: "up" | "down") => Promise<void>;

  // Derived selectors
  enrichedEntries: () => EnrichedEntry[];
  totalCalories: () => number;
  balanceMap: () => BalanceMap;
  balanceWarning: () => BalanceWarning | null;
  activeRoutine: () => Routine | undefined;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useRoutineStore = create<RoutineBuilderState>((set, get) => ({
  availableExercises: [],
  routines: [],
  activeRoutineId: null,
  entries: [],
  exerciseMap: new Map(),
  userWeightKg: 70,
  isLoading: false,
  isSaving: false,
  error: null,

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  async loadBuilder(supabase, userId, userWeightKg) {
    set({ isLoading: true, error: null, userWeightKg });
    try {
      const [exercises, routines] = await Promise.all([
        fetchAvailableExercises(supabase, userId),
        fetchUserRoutines(supabase, userId),
      ]);
      const exerciseMap = new Map(exercises.map((e) => [e.id, e]));
      set({ availableExercises: exercises, routines, exerciseMap, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  // ── Routine selection ─────────────────────────────────────────────────────

  async selectRoutine(supabase, routineId) {
    set({ isLoading: true, activeRoutineId: routineId });
    try {
      const entries = await fetchRoutineExercises(supabase, routineId);
      set({ entries, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  // ── Routine CRUD ──────────────────────────────────────────────────────────

  async createNewRoutine(supabase, userId, name) {
    const routine = await createRoutine(supabase, userId, name);
    set((s) => ({
      routines: [routine, ...s.routines],
      activeRoutineId: routine.id,
      entries: [],
    }));
  },

  async renameRoutine(supabase, routineId, name) {
    set((s) => ({
      routines: s.routines.map((r) =>
        r.id === routineId ? { ...r, name } : r
      ),
    }));
    await updateRoutineName(supabase, routineId, name);
  },

  async removeRoutine(supabase, routineId) {
    set((s) => ({
      routines: s.routines.filter((r) => r.id !== routineId),
      activeRoutineId: s.activeRoutineId === routineId ? null : s.activeRoutineId,
      entries: s.activeRoutineId === routineId ? [] : s.entries,
    }));
    await deleteRoutine(supabase, routineId);
  },

  // ── Entry CRUD ────────────────────────────────────────────────────────────

  async addExercise(supabase, exercise) {
    const { activeRoutineId, entries } = get();
    if (!activeRoutineId) return;

    const newEntry: Omit<RoutineExercise, "id"> = {
      routine_id: activeRoutineId,
      exercise_id: exercise.id,
      position: entries.length,
      sets: 3,
      reps: exercise.required_equipment_slugs.length === 0 ? 10 : null,
      duration_seconds:
        exercise.required_equipment_slugs.includes("treadmill") ||
        exercise.required_equipment_slugs.includes("stationary-bike") ||
        exercise.required_equipment_slugs.includes("rowing-machine")
          ? 600 // 10 min default for cardio
          : null,
      rest_seconds: 60,
      weight_kg: null,
      notes: null,
    };

    // Default reps for non-cardio, non-bodyweight
    if (newEntry.reps === null && newEntry.duration_seconds === null) {
      newEntry.reps = 10;
    }

    const tempId = `optimistic-${Date.now()}`;
    const optimistic: RoutineExercise = { id: tempId, ...newEntry };
    set((s) => ({ entries: [...s.entries, optimistic] }));

    try {
      const saved = await addRoutineExercise(supabase, newEntry);
      set((s) => ({
        entries: s.entries.map((e) => (e.id === tempId ? saved : e)),
      }));
    } catch (err) {
      set((s) => ({
        entries: s.entries.filter((e) => e.id !== tempId),
        error: (err as Error).message,
      }));
    }
  },

  async updateEntry(supabase, entryId, patch) {
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === entryId ? { ...e, ...patch } : e
      ),
    }));
    try {
      await updateRoutineExercise(supabase, entryId, patch);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  async removeEntry(supabase, entryId) {
    set((s) => ({
      entries: s.entries
        .filter((e) => e.id !== entryId)
        .map((e, i) => ({ ...e, position: i })),
    }));
    await removeRoutineExercise(supabase, entryId);
  },

  async moveEntry(supabase, entryId, direction) {
    const { entries } = get();
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= entries.length) return;

    const reordered = [...entries];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const withPositions = reordered.map((e, i) => ({ ...e, position: i }));
    set({ entries: withPositions });

    // Persist both position changes
    await Promise.all([
      updateRoutineExercise(supabase, withPositions[idx].id, {
        position: withPositions[idx].position,
      }),
      updateRoutineExercise(supabase, withPositions[swapIdx].id, {
        position: withPositions[swapIdx].position,
      }),
    ]);
  },

  // ── Derived ───────────────────────────────────────────────────────────────

  enrichedEntries() {
    const { entries, exerciseMap, userWeightKg } = get();
    return entries.map((entry) => {
      const exercise = exerciseMap.get(entry.exercise_id)!;
      return {
        ...entry,
        exercise,
        estimatedCalories: exercise
          ? estimateCalories(entry, exercise, userWeightKg)
          : 0,
      };
    });
  },

  totalCalories() {
    return get()
      .enrichedEntries()
      .reduce((sum, e) => sum + e.estimatedCalories, 0);
  },

  balanceMap() {
    return computeBalanceMap(get().entries, get().exerciseMap);
  },

  balanceWarning() {
    return computeBalanceWarning(get().balanceMap());
  },

  activeRoutine() {
    return get().routines.find((r) => r.id === get().activeRoutineId);
  },
}));
