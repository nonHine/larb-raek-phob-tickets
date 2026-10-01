"use client";

import { useEffect, useState } from "react";
import { StaffHeader } from "@/components/admin/StaffHeader";
import {
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Loader2,
  Ban,
  FileText,
} from "lucide-react";

interface AdminOrder {
  id: string;
  code: string;
  access_token: string;
  buyer_name: string;
  phone: string;
  email: string;
  quantity: number;
  total_thb: number;
  status: "pending_payment" | "under_review" | "paid" | "cancelled";
  approved_amount: number;
  remaining_amount: number;
  admin_note: string | null;
  created_at: string;
  payments_count: number;
  tickets_count: number;
  tickets_checked_in: number;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("q", search.trim());
      if (statusFilter !== "all") query.set("status", statusFilter);

      const res = await fetch(`/api/admin/orders?${query.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // keep
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter]);

  const handleCancelOrder = async () => {
    if (!cancellingOrderId || actionLoading) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          order_id: cancellingOrderId,
          reason: cancelReason.trim() || "Staff cancellation",
          staff_id: "staff-current",
        }),
      });

      if (res.ok) {
        setCancellingOrderId(null);
        setCancelReason("");
        await fetchOrders();
      }
    } catch {
      // keep
    } finally {
      setActionLoading(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      "Order Code",
      "Buyer Name",
      "Phone",
      "Email",
      "Quantity",
      "Total THB",
      "Approved THB",
      "Status",
      "Tickets Issued",
      "Tickets Checked In",
      "Created At",
    ];

    const rows = orders.map((o) => [
      `"${o.code}"`,
      `"${o.buyer_name}"`,
      `"${o.phone}"`,
      `"${o.email}"`,
      o.quantity,
      o.total_thb,
      o.approved_amount,
      `"${o.status}"`,
      o.tickets_count,
      o.tickets_checked_in,
      `"${new Date(o.created_at).toLocaleString("th-TH")}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <StaffHeader />

      <div className="p-4 sm:p-6 flex flex-col gap-4 flex-1">
        {/* Title & CSV Export */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-content">รายการคำสั่งซื้อ</h1>

          <button
            type="button"
            onClick={exportCsv}
            className="px-3 py-1.5 rounded-lg border border-border bg-surface text-content hover:text-brand hover:border-brand/40 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-content-muted absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, เบอร์โทร, อีเมล หรือรหัสออเดอร์..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "under_review", label: "รอตรวจสลิป" },
              { id: "pending_payment", label: "รอชำระเงิน" },
              { id: "paid", label: "ชำระเงินแล้ว" },
              { id: "cancelled", label: "ยกเลิกแล้ว" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? "bg-brand text-white"
                    : "bg-surface border border-border text-content-muted hover:text-content"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-2 text-content-muted">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <span className="text-xs">กำลังโหลดรายการออเดอร์...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-border bg-surface text-center text-xs text-content-muted">
            ไม่พบคำสั่งซื้อที่ตรงกับเงื่อนไข
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {orders.map((o) => (
              <div
                key={o.id}
                className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-2.5 text-xs shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-content">
                      {o.code}
                    </span>
                    <span className="text-[10px] text-content-muted">
                      ({o.quantity} ใบ)
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      o.status === "paid"
                        ? "bg-status-success-subtle text-status-success"
                        : o.status === "under_review"
                        ? "bg-status-warning-subtle text-status-warning"
                        : o.status === "cancelled"
                        ? "bg-status-danger-subtle text-status-danger"
                        : "bg-surface-subtle text-content-muted"
                    }`}
                  >
                    {o.status === "paid"
                      ? "ชำระแล้ว"
                      : o.status === "under_review"
                      ? "รอตรวจสลิป"
                      : o.status === "cancelled"
                      ? "ยกเลิกแล้ว"
                      : "รอชำระเงิน"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-content">
                  <span className="font-medium">
                    {o.buyer_name} • {o.phone}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-sm text-brand">
                      {o.total_thb}
                    </span>
                    <span className="text-content-muted">บาท</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-content-muted text-[11px] pt-1 border-t border-border">
                  <span>
                    สลิป: {o.payments_count} | บัตรออก: {o.tickets_count} (เข้างานแล้ว: {o.tickets_checked_in})
                  </span>
                  <span>{new Date(o.created_at).toLocaleDateString("th-TH")}</span>
                </div>

                {/* Cancel action if not cancelled */}
                {o.status !== "cancelled" && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCancellingOrderId(o.id)}
                      className="px-2.5 py-1 rounded-lg border border-border text-status-danger hover:bg-status-danger-subtle text-[11px] font-medium transition-colors"
                    >
                      ยกเลิกออเดอร์
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Order Confirmation Modal */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface rounded-2xl p-5 border border-border shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-status-danger font-bold text-sm">
              <Ban className="w-5 h-5" />
              <span>ยืนยันยกเลิกคำสั่งซื้อนี้?</span>
            </div>

            <p className="text-xs text-content-muted leading-relaxed">
              การยกเลิกคำสั่งซื้อจะทำให้บัตร QR Code ทั้งหมดของออเดอร์นี้ถูกเปลี่ยนสถานะเป็น
              &quot;โมฆะ (void)&quot; และไม่สามารถนำมาสแกนเข้างานได้อีก
            </p>

            <input
              type="text"
              placeholder="ระบุเหตุผลการยกเลิก..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border text-xs"
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingOrderId(null)}
                className="w-1/2 h-10 rounded-xl border border-border text-xs font-semibold"
              >
                ปิด
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelOrder}
                className="w-1/2 h-10 rounded-xl bg-status-danger text-white text-xs font-semibold disabled:opacity-50"
              >
                {actionLoading ? "กำลังดำเนินการ..." : "ยืนยันยกเลิก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
