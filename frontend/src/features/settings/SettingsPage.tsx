import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/services/api";
import { QrCode, User, Zap, ArrowRight } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [instanceName, setInstanceName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await api.getWhatsAppStatus();
      setStatus(res.status);
    } catch {
      setStatus("error");
    }
  };

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
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seu perfil e conexão WhatsApp
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-base font-semibold">Perfil</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Nome</span>
            <span className="text-sm font-medium">{user?.name}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Connection */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-base font-semibold">WhatsApp</h2>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-background border border-border mb-5">
          {status === "open" ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">Conectado</span>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
              <span className="text-sm text-muted-foreground">Desconectado</span>
            </>
          )}
          <button
            onClick={checkStatus}
            className="ml-auto text-xs text-primary hover:opacity-80 font-medium transition-opacity"
          >
            Verificar status
          </button>
        </div>

        {status !== "open" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Nome da Instância
              </label>
              <input
                type="text"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
                placeholder="minha-instancia"
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
                  Conectar WhatsApp
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
            Desconectar
          </button>
        )}

        {qrCode && (
          <div className="mt-6 p-4 rounded-xl bg-background border border-border text-center">
            <QrCode className="h-5 w-5 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              Escaneie o QR Code com seu WhatsApp
            </p>
            <img
              src={qrCode}
              alt="QR Code"
              className="mx-auto rounded-xl border border-border max-w-[250px]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
