"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  Search,
  Mail,
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  ExternalLink,
  Ticket,
} from "lucide-react";

interface FoundOrder {
  code: string;
  buyer_name: string;
  masked_phone: string;
  masked_email: string;
  quantity: number;
  total_thb: number;
  status: "pending_payment" | "under_review" | "paid" | "cancelled";
  status_label: string;
  url: string;
  email_sent: boolean;
  created_at: string;
}

export default function OrderLookupPage() {
  const [mode, setMode] = useState<"phone" | "code_email">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [foundOrders, setFoundOrders] = useState<FoundOrder[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg(null);
    setFoundOrders([]);
    setHasSearched(true);

    const payload: { phone?: string; code?: string; email?: string } = {};

    if (mode === "phone") {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      if (!cleanPhone || !/^0[0-9]{9}$/.test(cleanPhone)) {
        setErrorMsg("กรุณาระบุเบอร์โทรศัพท์ 10 หลักให้ถูกต้อง (เช่น 0812345678)");
        return;
      }
      payload.phone = cleanPhone;
    } else {
      if (!code.trim() || !email.trim()) {
        setErrorMsg("กรุณาระบุทั้งรหัสคำสั่งซื้อและอีเมล");
        return;
      }
      payload.code = code.trim().toUpperCase();
      payload.email = email.trim();
    }

    setLoading(true);

    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || data.error || "ไม่พบข้อมูลคำสั่งซื้อ");
      } else {
        setFoundOrders(data.orders || []);
      }
    } catch {
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Navbar />

      <main className="p-4 sm:p-6 flex flex-col gap-6 flex-1 max-w-xl mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-content-muted hover:text-content transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าหลัก</span>
        </Link>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-content tracking-tight">
            ค้นหาหรือกู้คืนคำสั่งซื้อ
          </h1>
          <p className="text-xs sm:text-sm text-content-muted mt-1 leading-relaxed">
            หากคุณไม่ได้รับอีเมล สะกดอีเมลผิด หรือลืมรหัสคำสั่งซื้อ
            สามารถค้นหาและเปิดดูตั๋วด้วยเบอร์โทรศัพท์มือถือที่ใช้สั่งซื้อได้ทันที
          </p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-subtle border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("phone");
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === "phone"
                ? "bg-surface text-content shadow-sm border border-border/80"
                : "text-content-muted hover:text-content"
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>ค้นหาด้วยเบอร์โทรศัพท์</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("code_email");
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === "code_email"
                ? "bg-surface text-content shadow-sm border border-border/80"
                : "text-content-muted hover:text-content"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>รหัสออเดอร์ + อีเมล</span>
          </button>
        </div>

        {/* Search Form */}
        <form
          noValidate
          onSubmit={handleSubmit}
          className="p-5 rounded-2xl border border-border bg-surface flex flex-col gap-4 text-sm shadow-sm"
        >
          {mode === "phone" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="font-semibold text-content text-xs">
                เบอร์โทรศัพท์มือถือ (10 หลัก)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-content-muted absolute left-3.5 top-3.5" />
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="0812345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-surface text-sm font-semibold tracking-wider focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                />
              </div>
              <p className="text-[11px] text-content-muted">
                กรอกเบอร์โทร 10 หลักที่คุณระบุไว้ในขั้นตอนสั่งซื้อ
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="code" className="font-semibold text-content text-xs">
                  รหัสคำสั่งซื้อ (เช่น LRP-XXXXXX)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-content-muted absolute left-3.5 top-3.5" />
                  <input
                    id="code"
                    type="text"
                    placeholder="LRP-..."
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-surface text-sm uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="font-semibold text-content text-xs">
                  อีเมลที่ใช้ในการสั่งซื้อ
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-content-muted absolute left-3.5 top-3.5" />
                  <input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-brand hover:bg-brand-pressed text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 mt-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังค้นหาข้อมูล...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>ค้นหาคำสั่งซื้อ</span>
              </>
            )}
          </button>
        </form>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-status-danger-subtle border border-status-danger/30 text-status-danger text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">ไม่พบข้อมูล</span>
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Search Results */}
        {hasSearched && foundOrders.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-status-success text-xs sm:text-sm font-semibold px-1">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>พบคำสั่งซื้อของคุณ {foundOrders.length} รายการ</span>
            </div>

            {foundOrders.map((ord) => (
              <div
                key={ord.code}
                className="p-5 rounded-2xl border border-border bg-surface flex flex-col gap-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-brand" />
                    <span className="font-mono font-bold text-sm sm:text-base text-content">
                      {ord.code}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      ord.status === "paid"
                        ? "bg-status-success-subtle text-status-success border border-status-success/20"
                        : ord.status === "under_review"
                        ? "bg-status-warning-subtle text-status-warning border border-status-warning/20"
                        : ord.status === "cancelled"
                        ? "bg-status-danger-subtle text-status-danger border border-status-danger/20"
                        : "bg-surface-subtle text-content border border-border"
                    }`}
                  >
                    {ord.status_label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-subtle text-xs">
                  <div>
                    <span className="text-content-muted block text-[11px]">ผู้สั่งซื้อ</span>
                    <span className="font-semibold text-content">{ord.buyer_name}</span>
                  </div>
                  <div>
                    <span className="text-content-muted block text-[11px]">จำนวนบัตร</span>
                    <span className="font-semibold text-brand">
                      {ord.quantity} ใบ (฿{ord.total_thb}.00)
                    </span>
                  </div>
                  <div>
                    <span className="text-content-muted block text-[11px]">เบอร์โทรศัพท์</span>
                    <span className="font-mono text-content">{ord.masked_phone}</span>
                  </div>
                  <div>
                    <span className="text-content-muted block text-[11px]">อีเมลที่บันทึก</span>
                    <span className="font-mono text-content truncate block">
                      {ord.masked_email}
                    </span>
                  </div>
                </div>

                <p
                  className={`text-xs ${ord.email_sent ? "text-status-success" : "text-status-warning"}`}
                  role="status"
                >
                  {ord.email_sent
                    ? "ส่งคำขออีเมลไปยังที่อยู่ที่บันทึกไว้แล้ว"
                    : "ส่งอีเมลไม่สำเร็จ คุณยังเปิดดูตั๋วได้จากปุ่มด้านล่าง"}
                </p>

                <Link
                  href={ord.url}
                  className={`w-full h-11 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
                    ord.status === "paid"
                      ? "bg-status-success hover:bg-status-success/90 text-white"
                      : ord.status === "under_review"
                      ? "bg-brand hover:bg-brand-pressed text-white"
                      : "bg-brand hover:bg-brand-pressed text-white"
                  }`}
                >
                  <span>
                    {ord.status === "paid"
                      ? "เปิดดูตั๋วเข้างานของฉัน (QR Code)"
                      : ord.status === "under_review"
                      ? "ดูสถานะการตรวจสอบสลิป"
                      : "ไปหน้าชำระเงินและแนบสลิป"}
                  </span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
