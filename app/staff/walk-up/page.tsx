"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { StaffHeader } from "@/components/admin/StaffHeader";
import { EVENT } from "@/config/event.config";
import { generatePromptPayPayload, generateQrDataUrl } from "@/lib/promptpay";
import {
  Camera,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  X,
  Maximize2,
  Copy,
  Check,
  Zap,
  Loader2,
  Plus,
  Minus,
  RotateCcw,
  Banknote,
  Smartphone,
  Users,
  User,
  Phone,
  ArrowRight,
  ShieldAlert,
  Search,
} from "lucide-react";

interface VenueStatusResponse {
  is_full: boolean;
  updated_at?: string;
}

interface TicketResultItem {
  id?: string;
  code: string;
  status?: string;
  holder_name?: string | null;
  qrUrl?: string;
}

interface WalkUpSuccessData {
  orderCode: string;
  buyerName: string;
  phone?: string;
  quantity: number;
  totalThb: number;
  paymentMethod: "cash" | "promptpay";
  checkInNowCount: number;
  unclaimedCount: number;
  tickets: TicketResultItem[];
  unclaimedTickets: TicketResultItem[];
}

// Web Audio sound feedback
function playChime(type: "success" | "error" = "success") {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // Cheerful chime: C5 -> G5
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Soft buzz for warning
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Audio blocked
  }
}

// Haptic vibration feedback
function triggerVibration(pattern: number[] = [80, 40, 80]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration not supported
    }
  }
}

const TICKET_PRICE = EVENT.ticketPriceThb || 49;
const PROMPTPAY_NUMBER = "0812345678";
const PROMPTPAY_NAME = "บัญชีทางการ งานลาบแรกพบ";

