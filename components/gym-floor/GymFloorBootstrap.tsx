"use client";

/**
 * GymFloorBootstrap
 * A tiny client component that seeds the Zustand store with data
 * fetched server-side on the gym-floor page.
 *
 * Runs once on mount. If the store is already populated (e.g. hot reload)
 * it skips re-seeding to avoid stomping on optimistic updates.
 */
import { useEffect } from "react";
import { useGymFloorStore } from "@/store/gymFloorStore";
import { EquipmentMaster, InventoryItem } from "@/types";

interface GymFloorBootstrapProps {
  catalogue: EquipmentMaster[];
  inventory: InventoryItem[];
  userId: string;
}

export function GymFloorBootstrap({
  catalogue,
  inventory,
}: GymFloorBootstrapProps) {
  const setCatalogue = useGymFloorStore((s) => s.catalogue);
  const storeIsEmpty = setCatalogue.length === 0;

  useEffect(() => {
    if (!storeIsEmpty) return;
    useGymFloorStore.setState({ catalogue, inventory, isLoading: false });
  }, [storeIsEmpty, catalogue, inventory]);

  return null;
}
