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
} from "lucide-react";

export default function OrderLookupPage() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !email.trim() || loading) return;

    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), email: email.trim() }),
      });

      const data = await res.json();
      setFeedback(data.message || "ส่งข้อมูลเรียบร้อยแล้ว");
    } catch {
      setFeedback("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="p-4 sm:p-6 flex flex-col gap-5 flex-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-content-muted hover:text-content"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าหลัก</span>
        </Link>

        <div>
          <h1 className="text-xl font-bold text-content">หาออเดอร์ของฉัน</h1>
          <p className="text-xs text-content-muted mt-1">
            ระบุรหัสคำสั่งซื้อและอีเมลที่ใช้สั่งซื้อ เพื่อรับลิงก์ดูตั๋วและสถานะออเดอร์อีกครั้ง
          </p>
        </div>

        {feedback && (
          <div className="p-4 rounded-xl bg-status-success-subtle border border-status-success/30 text-status-success text-xs sm:text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{feedback}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-2xl border border-border bg-surface flex flex-col gap-4 text-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="code" className="font-medium text-content text-xs">
              รหัสคำสั่งซื้อ (เช่น LRP-XXXXXX)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-content-muted absolute left-3.5 top-3.5" />
              <input
                id="code"
                type="text"
                required
                placeholder="LRP-..."
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-surface text-sm uppercase font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-medium text-content text-xs">
              อีเมลที่ใช้ในการสั่งซื้อ
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
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-brand hover:bg-brand-pressed text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังค้นหา...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>ส่งลิงก์สถานะออเดอร์ไปยังอีเมล</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
