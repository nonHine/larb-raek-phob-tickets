"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { EVENT } from "@/config/event.config";
import { generatePromptPayPayload, generateQrDataUrl } from "@/lib/promptpay";
import {
  Clock,
  Copy,
  Check,
  Upload,
  QrCode,
  Building,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  FileText,
} from "lucide-react";

interface OrderDetail {
  id: string;
  code: string;
  buyer_name: string;
  phone: string;
  email: string;
  quantity: number;
  total_thb: number;
  status: string;
  expires_at: string | null;
  approved_amount: number;
  remaining_amount: number;
}

export default function CheckoutPage({
  params,
}: {
  params: { code: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("t");

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  // PromptPay QR image
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  // Countdown timer
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  // Slip Upload Form
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [amountThb, setAmountThb] = useState<string>("");
  const [transferredAt, setTransferredAt] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [toBank, setToBank] = useState<string>("พร้อมเพย์ (PromptPay)");
  const [payerNameOrLast4, setPayerNameOrLast4] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 1. Fetch Order details
  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${params.code}?t=${token}`);
        if (!res.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const data = await res.json();
        setOrder(data.order);
        setAmountThb(String(data.order.remaining_amount));

        // If order already paid, redirect to status page
        if (data.order.status === "paid") {
          router.replace(`/orders/${params.code}?t=${token}`);
          return;
        }

        // Generate PromptPay QR
        try {
          const payload = generatePromptPayPayload(
            data.promptpay_id || process.env.NEXT_PUBLIC_PROMPTPAY_ID || "1839901992657",
            data.order.remaining_amount
          );
          const qr = await generateQrDataUrl(payload, { width: 280 });
          setQrDataUrl(qr);
        } catch {
          // Keep fallback
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params.code, token, router]);

  // 2. Countdown timer calculation
  useEffect(() => {
    if (!order?.expires_at) return;

    const expiryTime = new Date(order.expires_at).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeftStr("00:00");
      } else {
        const mins = Math.floor(diff / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeftStr(
          `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order?.expires_at]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target?.result as string);
      };
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  };

  // Copy helpers
  const handleCopyAmount = () => {
    if (!order) return;
    navigator.clipboard.writeText(String(order.remaining_amount));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleCopyBank = (no: string) => {
    navigator.clipboard.writeText(no);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  // Submit slip
  const handleUploadSlip = async (e: React.FormEvent) => {
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

      setUploadSuccess(true);
      // Wait 1.5s and route to order status page
      setTimeout(() => {
        router.push(`/orders/${order.code}?t=${token}`);
      }, 1500);
    } catch {
      setUploadError("การเชื่อมต่อล้มเหลว กรุณาลองใหม่อีกครั้ง");
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
          <span className="text-sm text-content-muted">กำลังโหลดข้อมูลคำสั่งซื้อ...</span>
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
            ไม่พบคำสั่งซื้อ หรือลิงก์การเข้าถึงไม่ถูกต้อง กรุณาตรวจสอบลิงก์ในอีเมลหรือค้นหาออเดอร์
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

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="p-4 sm:p-6 flex flex-col gap-5 flex-1">
        {/* Header with Order Status Badge */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex flex-col">
            <span className="text-xs text-content-muted">รหัสคำสั่งซื้อ</span>
            <span className="font-mono font-bold text-base text-content">
              {order.code}
            </span>
          </div>

          <div className="px-3 py-1 rounded-full bg-status-warning-subtle text-status-warning text-xs font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-warning animate-pulse" />
            <span>รอชำระเงิน</span>
          </div>
        </div>

        {/* 30-Minute Countdown Notice */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${
            isExpired
              ? "bg-surface-subtle border-border text-content-muted"
              : "bg-brand-light/60 border-brand/20 text-brand"
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>
              {isExpired
                ? "หมดเวลา แต่ยังแนบสลิปได้ถ้าโอนแล้ว"
                : "กรุณาโอนและแนบสลิปภายใน"}
            </span>
          </div>
          {!isExpired && (
            <span className="font-mono font-bold text-base">{timeLeftStr}</span>
          )}
        </div>

        {/* Order Amount Summary */}
        <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-2.5 text-sm">
          <div className="flex justify-between items-center text-xs text-content-muted">
            <span>จำนวนบัตร: {order.quantity} ใบ</span>
            <span>ยอดรวมทั้งหมด: {order.total_thb} บาท</span>
          </div>

          {order.approved_amount > 0 && (
            <div className="flex justify-between items-center text-xs text-status-success font-medium">
              <span>ชำระแล้ว:</span>
              <span>{order.approved_amount} บาท</span>
            </div>
          )}

          <div className="pt-2 border-t border-border flex justify-between items-center">
            <span className="font-semibold text-content">ยอดที่ต้องชำระ</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-brand">
                {order.remaining_amount}
              </span>
              <span className="text-xs text-content-muted">บาท</span>
              <button
                type="button"
                onClick={handleCopyAmount}
                className="p-1.5 rounded-lg border border-border text-content-muted hover:text-brand hover:border-brand/40 transition-colors"
                title="คัดลอกยอดเงิน"
              >
                {copiedAmount ? (
                  <Check className="w-4 h-4 text-status-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* PromptPay QR Section */}
        <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-content-muted">
            <QrCode className="w-4 h-4 text-brand" />
            <span>สแกนจ่ายด้วย PromptPay (ยอดตรงตามจำนวน)</span>
          </div>

          {qrDataUrl ? (
            <div className="p-3 bg-white rounded-xl border border-border shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="PromptPay QR Code"
                className="w-56 h-56 object-contain"
              />
            </div>
          ) : (
            <div className="w-56 h-56 rounded-xl bg-surface-subtle flex items-center justify-center text-xs text-content-muted">
              กำลังสร้าง QR...
            </div>
          )}

          <span className="text-xs text-content-muted max-w-xs leading-relaxed">
            * สแกน QR แล้วระบบจะใส่ยอด {order.remaining_amount} บาทให้อัตโนมัติ จากนั้นแคปภาพสลิปมาแนบด้านล่าง
          </span>
        </div>

        {/* Bank Account Fallback */}
        {EVENT.banks.length > 0 && (
          <div className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-content">
              <Building className="w-4 h-4 text-content-muted" />
              <span>หรือโอนผ่านเลขบัญชีธนาคาร</span>
            </div>

            {EVENT.banks.map((bank, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-subtle border border-border"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-content">{bank.bank}</span>
                  <span className="text-content-muted">{bank.accountName}</span>
                  <span className="font-mono font-bold text-sm text-content mt-0.5">
                    {bank.accountNo}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyBank(bank.accountNo)}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-surface text-content hover:text-brand flex items-center gap-1 transition-colors"
                >
                  {copiedBank ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-status-success" />
                      <span>คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอก</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* SLIP UPLOAD FORM */}
        <form
          onSubmit={handleUploadSlip}
          className="p-4 sm:p-5 rounded-2xl border border-border bg-surface flex flex-col gap-4"
        >
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand" />
            <h2 className="text-base font-bold text-content">
              แนบสลิปการโอนเงิน
            </h2>
          </div>

          <p className="text-xs text-content-muted">
            รองรับภาพ JPEG, PNG, WEBP หรือ PDF ขนาดไม่เกิน 10 MB (แนบได้สูงสุด 10 สลิป/ออเดอร์)
          </p>

          {uploadSuccess && (
            <div className="p-3.5 rounded-xl bg-status-success-subtle border border-status-success/30 text-status-success text-xs sm:text-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-semibold">ส่งสลิปสำเร็จ!</span>
                <span className="text-xs mt-0.5">
                  เราได้รับสลิปแล้ว กำลังพาท่านไปหน้าสถานะออเดอร์...
                </span>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="p-3.5 rounded-xl bg-status-danger-subtle border border-status-danger/30 text-status-danger text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* File input / preview */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="slipFile"
              className="border-2 border-dashed border-border hover:border-brand/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-surface-subtle transition-colors min-h-[120px]"
            >
              {filePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={filePreview}
                  alt="Slip preview"
                  className="max-h-44 object-contain rounded-lg shadow-sm"
                />
              ) : file ? (
                <div className="flex items-center gap-2 text-sm text-content font-medium">
                  <FileText className="w-6 h-6 text-brand" />
                  <span>{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-7 h-7 text-content-muted" />
                  <span className="text-xs sm:text-sm font-medium text-content">
                    แตะเพื่อเลือกภาพสลิป หรือลากไฟล์มาวางที่นี่
                  </span>
                  <span className="text-xs text-content-muted">
                    (ถ่ายภาพสลิปจากมือถือได้)
                  </span>
                </>
              )}
              <input
                id="slipFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading || uploadSuccess}
              />
            </label>
            {file && (
              <span className="text-xs text-content-muted text-center">
                เลือกแล้ว: {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </span>
            )}
          </div>

          {/* Amount claimed */}
          <div className="flex flex-col gap-1">
            <label htmlFor="amountThb" className="text-xs font-semibold text-content">
              จำนวนเงินที่โอนตามสลิป (บาท) <span className="text-brand">*</span>
            </label>
            <input
              id="amountThb"
              type="number"
              step="any"
              required
              value={amountThb}
              onChange={(e) => setAmountThb(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-sm text-content focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold"
            />
          </div>

          {/* Date & Time */}
          <div className="flex flex-col gap-1">
            <label htmlFor="transferredAt" className="text-xs font-semibold text-content">
              วันและเวลาที่โอนในสลิป <span className="text-brand">*</span>
            </label>
            <input
              id="transferredAt"
              type="datetime-local"
              required
              value={transferredAt}
              onChange={(e) => setTransferredAt(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-sm text-content focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {/* Bank transferred to */}
          <div className="flex flex-col gap-1">
            <label htmlFor="toBank" className="text-xs font-semibold text-content">
              ธนาคารหรือช่องทางปลายทาง <span className="text-brand">*</span>
            </label>
            <input
              id="toBank"
              type="text"
              required
              value={toBank}
              onChange={(e) => setToBank(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-sm text-content focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {/* Payer info */}
          <div className="flex flex-col gap-1">
            <label htmlFor="payerName" className="text-xs font-semibold text-content">
              ชื่อผู้โอน หรือเลขบัญชี 4 หลักท้าย <span className="text-brand">*</span>
            </label>
            <input
              id="payerName"
              type="text"
              required
              placeholder="เช่น นายสมชาย หรือ 1234"
              value={payerNameOrLast4}
              onChange={(e) => setPayerNameOrLast4(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-sm text-content focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || uploading || uploadSuccess}
            className="w-full h-12 rounded-xl bg-brand hover:bg-brand-pressed text-white font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังส่งสลิป...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>ส่งสลิปให้ตรวจสอบ</span>
              </>
            )}
          </button>
        </form>

        {/* Link to order status page */}
        <div className="text-center pt-2">
          <Link
            href={`/orders/${order.code}?t=${token}`}
            className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-brand transition-colors"
          >
            <span>ดูหน้าสถานะคำสั่งซื้อนี้</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
