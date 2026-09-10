import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.getPlans(),
  });

  const { data: orgPlan, isLoading: orgLoading } = useQuery({
    queryKey: ["org-plan"],
    queryFn: () => api.getOrgPlan(),
  });

  const subscribeMutation = useMutation({
    mutationFn: ({ planName, cycle }: { planName: string; cycle: string }) =>
      api.subscribePlan(planName, cycle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-plan"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-plan"] });
    },
  });

  const loading = plansLoading || orgLoading;

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
        <h1 className="text-2xl font-bold">{t("billing.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("billing.subtitle")}</p>
      </div>

      {orgPlan && (
        <div className="border border-primary/30 rounded-2xl p-6 bg-card">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {t("billing.currentPlan")} {orgPlan.plan.display_name}
            <span className={`text-xs px-2 py-0.5 rounded-full ${orgPlan.subscription?.status === "active" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
              {orgPlan.subscription?.status === "active" ? t("common.active") : orgPlan.subscription?.status}
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("billing.messagesLimit", { count: orgPlan.plan.max_messages_month })}</p>
              <p className="text-lg font-semibold">
                {orgPlan.usage?.messages_sent || 0}
                <span className="text-sm text-muted-foreground">
                  /{orgPlan.plan.max_messages_month < 0 ? "∞" : orgPlan.plan.max_messages_month}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("billing.conversationsLimit", { count: orgPlan.plan.max_conversations })}</p>
              <p className="text-lg font-semibold">
                {orgPlan.usage?.conversations_active || 0}
                <span className="text-sm text-muted-foreground">
                  /{orgPlan.plan.max_conversations < 0 ? "∞" : orgPlan.plan.max_conversations}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("billing.membersLimit", { count: orgPlan.plan.max_members })}</p>
              <p className="text-lg font-semibold">
                {orgPlan.usage?.members_count || 0}
                <span className="text-sm text-muted-foreground">
                  /{orgPlan.plan.max_members < 0 ? "∞" : orgPlan.plan.max_members}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("billing.cycle")}</p>
              <p className="text-lg font-semibold">
                {orgPlan.subscription?.billing_cycle === "yearly" ? t("common.yearly") : t("common.monthly")}
              </p>
            </div>
          </div>
          {currentPlanName !== "free" && (
            <button
              onClick={() => {
                if (confirm(t("billing.cancelConfirm"))) {
                  cancelMutation.mutate();
                }
              }}
              className="mt-4 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              {t("billing.cancelSubscription")}
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
          {t("billing.monthlyBilling")}
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            billingCycle === "yearly" ? "bg-primary text-background" : "bg-card border border-border hover:bg-accent"
          }`}
        >
          {t("billing.yearlyBilling")}
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
                    {t("billing.mostPopular")}
                  </span>
                </div>
              )}
              <div className="text-center">
                <div className="mx-auto mb-3 text-primary">
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold">{plan.display_name}</h3>
                <div className="text-3xl font-bold mt-2">
                  {price === 0 ? t("common.free") : `R$ ${price.toFixed(2)}`}
                  {price > 0 && (
                    <span className="text-sm text-muted-foreground font-normal">
                      /{billingCycle === "monthly" ? t("common.per_month") : t("common.per_year")}
                    </span>
                  )}
                </div>
              </div>
              <ul className="space-y-2 text-sm mt-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{plan.max_conversations < 0 ? t("common.unlimited") : t("billing.conversationsLimit", { count: plan.max_conversations })}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{plan.max_messages_month < 0 ? t("common.unlimited") : t("billing.messagesLimit", { count: plan.max_messages_month })}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{plan.max_members < 0 ? t("common.unlimited") : t("billing.membersLimit", { count: plan.max_members })}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{plan.max_groups < 0 ? t("common.unlimited") : t("billing.groupsLimit", { count: plan.max_groups })}</span>
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
                disabled={isCurrent || subscribeMutation.isPending}
                onClick={() => subscribeMutation.mutate({ planName: plan.name, cycle: billingCycle })}
              >
                {isCurrent ? t("billing.currentPlanButton") : subscribeMutation.isPending ? t("billing.processing") : t("billing.choosePlan")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
