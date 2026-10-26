# DESIGN.md — Laab Neon Nightlife Design System

Design System Specification for **"งานลาบแรกพบ — ระบบจำหน่ายบัตรและเช็คอินคอนเสิร์ต"**
Following the **Google Stitch** & **VoltAgent** DESIGN.md Standard (Gallery Style: Custom Indie Nightlife & Modern Tech Deck).

---

## 1. Brand Identity & Theme Vision
- **Theme Name:** Laab Neon Nightlife (`laab-neon`)
- **Brand Vibe:** บรรยากาศร้านลาบก้อยซอยนานา ยามค่ำคืน (Warm neon street signs, dark wooden aesthetic, live indie music, friendly gathering) ผสมผสานกับความเฉียบคมของ Modern Web Application (Linear/Spotify-inspired dark surfaces, hairline borders, high contrast data display).
- **Core Principle:** "เข้าใจง่าย สวยงาม มีเอกลักษณ์ และใช้งานได้จริงบนมือถือ"

---

## 2. Color Palette & Design Tokens

### Primary & Brand Colors
- **Brand Red Primary:** `#8F1D2D` (สีแดงเลือดหมูเข้ม — สีอัตลักษณ์ร้านและปุ่ม CTA สำคัญ)
- **Brand Red Hover/Active:** `#741725`
- **Brand Red Glow:** `rgba(143, 29, 45, 0.4)`
- **Neon Gold / Amber Accent:** `#F59E0B` (สีเหลืองนีออนอบอุ่น — สีป้ายไฟ "ลาบแรกพบ", ดาวคะแนนรีวิว, ป้ายเด่น)
- **Neon Amber Glow:** `rgba(245, 158, 11, 0.25)`

### Surface & Canvas (Dark Mode Nightlife)
- **Canvas Base (พื้นหลังสไลด์/เว็บ):** `#0D0E12` (Deep Charcoal Black)
- **Surface Level 1 (Card Container):** `#161922` (Dark Slate Card)
- **Surface Level 2 (Sub-card / Input / Pill):** `#202532`
- **Surface Hover:** `#2A3042`

### Borders & Dividers
- **Hairline Border:** `#2D3345` (1px subtle border)
- **Active / Accent Border:** `rgba(245, 158, 11, 0.4)` หรือ `rgba(143, 29, 45, 0.5)`

### Typography Colors
- **Text Heading / Display:** `#F9FAFB` (Pure High Contrast White 98%)
- **Text Body / Content:** `#D1D5DB` (Slate Gray 85%)
- **Text Muted / Subtitle:** `#9CA3AF` (Muted Gray 60%)
- **Text Highlight (Neon):** `#FBBF24` (Amber Gold)

### Semantic & Status Colors
- **Success (เช็คอินสำเร็จ / ชำระครบ):** `#10B981` (Emerald Green) / Surface: `rgba(16, 185, 129, 0.12)`
- **Warning (รอตรวจสลิป / ใกล้เต็ม):** `#F59E0B` (Amber) / Surface: `rgba(245, 158, 11, 0.12)`
- **Danger (สลิปซ้ำ / บัตรใช้แล้ว / ร้านเต็ม):** `#EF4444` (Coral Red) / Surface: `rgba(239, 68, 68, 0.12)`

---

## 3. Typography Scale

- **Font Family:** `'Noto Sans Thai', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Monospace (Code / Ticket ID / Hash):** `'JetBrains Mono', 'Fira Code', monospace`
- **Hierarchy Scale:**
  - `Hero Display`: 32px – 40px (Bold 700 / Extra Bold 800)
  - `Slide Heading (H1)`: 24px – 28px (Bold 700)
  - `Section Title (H2)`: 18px – 20px (Semi-bold 600)
  - `Body Regular`: 15px – 16px (Regular 400, Line-height 1.6)
  - `Body Small / Badge`: 12px – 13px (Medium 500)

---

## 4. Spacing, Elevation & Shapes

- **Radius Scale:**
  - Badges & Pills: `9999px` (Full rounded capsule)
  - Buttons & Inputs: `12px` (`rounded-xl`)
  - Cards & Presentation Panels: `16px` (`rounded-2xl`)
  - Feature Showcase Wrappers: `20px` (`rounded-3xl`)
- **Shadow & Glow Effects:**
  - Card Shadow: `0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)`
  - Neon Accent Glow: `0 0 20px rgba(245, 158, 11, 0.2)`
  - Brand Glow: `0 0 25px rgba(143, 29, 45, 0.35)`

---

## 5. UI Component Specifications for Presentation Slides

1. **Slide Header:**
   - Pill Badge บ่งบอกหมวดหมู่ (เช่น `[SYSTEM ARCHITECTURE]`, `[BUYER FLOW]`, `[STAFF DASHBOARD]`)
   - หัวข้อสไลด์ตัวใหญ่ คมชัด มีตัวอักษรเน้นสีเหลืองทองนีออน
2. **Feature Cards (กล่องฟีเจอร์):**
   - การ์ดแบบ Bento Grid หรือ 2-Column Split
   - ฝั่งซ้าย: คำอธิบายภาษาพูด เข้าใจง่าย สเต็ป 1-2-3
   - ฝั่งขวา: Mockup หน้าจอเว็บ หรือ แผนภาพ Data Flow
3. **Interactive / Demo Pills:**
   - แสดงตัวอย่างการกด เช่น ปุ่มสถานะ `สแกน QR Code สำเร็จ`, `ร้านเต็มชั่วคราว (Killswitch)`
4. **Data Metric Counters:**
   - การ์ดแสดงผลลัพธ์ (51 ใบ, 96.1% เช็คอิน, 74,773 เอนเกจเมนต์) แบบตัวเลขใหญ่ มี Icon ชัดเจน

---

## 6. Slide-by-Slide Visual Blueprint
- **Slide 1:** Cover (Dark wood + Neon Logo "ลาบแรกพบ" + Subtitle ระบบจำหน่ายบัตรและเช็คอิน)
- **Slide 2:** Why we built it? (ปัญหาซื้อตั๋วแบบเดิม vs ทำไมต้องมีเว็บ)
- **Slide 3:** Tech Stack & Architecture (Next.js 14, Supabase, Tailwind, PromptPay)
- **Slide 4:** Feature 1 — สั่งซื้อบัตรแบบ 3 ขั้นตอน (Mobile Stepper & PromptPay QR อัตโนมัติ)
- **Slide 5:** Feature 2 — หน้าชำระเงินและระบบแนบสลิป (Auto-expire, Multi-slip upload)
- **Slide 6:** Feature 3 — ระบบหลังบ้านตรวจสลิป (/admin) (เสียงเตือน, ตรวจจับสลิปซ้ำด้วย SHA-256)
- **Slide 7:** Feature 4 — ระบบสแกน QR Code หน้างาน (/staff/scan) (Atomic Check-in แจก Wristband)
- **Slide 8:** Feature 5 — ระบบคุมคนล้นร้าน ("ร้านเต็มชั่วคราว" Killswitch ใน 1 คลิก)
- **Slide 9:** Results & Real-World Impact (ตัวเลขสถิติจากงานจริง ครั้งที่ 1 และ 2)
- **Slide 10:** Summary & Key Takeaways (สิ่งที่ได้เรียนรู้และการนำเทคโนโลยีมาแก้ปัญหาชุมชน)
