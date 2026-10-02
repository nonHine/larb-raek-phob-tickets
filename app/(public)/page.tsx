"use client";

import { useState } from "react";
import Link from "next/link";
import { EVENT } from "@/config/event.config";
import { Navbar } from "@/components/Navbar";
import { VenueBanner } from "@/components/VenueBanner";
import {
  Ticket,
  QrCode,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  Music,
  MapPin,
  Calendar,
} from "lucide-react";

export default function LandingPage() {
  const [isFull, setIsFull] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="p-4 sm:p-6 flex flex-col gap-6 flex-1">
        {/* Venue status banner */}
        <VenueBanner onStatusChange={setIsFull} />

        {/* Hero Section */}
        <div className="bg-gradient-to-b from-brand-light/60 to-surface border border-border rounded-2xl p-5 sm:p-6 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-3">
            <Music className="w-3.5 h-3.5" />
            <span>คอนเสิร์ตดนตรีสด</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-content tracking-tight mb-2">
            {EVENT.name}
          </h1>

          <p className="text-sm text-content-muted max-w-sm mb-4">
            {EVENT.branding.slogan}
          </p>

          <div className="flex flex-col gap-2 w-full max-w-xs text-xs sm:text-sm text-content-muted bg-surface/80 border border-border/80 rounded-xl p-3 mb-5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand flex-shrink-0" />
              <span className="text-left font-medium text-content">
                {EVENT.venue}
              </span>
            </div>
            {EVENT.startsAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand flex-shrink-0" />
                <span className="text-left">{EVENT.startsAt}</span>
              </div>
            )}
            {EVENT.doorsOpenAt && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand flex-shrink-0" />
                <span className="text-left">ประตูเปิด {EVENT.doorsOpenAt}</span>
              </div>
            )}
          </div>

          {/* Pricing Highlight */}
          <div className="flex items-baseline gap-1.5 mb-5">
            <span className="text-4xl font-extrabold text-brand">
              {EVENT.ticketPriceThb}
            </span>
            <span className="text-base font-semibold text-content-muted">
              บาท / ใบ
            </span>
          </div>

          {/* Main CTA */}
          {isFull ? (
            <button
              disabled
              className="w-full max-w-xs h-12 rounded-xl bg-border text-content-muted font-semibold text-base flex items-center justify-center cursor-not-allowed shadow-none"
            >
              ร้านเต็มชั่วคราว
            </button>
          ) : (
            <Link
              href="/buy"
              className="w-full max-w-xs h-12 rounded-xl bg-brand hover:bg-brand-pressed text-white font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <Ticket className="w-5 h-5" />
              <span>ซื้อบัตรเข้างาน</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* 3-Step Guide */}
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-content">
            ขั้นตอนการซื้อและรับบัตร
          </h2>

          <div className="grid grid-cols-1 gap-2.5">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border bg-surface">
              <div className="w-8 h-8 rounded-lg bg-brand-light text-brand flex items-center justify-center font-bold text-sm flex-shrink-0">
                1
              </div>
              <div className="flex flex-col text-sm">
                <span className="font-medium text-content">เลือกจำนวนบัตร</span>
                <span className="text-xs text-content-muted mt-0.5">
                  ระบุจำนวนบัตรและข้อมูลติดต่อ จากนั้นยืนยันคำสั่งซื้อ
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border bg-surface">
              <div className="w-8 h-8 rounded-lg bg-brand-light text-brand flex items-center justify-center font-bold text-sm flex-shrink-0">
                2
              </div>
              <div className="flex flex-col text-sm">
                <span className="font-medium text-content">
                  โอนเงินและแนบสลิป
                </span>
                <span className="text-xs text-content-muted mt-0.5">
                  สแกน PromptPay QR ตามยอดจริง หรือโอนเข้าบัญชี แล้วแนบภาพสลิป
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border bg-surface">
              <div className="w-8 h-8 rounded-lg bg-brand-light text-brand flex items-center justify-center font-bold text-sm flex-shrink-0">
                3
              </div>
              <div className="flex flex-col text-sm">
                <span className="font-medium text-content">
                  รับ QR Code เข้างาน
                </span>
                <span className="text-xs text-content-muted mt-0.5">
                  สตาฟตรวจสลิปเสร็จ รับ QR 1 ภาพต่อบัตร 1 ใบ นำไปสแกนรับ wristband หน้างาน
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-border flex items-start gap-3 text-xs text-content-muted">
          <ShieldCheck className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-content">
              ข้อควรทราบเกี่ยวกับการชำระเงิน
            </span>
            <span>
              QR PromptPay เป็นยอดเงินสำหรับโอน ไม่ใช่การยืนยันการรับเงินอัตโนมัติ โดยสตาฟจะเป็นผู้ตรวจสอบสลิปและออกบัตร QR ให้ผ่านหน้าสถานะออเดอร์
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-4 border-t border-border text-center text-xs text-content-muted flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:underline">
            นโยบายความเป็นส่วนตัว (PDPA)
          </Link>
          <span>•</span>
          <Link href="/orders/lookup" className="hover:underline">
            ค้นหาออเดอร์ของฉัน
          </Link>
          <span>•</span>
          <Link href="/admin/login" className="hover:underline text-content-muted/60">
            สำหรับสตาฟ
          </Link>
        </div>
        <span>© {EVENT.name} • จัดที่ {EVENT.venue}</span>
      </footer>
    </div>
  );
}