export default function StaffWalkUpPage() {
  // Venue Status
  const [venueStatus, setVenueStatus] = useState<VenueStatusResponse | null>(null);
  const [warningDismissed, setWarningDismissed] = useState(false);

  // Form State
  const [quantity, setQuantity] = useState<number>(1);
  const [buyerName, setBuyerName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "promptpay">("cash");
  const [checkInMode, setCheckInMode] = useState<"all" | "single_and_friends">("all");

  // PromptPay QR Preview
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string | null>(null);
  const [showPromptPayModal, setShowPromptPayModal] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Success Screen State
  const [successData, setSuccessData] = useState<WalkUpSuccessData | null>(null);
  const [fullScreenQr, setFullScreenQr] = useState<{
    code: string;
    qrUrl: string;
    label?: string;
  } | null>(null);

  const buyerInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Venue Status
  const fetchVenueStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/venue-status", { cache: "no-store" });
      if (res.ok) {
        const data: VenueStatusResponse = await res.json();
        setVenueStatus(data);
      }
    } catch {
      // Keep silent
    }
  }, []);

  useEffect(() => {
    fetchVenueStatus();
    const interval = setInterval(fetchVenueStatus, 8000);
    return () => clearInterval(interval);
  }, [fetchVenueStatus]);

  // 2. Pre-generate PromptPay QR whenever total changes
  const totalAmount = quantity * TICKET_PRICE;

  useEffect(() => {
    let active = true;
    const generateQr = async () => {
      try {
        const payload = generatePromptPayPayload(PROMPTPAY_NUMBER, totalAmount);
        const qr = await generateQrDataUrl(payload, { width: 320 });
        if (active) {
          setPromptPayQrUrl(qr);
        }
      } catch {
        if (active) {
          setPromptPayQrUrl(null);
        }
      }
    };
    generateQr();
    return () => {
      active = false;
    };
  }, [totalAmount]);

  // Focus buyer name on mount
  useEffect(() => {
    buyerInputRef.current?.focus();
  }, []);

  // Handle preset quantities
  const handleSelectPreset = (val: number) => {
    setQuantity(val);
    if (val === 1) {
      setCheckInMode("all");
    }
  };

  const handleIncrement = () => {
    setQuantity((prev) => Math.min(prev + 1, 50));
  };

  const handleDecrement = () => {
    setQuantity((prev) => {
      const next = Math.max(prev - 1, 1);
      if (next === 1) setCheckInMode("all");
      return next;
    });
  };

  const handleCustomQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (isNaN(parsed)) {
      setQuantity(1);
    } else {
      const clamped = Math.max(1, Math.min(parsed, 100));
      setQuantity(clamped);
      if (clamped === 1) setCheckInMode("all");
    }
  };

  const handleCopyPhone = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(PROMPTPAY_NUMBER);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  // Determine check-in count based on selection
  const checkInNowCount = quantity === 1 ? 1 : checkInMode === "all" ? quantity : 1;
  const unclaimedCount = quantity - checkInNowCount;

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setValidationError(null);
    setSubmitError(null);

    // Validate buyer name
    const trimmedName = buyerName.trim();
    if (!trimmedName) {
      setValidationError("กรุณากรอกชื่อหรือชื่อเล่นของลูกค้า");
      playChime("error");
      buyerInputRef.current?.focus();
      return;
    }

    if (quantity < 1) {
      setValidationError("จำนวนบัตรต้องอย่างน้อย 1 ใบ");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        buyer_name: trimmedName,
        phone: phone.trim() || undefined,
        quantity,
        payment_method: paymentMethod,
        check_in_now_count: checkInNowCount,
      };

      const res = await fetch("/api/staff/walk-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.error || "บันทึกการขายไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }

      // Play success chime & haptics
      playChime("success");
      triggerVibration([100, 50, 100]);

      // Parse order code
      const orderCode =
        data.order_code ||
        data.order?.code ||
        `LRP-W${Date.now().toString().slice(-4)}`;

      // Parse tickets
      const rawTickets: any[] = data.tickets || data.order?.tickets || [];
      const formattedTickets: TicketResultItem[] = [];

      for (let i = 0; i < rawTickets.length; i++) {
        const t = rawTickets[i];
        const code = t.code || `${orderCode}-${i + 1}`;
        const status = t.status || (i < checkInNowCount ? "checked_in" : "issued");
        const qrUrl = await generateQrDataUrl(code, { width: 320 });
        formattedTickets.push({
          id: t.id,
          code,
          status,
          holder_name: t.holder_name || trimmedName,
          qrUrl,
        });
      }

      // If no tickets were returned in payload, fabricate based on counts
      if (formattedTickets.length === 0) {
        for (let i = 0; i < quantity; i++) {
          const code = `${orderCode}-${i + 1}`;
          const isCheckedIn = i < checkInNowCount;
          const qrUrl = await generateQrDataUrl(code, { width: 320 });
          formattedTickets.push({
            code,
            status: isCheckedIn ? "checked_in" : "issued",
            holder_name: trimmedName,
            qrUrl,
          });
        }
      }

      // Filter tickets meant for friends (not checked in)
      const unCheckedInTickets = formattedTickets.filter(
        (t) => t.status === "issued" || t.status !== "checked_in"
      );

      setSuccessData({
        orderCode,
        buyerName: trimmedName,
        phone: phone.trim() || undefined,
        quantity,
        totalThb: totalAmount,
        paymentMethod,
        checkInNowCount,
        unclaimedCount,
        tickets: formattedTickets,
        unclaimedTickets: unCheckedInTickets,
      });
    } catch (err: any) {
      playChime("error");
      triggerVibration([250]);
      setSubmitError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form for next customer in 1 click
  const handleResetForNextCustomer = () => {
    setSuccessData(null);
    setFullScreenQr(null);
    setBuyerName("");
    setPhone("");
    setQuantity(1);
    setPaymentMethod("cash");
    setCheckInMode("all");
    setValidationError(null);
    setSubmitError(null);

    // Auto-focus buyer name input
    setTimeout(() => {
      buyerInputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F7F8] text-[#202124] antialiased">
      {/* Shared Staff Header */}
      <StaffHeader staffRole="scanner" />

      {/* Main Container */}
      <main className="p-4 sm:p-6 flex flex-col gap-4 flex-1 max-w-lg mx-auto w-full pb-24">
        {/* Top Action & Navigation Bar */}
        <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center font-black shadow-sm">
              <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">
                Quick POS ขายบัตรหน้าร้าน
              </h1>
              <span className="text-[11px] text-slate-500">
                ลาบแรกพบ ครั้งที่ 2 • 49 ฿/ใบ
              </span>
            </div>
          </div>

          <Link
            href="/staff/scan"
            className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>ไปหน้าสแกนบัตร</span>
          </Link>
        </div>

        {/* Venue Status Warning Banner (Requirement 2) */}
        {venueStatus?.is_full && !warningDismissed && (
          <div className="bg-red-600 text-white p-4 rounded-2xl shadow-md border-2 border-red-700 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5 animate-bounce" />
              <div className="flex-1">
                <div className="font-extrabold text-sm sm:text-base leading-snug">
                  ⚠️ ร้านเต็มแล้ว (กรุณาเช็คจำนวนคนก่อนจำหน่ายบัตร)
                </div>
                <p className="text-xs text-red-100 mt-1 leading-relaxed">
                  ร้านค้าถูกตั้งสถานะ &quot;เต็มชั่วคราว&quot; หากต้องการจำหน่ายบัตร กรุณาตรวจสอบกับผู้จัดการร้าน
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWarningDismissed(true)}
              className="w-full py-2 px-3 bg-white text-red-700 hover:bg-red-50 font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] text-center"
            >
              ปิดแจ้งเตือน (ขายต่อได้)
            </button>
          </div>
        )}

        {/* Venue status pill if warning was dismissed */}
        {venueStatus?.is_full && warningDismissed && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              สถานะร้านเต็ม (กำลังขายด้วยโหมดพิเศษ)
            </span>
            <button
              type="button"
              onClick={() => setWarningDismissed(false)}
              className="text-[11px] underline font-semibold hover:text-red-900"
            >
              เปิดการแจ้งเตือน
            </button>
          </div>
        )}

        {/* Main POS Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Card 1: Ticket Quantity Selector (Requirement 3) */}
          <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-bold text-slate-800">เลือกจำนวนบัตร</h2>
              </div>
              <span className="text-xs font-bold text-brand bg-brand/5 px-2.5 py-0.5 rounded-full">
                49 ฿ / ใบ
              </span>
            </div>

            {/* Large Preset Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              {[1, 2, 3, 4].map((preset) => {
                const isSelected = quantity === preset;
                const cost = preset * TICKET_PRICE;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`py-3 px-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? "bg-brand text-white border-brand shadow-sm scale-[1.02]"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 active:scale-[0.98]"
                    }`}
                  >
                    <span className="text-base sm:text-lg font-black leading-tight">
                      {preset} ใบ
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        isSelected ? "text-red-100" : "text-slate-500"
                      }`}
                    >
                      ({cost} ฿)
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Stepper & Custom Number Input */}
            <div className="mt-1 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-500">
                หรือปรับจำนวนเอง:
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={handleDecrement}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-lg transition-colors active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={handleCustomQuantityChange}
                  className="w-14 h-10 text-center font-black text-lg bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand text-slate-900"
                />

                <button
                  type="button"
                  disabled={quantity >= 50}
                  onClick={handleIncrement}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-lg transition-colors active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Total Summary Row */}
            <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-600 font-medium">
                ยอดรวมทั้งหมด ({quantity} ใบ):
              </span>
              <span className="text-base sm:text-lg font-black text-brand">
                {totalAmount} บาท
              </span>
            </div>
          </section>

          {/* Card 2: Buyer Info (Requirement 4) */}
          <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand/10 text-brand font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm font-bold text-slate-800">ข้อมูลผู้ซื้อ</h2>
            </div>

            <div className="flex flex-col gap-3">
              {/* Buyer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ / ชื่อเล่นลูกค้า <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={buyerInputRef}
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => {
                      setBuyerName(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="เช่น ตั้ม, น้องเนย, พี่เอก"
                    className={`w-full h-11 pl-9 pr-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      validationError
                        ? "border-red-400 bg-red-50/30 focus:ring-red-400"
                        : "border-slate-200 bg-white focus:ring-brand focus:border-brand"
                    }`}
                  />
                </div>
                {validationError && (
                  <p className="text-xs text-red-600 font-medium mt-1">
                    {validationError}
                  </p>
                )}
              </div>

              {/* Phone (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ <span className="text-slate-400 font-normal">(ไม่บังคับ)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="เบอร์โทรศัพท์ (ไม่บังคับ)"
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Card 3: Payment Method (Requirement 5) */}
          <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand/10 text-brand font-bold text-xs flex items-center justify-center">
                3
              </span>
              <h2 className="text-sm font-bold text-slate-800">ช่องทางชำระเงิน</h2>
            </div>

            {/* Toggle Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`py-3 px-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                  paymentMethod === "cash"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>💵 เงินสด</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("promptpay")}
                className={`py-3 px-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                  paymentMethod === "promptpay"
                    ? "bg-[#003B70] text-white border-[#003B70] shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>📱 PromptPay</span>
              </button>
            </div>

            {/* PromptPay Info Box if selected */}
            {paymentMethod === "promptpay" && (
              <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5 flex flex-col gap-3 mt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wide">
                      พร้อมเพย์งานลาบแรกพบ
                    </span>
                    <div className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5 mt-0.5">
                      <span>{PROMPTPAY_NUMBER}</span>
                      <button
                        type="button"
                        onClick={handleCopyPhone}
                        className="text-xs text-sky-700 hover:text-sky-900 p-1 rounded-md hover:bg-sky-100 transition-colors"
                        title="คัดลอกเบอร์"
                      >
                        {copiedPhone ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <span className="text-xs text-slate-600">
                      ชื่อบัญชี: {PROMPTPAY_NAME}
                    </span>
                  </div>

                  <span className="text-right font-black text-brand text-base sm:text-lg">
                    {totalAmount} ฿
                  </span>
                </div>

                {/* PromptPay QR Preview and Fullscreen trigger */}
                {promptPayQrUrl && (
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-sky-100">
                    <div className="w-28 h-28 bg-white p-1 rounded-xl border border-sky-200 shadow-sm flex items-center justify-center flex-shrink-0">
                      <img
                        src={promptPayQrUrl}
                        alt="PromptPay QR"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex flex-col gap-2 w-full text-center sm:text-left">
                      <p className="text-xs text-slate-600">
                        สแกนยอดตรง <strong>{totalAmount} ฿</strong> ได้ทันที
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPromptPayModal(true)}
                        className="w-full py-2 px-3 rounded-xl bg-[#003B70] hover:bg-[#002d57] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>ขยาย QR เต็มจอให้ลูกค้าสแกน</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Card 4: Check-in Mode (Requirement 6) */}
          <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand/10 text-brand font-bold text-xs flex items-center justify-center">
                4
              </span>
              <h2 className="text-sm font-bold text-slate-800">ตัวเลือกการเช็คอิน</h2>
            </div>

            {quantity === 1 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">
                  ซื้อ 1 ใบ: ระบบจะเช็คอินทันทีอัตโนมัติ (สวมริสแบนด์แล้วเข้างานได้เลย)
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Option 1: Check in all */}
                <label
                  onClick={() => setCheckInMode("all")}
                  className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                    checkInMode === "all"
                      ? "bg-emerald-50/60 border-emerald-600 text-slate-900 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="radio"
                    name="checkInMode"
                    value="all"
                    checked={checkInMode === "all"}
                    onChange={() => setCheckInMode("all")}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                      ✅ เช็คอินทันทีทั้งหมด ({quantity} คน ยืนอยู่หน้าร้าน)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      สวมสายรัดข้อมือหรือปั๊มตราให้ทุกคนทันที ไม่ต้องแจก QR
                    </span>
                  </div>
                </label>

                {/* Option 2: Check in 1 + Show QR for friends */}
                <label
                  onClick={() => setCheckInMode("single_and_friends")}
                  className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                    checkInMode === "single_and_friends"
                      ? "bg-amber-50/60 border-amber-600 text-slate-900 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="radio"
                    name="checkInMode"
                    value="single_and_friends"
                    checked={checkInMode === "single_and_friends"}
                    onChange={() => setCheckInMode("single_and_friends")}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                      🎟️ เช็คอิน 1 ใบ + แสดง QR ให้เพื่อน ({unclaimedCount} ใบซื้อเผื่อเพื่อน)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      เช็คอินลูกค้าคนแรก ส่วนอีก {unclaimedCount} ใบจะแสดง QR ให้ลูกค้าถ่ายรูปส่งให้เพื่อน
                    </span>
                  </div>
                </label>
              </div>
            )}
          </section>

          {/* Error Message Alert */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs sm:text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">บันทึกรายการไม่สำเร็จ</span>
                <span className="text-xs text-red-600">{submitError}</span>
              </div>
            </div>
          )}

          {/* Prominent Primary Submit Button (Requirement 7) */}
          <div className="sticky bottom-3 z-30 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-6 rounded-2xl text-white font-extrabold text-base sm:text-lg shadow-xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] ${
                isSubmitting
                  ? "bg-emerald-700/70 cursor-not-allowed opacity-90"
                  : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-700/20"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>กำลังบันทึกรายการ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    รับเงินแล้ว & เช็คอินทันที (ยอดรวม {totalAmount} ฿)
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* PromptPay Full-screen modal for customer to scan */}
      {showPromptPayModal && promptPayQrUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                สแกนพร้อมเพย์ (PromptPay)
              </span>
              <button
                type="button"
                onClick={() => setShowPromptPayModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-64 h-64 bg-white p-2 rounded-2xl border-2 border-slate-200 shadow-inner flex items-center justify-center">
              <img
                src={promptPayQrUrl}
                alt="PromptPay Fullscreen QR"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-2xl font-black text-brand">
                {totalAmount} บาท
              </div>
              <div className="text-xs text-slate-600 font-semibold">
                {PROMPTPAY_NUMBER} ({PROMPTPAY_NAME})
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                เปิดแอปธนาคารแล้วสแกน QR Code นี้ได้เลย
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPromptPayModal(false)}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              เสร็จสิ้น / ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Success Modal / Screen (Requirement 9) */}
      {successData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl flex flex-col gap-4 text-slate-900 my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Success Header */}
            <div className="bg-emerald-600 text-white rounded-2xl p-5 text-center flex flex-col items-center gap-2 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black tracking-tight">
                บันทึกการขายสำเร็จ!
              </h2>
              <div className="bg-emerald-700/80 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider text-emerald-100 flex items-center gap-1.5">
                <span>รหัสออเดอร์: {successData.orderCode}</span>
              </div>
            </div>

            {/* Sale Summary Details */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs sm:text-sm flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">ลูกค้า:</span>
                <span className="font-bold text-slate-800">{successData.buyerName}</span>
              </div>
              {successData.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">เบอร์โทร:</span>
                  <span className="font-semibold text-slate-700">{successData.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">จำนวนบัตร:</span>
                <span className="font-bold text-slate-800">
                  {successData.quantity} ใบ ({successData.totalThb} ฿)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">ช่องทางชำระเงิน:</span>
                <span className="font-bold text-slate-800">
                  {successData.paymentMethod === "cash" ? "💵 เงินสด" : "📱 PromptPay"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">สถานะเช็คอิน:</span>
                <span className="font-extrabold text-emerald-600">
                  เช็คอินแล้ว {successData.checkInNowCount} / {successData.quantity} ใบ
                </span>
              </div>
            </div>

            {/* Tickets for friends (if any remaining) */}
            {successData.unclaimedTickets.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="font-bold text-xs sm:text-sm text-amber-900">
                    🎟️ บัตรสำหรับเพื่อน ({successData.unclaimedTickets.length} ใบ ยังไม่เช็คอิน)
                  </h3>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  ให้ลูกค้าใช้มือถือถ่ายรูป QR Code ของเพื่อนด้านล่างนี้ ส่งต่อให้เพื่อนนำมาสแกนเข้างาน
                </p>

                <div className="flex flex-col gap-3">
                  {successData.unclaimedTickets.map((t, idx) => (
                    <div
                      key={t.code}
                      className="bg-white rounded-xl p-3 border border-amber-200/80 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        {t.qrUrl && (
                          <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 flex-shrink-0">
                            <img
                              src={t.qrUrl}
                              alt={t.code}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            บัตรใบที่ {idx + 2}
                          </span>
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-800">
                            {t.code}
                          </span>
                        </div>
                      </div>

                      {t.qrUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setFullScreenQr({
                              code: t.code,
                              qrUrl: t.qrUrl!,
                              label: `บัตรเพื่อนใบที่ ${idx + 2} (${t.code})`,
                            })
                          }
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 whitespace-nowrap"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>ขยาย QR เต็มจอ</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Customer Button (1-click reset) */}
            <button
              type="button"
              onClick={handleResetForNextCustomer}
              className="w-full py-4 px-6 rounded-2xl bg-brand hover:bg-brand-pressed text-white font-extrabold text-base shadow-lg shadow-brand/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            >
              <RotateCcw className="w-5 h-5" />
              <span>ขายลูกค้ารายต่อไป (Next Customer)</span>
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Ticket QR Zoom Modal (for photographing) */}
      {fullScreenQr && (
        <div className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm flex flex-col items-center text-center gap-4">
            <div className="w-full flex items-center justify-between text-white pb-2">
              <span className="text-xs font-bold text-slate-300">
                {fullScreenQr.label || "QR Code บัตรเข้างาน"}
              </span>
              <button
                type="button"
                onClick={() => setFullScreenQr(null)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Giant Bright QR Code for customer to photograph */}
            <div className="w-72 h-72 sm:w-80 sm:h-80 bg-white p-4 rounded-3xl shadow-2xl flex items-center justify-center">
              <img
                src={fullScreenQr.qrUrl}
                alt={fullScreenQr.code}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col gap-1 text-white">
              <span className="font-mono font-black text-lg sm:text-xl tracking-wider text-yellow-300">
                {fullScreenQr.code}
              </span>
              <p className="text-xs text-slate-300 max-w-xs mt-1">
                ให้ลูกค้าใช้กล้องโทรศัพท์ถ่ายรูปหน้าจอนี้ แล้วส่งต่อให้เพื่อนนำมาสแกนเข้างาน
              </p>
            </div>

            <button
              type="button"
              onClick={() => setFullScreenQr(null)}
              className="mt-2 w-full py-3.5 rounded-2xl bg-white text-slate-900 font-extrabold text-sm hover:bg-slate-100 transition-colors shadow-lg"
            >
              ปิดหน้าต่างขยาย QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
