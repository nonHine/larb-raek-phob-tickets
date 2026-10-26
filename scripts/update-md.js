const fs = require('fs');
const path = require('path');

// 1. UPDATE PRESENTATION_SLIDES.md
let mdContent = fs.readFileSync('PRESENTATION_SLIDES.md', 'utf8');

// The 14 Grill-Me Questions and Answers
const grillMeItems = [
  {
    slideNum: 1,
    title: "สไลด์ที่ 01: หน้าปกโปรเจกต์ & บริบทงาน",
    q: "ทำไมต้องเขียนเว็บไซต์ระบบตั๋วขึ้นมาเอง? ทำไมไม่ใช้ Google Form + LINE OA หรือแพลตฟอร์มสำเร็จรูปอย่าง Eventpop / Ticketmelon?",
    a: "Google Form มีจุดตาย 3 อย่าง: (1) ผู้ซื้อต้องพิมพ์ยอดเงินเองและแนบสลิปที่แอดมินต้องคอยไล่ตรวจใน Drive เสี่ยง Human Error และตอบแชทไม่ทันตอนเปิดขาย (2) แพลตฟอร์มสำเร็จรูปหักหัวคิว 5-10% ต่อตั๋ว สำหรับตั๋วราคา 49 บาท รายได้จะถูกหักไปมาก และเงินไม่ได้เข้าบัญชีผู้จัดทันที (3) แพลตฟอร์มภายนอกไม่มี Dynamic Amount Locking, Realtime Atomic Check-in และ Emergency Killswitch ที่ปรับแต่งให้เข้ากับความจุของร้านอาหารจริงได้ การสร้างเองทำให้เงินเข้าบัญชีผู้จัดงานตรง 100% ควบคุมความปลอดภัยหน้างานได้เบ็ดเสร็จ"
  },
  {
    slideNum: 2,
    title: "สไลด์ที่ 02: Core Tech Stack",
    q: "ทำไมถึงเลือก Next.js 14 App Router + Tailwind CSS แทนที่จะใช้ SPA แบบ Vite + React ธรรมดา?",
    a: "เพราะระบบนี้ต้องมีทั้ง Frontend (หน้าซื้อตั๋ว, กล้องสแกน) และ Backend (Serverless API Routes, คำนวณ QR, Crypto Token, ส่งอีเมล) ใน Repo เดียวกัน Next.js 14 App Router มี Server Actions และ Route Handlers ช่วยปกป้องคีย์ความลับอย่าง SUPABASE_SERVICE_ROLE_KEY และ SMTP_PASS ไม่ให้หลุดไปที่ฝั่งไคลเอนต์ อีกทั้งแคชหน้าแรกบน Edge CDN โหลดไวใน 40ms บนมือถือ ส่วน Tailwind CSS ช่วยสร้าง Atomic CSS ขนาดเล็กกะทัดรัด คุมโทน Dark Mode Neon Nightlife ตาม DESIGN.md ได้อย่างไร้รอยต่อ"
  },
  {
    slideNum: 3,
    title: "สไลด์ที่ 03: Deployment & Cloud CI/CD",
    q: "เมื่อเปิดขายตั๋วแล้วคนแห่เข้าพร้อมกัน Serverless Functions บน Vercel จะเจอปัญหา Cold Start หรือไม่ และสถาปัตยกรรมคลาวด์แยกสิทธิ์อย่างไร?",
    a: "Vercel Edge CDN เสิร์ฟหน้าเว็บแบบ Static Cache ทันทีโดยไม่มี Cold Start ส่วน Serverless API Routes บน Node.js runtime มี Cold Start เฉลี่ยต่ำกว่า 250ms ซึ่งแทบไม่รู้สึกบนเครือข่ายมือถือ ด้านความปลอดภัย เราแยก Environment Variables ชัดเจน: NEXT_PUBLIC_SUPABASE_ANON_KEY ใช้เฉพาะหน้าบ้านและถูกจำกัดด้วย PostgreSQL Row-Level Security (RLS) ส่วน SUPABASE_SERVICE_ROLE_KEY และ SMTP_PASS ถูกเก็บเป็นความลับบน Serverless Environment เพื่อใช้ทำธุรกรรมที่ต้องใช้สิทธิ์ผู้ดูแล เช่น อนุมัติสลิปและออกตั๋ว"
  },
  {
    slideNum: 4,
    title: "สไลด์ที่ 04: สถาปัตยกรรมการเงินและบัญชีธนาคาร",
    q: "ทำไมราคาตั๋ว 49 บาท ถึงต้องมีทั้งบัญชีกสิกรไทย (KBANK) และพร้อมเพย์? และถ้าลูกค้าโอนเงินผิดยอด (เช่น โอนขาดหรือโอนเกิน) ระบบจัดการอย่างไร?",
    a: "ราคา 49 บาทซื้อง่ายแต่มีเศษ 9 บาท ถ้าซื้อหลายใบ (เช่น 2 ใบ 98฿ หรือ 3 ใบ 147฿) ลูกค้ามักโอนผิด เราจึงใช้ Dynamic PromptPay QR เป็นทางเลือกหลักเพื่อล็อกยอดเงินเป๊ะ แต่ยังคงแสดงบัญชี KBANK xxx-x-xxxxx-x (บัญชีทางการ งานลาบแรกพบ, raw: xxxxxxxxx) พร้อมเลขอ้างอิง 000000000000000 เผื่อแอปธนาคารบางแห่งสแกน QR ขัดข้อง หากลูกค้าโอนผิดยอด ระบบมี Partial Approval Flow ที่สตาฟสามารถอนุมัติตั๋วตามยอดที่ได้รับจริง (เช่น โอนมา 49฿ จากยอด 98฿ อนุมัติตั๋ว 1 ใบ) และส่งอีเมล partial_approval แจ้งยอดคงเหลือที่ต้องชำระเพิ่มเติมทันที"
  },
  {
    slideNum: 5,
    title: "สไลด์ที่ 05: สถาปัตยกรรม Dual QR Code",
    q: "ความแตกต่างทางเทคนิคและมาตรฐานความปลอดภัยระหว่าง Dynamic PromptPay QR กับ Ticket Entrance QR คืออะไร? ทำไมไม่ใช้ไลบรารีเดียวกันสร้าง?",
    a: "ทั้งสองตัวใช้ไลบรารี qrcode แปลงข้อมูลเป็นภาพเหมือนกัน แต่ Payload และมาตรฐานคนละระบบอย่างสิ้นเชิง: (1) PromptPay QR ต้องปฏิบัติตามมาตรฐาน EMVCo ของธนาคารแห่งประเทศไทย (BOT Specification) คำนวณผ่าน promptpay-qr ฝัง Tag ยอดเงินจริงและ ID 081-234-5678 เพื่อให้แอปธนาคารตัดเงินตรงเป๊ะ (2) Ticket QR เป็นรหัส Authorization สุ่มด้วย crypto.randomBytes(16) ของ Node.js ได้รหัสความปลอดภัยสูง 32 Hex Characters ที่ไม่เปิดเผยข้อมูลส่วนบุคคลใดๆ เพื่อให้กล้องหน้างานของสตาฟสแกนแล้วส่งไปทำ Atomic Update สถานะในฐานข้อมูล"
  },
  {
    slideNum: 6,
    title: "สไลด์ที่ 06: ระบบส่งอีเมล Gmail SMTP & Inline CID",
    q: "ทำไมถึงเลือก Gmail SMTP (พอร์ต 465 SSL Direct) ร่วมกับ Inline CID แทนที่จะใช้บริการอีเมลภายนอกอย่าง SendGrid หรือ Resend?",
    a: "งานคอนเสิร์ตสเกลอินดี้มีงบประมาณจำกัด Gmail SMTP ผ่าน App Password 16 หลักไม่มีค่าใช้จ่ายและส่งได้ถึง 500 ฉบับ/วัน ซึ่งเพียงพอต่อขนาดของงาน ส่วนเทคนิค Inline CID (Content-ID) แนบภาพตั๋วจาก QRCode.toBuffer เป็น PNG เข้าไปในก้อนอีเมลโดยตรง (cid:ticket-1-id) เพื่อแก้ปัญหาคลาสสิกที่แอปอีเมล (Gmail, Outlook) บล็อกรูปภาพจาก URL ภายนอก ทำให้ผู้ซื้อเปิดเมลแล้วเห็นภาพตั๋วทันที 100% แม้ออฟไลน์ พร้อมระบบแยกแยะ Error: auth_failed (535), provider_error, quota rate limit"
  },
  {
    slideNum: 7,
    title: "สไลด์ที่ 07: ระบบสั่งซื้อแบบ Stepper & ป้องกันบอท",
    q: "ทำไมต้องแบ่งเป็น 3 ขั้นตอน (Stepper) และป้องกันบอทกว้านซื้อตั๋วอย่างไรโดยไม่ใช้ CAPTCHA ที่น่ารำคาญ?",
    a: "บนจอมือถือ การรวมแบบฟอร์มยาวๆ ทำให้ผู้ใช้กดยกเลิกง่าย Stepper ช่วยแบ่งสมาธิ: ขั้น 1 เลือกจำนวนและคำนวณเงินทันที (ใบละ 49฿), ขั้น 2 ตรวจเบอร์โทร 10 หลักแบบ Realtime, ขั้น 3 สรุปยอดและยืนยัน สำหรับการป้องกันบอท เราใช้เทคนิค Honeypot Field ซ่อนฟิลด์หลอกไว้ด้วย CSS display:none หากบอทเผลอกรอกเข้ามา ระบบจะปฏิเสธคำขอทันที ร่วมกับระบบ In-Memory Rate Limiting และเลขออเดอร์มีอายุเพียง 30 นาที หากไม่โอนจะตัดสิทธิ์คืนตั๋วให้คนอื่นทันที"
  },
  {
    slideNum: 8,
    title: "สไลด์ที่ 08: หน้าชำระเงิน Dynamic QR & Multi-slip",
    q: "ถ้าระบบรองรับ Multi-slip / Split Payment มีโอกาสที่ผู้ซื้อจะส่งสลิปเดิมซ้ำๆ เพื่อรวมยอดให้ครบได้หรือไม่?",
    a: "ไม่มีทางทำได้ เพราะทุกไฟล์สลิปที่อัปโหลดเข้า Supabase Storage Bucket 'slips' จะถูกคำนวณลายนิ้วมือดิจิทัลด้วย SHA-256 Hash ทันที หากนำไฟล์สลิปเดิมมาส่งซ้ำ ระบบจะเทียบ Hash กับประวัติในตาราง payments และขึ้นแถบเตือนสีแดงทันที อีกทั้งสถานะออเดอร์จะเปลี่ยนเป็น paid และออกตั๋วได้ก็ต่อเมื่อสตาฟใน /admin ตรวจสอบยอดเงินเข้าบัญชีจริงครบถ้วนแล้วเท่านั้น (Human-in-the-loop verification)"
  },
  {
    slideNum: 9,
    title: "สไลด์ที่ 09: ตรวจสลิปหลังบ้าน & เสียงแจ้งเตือน Web Audio API",
    q: "Web Audio API ในหน้าตรวจสลิปต่างจากการใช้แท็ก audio ธรรมดาอย่างไร และ Concurrency Lock ป้องกันสตาฟกดชนกันอย่างไร?",
    a: "แท็ก audio ทั่วไปต้องโหลดไฟล์ mp3 ผ่านเน็ต หากเน็ตกระตุกเสียงจะไม่ดัง และเบราว์เซอร์มักบล็อกเสียง Autoplay แต่ Web Audio API สังเคราะห์คลื่นเสียงความถี่คู่ (880Hz Sine + 1320Hz Triangle) ขึ้นมาสดๆ บนแรมเครื่อง ไม่ต้องโหลดไฟล์แม้แต่ไบต์เดียว ดังฉับไวใน 0 มิลลิวินาที ส่วน Concurrency Lock ใน /admin อาศัย Database Optimistic Locking เมื่อสตาฟคนแรกกดอนุมัติ สถานะจะเปลี่ยนจาก pending เป็น paid ทันที หากสตาฟคนที่สองกดตามหลัง ระบบจะพบว่าสถานะไม่ใช่ pending แล้ว และปฏิเสธคำขอของคนที่สองทันที ป้องกันการออกตั๋วเบิ้ล 100%"
  },
  {
    slideNum: 10,
    title: "สไลด์ที่ 10: สแกน QR หน้างาน & Atomic Check-in",
    q: "ถ้าสตาฟ 2 คน ใช้มือถือคนละเครื่องสแกนตั๋วใบเดียวกันในเสี้ยววินาทีเดียวกัน (Race Condition) มีโอกาสที่คนจะเข้างานได้ 2 คนหรือไม่?",
    a: "ไม่สามารถเกิดขึ้นได้ เพราะเราใช้ Atomic Database Update: 'UPDATE tickets SET status = 'checked_in', checked_in_at = NOW() WHERE code = $code AND status = 'issued';' PostgreSQL มี Row-Level Lock คำขอแรกที่ถึง DB จะอัปเดตคืนค่า 1 row สำเร็จ สตาฟคนแรกจะได้หน้าจอสีเขียว ส่วนคำขอที่สองในเสี้ยววินาทีเดียวกันจะพบว่า status ไม่ใช่ 'issued' อีกต่อไป คืนค่า 0 row และหน้าจอจะขึ้นเตือนสีแดงทันทีว่าตั๋วถูกใช้งานไปแล้ว"
  },
  {
    slideNum: 11,
    title: "สไลด์ที่ 11: สวิตช์ร้านเต็ม Venue Full Killswitch",
    q: "ปุ่ม Killswitch ร้านเต็มชั่วคราว (venue_status.is_full) ตัดการทำงานส่วนไหนบ้าง และทำไมไม่บล็อกคนที่มีตั๋วแล้วไม่ให้เข้างาน?",
    a: "สวิตช์ Killswitch ถูกออกแบบมาเพื่อ Crowd Control จะตัดเฉพาะเส้นทางสร้างคำสั่งซื้อใหม่ (POST /api/orders) และบล็อกปุ่มสั่งซื้อในหน้า /buy ทันที แต่ไม่แตะต้องระบบสแกนตั๋ว (/api/scan) หรือหน้าดูตั๋ว (/orders) เพราะคนที่ซื้อตั๋วถูกต้องล่วงหน้าย่อมมีสิทธิ์เข้างานเสมอ และเมื่อมีลูกค้าเช็คบิลออกจากร้าน สตาฟสามารถกดปิดสวิตช์เพื่อให้ระบบเปิดรับออเดอร์ใหม่ได้ทันทีโดยไม่ต้อง Restart Server หรือแก้โค้ด"
  },
  {
    slideNum: 12,
    title: "สไลด์ที่ 12: ระบบขายบัตรหน้างาน Walk-up Onsite Sales",
    q: "ทำไมระบบ Walk-up Sales ถึงต้องทำเป็น One-Click และป้องกันสตาฟทุจริตเงินสดหน้าร้านได้อย่างไร?",
    a: "บรรยากาศหน้าประตูร้านเสียงเพลงดังมากและมีคนต่อคิว การมีปุ่มลัด 1 ใบ (49฿), 2 ใบ (98฿), 3 ใบ (147฿) แล้วคลิกเดียวออกตั๋ว + อนุมัติ + เช็คอินแจก Wristband ช่วยระบายคิวใน 5 วินาที ส่วนการป้องกันทุจริตเงินสด ระบบผูกทุกรายการกับ Staff Session บันทึกเวลา และสรุปยอดเงินสดแยกจากเงินโอนอย่างชัดเจนในแดชบอร์ด โดยนำจำนวนเงินสดที่ได้มาเทียบกับจำนวนสายรัดข้อมือ (Wristband Count) ที่สตาฟเบิกไป หากยอดเงินไม่ตรงกับสายรัดข้อมือที่หายไปจะตรวจพบได้ทันที"
  },
  {
    slideNum: 13,
    title: "สไลด์ที่ 13: End-to-End System Integration",
    q: "ถ้าฐานข้อมูล Supabase เกิดขัดข้องหรือ Down ไปชั่วขณะ ระบบมีแผนรับมือฉุกเฉิน (Fallback Plan) อย่างไร?",
    a: "ระบบออกแบบตามหลัก Fail-Closed เพื่อความปลอดภัย: API Routes จะส่ง HTTP 503 Service Unavailable แจ้งเตือนลูกค้าอย่างสุภาพ แทนที่จะปล่อยให้ออเดอร์ค้างคา ส่วนหน้างานสตาฟมี Offline Export Manifest (ไฟล์สำรองรายชื่อและโค้ดตั๋วที่ export ไว้ล่วงหน้า) ซึ่งสตาฟสามารถใช้หน้า /staff/search แบบ Local Cache ค้นหาชื่อและเบอร์โทรเพื่อติ๊กรับสายรัดข้อมือเข้างานได้ต่อเนื่องโดยไม่สะดุดแม้คลาวด์จะขัดข้อง"
  },
  {
    slideNum: 14,
    title: "สไลด์ที่ 14: Real-world Impact & Lessons Learned",
    q: "ตัวเลขสถิติ 51 ใบ เช็คอิน 96.1% สกัดสลิปซ้ำ 100% พิสูจน์ความคุ้มค่าของการพัฒนาระบบนี้อย่างไรเมื่อเทียบกับต้นทุน?",
    a: "ต้นทุนโครงสร้างพื้นฐานของระบบนี้คือ 0 บาท (Zero Dollar Tech Stack): Vercel Hobby Tier ฟรี, Supabase Free Tier ฟรี, Gmail SMTP ฟรี ในขณะที่งานจริงครั้งที่ 1 และ 2 ขายบัตรได้ครบ 51 ใบ มีผู้เข้างานจริง 49 คน (96.1%) ตรวจพบความพยายามส่งสลิปซ้ำ 2 ครั้งและระบบสกัดได้ 100% สตาฟหน้างานใช้เวลาตรวจตั๋วเฉลี่ยเพียง 1.2 วินาทีต่อคน ไม่เกิดปัญหาคิวหน้าประตูล้นออกไปบนถนน และเงินรายได้เข้าบัญชีร้านเต็มเม็ดเต็มหน่วย 100% พิสูจน์ว่าสถาปัตยกรรมระดับโปรดักชันสามารถสร้างขึ้นได้ด้วยงบประหยัดแต่มีเสถียรภาพสูงสุด"
  }
];

