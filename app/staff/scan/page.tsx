"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { StaffHeader } from "@/components/admin/StaffHeader";
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Camera,
  Loader2,
  RefreshCw,
  User,
  Ticket,
} from "lucide-react";

interface ScannedResult {
  code: string;
  status: "idle" | "ready_to_checkin" | "checked_in_success" | "already_checked_in" | "invalid";
  holderName?: string;
  orderCode?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  errorMessage?: string;
}

export default function StaffScanPage() {
  const [manualCode, setManualCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const lastScanTimestamp = useRef<number>(0);

  const [scanResult, setScanResult] = useState<ScannedResult>({
    code: "",
    status: "idle",
  });

  // Debounced scan processor
  const processTicketCode = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    // 2-second debounce against repeated scans
    const now = Date.now();
    if (code === lastScannedCode && now - lastScanTimestamp.current < 2000) {
      return;
    }
    lastScanTimestamp.current = now;
    setLastScannedCode(code);

    setProcessing(true);
    setScanResult({ code, status: "idle" });

    try {
      const res = await fetch("/api/staff/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_code: code,
          staff_id: "staff-gate-1",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setScanResult({
          code,
          status: "checked_in_success",
          holderName: data.ticket?.holder_name,
          orderCode: data.ticket?.order_code,
          checkedInAt: data.ticket?.checked_in_at,
        });
      } else if (res.status === 409) {
        setScanResult({
          code,
          status: "already_checked_in",
          checkedInAt: data.checked_in_at,
          checkedInBy: data.checked_in_by,
          errorMessage: data.message,
        });
      } else {
        setScanResult({
          code,
          status: "invalid",
          errorMessage: data.message || "บัตรไม่ถูกต้อง",
        });
      }
    } catch {
      setScanResult({
        code,
        status: "invalid",
        errorMessage: "การเชื่อมต่อผิดพลาด กรุณาลองใหม่",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processTicketCode(manualCode);
  };

  const resetScanner = () => {
    setScanResult({ code: "", status: "idle" });
    setManualCode("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-subtle">
      <StaffHeader staffRole="scanner" />

      <div className="p-4 sm:p-6 flex flex-col gap-4 flex-1 max-w-lg mx-auto w-full">
        {/* Title & Manual search link */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-status-success" />
            <h1 className="text-lg font-bold text-content">สแกนบัตรเข้างาน</h1>
          </div>

          <Link
            href="/staff/search"
            className="px-3 py-1.5 rounded-lg border border-border bg-surface text-content hover:text-brand text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span>ค้นหาด้วยมือ</span>
          </Link>
        </div>

        {/* Camera Viewfinder Area */}
        <div className="w-full aspect-square bg-black/90 rounded-3xl border-2 border-border relative flex flex-col items-center justify-center p-6 text-white text-center overflow-hidden shadow-lg">
          {/* Target Corner Guides */}
          <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-status-success rounded-tl-lg" />
          <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-status-success rounded-tr-lg" />
          <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-status-success rounded-bl-lg" />
          <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-status-success rounded-br-lg" />

          {/* Scanner status message */}
          <Camera className="w-12 h-12 text-white/40 mb-3 animate-pulse" />
          <span className="text-sm font-semibold">เล็งกล้องไปที่ QR Code ของบัตร</span>
          <span className="text-xs text-white/60 mt-1 max-w-xs">
            เมื่อสแกนสำเร็จ ระบบจะบันทึกการเข้างานและแสดงผลทันที
          </span>
        </div>

        {/* FEEDBACK BANNERS */}
        {processing && (
          <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-center gap-2 text-content font-medium text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            <span>กำลังตรวจสอบรหัสบัตร...</span>
          </div>
        )}

        {/* SUCCESS CHECK-IN */}
        {scanResult.status === "checked_in_success" && (
          <div className="p-5 rounded-2xl bg-status-success text-white shadow-md flex flex-col items-center text-center gap-2 animate-in zoom-in-95">
            <CheckCircle2 className="w-12 h-12" />
            <h2 className="text-xl font-extrabold">
              เช็กอินสำเร็จ — ให้ wristband แล้ว!
            </h2>
            <div className="text-xs bg-white/10 rounded-xl p-3 w-full flex flex-col gap-1 mt-1">
              <span>ผู้ถือบัตร: <strong>{scanResult.holderName}</strong></span>
              <span>รหัสออเดอร์: {scanResult.orderCode}</span>
            </div>
            <button
              type="button"
              onClick={resetScanner}
              className="mt-2 w-full h-11 rounded-xl bg-white text-status-success font-bold text-sm shadow-sm"
            >
              พร้อมสแกนใบถัดไป
            </button>
          </div>
        )}

        {/* ALREADY CHECKED IN (RED BANNER) */}
        {scanResult.status === "already_checked_in" && (
          <div className="p-5 rounded-2xl bg-status-danger text-white shadow-md flex flex-col items-center text-center gap-2 animate-in zoom-in-95">
            <AlertTriangle className="w-12 h-12" />
            <h2 className="text-xl font-extrabold">
              {scanResult.errorMessage || "บัตรนี้เข้างานแล้ว!"}
            </h2>
            <p className="text-xs text-white/90">
              ไม่อนุญาตให้ใช้บัตรซ้ำ (งานนี้ไม่มีระบบ check-out หรือเข้าซ้ำ)
            </p>
            <button
              type="button"
              onClick={resetScanner}
              className="mt-2 w-full h-11 rounded-xl bg-white text-status-danger font-bold text-sm shadow-sm"
            >
              รับทราบ / สแกนใบถัดไป
            </button>
          </div>
        )}

        {/* INVALID TICKET */}
        {scanResult.status === "invalid" && (
          <div className="p-5 rounded-2xl bg-status-danger text-white shadow-md flex flex-col items-center text-center gap-2 animate-in zoom-in-95">
            <XCircle className="w-12 h-12" />
            <h2 className="text-xl font-extrabold">
              {scanResult.errorMessage || "บัตรไม่ถูกต้อง"}
            </h2>
            <p className="text-xs text-white/90">
              ไม่พบรหัสบัตรนี้ หรือบัตรถูกยกเลิกไปแล้ว
            </p>
            <div className="flex gap-2 w-full mt-2">
              <button
                type="button"
                onClick={resetScanner}
                className="w-1/2 h-11 rounded-xl bg-white/20 text-white font-semibold text-xs"
              >
                ลองใหม่
              </button>
              <Link
                href="/staff/search"
                className="w-1/2 h-11 rounded-xl bg-white text-status-danger font-bold text-xs flex items-center justify-center"
              >
                ค้นหาด้วยชื่อ/เบอร์
              </Link>
            </div>
          </div>
        )}

        {/* Manual Barcode / Code input form (Fallback for camera issues) */}
        <form
          onSubmit={handleManualSubmit}
          className="p-4 rounded-2xl border border-border bg-surface flex flex-col gap-2.5 shadow-sm"
        >
          <span className="text-xs font-semibold text-content">
            หรือกรอกรหัสบัตร / ใช้เครื่องสแกนบาร์โค้ด
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="วางหรือพิมพ์รหัสบัตร (16 ตัวขึ้นไป)..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 h-11 px-3 rounded-xl border border-border text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <button
              type="submit"
              disabled={processing || !manualCode.trim()}
              className="px-4 h-11 rounded-xl bg-status-success hover:bg-status-success/90 text-white font-bold text-xs disabled:opacity-40 shadow-sm"
            >
              ตรวจ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
