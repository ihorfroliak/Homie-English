import { describe, it, expect } from "vitest";
import { nextSchedule } from "@/lib/srs";

describe("nextSchedule", () => {
  it("advances through the schedule on 'good'", () => {
    expect(nextSchedule(0, "good").intervalDays).toBe(3); // reps 0 -> 1
    expect(nextSchedule(1, "good").intervalDays).toBe(7);
    expect(nextSchedule(2, "good").intervalDays).toBe(14);
    expect(nextSchedule(3, "good").intervalDays).toBe(30);
  });

  it("resets to the first step on 'again'", () => {
    const s = nextSchedule(3, "again");
    expect(s.reps).toBe(0);
    expect(s.intervalDays).toBe(1);
    expect(s.status).toBe("Learning");
  });

  it("marks Mastered once past the schedule", () => {
    expect(nextSchedule(4, "good").status).toBe("Mastered");
  });

  it("sets dueAt in the future", () => {
    expect(nextSchedule(0, "good").dueAt.getTime()).toBeGreaterThan(Date.now());
  });
});