// Let's build the Grill-Me Defense Cheat Sheet Markdown table and detailed drill-down
let grillMeMd = `## สรุปคู่มือตอบคำถามเชิงลึกสำหรับผู้บรรยาย (Grill-Me Defense Manual — ครบทั้ง 14 สไลด์)

คู่มือเตรียมความพร้อมตอบคำถามแบบดุดันและเจาะลึกทางสถาปัตยกรรม (Grill-Me Defense) สำหรับผู้บรรยาย เพื่อใช้รับมือคำถามทางเทคนิคและธุรกิจจากอาจารย์ คณะกรรมการ หรือเพื่อนร่วมชั้น:

| สไลด์ | หัวข้อคำถามเชิงลึกที่มักโดนเจาะลึก (Grill-Me Question) | คำตอบเชิงลึกทางสถาปัตยกรรม (Architectural Defense) |
| :---: | :--- | :--- |
`;

grillMeItems.forEach(item => {
  grillMeMd += `| **${String(item.slideNum).padStart(2, '0')}** | **${item.q}** | ${item.a} |\n`;
});

grillMeMd += `\n---\n\n### รายละเอียดเจาะลึกคำถาม-คำตอบแยกรายสไลด์ (Detailed Grill-Me Drill-down)\n\n`;

grillMeItems.forEach(item => {
  grillMeMd += `#### [สไลด์ที่ ${String(item.slideNum).padStart(2, '0')}] ${item.title}\n`;
  grillMeMd += `- **❓ คำถามเจาะลึก:** ${item.q}\n`;
  grillMeMd += `- **🛡️ คำตอบเชิงรับมือ:**\n  ${item.a}\n\n`;
});

grillMeMd += `---\n*คู่มือสไลด์ฉบับสมบูรณ์ — งานลาบแรกพบ (Laab Neon Nightlife Design System)*\n`;

// Replace the Grill-Me section at the end of PRESENTATION_SLIDES.md
const grillMeRegex = /## สรุปคู่มือตอบคำถามเชิงลึกสำหรับผู้บรรยาย[\s\S]*$/;
if (grillMeRegex.test(mdContent)) {
  mdContent = mdContent.replace(grillMeRegex, grillMeMd);
  fs.writeFileSync('PRESENTATION_SLIDES.md', mdContent, 'utf8');
  console.log('Successfully updated PRESENTATION_SLIDES.md with full 14-question Grill-Me Defense Manual!');
} else {
  console.error('Could not find Grill-Me section in PRESENTATION_SLIDES.md');
}
