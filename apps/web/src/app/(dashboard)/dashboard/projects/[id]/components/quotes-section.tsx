"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import { Pagination } from "@/components/pagination";
import { Plus, Trash2, FileCheck, Send } from "lucide-react";

interface QuoteItem {
  id: string;
  title: string;
  description?: string | null;
  amount: number;
  status: string;
  respondedById?: string | null;
  respondedAt?: string | null;
  responseNote?: string | null;
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#e5e7eb", text: "#374151" },
  sent: { bg: "#dbeafe", text: "#1d4ed8" },
  accepted: { bg: "#dcfce7", text: "#15803d" },
  declined: { bg: "#fee2e2", text: "#b91c1c" },
};

export function QuotesSection({
  projectId,
  isArchived,
}: {
  projectId: string;
  isArchived: boolean;
}) {
  const confirm = useConfirm();
  const { success, error: showError } = useToast();
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10", projectId });
      const res = await apiFetch<PaginatedResponse<QuoteItem>>(`/quotes?${params}`);
      setQuotes(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, page]);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await apiFetch("/quotes", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || undefined,
          amount: Math.round(parseFloat(newAmount || "0") * 100),
          projectId,
        }),
      });
      setShowCreate(false);
      setNewTitle("");
      setNewDescription("");
      setNewAmount("");
      loadQuotes();
      success("Quote created");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create quote");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiFetch(`/quotes/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      loadQuotes();
      success(`Quote marked as ${status}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update quote");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete Quote",
      message: "Delete this quote? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/quotes/${id}`, { method: "DELETE" });
      loadQuotes();
      success("Quote deleted");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete quote");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <FileCheck size={14} />
          Quotes{quotes.length > 0 && ` (${quotes.length})`}
        </h2>
        {!isArchived && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-sm hover:opacity-90"
          >
            <Plus size={14} />
            New Quote
          </button>
        )}
      </div>

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="bg-[var(--background)] rounded-xl shadow-lg w-full max-w-lg mx-4 p-6 space-y-4">
            <h3 className="text-lg font-semibold">New Quote</h3>
            <div>
              <label className="text-sm text-[var(--muted-foreground)]">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm"
                placeholder="e.g. Website Redesign Phase 1"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--muted-foreground)]">Description</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm resize-none"
                placeholder="Describe the scope of this quote..."
              />
            </div>
            <div>
              <label className="text-sm text-[var(--muted-foreground)]">Amount</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">&euro;</span>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  step="0.01"
                  min={0}
                  className="w-full pl-7 pr-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--muted)]">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !newTitle.trim()}
                className="px-4 py-1.5 bg-[var(--primary)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Quote"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-[var(--muted)] rounded-lg animate-pulse" />)}
        </div>
      ) : quotes.length > 0 ? (
        <div className="space-y-2">
          {quotes.map((q) => {
            const colors = statusColors[q.status] || statusColors.draft;
            const isExpanded = expandedId === q.id;
            return (
              <div key={q.id} className="border border-[var(--border)] rounded-lg">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  className="flex items-center justify-between w-full p-3 text-left hover:bg-[var(--muted)] transition-colors rounded-lg"
                >
                  <span className="text-sm font-medium">{q.title}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{formatCurrency(q.amount)}</span>
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {q.status}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-[var(--border)]">
                    {q.description && (
                      <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap pt-3">
                        {q.description}
                      </p>
                    )}

                    {q.responseNote && (
                      <div className="bg-[var(--muted)] rounded-lg p-3">
                        <p className="text-xs font-medium mb-1">Client Response</p>
                        <p className="text-sm">{q.responseNote}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      {q.status === "draft" && !isArchived && (
                        <button
                          onClick={() => handleStatusChange(q.id, "sent")}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:opacity-90"
                        >
                          <Send size={12} />
                          Send to Client
                        </button>
                      )}
                      {!isArchived && (
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:underline"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <FileCheck size={32} className="mx-auto text-[var(--muted-foreground)] mb-2" />
          <p className="text-sm text-[var(--muted-foreground)]">No quotes yet.</p>
        </div>
      )}

      <div className="mt-3">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
