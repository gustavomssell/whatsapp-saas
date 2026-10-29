import { apiClient } from "@/lib/apiClient";

export const api = {
  login: (email: string, password: string) =>
    apiClient.post<{ token: string; user: any }>("/auth/login", { email, password }).then((r) => r.data),

  register: (name: string, email: string, password: string, org_name: string) =>
    apiClient.post<{ token: string; user: any }>("/auth/register", { name, email, password, org_name }).then((r) => r.data),

  getProfile: () =>
    apiClient.get<{ user_id: string; org_id: string }>("/auth/profile").then((r) => r.data),

  getConversations: (params?: Record<string, string>) =>
    apiClient.get<{ data: any[]; total: number }>("/whatsapp/conversations", { params }).then((r) => r.data),

  getMessages: (jid: string) =>
    apiClient.get<any[]>(`/whatsapp/conversations/${encodeURIComponent(jid)}/messages`).then((r) => r.data),

  sendMessage: (jid: string, text: string, quotedMsgId?: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/messages`, { text, quoted_msg_id: quotedMsgId }).then((r) => r.data),

  sendMedia: (jid: string, mediaUrl: string, mediaType: string, caption?: string, quotedMsgId?: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/media`, { media_url: mediaUrl, media_type: mediaType, caption, quoted_msg_id: quotedMsgId }).then((r) => r.data),

  sendReaction: (jid: string, msgId: string, emoji: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/reaction`, { msg_id: msgId, emoji }).then((r) => r.data),

  archiveConversation: (jid: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/archive`).then((r) => r.data),

  unarchiveConversation: (jid: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/unarchive`).then((r) => r.data),

  assignGuide: (jid: string, guide: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/assign`, { guide }).then((r) => r.data),

  updateTags: (jid: string, tags: string[]) =>
    apiClient.post<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/tags`, { tags }).then((r) => r.data),

  pinConversation: (jid: string, pinned: boolean) =>
    apiClient.post<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/pin`, { pinned }).then((r) => r.data),

  updateMessageContent: (jid: string, msgId: string, content: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/edit`, { msg_id: msgId, text: content }).then((r) => r.data),

  // ── Novos endpoints Evolution API ─────────────────────────────

  sendAudio: (jid: string, audioUrl: string) =>
    apiClient.post<any>("/whatsapp/audio", { jid, audio_url: audioUrl }).then((r) => r.data),

  sendPresence: (jid: string, presence: string) =>
    apiClient.post<any>("/whatsapp/presence", { jid, presence }).then((r) => r.data),

  deleteEvolutionMessage: (jid: string, msgId: string, forEveryone: boolean) =>
    apiClient.delete<any>(`/whatsapp/messages/${encodeURIComponent(jid)}/${encodeURIComponent(msgId)}`, { data: { for_everyone: forEveryone } }).then((r) => r.data),

  updateEvolutionMessage: (jid: string, msgId: string, text: string) =>
    apiClient.put<any>(`/whatsapp/messages/${encodeURIComponent(jid)}/${encodeURIComponent(msgId)}`, { text }).then((r) => r.data),

  markAsRead: (jid: string, msgId: string, fromMe: boolean) =>
    apiClient.put<any>(`/whatsapp/chats/${encodeURIComponent(jid)}/markAsRead`, { msg_id: msgId, from_me: fromMe }).then((r) => r.data),

  fetchProfile: (number: string) =>
    apiClient.get<any>(`/whatsapp/profile/${encodeURIComponent(number)}`).then((r) => r.data),

  hasWhatsApp: (numbers: string[]) =>
    apiClient.post<any>("/whatsapp/chats/hasWhatsApp", { numbers }).then((r) => r.data),

  createEvolutionGroup: (subject: string, description: string, participants: string[]) =>
    apiClient.post<any>("/groups/create", { subject, description, participants }).then((r) => r.data),

  updateGroupParticipant: (groupJid: string, action: string, participants: string[]) =>
    apiClient.put<any>(`/groups/${encodeURIComponent(groupJid)}/participant`, { action, participants }).then((r) => r.data),

  connectWhatsApp: (instanceName: string, webhookUrl: string) =>
    apiClient.post<{ qr_code: string }>("/whatsapp/connect", { instance_name: instanceName, webhook_url: webhookUrl }).then((r) => r.data),

  getWhatsAppStatus: () =>
    apiClient.get<{ status: string; instance_name: string }>("/whatsapp/status").then((r) => r.data),

  disconnectWhatsApp: () =>
    apiClient.post<any>("/whatsapp/disconnect").then((r) => r.data),

  getDashboardStats: () =>
    apiClient.get<any>("/dashboard/stats").then((r) => r.data),

  getDashboardChart: (days?: number) =>
    apiClient.get<{ data: any[] }>("/dashboard/chart", { params: days ? { days } : undefined }).then((r) => r.data),

  getGroups: () =>
    apiClient.get<any[]>("/groups").then((r) => r.data),

  getQuickReplies: () =>
    apiClient.get<any[]>("/whatsapp/quick-replies").then((r) => r.data),

  createQuickReply: (shortcut: string, title: string, content: string, variables?: string[], mediaUrl?: string, mediaType?: string) =>
    apiClient.post<any>("/whatsapp/quick-replies", { shortcut, title, content, variables, media_url: mediaUrl || "", media_type: mediaType || "" }).then((r) => r.data),

  deleteQuickReply: (qrId: string) =>
    apiClient.delete<any>(`/whatsapp/quick-replies/${qrId}`).then((r) => r.data),

  deleteMessage: (jid: string, msgId: string, forEveryone: boolean) =>
    apiClient.delete<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/messages/${encodeURIComponent(msgId)}`, { data: { for_everyone: forEveryone } }).then((r) => r.data),

  forwardMessage: (jid: string, msgId: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/forward`, { msg_id: msgId }).then((r) => r.data),

  searchMessages: (jid: string, query: string) =>
    apiClient.get<any[]>(`/whatsapp/conversations/${encodeURIComponent(jid)}/search`, { params: { q: query } }).then((r) => r.data),

  getTagColors: () =>
    apiClient.get<any[]>("/tag-colors").then((r) => r.data),

  setTagColor: (tag: string, color: string) =>
    apiClient.post<any>("/tag-colors", { tag, color }).then((r) => r.data),

  deleteTagColor: (tag: string) =>
    apiClient.delete<any>(`/tag-colors/${encodeURIComponent(tag)}`).then((r) => r.data),

  getNotes: (convJid: string) =>
    apiClient.get<{ data: any[] }>(`/whatsapp/conversations/${encodeURIComponent(convJid)}/notes`).then((r) => r.data),

  createNote: (convJid: string, userName: string, content: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${encodeURIComponent(convJid)}/notes`, { user_name: userName, content }).then((r) => r.data),

  getContacts: (query?: string) =>
    apiClient.get<{ data: any[] }>("/whatsapp/contacts", { params: query ? { q: query } : undefined }).then((r) => r.data),

  listContacts: (params?: { search?: string; tag?: string; page?: number; per_page?: number }) =>
    apiClient.get<{ data: any[]; total: number }>("/contacts", { params }).then((r) => r.data),

  getContact: (contactId: string) =>
    apiClient.get<any>(`/contacts/${contactId}`).then((r) => r.data),

  createContact: (data: { phone: string; name?: string; email?: string; company?: string; tags?: string[]; notes?: string; avatar_url?: string; is_whatsapp?: boolean }) =>
    apiClient.post<any>("/contacts", data).then((r) => r.data),

  updateContact: (contactId: string, data: { name?: string; email?: string; company?: string; tags?: string[]; notes?: string; avatar_url?: string; is_whatsapp?: boolean }) =>
    apiClient.put<any>(`/contacts/${contactId}`, data).then((r) => r.data),

  deleteContact: (contactId: string) =>
    apiClient.delete<any>(`/contacts/${contactId}`).then((r) => r.data),

  syncContactsFromWhatsApp: () =>
    apiClient.post<any>("/contacts/sync").then((r) => r.data),

  exportContactsCSV: () =>
    apiClient.get("/contacts/export", { responseType: "blob" } as any).then((r) => r.data),

  importContactsCSV: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<any>("/contacts/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  bulkDeleteContacts: (ids: string[]) =>
    apiClient.post<any>("/contacts/bulk-delete", { ids }).then((r) => r.data),

  getMembers: () =>
    apiClient.get<{ data: any[] }>("/members").then((r) => r.data),

  getOrgMembers: () =>
    apiClient.get<any[]>("/org-members").then((r) => r.data),

  updateMemberRole: (memberId: string, role: string) =>
    apiClient.put<any>(`/org-members/${memberId}/role`, { role }).then((r) => r.data),

  removeMember: (memberId: string) =>
    apiClient.delete<any>(`/org-members/${memberId}`).then((r) => r.data),

  updateProfile: (data: { name: string; email: string; phone: string; avatar: string }) =>
    apiClient.put<any>("/profile", data).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post<any>("/profile/change-password", { current_password: currentPassword, new_password: newPassword }).then((r) => r.data),

  updateGroup: (groupJid: string, data: { subject: string; description: string }) =>
    apiClient.put<any>(`/whatsapp/groups/${groupJid}`, data).then((r) => r.data),

  deleteGroup: (groupJid: string) =>
    apiClient.delete<any>(`/whatsapp/groups/${groupJid}`).then((r) => r.data),

  getGroupInviteLink: (groupJid: string) =>
    apiClient.get<any>(`/whatsapp/groups/${groupJid}/invite-link`).then((r) => r.data),

  getAuditLogs: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<{ data: any[]; total: number }>("/audit-logs", { params }).then((r) => r.data),

  getAutoReplyRules: () =>
    apiClient.get<any[]>("/auto-reply-rules").then((r) => r.data),

  createAutoReplyRule: (data: { name: string; trigger_type: string; trigger_value: string; response_text: string; is_active: boolean }) =>
    apiClient.post<any>("/auto-reply-rules", data).then((r) => r.data),

  updateAutoReplyRule: (ruleId: string, data: { name: string; trigger_type: string; trigger_value: string; response_text: string; is_active: boolean }) =>
    apiClient.put<any>(`/auto-reply-rules/${ruleId}`, data).then((r) => r.data),

  deleteAutoReplyRule: (ruleId: string) =>
    apiClient.delete<any>(`/auto-reply-rules/${ruleId}`).then((r) => r.data),

  getWelcomeMessage: () =>
    apiClient.get<any>("/welcome-message").then((r) => r.data),

  updateWelcomeMessage: (data: { message: string; is_active: boolean }) =>
    apiClient.put<any>("/welcome-message", data).then((r) => r.data),

  getDashboardGuideStats: () =>
    apiClient.get<any[]>("/dashboard/guide-stats").then((r) => r.data),

  getDashboardTopContacts: (limit?: number) =>
    apiClient.get<any[]>("/dashboard/top-contacts", { params: limit ? { limit } : undefined }).then((r) => r.data),

  getDashboardResponseTime: () =>
    apiClient.get<any>("/dashboard/response-time").then((r) => r.data),

  exportReport: (period: string) =>
    apiClient.get("/dashboard/export", { params: { period }, responseType: "blob" } as any).then((r) => r.data),

  getPlans: () =>
    apiClient.get<any[]>("/billing/plans").then((r) => r.data),

  getOrgPlan: () =>
    apiClient.get<any>("/billing/plan").then((r) => r.data),

  subscribePlan: (planName: string, billingCycle: string = "monthly") =>
    apiClient.post<any>("/billing/subscribe", { plan_name: planName, billing_cycle: billingCycle }).then((r) => r.data),

  cancelSubscription: () =>
    apiClient.post<any>("/billing/cancel").then((r) => r.data),

  getUsage: (period?: string) =>
    apiClient.get<any>("/billing/usage", { params: period ? { period } : undefined }).then((r) => r.data),

  getInvoices: () =>
    apiClient.get<any[]>("/billing/invoices").then((r) => r.data),

  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<{ url: string; fileName: string; mimeType: string }>("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
};
