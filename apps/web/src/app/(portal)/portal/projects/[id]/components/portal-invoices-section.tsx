"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/toast";
import { Pagination } from "@/components/pagination";
import { Receipt, Download, Eye, AlertCircle } from "lucide-react";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  status: string;
  dueDate?: string | null;
  notes?: string | null;
  pdfFileKey?: string | null;
  pdfFileName?: string | null;
  projectId?: string | null;
  lineItems: LineItem[];
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#e5e7eb", text: "#374151" },
  sent: { bg: "#dbeafe", text: "#1d4ed8" },
  paid: { bg: "#dcfce7", text: "#15803d" },
  overdue: { bg: "#fee2e2", text: "#b91c1c" },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function PortalInvoicesSection({
  projectId,
}: {
  projectId: string;
}) {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { error: showError } = useToast();

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await apiFetch<PaginatedResponse<InvoiceListItem>>(
        `/invoices/mine?page=${page}&limit=20`,
      );
      const projectInvoices = res.data.filter(
        (inv) => inv.projectId === projectId,
      );
      setInvoices(projectInvoices);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load invoices";
      setFetchError(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, projectId]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/invoices/mine/${invoiceId}/pdf`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
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
        <h2 className="text-sm font-medium mb-3">Invoices</h2>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-[var(--muted)] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-medium mb-3">Invoices</h2>

      {fetchError && (
        <div className="flex items-start gap-2 p-3 mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Could not load invoices</p>
            <p className="text-xs mt-0.5 text-red-600">{fetchError}</p>
          </div>
        </div>
      )}

      {!fetchError && invoices.length > 0 ? (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const colors = statusColors[inv.status] || statusColors.draft;
            const total = inv.lineItems.reduce(
              (s, li) => s + li.quantity * li.unitPrice,
              0,
            );
            const isExpanded = expandedId === inv.id;
            const hasPdf = !!inv.pdfFileKey;

            return (
              <div key={inv.id} className="border border-[var(--border)] rounded-lg">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                  className="flex items-center justify-between w-full p-3 text-left hover:bg-[var(--muted)] transition-colors rounded-lg"
                >
                  <span className="text-sm font-medium">{inv.invoiceNumber}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {formatCurrency(total)}
                    </span>
                    {inv.dueDate && (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        Due {new Date(inv.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {inv.status}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between pt-3">
                      {inv.dueDate ? (
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Due: {new Date(inv.dueDate).toLocaleDateString()}
                        </p>
                      ) : <div />}
                      {hasPdf && (
                        <div className="flex items-center gap-3">
                          <a
                            href={`${API_URL}/api/invoices/mine/${inv.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
                          >
                            <Eye size={14} />
                            View PDF
                          </a>
                          <button
                            onClick={() => handleDownloadPdf(inv.id, inv.invoiceNumber)}
                            className="flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
                          >
                            <Download size={14} />
                            Download PDF
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[var(--muted)]">
                            <th className="text-left px-4 py-2 font-medium">Description</th>
                            <th className="text-right px-4 py-2 font-medium">Qty</th>
                            <th className="text-right px-4 py-2 font-medium">Unit Price</th>
                            <th className="text-right px-4 py-2 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.lineItems.map((li) => (
                            <tr key={li.id} className="border-t border-[var(--border)]">
                              <td className="px-4 py-2">{li.description}</td>
                              <td className="px-4 py-2 text-right">{li.quantity}</td>
                              <td className="px-4 py-2 text-right">
                                {formatCurrency(li.unitPrice)}
                              </td>
                              <td className="px-4 py-2 text-right font-medium">
                                {formatCurrency(li.quantity * li.unitPrice)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-[var(--border)] bg-[var(--muted)]">
                            <td colSpan={3} className="px-4 py-2 text-right font-medium">
                              Total
                            </td>
                            <td className="px-4 py-2 text-right font-bold">
                              {formatCurrency(total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {inv.notes && (
                      <div>
                        <p className="text-xs font-medium mb-1">Notes</p>
                        <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap">
                          {inv.notes}
                        </p>
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
          <Receipt size={32} className="mx-auto text-[var(--muted-foreground)] mb-2" />
          <p className="text-sm text-[var(--muted-foreground)]">
            No invoices yet.
          </p>
        </div>
      ) : null}

      {invoices.length > 0 && (
        <div className="mt-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
