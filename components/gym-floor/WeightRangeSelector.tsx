"use client";

/**
 * WeightRangeSelector
 * Renders a grid of toggleable weight chips (e.g. 5 kg, 10 kg … 50 kg).
 * Only shown for equipment whose slug is in WEIGHT_CONFIGURABLE_SLUGS.
 */
import { FREE_WEIGHT_KG_OPTIONS } from "@/types";

interface WeightRangeSelectorProps {
  selected: number[];
  onChange: (weights: number[]) => void;
}

export function WeightRangeSelector({
  selected,
  onChange,
}: WeightRangeSelectorProps) {
  function toggle(kg: number) {
    if (selected.includes(kg)) {
      onChange(selected.filter((w) => w !== kg));
    } else {
      onChange([...selected, kg].sort((a, b) => a - b));
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Available weights
      </p>
      <div className="flex flex-wrap gap-2">
        {FREE_WEIGHT_KG_OPTIONS.map((kg) => {
          const active = selected.includes(kg);
          return (
            <button
              key={kg}
              type="button"
              onClick={() => toggle(kg)}
              className={[
                "rounded-lg px-3 py-1.5 text-sm font-semibold border transition-all",
                active
                  ? "bg-green-500 border-green-400 text-white shadow-md shadow-green-900/30"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30",
              ].join(" ")}
            >
              {kg} kg
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-amber-400">
          Select at least one weight — otherwise no dumbbell exercises will be
          suggested.
        </p>
      )}
    </div>
  );
}
