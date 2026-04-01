"use client";

/**
 * GymFloor
 * Root component for the Gym Floor editor.
 * Owns the DndContext and routes drag-end events to the Zustand store.
 *
 * Drag interactions handled:
 *  1. palette → cell   : place new equipment
 *  2. placed  → cell   : move existing equipment
 *  3. Drop on occupied cell or outside grid: cancel (no-op)
 */
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { useState, useCallback } from "react";
import { FloorGrid } from "./FloorGrid";
import { EquipmentPalette } from "./EquipmentPalette";
import { EquipmentConfigModal } from "./EquipmentConfigModal";
import { useGymFloorStore } from "@/store/gymFloorStore";
import { CATEGORY_STYLES, GridCoord } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Drag overlay — ghost card shown while dragging
// ---------------------------------------------------------------------------

function DragOverlayCard({ label, category }: { label: string; category: string }) {
  const styles =
    CATEGORY_STYLES[category as keyof typeof CATEGORY_STYLES] ??
    CATEGORY_STYLES.accessories;

  return (
    <div
      className={[
        "flex items-center justify-center rounded-lg border-2 px-3 py-2",
        "text-xs font-semibold shadow-xl rotate-2 opacity-90 cursor-grabbing",
        "min-w-[80px] max-w-[120px]",
        styles.bg,
        styles.border,
        styles.text,
      ].join(" ")}
    >
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface GymFloorProps {
  userId: string;
}

export function GymFloor({ userId }: GymFloorProps) {
  const supabase = createClient();
  const {
    inventory,
    catalogue,
    placeEquipment,
    moveEquipment,
    occupiedCoords,
    error,
  } = useGymFloorStore();

  // Track what is being dragged so DragOverlay can render it
  const [activeDrag, setActiveDrag] = useState<{
    label: string;
    category: string;
  } | null>(null);

  // Sensors: 8px activation distance prevents accidental drags on click
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current;
      if (!data) return;

      if (data.type === "palette") {
        const eq = catalogue.find((e) => e.id === data.equipmentId);
        if (eq) setActiveDrag({ label: eq.name, category: eq.category });
      } else if (data.type === "floor") {
        const item = inventory.find((i) => i.id === data.inventoryId);
        if (item)
          setActiveDrag({
            label: item.equipment.name,
            category: item.equipment.category,
          });
      }
    },
    [catalogue, inventory]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDrag(null);

      const { active, over } = event;
      if (!over) return; // dropped outside grid

      const activeData = active.data.current;
      const overData = over.data.current;

      // Only accept drops on grid cells
      if (overData?.type !== "cell") return;
      const coord: GridCoord = overData.coord;

      // Check target cell is free
      const occupied = occupiedCoords();
      const targetKey = `${coord.x},${coord.y}`;

      if (activeData?.type === "palette") {
        // palette → grid: place new item
        if (occupied.has(targetKey)) return;
        await placeEquipment(supabase, userId, activeData.equipmentId, coord);
      } else if (activeData?.type === "floor") {
        // floor → grid: move existing item
        // Allow dropping on own cell (no-op) but block occupied foreign cells
        const movingItem = inventory.find((i) => i.id === activeData.inventoryId);
        const isOwnCell =
          movingItem?.settings.x === coord.x &&
          movingItem?.settings.y === coord.y;

        if (!isOwnCell && occupied.has(targetKey)) return;
        if (!isOwnCell) {
          await moveEquipment(supabase, activeData.inventoryId, coord);
        }
      }
    },
    [supabase, userId, inventory, occupiedCoords, placeEquipment, moveEquipment]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col sm:flex-row gap-4 h-full min-h-0">
        {/* Palette — scrollable sidebar */}
        <div className="sm:h-full sm:overflow-y-auto pb-2 sm:pb-4 shrink-0">
          <EquipmentPalette userId={userId} />
        </div>

        {/* Grid — fills remaining space */}
        <div className="flex-1 overflow-auto rounded-xl border border-white/5 bg-floor-grid">
          <FloorGrid />
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400 shadow-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Drag overlay ghost */}
      <DragOverlay dropAnimation={null}>
        {activeDrag && (
          <DragOverlayCard
            label={activeDrag.label}
            category={activeDrag.category}
          />
        )}
      </DragOverlay>

      {/* Config modal (portal-style, outside grid layout) */}
      <EquipmentConfigModal userId={userId} />
    </DndContext>
  );
}
