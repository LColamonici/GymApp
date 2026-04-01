/**
 * Routine Builder page — Server Component
 * Pre-fetches: available exercises (hardware-filtered), user routines, profile weight.
 */
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ClipboardList, ChevronLeft, Map } from "lucide-react";

import { fetchAvailableExercises, fetchUserRoutines } from "@/lib/supabase/routineQueries";
import { Exercise, Routine, Profile } from "@/types";
import { RoutineBuilderBootstrap } from "@/components/routine-builder/RoutineBuilderBootstrap";
import { RoutineSidebar } from "@/components/routine-builder/RoutineSidebar";
import { AvailableExerciseList } from "@/components/routine-builder/AvailableExerciseList";
import { RoutineEditor } from "@/components/routine-builder/RoutineEditor";
import { BalanceAnalyser } from "@/components/routine-builder/BalanceAnalyser";

export default async function RoutineBuilderPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let exercises: Exercise[] = [];
  let routines: Routine[] = [];
  let weightKg = 70;

  try {
    const [ex, rt, profileRes] = await Promise.all([
      fetchAvailableExercises(supabase, user.id),
      fetchUserRoutines(supabase, user.id),
      supabase
        .from("profiles")
        .select("weight_kg")
        .eq("id", user.id)
        .single<Pick<Profile, "weight_kg">>(),
    ]);

    exercises = ex;
    routines = rt;
    if (profileRes.data) weightKg = profileRes.data.weight_kg;
  } catch {
    // Non-fatal: client will load via store actions
  }

  return (
    <div className="flex flex-col h-screen bg-floor-bg">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg p-1.5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <ClipboardList className="h-5 w-5 text-blue-400 shrink-0" />
          <div>
            <h1 className="text-sm font-semibold leading-none">Routine Builder</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Only exercises you have equipment for
            </p>
          </div>
        </div>

        <Link
          href="/gym-floor"
          className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Map className="h-3 w-3" />
          Edit floor
        </Link>
      </header>

      {/* Main layout: sidebar | editor | analyser */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <RoutineBuilderBootstrap
          availableExercises={exercises}
          routines={routines}
          userWeightKg={weightKg}
        />

        {/*
          Three-panel layout:
          [My Routines] | [Exercise Picker] | [Editor + Balance]
          On mobile: stacked, scrollable tabs would go here in a future iteration.
        */}
        <div className="flex h-full gap-0 divide-x divide-white/5">
          {/* Panel 1 — My Routines */}
          <div className="hidden sm:flex flex-col p-4 w-52 shrink-0 overflow-y-auto">
            <RoutineSidebar userId={user.id} />
          </div>

          {/* Panel 2 — Exercise Picker */}
          <div className="hidden sm:flex flex-col p-4 w-64 shrink-0 overflow-hidden">
            <AvailableExerciseList />
          </div>

          {/* Panel 3 — Routine Editor + Balance Analyser */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Mobile: show sidebar + picker as stacked top bar */}
            <div className="flex sm:hidden gap-0 divide-x divide-white/5 border-b border-white/5 overflow-x-auto shrink-0">
              <div className="p-3 min-w-[180px]">
                <RoutineSidebar userId={user.id} />
              </div>
              <div className="p-3 min-w-[220px]">
                <AvailableExerciseList />
              </div>
            </div>

            {/* Editor + Analyser split */}
            <div className="flex flex-1 gap-0 divide-x divide-white/5 overflow-hidden">
              {/* Routine Editor */}
              <div className="flex-1 overflow-hidden p-4">
                <RoutineEditor />
              </div>

              {/* Balance Analyser */}
              <div className="hidden lg:flex flex-col p-4 w-64 shrink-0 overflow-y-auto gap-3">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">
                  Muscle Balance
                </h2>
                <BalanceAnalyser />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
