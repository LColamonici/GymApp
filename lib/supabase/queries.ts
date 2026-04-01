/**
 * Typed Supabase query helpers for the Gym Floor feature.
 * Each function accepts a Supabase client so it works in both
 * client components (browser client) and server components (server client).
 */
import { SupabaseClient } from "@supabase/supabase-js";
import { EquipmentMaster, InventoryItem, InventorySettings } from "@/types";

/** Fetch the full equipment catalogue */
export async function fetchEquipmentMaster(
  supabase: SupabaseClient
): Promise<EquipmentMaster[]> {
  const { data, error } = await supabase
    .from("equipment_master")
    .select("*")
    .order("category")
    .order("name");

  if (error) throw new Error(error.message);
  return data as EquipmentMaster[];
}

/** Fetch a user's inventory joined with equipment details */
export async function fetchUserInventory(
  supabase: SupabaseClient,
  userId: string
): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from("user_inventory")
    .select("*, equipment:equipment_master(*)")
    .eq("user_id", userId)
    .order("created_at");

  if (error) throw new Error(error.message);
  return data as InventoryItem[];
}

/** Add a piece of equipment to the user's inventory */
export async function addToInventory(
  supabase: SupabaseClient,
  userId: string,
  equipmentId: string,
  settings: InventorySettings
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from("user_inventory")
    .insert({ user_id: userId, equipment_id: equipmentId, settings })
    .select("*, equipment:equipment_master(*)")
    .single();

  if (error) throw new Error(error.message);
  return data as InventoryItem;
}

/** Update the settings (position, weights) for an existing inventory item */
export async function updateInventorySettings(
  supabase: SupabaseClient,
  inventoryId: string,
  settings: Partial<InventorySettings>
): Promise<void> {
  // Merge with existing settings via Supabase JSONB || operator
  const { error } = await supabase.rpc("merge_inventory_settings", {
    p_inventory_id: inventoryId,
    p_patch: settings,
  });

  // Fallback: plain update if RPC not yet deployed
  if (error) {
    const { error: fallbackError } = await supabase
      .from("user_inventory")
      .update({ settings })
      .eq("id", inventoryId);

    if (fallbackError) throw new Error(fallbackError.message);
  }
}

/** Remove a piece of equipment from the user's inventory */
export async function removeFromInventory(
  supabase: SupabaseClient,
  inventoryId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_inventory")
    .delete()
    .eq("id", inventoryId);

  if (error) throw new Error(error.message);
}
