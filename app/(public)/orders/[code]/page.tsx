"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { EVENT } from "@/config/event.config";
import { generateQrDataUrl } from "@/lib/promptpay";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  QrCode,
  Download,
  Plus,
  Loader2,
  ArrowRight,
  ShieldCheck,
  FileText,
  Upload,
} from "lucide-react";

interface TicketItem {
  id: string;
  code: string;
  holder_name: string | null;
  status: "issued" | "checked_in" | "void";
  checked_in_at: string | null;
  qrDataUrl?: string;
}

interface PaymentItem {
  id: string;
  amount_thb: number;
  to_bank: string;
  payer_name_or_last4: string;
  transferred_at: string;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  created_at: string;
}

interface OrderDetail {
  id: string;
  code: string;
  buyer_name: string;
  phone: string;
  email: string;
  quantity: number;
  unit_price_thb: number;
  total_thb: number;
  status: "pending_payment" | "under_review" | "paid" | "cancelled";
  expires_at: string | null;
  created_at: string;
  approved_amount: number;
  pending_amount: number;
  remaining_amount: number;
}

export default function OrderStatusPage({
  params,
}: {
  params: { code: string };
}) {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);

  // Additional slip modal / accordion toggle
  const [showAddSlip, setShowAddSlip] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [amountThb, setAmountThb] = useState("");
  const [transferredAt, setTransferredAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [toBank, setToBank] = useState("พร้อมเพย์");
  const [payerNameOrLast4, setPayerNameOrLast4] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchOrderData = async () => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/orders/${params.code}?t=${token}`);
      if (!res.ok) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setOrder(data.order);
      setPayments(data.payments || []);
      setAmountThb(String(data.order.remaining_amount));

      // If tickets issued, generate their QR data URLs
      if (data.tickets && data.tickets.length > 0) {
        const ticketList: TicketItem[] = [];
        for (const t of data.tickets) {
          const qr = await generateQrDataUrl(t.code, { width: 300 });
          ticketList.push({ ...t, qrDataUrl: qr });
        }
        setTickets(ticketList);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderData();
  }, [params.code, token]);

  // Download single ticket QR
  const downloadTicketQr = (qrUrl: string, code: string, index: number) => {
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `ticket-${params.code}-${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download all ticket QRs
  const downloadAllTickets = () => {
    tickets.forEach((t, idx) => {
      if (t.qrDataUrl) {
        setTimeout(() => {
          downloadTicketQr(t.qrDataUrl!, t.code, idx);
        }, idx * 250);
      }
    });
  };

  // Submit additional slip
  const handleAddSlipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !order || uploading || !token) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("file", file);
      formData.append("amount_thb", amountThb);
      formData.append("transferred_at", new Date(transferredAt).toISOString());
      formData.append("to_bank", toBank);
      formData.append("payer_name_or_last4", payerNameOrLast4.trim() || "ไม่ระบุ");

      const res = await fetch(`/api/orders/${order.code}/slip`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.message || data.error || "อัปโหลดสลิปไม่สำเร็จ");
        setUploading(false);
        return;
      }

      setFile(null);
      setShowAddSlip(false);
      await fetchOrderData();
    } catch {
      setUploadError("การเชื่อมต่อล้มเหลว กรุณาลองใหม่อีกครั้ง");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
          <span className="text-sm text-content-muted">กำลังโหลดข้อมูลสถานะคำสั่งซื้อ...</span>
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
          <AlertCircle className="w-12 h-12 text-status-warning" />
          <h1 className="text-xl font-bold text-content">ไม่พบคำสั่งซื้อ</h1>
          <p className="text-sm text-content-muted max-w-xs">
            ไม่พบคำสั่งซื้อ หรือลิงก์การเข้าถึงไม่ถูกต้อง
          </p>
          <Link
            href="/orders/lookup"
            className="mt-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-pressed transition-colors"
          >
            ค้นหาออเดอร์ของฉัน
          </Link>
        </div>
      </div>
    );
  }

  // Status badge config
  const getBadge = () => {
    switch (order.status) {
      case "paid":
        return {
          label: "ชำระเงินแล้ว",
          bg: "bg-status-success-subtle",
          text: "text-status-success",
          icon: CheckCircle2,
        };
      case "under_review":
        return {
          label: "รอตรวจสอบสลิป",
          bg: "bg-status-warning-subtle",
          text: "text-status-warning",
          icon: Clock,
        };
      case "cancelled":
        return {
          label: "ยกเลิกแล้ว",
          bg: "bg-status-danger-subtle",
          text: "text-status-danger",
          icon: XCircle,
        };
      case "pending_payment":
      default:
        if (order.approved_amount > 0) {
          return {
            label: "ชำระบางส่วน",
            bg: "bg-status-warning-subtle",
            text: "text-status-warning",
            icon: Clock,
          };
        }
        return {
          label: "รอชำระเงิน",
          bg: "bg-surface-subtle",
          text: "text-content",
          icon: Clock,
        };
    }
  };

  const badge = getBadge();
  const BadgeIcon = badge.icon;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="p-4 sm:p-6 flex flex-col gap-5 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex flex-col">
            <span className="text-xs text-content-muted">สถานะคำสั่งซื้อ</span>
            <span className="font-mono font-bold text-base text-content">
              {order.code}
            </span>
          </div>

          <div
            className={`px-3 py-1 rounded-full ${badge.bg} ${badge.text} text-xs font-semibold flex items-center gap-1.5`}
          >
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
          </div>
        </div>

        {/* Order Details Card */}
        <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-3 text-sm">
          <div className="flex justify-between items-center text-xs text-content-muted">
            <span>ผู้ซื้อ: {order.buyer_name}</span>
            <span>จำนวน: {order.quantity} ใบ</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-content-muted">ยอดรวมทั้งสิ้น:</span>
            <span className="font-semibold text-content">{order.total_thb} บาท</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-content-muted">อนุมัติแล้ว:</span>
            <span className="font-semibold text-status-success">
              {order.approved_amount} บาท
            </span>
          </div>

          {order.remaining_amount > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="font-semibold text-content">ยอดคงเหลือ:</span>
              <span className="text-xl font-bold text-brand">
                {order.remaining_amount} บาท
              </span>
            </div>
          )}
        </div>

        {/* TICKET QR CODES SECTION (Shown when PAID) */}
        {order.status === "paid" && tickets.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-brand" />
                <h2 className="text-base font-bold text-content">
                  บัตรเข้างานของคุณ ({tickets.length} ใบ)
                </h2>
              </div>
              {tickets.length > 1 && (
                <button
                  type="button"
                  onClick={downloadAllTickets}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-brand hover:border-brand/40 flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>บันทึกทั้งหมด</span>
                </button>
              )}
            </div>

            <div className="p-3 rounded-xl bg-status-success-subtle border border-status-success/30 text-status-success text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                แสดง QR Code ด้านล่างนี้ที่จุดลงทะเบียนหน้างาน สตาฟจะสแกน 1 ครั้งเพื่อมอบสายรัดข้อมือ (wristband) สำหรับเข้างาน
              </span>
            </div>

            {/* Individual Tickets */}
            <div className="grid grid-cols-1 gap-4">
              {tickets.map((t, idx) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl border border-border bg-surface flex flex-col items-center gap-3 text-center shadow-sm"
                >
                  <div className="w-full flex items-center justify-between text-xs pb-2 border-b border-border">
                    <span className="font-semibold text-content">
                      ใบที่ {idx + 1} จาก {tickets.length}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === "checked_in"
                          ? "bg-status-success-subtle text-status-success"
                          : t.status === "void"
                          ? "bg-status-danger-subtle text-status-danger"
                          : "bg-surface-subtle text-content-muted"
                      }`}
                    >
                      {t.status === "checked_in"
                        ? "เข้างานแล้ว"
                        : t.status === "void"
                        ? "ยกเลิก"
                        : "ยังไม่เข้างาน"}
                    </span>
                  </div>

                  {t.qrDataUrl && (
                    <div className="p-3 bg-white rounded-xl border border-border shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.qrDataUrl}
                        alt={`Ticket ${idx + 1}`}
                        className="w-52 h-52 object-contain"
                      />
                    </div>
                  )}

                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-content">
                      ผู้ถือบัตร: {t.holder_name || order.buyer_name}
                    </span>
                    <span className="font-mono text-[10px] text-content-muted">
                      รหัสบัตร: {t.code.slice(0, 12)}...
                    </span>
                  </div>

                  {t.qrDataUrl && (
                    <button
                      type="button"
                      onClick={() => downloadTicketQr(t.qrDataUrl!, t.code, idx)}
                      className="w-full h-10 rounded-xl border border-border bg-surface-subtle hover:bg-surface text-content text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="w-4 h-4 text-content-muted" />
                      <span>บันทึกรูป QR ใบนี้</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIPS TIMELINE */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-content">
              ประวัติการแนบสลิป ({payments.length})
            </h2>

            {order.status !== "paid" && order.status !== "cancelled" && (
              <button
                type="button"
                onClick={() => setShowAddSlip(!showAddSlip)}
                className="text-xs font-medium text-brand hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddSlip ? "ปิดฟอร์ม" : "เพิ่มสลิปการโอน"}</span>
              </button>
            )}
          </div>

          {/* Additional Slip Form Modal/Accordion */}
          {showAddSlip && (
            <form
              onSubmit={handleAddSlipSubmit}
              className="p-4 rounded-2xl border border-brand/30 bg-surface flex flex-col gap-3 text-xs"
            >
              <span className="font-semibold text-content">
                แนบสลิปเพิ่มเติมสำหรับยอดคงเหลือ ({order.remaining_amount} บาท)
              </span>

              {uploadError && (
                <div className="p-2.5 rounded-lg bg-status-danger-subtle text-status-danger">
                  {uploadError}
                </div>
              )}

              <input
                type="file"
                required
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand file:text-white"
              />

              <div className="flex gap-2">
                <input
                  type="number"
                  required
                  placeholder="ยอดเงิน (บาท)"
                  value={amountThb}
                  onChange={(e) => setAmountThb(e.target.value)}
                  className="w-1/2 h-9 px-2.5 rounded-lg border border-border"
                />
                <input
                  type="datetime-local"
                  required
                  value={transferredAt}
                  onChange={(e) => setTransferredAt(e.target.value)}
                  className="w-1/2 h-9 px-2.5 rounded-lg border border-border"
                />
              </div>

              <input
                type="text"
                required
                placeholder="ชื่อผู้โอน หรือเลขบัญชี 4 หลักท้าย"
                value={payerNameOrLast4}
                onChange={(e) => setPayerNameOrLast4(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-border"
              />

              <button
                type="submit"
                disabled={!file || uploading}
                className="w-full h-10 rounded-xl bg-brand text-white font-medium flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังส่งสลิป...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>ส่งสลิป</span>
                  </>
                )}
              </button>
            </form>
          )}

          {payments.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-border bg-surface-subtle text-center text-xs text-content-muted">
              ยังไม่มีสลิปที่แนบในออเดอร์นี้
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {payments.map((p, idx) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-content">
                      สลิปที่ {idx + 1}: {p.amount_thb} บาท
                    </span>
                    <span className="text-[11px] text-content-muted">
                      {p.to_bank} • {p.payer_name_or_last4}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      p.status === "approved"
                        ? "bg-status-success-subtle text-status-success"
                        : p.status === "rejected"
                        ? "bg-status-danger-subtle text-status-danger"
                        : "bg-status-warning-subtle text-status-warning"
                    }`}
                  >
                    {p.status === "approved"
                      ? "อนุมัติแล้ว"
                      : p.status === "rejected"
                      ? `ไม่ผ่าน (${p.reject_reason || "สลิปไม่ถูกต้อง"})`
                      : "รอตรวจ"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back to checkout if still unpaid */}
        {order.status !== "paid" && order.status !== "cancelled" && (
          <div className="pt-2">
            <Link
              href={`/checkout/${order.code}?t=${token}`}
              className="w-full h-12 rounded-xl bg-brand hover:bg-brand-pressed text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>ไปหน้าชำระเงินและสแกน PromptPay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
