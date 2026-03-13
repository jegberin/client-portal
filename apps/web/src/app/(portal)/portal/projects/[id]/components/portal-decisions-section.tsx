"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Pagination } from "@/components/pagination";
import { HelpCircle, CheckCircle2, Circle } from "lucide-react";

interface DecisionOption {
  id: string;
  label: string;
}

interface DecisionResponseItem {
  id: string;
  userId: string;
  choice?: string | null;
  answer?: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface DecisionItem {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  options: DecisionOption[];
  responses: DecisionResponseItem[];
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

export function PortalDecisionsSection({ projectId }: { projectId: string }) {
  const { success, error: showError } = useToast();
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [openResponse, setOpenResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDecisions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", projectId });
      const res = await apiFetch<PaginatedResponse<DecisionItem>>(`/decisions/mine?${params}`);
      setDecisions(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, projectId]);

  useEffect(() => {
    loadDecisions();
  }, [loadDecisions]);

  const handleRespond = async (id: string) => {
    setSubmitting(true);
    try {
      await apiFetch(`/decisions/mine/${id}/respond`, {
        method: "POST",
        body: JSON.stringify({
          selectedOptionId: selectedOptionId || undefined,
          openResponse: openResponse || undefined,
        }),
      });
      setSelectedOptionId(null);
      setOpenResponse("");
      loadDecisions();
      success("Response submitted");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-sm font-medium mb-3">Decisions</h2>
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-[var(--muted)] rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-medium mb-3">Decisions</h2>

      {decisions.length > 0 ? (
        <div className="space-y-2">
          {decisions.map((d) => {
            const colors = statusColors[d.status] || statusColors.open;
            const isExpanded = expandedId === d.id;
            const isOpen = d.status === "open";
            const myResponse = d.responses.length > 0 ? d.responses[0] : null;
            const hasResponded = !!myResponse;

            return (
              <div key={d.id} className="border border-[var(--border)] rounded-lg">
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : d.id);
                    setSelectedOptionId(null);
                    setOpenResponse("");
                  }}
                  className="flex items-center justify-between w-full p-3 text-left hover:bg-[var(--muted)] transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{d.title}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {d.type === "multiple_choice" ? "Multiple Choice" : "Open Question"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasResponded && (
                      <span className="text-xs text-green-600 font-medium">Responded</span>
                    )}
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {d.status}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-[var(--border)]">
                    {d.description && (
                      <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap pt-3">
                        {d.description}
                      </p>
                    )}

                    {hasResponded && (
                      <div className="pt-2">
                        <p className="text-xs text-[var(--muted-foreground)] mb-1">Your response:</p>
                        {d.type === "multiple_choice" && myResponse?.choice && (
                          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--primary)] bg-[var(--primary)]/5">
                            <CheckCircle2 size={16} className="text-[var(--primary)] shrink-0" />
                            <span className="text-sm font-medium">{myResponse.choice}</span>
                          </div>
                        )}
                        {d.type === "open" && myResponse?.answer && (
                          <div className="bg-[var(--muted)] rounded-lg p-3">
                            <p className="text-sm whitespace-pre-wrap">{myResponse.answer}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {!hasResponded && isOpen && d.type === "multiple_choice" && (
                      <div className="space-y-1.5 pt-2">
                        {d.options.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setSelectedOptionId(opt.id)}
                            className={`flex items-center gap-2 w-full p-2.5 rounded-lg border text-left transition-colors ${
                              selectedOptionId === opt.id
                                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                                : "border-[var(--border)] hover:bg-[var(--muted)]"
                            }`}
                          >
                            {selectedOptionId === opt.id ? (
                              <CheckCircle2 size={16} className="text-[var(--primary)] shrink-0" />
                            ) : (
                              <Circle size={16} className="text-[var(--muted-foreground)] shrink-0" />
                            )}
                            <span className="text-sm">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {!hasResponded && isOpen && d.type === "open" && (
                      <div className="pt-2">
                        <label className="text-sm text-[var(--muted-foreground)]">Your Response</label>
                        <textarea
                          value={openResponse}
                          onChange={(e) => setOpenResponse(e.target.value)}
                          rows={3}
                          className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm resize-none"
                          placeholder="Type your answer here..."
                        />
                      </div>
                    )}

                    {!hasResponded && isOpen && (
                      <button
                        onClick={() => handleRespond(d.id)}
                        disabled={
                          submitting ||
                          (d.type === "multiple_choice" && !selectedOptionId) ||
                          (d.type === "open" && !openResponse.trim())
                        }
                        className="w-full px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
                      >
                        {submitting ? "Submitting..." : "Submit Response"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <HelpCircle size={32} className="mx-auto text-[var(--muted-foreground)] mb-2" />
          <p className="text-sm text-[var(--muted-foreground)]">No decisions to make.</p>
        </div>
      )}

      {decisions.length > 0 && (
        <div className="mt-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
