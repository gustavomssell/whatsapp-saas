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

  updateMessageContent: (remoteMsgID: string, content: string) =>
    apiClient.post<any>("/whatsapp/conversations/edit", { msg_id: remoteMsgID, text: content }).then((r) => r.data),

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
    apiClient.get<any[]>("/whatsapp/groups").then((r) => r.data),

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

  editMessage: (jid: string, msgId: string, text: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/edit`, { msg_id: msgId, text }).then((r) => r.data),

  getTagColors: () =>
    apiClient.get<any[]>("/whatsapp/tag-colors").then((r) => r.data),

  setTagColor: (tag: string, color: string) =>
    apiClient.post<any>("/whatsapp/tag-colors", { tag, color }).then((r) => r.data),

  deleteTagColor: (tag: string) =>
    apiClient.delete<any>(`/whatsapp/tag-colors/${encodeURIComponent(tag)}`).then((r) => r.data),

  getNotes: (convJid: string) =>
    apiClient.get<{ data: any[] }>(`/whatsapp/conversations/${encodeURIComponent(convJid)}/notes`).then((r) => r.data),

  createNote: (convJid: string, userName: string, content: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${encodeURIComponent(convJid)}/notes`, { user_name: userName, content }).then((r) => r.data),

  getContacts: (query?: string) =>
    apiClient.get<{ data: any[] }>("/whatsapp/contacts", { params: query ? { q: query } : undefined }).then((r) => r.data),

  getMembers: () =>
    apiClient.get<{ data: any[] }>("/members").then((r) => r.data),

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
