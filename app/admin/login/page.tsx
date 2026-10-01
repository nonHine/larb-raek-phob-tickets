"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EVENT } from "@/config/event.config";
import { ShieldCheck, Mail, Lock, ArrowLeft, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // In local development / mock mode, allow any valid staff credentials
    setTimeout(() => {
      if (email.includes("@") && password.length >= 4) {
        // Save role in session storage for local dev
        sessionStorage.setItem("staff_role", "admin");
        router.push("/admin");
      } else {
        setError("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลหรือรหัสผ่าน");
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-surface-subtle flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col gap-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับหน้าแรก</span>
        </Link>

        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="w-12 h-12 rounded-xl bg-brand text-white flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-content mt-2">
            เข้าสู่ระบบสตาฟ
          </h1>
          <p className="text-xs text-content-muted">
            {EVENT.name} • {EVENT.venue}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-status-danger-subtle border border-status-danger/30 text-status-danger text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4 text-sm">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="staffEmail" className="text-xs font-semibold text-content">
              อีเมลสตาฟ
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-content-muted absolute left-3.5 top-3.5" />
              <input
                id="staffEmail"
                type="email"
                required
                placeholder="staff@larbraekphob.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="staffPass" className="text-xs font-semibold text-content">
              รหัสผ่าน
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-content-muted absolute left-3.5 top-3.5" />
              <input
                id="staffPass"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-brand hover:bg-brand-pressed text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all mt-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <span>เข้าสู่ระบบ</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
