"use client";

/**
 * RoutineEditor
 * The ordered list of exercises in the active routine.
 * Each row has inline editors for sets / reps / duration / weight / rest.
 * Shows per-exercise calorie estimate and running total.
 */
import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Flame,
  Clock,
  Dumbbell,
} from "lucide-react";
import { useRoutineStore, EnrichedEntry } from "@/store/routineStore";
import { createClient } from "@/lib/supabase/client";
import { RoutineExercise } from "@/types";

// ---------------------------------------------------------------------------
// Tiny number input
// ---------------------------------------------------------------------------

function NumInput({
  value,
  onChange,
  min = 1,
  max = 999,
  label,
}: {
  value: number | null;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <label className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] text-gray-500 uppercase tracking-wider">
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange(v);
        }}
        className="w-12 rounded bg-white/5 border border-white/10 text-center text-xs py-1 text-white focus:outline-none focus:border-blue-500/50 [appearance:textfield]"
      />
    </label>
  );
}

// ---------------------------------------------------------------------------
// Single exercise row
// ---------------------------------------------------------------------------

function ExerciseRow({
  entry,
  index,
  total,
}: {
  entry: EnrichedEntry;
  index: number;
  total: number;
}) {
  const supabase = createClient();
  const { updateEntry, removeEntry, moveEntry } = useRoutineStore();
  const [removing, setRemoving] = useState(false);

  const isCardio = entry.duration_seconds !== null;

  function patch(
    p: Partial<
      Pick<
        RoutineExercise,
        "sets" | "reps" | "duration_seconds" | "rest_seconds" | "weight_kg"
      >
    >
  ) {
    updateEntry(supabase, entry.id, p);
  }

  async function handleRemove() {
    setRemoving(true);
    await removeEntry(supabase, entry.id);
  }

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 p-3 transition-opacity ${
        removing ? "opacity-40" : ""
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Position badge */}
          <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded bg-white/10 text-[10px] font-bold text-gray-400">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-white truncate">
            {entry.exercise.name}
          </span>
        </div>

        {/* Move up/down + delete */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => moveEntry(supabase, entry.id, "up")}
            disabled={index === 0}
            className="rounded p-1 text-gray-500 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
            aria-label="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => moveEntry(supabase, entry.id, "down")}
            disabled={index === total - 1}
            className="rounded p-1 text-gray-500 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
            aria-label="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleRemove}
            className="rounded p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="Remove exercise"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Parameter controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <NumInput
          label="Sets"
          value={entry.sets}
          min={1}
          max={20}
          onChange={(v) => patch({ sets: v })}
        />

        {isCardio ? (
          <NumInput
            label="Sec"
            value={entry.duration_seconds}
            min={30}
            max={7200}
            onChange={(v) => patch({ duration_seconds: v })}
          />
        ) : (
          <NumInput
            label="Reps"
            value={entry.reps}
            min={1}
            max={100}
            onChange={(v) => patch({ reps: v })}
          />
        )}

        <NumInput
          label="Rest (s)"
          value={entry.rest_seconds}
          min={0}
          max={600}
          onChange={(v) => patch({ rest_seconds: v })}
        />

        {/* Weight — optional */}
        <label className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider">
            kg
          </span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={entry.weight_kg ?? ""}
            placeholder="BW"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              patch({ weight_kg: isNaN(v) ? null : v });
            }}
            className="w-14 rounded bg-white/5 border border-white/10 text-center text-xs py-1 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 [appearance:textfield]"
          />
        </label>

        {/* Calorie badge */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2 py-1">
          <Flame className="h-3 w-3 text-orange-400" />
          <span className="text-xs font-semibold text-orange-300 tabular-nums">
            ~{Math.round(entry.estimatedCalories)} kcal
          </span>
        </div>
      </div>

      {/* Duration hint for cardio */}
      {isCardio && entry.duration_seconds !== null && (
        <p className="mt-1.5 text-[10px] text-gray-500 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {entry.sets} × {Math.round(entry.duration_seconds / 60)} min
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor container
// ---------------------------------------------------------------------------

export function RoutineEditor() {
  const { enrichedEntries, totalCalories, activeRoutine, isLoading } =
    useRoutineStore();

  const entries = enrichedEntries();
  const routine = activeRoutine();
  const calories = totalCalories();

  if (!routine) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <Dumbbell className="h-10 w-10 text-gray-600" />
        <p className="text-gray-400 text-sm font-medium">No routine selected</p>
        <p className="text-xs text-gray-600">
          Create a new routine or pick one from the list to start building.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Routine header + calorie total */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h2 className="text-sm font-semibold text-white truncate">
          {routine.name}
        </h2>
        {entries.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 shrink-0">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-bold text-orange-300 tabular-nums">
              {Math.round(calories)} kcal
            </span>
          </div>
        )}
      </div>

      {/* Exercise list */}
      {entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-gray-500">
          Click an exercise on the left to add it here
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {entries.map((entry, i) => (
            <ExerciseRow
              key={entry.id}
              entry={entry}
              index={i}
              total={entries.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}
