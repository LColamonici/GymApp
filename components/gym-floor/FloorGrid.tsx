"use client";

/**
 * FloorGrid
 * Renders the 10×8 draggable grid. Each cell is a @dnd-kit Droppable.
 * Placed equipment renders inside its cell as a Draggable via PlacedEquipment.
 */
import { useDroppable } from "@dnd-kit/core";
import { PlacedEquipment } from "./PlacedEquipment";
import { useGymFloorStore } from "@/store/gymFloorStore";
import { GRID_COLS, GRID_ROWS, GridCoord } from "@/types";
import { useGymFloorStore as useStore } from "@/store/gymFloorStore";

// ---------------------------------------------------------------------------
// Individual droppable cell
// ---------------------------------------------------------------------------

interface FloorCellProps {
  coord: GridCoord;
}

function FloorCell({ coord }: FloorCellProps) {
  const itemAtCoord = useStore((s) => s.itemAtCoord);
  const item = itemAtCoord(coord);

  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${coord.x}-${coord.y}`,
    data: { type: "cell", coord },
  });

  const isEmpty = !item;

  return (
    <div
      ref={setNodeRef}
      className={[
        "group relative aspect-square rounded-md border floor-cell-transition",
        isEmpty
          ? [
              "border-white/5 bg-floor-cell",
              isOver ? "border-blue-400/60 bg-blue-500/20 scale-[1.02]" : "",
            ].join(" ")
          : "border-transparent",
      ].join(" ")}
    >
      {/* Row/col label — only on empty cells, dev-mode visual aid */}
      {isEmpty && (
        <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/10 select-none pointer-events-none">
          {coord.x},{coord.y}
        </span>
      )}

      {item && <PlacedEquipment item={item} />}

      {/* Drop target highlight ring */}
      {isOver && isEmpty && (
        <div className="absolute inset-0 rounded-md ring-2 ring-blue-400/60 pointer-events-none" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid container
// ---------------------------------------------------------------------------

export function FloorGrid() {
  const isLoading = useGymFloorStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Loading floor…
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-2 sm:p-4">
      {/* Scrollable wrapper — grid can be larger than viewport on mobile */}
      <div
        className="grid gap-1 sm:gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, minmax(52px, 1fr))`,
          gridTemplateRows: `repeat(${GRID_ROWS}, minmax(52px, 1fr))`,
          minWidth: `${GRID_COLS * 56}px`,
        }}
      >
        {Array.from({ length: GRID_ROWS }, (_, y) =>
          Array.from({ length: GRID_COLS }, (_, x) => (
            <FloorCell key={`${x}-${y}`} coord={{ x, y }} />
          ))
        )}
      </div>
    </div>
  );
}
