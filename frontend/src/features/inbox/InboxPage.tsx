import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useSocket } from "@/hooks/useSocket";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import { useNotes } from "@/hooks/useNotes";
import {
  Send,
  ArrowLeft,
  Paperclip,
  Search,
  Archive,
  UserPlus,
  Pin,
  Mic,
  Square,
  StickyNote,
  Tag,
  X,
  Check,
  Smile,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  jid: string;
  name: string;
  phone: string;
  is_group: boolean;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  avatar_url: string;
  is_pinned: boolean;
  tags: string[];
  assigned_guide: string;
}

interface Message {
  id: string;
  remote_msg_id: string;
  sender: string;
  sender_name: string;
  content: string;
  msg_type: string;
  media_url: string;
  media_type: string;
  from_me: boolean;
  status: string;
  timestamp: string;
  reactions: string[];
  quoted_msg_id: string;
  is_edited: boolean;
  is_deleted: boolean;
}

interface Member {
  id: string;
  name: string;
  email: string;
}

interface TagColor {
  tag: string;
  color: string;
}

const EMOJI_LIST = ["😀", "👍", "❤️", "🔥", "😂", "🙏", "👏", "Ok", "🎉", "💯"];
const TAG_COLORS = ["#00FFA7", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#FF8C00", "#87CEEB", "#98FB98"];

export default function InboxPage() {
  const { jid } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [noteText, setNoteText] = useState("");
  const [quotedMessage, setQuotedMessage] = useState<{ id: string; content: string } | null>(null);
  const [editingMsg, setEditingMsg] = useState<{ id: string; content: string } | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Infinite scroll
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const MSG_LIMIT = 50;

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Panels
  const [showNotes, setShowNotes] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showForwardModal, setShowForwardModal] = useState<string | null>(null);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardResults, setForwardResults] = useState<Conversation[]>([]);
  const [chatSearch, setChatSearch] = useState("");
  const [chatSearchResults, setChatSearchResults] = useState<any[]>([]);
  const [showChatSearch, setShowChatSearch] = useState(false);

  // Guide/Tags
  const [members, setMembers] = useState<Member[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagColors, setTagColors] = useState<TagColor[]>([]);

  // Typing indicator
  const [typingJid, setTypingJid] = useState<string | null>(null);

  // Bulk actions
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  const [showBulkBar, setShowBulkBar] = useState(false);

  const handleWSMessage = useCallback(
    (msg: any) => {
      if (msg.type === "typing") {
        setTypingJid(msg.remote_jid);
        setTimeout(() => setTypingJid(null), 3000);
        return;
      }

      if (msg.type === "new_message" && selectedConv) {
        const payload = msg.payload;
        if (payload.remote_jid === selectedConv.jid) {
          setMessages((prev) => {
            if (prev.some((m) => m.remote_msg_id === payload.remote_msg_id))
              return prev;
            return [
              ...prev,
              {
                id: payload.id || crypto.randomUUID(),
                remote_msg_id: payload.remote_msg_id,
                sender: payload.sender || "",
                sender_name: payload.sender_name || "",
                content: payload.content || "",
                msg_type: payload.msg_type || "text",
                media_url: payload.media_url || "",
                media_type: payload.media_type || "",
                from_me: payload.from_me || false,
                status: payload.status || "delivered",
                timestamp: payload.timestamp || new Date().toISOString(),
                reactions: payload.reactions || [],
                quoted_msg_id: payload.quoted_msg_id || "",
                is_edited: payload.is_edited || false,
                is_deleted: payload.is_deleted || false,
              },
            ];
          });
          setTimeout(
            () => messagesEnd.current?.scrollIntoView({ behavior: "smooth" }),
            100
          );
        }
      }
      if (msg.type === "new_message" && !selectedConv) {
        api.getConversations().then((res) => setConversations(res.data || [])).catch(console.error);
      }
      if (msg.type === "message_status" && selectedConv) {
        setMessages((prev) =>
          prev.map((m) =>
            m.remote_msg_id === msg.payload.remote_msg_id
              ? { ...m, status: msg.payload.status }
              : m
          )
        );
      }
      if (msg.type === "message_deleted" && selectedConv) {
        setMessages((prev) =>
          prev.map((m) =>
            m.remote_msg_id === msg.payload.remote_msg_id
              ? { ...m, is_deleted: true, content: "Mensagem excluida" }
              : m
          )
        );
      }
    },
    [selectedConv]
  );

  const { connected } = useSocket(handleWSMessage);
  const { data: quickReplies } = useQuickReplies();
  const { data: notes, loading: notesLoading, addNote } = useNotes(selectedConv?.jid || "");

  useEffect(() => {
    api.getTagColors().then((colors) => setTagColors(colors || [])).catch(console.error);
  }, []);

  useEffect(() => {
    api
      .getConversations()
      .then((res) => setConversations(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (jid) {
      const conv = conversations.find((c) => c.jid === jid);
      if (conv) {
        setSelectedConv(conv);
        loadMessages(jid, true);
      }
    }
  }, [jid, conversations]);

  const loadMessages = async (convJid: string, reset: boolean = false) => {
    if (loadingMore && !reset) return;
    setLoadingMore(true);
    try {
      const msgs = await api.getMessages(convJid);
      const allMsgs = msgs || [];
      if (reset) {
        setMessages(allMsgs);
        setHasMore(allMsgs.length >= MSG_LIMIT);
        setTimeout(
          () => messagesEnd.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );
      } else {
        setMessages((prev) => [...allMsgs.slice(0, allMsgs.length - prev.length), ...prev]);
        setHasMore(allMsgs.length >= MSG_LIMIT);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container || !selectedConv || !hasMore || loadingMore) return;
    if (container.scrollTop < 100) {
      loadMessages(selectedConv.jid, false);
    }
  }, [selectedConv, hasMore, loadingMore]);

  const handleSend = async () => {
    if (!text.trim() || !selectedConv || sending) return;
    setSending(true);
    try {
      if (editingMsg) {
        await api.updateMessageContent(editingMsg.id, text.trim());
        setMessages((prev) =>
          prev.map((m) =>
            m.remote_msg_id === editingMsg.id
              ? { ...m, content: text.trim(), is_edited: true }
              : m
          )
        );
        setEditingMsg(null);
      } else {
        const msg = await api.sendMessage(selectedConv.jid, text.trim(), quotedMessage?.id);
        setMessages((prev) => [...prev, { ...msg, quoted_msg_id: quotedMessage?.id || "" }]);
        setQuotedMessage(null);
      }
      setText("");
      setTimeout(
        () => messagesEnd.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    try {
      const uploaded = await api.uploadFile(file);
      await api.sendMedia(selectedConv.jid, uploaded.url, uploaded.mimeType);
      loadMessages(selectedConv.jid, true);
    } catch (err) {
      console.error(err);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        if (!selectedConv) return;

        const file = new File([blob], "audio.webm", { type: "audio/webm" });
        try {
          const uploaded = await api.uploadFile(file);
          await api.sendMedia(selectedConv.jid, uploaded.url, "audio/webm");
          loadMessages(selectedConv.jid, true);
        } catch (err) {
          console.error(err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao iniciar gravacao:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!selectedConv) return;
    try {
      await api.sendReaction(selectedConv.jid, msgId, emoji);
      setMessages((prev) =>
        prev.map((m) =>
          m.remote_msg_id === msgId
            ? { ...m, reactions: [...(m.reactions || []), emoji] }
            : m
        )
      );
      setShowEmojiPicker(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (msgId: string, forEveryone: boolean) => {
    if (!selectedConv) return;
    try {
      await api.deleteMessage(selectedConv.jid, msgId, forEveryone);
      setMessages((prev) =>
        prev.map((m) =>
          m.remote_msg_id === msgId
            ? { ...m, is_deleted: true, content: "Mensagem excluida" }
            : m
        )
      );
      setShowDeleteModal(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleForwardMessage = async (targetJid: string) => {
    if (!showForwardModal || !targetJid) return;
    try {
      await api.forwardMessage(targetJid, showForwardModal);
      setShowForwardModal(null);
      setForwardSearch("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchForward = async (query: string) => {
    setForwardSearch(query);
    if (query.length < 2) {
      setForwardResults([]);
      return;
    }
    try {
      const res = await api.getConversations({ search: query });
      setForwardResults(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChatSearch = async (query: string) => {
    setChatSearch(query);
    if (query.length < 2 || !selectedConv) {
      setChatSearchResults([]);
      return;
    }
    try {
      const results = await api.searchMessages(selectedConv.jid, query);
      setChatSearchResults(results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignGuide = async (guide: string) => {
    if (!selectedConv) return;
    try {
      await api.assignGuide(selectedConv.jid, guide);
      setSelectedConv({ ...selectedConv, assigned_guide: guide });
      setConversations((prev) =>
        prev.map((c) => (c.jid === selectedConv.jid ? { ...c, assigned_guide: guide } : c))
      );
      setShowGuideModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTags = async (tags: string[]) => {
    if (!selectedConv) return;
    try {
      await api.updateTags(selectedConv.jid, tags);
      setSelectedConv({ ...selectedConv, tags });
      setConversations((prev) =>
        prev.map((c) => (c.jid === selectedConv.jid ? { ...c, tags } : c))
      );
      setShowTagModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePin = async () => {
    if (!selectedConv) return;
    try {
      await api.pinConversation(selectedConv.jid, !selectedConv.is_pinned);
      const newPinned = !selectedConv.is_pinned;
      setSelectedConv({ ...selectedConv, is_pinned: newPinned });
      setConversations((prev) =>
        prev.map((c) => (c.jid === selectedConv.jid ? { ...c, is_pinned: newPinned } : c))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedConvIds);
    if (ids.length === 0) return;
    try {
      if (action === "archive") {
        for (const id of ids) {
          const conv = conversations.find((c) => c.id === id);
          if (conv) await api.archiveConversation(conv.jid);
        }
        setConversations((prev) => prev.filter((c) => !selectedConvIds.has(c.id)));
      } else if (action === "tag" && tagInput.trim()) {
        for (const id of ids) {
          const conv = conversations.find((c) => c.id === id);
          if (conv) {
            const newTags = [...new Set([...(conv.tags || []), tagInput.trim()])];
            await api.updateTags(conv.jid, newTags);
          }
        }
      }
      setSelectedConvIds(new Set());
      setShowBulkBar(false);
      setTagInput("");
    } catch (err) {
      console.error(err);
    }
  };

  const getTagColor = (tag: string): string => {
    const found = tagColors.find((tc) => tc.tag === tag);
    return found?.color || TAG_COLORS[tag.length % TAG_COLORS.length];
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return formatTime(ts);
    }
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const filtered = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const loadMembers = async () => {
    try {
      const res = await api.getMembers();
      setMembers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-full">
      {/* Conversations list */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card",
          selectedConv && "hidden md:flex"
        )}
      >
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Inbox</h2>
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full",
                connected
                  ? "bg-green-500/10 text-green-500"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {connected ? "Online" : "Offline"}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
            />
          </div>
        </div>

        {/* Bulk actions bar */}
        {showBulkBar && selectedConvIds.size > 0 && (
          <div className="px-4 py-2 border-b border-border bg-primary/5 flex items-center gap-2">
            <span className="text-xs text-primary font-medium">{selectedConvIds.size} selecionadas</span>
            <button onClick={() => handleBulkAction("archive")} className="text-xs px-2 py-1 rounded bg-muted hover:bg-accent transition-colors">
              Arquivar
            </button>
            <button onClick={() => { setTagInput(""); }} className="text-xs px-2 py-1 rounded bg-muted hover:bg-accent transition-colors">
              Tag
            </button>
            <button onClick={() => { setSelectedConvIds(new Set()); setShowBulkBar(false); }} className="ml-auto text-xs text-muted-foreground">
              Cancelar
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {conversations.length === 0
                  ? "Nenhuma conversa encontrada"
                  : "Nenhuma conversa corresponde a busca"}
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.jid}
                onClick={() => {
                  if (showBulkBar) {
                    setSelectedConvIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(conv.id)) next.delete(conv.id);
                      else next.add(conv.id);
                      return next;
                    });
                  } else {
                    navigate(`/inbox/${conv.jid}`);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowBulkBar(true);
                  setSelectedConvIds((prev) => new Set([...prev, conv.id]));
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/50",
                  selectedConv?.jid === conv.jid && "bg-accent/50",
                  selectedConvIds.has(conv.id) && "bg-primary/5"
                )}
              >
                {showBulkBar && (
                  <div className={cn(
                    "w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center",
                    selectedConvIds.has(conv.id) ? "bg-primary border-primary" : "border-border"
                  )}>
                    {selectedConvIds.has(conv.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                )}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                  {conv.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      {conv.name || conv.phone}
                    </span>
                    {conv.last_message_at && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDate(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.last_message || "Sem mensagens"}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {conv.is_pinned && (
                        <Pin className="h-3 w-3 text-muted-foreground" />
                      )}
                      {conv.tags && conv.tags.length > 0 && (
                        <div className="flex items-center gap-0.5">
                          {conv.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded-full text-black font-medium"
                              style={{ backgroundColor: getTagColor(tag) }}
                            >
                              {tag}
                            </span>
                          ))}
                          {conv.tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{conv.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                      {conv.unread_count > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div
        className={cn(
          "flex-1 flex flex-col bg-background",
          !selectedConv && "hidden md:flex"
        )}
      >
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Send className="h-7 w-7 text-primary" />
              </div>
              <p className="text-muted-foreground">
                Selecione uma conversa para comecar
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 h-16 border-b border-border bg-card">
              <button
                onClick={() => navigate("/inbox")}
                className="md:hidden p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {selectedConv.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {selectedConv.name || selectedConv.phone}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      connected ? "bg-green-500" : "bg-muted-foreground"
                    )}
                  />
                  {selectedConv.is_group ? "Grupo" : selectedConv.phone}
                  {selectedConv.assigned_guide && (
                    <span className="text-primary ml-1">
                      | {selectedConv.assigned_guide}
                    </span>
                  )}
                  {typingJid === selectedConv.jid && (
                    <span className="text-primary animate-pulse ml-1">digitando...</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleTogglePin}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    selectedConv.is_pinned
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent text-muted-foreground"
                  )}
                  title={selectedConv.is_pinned ? "Desafixar" : "Fixar"}
                >
                  <Pin className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowTagModal(true)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    selectedConv.tags && selectedConv.tags.length > 0
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent text-muted-foreground"
                  )}
                  title="Tags"
                >
                  <Tag className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setShowGuideModal(true); loadMembers(); }}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    selectedConv.assigned_guide
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent text-muted-foreground"
                  )}
                  title="Atribuir guia"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    showNotes
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent text-muted-foreground"
                  )}
                  title="Notas"
                >
                  <StickyNote className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    await api.archiveConversation(selectedConv.jid);
                    setConversations((prev) => prev.filter((c) => c.jid !== selectedConv.jid));
                    setSelectedConv(null);
                    navigate("/inbox");
                  }}
                  className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
                  title="Arquivar"
                >
                  <Archive className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowChatSearch(!showChatSearch)}
                  className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
                  title="Buscar na conversa"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>

            {showChatSearch && (
              <div className="px-4 py-2 border-b border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Buscar na conversa..."
                    value={chatSearch}
                    onChange={(e) => handleChatSearch(e.target.value)}
                    autoFocus
                    className="flex-1 bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => { setShowChatSearch(false); setChatSearch(""); setChatSearchResults([]); }}
                    className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {chatSearchResults.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {chatSearchResults.length} resultado(s) encontrado(s)
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-1 min-h-0">
              {/* Messages */}
              <div className="flex-1 flex flex-col min-w-0">
                <div
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                >
                  {loadingMore && (
                    <div className="flex justify-center py-2">
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  )}
                  {messages.length === 0 && !loadingMore && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const quotedMsg = msg.quoted_msg_id
                      ? messages.find((m) => m.remote_msg_id === msg.quoted_msg_id)
                      : null;

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex group",
                          msg.from_me ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2.5 relative",
                            msg.from_me
                              ? "bg-primary/15 text-foreground"
                              : "bg-card border border-border",
                            msg.is_deleted && "opacity-60"
                          )}
                        >
                          {!msg.from_me && msg.sender_name && (
                            <p className="text-xs font-semibold text-primary mb-1">
                              {msg.sender_name}
                            </p>
                          )}

                          {quotedMsg && (
                            <div className="mb-2 p-2 rounded-lg bg-background/50 border-l-2 border-primary/40">
                              <p className="text-[10px] text-primary font-medium">
                                {quotedMsg.from_me ? "Voce" : quotedMsg.sender_name || "Mensagem"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {quotedMsg.content}
                              </p>
                            </div>
                          )}

                          {msg.msg_type === "location" && !msg.is_deleted && (
                            <div className="mb-2 p-3 bg-primary/10 rounded-xl">
                              <div className="flex items-center gap-2 text-sm text-foreground">
                                <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                                Localização
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{msg.content}</p>
                            </div>
                          )}

                          {msg.msg_type === "contact" && !msg.is_deleted && (
                            <div className="mb-2 p-3 bg-primary/10 rounded-xl">
                              <div className="flex items-center gap-2 text-sm text-foreground">
                                <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                                Contato
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{msg.content}</p>
                            </div>
                          )}

                          {msg.msg_type === "poll" && !msg.is_deleted && (
                            <div className="mb-2 p-3 bg-primary/10 rounded-xl">
                              <div className="flex items-center gap-2 text-sm text-foreground">
                                <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                  <circle cx="9" cy="7" r="4" />
                                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                                Enquete
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{msg.content}</p>
                            </div>
                          )}

                          {msg.msg_type === "media" && msg.media_url && !msg.is_deleted && (
                            <div className="mb-2">
                              {msg.media_type?.startsWith("image/") ? (
                                <img
                                  src={msg.media_url}
                                  alt="media"
                                  className="rounded-xl max-w-full max-h-64 object-cover"
                                />
                              ) : msg.media_type?.startsWith("video/") ? (
                                <video
                                  src={msg.media_url}
                                  controls
                                  className="rounded-xl max-w-full max-h-64"
                                />
                              ) : msg.media_type?.startsWith("audio/") ? (
                                <audio src={msg.media_url} controls className="w-full" />
                              ) : (
                                <a
                                  href={msg.media_url}
                                  target="_blank"
                                  rel="noopener"
                                  className="text-primary hover:opacity-80 underline text-sm"
                                >
                                  Arquivo
                                </a>
                              )}
                            </div>
                          )}

                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {msg.is_deleted ? "Mensagem excluida" : msg.content}
                          </p>

                          <div className="flex items-center justify-between gap-2 mt-1.5">
                            <p className="text-[10px] text-muted-foreground">
                              {formatTime(msg.timestamp)}
                              {msg.is_edited && !msg.is_deleted && " (editada)"}
                            </p>
                            {msg.from_me && !msg.is_deleted && (
                              <span className="text-[10px] text-muted-foreground">
                                {msg.status === "sent" && "✓"}
                                {msg.status === "delivered" && "✓✓"}
                                {msg.status === "read" && "✓✓"}
                              </span>
                            )}
                          </div>

                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {msg.reactions.map((r, i) => (
                                <span key={i} className="text-xs bg-background/50 rounded-full px-1.5 py-0.5">
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Action buttons on hover */}
                          {!msg.is_deleted && (
                            <div className="absolute -top-8 right-0 hidden group-hover:flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-sm p-0.5 z-10">
                              <button
                                onClick={() => setShowEmojiPicker(msg.remote_msg_id)}
                                className="p-1 rounded hover:bg-accent text-muted-foreground"
                                title="Reagir"
                              >
                                <Smile className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setQuotedMessage({ id: msg.remote_msg_id, content: msg.content });
                                  setText("");
                                }}
                                className="p-1 rounded hover:bg-accent text-muted-foreground"
                                title="Responder"
                              >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                              </button>
                              {!msg.is_deleted && (
                                <button
                                  onClick={() => setShowForwardModal(msg.remote_msg_id)}
                                  className="p-1 rounded hover:bg-accent text-muted-foreground"
                                  title="Encaminhar"
                                >
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                  </svg>
                                </button>
                              )}
                              {msg.from_me && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingMsg({ id: msg.remote_msg_id, content: msg.content });
                                      setText(msg.content);
                                    }}
                                    className="p-1 rounded hover:bg-accent text-muted-foreground"
                                    title="Editar"
                                  >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteModal(msg.remote_msg_id)}
                                    className="p-1 rounded hover:bg-destructive/10 text-destructive"
                                    title="Excluir"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {/* Emoji picker */}
                          {showEmojiPicker === msg.remote_msg_id && (
                            <div className="absolute -top-12 right-0 bg-card border border-border rounded-xl shadow-lg p-2 flex gap-1 z-50">
                              {EMOJI_LIST.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg.remote_msg_id, emoji)}
                                  className="p-1 rounded hover:bg-accent text-sm"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEnd} />
                </div>

                {/* Input area */}
                <div className="border-t border-border bg-card p-3">
                  {quotedMessage && (
                    <div className="mb-2 p-2 rounded-lg bg-background border border-border flex items-center gap-2">
                      <div className="w-0.5 h-8 bg-primary rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-primary font-medium">Respondendo</p>
                        <p className="text-xs text-muted-foreground truncate">{quotedMessage.content}</p>
                      </div>
                      <button onClick={() => setQuotedMessage(null)} className="p-1 rounded hover:bg-accent">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {editingMsg && (
                    <div className="mb-2 p-2 rounded-lg bg-background border border-primary/30 flex items-center gap-2">
                      <div className="w-0.5 h-8 bg-primary rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-primary font-medium">Editando mensagem</p>
                        <p className="text-xs text-muted-foreground truncate">{editingMsg.content}</p>
                      </div>
                      <button onClick={() => { setEditingMsg(null); setText(""); }} className="p-1 rounded hover:bg-accent">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,video/*,.pdf,.doc,.docx"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl hover:bg-accent text-muted-foreground transition-colors"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <div className="flex-1 relative">
                      {text.startsWith("/") && quickReplies && quickReplies.length > 0 && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto z-20">
                          <p className="text-[10px] text-muted-foreground mb-1 px-1">Respostas rapidas</p>
                          {quickReplies
                            .filter((qr) =>
                              qr.shortcut.toLowerCase().includes(text.toLowerCase()) ||
                              qr.title.toLowerCase().includes(text.toLowerCase())
                            )
                            .map((qr) => (
                              <button
                                key={qr.id}
                                onClick={() => {
                                  setText(qr.content);
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors"
                              >
                                <span className="text-xs font-medium text-primary">{qr.shortcut}</span>
                                <span className="text-xs text-muted-foreground ml-2">{qr.title}</span>
                              </button>
                            ))}
                        </div>
                      )}
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Digite sua mensagem..."
                        rows={1}
                        className="w-full resize-none px-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
                      />
                    </div>
                    {isRecording ? (
                      <button
                        onClick={stopRecording}
                        className="p-2.5 rounded-xl bg-red-500 text-white animate-pulse transition-colors"
                      >
                        <Square className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        onClick={startRecording}
                        className="p-2.5 rounded-xl hover:bg-accent text-muted-foreground transition-colors"
                      >
                        <Mic className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={handleSend}
                      disabled={!text.trim() || sending}
                      className={cn(
                        "p-2.5 rounded-xl transition-all",
                        text.trim() ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes sidebar */}
              {showNotes && (
                <div className="w-72 border-l border-border bg-card flex flex-col">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Notas internas</h3>
                    <button onClick={() => setShowNotes(false)} className="p-1 rounded hover:bg-accent">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {notesLoading ? (
                      <div className="flex justify-center py-6">
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                    ) : notes.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        Nenhuma nota ainda
                      </p>
                    ) : (
                      notes.map((note) => (
                        <div key={note.id} className="p-2.5 rounded-lg bg-background border border-border">
                          <p className="text-[10px] text-primary font-medium">{note.user_name}</p>
                          <p className="text-xs text-foreground mt-0.5">{note.content}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(note.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-border">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Adicionar nota..."
                        className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && noteText.trim()) {
                            addNote(selectedConv.name || selectedConv.phone, noteText);
                            setNoteText("");
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (noteText.trim()) {
                            addNote(selectedConv.name || selectedConv.phone, noteText);
                            setNoteText("");
                          }
                        }}
                        disabled={!noteText.trim()}
                        className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Forward Message Modal */}
            {showForwardModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-5">
                  <h3 className="text-base font-semibold mb-3">Encaminhar mensagem</h3>
                  <input
                    type="text"
                    placeholder="Buscar conversa de destino..."
                    value={forwardSearch}
                    onChange={(e) => handleSearchForward(e.target.value)}
                    autoFocus
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary mb-3"
                  />
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {forwardResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleForwardMessage(c.jid)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent text-left"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {(c.name || c.jid).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{c.name || c.jid}</div>
                        </div>
                      </button>
                    ))}
                    {forwardSearch.length >= 2 && forwardResults.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conversa encontrada</p>
                    )}
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => { setShowForwardModal(null); setForwardSearch(""); setForwardResults([]); }}
                      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Message Modal */}
            {showDeleteModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5">
                  <h3 className="text-base font-semibold mb-3">Excluir mensagem</h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    Tem certeza que deseja excluir esta mensagem?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteMessage(showDeleteModal, false)}
                      className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-accent transition-colors"
                    >
                      Para mim
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(showDeleteModal, true)}
                      className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm hover:opacity-90 transition-opacity"
                    >
                      Para todos
                    </button>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(null)}
                    className="w-full mt-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Guide Assignment Modal */}
            {showGuideModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold">Atribuir guia</h3>
                    <button onClick={() => setShowGuideModal(false)} className="p-1 rounded hover:bg-accent">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => handleAssignGuide("")}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-accent text-sm text-muted-foreground"
                    >
                      Remover atribuicao
                    </button>
                    {members.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleAssignGuide(m.name)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg hover:bg-accent text-sm transition-colors",
                          selectedConv.assigned_guide === m.name && "bg-primary/10 text-primary"
                        )}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tag Management Modal */}
            {showTagModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold">Gerenciar tags</h3>
                    <button onClick={() => setShowTagModal(false)} className="p-1 rounded hover:bg-accent">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(selectedConv.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full text-black font-medium"
                        style={{ backgroundColor: getTagColor(tag) }}
                      >
                        {tag}
                        <button
                          onClick={() => handleUpdateTags((selectedConv.tags || []).filter((t) => t !== tag))}
                          className="hover:opacity-70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Nova tag..."
                      className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && tagInput.trim()) {
                          handleUpdateTags([...(selectedConv.tags || []), tagInput.trim()]);
                          setTagInput("");
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (tagInput.trim()) {
                          handleUpdateTags([...(selectedConv.tags || []), tagInput.trim()]);
                          setTagInput("");
                        }
                      }}
                      disabled={!tagInput.trim()}
                      className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          if (tagInput.trim()) {
                            api.setTagColor(tagInput.trim(), color);
                          }
                        }}
                        className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
