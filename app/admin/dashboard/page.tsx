"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StaffHeader } from "@/components/admin/StaffHeader";
import {
  BarChart3,
  Ticket,
  Clock,
  CheckCircle2,
  DollarSign,
  UserCheck,
  Ban,
  Loader2,
  Banknote,
  Smartphone,
  Zap,
} from "lucide-react";

interface DashboardStats {
  total_orders: number;
  pending_payment_count: number;
  under_review_count: number;
  paid_count: number;
  cancelled_count: number;
  confirmed_revenue_thb: number;
  tickets_issued: number;
  tickets_checked_in: number;
  onsite_cash_thb: number;
  onsite_promptpay_thb: number;
  onsite_tickets_count: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(true);
  const [togglingAi, setTogglingAi] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch {
      // keep
    } finally {
      setLoading(false);
    }
  };

  const fetchAiSettings = async () => {
    try {
      const res = await fetch("/api/admin/ai-settings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.settings?.autoApprove === "boolean") {
          setAutoApproveEnabled(data.settings.autoApprove);
        }
      }
    } catch {}
  };

  const handleToggleAi = async () => {
    if (togglingAi) return;
    setTogglingAi(true);
    try {
      const nextVal = !autoApproveEnabled;
      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoApprove: nextVal }),
      });
      if (res.ok) {
        setAutoApproveEnabled(nextVal);
      }
    } catch {
    } finally {
      setTogglingAi(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAiSettings();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <StaffHeader />

      <div className="p-4 sm:p-6 flex flex-col gap-5 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand" />
            <h1 className="text-lg font-bold text-content">แดชบอร์ดสรุปภาพรวม</h1>
          </div>
          <span className="text-xs text-content-muted">รีเฟรชทุก 5 วินาที</span>
        </div>

        {loading || !stats ? (
          <div className="flex flex-col items-center justify-center p-12 gap-2 text-content-muted">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <span className="text-xs">กำลังโหลดสถิติ...</span>
          </div>
        ) : (
          <>
            {/* AI Auto-Approve Control Banner */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-base">
                  🤖
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-content">ระบบ AI ตรวจสลิปอัตโนมัติ (Gemini Vision)</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${autoApproveEnabled ? "bg-status-success-subtle text-status-success" : "bg-status-warning-subtle text-status-warning"}`}>
                      {autoApproveEnabled ? "Auto ON (อนุมัติทันที)" : "Auto OFF (รอแอดมินยืนยัน)"}
                    </span>
                  </div>
                  <span className="text-xs text-content-muted">
                    {autoApproveEnabled ? "ระบบจะตรวจสอบยอดเงินและบัญชีปลายทาง หากถูกต้อง 100% จะอนุมัติออกบัตรทันที" : "AI ช่วยวิเคราะห์ข้อมูลให้ แต่แอดมินต้องเป็นผู้กด 1-Click Approve"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={togglingAi}
                onClick={handleToggleAi}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${autoApproveEnabled ? "bg-status-success text-white hover:opacity-90" : "bg-surface border border-border text-content hover:bg-surface-subtle"}`}
              >
                {togglingAi ? "..." : autoApproveEnabled ? "เปิดใช้งานอยู่" : "ปิดการอนุมัติออโต้"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
            {/* Confirmed Revenue */}
            <div className="col-span-2 p-5 rounded-2xl bg-gradient-to-r from-brand to-brand-pressed text-white shadow-sm flex flex-col gap-1">
              <span className="text-xs opacity-90 font-medium">
                รายได้ที่ได้รับการยืนยันแล้ว
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {stats.confirmed_revenue_thb.toLocaleString()}
                </span>
                <span className="text-sm font-semibold opacity-90">บาท</span>
              </div>
            </div>

            {/* On-site POS Summary Card */}
            <div className="col-span-2 p-5 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-surface to-surface shadow-sm flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">💵</span>
                  <div>
                    <h2 className="text-base font-bold text-content flex items-center gap-2">
                      ยอดขายบัตรหน้างาน (On-site POS)
                    </h2>
                    <p className="text-xs text-content-muted">
                      สรุปยอดขายบัตร Walk-in และจำแนกช่องทางชำระเงิน
                    </p>
                  </div>
                </div>

                <Link
                  href="/staff/walk-up"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-sm transition-all self-start sm:self-auto"
                >
                  <Zap className="w-4 h-4 fill-stone-950" />
                  <span>⚡ ไปหน้าขายบัตร POS (/staff/walk-up)</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Cash in hand for shift closing */}
                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Banknote className="w-4 h-4" />
                      เงินสดรับในกระเป๋า
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 font-medium">
                      ปิดกะ
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-extrabold text-content">
                      {(stats?.onsite_cash_thb || 0).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-content-muted">฿</span>
                  </div>
                  <span className="text-[11px] text-content-muted">
                    เงินสดรับในกระเป๋า: {stats?.onsite_cash_thb || 0} ฿ (สำหรับสตาฟนับเงินสดปิดกะ)
                  </span>
                </div>

                {/* PromptPay on-site */}
                <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      โอนพร้อมเพย์หน้างาน
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 font-medium">
                      QR Code
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-extrabold text-content">
                      {(stats?.onsite_promptpay_thb || 0).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-content-muted">฿</span>
                  </div>
                  <span className="text-[11px] text-content-muted">
                    โอนพร้อมเพย์หน้างาน: {stats?.onsite_promptpay_thb || 0} ฿
                  </span>
                </div>

                {/* Total On-site Tickets */}
                <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Ticket className="w-4 h-4" />
                      รวมบัตรหน้างาน
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 font-medium">
                      Walk-up
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-extrabold text-content">
                      {(stats?.onsite_tickets_count || 0).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-content-muted">ใบ</span>
                  </div>
                  <span className="text-[11px] text-content-muted">
                    รวมบัตรหน้างาน: {stats?.onsite_tickets_count || 0} ใบ
                  </span>
                </div>
              </div>
            </div>

            {/* Pending Review */}
            <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-status-warning font-semibold text-xs">
                <Clock className="w-4 h-4" />
                <span>รอตรวจสลิป</span>
              </div>
              <span className="text-2xl font-bold text-content">
                {stats.under_review_count}
              </span>
              <span className="text-[10px] text-content-muted">ออเดอร์</span>
            </div>

            {/* Paid Orders */}
            <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-status-success font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>ชำระเงินแล้ว</span>
              </div>
              <span className="text-2xl font-bold text-content">
                {stats.paid_count}
              </span>
              <span className="text-[10px] text-content-muted">ออเดอร์</span>
            </div>

            {/* Tickets Issued */}
            <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-brand font-semibold text-xs">
                <Ticket className="w-4 h-4" />
                <span>ออกบัตรแล้ว</span>
              </div>
              <span className="text-2xl font-bold text-content">
                {stats.tickets_issued}
              </span>
              <span className="text-[10px] text-content-muted">ใบ</span>
            </div>

            {/* Checked-in Count */}
            <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-content font-semibold text-xs">
                <UserCheck className="w-4 h-4" />
                <span>เข้างานแล้ว</span>
              </div>
              <span className="text-2xl font-bold text-content">
                {stats.tickets_checked_in}
              </span>
              <span className="text-[10px] text-content-muted">
                คน (ข้อมูลประกอบเท่านั้น)
              </span>
            </div>

            {/* Pending Payment */}
            <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-1.5">
              <span className="text-xs text-content-muted">รอชำระเงิน</span>
              <span className="text-xl font-bold text-content">
                {stats.pending_payment_count}
              </span>
            </div>

            {/* Cancelled */}
            <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-1.5">
              <span className="text-xs text-status-danger">ยกเลิกแล้ว</span>
              <span className="text-xl font-bold text-content">
                {stats.cancelled_count}
              </span>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
