import { describe, it, expect } from "vitest";
import { api } from "@/services/api";

describe("API Service", () => {
  it("api object has all expected methods", () => {
    expect(typeof api.login).toBe("function");
    expect(typeof api.register).toBe("function");
    expect(typeof api.getProfile).toBe("function");
    expect(typeof api.getConversations).toBe("function");
    expect(typeof api.getMessages).toBe("function");
    expect(typeof api.sendMessage).toBe("function");
    expect(typeof api.getGroups).toBe("function");
    expect(typeof api.getDashboardStats).toBe("function");
    expect(typeof api.getDashboardChart).toBe("function");
    expect(typeof api.getContacts).toBe("function");
    expect(typeof api.createContact).toBe("function");
    expect(typeof api.updateContact).toBe("function");
    expect(typeof api.deleteContact).toBe("function");
    expect(typeof api.getAutoReplyRules).toBe("function");
    expect(typeof api.createAutoReplyRule).toBe("function");
    expect(typeof api.updateAutoReplyRule).toBe("function");
    expect(typeof api.deleteAutoReplyRule).toBe("function");
    expect(typeof api.getWelcomeMessage).toBe("function");
    expect(typeof api.updateWelcomeMessage).toBe("function");
    expect(typeof api.getOrgMembers).toBe("function");
    expect(typeof api.updateMemberRole).toBe("function");
    expect(typeof api.removeMember).toBe("function");
    expect(typeof api.updateProfile).toBe("function");
    expect(typeof api.changePassword).toBe("function");
    expect(typeof api.getAuditLogs).toBe("function");
    expect(typeof api.getDashboardGuideStats).toBe("function");
    expect(typeof api.getDashboardTopContacts).toBe("function");
    expect(typeof api.getDashboardResponseTime).toBe("function");
    expect(typeof api.exportReport).toBe("function");
  });
});
