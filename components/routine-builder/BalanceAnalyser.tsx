"use client";

/**
 * BalanceAnalyser
 * Visual breakdown of muscle group distribution across the routine.
 * Fires a warning banner when any movement category exceeds 70%.
 * Renders a horizontal bar for each muscle group sorted by volume.
 */
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useRoutineStore, MovementCategory } from "@/store/routineStore";
import { MuscleGroup } from "@/types";

// Colour per muscle group
const MUSCLE_COLOURS: Partial<Record<MuscleGroup, string>> = {
  chest: "bg-orange-400",
  triceps: "bg-orange-300",
  shoulders: "bg-orange-500",
  back: "bg-blue-400",
  biceps: "bg-blue-300",
  core: "bg-yellow-400",
  quads: "bg-green-400",
  hamstrings: "bg-green-500",
  glutes: "bg-green-300",
  calves: "bg-green-200",
  legs: "bg-green-400",
  cardio: "bg-red-400",
  forearms: "bg-gray-400",
};

const CATEGORY_COLOURS: Record<MovementCategory, string> = {
  Push: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  Pull: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  Legs: "text-green-400 border-green-500/30 bg-green-500/10",
  Core: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  Cardio: "text-red-400 border-red-500/30 bg-red-500/10",
};

const SWAP_SUGGESTIONS: Record<MovementCategory, string> = {
  Push: "Add a Row or Pull-up to balance",
  Pull: "Add a Press or Fly to balance",
  Legs: "Add an upper-body compound lift",
  Core: "Add compound lifts that recruit more muscles",
  Cardio: "Add resistance training for muscle balance",
};

export function BalanceAnalyser() {
  const { balanceMap, balanceWarning, enrichedEntries } = useRoutineStore();

  const entries = enrichedEntries();
  const balance = balanceMap();
  const warning = balanceWarning();

  if (entries.length === 0) {
    return (
      <p className="text-xs text-gray-500 text-center py-6">
        Add exercises to see balance analysis.
      </p>
    );
  }

  // Sort by volume descending, cap display at 12 groups
  const sorted = [...balance.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return (
    <div className="space-y-4">
      {/* Warning / OK banner */}
      {warning ? (
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs ${
            CATEGORY_COLOURS[warning.dominant]
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">
              Routine is {warning.dominant}-Heavy ({warning.percentage}%)
            </p>
            <p className="opacity-80">{SWAP_SUGGESTIONS[warning.dominant]}</p>
            {warning.missing.length > 0 && (
              <p className="opacity-70">
                Missing entirely: {warning.missing.join(", ")}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2 text-xs text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Routine is well-balanced</span>
        </div>
      )}

      {/* Muscle group bars */}
      <div className="space-y-2">
        {sorted.map(([group, ratio]) => {
          const pct = Math.round(ratio * 100);
          const barColour = MUSCLE_COLOURS[group] ?? "bg-gray-400";

          return (
            <div key={group} className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="capitalize text-gray-300">{group}</span>
                <span className="tabular-nums text-gray-500">{pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColour}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
