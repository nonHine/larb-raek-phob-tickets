"use client";

import { useEffect, useState } from "react";
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
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchStats();
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
        )}
      </div>
    </div>
  );
}
