"use client";

import { useEffect } from "react";
import { useRoutineStore } from "@/store/routineStore";
import { Exercise, Routine } from "@/types";

interface RoutineBuilderBootstrapProps {
  availableExercises: Exercise[];
  routines: Routine[];
  userWeightKg: number;
}

export function RoutineBuilderBootstrap({
  availableExercises,
  routines,
  userWeightKg,
}: RoutineBuilderBootstrapProps) {
  const storeIsEmpty = useRoutineStore((s) => s.availableExercises.length === 0);

  useEffect(() => {
    if (!storeIsEmpty) return;
    const exerciseMap = new Map(availableExercises.map((e) => [e.id, e]));
    useRoutineStore.setState({
      availableExercises,
      routines,
      exerciseMap,
      userWeightKg,
      isLoading: false,
    });
  }, [storeIsEmpty, availableExercises, routines, userWeightKg]);

  return null;
}
