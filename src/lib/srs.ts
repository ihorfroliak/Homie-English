// Spaced repetition — schedule from the spec: Day 1, 3, 7, 14, 30.
// A correct review advances one step; a miss resets to the first step.
const SCHEDULE = [1, 3, 7, 14, 30];

export type ReviewGrade = "again" | "good";

export function nextSchedule(
  reps: number,
  grade: ReviewGrade
): { reps: number; intervalDays: number; dueAt: Date; status: string } {
  const nextReps = grade === "good" ? reps + 1 : 0;
  const idx = Math.min(nextReps, SCHEDULE.length - 1);
  const intervalDays = SCHEDULE[idx];

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + intervalDays);

  // Status derived from progress through the schedule.
  let status = "Learning";
  if (nextReps === 0) status = "Learning";
  else if (nextReps >= SCHEDULE.length) status = "Mastered";
  else if (nextReps >= 2) status = "Reviewing";

  return { reps: nextReps, intervalDays, dueAt, status };
}
