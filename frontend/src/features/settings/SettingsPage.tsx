import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/services/api";
import { QrCode, User, Zap, ArrowRight, Users, CreditCard } from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [instanceName, setInstanceName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [orgPlan, setOrgPlan] = useState<any>(null);

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
    api.getMembers().then((res) => setMembers(res.data || [])).catch(console.error);
    api.getOrgPlan().then((res) => setOrgPlan(res)).catch(console.error);
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-base font-semibold">{t("settings.profile")}</h2>
        </div>
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
      </div>

      {/* WhatsApp Connection */}
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
              <label className="text-sm font-medium mb-1.5 block">
                {t("settings.instanceName")}
              </label>
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
            <p className="text-sm text-muted-foreground mb-3">
              {t("settings.scanQRCode")}
            </p>
            <img
              src={qrCode}
              alt="QR Code"
              className="mx-auto rounded-xl border border-border max-w-[250px]"
            />
          </div>
        )}
      </div>

      {/* Plan */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-base font-semibold">{t("settings.plan")}</h2>
        </div>

        {orgPlan ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">{t("settings.currentPlan")}</span>
              <span className="text-sm font-medium">{orgPlan.plan?.display_name || "Gratuito"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${orgPlan.subscription?.status === "active" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {orgPlan.subscription?.status === "active" ? "Ativo" : orgPlan.subscription?.status || "Gratuito"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">{t("settings.usageThisMonth")}</span>
              <span className="text-sm font-medium">
                {orgPlan.usage?.messages_sent || 0} / {orgPlan.plan?.max_messages_month < 0 ? "∞" : orgPlan.plan?.max_messages_month || 500}
              </span>
            </div>
            <button
              onClick={() => navigate("/billing")}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
            >
              {t("settings.managePlan")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}
      </div>

      {/* Members */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-base font-semibold">{t("settings.team")}</h2>
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("settings.noMembers")}</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {m.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
