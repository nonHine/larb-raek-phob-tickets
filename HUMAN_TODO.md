# HUMAN_TODO.md — Checklist for Project Owner (ผู้จัดงาน)

เอกสารนี้ระบุสิ่งที่เจ้าของโครงการ (Owner) ต้องดำเนินการด้วยตนเองตามลำดับ เนื่องจากระบบอัตโนมัติไม่สามารถสร้างบัญชีภายนอกหรือกำหนดข้อมูลทางธุรกิจแทนคุณได้

---

## 1. ข้อมูลทางธุรกิจและงานอีเวนต์ (Business Information)
นำข้อมูลจริงไปใส่ใน `config/event.config.ts`:
- [x] **วันและเวลาจัดงานจริง (`startsAt`)**: `"9 พ.ย. 2026 เวลา 16:00 น."` (ตรวจสอบแล้ว ถูกต้อง)
- [x] **เวลาเปิดประตูเข้างาน (`doorsOpenAt`)**: `"16:00 น."` (ตรวจสอบแล้ว ถูกต้อง และแสดงบนหน้าเว็บแล้ว)
- [x] **ข้อมูลบัญชีธนาคารรับโอนเงิน (`banks`)**:
  - ธนาคารกสิกรไทย
  - นายรามณรงค์ชัย จันต๊ะภา
  - 2218954758 (ตรวจสอบแล้ว ถูกต้อง)
- [x] **PromptPay ID**: `1839901992657` (ตรวจสอบแล้ว สร้าง PromptPay EMVCo QR Code ได้ยอดตรงตามจำนวนถูกต้อง 100%)
- [x] **ภาพโลโก้และแบนเนอร์**: ระบบสร้าง `public/logo.svg` สำหรับเป็นโลโก้เริ่มต้นให้แล้ว (สามารถเปลี่ยนไฟล์เป็นภาพโลโก้จริงของร้านได้ตลอดเวลา)
- [ ] **ช่องทางติดต่อและนโยบายความเป็นส่วนตัว (`/privacy`)**: สามารถระบุเบอร์โทรศัพท์ หรือ LINE ID ของผู้จัดงานเพิ่มเติมได้ที่ `app/(public)/privacy/page.tsx`

---

## 2. การสร้างและตั้งค่า Supabase (Database, Auth, Storage)
- [x] **สร้าง Supabase Project**:
  - URL: `https://oazrxocsjcbekblkoqen.supabase.co` (ตรวจสอบการเชื่อมต่อแล้ว ผ่าน 100%)
  - API Keys บันทึกใน `.env.local` เรียบร้อย
- [x] **รัน Database Migration**:
  - ตรวจสอบตารางใน Supabase จริงแล้ว: ตาราง `orders`, `payments`, `tickets`, `venue_status`, `staff_profiles` มีโครงสร้างถูกต้องสมบูรณ์
- [x] **สร้าง Storage Bucket สำหรับสลิปโอนเงิน**:
  - ตรวจสอบแล้ว: พบ Private Bucket ชื่อ `Slips` พร้อมใช้งาน
- [x] **สร้างบัญชีผู้ใช้สตาฟคนแรก (First Admin User)**:
  - ตรวจสอบแล้ว: มีผู้ใช้งานสตาฟคนแรกพร้อมสิทธิ์ `role: 'admin'` ในตาราง `staff_profiles` เรียบร้อย

---

## 3. บริการส่งอีเมล (Email Provider)
- [x] **ตั้งค่า Resend API Key**:
  - ตรวจสอบแล้ว: `RESEND_API_KEY` ใน `.env.local` เป็นคีย์ที่ถูกต้องและมีสิทธิ์ส่งอีเมล (Sending-only API Key)
- [ ] **การยืนยันโดเมนผู้ส่ง (Domain Verification)**:
  - ขณะนี้ตั้งค่า `EMAIL_FROM=tickets@larbkoi.com`
  - *ข้อสังเกต:* หากโดเมน `larbkoi.com` ยังไม่ได้ Verify DNS ใน Resend ในระหว่างทดสอบให้เปลี่ยนเป็น `onboarding@resend.dev` ชั่วคราว หรือเข้าไปกด Verify Domain ใน Resend Dashboard ให้เสร็จสิ้น

---

## 4. Deploy ขึ้น Vercel (Production Launch)
- [x] เชื่อมต่อ Git Repository กับ [Vercel](https://vercel.com) (nonHine/larb-raek-phob-tickets)
- [x] นำค่า Environment Variables จาก `.env.local` ไปใส่ใน Vercel Dashboard ครบทั้ง 9 ตัวแปร:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `PROMPTPAY_ID`
  - `NEXT_PUBLIC_PROMPTPAY_ID`
  - `EMAIL_PROVIDER=resend`
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - `APP_BASE_URL` (`https://larb-raek-phob-tickets.vercel.app`)
- [ ] กด Deploy และทดสอบการสั่งซื้อรอบจริงบนมือถือ 1 รายการ

