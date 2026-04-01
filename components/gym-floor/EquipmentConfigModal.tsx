"use client";

/**
 * EquipmentConfigModal
 * Slides up from the bottom on mobile, centered dialog on desktop.
 * Allows the user to:
 *  - Configure available weights (for free-weights)
 *  - Remove the item from the floor
 */
import { X, Trash2 } from "lucide-react";
import { useGymFloorStore } from "@/store/gymFloorStore";
import { WeightRangeSelector } from "./WeightRangeSelector";
import { CATEGORY_STYLES, WEIGHT_CONFIGURABLE_SLUGS } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef } from "react";

interface EquipmentConfigModalProps {
  userId: string;
}

export function EquipmentConfigModal({ userId }: EquipmentConfigModalProps) {
  const { configuringId, inventory, closeConfig, updateWeights, removeEquipment } =
    useGymFloorStore();

  const supabase = createClient();
  const overlayRef = useRef<HTMLDivElement>(null);

  const item = inventory.find((i) => i.id === configuringId);

  // Close on Escape
  useEffect(() => {
    if (!configuringId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeConfig();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [configuringId, closeConfig]);

  if (!configuringId || !item) return null;

  const styles = CATEGORY_STYLES[item.equipment.category];
  const isWeightConfigurable = WEIGHT_CONFIGURABLE_SLUGS.has(
    item.equipment.slug
  );
  const currentWeights = item.settings.available_weights ?? [];

  function handleWeightChange(weights: number[]) {
    updateWeights(supabase, item!.id, weights);
  }

  async function handleRemove() {
    await removeEquipment(supabase, item!.id);
  }

  return (
    /* Backdrop */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === overlayRef.current && closeConfig()}
    >
      {/* Panel */}
      <div className="w-full max-w-md rounded-2xl bg-[#1e2a3a] border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b border-white/10`}>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold border ${styles.bg} ${styles.border} ${styles.text}`}
            >
              {item.equipment.category.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h2 className="font-semibold text-white text-sm">
                {item.equipment.name}
              </h2>
              <p className="text-xs text-gray-400 capitalize">
                {item.equipment.category.replace("_", " ")} ·{" "}
                {`(${item.settings.x}, ${item.settings.y})`}
              </p>
            </div>
          </div>
          <button
            onClick={closeConfig}
            className="rounded-lg p-1.5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          {isWeightConfigurable && (
            <WeightRangeSelector
              selected={currentWeights}
              onChange={handleWeightChange}
            />
          )}

          {!isWeightConfigurable && (
            <p className="text-sm text-gray-400">
              This equipment has no additional settings. Drag it on the floor to
              reposition it.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={handleRemove}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Remove from floor
          </button>
        </div>
      </div>
    </div>
  );
}
