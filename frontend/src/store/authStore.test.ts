import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/store/authStore";

describe("AuthStore", () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    localStorage.clear();
  });

  it("should start with no auth", () => {
    const { token, user, orgId } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(user).toBeNull();
    expect(orgId).toBeNull();
  });

  it("should set auth correctly", () => {
    const mockUser = {
      id: "user-1",
      org_id: "org-1",
      name: "Test User",
      email: "test@test.com",
      role: "owner",
      avatar: "",
      phone: "",
    };

    useAuthStore.getState().setAuth("token-123", mockUser);

    const { token, user, orgId } = useAuthStore.getState();
    expect(token).toBe("token-123");
    expect(user).toEqual(mockUser);
    expect(orgId).toBe("org-1");
  });

  it("should clear auth on logout", () => {
    const mockUser = {
      id: "user-1",
      org_id: "org-1",
      name: "Test User",
      email: "test@test.com",
      role: "owner",
      avatar: "",
      phone: "",
    };

    useAuthStore.getState().setAuth("token-123", mockUser);
    useAuthStore.getState().logout();

    const { token, user, orgId } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(user).toBeNull();
    expect(orgId).toBeNull();
  });

  it("should update user with setUser", () => {
    const mockUser = {
      id: "user-1",
      org_id: "org-1",
      name: "Test User",
      email: "test@test.com",
      role: "owner",
      avatar: "",
      phone: "",
    };

    useAuthStore.getState().setAuth("token-123", mockUser);
    useAuthStore.getState().setUser({ ...mockUser, name: "Updated Name" });

    const { user } = useAuthStore.getState();
    expect(user?.name).toBe("Updated Name");
  });
});
