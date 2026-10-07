import Image from "next/image";
import { EVENT } from "@/config/event.config";
import { MapPin, Calendar, CheckCircle2 } from "lucide-react";

export default function EventClosedPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface-subtle items-center justify-center p-4 sm:p-6 text-center">
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col items-center">
        {/* Logo */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-border/80 shadow-inner mb-5">
          <Image
            src={EVENT.branding.logoPath}
            alt={EVENT.name}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold mb-4">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>กิจกรรมเสร็จสิ้นสมบูรณ์แล้ว</span>
        </div>

        {/* Main Title & Notice */}
        <h1 className="text-xl sm:text-2xl font-bold text-content tracking-tight mb-2">
          ระบบปิดให้บริการแล้ว
        </h1>
        <p className="text-base sm:text-lg font-semibold text-brand mb-3">
          งานลาบแรกพบ ครั้งที่ 2 สิ้นสุดลงเรียบร้อยแล้ว
        </p>

        <p className="text-sm text-content-muted leading-relaxed mb-6 max-w-xs">
          ขอขอบคุณทุกท่านที่มาร่วมสนุก สร้างสีสัน และร่วมเป็นส่วนหนึ่งของค่ำคืนสุดพิเศษนี้
        </p>

        {/* Event info card */}
        <div className="w-full bg-surface-subtle/80 border border-border/70 rounded-2xl p-4 flex flex-col gap-2.5 text-xs sm:text-sm text-content-muted text-left mb-6">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
            <span className="font-medium text-content leading-snug">
              {EVENT.venue}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-brand flex-shrink-0" />
            <span>{EVENT.startsAt}</span>
          </div>
        </div>

        <div className="text-xs text-content-muted/80">
          แล้วพบกันใหม่ในกิจกรรมโอกาสถัดไป
        </div>
      </div>

      <footer className="mt-8 text-xs text-content-muted/60 text-center">
        © {EVENT.name} • จัดที่ {EVENT.venue}
      </footer>
    </div>
  );
}
