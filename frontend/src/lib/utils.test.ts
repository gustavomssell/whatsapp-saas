import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility", () => {
  it("merges class names", () => {
    const result = cn("class1", "class2");
    expect(result).toContain("class1");
    expect(result).toContain("class2");
  });

  it("handles conditional classes", () => {
    const hidden = false;
    const result = cn("base", hidden && "hidden", "extra");
    expect(result).toContain("base");
    expect(result).not.toContain("hidden");
    expect(result).toContain("extra");
  });

  it("merges tailwind classes correctly", () => {
    const result = cn("px-4 py-2", "px-8");
    expect(result).toContain("py-2");
    expect(result).toContain("px-8");
    expect(result).not.toContain("px-4");
  });

  it("returns empty string for no args", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("handles undefined and null", () => {
    const result = cn("base", undefined, null);
    expect(result).toContain("base");
  });
});
