import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/services/api";
import {
  QrCode,
  User,
  Zap,
  ArrowRight,
  Users,
  Edit,
  X,
  Shield,
  Trash2,
  Lock,
  Bot,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [instanceName, setInstanceName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    avatar: user?.avatar || "",
  });

  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Member management
  const [showRoleModal, setShowRoleModal] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);

  // Automation
  const [activeTab, setActiveTab] = useState<"profile" | "whatsapp" | "team" | "automation" | "audit">("profile");

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org-members"],
    queryFn: () => api.getOrgMembers(),
  });

  const { data: autoReplyRules = [] } = useQuery({
    queryKey: ["auto-reply-rules"],
    queryFn: () => api.getAutoReplyRules(),
    enabled: activeTab === "automation",
  });

  const { data: welcomeMessage } = useQuery({
    queryKey: ["welcome-message"],
    queryFn: () => api.getWelcomeMessage(),
    enabled: activeTab === "automation",
  });

  const { data: auditData } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => api.getAuditLogs({ page: 1, per_page: 50 }),
    enabled: activeTab === "audit",
  });

  const checkStatus = async () => {
    try {
      const res = await api.getWhatsAppStatus();
      setStatus(res.status);
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleConnect = async () => {
    if (!instanceName.trim()) return;
    setLoading(true);
    try {
      const webhookUrl = `${window.location.origin}/api/webhook/whatsapp`;
      const res = await api.connectWhatsApp(instanceName, webhookUrl);
      if (res.qr_code) {
        setQrCode(res.qr_code);
      }
      checkStatus();
    } catch (err: any) {
      alert(err.message || "Erro ao conectar");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnectWhatsApp();
      setStatus("disconnected");
      setQrCode(null);
    } catch (err: any) {
      alert(err.message || "Erro ao desconectar");
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof profileForm) => api.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditingProfile(false);
      if (user) {
        setUser({ ...user, ...profileForm });
      }
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api.changePassword(data.current_password, data.new_password),
    onSuccess: () => {
      setShowPasswordModal(false);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      alert(t("settings.passwordChanged", "Senha alterada com sucesso"));
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      api.updateMemberRole(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] });
      setShowRoleModal(null);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] });
      setShowRemoveConfirm(null);
    },
  });

  const tabs = [
    { id: "profile" as const, label: t("settings.profile"), icon: User },
    { id: "whatsapp" as const, label: t("settings.whatsapp"), icon: Zap },
    { id: "team" as const, label: t("settings.team"), icon: Users },
    { id: "automation" as const, label: t("settings.automation", "Automação"), icon: Bot },
    { id: "audit" as const, label: t("settings.audit", "Auditoria"), icon: Shield },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold">{t("settings.profile")}</h2>
            </div>
            <button
              onClick={() => {
                setEditingProfile(!editingProfile);
                setProfileForm({
                  name: user?.name || "",
                  email: user?.email || "",
                  phone: user?.phone || "",
                  avatar: user?.avatar || "",
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors"
            >
              {editingProfile ? <X className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" />}
              {editingProfile ? t("common.cancel") : t("common.edit")}
            </button>
          </div>

          {editingProfile ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("settings.name")}</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("settings.email")}</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("settings.phone", "Telefone")}</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="5511999999999"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
                />
              </div>
              <button
                onClick={() => updateProfileMutation.mutate(profileForm)}
                disabled={updateProfileMutation.isPending}
                className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {updateProfileMutation.isPending ? t("common.loading") : t("common.save")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("settings.name")}</span>
                <span className="text-sm font-medium">{user?.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">{t("settings.email")}</span>
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{t("settings.role")}</span>
                <span className="text-sm font-medium capitalize">{user?.role || "member"}</span>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Lock className="h-4 w-4" />
              {t("settings.changePassword", "Alterar senha")}
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Tab */}
      {activeTab === "whatsapp" && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-base font-semibold">{t("settings.whatsapp")}</h2>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-background border border-border mb-5">
            {status === "open" ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">{t("settings.connected")}</span>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("settings.disconnected")}</span>
              </>
            )}
            <button
              onClick={checkStatus}
              className="ml-auto text-xs text-primary hover:opacity-80 font-medium transition-opacity"
            >
              {t("settings.scanQRCode")}
            </button>
          </div>

          {status !== "open" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("settings.instanceName")}</label>
                <input
                  type="text"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
                  placeholder={t("settings.instancePlaceholder")}
                />
              </div>
              <button
                onClick={handleConnect}
                disabled={loading || !instanceName.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    {t("settings.connect")}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {status === "open" && (
            <button
              onClick={handleDisconnect}
              className="w-full py-2.5 px-4 rounded-xl border border-destructive text-destructive font-semibold text-sm hover:bg-destructive/10 transition-colors"
            >
              {t("settings.disconnect")}
            </button>
          )}

          {qrCode && (
            <div className="mt-6 p-4 rounded-xl bg-background border border-border text-center">
              <QrCode className="h-5 w-5 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">{t("settings.scanQRCode")}</p>
              <img src={qrCode} alt="QR Code" className="mx-auto rounded-xl border border-border max-w-[250px]" />
            </div>
          )}
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-base font-semibold">{t("settings.team")}</h2>
          </div>

          {orgMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("settings.noMembers")}</p>
          ) : (
            <div className="space-y-2">
              {orgMembers.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {m.avatar ? (
                      <img src={m.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      m.name?.charAt(0)?.toUpperCase() || "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRoleModal(m.id)}
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full capitalize transition-colors",
                        m.role === "owner"
                          ? "bg-primary/20 text-primary"
                          : m.role === "admin"
                          ? "bg-blue-500/20 text-blue-500"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {m.role}
                    </button>
                    {m.role !== "owner" && (
                      <button
                        onClick={() => setShowRemoveConfirm(m.id)}
                        className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Automation Tab */}
      {activeTab === "automation" && (
        <div className="space-y-4">
          {/* Welcome Message */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold">{t("settings.welcomeMessage", "Mensagem de Boas-vindas")}</h2>
            </div>
            <WelcomeMessageEditor data={welcomeMessage} />
          </div>

          {/* Auto-Reply Rules */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold">{t("settings.autoReply", "Respostas Automáticas")}</h2>
            </div>
            <AutoReplyRulesList rules={autoReplyRules} />
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === "audit" && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-base font-semibold">{t("settings.auditLog", "Log de Auditoria")}</h2>
          </div>
          <AuditLogList data={auditData} />
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold">{t("settings.changePassword", "Alterar senha")}</h3>
              <button onClick={() => setShowPasswordModal(false)} className="p-1 rounded-lg hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("settings.currentPassword", "Senha atual")}</label>
                <input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("settings.newPassword", "Nova senha")}</label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("settings.confirmPassword", "Confirmar senha")}</label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:bg-accent transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => {
                  if (passwordForm.new_password !== passwordForm.confirm_password) {
                    alert(t("settings.passwordMismatch", "As senhas não conferem"));
                    return;
                  }
                  if (passwordForm.new_password.length < 6) {
                    alert(t("settings.passwordTooShort", "A senha deve ter pelo menos 6 caracteres"));
                    return;
                  }
                  changePasswordMutation.mutate({
                    current_password: passwordForm.current_password,
                    new_password: passwordForm.new_password,
                  });
                }}
                disabled={!passwordForm.current_password || !passwordForm.new_password || changePasswordMutation.isPending}
                className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {changePasswordMutation.isPending ? t("common.loading") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold">{t("settings.changeRole", "Alterar função")}</h3>
              <button onClick={() => setShowRoleModal(null)} className="p-1 rounded-lg hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {["owner", "admin", "member"].map((role) => (
                <button
                  key={role}
                  onClick={() => updateRoleMutation.mutate({ memberId: showRoleModal, role })}
                  className="w-full text-left p-3 rounded-xl hover:bg-accent transition-colors capitalize text-sm"
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirm */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-2">{t("settings.confirmRemove", "Remover membro?")}</h3>
              <p className="text-xs text-muted-foreground">{t("settings.confirmRemoveDesc", "Esta ação não pode ser desfeita.")}</p>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button
                onClick={() => setShowRemoveConfirm(null)}
                className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:bg-accent transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => removeMemberMutation.mutate(showRemoveConfirm)}
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

// Welcome Message Editor Component
function WelcomeMessageEditor({ data }: { data: any }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(data?.message || "");
  const [isActive, setIsActive] = useState(data?.is_active || false);

  useEffect(() => {
    if (data) {
      setMessage(data.message || "");
      setIsActive(data.is_active || false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api.updateWelcomeMessage({ message, is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["welcome-message"] });
    },
  });

  return (
    <div className="space-y-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("settings.welcomePlaceholder", "Olá! Bem-vindo ao nosso atendimento. Como podemos ajudar?")}
        rows={3}
        className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none transition-colors"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-border"
          />
          <label className="text-xs text-muted-foreground">{t("settings.active", "Ativo")}</label>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {saveMutation.isPending ? t("common.loading") : t("common.save")}
        </button>
      </div>
    </div>
  );
}

// Auto-Reply Rules List Component
function AutoReplyRulesList({ rules }: { rules: any[] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    trigger_type: "keyword",
    trigger_value: "",
    response_text: "",
    is_active: true,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.createAutoReplyRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-reply-rules"] });
      setShowForm(false);
      setForm({ name: "", trigger_type: "keyword", trigger_value: "", response_text: "", is_active: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAutoReplyRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auto-reply-rules"] }),
  });

  return (
    <div className="space-y-3">
      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{t("settings.noRules", "Nenhuma regra de auto-resposta")}</p>
      ) : (
        rules.map((rule: any) => (
          <div key={rule.id} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{rule.name}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  rule.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {rule.is_active ? t("settings.active") : t("settings.inactive", "Inativo")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rule.trigger_type}: "{rule.trigger_value}" → {rule.response_text.slice(0, 50)}{rule.response_text.length > 50 ? "..." : ""}
              </p>
            </div>
            <button
              onClick={() => deleteMutation.mutate(rule.id)}
              className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))
      )}

      {showForm ? (
        <div className="p-3 rounded-xl bg-background border border-border space-y-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t("settings.ruleName", "Nome da regra")}
            className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
          />
          <div className="flex gap-2">
            <select
              value={form.trigger_type}
              onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
              className="px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
            >
              <option value="keyword">{t("settings.keyword", "Palavra-chave")}</option>
              <option value="contains">{t("settings.contains", "Contém")}</option>
              <option value="exact">{t("settings.exact", "Exato")}</option>
              <option value="starts_with">{t("settings.startsWith", "Começa com")}</option>
            </select>
            <input
              type="text"
              value={form.trigger_value}
              onChange={(e) => setForm({ ...form, trigger_value: e.target.value })}
              placeholder={t("settings.triggerValue", "Valor do gatilho")}
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
            />
          </div>
          <textarea
            value={form.response_text}
            onChange={(e) => setForm({ ...form, response_text: e.target.value })}
            placeholder={t("settings.responseText", "Texto da resposta...")}
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none transition-colors"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || !form.trigger_value || !form.response_text || createMutation.isPending}
              className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2 text-sm rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          + {t("settings.addRule", "Adicionar regra")}
        </button>
      )}
    </div>
  );
}

// Audit Log List Component
function AuditLogList({ data }: { data: any }) {
  const { t } = useTranslation();
  const logs = data?.data || [];

  const formatAction = (action: string) => {
    const actions: Record<string, string> = {
      update_profile: t("audit.updateProfile", "Atualizou o perfil"),
      change_password: t("audit.changePassword", "Alterou a senha"),
      update_member_role: t("audit.updateRole", "Alterou função de membro"),
      remove_member: t("audit.removeMember", "Removeu um membro"),
      create_contact: t("audit.createContact", "Criou um contato"),
      delete_contact: t("audit.deleteContact", "Excluiu um contato"),
      sync_contacts: t("audit.syncContacts", "Sincronizou contatos"),
    };
    return actions[action] || action;
  };

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{t("audit.noLogs", "Nenhum log de auditoria")}</p>;
  }

  return (
    <div className="space-y-2">
      {logs.map((log: any) => (
        <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{log.user_name || "Sistema"}</span>{" "}
              <span className="text-muted-foreground">{formatAction(log.action)}</span>
            </p>
            {log.details && Object.keys(log.details).length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {JSON.stringify(log.details)}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(log.created_at).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
