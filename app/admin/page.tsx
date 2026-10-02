"use client";

import { useEffect, useState, useRef } from "react";
import { StaffHeader } from "@/components/admin/StaffHeader";
import {
  Clock,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Check,
  X,
  RefreshCw,
  Loader2,
  Calendar,
  Building,
  User,
  CreditCard,
} from "lucide-react";

interface QueueItem {
  payment: {
    id: string;
    order_id: string;
    slip_path: string;
    slip_sha256: string;
    amount_thb: number;
    transferred_at: string;
    to_bank: string;
    payer_name_or_last4: string;
    created_at: string;
    slip_url?: string | null;
  };
  order: {
    id: string;
    code: string;
    buyer_name: string;
    phone: string;
    email: string;
    quantity: number;
    total_thb: number;
    approved_amount: number;
    remaining_amount: number;
    created_at: string;
  };
  duplicates: Array<{
    payment_id: string;
    order_code: string;
    status: string;
    reason: string;
  }>;
}

export default function AdminSlipQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const prevCountRef = useRef(0);

  // Review modal state
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [correctingAmount, setCorrectingAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sound generator using Web Audio API (no external file needed)
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio not permitted yet
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch("/api/admin/slips", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const items: QueueItem[] = data.queue || [];
        setQueue(items);

        // Sound trigger when new slips arrive
        if (soundEnabled && items.length > prevCountRef.current) {
          playBeep();
        }
        prevCountRef.current = items.length;
      }
    } catch {
      // Keep state on failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // 5-second polling
    return () => clearInterval(interval);
  }, [soundEnabled]);

  const handleOpenReview = (item: QueueItem) => {
    setSelectedItem(item);
    setCorrectingAmount(false);
    setCustomAmount(String(item.payment.amount_thb));
    setRejecting(false);
    setRejectReason("");
    setActionError(null);
  };

  const handleApprove = async () => {
    if (!selectedItem || submittingAction) return;

    setSubmittingAction(true);
    setActionError(null);

    try {
      const body: any = { reviewer_id: "staff-current" };
      if (
        correctingAmount &&
        customAmount &&
        Number(customAmount) !== selectedItem.payment.amount_thb
      ) {
        body.corrected_amount = Number(customAmount);
      }

      const res = await fetch(
        `/api/admin/slips/${selectedItem.payment.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.message || data.error || "เกิดข้อผิดพลาดในการอนุมัติ");
        setSubmittingAction(false);
        return;
      }

      setSelectedItem(null);
      await fetchQueue();
    } catch {
      setActionError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem || submittingAction || !rejectReason.trim()) return;

    setSubmittingAction(true);
    setActionError(null);

    try {
      const res = await fetch(
        `/api/admin/slips/${selectedItem.payment.id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewer_id: "staff-current",
            reason: rejectReason.trim(),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setActionError(
          data.message || data.error || "เกิดข้อผิดพลาดในการปฏิเสธ"
        );
        setSubmittingAction(false);
        return;
      }

      setSelectedItem(null);
      await fetchQueue();
    } catch {
      setActionError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <StaffHeader pendingCount={queue.length} />

      <div className="p-4 sm:p-6 flex flex-col gap-4 flex-1">
        {/* Page Title & Sound Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-content">คิวรอตรวจสลิป</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-brand text-white font-bold text-xs">
              {queue.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playBeep();
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? "bg-brand text-white border-brand"
                : "bg-surface text-content-muted border-border hover:bg-surface-subtle"
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>เปิดเสียงเตือน</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>ปิดเสียงเตือน</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-content-muted">
          รายการสลิปที่รอตรวจสอบ เรียงลำดับจากเก่าสุดก่อน (อัปเดตอัตโนมัติทุก 5 วินาที)
        </p>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-2 text-content-muted">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <span className="text-xs">กำลังโหลดคิวสลิป...</span>
          </div>
        ) : queue.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-border bg-surface text-center flex flex-col items-center gap-2 my-auto">
            <CheckCircle2 className="w-10 h-10 text-status-success" />
            <h3 className="font-semibold text-content text-sm">
              ไม่มีสลิปที่รอตรวจในขณะนี้
            </h3>
            <p className="text-xs text-content-muted max-w-xs">
              เมื่อมีผู้ซื้อส่งสลิปเข้ามาใหม่ รายการจะแสดงขึ้นที่นี่ทันที
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {queue.map((item) => (
              <div
                key={item.payment.id}
                onClick={() => handleOpenReview(item)}
                className="p-4 rounded-2xl border border-border bg-surface hover:border-brand/40 shadow-sm cursor-pointer transition-all flex flex-col gap-2.5 active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-content">
                    {item.order.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {item.duplicates.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-status-danger-subtle text-status-danger font-bold text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>เตือนสลิปซ้ำ</span>
                      </span>
                    )}
                    <span className="text-xs text-content-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.payment.created_at).toLocaleTimeString(
                        "th-TH",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="font-medium text-content">
                      {item.order.buyer_name} ({item.order.quantity} ใบ)
                    </span>
                    <span className="text-content-muted mt-0.5">
                      ผู้โอน: {item.payment.payer_name_or_last4}
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-extrabold text-brand">
                        {item.payment.amount_thb}
                      </span>
                      <span className="text-xs text-content-muted">บาท</span>
                    </div>
                    <span className="text-[10px] text-content-muted">
                      ยอดคงเหลือ: {item.order.remaining_amount} บาท
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SLIP REVIEW MODAL (One-Handed Phone Operation) */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col border border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-subtle">
              <div className="flex flex-col">
                <span className="text-xs text-content-muted">ตรวจสลิป</span>
                <span className="font-mono font-bold text-sm text-content">
                  {selectedItem.order.code}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full border border-border bg-surface flex items-center justify-center text-content-muted hover:text-content"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
              {/* Duplicate Warning Banner */}
              {selectedItem.duplicates.length > 0 && (
                <div className="p-3.5 rounded-xl bg-status-danger-subtle border border-status-danger/40 text-status-danger text-xs flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>คำเตือน: พบสลิปที่มีข้อมูลซ้ำในระบบ!</span>
                  </div>
                  {selectedItem.duplicates.map((dup, i) => (
                    <span key={i} className="text-[11px] leading-relaxed">
                      • {dup.reason} (ออเดอร์: {dup.order_code || "ไม่ทราบรหัส"}, สถานะ: {dup.status})
                    </span>
                  ))}
                </div>
              )}

              {actionError && (
                <div className="p-3 rounded-xl bg-status-danger-subtle border border-status-danger/30 text-status-danger text-xs">
                  {actionError}
                </div>
              )}

              {/* Slip Image Preview */}
              <div className="w-full min-h-[220px] max-h-[440px] bg-black/5 dark:bg-black/30 rounded-2xl border border-border flex flex-col items-center justify-center p-3 overflow-hidden">
                {selectedItem.payment.slip_url ? (
                  <div className="flex flex-col items-center gap-2.5 w-full">
                    <div className="relative max-h-[360px] overflow-hidden rounded-xl bg-white dark:bg-neutral-900 p-1.5 border border-border shadow-inner">
                      <img
                        src={selectedItem.payment.slip_url}
                        alt="ภาพสลิปการโอนเงิน"
                        className="max-h-[340px] w-auto object-contain rounded-lg mx-auto"
                      />
                    </div>
                    <a
                      href={selectedItem.payment.slip_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand font-semibold hover:underline flex items-center gap-1.5 py-1 px-3 rounded-full bg-brand/10 hover:bg-brand/20 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      เปิดดูรูปสลิปขนาดเต็ม
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 p-6 text-center text-xs text-content-muted">
                    <Eye className="w-8 h-8 text-brand" />
                    <span className="font-semibold text-content text-sm">
                      ภาพสลิปการโอนเงิน
                    </span>
                    <span>เส้นทางไฟล์: {selectedItem.payment.slip_path}</span>
                    <span className="text-[10px] text-content-muted">
                      (ไม่พบไฟล์ภาพสลิป หรือสลิปนี้ถูกส่งเข้ามาก่อนการเปิดใช้งานระบบจัดเก็บภาพ)
                    </span>
                  </div>
                )}
              </div>

              {/* Amount Comparison */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-surface-subtle border border-border flex flex-col">
                  <span className="text-content-muted">ยอดที่ต้องชำระ</span>
                  <span className="text-lg font-bold text-content mt-1">
                    {selectedItem.order.remaining_amount} บาท
                  </span>
                  <span className="text-[10px] text-content-muted">
                    (จากยอดรวม {selectedItem.order.total_thb} บาท)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-subtle border border-border flex flex-col">
                  <span className="text-content-muted">ยอดที่ผู้ซื้อแจ้ง</span>
                  <span className="text-lg font-bold text-brand mt-1">
                    {selectedItem.payment.amount_thb} บาท
                  </span>
                  <span className="text-[10px] text-content-muted">
                    ผู้โอน: {selectedItem.payment.payer_name_or_last4}
                  </span>
                </div>
              </div>

              {/* Transfer Details */}
              <div className="p-3 rounded-xl border border-border bg-surface flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-content-muted">เวลาโอน:</span>
                  <span className="font-medium text-content">
                    {new Date(
                      selectedItem.payment.transferred_at
                    ).toLocaleString("th-TH")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-muted">เข้าบัญชี:</span>
                  <span className="font-medium text-content">
                    {selectedItem.payment.to_bank}
                  </span>
                </div>
              </div>

              {/* Checklist helper */}
              <div className="p-3 rounded-xl bg-surface-subtle border border-border flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-content">
                  รายการตรวจสอบก่อนอนุมัติ:
                </span>
                <span className="text-content-muted">
                  ✓ ยอดเงินตรงกับที่ควรได้รับ
                </span>
                <span className="text-content-muted">
                  ✓ บัญชีผู้รับเป็นของร้านถูกต้อง
                </span>
                <span className="text-content-muted">
                  ✓ วันและเวลาโอนสมเหตุสมผล
                </span>
                <span className="text-content-muted">
                  ✓ เลขอ้างอิงไม่เคยถูกใช้ซ้ำ
                </span>
              </div>

              {/* Correct amount accordion */}
              {correctingAmount && (
                <div className="p-3 rounded-xl border border-brand/30 bg-surface flex flex-col gap-2 text-xs">
                  <label htmlFor="customAmount" className="font-semibold text-content">
                    แก้ไขยอดเงินตามที่สลิปโอนจริง (บาท):
                  </label>
                  <input
                    id="customAmount"
                    type="number"
                    step="any"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border text-sm font-bold"
                  />
                </div>
              )}

              {/* Reject reason accordion */}
              {rejecting && (
                <div className="p-3 rounded-xl border border-status-danger/30 bg-surface flex flex-col gap-2.5 text-xs">
                  <span className="font-semibold text-content">
                    เลือกหรือระบุเหตุผลที่ปฏิเสธ:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "ยอดเงินไม่ตรงกับสลิป",
                      "ภาพสลิปไม่ชัดเจน / ขาดหาย",
                      "ไม่ใช่บัญชีรับเงินของร้าน",
                      "สลิปถูกนำมาใช้ซ้ำแล้ว",
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRejectReason(preset)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] ${
                          rejectReason === preset
                            ? "bg-status-danger text-white border-status-danger"
                            : "bg-surface-subtle border-border text-content"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="หรือพิมพ์เหตุผลเพิ่มเติม..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border text-xs"
                  />
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-border bg-surface flex flex-col gap-2">
              {!rejecting ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={() => {
                      setRejecting(true);
                      setCorrectingAmount(false);
                    }}
                    className="w-1/3 h-12 rounded-xl border border-status-danger/40 text-status-danger font-semibold text-xs hover:bg-status-danger-subtle transition-colors disabled:opacity-50"
                  >
                    ปฏิเสธสลิป
                  </button>

                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={handleApprove}
                    className="w-2/3 h-12 rounded-xl bg-status-success hover:bg-status-success/90 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    {submittingAction ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        <span>
                          อนุมัติ (
                          {correctingAmount
                            ? `${customAmount} บาท`
                            : `${selectedItem.payment.amount_thb} บาท`}
                          )
                        </span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRejecting(false)}
                    className="w-1/3 h-12 rounded-xl border border-border text-content text-xs font-semibold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={submittingAction || !rejectReason.trim()}
                    onClick={handleReject}
                    className="w-2/3 h-12 rounded-xl bg-status-danger hover:bg-status-danger/90 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    {submittingAction ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span>ยืนยันปฏิเสธสลิป</span>
                    )}
                  </button>
                </div>
              )}

              {!rejecting && (
                <button
                  type="button"
                  onClick={() => setCorrectingAmount(!correctingAmount)}
                  className="text-xs text-content-muted hover:text-content text-center py-1 underline"
                >
                  {correctingAmount
                    ? "ใช้อัตโนมัติตามสลิป"
                    : "ยอดเงินไม่ตรง? คลิกเพื่อแก้ไขยอดเงินก่อนอนุมัติ"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
