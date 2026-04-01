"use client";

/**
 * EquipmentPalette
 * Left sidebar (desktop) / bottom sheet (mobile) listing the equipment
 * catalogue. Items the user hasn't placed yet are Draggable.
 * Already-placed items show a checkmark and are not draggable.
 *
 * On click (not drag), auto-places the item at the first free cell.
 */
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical } from "lucide-react";
import { useGymFloorStore } from "@/store/gymFloorStore";
import {
  EquipmentMaster,
  EquipmentCategory,
  CATEGORY_STYLES,
} from "@/types";
import { createClient } from "@/lib/supabase/client";

// Category display order and labels
const CATEGORY_ORDER: EquipmentCategory[] = [
  "cardio",
  "strength_machine",
  "free_weights",
  "cables",
  "bodyweight",
  "accessories",
];

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  cardio: "Cardio",
  strength_machine: "Strength Machines",
  free_weights: "Free Weights",
  cables: "Cables",
  bodyweight: "Bodyweight",
  accessories: "Accessories",
};

// ---------------------------------------------------------------------------
// Single draggable palette item
// ---------------------------------------------------------------------------

interface PaletteItemProps {
  equipment: EquipmentMaster;
  placed: boolean;
  userId: string;
}

function PaletteItem({ equipment, placed, userId }: PaletteItemProps) {
  const { placeEquipment, findFreeCoord } = useGymFloorStore();
  const supabase = createClient();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${equipment.id}`,
      disabled: placed,
      data: {
        type: "palette",
        equipmentId: equipment.id,
      },
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 100 }
    : undefined;

  const styles = CATEGORY_STYLES[equipment.category];

  async function handleClick() {
    if (placed) return;
    const coord = findFreeCoord();
    if (!coord) return; // floor is full
    await placeEquipment(supabase, userId, equipment.id, coord);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium",
        "transition-all select-none",
        placed
          ? "border-white/10 bg-white/5 text-gray-500 cursor-default"
          : [
              "border-white/10 bg-white/5 text-gray-200",
              "hover:border-white/20 hover:bg-white/10 cursor-grab active:cursor-grabbing",
              isDragging ? "opacity-30 scale-95" : "",
            ].join(" "),
      ].join(" ")}
      onClick={handleClick}
      title={placed ? "Already on your floor" : "Click to place, or drag"}
    >
      {/* Drag handle */}
      {!placed && (
        <span
          {...listeners}
          {...attributes}
          className="text-gray-500 hover:text-gray-300 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3" />
        </span>
      )}

      {/* Category colour dot */}
      <span
        className={`h-2 w-2 rounded-full shrink-0 ${styles.bg} ${styles.border} border`}
      />

      {/* Name */}
      <span className="flex-1 truncate">{equipment.name}</span>

      {/* Placed indicator */}
      {placed && (
        <Check className="h-3 w-3 text-green-400 shrink-0" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Palette container
// ---------------------------------------------------------------------------

interface EquipmentPaletteProps {
  userId: string;
}

export function EquipmentPalette({ userId }: EquipmentPaletteProps) {
  const { catalogue, isEquipmentPlaced } = useGymFloorStore();

  // Group catalogue by category
  const grouped = CATEGORY_ORDER.reduce<
    Record<EquipmentCategory, EquipmentMaster[]>
  >(
    (acc, cat) => ({
      ...acc,
      [cat]: catalogue.filter((e) => e.category === cat),
    }),
    {} as Record<EquipmentCategory, EquipmentMaster[]>
  );

  return (
    <aside className="flex flex-col gap-4 w-full sm:w-64 shrink-0 overflow-y-auto">
      <div className="space-y-1">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
          Equipment Catalogue
        </h2>
        <p className="text-[10px] text-gray-500 px-1">
          Drag to place · Click to auto-place
        </p>
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items?.length) return null;
        const styles = CATEGORY_STYLES[cat];

        return (
          <div key={cat} className="space-y-1">
            {/* Category header */}
            <div className="flex items-center gap-1.5 px-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${styles.bg} ${styles.border} border`}
              />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {CATEGORY_LABELS[cat]}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-1">
              {items.map((eq) => (
                <PaletteItem
                  key={eq.id}
                  equipment={eq}
                  placed={isEquipmentPlaced(eq.id)}
                  userId={userId}
                />
              ))}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
