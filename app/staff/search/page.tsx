"use client";

import { useState } from "react";
import Link from "next/link";
import { StaffHeader } from "@/components/admin/StaffHeader";
import {
  Search,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Loader2,
  User,
  Phone,
} from "lucide-react";

interface TicketSearchResult {
  ticket_id: string;
  ticket_code: string;
  holder_name: string;
  ticket_status: "issued" | "checked_in" | "void";
  checked_in_at: string | null;
  order_code: string;
  buyer_name: string;
  phone: string;
  order_status: string;
}

export default function StaffSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TicketSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch(
        `/api/staff/search?q=${encodeURIComponent(query.trim())}`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.tickets || []);
      }
    } catch {
      // keep
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (ticket: TicketSearchResult) => {
    setCheckingInId(ticket.ticket_id);
    try {
      const res = await fetch("/api/staff/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_code: ticket.ticket_code,
          staff_id: "staff-manual",
        }),
      });

      if (res.ok) {
        // Update local status
        setResults((prev) =>
          prev.map((t) =>
            t.ticket_id === ticket.ticket_id
              ? {
                  ...t,
                  ticket_status: "checked_in",
                  checked_in_at: new Date().toISOString(),
                }
              : t
          )
        );
      }
    } catch {
      // keep
    } finally {
      setCheckingInId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-subtle">
      <StaffHeader staffRole="scanner" />

      <div className="p-4 sm:p-6 flex flex-col gap-4 flex-1 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between">
          <Link
            href="/staff/scan"
            className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าสแกนกล้อง</span>
          </Link>

          <span className="text-xs font-semibold text-content-muted">
            ค้นหาบัตรด้วยตนเอง
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-content-muted absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              placeholder="ค้นหาชื่อ, เบอร์โทร หรือรหัสออเดอร์..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 h-11 rounded-xl bg-brand hover:bg-brand-pressed text-white text-xs font-semibold shadow-sm transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "ค้นหา"}
          </button>
        </form>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-2 text-content-muted">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <span className="text-xs">กำลังค้นหาข้อมูล...</span>
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-border bg-surface text-center text-xs text-content-muted">
            ไม่พบบัตรที่ตรงกับคำค้นหา &quot;{query}&quot;
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {results.map((t) => (
              <div
                key={t.ticket_id}
                className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-3 shadow-sm text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-content">
                    {t.order_code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.ticket_status === "checked_in"
                        ? "bg-status-success-subtle text-status-success"
                        : t.ticket_status === "void"
                        ? "bg-status-danger-subtle text-status-danger"
                        : "bg-status-warning-subtle text-status-warning"
                    }`}
                  >
                    {t.ticket_status === "checked_in"
                      ? "เข้างานแล้ว"
                      : t.ticket_status === "void"
                      ? "ยกเลิก"
                      : "ยังไม่เข้างาน"}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-content text-sm">
                    {t.holder_name}
                  </span>
                  <span className="text-content-muted">
                    เบอร์โทร: {t.phone} | รหัสบัตร: {t.ticket_code.slice(0, 12)}...
                  </span>
                </div>

                {t.ticket_status === "issued" && (
                  <button
                    type="button"
                    disabled={checkingInId === t.ticket_id}
                    onClick={() => handleCheckIn(t)}
                    className="w-full h-11 rounded-xl bg-status-success hover:bg-status-success/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    {checkingInId === t.ticket_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ให้ wristband แล้ว (เช็กอิน)</span>
                      </>
                    )}
                  </button>
                )}

                {t.ticket_status === "checked_in" && (
                  <div className="p-2 rounded-lg bg-status-success-subtle text-status-success text-[11px] text-center font-medium">
                    เข้างานแล้วเมื่อ{" "}
                    {t.checked_in_at
                      ? new Date(t.checked_in_at).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "ก่อนหน้านี้"}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
