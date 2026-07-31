import { describe, it, expect } from "vitest";
import { extractJson } from "@/lib/ai/providers/anthropic";

describe("extractJson", () => {
  it("pulls the object out of surrounding prose and fences", () => {
    const raw = 'Here you go:\n```json\n{"a":1,"b":[2,3]}\n```\nthanks!';
    expect(JSON.parse(extractJson(raw))).toEqual({ a: 1, b: [2, 3] });
  });

  it("handles a bare object", () => {
    expect(JSON.parse(extractJson('{"x":true}'))).toEqual({ x: true });
  });

  it("throws when there is no object", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});
