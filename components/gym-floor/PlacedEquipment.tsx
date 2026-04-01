"use client";

/**
 * PlacedEquipment
 * Rendered inside a FloorCell when an InventoryItem is at that grid position.
 * Acts as a @dnd-kit Draggable so users can reposition it.
 * Clicking opens the EquipmentConfigModal.
 */
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Settings2 } from "lucide-react";
import { InventoryItem, CATEGORY_STYLES, WEIGHT_CONFIGURABLE_SLUGS } from "@/types";
import { useGymFloorStore } from "@/store/gymFloorStore";

interface PlacedEquipmentProps {
  item: InventoryItem;
}

export function PlacedEquipment({ item }: PlacedEquipmentProps) {
  const { openConfig } = useGymFloorStore();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `placed-${item.id}`,
      data: {
        type: "floor",
        inventoryId: item.id,
        equipmentId: item.equipment_id,
      },
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 50 }
    : undefined;

  const styles = CATEGORY_STYLES[item.equipment.category];
  const hasWeights = WEIGHT_CONFIGURABLE_SLUGS.has(item.equipment.slug);
  const weights = item.settings.available_weights ?? [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "relative flex flex-col items-center justify-center gap-0.5",
        "w-full h-full rounded-lg border-2 cursor-grab active:cursor-grabbing select-none",
        "text-center transition-all duration-100 p-1",
        styles.bg,
        styles.border,
        isDragging ? "opacity-30 scale-95" : "hover:scale-105 hover:shadow-lg",
      ].join(" ")}
      {...listeners}
      {...attributes}
    >
      {/* Category badge */}
      <span
        className={`text-[9px] font-bold uppercase tracking-wider leading-none ${styles.text}`}
      >
        {item.equipment.category.slice(0, 3)}
      </span>

      {/* Equipment name — truncated */}
      <span className={`text-[10px] font-semibold leading-tight ${styles.text} line-clamp-2`}>
        {item.equipment.name}
      </span>

      {/* Weight summary (dumbbells) */}
      {hasWeights && weights.length > 0 && (
        <span className={`text-[8px] leading-none ${styles.text} opacity-70`}>
          {weights[0]}–{weights[weights.length - 1]}kg
        </span>
      )}

      {/* Config button — separate from drag listeners */}
      <button
        className={[
          "absolute top-0.5 right-0.5 rounded p-0.5",
          "opacity-0 group-hover:opacity-100",
          "hover:bg-black/10 transition-opacity",
          styles.icon,
        ].join(" ")}
        onClick={(e) => {
          e.stopPropagation();
          openConfig(item.id);
        }}
        aria-label={`Configure ${item.equipment.name}`}
        // Config button is not a drag handle — prevent drag from starting here
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Settings2 className="h-3 w-3" />
      </button>
    </div>
  );
}
