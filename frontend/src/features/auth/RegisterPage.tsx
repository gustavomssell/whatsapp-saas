import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/services/api";
import { Zap, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.register(name, email, password, orgName || name);
      setAuth(res.token, res.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <span className="font-semibold text-xl tracking-tight">WA SaaS</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-xl font-semibold mb-1">Criar sua conta</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Comece a gerenciar seu WhatsApp gratuitamente
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Seu nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
                placeholder="João Silva"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Empresa <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
                placeholder="Minha Empresa"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Criar conta
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link
                to="/login"
                className="text-primary hover:opacity-80 font-medium transition-opacity"
              >
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
