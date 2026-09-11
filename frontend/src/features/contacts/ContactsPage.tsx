import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  Search,
  User,
  Phone,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Edit,
  X,
  Check,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Contact {
  id: string;
  phone: string;
  name: string;
  email: string;
  company: string;
  tags: string[];
  notes: string;
  avatar_url: string;
  is_whatsapp: boolean;
  is_my_contact: boolean;
  created_at: string;
}

interface ContactFormData {
  phone: string;
  name: string;
  email: string;
  company: string;
  tags: string[];
  notes: string;
  avatar_url: string;
  is_whatsapp: boolean;
}

const emptyForm: ContactFormData = {
  phone: "",
  name: "",
  email: "",
  company: "",
  tags: [],
  notes: "",
  avatar_url: "",
  is_whatsapp: true,
};

export default function ContactsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormData>(emptyForm);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [syncing, setSyncing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["contacts", search, tagFilter, page],
    queryFn: () =>
      api.listContacts({
        search: search || undefined,
        tag: tagFilter || undefined,
        page,
        per_page: 30,
      }),
  });

  const contacts: Contact[] = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 30);

  const createMutation = useMutation({
    mutationFn: (data: ContactFormData) => api.createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactFormData }) =>
      api.updateContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowDeleteConfirm(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.bulkDeleteContacts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setSelectedIds(new Set());
      setShowBulkDelete(false);
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => api.syncContactsFromWhatsApp(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setSyncing(false);
      alert(result?.message || "Contatos sincronizados");
    },
    onError: () => setSyncing(false),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.importContactsCSV(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      alert(result?.message || "Contatos importados");
    },
  });

  const handleSubmit = () => {
    if (!form.phone.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (contact: Contact) => {
    setForm({
      phone: contact.phone,
      name: contact.name,
      email: contact.email,
      company: contact.company,
      tags: contact.tags || [],
      notes: contact.notes,
      avatar_url: contact.avatar_url,
      is_whatsapp: contact.is_whatsapp,
    });
    setEditingId(contact.id);
    setShowForm(true);
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportContactsCSV();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contatos_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importMutation.mutate(file);
    e.target.value = "";
  };

  const handleSync = () => {
    setSyncing(true);
    syncMutation.mutate();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const allSelected = contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id));

  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags || [])));

  return (
    <div className="flex flex-col h-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleImport}
      />

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">{t("contacts.title", "Contatos")}</h2>
          <span className="text-xs text-muted-foreground">
            {t("contacts.count", "{{count}} contatos", { count: total })}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t("contacts.searchPlaceholder", "Buscar contato...")}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
          />
        </div>

        {/* Tags filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              onClick={() => { setTagFilter(""); setPage(1); }}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                !tagFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {t("contacts.all", "Todos")}
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => { setTagFilter(tag === tagFilter ? "" : tag); setPage(1); }}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  tagFilter === tag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("contacts.add", "Novo")}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {t("contacts.sync", "Sincronizar")}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            {t("contacts.importCsv", "Importar CSV")}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            {t("contacts.exportCsv", "Exportar CSV")}
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("contacts.deleteSelected", "Excluir")} ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <User className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {search
                ? t("contacts.noMatches", "Nenhum contato corresponde à busca")
                : t("contacts.noContacts", "Nenhum contato encontrado")}
            </p>
          </div>
        ) : (
          <>
            {/* Select all */}
            <div className="px-4 py-2 flex items-center gap-2 border-b border-border/50">
              <button
                onClick={() => {
                  if (allSelected) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(contacts.map((c) => c.id)));
                  }
                }}
                className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                  allSelected ? "bg-primary border-primary" : "border-border"
                }`}
              >
                {allSelected && <Check className="h-3 w-3 text-primary-foreground" />}
              </button>
              <span className="text-xs text-muted-foreground">
                {selectedIds.size > 0
                  ? `${selectedIds.size} ${t("contacts.selected", "selecionados")}`
                  : t("contacts.selectAll", "Selecionar todos")}
              </span>
            </div>

            {contacts.map((contact) => (
              <div
                key={contact.id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 transition-colors ${
                  selectedIds.has(contact.id) ? "bg-accent/30" : "hover:bg-accent/50"
                }`}
              >
                <button
                  onClick={() => toggleSelect(contact.id)}
                  className={`w-4 h-4 rounded border transition-colors flex-shrink-0 flex items-center justify-center ${
                    selectedIds.has(contact.id) ? "bg-primary border-primary" : "border-border"
                  }`}
                >
                  {selectedIds.has(contact.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                </button>

                <button
                  onClick={() => navigate(`/inbox/${contact.phone}@s.whatsapp.net`)}
                  className="flex-1 flex items-center gap-3 text-left min-w-0"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0 overflow-hidden">
                    {contact.avatar_url ? (
                      <img src={contact.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (contact.name || contact.phone || "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {contact.name || t("contacts.noName", "Sem nome")}
                      </span>
                      {contact.is_whatsapp && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 flex-shrink-0">
                          WA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{contact.phone}</span>
                      {contact.company && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground truncate">{contact.company}</span>
                        </>
                      )}
                    </div>
                    {contact.tags && contact.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {contact.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            {tag}
                          </span>
                        ))}
                        {contact.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{contact.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(contact)}
                    className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                    title={t("common.edit", "Editar")}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(contact.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    title={t("common.delete", "Excluir")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-xs rounded-lg bg-muted text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  {t("common.back", "Anterior")}
                </button>
                <span className="text-xs text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-xs rounded-lg bg-muted text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  {t("common.next", "Próximo")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold">
                {editingId ? t("contacts.editContact", "Editar contato") : t("contacts.newContact", "Novo contato")}
              </h3>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                className="p-1 rounded-lg hover:bg-accent text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {t("contacts.phone", "Telefone")} *
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="5511999999999"
                  disabled={!!editingId}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {t("contacts.nameLabel", "Nome")}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("contacts.namePlaceholder", "Nome do contato")}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {t("contacts.emailLabel", "E-mail")}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {t("contacts.companyLabel", "Empresa")}
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder={t("contacts.companyPlaceholder", "Nome da empresa")}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {t("contacts.tagsLabel", "Tags")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                    placeholder={t("contacts.addTagPlaceholder", "Adicionar tag...")}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-2 rounded-xl bg-muted text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {form.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                      >
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-primary/70">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {t("contacts.notesLabel", "Notas")}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={t("contacts.notesPlaceholder", "Notas sobre o contato...")}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_whatsapp"
                  checked={form.is_whatsapp}
                  onChange={(e) => setForm({ ...form, is_whatsapp: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="is_whatsapp" className="text-xs text-muted-foreground">
                  {t("contacts.hasWhatsApp", "Possui WhatsApp")}
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:bg-accent transition-colors"
              >
                {t("common.cancel", "Cancelar")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.phone.trim() || createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {editingId ? t("common.save", "Salvar") : t("contacts.create", "Criar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-2">{t("contacts.confirmDelete", "Excluir contato?")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("contacts.confirmDeleteDesc", "Esta ação não pode ser desfeita.")}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:bg-accent transition-colors"
              >
                {t("common.cancel", "Cancelar")}
              </button>
              <button
                onClick={() => deleteMutation.mutate(showDeleteConfirm)}
                className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {t("common.delete", "Excluir")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-2">
                {t("contacts.confirmBulkDelete", "Excluir contatos selecionados?")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("contacts.confirmBulkDeleteDesc", "{{count}} contatos serão excluídos. Esta ação não pode ser desfeita.", { count: selectedIds.size })}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button
                onClick={() => setShowBulkDelete(false)}
                className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:bg-accent transition-colors"
              >
                {t("common.cancel", "Cancelar")}
              </button>
              <button
                onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {t("common.delete", "Excluir")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
