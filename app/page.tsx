import Link from "next/link";
import { Dumbbell, Map, ClipboardList } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Digital Twin Gym
        </h1>
        <p className="text-gray-400 max-w-md">
          Map your physical equipment on a virtual gym floor, then generate
          calorie-accurate routines constrained to what you actually own.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 w-full max-w-2xl">
        <Link
          href="/gym-floor"
          className="flex flex-col items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-6 hover:bg-blue-500/20 transition-colors"
        >
          <Map className="h-8 w-8 text-blue-400" />
          <span className="font-semibold">Gym Floor</span>
          <span className="text-xs text-gray-400 text-center">
            Place & configure your equipment
          </span>
        </Link>

        <Link
          href="/routine-builder"
          className="flex flex-col items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-500/10 p-6 hover:bg-purple-500/20 transition-colors"
        >
          <ClipboardList className="h-8 w-8 text-purple-400" />
          <span className="font-semibold">Routine Builder</span>
          <span className="text-xs text-gray-400 text-center">
            Build calorie-accurate workouts
          </span>
        </Link>

        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 opacity-50 cursor-not-allowed">
          <Dumbbell className="h-8 w-8 text-gray-400" />
          <span className="font-semibold">Profile</span>
          <span className="text-xs text-gray-400 text-center">
            Set weight for calorie calc
          </span>
        </div>
      </div>
    </main>
  );
}
