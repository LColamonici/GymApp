// =============================================================================
// Digital Twin Gym — Shared TypeScript Types
// Mirrors the Supabase schema defined in 001_initial_schema.sql
// =============================================================================

// ---------------------------------------------------------------------------
// Database row shapes (what Supabase returns)
// ---------------------------------------------------------------------------

export type FitnessLevel = "beginner" | "intermediate" | "advanced";

export type EquipmentCategory =
  | "cardio"
  | "strength_machine"
  | "free_weights"
  | "cables"
  | "bodyweight"
  | "accessories";

export interface Profile {
  id: string;
  weight_kg: number;
  height_cm: number;
  fitness_level: FitnessLevel;
  created_at: string;
  updated_at: string;
}

export interface EquipmentMaster {
  id: string;
  name: string;
  slug: string;
  category: EquipmentCategory;
  image_url: string | null;
  created_at: string;
}

/** JSONB settings stored in user_inventory.settings */
export interface InventorySettings {
  /** Grid column (0-based) */
  x: number;
  /** Grid row (0-based) */
  y: number;
  /** Dumbbell / kettlebell specific: which kg increments the user owns */
  available_weights?: number[];
}

export interface UserInventoryRow {
  id: string;
  user_id: string;
  equipment_id: string;
  settings: InventorySettings;
  created_at: string;
  updated_at: string;
}

/** UserInventoryRow joined with EquipmentMaster (used throughout the UI) */
export interface InventoryItem extends UserInventoryRow {
  equipment: EquipmentMaster;
}

/** Muscle group keys used in exercises.muscle_focus */
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "core"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "legs"
  | "cardio";

export type MuscleFocus = Partial<Record<MuscleGroup, number>>;

export interface Exercise {
  id: string;
  name: string;
  met_value: number;
  required_equipment_slugs: string[];
  muscle_focus: MuscleFocus;
  created_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number;
  weight_kg: number | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// UI / Store types
// ---------------------------------------------------------------------------

/** A grid cell coordinate */
export interface GridCoord {
  x: number;
  y: number;
}

/** Drag source identifier — distinguishes palette items from placed items */
export type DragSource =
  | { type: "palette"; equipmentId: string }
  | { type: "floor"; inventoryId: string; equipmentId: string };

// ---------------------------------------------------------------------------
// Category colour palette (Tailwind class tokens)
// Used by EquipmentCard and PlacedEquipment
// ---------------------------------------------------------------------------

export const CATEGORY_STYLES: Record<
  EquipmentCategory,
  { bg: string; border: string; text: string; icon: string }
> = {
  cardio: {
    bg: "bg-red-100",
    border: "border-red-400",
    text: "text-red-800",
    icon: "text-red-600",
  },
  strength_machine: {
    bg: "bg-blue-100",
    border: "border-blue-400",
    text: "text-blue-800",
    icon: "text-blue-600",
  },
  free_weights: {
    bg: "bg-green-100",
    border: "border-green-400",
    text: "text-green-800",
    icon: "text-green-600",
  },
  cables: {
    bg: "bg-purple-100",
    border: "border-purple-400",
    text: "text-purple-800",
    icon: "text-purple-600",
  },
  bodyweight: {
    bg: "bg-teal-100",
    border: "border-teal-400",
    text: "text-teal-800",
    icon: "text-teal-600",
  },
  accessories: {
    bg: "bg-gray-100",
    border: "border-gray-400",
    text: "text-gray-800",
    icon: "text-gray-600",
  },
};

// Weights available in the dumbbell / kettlebell selector (kg)
export const FREE_WEIGHT_KG_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50] as const;

// Equipment slugs that support the weight-range selector
export const WEIGHT_CONFIGURABLE_SLUGS = new Set([
  "dumbbells",
  "kettlebell",
  "ez-curl-bar",
]);

// Grid dimensions
export const GRID_COLS = 10;
export const GRID_ROWS = 8;
