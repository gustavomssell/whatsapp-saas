import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Users, Search, ArrowUpRight } from "lucide-react";

interface Group {
  id: string;
  group_jid: string;
  subject: string;
  description: string;
  participant_count: number;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .getGroups()
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = groups.filter(
    (g) =>
      g.subject.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Grupos WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {groups.length} grupo{groups.length !== 1 && "s"} encontrado{groups.length !== 1 && "s"}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar grupos..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <p className="text-muted-foreground">
            {groups.length === 0
              ? "Nenhum grupo encontrado"
              : "Nenhum grupo corresponde à busca"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((group) => (
            <div
              key={group.id}
              className="group rounded-2xl border border-border bg-card p-4 sm:p-5 hover:border-primary/30 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {group.subject || "Sem nome"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {group.participant_count} participante
                      {group.participant_count !== 1 && "s"}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
              {group.description && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {group.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
