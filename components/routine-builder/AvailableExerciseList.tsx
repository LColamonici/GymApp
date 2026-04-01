"use client";

/**
 * AvailableExerciseList
 * Shows exercises the user CAN do (hardware-first filtered).
 * Grouped by movement category, searchable, click-to-add.
 */
import { useState, useMemo } from "react";
import { Plus, Search, Lock } from "lucide-react";
import { useRoutineStore } from "@/store/routineStore";
import { Exercise, MuscleGroup } from "@/types";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Movement category grouping (mirrors store logic)
// ---------------------------------------------------------------------------

type MovementGroup =
  | "Push"
  | "Pull"
  | "Legs"
  | "Core"
  | "Cardio"
  | "Full Body";

const GROUP_ORDER: MovementGroup[] = [
  "Push",
  "Pull",
  "Legs",
  "Core",
  "Cardio",
  "Full Body",
];

const GROUP_COLOURS: Record<MovementGroup, string> = {
  Push: "text-orange-400",
  Pull: "text-blue-400",
  Legs: "text-green-400",
  Core: "text-yellow-400",
  Cardio: "text-red-400",
  "Full Body": "text-purple-400",
};

const PUSH: MuscleGroup[] = ["chest", "triceps", "shoulders"];
const PULL: MuscleGroup[] = ["back", "biceps"];
const LEGS: MuscleGroup[] = ["quads", "hamstrings", "glutes", "calves", "legs"];
const CORE: MuscleGroup[] = ["core"];
const CARDIO: MuscleGroup[] = ["cardio"];

function classifyExercise(ex: Exercise): MovementGroup {
  const focus = ex.muscle_focus;
  if (!focus) return "Full Body";

  const score = (groups: MuscleGroup[]) =>
    groups.reduce((sum, g) => sum + (focus[g] ?? 0), 0);

  const scores: [MovementGroup, number][] = [
    ["Push", score(PUSH)],
    ["Pull", score(PULL)],
    ["Legs", score(LEGS)],
    ["Core", score(CORE)],
    ["Cardio", score(CARDIO)],
  ];

  const [top] = scores.sort((a, b) => b[1] - a[1]);
  return top[1] > 0.3 ? top[0] : "Full Body";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AvailableExerciseList() {
  const { availableExercises, activeRoutineId, addExercise, entries } =
    useRoutineStore();
  const supabase = createClient();
  const [query, setQuery] = useState("");

  const addedIds = useMemo(
    () => new Set(entries.map((e) => e.exercise_id)),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q
      ? availableExercises.filter((ex) => ex.name.toLowerCase().includes(q))
      : availableExercises;
  }, [availableExercises, query]);

  const grouped = useMemo(() => {
    const map = new Map<MovementGroup, Exercise[]>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const ex of filtered) {
      const g = classifyExercise(ex);
      map.get(g)!.push(ex);
    }
    return map;
  }, [filtered]);

  async function handleAdd(ex: Exercise) {
    if (!activeRoutineId) return;
    await addExercise(supabase, ex);
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
        <input
          type="text"
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg bg-white/5 border border-white/10 pl-8 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {!activeRoutineId && (
        <p className="text-xs text-amber-400 flex items-center gap-1.5 px-1">
          <Lock className="h-3 w-3 shrink-0" />
          Select or create a routine first
        </p>
      )}

      {/* Exercise groups */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {GROUP_ORDER.map((group) => {
          const items = grouped.get(group) ?? [];
          if (!items.length) return null;

          return (
            <div key={group} className="space-y-1">
              <p
                className={`text-[10px] font-bold uppercase tracking-wider px-1 ${GROUP_COLOURS[group]}`}
              >
                {group}
              </p>
              {items.map((ex) => {
                const alreadyAdded = addedIds.has(ex.id);
                return (
                  <button
                    key={ex.id}
                    onClick={() => handleAdd(ex)}
                    disabled={!activeRoutineId}
                    className={[
                      "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left",
                      "text-xs transition-colors border",
                      !activeRoutineId
                        ? "opacity-40 cursor-not-allowed border-transparent"
                        : alreadyAdded
                        ? "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 cursor-pointer"
                        : "border-transparent hover:border-white/10 hover:bg-white/5 text-gray-200 cursor-pointer",
                    ].join(" ")}
                    title={
                      alreadyAdded ? "Already in routine — click to add again" : ex.name
                    }
                  >
                    <Plus
                      className={`h-3.5 w-3.5 shrink-0 ${
                        alreadyAdded ? "text-gray-500" : "text-blue-400"
                      }`}
                    />
                    <span className="flex-1 truncate">{ex.name}</span>
                    <span className="text-gray-500 tabular-nums">
                      {ex.met_value} MET
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-xs text-gray-500 px-1 py-4 text-center">
            No exercises match your search.
          </p>
        )}
      </div>
    </div>
  );
}
