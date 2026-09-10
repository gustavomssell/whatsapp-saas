import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { MessageSquare, Users, Send, Inbox, BarChart3, ArrowUpRight, Zap } from "lucide-react";

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.getDashboardStats(),
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["dashboard-chart", 7],
    queryFn: () => api.getDashboardChart(7),
  });

  const chart = chartData?.data || [];
  const loading = statsLoading || chartLoading;

  const cards = stats
    ? [
        {
          label: t("common.conversations"),
          value: stats.total_conversations,
          icon: MessageSquare,
          color: "text-primary",
          bg: "bg-primary/10",
        },
        {
          label: t("inbox.noMessages"),
          value: stats.unread_conversations,
          icon: Inbox,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
        },
        {
          label: t("dashboard.messagesSent"),
          value: stats.messages_sent_today,
          icon: Send,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          label: t("dashboard.messagesReceived"),
          value: stats.messages_received_today,
          icon: BarChart3,
          color: "text-purple-500",
          bg: "bg-purple-500/10",
        },
        {
          label: t("common.groups"),
          value: stats.active_groups,
          icon: Users,
          color: "text-cyan-500",
          bg: "bg-cyan-500/10",
        },
      ]
    : [];

  const maxChartValue = Math.max(...chart.map((c) => Math.max(c.sent, c.received)), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="group rounded-2xl border border-border bg-card p-4 sm:p-5 hover:border-primary/30 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">{card.value}</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {chart.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold">{t("dashboard.messagesChart")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("dashboard.sent")} vs {t("dashboard.received")}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">{t("dashboard.sent")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-muted-foreground">{t("dashboard.received")}</span>
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2 h-48">
            {chart.map((point) => {
              const sentHeight = (point.sent / maxChartValue) * 100;
              const receivedHeight = (point.received / maxChartValue) * 100;
              const date = new Date(point.date);
              const dayLabel = date.toLocaleDateString("pt-BR", { weekday: "short" });

              return (
                <div key={point.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end gap-0.5 h-40">
                    <div
                      className="flex-1 bg-primary rounded-t-md transition-all duration-500 hover:opacity-80"
                      style={{ height: `${Math.max(sentHeight, 2)}%` }}
                      title={`${t("dashboard.sent")}: ${point.sent}`}
                    />
                    <div
                      className="flex-1 bg-purple-500 rounded-t-md transition-all duration-500 hover:opacity-80"
                      style={{ height: `${Math.max(receivedHeight, 2)}%` }}
                      title={`${t("dashboard.received")}: ${point.received}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground capitalize">{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">WhatsApp SaaS</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("dashboard.subtitle")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
