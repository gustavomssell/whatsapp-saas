import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Search, User, Phone, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Contact {
  id: string;
  pushName: string;
  phone: string;
  avatarUrl: string;
  isMyContact: boolean;
}

export default function ContactsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", search],
    queryFn: () => api.getContacts(search || undefined).then((r) => r.data || []),
    enabled: true,
  });

  const filtered = contacts.filter(
    (c: Contact) =>
      c.pushName?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">{t("contacts.title", "Contatos")}</h2>
          <span className="text-xs text-muted-foreground">
            {t("contacts.count", "{{count}} contatos", { count: contacts.length })}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("contacts.searchPlaceholder", "Buscar contato...")}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <User className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {contacts.length === 0
                ? t("contacts.noContacts", "Nenhum contato encontrado")
                : t("contacts.noMatches", "Nenhum contato corresponde à busca")}
            </p>
          </div>
        ) : (
          filtered.map((contact: Contact) => (
            <button
              key={contact.id || contact.phone}
              onClick={() => navigate(`/inbox/${contact.phone}@s.whatsapp.net`)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/50"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0 overflow-hidden">
                {contact.avatarUrl ? (
                  <img src={contact.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (contact.pushName || contact.phone || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">
                    {contact.pushName || t("contacts.noName", "Sem nome")}
                  </span>
                  {contact.isMyContact && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {t("contacts.saved", "Salvo")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{contact.phone}</p>
                </div>
              </div>
              <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
