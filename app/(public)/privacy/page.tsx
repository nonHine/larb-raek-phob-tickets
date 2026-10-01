import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { EVENT } from "@/config/event.config";
import { Shield, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="p-4 sm:p-6 flex flex-col gap-5 flex-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าหลัก</span>
        </Link>

        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand" />
          <h1 className="text-xl font-bold text-content">
            นโยบายความเป็นส่วนตัว (PDPA)
          </h1>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col gap-4 text-xs sm:text-sm text-content leading-relaxed">
          <section className="flex flex-col gap-1.5">
            <h2 className="font-bold text-sm text-content">
              1. ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม
            </h2>
            <p className="text-content-muted">
              สำหรับการสั่งซื้อบัตรเข้างาน &quot;{EVENT.name}&quot; ทางผู้จัดงานจะเก็บรวบรวมข้อมูลที่จำเป็นดังต่อไปนี้:
            </p>
            <ul className="list-disc list-inside text-content-muted pl-1 space-y-1">
              <li>ชื่อและนามสกุลของผู้ซื้อหรือผู้ถือบัตร</li>
              <li>หมายเลขโทรศัพท์ 10 หลัก</li>
              <li>ที่อยู่อีเมลสำหรับจัดส่งหลักฐานคำสั่งซื้อและบัตร QR Code</li>
              <li>ช่องทางติดต่อสำรอง (เช่น LINE ID, Facebook, Instagram) ในกรณีที่ระบุ</li>
              <li>ภาพหลักฐานการโอนเงิน (สลิปโอนเงิน) รวมถึงเวลาโอน ยอดเงิน และธนาคาร</li>
            </ul>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-bold text-sm text-content">
              2. วัตถุประสงค์ในการประมวลผลข้อมูล
            </h2>
            <ul className="list-disc list-inside text-content-muted pl-1 space-y-1">
              <li>ตรวจสอบความถูกต้องของการชำระเงินและสลิปโอนเงิน</li>
              <li>ออกบัตรเข้างานในรูปแบบรหัส QR Code เฉพาะบุคคล</li>
              <li>ยืนยันตัวตนของผู้เข้าร่วมงาน ณ จุดตรวจบัตรหน้างานเพื่อมอบสายรัดข้อมือ (wristband)</li>
              <li>ติดต่อประสานงานในกรณีที่เกิดปัญหาเกี่ยวกับการสั่งซื้อหรือการจัดงาน</li>
            </ul>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-bold text-sm text-content">
              3. การจัดเก็บรักษาและความปลอดภัย
            </h2>
            <p className="text-content-muted">
              ไฟล์ภาพสลิปการโอนเงินจะถูกจัดเก็บไว้ในพื้นที่จัดเก็บข้อมูลส่วนตัว (Private Storage) ที่ได้รับการปกป้อง และเปิดดูได้เฉพาะทีมงานสตาฟที่ได้รับอนุญาตผ่านระบบรักษาความปลอดภัย โดยไม่มีการนำข้อมูลส่วนบุคคลของท่านไปจำหน่ายหรือเผยแพร่แก่บุคคลภายนอก
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-bold text-sm text-content">
              4. ระยะเวลาการเก็บรักษาข้อมูล
            </h2>
            <p className="text-content-muted">
              ข้อมูลส่วนบุคคลและสลิปจะถูกเก็บรักษาไว้จนกระทั่งงานอีเวนต์เสร็จสิ้น และจะถูกลบทำลายอย่างปลอดภัยภายใน 30 วันหลังจากวันจัดงาน
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-bold text-sm text-content">
              5. ช่องทางการติดต่อผู้จัดงาน
            </h2>
            <p className="text-content-muted">
              หากท่านมีข้อสงสัยหรือต้องการสอบถามข้อมูลเพิ่มเติมเกี่ยวกับนโยบายความเป็นส่วนตัว สามารถติดต่อทีมงาน {EVENT.name} ได้ที่ {EVENT.venue}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
