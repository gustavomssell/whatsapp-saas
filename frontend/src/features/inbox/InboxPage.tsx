import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useSocket } from "@/hooks/useSocket";
import { useQuickReplies } from "@/hooks/useQuickReplies";
import { useNotes } from "@/hooks/useNotes";
import { Send, ArrowLeft, Paperclip, Search, Archive, UserPlus } from "lucide-react";
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
}

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
  const messagesEnd = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleWSMessage = useCallback(
    (msg: any) => {
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
    },
    [selectedConv]
  );

  const { connected } = useSocket(handleWSMessage);
  const { data: quickReplies, refetch: refetchQRs } = useQuickReplies(selectedConv?.jid);
  const { data: notes, loading: notesLoading, addNote } = useNotes(selectedConv?.jid);

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
        loadMessages(jid);
      }
    }
  }, [jid, conversations]);

  const loadMessages = async (convJid: string) => {
    try {
      const msgs = await api.getMessages(convJid);
      setMessages(msgs || []);
      setTimeout(
        () => messagesEnd.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedConv || sending) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(selectedConv.jid, text.trim());
      setMessages((prev) => [...prev, msg]);
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
      loadMessages(selectedConv.jid);
    } catch (err) {
      console.error(err);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  const [searchQuery, setSearchQuery] = useState("");

const filtered = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

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
                  : "Nenhuma conversa corresponde à busca"}
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.jid}
                onClick={() => navigate(`/inbox/${conv.jid}`)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/50",
                  selectedConv?.jid === conv.jid && "bg-accent/50"
                )}
              >
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
{conv.unread_count > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 flex-shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                    {conv.tags && conv.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {conv.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
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
                Selecione uma conversa para começar
              </p>
            </div>
          </div>
        ) : (
          <>
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
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground" title="Atribuir guia">
                  <UserPlus className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground" title="Arquivar">
                  <Archive className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.from_me ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5",
                      msg.from_me
                        ? "bg-primary/15 text-foreground"
                        : "bg-card border border-border"
                    )}
                  >
                    {!msg.from_me && msg.sender_name && (
                      <p className="text-xs font-semibold text-primary mb-1">
                        {msg.sender_name}
                      </p>
                    )}
                    {msg.msg_type === "media" && msg.media_url && (
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
                      {msg.content}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEnd} />
            </div>

            <div className="border-t border-border bg-card p-3">
              <div className="flex items-end gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl hover:bg-accent text-muted-foreground transition-colors"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <div className="flex-1 relative">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua mensagem..."
                    rows={1}
                    className="w-full resize-none px-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
                  />
                  {quickReplies && quickReplies.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {quickReplies.map((qr) => (
                        <button
                          key={qr.id}
                          onClick={() => {
                            setText((prev) => prev + qr.shortcut);
                            setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: "smooth" }), 100);
                          }}
                          className="p-1.5 rounded text-sm text-primary hover:bg-primary/10 transition-colors"
                        >
                          {qr.title}
                        </button>
                      ))}
                    </div>
                  ))}
                  {notes && !notesLoading && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Nota:</span>
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Adicionar nota..."
                        className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
                        disabled={sending}
                      />
                      <button
                        onClick={() => {
                          if (noteText.trim()) {
                            addNote(selectedConv?.name || selectedConv?.phone || "usuário", noteText);
                            setNoteText("");
                          }
                        }}
                        disabled={sending || !noteText.trim()}
                        className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm disabled:opacity-50"
                      >
                        Adicionar
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    text.trim() || quickReplies?.length > 0 ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
