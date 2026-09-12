import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";

describe("useBrowserNotifications", () => {
  it("reports support correctly", () => {
    const { result } = renderHook(() => useBrowserNotifications());
    expect(typeof result.current.supported).toBe("boolean");
  });

  it("has requestPermission function", () => {
    const { result } = renderHook(() => useBrowserNotifications());
    expect(typeof result.current.requestPermission).toBe("function");
  });

  it("has notify function", () => {
    const { result } = renderHook(() => useBrowserNotifications());
    expect(typeof result.current.notify).toBe("function");
  });
});
