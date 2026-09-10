const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("wpsaas-auth");
  let parsed: { state?: { token?: string } } = {};
  try {
    parsed = JSON.parse(token || "{}");
  } catch {
    parsed = {};
  }
  const authToken = parsed?.state?.token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("wpsaas-auth");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Erro na requisição");
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string, org_name: string) =>
    request<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, org_name }),
    }),

  getProfile: () => request<{ user_id: string; org_id: string }>("/auth/profile"),

  getConversations: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ data: any[]; total: number }>(`/whatsapp/conversations${qs}`);
  },

  getMessages: (jid: string) =>
    request<any[]>(`/whatsapp/conversations/${encodeURIComponent(jid)}/messages`),

  sendMessage: (jid: string, text: string, quotedMsgId?: string) =>
    request<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/messages`, {
      method: "POST",
      body: JSON.stringify({ text, quoted_msg_id: quotedMsgId }),
    }),

  sendMedia: (jid: string, mediaUrl: string, mediaType: string, caption?: string, quotedMsgId?: string) =>
    request<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/media`, {
      method: "POST",
      body: JSON.stringify({ media_url: mediaUrl, media_type: mediaType, caption, quoted_msg_id: quotedMsgId }),
    }),

  sendReaction: (jid: string, msgId: string, emoji: string) =>
    request<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/reaction`, {
      method: "POST",
      body: JSON.stringify({ msg_id: msgId, emoji }),
    }),

  archiveConversation: (jid: string) =>
    request<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/archive`, { method: "POST" }),

  unarchiveConversation: (jid: string) =>
    request<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/unarchive`, { method: "POST" }),

  assignGuide: (jid: string, guide: string) =>
    request<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/assign`, {
      method: "POST",
      body: JSON.stringify({ guide }),
    }),

  updateTags: (jid: string, tags: string[]) =>
    request<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/tags`, {
      method: "POST",
      body: JSON.stringify({ tags }),
    }),

  pinConversation: (jid: string, pinned: boolean) =>
    request<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/pin`, {
      method: "POST",
      body: JSON.stringify({ pinned }),
    }),

  updateMessageContent: (remoteMsgID: string, content: string) =>
    request<any>(`/whatsapp/conversations/edit`, {
      method: "POST",
      body: JSON.stringify({ msg_id: remoteMsgID, text: content }),
    }),

  connectWhatsApp: (instanceName: string, webhookUrl: string) =>
    request<{ qr_code: string }>("/whatsapp/connect", {
      method: "POST",
      body: JSON.stringify({ instance_name: instanceName, webhook_url: webhookUrl }),
    }),

  getWhatsAppStatus: () =>
    request<{ status: string; instance_name: string }>("/whatsapp/status"),

  disconnectWhatsApp: () =>
    request<any>("/whatsapp/disconnect", { method: "POST" }),

  getDashboardStats: () => request<any>("/dashboard/stats"),

  getDashboardChart: (days?: number) => {
    const qs = days ? `?days=${days}` : "";
    return request<{ data: any[] }>(`/dashboard/chart${qs}`);
  },

  getGroups: () => request<any[]>("/whatsapp/groups"),

  getQuickReplies: () =>
    request<any[]>("/whatsapp/quick-replies"),

  createQuickReply: (shortcut: string, title: string, content: string, variables?: string[], mediaUrl?: string, mediaType?: string) =>
    request<any>("/whatsapp/quick-replies", {
      method: "POST",
      body: JSON.stringify({ shortcut, title, content, variables, media_url: mediaUrl || "", media_type: mediaType || "" }),
    }),

  deleteQuickReply: (qrId: string) =>
    request<any>(`/whatsapp/quick-replies/${qrId}`, { method: "DELETE" }),

  deleteMessage: (jid: string, msgId: string, forEveryone: boolean) =>
    request<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/messages/${encodeURIComponent(msgId)}`, {
      method: "DELETE",
      body: JSON.stringify({ for_everyone: forEveryone }),
    }),

  forwardMessage: (jid: string, msgId: string) =>
    request<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/forward`, {
      method: "POST",
      body: JSON.stringify({ msg_id: msgId }),
    }),

  searchMessages: (jid: string, query: string) =>
    request<any[]>(`/whatsapp/conversations/${encodeURIComponent(jid)}/search?q=${encodeURIComponent(query)}`),

  editMessage: (jid: string, msgId: string, text: string) =>
    request<any>(`/whatsapp/conversations/${encodeURIComponent(jid)}/edit`, {
      method: "POST",
      body: JSON.stringify({ msg_id: msgId, text }),
    }),

  getTagColors: () =>
    request<any[]>("/whatsapp/tag-colors"),

  setTagColor: (tag: string, color: string) =>
    request<any>("/whatsapp/tag-colors", {
      method: "POST",
      body: JSON.stringify({ tag, color }),
    }),

  deleteTagColor: (tag: string) =>
    request<any>(`/whatsapp/tag-colors/${encodeURIComponent(tag)}`, { method: "DELETE" }),

  getNotes: (convJid: string) =>
    request<{ data: any[] }>(`/whatsapp/conversations/${encodeURIComponent(convJid)}/notes`),

  createNote: (convJid: string, userName: string, content: string) =>
    request<any>(`/whatsapp/conversations/${encodeURIComponent(convJid)}/notes`, {
      method: "POST",
      body: JSON.stringify({ user_name: userName, content }),
    }),

  getContacts: (query?: string) => {
    const qs = query ? `?q=${encodeURIComponent(query)}` : "";
    return request<{ data: any[] }>(`/whatsapp/contacts${qs}`);
  },

  getMembers: () =>
    request<{ data: any[] }>("/members"),

  uploadFile: async (file: File) => {
    const token = localStorage.getItem("wpsaas-auth");
    let parsed: { state?: { token?: string } } = {};
    try {
      parsed = JSON.parse(token || "{}");
    } catch {
      parsed = {};
    }
    const authToken = parsed?.state?.token;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Erro no upload");
    }
    return res.json() as Promise<{ url: string; fileName: string; mimeType: string }>;
  },
};
