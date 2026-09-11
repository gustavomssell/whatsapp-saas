import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  Users,
  Search,
  ArrowUpRight,
  Link2,
  MessageSquare,
  X,
  Edit,
  Trash2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Group {
  id: string;
  group_jid: string;
  subject: string;
  description: string;
  participant_count: number;
  is_archived: boolean;
}

export default function GroupsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({ subject: "", description: "" });
  const [copied, setCopied] = useState(false);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: () => api.getGroups(),
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["group-messages", selectedGroup?.group_jid],
    queryFn: () => api.getMessages(selectedGroup!.group_jid),
    enabled: !!selectedGroup,
  });

  const updateMutation = useMutation({
    mutationFn: ({ groupJid, data }: { groupJid: string; data: { subject: string; description: string } }) =>
      api.updateGroup(groupJid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setShowEditModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (groupJid: string) => api.deleteGroup(groupJid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setSelectedGroup(null);
      setShowDeleteConfirm(false);
    },
  });

  const filtered = groups.filter(
    (g: Group) =>
      g.subject?.toLowerCase().includes(search.toLowerCase()) ||
      g.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyInviteLink = async () => {
    if (!selectedGroup) return;
    try {
      const result = await api.getGroupInviteLink(selectedGroup.group_jid);
      const link = result?.invite_link || result?.link || "";
      if (link) {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) {
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
            <h2 className="text-base font-semibold">{t("groups.title")}</h2>
            <span className="text-xs text-muted-foreground">{t("groups.groupsCount", { count: groups.length })}</span>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("groups.searchPlaceholder")}
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
                {groups.length === 0 ? t("groups.noGroups") : t("groups.noMatches")}
              </p>
            </div>
          ) : (
            filtered.map((group: Group) => (
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
                    <span className="font-medium text-sm truncate">{group.subject || t("groups.noName")}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("groups.participantCount", { count: group.participant_count })}
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
              <p className="text-muted-foreground">{t("groups.selectGroup")}</p>
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
                  {t("groups.participantCount", { count: selectedGroup.participant_count })}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditForm({ subject: selectedGroup.subject, description: selectedGroup.description });
                  setShowEditModal(true);
                }}
                className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                title={t("common.edit")}
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                title={t("common.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Group content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Description */}
              {selectedGroup.description && (
                <div className="mb-4 p-3 rounded-xl bg-card border border-border">
                  <p className="text-xs text-muted-foreground mb-1">{t("groups.description")}</p>
                  <p className="text-sm">{selectedGroup.description}</p>
                </div>
              )}

              {/* Recent messages */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">{t("groups.recentMessages")}</h3>
                {loadingMessages ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">{t("groups.noMessages")}</p>
                ) : (
                  <div className="space-y-2">
                    {messages.slice(-10).map((msg: any) => (
                      <div key={msg.id} className={cn(
                        "p-2.5 rounded-lg border",
                        msg.from_me ? "bg-primary/5 border-primary/20" : "bg-card border-border"
                      )}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-primary">{msg.sender_name || t("groups.unknown")}</span>
                          <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                        </div>
                        {msg.msg_type === "media" && msg.media_url ? (
                          msg.media_type?.startsWith("image/") ? (
                            <img src={msg.media_url} alt="media" className="rounded-lg max-h-32 object-cover" />
                          ) : (
                            <a href={msg.media_url} target="_blank" rel="noopener" className="text-xs text-primary underline">
                              {t("groups.file")}
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
                <button
                  onClick={handleCopyInviteLink}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left"
                >
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4 text-primary" />}
                  <div>
                    <p className="text-sm font-medium">{t("groups.inviteLink")}</p>
                    <p className="text-xs text-muted-foreground">
                      {copied ? t("groups.linkCopied", "Link copiado!") : t("groups.copyLinkDescription")}
                    </p>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{t("groups.sendMessage")}</p>
                    <p className="text-xs text-muted-foreground">{t("groups.sendMessageDescription")}</p>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold">{t("groups.editGroup", "Editar grupo")}</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("groups.name", "Nome")}</label>
                <input
                  type="text"
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("groups.descriptionLabel", "Descrição")}</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:bg-accent transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => updateMutation.mutate({ groupJid: selectedGroup!.group_jid, data: editForm })}
                disabled={!editForm.subject || updateMutation.isPending}
                className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? t("common.loading") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-2">{t("groups.confirmDelete", "Excluir grupo?")}</h3>
              <p className="text-xs text-muted-foreground">{t("groups.confirmDeleteDesc", "Esta ação não pode ser desfeita.")}</p>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:bg-accent transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => deleteMutation.mutate(selectedGroup!.group_jid)}
                className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
