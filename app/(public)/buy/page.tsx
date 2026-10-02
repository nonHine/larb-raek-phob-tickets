"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EVENT } from "@/config/event.config";
import { Navbar } from "@/components/Navbar";
import { VenueBanner } from "@/components/VenueBanner";
import {
  Minus,
  Plus,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Ticket,
  User,
  Phone,
  Mail,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

export default function BuyPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isFull, setIsFull] = useState(false);

  // Form states
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [backupContact, setBackupContact] = useState("");
  const [consentNonRefundable, setConsentNonRefundable] = useState(false);
  const [consentDataUsage, setConsentDataUsage] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // Bot honeypot

  // Validation / Loading states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const totalAmount = quantity * EVENT.ticketPriceThb;

  // Validation for Step 2
  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!buyerName.trim()) {
      errs.buyerName = "กรุณากรอกชื่อ-นามสกุล ผู้ซื้อ";
    }
    if (!/^0[0-9]{9}$/.test(phone.trim())) {
      errs.phone = "กรุณากรอกหมายเลขโทรศัพท์ 10 หลัก (เช่น 0812345678)";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errs.email = "กรุณากรอกอีเมลให้ถูกต้อง (เช่น name@example.com)";
    }
    if (!consentNonRefundable) {
      errs.consentNonRefundable = "กรุณายอมรับเงื่อนไขบัตรไม่สามารถขอคืนเงินได้";
    }
    if (!consentDataUsage) {
      errs.consentDataUsage = "กรุณายินยอมให้ใช้ข้อมูลเพื่อยืนยันตัวตนและรับ wristband";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmitOrder = async () => {
    if (submitting || isFull) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_name: buyerName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          backup_contact: backupContact.trim() || undefined,
          quantity,
          consent_non_refundable: consentNonRefundable,
          consent_data_usage: consentDataUsage,
          website: honeypot, // Honeypot
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "venue_full") {
          setIsFull(true);
          setServerError(data.message || "ร้านเต็มชั่วคราว ไม่สามารถสร้างออเดอร์ได้");
        } else if (data.details) {
          const firstError = Object.values(data.details)[0];
          setServerError(Array.isArray(firstError) ? firstError[0] : String(firstError));
        } else {
          setServerError(data.error || "เกิดข้อผิดพลาดในการสร้างออเดอร์ กรุณาลองใหม่");
        }
        setSubmitting(false);
        return;
      }

      // Success -> navigate to checkout
      router.push(data.redirect_url);
    } catch {
      setServerError("ไม่สามารถเชื่อมต่อเครือข่ายได้ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="p-4 sm:p-6 flex flex-col gap-5 flex-1">
        {/* Back button & Stepper header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-content-muted hover:text-content"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าหลัก</span>
          </Link>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-subtle border border-border text-content-muted">
            ขั้นตอนที่ {step} จาก 3
          </span>
        </div>

        {/* Stepper indicator */}
        <div className="grid grid-cols-3 gap-2">
          <div
            className={`h-1.5 rounded-full transition-colors ${
              step >= 1 ? "bg-brand" : "bg-border"
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-colors ${
              step >= 2 ? "bg-brand" : "bg-border"
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-colors ${
              step === 3 ? "bg-brand" : "bg-border"
            }`}
          />
        </div>

        {/* Venue status banner */}
        <VenueBanner onStatusChange={setIsFull} />

        {isFull && (
          <div className="p-4 rounded-xl bg-status-warning-subtle text-status-warning text-sm">
            ระบบหยุดรับออเดอร์ใหม่ชั่วคราวเนื่องจากร้านเต็ม ขออภัยในความไม่สะดวก
          </div>
        )}

        {/* STEP 1: QUANTITY */}
        {step === 1 && !isFull && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-bold text-content">เลือกจำนวนบัตร</h1>
              <p className="text-xs text-content-muted mt-1">
                บัตรราคา {EVENT.ticketPriceThb} บาท / ใบ (ไม่จำกัดจำนวนรอบ)
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col items-center gap-4">
              <span className="text-sm font-medium text-content-muted">
                จำนวนบัตรที่ต้องการซื้อ
              </span>

              <div className="flex items-center gap-5">
                <button
                  type="button"
                  aria-label="ลดจำนวนบัตร"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-12 h-12 rounded-xl border border-border bg-surface hover:bg-surface-subtle flex items-center justify-center text-content disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <div className="w-20 text-center">
                  <span className="text-3xl font-extrabold text-content">
                    {quantity}
                  </span>
                  <span className="text-xs text-content-muted block">ใบ</span>
                </div>

                <button
                  type="button"
                  aria-label="เพิ่มจำนวนบัตร"
                  disabled={quantity >= EVENT.maxTicketsPerOrder}
                  onClick={() =>
                    setQuantity((q) => Math.min(EVENT.maxTicketsPerOrder, q + 1))
                  }
                  className="w-12 h-12 rounded-xl border border-border bg-surface hover:bg-surface-subtle flex items-center justify-center text-content disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Price Breakdown */}
              <div className="w-full pt-4 border-t border-border flex items-center justify-between text-sm">
                <span className="text-content-muted">
                  {quantity} ใบ × {EVENT.ticketPriceThb} บาท
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-content-muted">ยอดรวม</span>
                  <span className="text-xl font-bold text-brand">
                    {totalAmount}
                  </span>
                  <span className="text-xs text-content-muted">บาท</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full h-12 rounded-xl bg-brand hover:bg-brand-pressed text-white font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>ถัดไป: กรอกข้อมูลติดต่อ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: CONTACT & CONSENT */}
        {step === 2 && !isFull && (
          <form onSubmit={handleNextFromStep2} noValidate className="flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold text-content">ข้อมูลผู้ซื้อ</h1>
              <p className="text-xs text-content-muted mt-1">
                ใช้สำหรับยืนยันตัวตนและรับ wristband เข้างาน
              </p>
            </div>

            {/* Buyer Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="buyerName" className="text-sm font-medium text-content">
                ชื่อ - นามสกุล ผู้ซื้อ <span className="text-brand">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-content-muted absolute left-3.5 top-3.5" />
                <input
                  id="buyerName"
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className={`w-full h-11 pl-10 pr-3 rounded-xl border bg-surface text-sm text-content focus:outline-none focus:ring-2 focus:ring-brand/20 ${
                    errors.buyerName ? "border-status-danger" : "border-border"
                  }`}
                />
              </div>
              {errors.buyerName && (
                <span className="text-xs text-status-danger">{errors.buyerName}</span>
              )}
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-content">
                หมายเลขโทรศัพท์ (10 หลัก) <span className="text-brand">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-content-muted absolute left-3.5 top-3.5" />
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  required
                  maxLength={10}
                  placeholder="08xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                  className={`w-full h-11 pl-10 pr-3 rounded-xl border bg-surface text-sm text-content focus:outline-none focus:ring-2 focus:ring-brand/20 ${
                    errors.phone ? "border-status-danger" : "border-border"
                  }`}
                />
              </div>
              {errors.phone && (
                <span className="text-xs text-status-danger">{errors.phone}</span>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-content">
                อีเมลสำหรับรับหลักฐานคำสั่งซื้อ <span className="text-brand">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-content-muted absolute left-3.5 top-3.5" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full h-11 pl-10 pr-3 rounded-xl border bg-surface text-sm text-content focus:outline-none focus:ring-2 focus:ring-brand/20 ${
                    errors.email ? "border-status-danger" : "border-border"
                  }`}
                />
              </div>
              {errors.email && (
                <span className="text-xs text-status-danger">{errors.email}</span>
              )}
            </div>

            {/* Backup Contact (Optional) */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="backupContact" className="text-sm font-medium text-content">
                ช่องทางติดต่อสำรอง (LINE ID / Facebook / IG)
                <span className="text-xs text-content-muted font-normal ml-1">
                  (ไม่บังคับ)
                </span>
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-content-muted absolute left-3.5 top-3.5" />
                <input
                  id="backupContact"
                  type="text"
                  placeholder="เช่น LINE: somchai_kku"
                  value={backupContact}
                  onChange={(e) => setBackupContact(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-surface text-sm text-content focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            {/* Honeypot field (hidden from real users) */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
            />

            {/* Required Consents */}
            <div className="p-4 rounded-xl border border-border bg-surface-subtle flex flex-col gap-3">
              <span className="text-xs font-semibold text-content">
                ข้อตกลงและความยินยอม (จำเป็นต้องยอมรับทั้ง 2 ข้อ)
              </span>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentNonRefundable}
                  onChange={(e) => setConsentNonRefundable(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                />
                <span className="text-xs text-content leading-relaxed">
                  ข้าพเจ้าได้ตรวจสอบข้อมูลถูกต้องแล้ว และยอมรับว่าบัตรไม่สามารถขอคืนเงินได้
                </span>
              </label>
              {errors.consentNonRefundable && (
                <span className="text-xs text-status-danger ml-6">
                  {errors.consentNonRefundable}
                </span>
              )}

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentDataUsage}
                  onChange={(e) => setConsentDataUsage(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                />
                <span className="text-xs text-content leading-relaxed">
                  ยินยอมให้ผู้จัดงานใช้ข้อมูลของข้าพเจ้าเพื่อยืนยันตัวตนและรับ wristband เข้างาน
                </span>
              </label>
              {errors.consentDataUsage && (
                <span className="text-xs text-status-danger ml-6">
                  {errors.consentDataUsage}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 h-12 rounded-xl border border-border bg-surface text-content font-medium text-sm flex items-center justify-center"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                className="w-2/3 h-12 rounded-xl bg-brand hover:bg-brand-pressed text-white font-semibold text-base flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <span>ตรวจสอบข้อมูล</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: REVIEW & CONFIRM */}
        {step === 3 && !isFull && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold text-content">
                ตรวจสอบความถูกต้อง
              </h1>
              <p className="text-xs text-content-muted mt-1">
                กรุณาตรวจสอบข้อมูลก่อนสร้างคำสั่งซื้อและไปยังหน้าชำระเงิน
              </p>
            </div>

            {serverError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-status-danger-subtle border border-status-danger/30 text-status-danger text-xs sm:text-sm flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-3.5 text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <span className="text-content-muted">จำนวนบัตร</span>
                <span className="font-semibold text-content">{quantity} ใบ</span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-border">
                <span className="text-content-muted">ยอดรวมที่ต้องชำระ</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-brand">
                    {totalAmount}
                  </span>
                  <span className="text-xs text-content-muted">บาท</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-content-muted">ชื่อผู้ซื้อ</span>
                <span className="font-medium text-content">{buyerName}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-content-muted">เบอร์โทรศัพท์</span>
                <span className="font-medium text-content">{phone}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-content-muted">อีเมล</span>
                <span className="font-medium text-content">{email}</span>
              </div>

              {backupContact && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-content-muted">ติดต่อสำรอง</span>
                  <span className="font-medium text-content">{backupContact}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep(2)}
                className="w-1/3 h-12 rounded-xl border border-border bg-surface text-content font-medium text-sm flex items-center justify-center disabled:opacity-50"
              >
                แก้ไขข้อมูล
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitOrder}
                className="w-2/3 h-12 rounded-xl bg-brand hover:bg-brand-pressed text-white font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>กำลังสร้างออเดอร์...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>ยืนยันและไปชำระเงิน</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
