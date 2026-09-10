import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { MessageSquare, Users, Send, Inbox, BarChart3, ArrowUpRight, Zap } from "lucide-react";

interface Stats {
  total_conversations: number;
  unread_conversations: number;
  messages_sent_today: number;
  messages_received_today: number;
  active_groups: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        {
          label: "Conversas",
          value: stats.total_conversations,
          icon: MessageSquare,
          color: "text-primary",
          bg: "bg-primary/10",
        },
        {
          label: "Não lidas",
          value: stats.unread_conversations,
          icon: Inbox,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
        },
        {
          label: "Enviados hoje",
          value: stats.messages_sent_today,
          icon: Send,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          label: "Recebidos hoje",
          value: stats.messages_received_today,
          icon: BarChart3,
          color: "text-purple-500",
          bg: "bg-purple-500/10",
        },
        {
          label: "Grupos ativos",
          value: stats.active_groups,
          icon: Users,
          color: "text-cyan-500",
          bg: "bg-cyan-500/10",
        },
      ]
    : [];

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
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Visão Geral</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe o desempenho das suas comunicações
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

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold mb-2">Bem-vindo ao WhatsApp SaaS</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
              Conecte seu WhatsApp para começar a gerenciar suas conversas em tempo real.
              Acesse <strong className="text-foreground">Inbox</strong> para ver suas mensagens
              ou <strong className="text-foreground">Configurações</strong> para conectar sua instância.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Atividade Hoje</h3>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">Mensagens enviadas</span>
          <span className="text-sm font-medium text-primary">{stats?.messages_sent_today || 0}</span>
        </div>
        <div className="flex h-8 w-full items-center justify-between text-xs">
          <div className="w-24 h-4 bg-primary/40 rounded-full overflow-hidden">
            <div className="h-4 bg-primary" />
          </div>
          <div className="w-24 h-4 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-4 bg-purple-500" />
          </div>
        </div>
        <div className="flex items-center justify-between text-muted-foreground text-sm">
          <span>Enviados</span>
          <span>Recebidos</span>
        </div>
      </div>
    </div>
  );
}
