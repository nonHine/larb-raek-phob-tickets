"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EVENT } from "@/config/event.config";
import {
  AlertTriangle,
  QrCode,
  ClipboardList,
  BarChart3,
  LogOut,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";

interface StaffHeaderProps {
  staffRole?: "admin" | "scanner";
  pendingCount?: number;
}

export function StaffHeader({
  staffRole = "admin",
  pendingCount = 0,
}: StaffHeaderProps) {
  const pathname = usePathname();
  const [isFull, setIsFull] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/venue-status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setIsFull(data.is_full);
        setUpdatedAt(data.updated_at);
      }
    } catch {
      // keep
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleClick = () => {
    if (!isFull) {
      // Turning ON requires confirmation dialog
      setShowConfirmModal(true);
    } else {
      // Turning OFF is a single tap
      executeToggle(false);
    }
  };

  const executeToggle = async (newVal: boolean) => {
    setLoadingToggle(true);
    try {
      const res = await fetch("/api/venue-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_full: newVal, staff_id: "staff-current" }),
      });
      if (res.ok) {
        setIsFull(newVal);
        setShowConfirmModal(false);
        await fetchStatus();
      }
    } catch {
      // keep
    } finally {
      setLoadingToggle(false);
    }
  };

  return (
    <>
      <header className="w-full bg-surface border-b border-border flex flex-col sticky top-0 z-40">
        {/* Top Control Bar: Venue Full Switch */}
        <div
          className={`w-full px-4 py-2.5 flex items-center justify-between text-xs transition-colors ${
            isFull
              ? "bg-status-warning-subtle text-status-warning border-b border-status-warning/20"
              : "bg-surface-subtle text-content border-b border-border"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isFull ? "bg-status-warning animate-pulse" : "bg-status-success"
              }`}
            />
            <span className="font-semibold text-xs sm:text-sm">
              {isFull
                ? "ร้านเต็มชั่วคราว (หยุดรับออเดอร์ใหม่)"
                : "ร้านเปิดรับออเดอร์ปกติ"}
            </span>
          </div>

          <button
            type="button"
            disabled={loadingToggle}
            onClick={handleToggleClick}
            className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
              isFull
                ? "bg-status-success hover:bg-status-success/90 text-white"
                : "bg-status-warning hover:bg-status-warning/90 text-white"
            }`}
          >
            {loadingToggle ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isFull ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>เปิดรับออเดอร์</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>กดปิดร้านชั่วคราว</span>
              </>
            )}
          </button>
        </div>

        {/* Navigation Bar */}
        <div className="px-4 py-2.5 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand text-white font-bold text-xs flex items-center justify-center">
              สตาฟ
            </div>
            <span className="font-bold text-sm text-content">{EVENT.name}</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            {staffRole === "admin" && (
              <>
                <Link
                  href="/admin"
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors relative ${
                    pathname === "/admin"
                      ? "bg-brand text-white"
                      : "text-content-muted hover:text-content hover:bg-surface-subtle"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>รอตรวจ</span>
                  {pendingCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        pathname === "/admin"
                          ? "bg-white text-brand"
                          : "bg-brand text-white"
                      }`}
                    >
                      {pendingCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/admin/orders"
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                    pathname === "/admin/orders"
                      ? "bg-brand text-white"
                      : "text-content-muted hover:text-content hover:bg-surface-subtle"
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>ออเดอร์</span>
                </Link>

                <Link
                  href="/admin/dashboard"
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                    pathname === "/admin/dashboard"
                      ? "bg-brand text-white"
                      : "text-content-muted hover:text-content hover:bg-surface-subtle"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>แดชบอร์ด</span>
                </Link>
              </>
            )}

            <Link
              href="/staff/scan"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                pathname === "/staff/scan"
                  ? "bg-status-success text-white"
                  : "bg-surface-subtle text-status-success hover:bg-status-success/10 border border-status-success/30"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>สแกนบัตร</span>
            </Link>

            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/staff-pin", { method: "DELETE" });
                window.location.href = "/admin/login";
              }}
              title="ออกจากระบบ"
              className="p-1.5 rounded-lg text-content-muted hover:text-status-danger hover:bg-status-danger/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </nav>
        </div>
      </header>

      {/* Confirmation Modal for turning venue full ON */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface rounded-2xl p-5 border border-border shadow-xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-status-warning-subtle text-status-warning flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-content">
                หยุดรับออเดอร์ใหม่ชั่วคราว?
              </h3>
              <p className="text-xs text-content-muted leading-relaxed">
                เมื่อเปิดสถานะ &quot;ร้านเต็มชั่วคราว&quot;
                ผู้ซื้อจะไม่สามารถสั่งซื้อบัตรใหม่ได้
                แต่ออเดอร์เดิมยังคงแนบสลิปและสแกนเข้างานได้ตามปกติ
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-1/2 h-11 rounded-xl border border-border bg-surface text-content text-xs font-semibold hover:bg-surface-subtle"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={loadingToggle}
                onClick={() => executeToggle(true)}
                className="w-1/2 h-11 rounded-xl bg-status-warning hover:bg-status-warning/90 text-white text-xs font-semibold shadow-sm"
              >
                {loadingToggle ? "กำลังบันทึก..." : "ยืนยันปิดรับ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
