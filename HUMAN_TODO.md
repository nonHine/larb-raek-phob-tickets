# HUMAN_TODO.md — Checklist for Project Owner (ผู้จัดงาน)

เอกสารนี้ระบุสิ่งที่เจ้าของโครงการ (Owner) ต้องดำเนินการด้วยตนเองตามลำดับ เนื่องจากระบบอัตโนมัติไม่สามารถสร้างบัญชีภายนอกหรือกำหนดข้อมูลทางธุรกิจแทนคุณได้

---

## 1. ข้อมูลทางธุรกิจและงานอีเวนต์ (Business Information)
นำข้อมูลจริงไปใส่ใน `config/event.config.ts`:
- [ ] **วันและเวลาจัดงานจริง (`startsAt`)**: เช่น `"12 พ.ย. 2026 เวลา 18:00 น."`
- [ ] **เวลาเปิดประตูเข้างาน (`doorsOpenAt`)**: เช่น `"17:00 น."`
- [ ] **ข้อมูลบัญชีธนาคารรับโอนเงิน (`banks`)**:
  - ชื่อธนาคาร
  - ชื่อบัญชี
  - เลขที่บัญชี
- [ ] **PromptPay ID**: เบอร์โทรศัพท์ หรือเลขบัตรประชาชน หรือ e-Wallet ID บัญชีร้านค้า (ใส่ใน `.env.local` / Vercel Environment Variables)
- [ ] **ภาพโลโก้และแบนเนอร์**: วางไฟล์ที่ `public/logo.svg` หรือรูปภาพโปรโมทงาน
- [ ] **ช่องทางติดต่อและนโยบายความเป็นส่วนตัว (`/privacy`)**: กำหนดเบอร์โทร/LINE ผู้จัด และระยะเวลาเก็บข้อมูล (เช่น ลบข้อมูลหลังงานจบ 30 วัน)

---

## 2. การสร้างและตั้งค่า Supabase (Database, Auth, Storage)
- [ ] **สร้าง Supabase Project**:
  1. ไปที่ [https://supabase.com](https://supabase.com) แล้วสร้างโปรเจกต์ใหม่
  2. ไปที่ **Settings -> API** คัดลอก:
     - `Project URL` -> ใส่ใน `NEXT_PUBLIC_SUPABASE_URL`
     - `anon public` key -> ใส่ใน `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role secret` key -> ใส่ใน `SUPABASE_SERVICE_ROLE_KEY` (ระวัง: ห้ามเผยแพร่)
- [ ] **รัน Database Migration**:
  - นำไฟล์ SQL จาก `supabase/migrations/20261002000000_initial_schema.sql` ไป Execute ใน **SQL Editor** บน Supabase Dashboard
- [ ] **สร้าง Storage Bucket สำหรับสลิปโอนเงิน**:
  1. ไปที่เมนู **Storage** -> คลิก **New Bucket**
  2. ตั้งชื่อว่า `slips`
  3. **สำคัญมาก:** ติ๊กเลือกเป็น **Private bucket** (ห้ามเปิด Public เพื่อความปลอดภัยของข้อมูลบัญชีผู้โอน)
- [ ] **สร้างบัญชีผู้ใช้สตาฟคนแรก (First Admin User)**:
  1. ไปที่ **Authentication -> Users** -> คลิก **Add user**
  2. กรอก Email และ Password ของสตาฟแอดมิน
  3. คัดลอก `User UID` ที่สร้างได้
  4. ไปที่ **SQL Editor** แล้วรันคำสั่งเพิ่มสิทธิ์:
     ```sql
     insert into staff_profiles (user_id, role)
     values ('<USER_UID_HERE>', 'admin');
     ```
     *(สำหรับผู้สแกนบัตรที่หน้างาน สามารถสร้าง user และกำหนด role เป็น `'scanner'`)*

---

## 3. บริการส่งอีเมล (Email Provider)
- [ ] หากใช้ **Resend** (ค่าเริ่มต้นที่แนะนำ):
  1. สมัครบัญชีที่ [https://resend.com](https://resend.com)
  2. สร้าง API Key และนำมาใส่ใน `RESEND_API_KEY`
  3. ตั้งค่า Domain Sender ใส่ใน `EMAIL_FROM` (เช่น `tickets@yourdomain.com` หรือ `onboarding@resend.dev` สำหรับช่วงทดสอบ)
- [ ] หากต้องการใช้ **SMTP**:
  - ตั้งค่า `EMAIL_PROVIDER=smtp` และระบุ `SMTP_URL=smtp://user:pass@smtp.example.com:585`

---

## 4. Deploy ขึ้น Vercel (Production Launch)
- [ ] เชื่อมต่อ Git Repository กับ [Vercel](https://vercel.com)
- [ ] ตั้งค่า Environment Variables ให้ครบถ้วนตาม `.env.example`
- [ ] กด Deploy และทดสอบการสั่งซื้อรอบจริงบนมือถือ 1 รายการ
