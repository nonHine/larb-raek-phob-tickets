"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

interface VenueBannerProps {
  initialIsFull?: boolean;
  onStatusChange?: (isFull: boolean) => void;
}

export function VenueBanner({ initialIsFull = false, onStatusChange }: VenueBannerProps) {
  const [isFull, setIsFull] = useState(initialIsFull);

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const res = await fetch("/api/venue-status", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setIsFull(data.is_full);
            if (onStatusChange) {
              onStatusChange(data.is_full);
            }
          }
        }
      } catch {
        // Silently keep last status on network error
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Poll every 10s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [onStatusChange]);

  if (!isFull) return null;

  return (
    <div
      role="alert"
      className="w-full bg-status-warning-subtle border-y sm:border sm:rounded-xl border-status-warning/30 p-3 sm:p-4 flex items-start gap-2.5 text-status-warning"
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex flex-col text-sm">
        <span className="font-semibold">ร้านเต็มชั่วคราว</span>
        <span className="text-xs sm:text-sm text-status-warning/90 mt-0.5">
          กรุณารอสักครู่ หรือสอบถามสตาฟหน้างาน (ระบบปิดรับออเดอร์ใหม่ชั่วคราว)
        </span>
      </div>
    </div>
  );
}
