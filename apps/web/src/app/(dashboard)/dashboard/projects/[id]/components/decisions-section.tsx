"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import { Pagination } from "@/components/pagination";
import { Plus, Trash2, HelpCircle, CheckCircle2, Circle } from "lucide-react";

interface DecisionOption {
  id: string;
  label: string;
  selected: boolean;
}

interface DecisionItem {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  openResponse?: string | null;
  respondedById?: string | null;
  respondedAt?: string | null;
  options: DecisionOption[];
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const statusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: "#dbeafe", text: "#1d4ed8" },
  closed: { bg: "#dcfce7", text: "#15803d" },
};

export function DecisionsSection({
  projectId,
  isArchived,
}: {
  projectId: string;
  isArchived: boolean;
}) {
  const confirm = useConfirm();
  const { success, error: showError } = useToast();
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<"multiple_choice" | "open">("multiple_choice");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  const loadDecisions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10", projectId });
      const res = await apiFetch<PaginatedResponse<DecisionItem>>(`/decisions?${params}`);
      setDecisions(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, page]);

  useEffect(() => {
    loadDecisions();
  }, [loadDecisions]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await apiFetch("/decisions", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || undefined,
          type: newType,
          projectId,
          options: newType === "multiple_choice"
            ? newOptions.filter((o) => o.trim()).map((label) => ({ label }))
            : undefined,
        }),
      });
      setShowCreate(false);
      setNewTitle("");
      setNewDescription("");
      setNewType("multiple_choice");
      setNewOptions(["", ""]);
      loadDecisions();
      success("Decision created");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create decision");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (id: string) => {
    try {
      await apiFetch(`/decisions/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "closed" }),
      });
      loadDecisions();
      success("Decision closed");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to close decision");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete Decision",
      message: "Delete this decision? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/decisions/${id}`, { method: "DELETE" });
      loadDecisions();
      success("Decision deleted");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete decision");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <HelpCircle size={14} />
          Decisions{decisions.length > 0 && ` (${decisions.length})`}
        </h2>
        {!isArchived && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-sm hover:opacity-90"
          >
            <Plus size={14} />
            New Decision
          </button>
        )}
      </div>

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="bg-[var(--background)] rounded-xl shadow-lg w-full max-w-lg mx-4 p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold">New Decision</h3>
            <div>
              <label className="text-sm text-[var(--muted-foreground)]">Question / Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm"
                placeholder="e.g. Which colour scheme do you prefer?"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--muted-foreground)]">Description (optional)</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--muted-foreground)]">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as "multiple_choice" | "open")}
                className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="open">Open Question</option>
              </select>
            </div>

            {newType === "multiple_choice" && (
              <div>
                <label className="text-sm text-[var(--muted-foreground)]">Options</label>
                <div className="space-y-2 mt-1">
                  {newOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Circle size={14} className="text-[var(--muted-foreground)] shrink-0" />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...newOptions];
                          updated[i] = e.target.value;
                          setNewOptions(updated);
                        }}
                        className="flex-1 px-3 py-1.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm"
                        placeholder={`Option ${i + 1}`}
                      />
                      {newOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setNewOptions((prev) => prev.filter((_, idx) => idx !== i))}
                          className="p-1 text-[var(--muted-foreground)] hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewOptions((prev) => [...prev, ""])}
                    className="flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
                  >
                    <Plus size={14} />
                    Add Option
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--muted)]">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !newTitle.trim() || (newType === "multiple_choice" && newOptions.filter((o) => o.trim()).length < 2)}
                className="px-4 py-1.5 bg-[var(--primary)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Decision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-[var(--muted)] rounded-lg animate-pulse" />)}
        </div>
      ) : decisions.length > 0 ? (
        <div className="space-y-2">
          {decisions.map((d) => {
            const colors = statusColors[d.status] || statusColors.open;
            const isExpanded = expandedId === d.id;
            const selectedOption = d.options.find((o) => o.selected);
            return (
              <div key={d.id} className="border border-[var(--border)] rounded-lg">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                  className="flex items-center justify-between w-full p-3 text-left hover:bg-[var(--muted)] transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{d.title}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {d.type === "multiple_choice" ? "Multiple Choice" : "Open Question"}
                    </span>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {d.status}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-[var(--border)]">
                    {d.description && (
                      <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap pt-3">
                        {d.description}
                      </p>
                    )}

                    {d.type === "multiple_choice" && d.options.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        {d.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                              opt.selected
                                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                                : "border-[var(--border)]"
                            }`}
                          >
                            {opt.selected ? (
                              <CheckCircle2 size={16} className="text-[var(--primary)] shrink-0" />
                            ) : (
                              <Circle size={16} className="text-[var(--muted-foreground)] shrink-0" />
                            )}
                            <span className={`text-sm ${opt.selected ? "font-medium" : ""}`}>
                              {opt.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {d.status === "closed" && selectedOption && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Client selected: <span className="font-medium">{selectedOption.label}</span>
                      </p>
                    )}

                    {d.status === "closed" && d.type === "open" && d.openResponse && (
                      <div className="bg-[var(--muted)] rounded-lg p-3">
                        <p className="text-xs font-medium mb-1">Client Response</p>
                        <p className="text-sm whitespace-pre-wrap">{d.openResponse}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      {d.status === "open" && !isArchived && (
                        <button
                          onClick={() => handleClose(d.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:opacity-90"
                        >
                          Close Decision
                        </button>
                      )}
                      {!isArchived && (
                        <button
                          onClick={() => handleDelete(d.id)}
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
          <HelpCircle size={32} className="mx-auto text-[var(--muted-foreground)] mb-2" />
          <p className="text-sm text-[var(--muted-foreground)]">No decisions yet.</p>
        </div>
      )}

      <div className="mt-3">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
