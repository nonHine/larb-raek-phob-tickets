"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  Flashlight,
  Upload,
  RotateCcw,
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

// Synthesize pleasant chime or error buzz using Web Audio API
function playScanSound(type: "success" | "error" = "success") {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // Pleasant double-chime (A5 -> D6)
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    } else {
      // Warning buzz
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    // AudioContext blocked by browser policy
  }
}

// Trigger haptic vibration on mobile devices
function triggerVibration(pattern: number[] = [100, 50, 100]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration not supported
    }
  }
}

export default function StaffScanPage() {
  const [manualCode, setManualCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [autoResetCountdown, setAutoResetCountdown] = useState<number | null>(null);

  const [scanResult, setScanResult] = useState<ScannedResult>({
    code: "",
    status: "idle",
  });

  const lastScannedCode = useRef<string | null>(null);
  const lastScanTimestamp = useRef<number>(0);
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop scanner safely
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch {
        // Ignore stop error
      }
      setIsCameraRunning(false);
      setTorchOn(false);
    }
  }, []);

  // Process ticket code through the API
  const processTicketCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    // 2-second debounce against repeated scans
    const now = Date.now();
    if (code === lastScannedCode.current && now - lastScanTimestamp.current < 2000) {
      return;
    }
    lastScanTimestamp.current = now;
    lastScannedCode.current = code;

    // Pause scanner during API call
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.pause(true);
      } catch {
        // Ignore pause error
      }
    }

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
        playScanSound("success");
        triggerVibration([80, 40, 120]);
        setScanResult({
          code,
          status: "checked_in_success",
          holderName: data.ticket?.holder_name,
          orderCode: data.ticket?.order_code,
          checkedInAt: data.ticket?.checked_in_at,
        });
      } else if (res.status === 409) {
        playScanSound("error");
        triggerVibration([200, 100, 200]);
        setScanResult({
          code,
          status: "already_checked_in",
          checkedInAt: data.checked_in_at,
          checkedInBy: data.checked_in_by,
          errorMessage: data.message,
        });
      } else {
        playScanSound("error");
        triggerVibration([300]);
        setScanResult({
          code,
          status: "invalid",
          errorMessage: data.message || "บัตรไม่ถูกต้อง",
        });
      }
    } catch {
      playScanSound("error");
      setScanResult({
        code,
        status: "invalid",
        errorMessage: "การเชื่อมต่อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setProcessing(false);
    }
  }, []);

  // Initialize and start live camera scanner
  const startScanner = useCallback(async () => {
    setCameraLoading(true);
    setCameraError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (!document.getElementById("reader")) {
        setCameraLoading(false);
        return;
      }

      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      const qrConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        qrConfig,
        (decodedText) => {
          processTicketCode(decodedText);
        },
        () => {
          // Normal frame with no QR code detected, ignore
        }
      );

      setIsCameraRunning(true);
      setCameraLoading(false);

      // Check for torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCameraCapabilities();
        if (capabilities && typeof capabilities.torchFeature === "function") {
          const torch = capabilities.torchFeature();
          setTorchAvailable(torch.isSupported());
        }
      } catch {
        setTorchAvailable(false);
      }
    } catch (err: any) {
      setIsCameraRunning(false);
      setCameraLoading(false);

      const errMsg = String(err?.message || err);
      if (errMsg.includes("NotAllowedError") || errMsg.includes("Permission denied")) {
        setCameraError("กรุณาอนุญาตสิทธิ์การใช้กล้องในเบราว์เซอร์เพื่อเปิดระบบสแกน");
      } else if (errMsg.includes("NotFoundError") || errMsg.includes("Requested device not found")) {
        setCameraError("ไม่พบอุปกรณ์กล้องบนอุปกรณ์นี้ หรือกล้องถูกโปรแกรมอื่นใช้งานอยู่");
      } else {
        setCameraError("ไม่สามารถเปิดกล้องได้: " + (err?.message || "โปรดลองใหม่อีกครั้งหรือใช้วิธีอัปโหลดรูปภาพ"));
      }
    }
  }, [processTicketCode]);

  // Toggle flashlight/torch
  const toggleTorch = async () => {
    if (!scannerRef.current || !torchAvailable) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch {
      // Torch toggle failed
    }
  };

  // Reset scanner for next ticket
  const resetScanner = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoResetCountdown(null);
    setScanResult({ code: "", status: "idle" });
    setManualCode("");

    // Resume camera if scanner instance exists
    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch {
        // If resume fails, restart scanner
        startScanner();
      }
    } else {
      startScanner();
    }
  }, [startScanner]);

  // Handle auto-reset countdown on successful check-in
  useEffect(() => {
    if (scanResult.status === "checked_in_success") {
      let remaining = 3;
      setAutoResetCountdown(remaining);

      countdownTimerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          resetScanner();
        } else {
          setAutoResetCountdown(remaining);
        }
      }, 1000);

      return () => {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      };
    }
  }, [scanResult.status, resetScanner]);

  // Handle image file scan fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setCameraError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const tempScanner = scannerRef.current || new Html5Qrcode("reader");
      const decodedText = await tempScanner.scanFile(file, false);
      if (decodedText) {
        await processTicketCode(decodedText);
      }
    } catch {
      setCameraError("ไม่พบ QR Code ในรูปภาพที่เลือก กรุณาลองใช้รูปใหม่");
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Start scanner on mount and stop on unmount
  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processTicketCode(manualCode);
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

        {/* Live Camera Viewfinder Area */}
        <div className="w-full aspect-square bg-black rounded-3xl border-2 border-border relative overflow-hidden shadow-lg flex flex-col items-center justify-center text-white">
          {/* Reader container for Html5Qrcode video element */}
          <div
            id="reader"
            className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
          />

          {/* Target Corner Guides (Visible when camera running and not showing result banner) */}
          {isCameraRunning && scanResult.status === "idle" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-status-success rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-status-success rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-status-success rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-status-success rounded-br-lg" />
                <div className="absolute inset-x-4 top-1/2 h-0.5 bg-status-success/60 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
              </div>
            </div>
          )}

          {/* Loading State Overlay */}
          {cameraLoading && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Loader2 className="w-10 h-10 text-status-success animate-spin" />
              <span className="text-sm font-semibold">กำลังเชื่อมต่อกล้อง...</span>
              <span className="text-xs text-white/60">หากมีหน้าต่างขอสิทธิ์กล้อง โปรดกด 'อนุญาต' (Allow)</span>
            </div>
          )}

          {/* Camera Error State Overlay */}
          {cameraError && !cameraLoading && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
              <Camera className="w-12 h-12 text-status-danger" />
              <span className="text-sm font-bold text-white">ไม่สามารถเปิดกล้องได้</span>
              <p className="text-xs text-white/70 max-w-xs">{cameraError}</p>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={startScanner}
                  className="px-4 py-2 rounded-xl bg-status-success text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>ลองเปิดใหม่</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>เลือกรูป QR</span>
                </button>
              </div>
            </div>
          )}

          {/* Camera Controls Bar (Top Floating) */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            {torchAvailable && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                  torchOn ? "bg-amber-400 text-black shadow-md" : "bg-black/50 text-white hover:bg-black/70"
                }`}
                title="เปิด/ปิดไฟฉาย"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70 transition-colors"
              title="สแกนจากไฟล์รูปภาพ"
            >
              <Upload className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={startScanner}
              className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70 transition-colors"
              title="รีเซ็ตกล้อง"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Hidden File Input for fallback QR image upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* FEEDBACK BANNERS */}
        {processing && (
          <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-center gap-2 text-content font-medium text-sm shadow-sm">
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
            <div className="text-xs bg-white/10 rounded-xl p-3 w-full flex flex-col gap-1 mt-1 text-left">
              <span>ผู้ถือบัตร: <strong>{scanResult.holderName || "ไม่ระบุชื่อ"}</strong></span>
              <span>รหัสออเดอร์: {scanResult.orderCode}</span>
              <span>รหัสบัตร: <code className="font-mono">{scanResult.code}</code></span>
            </div>

            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                type="button"
                onClick={resetScanner}
                className="w-full h-11 rounded-xl bg-white text-status-success font-bold text-sm shadow-sm hover:bg-white/95 transition-all flex items-center justify-center gap-2"
              >
                <span>พร้อมสแกนใบถัดไป</span>
                {autoResetCountdown !== null && (
                  <span className="text-xs font-normal opacity-80">
                    ({autoResetCountdown} วิ)
                  </span>
                )}
              </button>
            </div>
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
              className="mt-2 w-full h-11 rounded-xl bg-white text-status-danger font-bold text-sm shadow-sm hover:bg-white/95 transition-all"
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
                className="w-1/2 h-11 rounded-xl bg-white/20 text-white font-semibold text-xs hover:bg-white/30 transition-all"
              >
                ลองใหม่
              </button>
              <Link
                href="/staff/search"
                className="w-1/2 h-11 rounded-xl bg-white text-status-danger font-bold text-xs flex items-center justify-center shadow-sm"
              >
                ค้นหาด้วยชื่อ/เบอร์
              </Link>
            </div>
          </div>
        )}

        {/* Manual Barcode / Code input form (Permanent Fallback) */}
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
              placeholder="วางหรือพิมพ์รหัสบัตร (เช่น LRP-TKT-...)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 h-11 px-3 rounded-xl border border-border text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <button
              type="submit"
              disabled={processing || !manualCode.trim()}
              className="px-4 h-11 rounded-xl bg-status-success hover:bg-status-success/90 text-white font-bold text-xs disabled:opacity-40 shadow-sm transition-all"
            >
              ตรวจ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
