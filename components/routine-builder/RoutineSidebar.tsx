"use client";

/**
 * RoutineSidebar
 * Lists saved routines. Allows creating and deleting routines.
 * Selecting a routine loads its exercises into the editor.
 */
import { useState } from "react";
import { Plus, Trash2, ChevronRight, ClipboardList } from "lucide-react";
import { useRoutineStore } from "@/store/routineStore";
import { createClient } from "@/lib/supabase/client";

interface RoutineSidebarProps {
  userId: string;
}

export function RoutineSidebar({ userId }: RoutineSidebarProps) {
  const {
    routines,
    activeRoutineId,
    selectRoutine,
    createNewRoutine,
    removeRoutine,
  } = useRoutineStore();

  const supabase = createClient();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    await createNewRoutine(supabase, userId, name);
    setNewName("");
    setCreating(false);
  }

  return (
    <aside className="flex flex-col gap-3 w-full sm:w-52 shrink-0">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          My Routines
        </h2>
        <button
          onClick={() => setCreating((v) => !v)}
          className="rounded-lg p-1 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          aria-label="New routine"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* New routine form */}
      {creating && (
        <div className="flex gap-1.5">
          <input
            autoFocus
            type="text"
            placeholder="Routine name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setCreating(false);
            }}
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {/* Routine list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {routines.length === 0 && !creating && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <ClipboardList className="h-6 w-6 text-gray-600" />
            <p className="text-xs text-gray-500">No routines yet</p>
          </div>
        )}

        {routines.map((routine) => {
          const isActive = routine.id === activeRoutineId;
          return (
            <div
              key={routine.id}
              className={[
                "group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors",
                isActive
                  ? "bg-blue-600/20 border border-blue-500/30 text-white"
                  : "hover:bg-white/5 border border-transparent text-gray-400 hover:text-gray-200",
              ].join(" ")}
              onClick={() => selectRoutine(supabase, routine.id)}
            >
              <ChevronRight
                className={`h-3 w-3 shrink-0 transition-transform ${
                  isActive ? "rotate-90 text-blue-400" : ""
                }`}
              />
              <span className="flex-1 text-xs font-medium truncate">
                {routine.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeRoutine(supabase, routine.id);
                }}
                className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                aria-label={`Delete ${routine.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
