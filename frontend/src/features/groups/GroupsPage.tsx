import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Users, Search, ArrowUpRight, Link2, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Group {
  id: string;
  group_jid: string;
  subject: string;
  description: string;
  participant_count: number;
  is_archived: boolean;
}

interface GroupMessage {
  id: string;
  sender_name: string;
  content: string;
  msg_type: string;
  media_url: string;
  media_type: string;
  from_me: boolean;
  timestamp: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    api
      .getGroups()
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadMessages = async (groupJid: string) => {
    setLoadingMessages(true);
    try {
      const msgs = await api.getMessages(groupJid);
      setMessages(msgs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup.group_jid);
    }
  }, [selectedGroup]);

  const filtered = groups.filter(
    (g) =>
      g.subject.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Groups list */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card",
        selectedGroup && "hidden md:flex"
      )}>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Grupos</h2>
            <span className="text-xs text-muted-foreground">{groups.length} grupos</span>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar grupo..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {groups.length === 0 ? "Nenhum grupo encontrado" : "Nenhum grupo corresponde a busca"}
              </p>
            </div>
          ) : (
            filtered.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/50",
                  selectedGroup?.id === group.id && "bg-accent/50"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{group.subject || "Sem nome"}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {group.participant_count} participante{group.participant_count !== 1 && "s"}
                    {group.description && ` — ${group.description.slice(0, 40)}${group.description.length > 40 ? "..." : ""}`}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Group detail */}
      <div className={cn(
        "flex-1 flex flex-col bg-background",
        !selectedGroup && "hidden md:flex"
      )}>
        {!selectedGroup ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <p className="text-muted-foreground">Selecione um grupo para ver detalhes</p>
            </div>
          </div>
        ) : (
          <>
            {/* Group header */}
            <div className="flex items-center gap-3 px-4 h-16 border-b border-border bg-card">
              <button
                onClick={() => setSelectedGroup(null)}
                className="md:hidden p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedGroup.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedGroup.participant_count} participante{selectedGroup.participant_count !== 1 && "s"}
                </p>
              </div>
            </div>

            {/* Group content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Description */}
              {selectedGroup.description && (
                <div className="mb-4 p-3 rounded-xl bg-card border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Descricao</p>
                  <p className="text-sm">{selectedGroup.description}</p>
                </div>
              )}

              {/* Recent messages */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">Mensagens recentes</h3>
                {loadingMessages ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma mensagem</p>
                ) : (
                  <div className="space-y-2">
                    {messages.slice(-10).map((msg) => (
                      <div key={msg.id} className={cn(
                        "p-2.5 rounded-lg border",
                        msg.from_me ? "bg-primary/5 border-primary/20" : "bg-card border-border"
                      )}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-primary">{msg.sender_name || "Desconhecido"}</span>
                          <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                        </div>
                        {msg.msg_type === "media" && msg.media_url ? (
                          msg.media_type?.startsWith("image/") ? (
                            <img src={msg.media_url} alt="media" className="rounded-lg max-h-32 object-cover" />
                          ) : (
                            <a href={msg.media_url} target="_blank" rel="noopener" className="text-xs text-primary underline">
                              Arquivo
                            </a>
                          )
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left">
                  <Link2 className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Link de convite</p>
                    <p className="text-xs text-muted-foreground">Copiar link para compartilhar</p>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Enviar mensagem</p>
                    <p className="text-xs text-muted-foreground">Enviar mensagem direta para o grupo</p>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
