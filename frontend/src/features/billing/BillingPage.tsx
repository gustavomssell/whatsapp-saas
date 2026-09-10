import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { Check, Zap, Crown, Building2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  max_conversations: number;
  max_messages_month: number;
  max_members: number;
  max_quick_replies: number;
  max_groups: number;
  features: string[];
}

interface OrgPlanInfo {
  plan: Plan;
  subscription: {
    status: string;
    billing_cycle: string;
    current_period_end: string;
  };
  usage: {
    messages_sent: number;
    messages_received: number;
    conversations_active: number;
    members_count: number;
  };
}

const planIcons: Record<string, any> = {
  free: Zap,
  starter: Zap,
  professional: Crown,
  enterprise: Building2,
};

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [orgPlan, setOrgPlan] = useState<OrgPlanInfo | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansData, orgData] = await Promise.all([
        api.getPlans(),
        api.getOrgPlan(),
      ]);
      setPlans(plansData || []);
      setOrgPlan(orgData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planName: string) => {
    setSubscribing(planName);
    try {
      await api.subscribePlan(planName, billingCycle);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Tem certeza que deseja cancelar sua assinatura?")) return;
    try {
      await api.cancelSubscription();
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentPlanName = orgPlan?.plan?.name || "free";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Planos e Assinatura</h1>
        <p className="text-muted-foreground mt-1">Escolha o plano ideal para o seu negócio</p>
      </div>

      {orgPlan && (
        <div className="border border-primary/30 rounded-2xl p-6 bg-card">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Plano Atual: {orgPlan.plan.display_name}
            <span className={`text-xs px-2 py-0.5 rounded-full ${orgPlan.subscription?.status === "active" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
              {orgPlan.subscription?.status === "active" ? "Ativo" : orgPlan.subscription?.status}
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-sm text-muted-foreground">Mensagens</p>
              <p className="text-lg font-semibold">
                {orgPlan.usage?.messages_sent || 0}
                <span className="text-sm text-muted-foreground">
                  /{orgPlan.plan.max_messages_month < 0 ? "∞" : orgPlan.plan.max_messages_month}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conversas</p>
              <p className="text-lg font-semibold">
                {orgPlan.usage?.conversations_active || 0}
                <span className="text-sm text-muted-foreground">
                  /{orgPlan.plan.max_conversations < 0 ? "∞" : orgPlan.plan.max_conversations}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Membros</p>
              <p className="text-lg font-semibold">
                {orgPlan.usage?.members_count || 0}
                <span className="text-sm text-muted-foreground">
                  /{orgPlan.plan.max_members < 0 ? "∞" : orgPlan.plan.max_members}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ciclo</p>
              <p className="text-lg font-semibold">
                {orgPlan.subscription?.billing_cycle === "yearly" ? "Anual" : "Mensal"}
              </p>
            </div>
          </div>
          {currentPlanName !== "free" && (
            <button
              onClick={handleCancel}
              className="mt-4 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              Cancelar Assinatura
            </button>
          )}
        </div>
      )}

      <div className="flex justify-center gap-2">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            billingCycle === "monthly" ? "bg-primary text-background" : "bg-card border border-border hover:bg-accent"
          }`}
        >
          Mensal
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            billingCycle === "yearly" ? "bg-primary text-background" : "bg-card border border-border hover:bg-accent"
          }`}
        >
          Anual (2 meses grátis)
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const Icon = planIcons[plan.name] || Zap;
          const isCurrent = plan.name === currentPlanName;
          const price = billingCycle === "monthly" ? plan.price_monthly : plan.price_yearly;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 bg-card transition-all hover:shadow-lg ${
                isCurrent ? "border-primary" : "border-border"
              } ${plan.name === "professional" ? "border-primary/50 shadow-primary/10 shadow-lg" : ""}`}
            >
              {plan.name === "professional" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-background text-xs px-3 py-1 rounded-full font-medium">
                    Mais Popular
                  </span>
                </div>
              )}
              <div className="text-center">
                <div className="mx-auto mb-3 text-primary">
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold">{plan.display_name}</h3>
                <div className="text-3xl font-bold mt-2">
                  {price === 0 ? "Grátis" : `R$ ${price.toFixed(2)}`}
                  {price > 0 && (
                    <span className="text-sm text-muted-foreground font-normal">
                      /{billingCycle === "monthly" ? "mês" : "ano"}
                    </span>
                  )}
                </div>
              </div>
              <ul className="space-y-2 text-sm mt-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{plan.max_conversations < 0 ? "Conversas ilimitadas" : `${plan.max_conversations} conversas`}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{plan.max_messages_month < 0 ? "Mensagens ilimitadas" : `${plan.max_messages_month} mensagens/mês`}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{plan.max_members < 0 ? "Membros ilimitados" : `${plan.max_members} membros`}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{plan.max_groups < 0 ? "Grupos ilimitados" : `${plan.max_groups} grupos`}</span>
                </li>
              </ul>
              <button
                className={`w-full mt-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-card border border-border text-muted-foreground cursor-not-allowed"
                    : plan.name === "professional"
                    ? "bg-primary text-background hover:opacity-90"
                    : "bg-card border border-border hover:bg-accent"
                }`}
                disabled={isCurrent || subscribing === plan.name}
                onClick={() => handleSubscribe(plan.name)}
              >
                {isCurrent ? "Plano Atual" : subscribing === plan.name ? "Processando..." : "Escolher Plano"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
