"use client";

import { useEffect, useState } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  FileText,
  Save,
  Send,
  ExternalLink,
  Ticket as TicketIcon,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  History,
} from "lucide-react";

interface TicketItem {
  id: string;
  code?: string;
  ticket_code?: string;
  status: "issued" | "checked_in" | "void";
  checked_in_at: string | null;
  checked_in_by: string | null;
}

interface PaymentItem {
  id: string;
  amount_thb: number;
  to_bank: string;
  payer_name_or_last4: string | null;
  transferred_at: string | null;
  slip_path: string | null;
  status: "pending" | "approved" | "rejected";
  ai_verified?: boolean;
  ai_confidence?: number;
  ai_reason?: string;
  created_at: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  actor: string;
  created_at: string;
  meta: any;
}

interface OrderDetail {
  id: string;
  code: string;
  buyer_name: string;
  phone: string;
  email: string;
  quantity: number;
  total_thb: number;
  status: "pending_payment" | "under_review" | "paid" | "cancelled";
  access_token: string;
  admin_note: string | null;
  created_at: string;
}

interface CustomerDetailModalProps {
  orderId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function CustomerDetailModal({
  orderId,
  onClose,
  onUpdated,
}: CustomerDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Form states
  const [buyerName, setBuyerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Email resend state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Slip preview state
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let mounted = true;
    setLoading(true);
    setSaveSuccess(false);
    setSaveError(null);
    setEmailFeedback(null);

    async function loadData() {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.order) {
            setOrder(data.order);
            setPayments(data.payments || []);
            setTickets(data.tickets || []);
            setAuditLogs(data.audit_logs || []);

            setBuyerName(data.order.buyer_name || "");
            setPhone(data.order.phone === "0000000000" ? "-" : data.order.phone || "");
            setEmail(data.order.email || "");
            setAdminNote(data.order.admin_note || "");
          }
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [orderId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || saving) return;

    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_name: buyerName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          admin_note: adminNote.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(true);
        setOrder(data.order);
        if (onUpdated) onUpdated();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(data.error || "เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err: any) {
      setSaveError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSaving(false);
    }
  };

  const handleResendEmail = async () => {
    if (!order || sendingEmail) return;

    setSendingEmail(true);
    setEmailFeedback(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/resend-email`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setEmailFeedback({
          success: true,
          message: data.message || "ส่งอีเมลเรียบร้อยแล้ว",
        });
      } else {
        setEmailFeedback({
          success: false,
          message: data.message || data.error || "ไม่สามารถส่งอีเมลได้",
        });
      }
    } catch {
      setEmailFeedback({
        success: false,
        message: "เกิดข้อผิดพลาดในการส่งอีเมล",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-2xl bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface-subtle/50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-base sm:text-lg font-extrabold text-content">
              {order ? order.code : "กำลังโหลด..."}
            </span>

            {order && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  order.status === "paid"
                    ? "bg-status-success-subtle text-status-success"
                    : order.status === "under_review"
                    ? "bg-status-warning-subtle text-status-warning"
                    : order.status === "cancelled"
                    ? "bg-status-danger-subtle text-status-danger"
                    : "bg-surface text-content-muted border border-border"
                }`}
              >
                {order.status === "paid"
                  ? "ชำระแล้ว"
                  : order.status === "under_review"
                  ? "รอตรวจสลิป"
                  : order.status === "cancelled"
                  ? "ยกเลิกแล้ว"
                  : "รอชำระเงิน"}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-content-muted hover:text-content hover:bg-surface border border-transparent hover:border-border transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3 text-content-muted">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
            <span className="text-xs font-medium">กำลังโหลดข้อมูลคำสั่งซื้อ...</span>
          </div>
        ) : !order ? (
          <div className="p-12 text-center text-status-danger text-sm">
            ไม่พบข้อมูลคำสั่งซื้อนี้
          </div>
        ) : (
          <div className="overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-surface-subtle border border-border">
              <a
                href={`/orders/${order.code}?token=${order.access_token}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-content hover:text-brand hover:border-brand/40 text-xs font-semibold shadow-sm transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5 text-brand" />
                <span>เปิดดูหน้าตั๋วของลูกค้า</span>
              </a>

              <button
                type="button"
                onClick={handleResendEmail}
                disabled={sendingEmail}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 border border-brand/20 text-brand hover:bg-brand hover:text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {sendingEmail ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>ส่งอีเมลตั๋วซ้ำ</span>
              </button>

              <div className="ml-auto text-xs text-content-muted">
                ยอดรวม: <span className="font-bold text-brand">{order.total_thb} ฿</span> ({order.quantity} ใบ)
              </div>
            </div>

            {/* Email Feedback Banner */}
            {emailFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                  emailFeedback.success
                    ? "bg-status-success-subtle text-status-success border-status-success/30"
                    : "bg-status-danger-subtle text-status-danger border-status-danger/30"
                }`}
              >
                {emailFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{emailFeedback.message}</span>
              </div>
            )}

            {/* Editable Customer Information Form */}
            <form onSubmit={handleSave} className="flex flex-col gap-3.5 p-4 rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <div className="flex items-center gap-2 text-xs font-bold text-content">
                  <User className="w-4 h-4 text-brand" />
                  <span>ข้อมูลติดต่อลูกค้า (แก้ไขได้)</span>
                </div>
                <span className="text-[10px] text-content-muted">
                  บันทึกประวัติการแก้ไขลง Audit Log
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-content-muted flex items-center gap-1">
                    <User className="w-3 h-3" /> ชื่อ / นามสกุล / ชื่อเล่น
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs text-content focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-content-muted flex items-center gap-1">
                    <Phone className="w-3 h-3" /> เบอร์โทรศัพท์
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="เช่น 0812345678 หรือ -"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs text-content focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[11px] font-semibold text-content-muted flex items-center gap-1">
                    <Mail className="w-3 h-3" /> อีเมลสำหรับรับตั๋ว
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs text-content focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[11px] font-semibold text-content-muted flex items-center gap-1">
                    <FileText className="w-3 h-3" /> บันทึกช่วยจำแอดมิน (Admin Note)
                  </label>
                  <textarea
                    rows={2}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="เช่น โอนเงินผ่านมือถือเพื่อน, ขอเปลี่ยนอีเมลหน้าร้าน, ฯลฯ"
                    className="w-full p-2.5 rounded-lg border border-border bg-surface text-xs text-content focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>

              {saveError && (
                <div className="text-xs text-status-danger bg-status-danger-subtle p-2.5 rounded-lg border border-status-danger/20">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="text-xs text-status-success bg-status-success-subtle p-2.5 rounded-lg border border-status-success/20 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกการแก้ไขข้อมูลลูกค้าเรียบร้อยแล้ว</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-pressed text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{saving ? "กำลังบันทึก..." : "💾 บันทึกข้อมูลลูกค้า"}</span>
                </button>
              </div>
            </form>

            {/* Tickets List */}
            <div className="flex flex-col gap-2.5 p-4 rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <div className="flex items-center gap-2 text-xs font-bold text-content">
                  <TicketIcon className="w-4 h-4 text-brand" />
                  <span>รายการบัตร ({tickets.length} ใบ)</span>
                </div>
                <span className="text-[11px] text-content-muted">
                  เข้างานแล้ว: {tickets.filter((t) => t.status === "checked_in").length} / {tickets.length}
                </span>
              </div>

              {tickets.length === 0 ? (
                <div className="text-xs text-content-muted py-2 text-center">
                  ยังไม่มีการออกบัตรสำหรับคำสั่งซื้อนี้
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {tickets.map((t, index) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg border border-border bg-surface-subtle/40 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-content-muted text-[10px]">
                          #{index + 1}
                        </span>
                        <span className="font-mono font-bold text-content">
                          {t.code || t.ticket_code}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {t.status === "checked_in" ? (
                          <div className="flex items-center gap-1 text-[11px] text-status-success font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              เข้างานแล้ว ({t.checked_in_at ? new Date(t.checked_in_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"})
                            </span>
                          </div>
                        ) : t.status === "void" ? (
                          <span className="text-[11px] text-status-danger font-medium">
                            โมฆะ
                          </span>
                        ) : (
                          <span className="text-[11px] text-content-muted font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> ยังไม่เข้างาน
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payments & Slips */}
            <div className="flex flex-col gap-2.5 p-4 rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <div className="flex items-center gap-2 text-xs font-bold text-content">
                  <Receipt className="w-4 h-4 text-brand" />
                  <span>หลักฐานการชำระเงิน ({payments.length} รายการ)</span>
                </div>
              </div>

              {payments.length === 0 ? (
                <div className="text-xs text-content-muted py-2 text-center">
                  ยังไม่มีหลักฐานการชำระเงิน
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-lg border border-border bg-surface-subtle/30 flex flex-col gap-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand text-sm">
                            {p.amount_thb} ฿
                          </span>
                          <span className="text-content-muted text-[11px]">
                            • {p.to_bank}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                            ? "ปฏิเสธ"
                            : "รอตรวจ"}
                        </span>
                      </div>

                      <div className="text-[11px] text-content-muted flex justify-between">
                        <span>ผู้โอน: {p.payer_name_or_last4 || "-"}</span>
                        <span>
                          {p.transferred_at
                            ? new Date(p.transferred_at).toLocaleString("th-TH")
                            : new Date(p.created_at).toLocaleString("th-TH")}
                        </span>
                      </div>

                      {/* AI Verification Badge */}
                      {p.ai_verified !== undefined && (
                        <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20 text-[11px] flex items-center justify-between text-purple-700 dark:text-purple-300">
                          <span className="font-medium">
                            🤖 AI Confidence: {p.ai_confidence || 0}%
                          </span>
                          <span className="text-[10px] opacity-90 truncate max-w-[200px]">
                            {p.ai_reason || "ตรวจสอบโดยโมเดล Gemini Vision"}
                          </span>
                        </div>
                      )}

                      {/* Slip preview trigger */}
                      {p.slip_path && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setPreviewSlipUrl(p.slip_path)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface border border-border hover:border-brand/40 text-[11px] font-medium text-content transition-colors"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-brand" />
                            <span>ดูรูปภาพสลิปจริง</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Logs */}
            {auditLogs.length > 0 && (
              <div className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-surface shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-content pb-1 border-b border-border">
                  <History className="w-4 h-4 text-brand" />
                  <span>ประวัติบันทึกระบบ (Audit Log)</span>
                </div>

                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto text-[11px]">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-1 border-b border-border/50 last:border-0 text-content-muted"
                    >
                      <span className="font-mono text-content">
                        {log.action}
                      </span>
                      <span>
                        {new Date(log.created_at).toLocaleTimeString("th-TH")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slip Image Fullscreen Modal */}
      {previewSlipUrl && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-surface rounded-2xl overflow-hidden p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-bold text-content">หลักฐานสลิปโอนเงิน</span>
              <button
                type="button"
                onClick={() => setPreviewSlipUrl(null)}
                className="p-1 text-content-muted hover:text-content"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSlipUrl}
              alt="Payment Slip"
              className="w-full max-h-[70vh] object-contain rounded-xl bg-stone-950"
            />
          </div>
        </div>
      )}
    </div>
  );
}
