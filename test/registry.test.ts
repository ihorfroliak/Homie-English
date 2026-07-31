import { describe, it, expect, afterEach } from "vitest";
import { getProvider } from "@/lib/ai/registry";

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
});

describe("getProvider", () => {
  it("returns the stub provider when AI_PROVIDER=stub", () => {
    process.env.AI_PROVIDER = "stub";
    expect(getProvider()?.name).toBe("stub");
  });

  it("returns null for anthropic when no key is set", () => {
    process.env.AI_PROVIDER = "anthropic";
    delete process.env.ANTHROPIC_API_KEY;
    expect(getProvider()).toBeNull();
  });

  it("returns the anthropic provider when a key is present", () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "sk-test";
    expect(getProvider()?.name).toBe("anthropic");
  });
});
