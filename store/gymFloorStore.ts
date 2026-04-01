/**
 * Zustand store for the Gym Floor editor.
 *
 * Responsibility boundary:
 *  - Holds optimistic UI state (inventory items + their grid positions).
 *  - Calls Supabase queries to persist changes.
 *  - Never holds auth state (that lives in a separate auth store / Supabase session).
 */
import { create } from "zustand";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  InventoryItem,
  EquipmentMaster,
  InventorySettings,
  GridCoord,
  GRID_COLS,
  GRID_ROWS,
} from "@/types";
import {
  fetchEquipmentMaster,
  fetchUserInventory,
  addToInventory,
  updateInventorySettings,
  removeFromInventory,
} from "@/lib/supabase/queries";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface GymFloorState {
  /** All available equipment (public catalogue) */
  catalogue: EquipmentMaster[];
  /** Items the current user has placed on their floor */
  inventory: InventoryItem[];
  /** Which inventory item's config modal is open */
  configuringId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadFloor: (supabase: SupabaseClient, userId: string) => Promise<void>;
  placeEquipment: (
    supabase: SupabaseClient,
    userId: string,
    equipmentId: string,
    coord: GridCoord
  ) => Promise<void>;
  moveEquipment: (
    supabase: SupabaseClient,
    inventoryId: string,
    coord: GridCoord
  ) => Promise<void>;
  updateWeights: (
    supabase: SupabaseClient,
    inventoryId: string,
    weights: number[]
  ) => Promise<void>;
  removeEquipment: (
    supabase: SupabaseClient,
    inventoryId: string
  ) => Promise<void>;
  openConfig: (inventoryId: string) => void;
  closeConfig: () => void;

  // Selectors (derived — computed inline to avoid stale closures)
  occupiedCoords: () => Set<string>;
  itemAtCoord: (coord: GridCoord) => InventoryItem | undefined;
  isEquipmentPlaced: (equipmentId: string) => boolean;
  findFreeCoord: () => GridCoord | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function coordKey(c: GridCoord) {
  return `${c.x},${c.y}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGymFloorStore = create<GymFloorState>((set, get) => ({
  catalogue: [],
  inventory: [],
  configuringId: null,
  isLoading: false,
  error: null,

  // ── Data loading ──────────────────────────────────────────────────────────

  async loadFloor(supabase, userId) {
    set({ isLoading: true, error: null });
    try {
      const [catalogue, inventory] = await Promise.all([
        fetchEquipmentMaster(supabase),
        fetchUserInventory(supabase, userId),
      ]);
      set({ catalogue, inventory, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  // ── Place new equipment from palette ─────────────────────────────────────

  async placeEquipment(supabase, userId, equipmentId, coord) {
    // Already placed? Ignore (one instance per equipment type)
    if (get().isEquipmentPlaced(equipmentId)) return;
    // Cell occupied? Bail
    if (get().occupiedCoords().has(coordKey(coord))) return;

    const settings: InventorySettings = { x: coord.x, y: coord.y };

    // Optimistic update
    const tempId = `optimistic-${Date.now()}`;
    const equipment = get().catalogue.find((e) => e.id === equipmentId)!;
    const optimisticItem: InventoryItem = {
      id: tempId,
      user_id: userId,
      equipment_id: equipmentId,
      settings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      equipment,
    };
    set((s) => ({ inventory: [...s.inventory, optimisticItem] }));

    try {
      const saved = await addToInventory(supabase, userId, equipmentId, settings);
      // Replace optimistic item with the real DB row
      set((s) => ({
        inventory: s.inventory.map((i) => (i.id === tempId ? saved : i)),
      }));
    } catch (e) {
      // Rollback
      set((s) => ({
        inventory: s.inventory.filter((i) => i.id !== tempId),
        error: (e as Error).message,
      }));
    }
  },

  // ── Move already-placed equipment to a new cell ───────────────────────────

  async moveEquipment(supabase, inventoryId, coord) {
    if (get().occupiedCoords().has(coordKey(coord))) return;

    // Optimistic update
    set((s) => ({
      inventory: s.inventory.map((i) =>
        i.id === inventoryId
          ? { ...i, settings: { ...i.settings, x: coord.x, y: coord.y } }
          : i
      ),
    }));

    try {
      await updateInventorySettings(supabase, inventoryId, coord);
    } catch (e) {
      // Reload on failure to resync
      set({ error: (e as Error).message });
    }
  },

  // ── Update dumbbell / kettlebell available weights ────────────────────────

  async updateWeights(supabase, inventoryId, weights) {
    const sortedWeights = [...weights].sort((a, b) => a - b);

    set((s) => ({
      inventory: s.inventory.map((i) =>
        i.id === inventoryId
          ? {
              ...i,
              settings: { ...i.settings, available_weights: sortedWeights },
            }
          : i
      ),
    }));

    try {
      const item = get().inventory.find((i) => i.id === inventoryId)!;
      await updateInventorySettings(supabase, inventoryId, {
        ...item.settings,
        available_weights: sortedWeights,
      });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  // ── Remove equipment ──────────────────────────────────────────────────────

  async removeEquipment(supabase, inventoryId) {
    // Optimistic
    set((s) => ({
      inventory: s.inventory.filter((i) => i.id !== inventoryId),
      configuringId:
        s.configuringId === inventoryId ? null : s.configuringId,
    }));

    try {
      await removeFromInventory(supabase, inventoryId);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  // ── Modal control ─────────────────────────────────────────────────────────

  openConfig: (inventoryId) => set({ configuringId: inventoryId }),
  closeConfig: () => set({ configuringId: null }),

  // ── Derived selectors ─────────────────────────────────────────────────────

  occupiedCoords() {
    const coords = new Set<string>();
    for (const item of get().inventory) {
      coords.add(coordKey({ x: item.settings.x, y: item.settings.y }));
    }
    return coords;
  },

  itemAtCoord(coord) {
    return get().inventory.find(
      (i) => i.settings.x === coord.x && i.settings.y === coord.y
    );
  },

  isEquipmentPlaced(equipmentId) {
    return get().inventory.some((i) => i.equipment_id === equipmentId);
  },

  findFreeCoord() {
    const occupied = get().occupiedCoords();
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (!occupied.has(coordKey({ x, y }))) return { x, y };
      }
    }
    return null; // floor is full
  },
}));
