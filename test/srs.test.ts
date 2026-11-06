import { describe, it, expect } from "vitest";
import { nextSchedule } from "@/lib/srs";

describe("nextSchedule", () => {
  it("follows the spec schedule Day 1, 3, 7, 14, 30 on 'good'", () => {
    const intervals = [0, 1, 2, 3, 4].map(
      (reps) => nextSchedule(reps, "good").intervalDays
    );
    expect(intervals).toEqual([1, 3, 7, 14, 30]);
  });

  it("stays at the last step after the schedule ends", () => {
    expect(nextSchedule(9, "good").intervalDays).toBe(30);
  });

  it("resets to the first step on 'again'", () => {
    const s = nextSchedule(3, "again");
    expect(s.reps).toBe(0);
    expect(s.intervalDays).toBe(1);
    expect(s.status).toBe("Learning");
  });

  it("derives status from progress", () => {
    expect(nextSchedule(0, "good").status).toBe("Learning");
    expect(nextSchedule(1, "good").status).toBe("Reviewing");
    expect(nextSchedule(3, "good").status).toBe("Reviewing");
    expect(nextSchedule(4, "good").status).toBe("Mastered");
  });

  it("sets dueAt in the future", () => {
    expect(nextSchedule(0, "good").dueAt.getTime()).toBeGreaterThan(Date.now());
  });
});
