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
  Zap,
  Ticket,
} from "lucide-react";

interface OrderTicketItem {
  id: string;
  code: string;
  holder_name: string;
  status: "issued" | "checked_in" | "void";
  checked_in_at?: string | null;
  checked_in_by?: string | null;
}

interface ScannedResult {
  code: string;
  status:
    | "idle"
    | "ready_to_checkin"
    | "checked_in_success"
    | "already_checked_in"
    | "order_tickets_view"
    | "invalid";
  holderName?: string;
  orderCode?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  errorMessage?: string;
  orderData?: {
    id: string;
    code: string;
    buyer_name: string;
    phone: string;
    quantity: number;
    tickets: OrderTicketItem[];
    issued_count: number;
    checked_in_count: number;
  };
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

  // Process ticket or order code through the API
  const processTicketCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    // 2-second debounce against repeated scans of identical content
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
        if (data.is_order && data.tickets) {
          // Multiple tickets under an order scanned!
          playScanSound("success");
          triggerVibration([80, 40, 120]);
          setScanResult({
            code,
            status: "order_tickets_view",
            orderCode: data.order?.code,
            orderData: {
              id: data.order?.id,
              code: data.order?.code,
              buyer_name: data.order?.buyer_name,
              phone: data.order?.phone,
              quantity: data.order?.quantity,
              tickets: data.tickets,
              issued_count:
                data.issued_count ??
                data.tickets.filter((t: any) => t.status === "issued").length,
              checked_in_count:
                data.checked_in_count ??
                data.tickets.filter((t: any) => t.status === "checked_in").length,
            },
          });
        } else {
          // Single ticket successfully checked in!
          playScanSound("success");
          triggerVibration([80, 40, 120]);
          setScanResult({
            code,
            status: "checked_in_success",
            holderName: data.ticket?.holder_name,
            orderCode: data.ticket?.order_code,
            checkedInAt: data.ticket?.checked_in_at,
          });
        }
      } else if (res.status === 409) {
        playScanSound("error");
        triggerVibration([200, 100, 200]);
        setScanResult({
          code,
          status: "already_checked_in",
          checkedInAt: data.checked_in_at,
          checkedInBy: data.checked_in_by,
          errorMessage: data.message,
          holderName: data.ticket?.holder_name || data.order?.buyer_name,
          orderCode: data.ticket?.order_code || data.order?.code,
        });
      } else {
        playScanSound("error");
        triggerVibration([300]);
        setScanResult({
          code,
          status: "invalid",
          errorMessage: data.message || "บัตรไม่ถูกต้อง หรือไม่พบในระบบ",
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

  // Global keydown capture for hardware barcode / 2D QR scanners
  // Prevents scanner's Enter key from activating links (e.g. accidentally clicking Search)
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is intentionally typing into a regular input or textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea") {
        return;
      }

      const now = Date.now();

      // If more than 200ms elapsed since last keystroke, clear previous buffer
      if (now - lastKeyTime > 200) {
        buffer = "";
      }
      lastKeyTime = now;

      if (e.key === "Enter") {
        // Crucial: Prevent Enter from activating any focused link or submitting random forms!
        e.preventDefault();
        e.stopPropagation();

        const candidate = buffer.trim();
        buffer = "";
        if (candidate.length >= 3) {
          processTicketCode(candidate);
        }
        return;
      }

      // Collect printable characters from scanner
      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [processTicketCode]);

  // Check in an individual ticket within an order view
  const handleCheckInSingleInOrder = async (ticketCode: string) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/staff/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_code: ticketCode,
          staff_id: "staff-gate-1",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        playScanSound("success");
        triggerVibration([80, 40, 120]);
        setScanResult((prev) => {
          if (!prev.orderData) return prev;
          const updatedTickets = prev.orderData.tickets.map((t) =>
            t.code === ticketCode
              ? {
                  ...t,
                  status: "checked_in" as const,
                  checked_in_at: new Date().toISOString(),
                }
              : t
          );
          const remainingIssued = updatedTickets.filter((t) => t.status === "issued").length;
          return {
            ...prev,
            orderData: {
              ...prev.orderData,
              tickets: updatedTickets,
              issued_count: remainingIssued,
              checked_in_count: updatedTickets.length - remainingIssued,
            },
          };
        });
      } else {
        playScanSound("error");
        alert(data.message || "ไม่สามารถเช็กอินใบนี้ได้");
      }
    } catch {
      playScanSound("error");
    } finally {
      setProcessing(false);
    }
  };

  // Check in all remaining tickets for an order in 1 tap
  const handleCheckInAllInOrder = async () => {
    if (!scanResult.orderData?.id) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/staff/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_in_all",
          order_id: scanResult.orderData.id,
          staff_id: "staff-gate-1",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        playScanSound("success");
        triggerVibration([80, 40, 120]);
        setScanResult((prev) => {
          if (!prev.orderData) return prev;
          const updatedTickets = prev.orderData.tickets.map((t) => ({
            ...t,
            status: "checked_in" as const,
            checked_in_at: new Date().toISOString(),
          }));
          return {
            ...prev,
            orderData: {
              ...prev.orderData,
              tickets: updatedTickets,
              issued_count: 0,
              checked_in_count: updatedTickets.length,
            },
          };
        });
      } else {
        playScanSound("error");
        alert(data.message || "เกิดข้อผิดพลาดในการเช็กอินทั้งหมด");
      }
    } catch {
      playScanSound("error");
    } finally {
      setProcessing(false);
    }
  };

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
        {/* Title & Navigation links */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-status-success" />
            <h1 className="text-lg font-bold text-content">สแกนบัตรเข้างาน</h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/staff/walk-up"
              tabIndex={-1}
              className="px-3 py-1.5 rounded-lg border border-brand/30 bg-brand/5 text-brand hover:bg-brand hover:text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span>ขายบัตร POS</span>
            </Link>

            <Link
              href="/staff/search"
              tabIndex={-1}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface text-content hover:text-brand text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Search className="w-3.5 h-3.5" />
              <span>ค้นหาด้วยมือ</span>
            </Link>
          </div>
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
              <span className="text-xs text-white/60">หากมีหน้าต่างขอสิทธิ์กล้อง โปรดกด &apos;อนุญาต&apos; (Allow)</span>
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
            <span>กำลังตรวจสอบรหัสบัตร / ออเดอร์...</span>
          </div>
        )}

        {/* MULTI-TICKET ORDER CHECK-IN SCREEN */}
        {scanResult.status === "order_tickets_view" && scanResult.orderData && (
          <div className="p-5 rounded-2xl bg-surface border-2 border-brand/30 shadow-lg flex flex-col gap-3.5 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-brand font-bold text-sm">
                  <Ticket className="w-4 h-4" />
                  <span>คำสั่งซื้อ {scanResult.orderData.code}</span>
                </div>
                <span className="font-semibold text-content text-base mt-0.5">
                  {scanResult.orderData.buyer_name}
                </span>
                {scanResult.orderData.phone && scanResult.orderData.phone !== "-" && (
                  <span className="text-xs text-content-muted">
                    เบอร์: {scanResult.orderData.phone}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-end gap-1 text-[11px] font-semibold">
                <span className="px-2 py-0.5 rounded-full bg-status-success-subtle text-status-success">
                  เข้างานแล้ว {scanResult.orderData.checked_in_count} / {scanResult.orderData.tickets.length}
                </span>
                {scanResult.orderData.issued_count > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    รอเข้างาน {scanResult.orderData.issued_count} ใบ
                  </span>
                )}
              </div>
            </div>

            {/* List of tickets */}
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {scanResult.orderData.tickets.map((t, idx) => (
                <div
                  key={t.id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    t.status === "checked_in"
                      ? "bg-status-success-subtle/50 border-status-success/30 text-content"
                      : "bg-surface border-border text-content"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">
                      ใบที่ {idx + 1}: {t.holder_name}
                    </span>
                    <span className="font-mono text-[10px] text-content-muted">
                      รหัส: {t.code.slice(0, 10)}...
                    </span>
                  </div>

                  <div>
                    {t.status === "checked_in" ? (
                      <span className="inline-flex items-center gap-1 text-status-success font-semibold text-xs px-2.5 py-1 rounded-lg bg-status-success/10">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>เข้างานแล้ว</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() => handleCheckInSingleInOrder(t.code)}
                        className="px-3 py-1.5 rounded-lg bg-status-success hover:bg-status-success/90 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                      >
                        เช็กอินใบนี้
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              {scanResult.orderData.issued_count > 0 && (
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleCheckInAllInOrder}
                  className="w-full h-11 rounded-xl bg-status-success hover:bg-status-success/90 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    เช็กอินทั้งหมดที่เหลือ ({scanResult.orderData.issued_count} ใบ)
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={resetScanner}
                className="w-full h-10 rounded-xl bg-surface-subtle hover:bg-surface border border-border text-content font-semibold text-xs transition-colors"
              >
                {scanResult.orderData.issued_count === 0
                  ? "เสร็จสิ้น / พร้อมสแกนใบถัดไป"
                  : "ปิดหน้านี้ / สแกนใบถัดไป"}
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS CHECK-IN (SINGLE TICKET) */}
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

        {/* ALREADY CHECKED IN (RED/AMBER BANNER) */}
        {scanResult.status === "already_checked_in" && (
          <div className="p-5 rounded-2xl bg-status-danger text-white shadow-md flex flex-col items-center text-center gap-2 animate-in zoom-in-95">
            <AlertTriangle className="w-12 h-12" />
            <h2 className="text-xl font-extrabold">
              {scanResult.errorMessage || "บัตรนี้เข้างานแล้ว!"}
            </h2>
            <p className="text-xs text-white/90">
              ไม่อนุญาตให้ใช้บัตรซ้ำ (งานนี้ไม่มีระบบ check-out หรือเข้าซ้ำ)
            </p>
            {scanResult.holderName && (
              <div className="text-xs bg-white/10 rounded-xl p-2.5 w-full flex flex-col gap-0.5 text-left mt-1">
                <span>ผู้ถือบัตร: <strong>{scanResult.holderName}</strong></span>
                {scanResult.orderCode && <span>รหัสออเดอร์: {scanResult.orderCode}</span>}
              </div>
            )}
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
                href={`/staff/search?q=${encodeURIComponent(scanResult.code)}`}
                tabIndex={-1}
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
            หรือกรอกรหัสบัตร / รหัสออเดอร์ (เช่น LRP-XXXXXX)
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="วางหรือพิมพ์รหัสบัตร / ออเดอร์..."
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
