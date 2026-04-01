/**
 * Gym Floor page — Server Component
 *
 * Responsibilities:
 *  1. Verify the user is authenticated (redirect to /login if not).
 *  2. Pre-fetch the equipment catalogue and user inventory server-side
 *     so the floor hydrates without a client-side loading flash.
 *  3. Seed the Zustand store via <GymFloorBootstrap> before rendering
 *     the interactive <GymFloor> client component.
 */
import { redirect } from "next/navigation";
import { GymFloor } from "@/components/gym-floor/GymFloor";
import { GymFloorBootstrap } from "@/components/gym-floor/GymFloorBootstrap";
import { fetchEquipmentMaster, fetchUserInventory } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EquipmentMaster, InventoryItem } from "@/types";
import { Map, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function GymFloorPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Pre-fetch both datasets in parallel
  let catalogue: EquipmentMaster[] = [];
  let inventory: InventoryItem[] = [];

  try {
    [catalogue, inventory] = await Promise.all([
      fetchEquipmentMaster(supabase),
      fetchUserInventory(supabase, user.id),
    ]);
  } catch {
    // Non-fatal: the client will re-fetch via loadFloor if this fails
  }

  return (
    <div className="flex flex-col h-screen bg-floor-bg">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg p-1.5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Back to home"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Map className="h-5 w-5 text-blue-400 shrink-0" />
          <div>
            <h1 className="text-sm font-semibold leading-none">Gym Floor</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {inventory.length} piece{inventory.length !== 1 ? "s" : ""} placed
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-gray-500">
          {(
            [
              ["bg-red-400", "Cardio"],
              ["bg-blue-400", "Machine"],
              ["bg-green-400", "Free Weights"],
              ["bg-purple-400", "Cables"],
              ["bg-teal-400", "Bodyweight"],
              ["bg-gray-400", "Accessories"],
            ] as const
          ).map(([colour, label]) => (
            <span key={label} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${colour}`} />
              {label}
            </span>
          ))}
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4">
        {/* Bootstrap seeds Zustand with SSR data before first paint */}
        <GymFloorBootstrap
          catalogue={catalogue}
          inventory={inventory}
          userId={user.id}
        />
        <GymFloor userId={user.id} />
      </main>
    </div>
  );
}
