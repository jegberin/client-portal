"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/toast";
import { Pagination } from "@/components/pagination";
import { FileCheck, ThumbsUp, ThumbsDown, Download, Eye, AlertCircle } from "lucide-react";

interface QuoteItem {
  id: string;
  title: string;
  description?: string | null;
  amount: number;
  status: string;
  pdfFileKey?: string | null;
  pdfFileName?: string | null;
  respondedAt?: string | null;
  responseNote?: string | null;
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#dbeafe", text: "#1d4ed8" },
  accepted: { bg: "#dcfce7", text: "#15803d" },
  declined: { bg: "#fee2e2", text: "#b91c1c" },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function PortalQuotesSection({ projectId }: { projectId: string }) {
  const { success, error: showError } = useToast();
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState("");

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", projectId });
      const res = await apiFetch<PaginatedResponse<QuoteItem>>(`/quotes/mine?${params}`);
      setQuotes(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load quotes";
      setFetchError(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, projectId]);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  const handleRespond = async (id: string, response: "accepted" | "declined") => {
    try {
      await apiFetch(`/quotes/mine/${id}/respond`, {
        method: "POST",
        body: JSON.stringify({ response, note: responseNote || undefined }),
      });
      setRespondingTo(null);
      setResponseNote("");
      loadQuotes();
      success(`Quote ${response}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to respond");
    }
  };

  const handleDownloadPdf = async (quoteId: string, title: string) => {
    try {
      const res = await fetch(`${API_URL}/api/quotes/mine/${quoteId}/pdf`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to download PDF");
    }
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-sm font-medium mb-3">Quotes</h2>
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-[var(--muted)] rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-medium mb-3">Quotes</h2>

      {fetchError && (
        <div className="flex items-start gap-2 p-3 mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Could not load quotes</p>
            <p className="text-xs mt-0.5 text-red-600">{fetchError}</p>
          </div>
        </div>
      )}

      {!fetchError && quotes.length > 0 ? (
        <div className="space-y-2">
          {quotes.map((q) => {
            const colors = statusColors[q.status] || statusColors.pending;
            const isExpanded = expandedId === q.id;
            const isSent = q.status === "pending";
            const hasPdf = !!q.pdfFileKey;

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

                    <div className="text-right">
                      <span className="text-xs text-[var(--muted-foreground)]">Amount</span>
                      <p className="text-xl font-bold">{formatCurrency(q.amount)}</p>
                    </div>

                    {hasPdf && (
                      <div className="flex items-center gap-3">
                        <a
                          href={`${API_URL}/api/quotes/mine/${q.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
                        >
                          <Eye size={14} />
                          View PDF
                        </a>
                        <button
                          onClick={() => handleDownloadPdf(q.id, q.title)}
                          className="flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
                        >
                          <Download size={14} />
                          Download PDF
                        </button>
                      </div>
                    )}

                    {isSent && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="text-sm text-[var(--muted-foreground)]">Add a note (optional)</label>
                          <textarea
                            value={respondingTo === q.id ? responseNote : ""}
                            onChange={(e) => {
                              setRespondingTo(q.id);
                              setResponseNote(e.target.value);
                            }}
                            onFocus={() => setRespondingTo(q.id)}
                            rows={2}
                            className="w-full mt-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm resize-none"
                            placeholder="Any comments or feedback..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespond(q.id, "accepted")}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:opacity-90"
                          >
                            <ThumbsUp size={14} />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespond(q.id, "declined")}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:opacity-90"
                          >
                            <ThumbsDown size={14} />
                            Decline
                          </button>
                        </div>
                      </div>
                    )}

                    {q.responseNote && q.status !== "pending" && (
                      <div className="bg-[var(--muted)] rounded-lg p-3">
                        <p className="text-xs font-medium mb-1">Your Response</p>
                        <p className="text-sm">{q.responseNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !fetchError ? (
        <div className="text-center py-6">
          <FileCheck size={32} className="mx-auto text-[var(--muted-foreground)] mb-2" />
          <p className="text-sm text-[var(--muted-foreground)]">No quotes yet.</p>
        </div>
      ) : null}

      {quotes.length > 0 && (
        <div className="mt-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
