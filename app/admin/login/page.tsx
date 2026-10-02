"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Lock, Delete, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";

function PinLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/admin";

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);
      if (newPin.length >= 4) {
        submitPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin("");
    setError(null);
  };

  const submitPin = async (pinToSubmit: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/staff-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinToSubmit }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "รหัส PIN ไม่ถูกต้อง");
        setPin("");
        setLoading(false);
        return;
      }

      // Successful login
      if (nextUrl && nextUrl !== "/admin/login") {
        router.push(nextUrl);
      } else {
        router.push(data.redirect_url || "/admin");
      }
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
      setPin("");
      setLoading(false);
    }
  };

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Enter" && pin.length >= 4) {
        submitPin(pin);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin]);

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-border shadow-md bg-white p-1 mb-1">
          <Image
            src="/Logo.jpg"
            alt="งานลาบแรกพบ"
            width={64}
            height={64}
            className="w-full h-full object-cover rounded-xl"
            priority
          />
        </div>
        <h1 className="text-xl font-bold text-content tracking-tight">
          เข้าสู่ระบบสตาฟ & แอดมิน
        </h1>
        <p className="text-xs text-content-muted">
          งานลาบแรกพบ • ร้านลาบก้อยซอยนานา
        </p>
      </div>

      {/* PIN Dots Indicator */}
      <div className="flex items-center gap-3 my-2">
        {[0, 1, 2, 3].map((index) => {
          const filled = pin.length > index;
          return (
            <div
              key={index}
              className={`w-4 h-4 rounded-full transition-all duration-200 border ${
                filled
                  ? "bg-brand border-brand scale-110 shadow-sm"
                  : "bg-surface-subtle border-border"
              }`}
            />
          );
        })}
      </div>

      {/* Error / Loading Feedback */}
      <div className="min-h-[24px] text-center">
        {loading ? (
          <span className="text-xs text-brand font-medium flex items-center justify-center gap-1.5 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            กำลังตรวจสอบสิทธิ์...
          </span>
        ) : error ? (
          <span className="text-xs text-status-danger font-semibold bg-status-danger-subtle px-3 py-1 rounded-full border border-status-danger/30">
            {error}
          </span>
        ) : (
          <span className="text-xs text-content-muted flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            ป้อนรหัส PIN 4 หลักเพื่อเข้าสู่ระบบ
          </span>
        )}
      </div>

      {/* Numeric Keypad (NumPad) */}
      <div className="w-full grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleKeyPress(digit)}
            disabled={loading}
            className="h-14 rounded-2xl bg-surface border border-border hover:border-brand/40 hover:bg-brand/5 active:scale-95 text-xl font-bold text-content shadow-sm transition-all flex items-center justify-center focus:outline-none"
          >
            {digit}
          </button>
        ))}

        {/* Clear Button */}
        <button
          type="button"
          onClick={handleClear}
          disabled={loading || pin.length === 0}
          className="h-14 rounded-2xl bg-surface-subtle border border-border/60 hover:bg-surface active:scale-95 text-xs font-semibold text-content-muted shadow-sm transition-all flex items-center justify-center disabled:opacity-40"
        >
          ล้าง
        </button>

        {/* Digit 0 */}
        <button
          type="button"
          onClick={() => handleKeyPress("0")}
          disabled={loading}
          className="h-14 rounded-2xl bg-surface border border-border hover:border-brand/40 hover:bg-brand/5 active:scale-95 text-xl font-bold text-content shadow-sm transition-all flex items-center justify-center focus:outline-none"
        >
          0
        </button>

        {/* Backspace Button */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading || pin.length === 0}
          className="h-14 rounded-2xl bg-surface-subtle border border-border/60 hover:bg-surface active:scale-95 text-content-muted shadow-sm transition-all flex items-center justify-center disabled:opacity-40"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {/* Role Hint Card */}
      <div className="w-full p-3.5 rounded-2xl bg-surface-subtle border border-border text-[11px] text-content-muted flex flex-col gap-1 text-center">
        <span className="font-semibold text-content flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-brand" />
          ระดับสิทธิ์การเข้าใช้งาน
        </span>
        <span>• <strong>Admin PIN:</strong> เข้าถึงคิวสลิป ยอดขาย สถิติ และจัดการระบบ</span>
        <span>• <strong>Staff PIN:</strong> เข้าถึงกล้องสแกนบัตรหน้าประตูงาน</span>
      </div>

      {/* Back to Home Link */}
      <Link
        href="/"
        className="text-xs text-content-muted hover:text-brand hover:underline transition-colors mt-2"
      >
        ← กลับสู่หน้าหลักของงาน
      </Link>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <span className="text-xs text-content-muted">กำลังโหลด...</span>
          </div>
        }
      >
        <PinLoginForm />
      </Suspense>
    </div>
  );
}
