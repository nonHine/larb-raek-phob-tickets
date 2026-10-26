const fs = require('fs');

let html = fs.readFileSync('presentation-slides.html', 'utf8');

// 1. Add CSS rules before </style>
const cssToInsert = `
    /* Speaker Notes Tab Pills & Grill-Me Card */
    .notes-tab-pills {
      display: inline-flex;
      gap: 6px;
      margin-left: 14px;
    }
    .notes-tab-pill {
      background: var(--surface-2);
      border: 1px solid var(--border-hairline);
      color: var(--text-muted);
      border-radius: var(--radius-pill);
      padding: 3px 12px;
      font-size: 11.5px;
      cursor: pointer;
      font-family: var(--font-thai);
      transition: all 0.2s ease;
    }
    .notes-tab-pill:hover {
      color: var(--text-heading);
      border-color: var(--neon-gold);
    }
    .notes-tab-pill.active {
      background: var(--brand-red);
      color: #fff;
      border-color: var(--neon-gold);
      font-weight: 700;
      box-shadow: 0 0 10px var(--brand-red-glow);
    }
    .grill-card {
      background: rgba(143, 29, 45, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      border-radius: var(--radius-md);
      padding: 16px;
      margin-bottom: 12px;
    }
    .grill-q-title {
      color: var(--neon-gold);
      font-weight: 800;
      font-size: 13.5px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .grill-q-text {
      color: #FCA5A5;
      font-size: 13.5px;
      font-weight: 700;
      margin-bottom: 12px;
      background: rgba(0, 0, 0, 0.4);
      padding: 8px 12px;
      border-radius: 6px;
      border-left: 3px solid var(--status-danger);
      line-height: 1.5;
    }
    .grill-a-title {
      color: #34D399;
      font-weight: 800;
      font-size: 13.5px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .grill-a-text {
      color: #E2E8F0;
      font-size: 13px;
      line-height: 1.7;
    }
    .kbd-badge {
      display: inline-block;
      padding: 2px 7px;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      color: var(--neon-gold);
      background: #1e2230;
      border: 1px solid var(--border-hairline);
      border-radius: 4px;
      box-shadow: 0 2px 0 rgba(0,0,0,0.4);
    }
`;

if (!html.includes('.notes-tab-pills')) {
  html = html.replace('  </style>', `${cssToInsert}\n  </style>`);
  console.log('✓ Added CSS for Grill-Me tabs and Keyboard shortcuts');
}

// 2. Add shortcuts help button in header
const oldHeaderControls = `<button id="btn-grid-modal" class="ctrl-btn" title="เปิดสารบัญสไลด์ (G)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>สารบัญ</span>
      </button>`;

const newHeaderControls = `<button id="btn-grid-modal" class="ctrl-btn" title="เปิดสารบัญสไลด์ (G / M)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>สารบัญ</span>
      </button>

      <button id="btn-shortcuts-help" class="ctrl-btn" title="คีย์ลัดสำหรับนำเสนอ (?)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>คีย์ลัด</span>
      </button>`;

if (html.includes(oldHeaderControls)) {
  html = html.replace(oldHeaderControls, newHeaderControls);
  console.log('✓ Added Shortcuts Help button to header');
}

// 3. Update Slide 3 Environment Variables to 6 variables
const oldEnvGrid = `<div class="card-box">
              <h4 style="color: var(--neon-gold); font-size: 14.5px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <span>🔑</span> การตั้งค่า Environment Variables ที่จำเป็นใน Production
              </h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: var(--font-mono); font-size: 11px;">
                <div style="background: rgba(0,0,0,0.4); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-hairline);">
                  <strong style="color: #60A5FA;">NEXT_PUBLIC_SUPABASE_URL</strong><br>
                  <span style="color: var(--text-muted); font-size: 10px;">URL ปลายทางของฐานข้อมูลคลาวด์</span>
                </div>
                <div style="background: rgba(0,0,0,0.4); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-hairline);">
                  <strong style="color: #60A5FA;">NEXT_PUBLIC_SUPABASE_ANON_KEY</strong><br>
                  <span style="color: var(--text-muted); font-size: 10px;">คีย์เข้าถึงหน้าบ้านแบบจำกัดสิทธิ์</span>
                </div>
                <div style="background: rgba(0,0,0,0.4); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-hairline);">
                  <strong style="color: #F87171;">SUPABASE_SERVICE_ROLE_KEY</strong><br>
                  <span style="color: var(--text-muted); font-size: 10px;">คีย์สิทธิ์สูงสุด (เฉพาะเซิร์ฟเวอร์เท่านั้น)</span>
                </div>
                <div style="background: rgba(0,0,0,0.4); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-hairline);">
                  <strong style="color: #FBBF24;">SMTP_USER / SMTP_PASS</strong><br>
                  <span style="color: var(--text-muted); font-size: 10px;">Gmail & App Password 16 หลัก</span>
                </div>
              </div>
            </div>`;

const newEnvGrid = `<div class="card-box">
              <h4 style="color: var(--neon-gold); font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <span>🔑</span> การตั้งค่า 6 Environment Variables ที่จำเป็นใน Production
              </h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 7px; font-family: var(--font-mono); font-size: 10.5px;">
                <div style="background: rgba(0,0,0,0.4); padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-hairline);">
                  <strong style="color: #60A5FA;">NEXT_PUBLIC_SUPABASE_URL</strong><br>
                  <span style="color: var(--text-muted); font-size: 9.5px;">URL ปลายทางของฐานข้อมูล Supabase</span>
                </div>
                <div style="background: rgba(0,0,0,0.4); padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-hairline);">
                  <strong style="color: #60A5FA;">NEXT_PUBLIC_SUPABASE_ANON_KEY</strong><br>
                  <span style="color: var(--text-muted); font-size: 9.5px;">คีย์ Public หน้าบ้าน (จำกัดด้วย RLS)</span>
                </div>
                <div style="background: rgba(0,0,0,0.4); padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-hairline);">
                  <strong style="color: #F87171;">SUPABASE_SERVICE_ROLE_KEY</strong><br>
                  <span style="color: var(--text-muted); font-size: 9.5px;">คีย์สิทธิ์สูงสุด Bypass RLS (Server Only)</span>
                </div>
                <div style="background: rgba(0,0,0,0.4); padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-hairline);">
                  <strong style="color: #34D399;">SMTP_USER</strong><br>
                  <span style="color: var(--text-muted); font-size: 9.5px;">อีเมลผู้ส่ง Gmail (พอร์ต 465 SSL)</span>
                </div>
                <div style="background: rgba(0,0,0,0.4); padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-hairline);">
                  <strong style="color: #FBBF24;">SMTP_PASS</strong><br>
                  <span style="color: var(--text-muted); font-size: 9.5px;">Gmail App Password 16 หลัก (ตัดวรรค)</span>
                </div>
                <div style="background: rgba(0,0,0,0.4); padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-hairline);">
                  <strong style="color: #F59E0B;">PROMPTPAY_ID</strong><br>
                  <span style="color: var(--text-muted); font-size: 9.5px;">เลขพร้อมเพย์สร้าง EMVCo (081-234-5678)</span>
                </div>
              </div>
            </div>`;

if (html.includes(oldEnvGrid)) {
  html = html.replace(oldEnvGrid, newEnvGrid);
  console.log('✓ Updated Slide 3 to display all 6 Environment Variables including PROMPTPAY_ID');
}

// 4. Update Speaker Notes Drawer Header with Tab Pills
const oldNotesTitleGroup = `<div class="notes-title-group">
        <span class="notes-tag">SPEAKER NOTES</span>
        <span id="notes-slide-title" class="notes-heading">บทพูดสไลด์ 01</span>
      </div>`;

const newNotesTitleGroup = `<div class="notes-title-group">
        <span class="notes-tag">SPEAKER NOTES</span>
        <span id="notes-slide-title" class="notes-heading">บทพูดสไลด์ 01</span>
        <div class="notes-tab-pills">
          <button id="btn-tab-speech" class="notes-tab-pill active" title="สลับเป็นบทพูดบรรยาย">🎙️ บทพูดบรรยาย</button>
          <button id="btn-tab-grill" class="notes-tab-pill" title="สลับเป็นแนวทางการตอบข้อซักถามเจาะลึก">🛡️ Grill-Me Q&A</button>
        </div>
      </div>`;

if (html.includes(oldNotesTitleGroup)) {
  html = html.replace(oldNotesTitleGroup, newNotesTitleGroup);
  console.log('✓ Added Speech / Grill-Me tab switcher to notes drawer header');
}

// 5. Add Shortcuts Help Modal right after #grid-modal
const shortcutsModalHtml = `
  <!-- Shortcuts Help Modal -->
  <div id="shortcuts-modal" class="grid-modal-overlay">
    <div class="grid-modal-card" style="max-width: 620px;">
      <div class="grid-modal-header">
        <div class="grid-modal-title" style="display:flex;align-items:center;gap:8px;">
          <span>⌨️</span> <span>คีย์ลัดสำหรับควบคุมการนำเสนอ (Keyboard Shortcuts)</span>
        </div>
        <button id="btn-close-shortcuts" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 20px;">✕</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--border-hairline);">
          <span>สไลด์ถัดไป</span>
          <div><span class="kbd-badge">→</span> <span class="kbd-badge">Space</span> <span class="kbd-badge">PgDn</span></div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--border-hairline);">
          <span>สไลด์ก่อนหน้า</span>
          <div><span class="kbd-badge">←</span> <span class="kbd-badge">PgUp</span></div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--border-hairline);">
          <span>หน้าแรกสุด / หน้าสุดท้าย</span>
          <div><span class="kbd-badge">Home</span> <span class="kbd-badge">End</span></div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--border-hairline);">
          <span>เปิด/ปิด บทพูดผู้บรรยาย (Speaker Notes)</span>
          <div><span class="kbd-badge">N</span></div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--border-hairline);">
          <span>เปิดสารบัญสไลด์ทั้งหมด (Slide Grid / Menu)</span>
          <div><span class="kbd-badge">G</span> <span class="kbd-badge">M</span></div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--border-hairline);">
          <span>สลับโหมดเต็มหน้าจอ (Fullscreen)</span>
          <div><span class="kbd-badge">F</span></div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--border-hairline);">
          <span>เปิดหน้าต่างคีย์ลัดนี้</span>
          <div><span class="kbd-badge">?</span> <span class="kbd-badge">/</span></div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--border-hairline);">
          <span>ปิดหน้าต่าง Modal / ปิดบทพูด</span>
          <div><span class="kbd-badge">Esc</span></div>
        </div>
      </div>
    </div>
  </div>
`;

if (!html.includes('id="shortcuts-modal"')) {
  html = html.replace('  <!-- Toast Notification -->', `${shortcutsModalHtml}\n  <!-- Toast Notification -->`);
  console.log('✓ Injected #shortcuts-modal HTML');
}

// 6. Update speakerNotes in script with grillMe object for all 14 slides
// Let's write the updated speakerNotes array
const speakerNotesJs = `const speakerNotes = [
        {
          slide: 1,
          title: "สไลด์ที่ 01: หน้าปกโปรเจกต์ (Introduction)",
          text: \`<blockquote>"สวัสดีครับเพื่อนๆ และอาจารย์ วันนี้พวกเราจะมาแกะกล่องเบื้องหลังการสร้าง <strong>เว็บไซต์ระบบจำหน่ายบัตรและเช็คอินงานลาบแรกพบ</strong> ให้ดูกันครับ งานนี้จัดขึ้นที่ร้านลาบก้อยซอยนานา หลัง มข. ซึ่งแต่ก่อนเวลาจัดคอนเสิร์ต คนจัดงานต้องคอยตอบแชท ตรวจสลิปทีละใบ และเอารายชื่อมาติ๊กสมุดหน้าประตู ทำให้หน้างานวุ่นวายมาก พวกเราเลยสร้างเว็บไซต์นี้ขึ้นมาเพื่อให้ผู้ซื้อสามารถจองบัตร จ่ายเงิน และสตาฟสามารถสแกนตั๋วผ่านมือถือได้ 100% โดยไม่ต้องโหลดแอปเพิ่มเลยครับ"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • แนะนำบริบท: ร้านอาหารอีสานดนตรีสด จัดคอนเสิร์ตจริง 2 ครั้ง<br>
            • ตั๋วราคาเข้าถึงง่ายเพียง 49 บาท / ใบ<br>
            • สถิติจริง: ขายตั๋ว 51 ใบ เช็คอิน 96.1% สกัดสลิปซ้ำ 100%
          </div>\`,
          grillMe: {
            q: "ทำไมต้องเขียนเว็บไซต์ระบบตั๋วขึ้นมาเอง? ทำไมไม่ใช้ Google Form + LINE OA หรือแพลตฟอร์มสำเร็จรูปอย่าง Eventpop / Ticketmelon?",
            a: "Google Form มีปัญหาใหญ่ 3 ด้าน: (1) ผู้ซื้อต้องพิมพ์ยอดเงินเองและแนบสลิปที่แอดมินต้องคอยไล่ตรวจใน Drive เสี่ยง Human Error และตอบแชทไม่ทัน (2) แพลตฟอร์มสำเร็จรูปหักหัวคิว 5-10% ต่อตั๋ว สำหรับตั๋วราคา 49 บาท รายได้จะถูกหักไปมาก และเงินไม่ได้เข้าบัญชีร้านทันที (3) แพลตฟอร์มภายนอกไม่มี Dynamic Amount Locking, Realtime Check-in และ Emergency Killswitch ที่ปรับแต่งให้เข้ากับความจุของร้านอาหารจริงได้ การสร้างเองทำให้เงินเข้าบัญชีผู้จัดงานตรง 100% ควบคุมข้อมูลและความปลอดภัยได้เบ็ดเสร็จ"
          }
        },
        {
          slide: 2,
          title: "สไลด์ที่ 02: เครื่องมือที่ใช้สร้างเว็บ (Core Tech Stack)",
          text: \`<blockquote>"ก่อนที่เราจะเจาะลึกฟีเจอร์ เรามาดูเครื่องมือหลัก 6 ตัวที่พวกเราเลือกใช้กันครับ:<br>
          • ตัวแรกคือ <strong>Next.js 14</strong> เป็นโครงสร้างเว็บหลักที่รวมหน้าเว็บและเซิร์ฟเวอร์ไว้ในที่เดียว โหลดไวมาก<br>
          • หน้าตาเว็บเราใช้ <strong>Tailwind CSS</strong> คุมโทนสีดาร์กโหมดนีออน ให้บรรยากาศไนท์ไลฟ์และกดง่ายด้วยมือเดียว<br>
          • ดาต้าเบสเราใช้ <strong>Supabase</strong> ซึ่งเป็น PostgreSQL บนคลาวด์ พร้อมระบบ Realtime<br>
          • และมีโมดูลเฉพาะทางอีก 3 ตัว คือ <strong>PromptPay QR</strong> สำหรับสร้างคิวอาร์โค้ดล็อกยอด, <strong>HTML5 Scanner</strong> สำหรับเปิดกล้องมือถือสแกนตั๋ว, และ <strong>Node Crypto</strong> สำหรับสุ่มตั๋ว 32 หลักและ SHA-256 ตรวจจับสลิปซ้ำครับ"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • อธิบายเหตุผลที่เลือก Next.js 14 App Router (Serverless Functions)<br>
            • ชูจุดเด่นของ Supabase Realtime ที่ทำให้สตาฟไม่ต้องกดรีเฟรชหน้าจอ<br>
            • เกริ่นนำ 3 โมดูลความปลอดภัย: PromptPay, HTML5 Camera, SHA-256
          </div>\`,
          grillMe: {
            q: "ทำไมถึงเลือก Next.js 14 App Router + Tailwind CSS แทนที่จะใช้ SPA แบบ Vite + React ธรรมดา?",
            a: "เพราะระบบนี้ต้องมีทั้ง Frontend (หน้าซื้อตั๋ว, กล้องสแกน) และ Backend (Serverless API Routes, คำนวณ QR, Crypto Token, ส่งอีเมล) ใน Repo เดียวกัน Next.js 14 App Router มี Server Actions และ Route Handlers ช่วยปกป้องคีย์ความลับอย่าง SUPABASE_SERVICE_ROLE_KEY และ SMTP_PASS ไม่ให้หลุดไปที่ฝั่งไคลเอนต์ อีกทั้งแคชหน้าแรกบน Edge CDN โหลดไวใน 40ms บนมือถือ ส่วน Tailwind CSS ช่วยสร้าง Atomic CSS ขนาดกะทัดรัด คุมโทน Dark Mode Neon Nightlife ตาม DESIGN.md ได้อย่างไร้รอยต่อ"
          }
        },
        {
          slide: 3,
          title: "สไลด์ที่ 03: การ Push ขึ้นเป็น Website (Deployment & CI/CD)",
          text: \`<blockquote>"สไลด์นี้จะตอบคำถามว่า 'เราเอาเว็บขึ้นไปอยู่บนอินเทอร์เน็ตจริงๆ ได้อย่างไร' ครับ เริ่มต้นจากพวกเราเขียนโค้ดเสร็จ ก็จะ push ขึ้น <strong>GitHub</strong> พอดันโค้ดปุ๊บ ระบบของ <strong>Vercel</strong> จะดึงโค้ดไป Build และ Deploy ให้อัตโนมัติทันที เว็บไซต์ของเราจึงออนไลน์ได้ตลอดเวลาแบบไม่มีวันล่ม โดยระบบหลังบ้านจะคุยกับ <strong>Supabase Cloud</strong> เพื่ออ่านเขียนข้อมูลคำสั่งซื้อ และรูปภาพสลิปทั้งหมดจะถูกเก็บแยกไว้ใน Supabase Storage Bucket ชื่อ 'slips' อย่างปลอดภัย และควบคุมการเข้าถึงด้วย 6 Environment Variables ครับ"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • อธิบายขั้นตอน CI/CD: Push Code ➔ Vercel Auto Build ➔ Global Edge CDN ➔ Supabase<br>
            • ชี้แจงการจัดการ 6 Environment Variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SMTP_USER, SMTP_PASS, PROMPTPAY_ID
          </div>\`,
          grillMe: {
            q: "เมื่อเปิดขายตั๋วแล้วคนแห่เข้าพร้อมกัน Serverless Functions บน Vercel จะเจอปัญหา Cold Start หรือไม่ และสถาปัตยกรรมคลาวด์แยกสิทธิ์อย่างไร?",
            a: "Vercel Edge CDN เสิร์ฟหน้าเว็บแบบ Static Cache ทันทีโดยไม่มี Cold Start ส่วน Serverless API Routes บน Node.js runtime มี Cold Start เฉลี่ยต่ำกว่า 250ms ซึ่งแทบไม่รู้สึกบนเครือข่ายมือถือ ด้านความปลอดภัย เราแยก Environment Variables ชัดเจน: NEXT_PUBLIC_SUPABASE_ANON_KEY ใช้เฉพาะหน้าบ้านและถูกจำกัดด้วย PostgreSQL Row-Level Security (RLS) ส่วน SUPABASE_SERVICE_ROLE_KEY และ SMTP_PASS ถูกเก็บเป็นความลับบน Serverless Environment เพื่อใช้ทำธุรกรรมที่ต้องใช้สิทธิ์ผู้ดูแล เช่น อนุมัติสลิปและออกตั๋ว"
          }
        },
        {
          slide: 4,
          title: "สไลด์ที่ 04: ข้อมูลการเงิน บัญชีธนาคาร และ PromptPay",
          text: \`<blockquote>"เรื่องเงินเป็นเรื่องที่ต้องเป๊ะที่สุดในงานครับ บัตรคอนเสิร์ตของเราตั้งราคาไว้ที่ <strong>49 บาทต่อใบ</strong> เพื่อให้เพื่อนๆ นักศึกษาตัดสินใจซื้อง่าย โดยเงินที่โอนเข้ามาจะเข้าบัญชีหลักของทางร้าน คือ <strong>ธนาคารกสิกรไทย เลขที่ xxx-x-xxxxx-x ชื่อบัญชีคุณบัญชีทางการ งานลาบแรกพบ</strong> หรือสามารถสแกนจ่ายผ่าน <strong>พร้อมเพย์ 081-234-5678</strong> ได้ทันที ระบบของเราออกแบบให้ผู้ใช้กดปุ่มเดียวก็คัดลอกเลขบัญชีไปวางในแอปธนาคารได้เลย และที่สำคัญคือยอดเงินจะถูกคำนวณแบบแม่นยำ ไม่ว่าจะซื้อกี่ใบระบบก็คิดให้อัตโนมัติครับ"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • กดปุ่ม '📋 คัดลอก (xxxxxxxxx)' โชว์ว่าระบบคัดลอกเลขบัญชีแบบ Raw ให้ทันที<br>
            • ชี้แจง QR Reference: 000000000000000 สำหรับจับคู่ยอดเงิน<br>
            • เงินเข้าตรงบัญชีผู้จัด 100% ไม่เสียค่าธรรมเนียมตัวกลาง
          </div>\`,
          grillMe: {
            q: "ทำไมราคาตั๋ว 49 บาท ถึงต้องมีทั้งบัญชีกสิกรไทย (KBANK) และพร้อมเพย์? และถ้าลูกค้าโอนเงินผิดยอด (เช่น โอนขาดหรือโอนเกิน) ระบบจัดการอย่างไร?",
            a: "ราคา 49 บาทซื้อง่ายแต่มีเศษ 9 บาท ถ้าซื้อหลายใบ (เช่น 2 ใบ 98฿ หรือ 3 ใบ 147฿) ลูกค้ามักโอนผิด เราจึงใช้ Dynamic PromptPay QR เป็นทางเลือกหลักเพื่อล็อกยอดเงินเป๊ะ แต่ยังคงแสดงบัญชี KBANK xxx-x-xxxxx-x (บัญชีทางการ งานลาบแรกพบ, raw: xxxxxxxxx) พร้อมเลขอ้างอิง 000000000000000 เผื่อแอปธนาคารบางแห่งสแกน QR ขัดข้อง หากลูกค้าโอนผิดยอด ระบบมี Partial Approval Flow ที่สตาฟสามารถอนุมัติตั๋วตามยอดที่ได้รับจริง (เช่น โอนมา 49฿ จากยอด 98฿ อนุมัติตั๋ว 1 ใบ) และส่งอีเมล partial_approval แจ้งยอดคงเหลือที่ต้องชำระเพิ่มเติมทันที"
          }
        },
        {
          slide: 5,
          title: "สไลด์ที่ 05: เจาะลึกระบบสร้าง QR Code 2 รูปแบบ",
          text: \`<blockquote>"หลายคนอาจคิดว่า QR Code บนเว็บก็เหมือนๆ กัน แต่ในระบบงานลาบแรกพบ เราใช้ QR Code สองประเภทที่ทำงานต่างกันอย่างสิ้นเชิงครับ:<br>
          • <strong>แบบแรกคือ Dynamic PromptPay QR:</strong> อันนี้ใช้สำหรับจ่ายเงิน เราใช้ไลบรารี <code>promptpay-qr</code> คำนวณเป็นรหัสมาตรฐานสากล EMVCo ตามยอดเงินจริง เช่น สั่ง 2 ใบ ยอด 98 บาท โค้ดจะล็อกยอดนี้ไว้เลย พอเปิดแอปธนาคารสแกนปุ๊บ ยอดเงินจะขึ้น 98 บาททันที ไม่ต้องให้ลูกค้ามานั่งพิมพ์ตัวเลขเอง<br>
          • <strong>แบบที่สองคือ Ticket QR Code:</strong> อันนี้คือตั๋วเข้างาน เราใช้คำสั่งความปลอดภัยระดับสูงของ Node.js คือ <code>crypto.randomBytes(16)</code> สุ่มรหัสลับยาว 32 ตัวอักษรขึ้นมา ซึ่งไม่มีทางเดาถูกได้เลย และเมื่อสตาฟใช้กล้องมือถือสแกนผ่าน <code>html5-qrcode</code> ระบบจะตัดสถานะเป็น 'เข้างานแล้ว' ทันที ใครเอาภาพแคปจอมาสแกนซ้ำจะถูกปฏิเสธทันทีครับ"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • เปรียบเทียบตารางสองฝั่ง: EMVCo BOT Standard vs 32-Hex Crypto Ticket<br>
            • ชี้ให้เห็นว่าตั๋วเข้างานปลอดภัยระดับเดียวกับโทเค็นธนาคาร ไม่มีทางเดารหัสได้
          </div>\`,
          grillMe: {
            q: "ความแตกต่างทางเทคนิคและมาตรฐานความปลอดภัยระหว่าง Dynamic PromptPay QR กับ Ticket Entrance QR คืออะไร? ทำไมไม่ใช้ไลบรารีเดียวกันสร้าง?",
            a: "ทั้งสองตัวใช้ไลบรารี qrcode แปลงข้อมูลเป็นภาพเหมือนกัน แต่ Payload และมาตรฐานคนละระบบอย่างสิ้นเชิง: (1) PromptPay QR ต้องปฏิบัติตามมาตรฐาน EMVCo ของธนาคารแห่งประเทศไทย (BOT Specification) คำนวณผ่าน promptpay-qr ฝัง Tag ยอดเงินจริงและ ID 081-234-5678 เพื่อให้แอปธนาคารตัดเงินตรงเป๊ะ (2) Ticket QR เป็นรหัส Authorization สุ่มด้วย crypto.randomBytes(16) ของ Node.js ได้รหัสความปลอดภัยสูง 32 Hex Characters ที่ไม่เปิดเผยข้อมูลส่วนบุคคลใดๆ เพื่อให้กล้องหน้างานของสตาฟสแกนแล้วส่งไปทำ Atomic Update สถานะในฐานข้อมูล"
          }
        },
        {
          slide: 6,
          title: "สไลด์ที่ 06: ระบบส่งอีเมลและตั๋วอัตโนมัติ (lib/email.ts)",
          text: \`<blockquote>"ฟังก์ชันสำคัญที่ทำให้ลูกค้ารู้สึกอุ่นใจคือ <strong>ระบบส่งอีเมลอัตโนมัติ</strong> ครับ เราเขียนโมดูล <code>lib/email.ts</code> เชื่อมต่อกับ Gmail SMTP พอร์ต 465 SSL โดยมีเทมเพลตอีเมลถึง 5 รูปแบบ ดูแลลูกค้าตั้งแต่วินาทีที่กดสั่ง ไปจนถึงส่งตั๋วให้ และไฮไลต์ทางเทคนิคคือ <strong>เราใช้วิธี Inline CID Attachment ฝังภาพ QR Code ตั๋วเข้าไปในไฟล์อีเมลเลย</strong> ลูกค้าเปิดเมลปุ๊บจะเห็นตั๋วทันที ไม่ต้องกด 'อนุญาตให้ดาวน์โหลดรูป' เหมือนอีเมลทั่วไป และหากการส่งมีปัญหาระบบจะแยกแยะ Error ได้ทันทีครับ"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • กดปุ่มสลับแท็บเทมเพลตด้านขวา (paid, order_created, slip_rejected) เพื่อโชว์พรีวิวอีเมลสดๆ<br>
            • อธิบายข้อดีของ Inline CID (cid:ticket-1-uuid) ไม่พึ่งพา CDN รูปไม่หาย<br>
            • ชี้แจงการรับมือ Error: auth_failed (535), provider_error, quota rate limit
          </div>\`,
          grillMe: {
            q: "ทำไมถึงเลือก Gmail SMTP (พอร์ต 465 SSL Direct) ร่วมกับ Inline CID แทนที่จะใช้บริการอีเมลภายนอกอย่าง SendGrid หรือ Resend?",
            a: "งานคอนเสิร์ตสเกลอินดี้มีงบประมาณจำกัด Gmail SMTP ผ่าน App Password 16 หลักไม่มีค่าใช้จ่ายและส่งได้ถึง 500 ฉบับ/วัน ซึ่งเพียงพอต่อขนาดของงาน ส่วนเทคนิค Inline CID (Content-ID) แนบภาพตั๋วจาก QRCode.toBuffer เป็น PNG เข้าไปในก้อนอีเมลโดยตรง (cid:ticket-1-id) เพื่อแก้ปัญหาคลาสสิกที่แอปอีเมล (Gmail, Outlook) บล็อกรูปภาพจาก URL ภายนอก ทำให้ผู้ซื้อเปิดเมลแล้วเห็นภาพตั๋วทันที 100% แม้ออฟไลน์ พร้อมระบบแยกแยะ Error: auth_failed (535), provider_error, quota rate limit"
          }
        },
        {
          slide: 7,
          title: "สไลด์ที่ 07: ฟีเจอร์ที่ 1 — ระบบสั่งซื้อบัตรแบบ Stepper (/buy)",
          text: \`<blockquote>"ฟีเจอร์แรกคือหน้าซื้อบัตร เราทำเป็นสเต็ป 1-2-3 ครับ ขั้นแรกให้เลือกจำนวนบัตรด้วยปุ่มบวก-ลบขนาดใหญ่ พอกดปุ๊บยอดเงินจะคำนวณให้ทันทีที่ใบละ 49 บาท จากนั้นขั้นที่สองค่อยให้กรอกชื่อและเบอร์โทร ซึ่งระบบจะตรวจแบบเรียลไทม์เลยว่ากรอกเบอร์ครบ 10 หลักไหม และขั้นที่สามเป็นหน้าสรุปยอดเพื่อกดยืนยัน การแยกเป็นขั้นแบบนี้ทำให้คนซื้อไม่ตาลายและกรอกข้อมูลไม่ผิดพลาดครับ"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • กดปุ่ม [+] และ [-] ใน Mockup ให้ดูว่ายอดเงินขยับตามจริง (ใบละ 49 บาท)<br>
            • ลองลบเบอร์โทรในช่อง input เพื่อโชว์ Realtime Phone Validation<br>
            • อธิบายช่อง Honeypot ซ่อนไว้ดักจับบอทสแปม
          </div>\`,
          grillMe: {
            q: "ทำไมต้องแบ่งเป็น 3 ขั้นตอน (Stepper) และป้องกันบอทกว้านซื้อตั๋วอย่างไรโดยไม่ใช้ CAPTCHA ที่น่ารำคาญ?",
            a: "บนจอมือถือ การรวมแบบฟอร์มยาวๆ ทำให้ผู้ใช้กดยกเลิกง่าย Stepper ช่วยแบ่งสมาธิ: ขั้น 1 เลือกจำนวนและคำนวณเงินทันที (ใบละ 49฿), ขั้น 2 ตรวจเบอร์โทร 10 หลักแบบ Realtime, ขั้น 3 สรุปยอดและยืนยัน สำหรับการป้องกันบอท เราใช้เทคนิค Honeypot Field ซ่อนฟิลด์หลอกไว้ด้วย CSS display:none หากบอทเผลอกรอกเข้ามา ระบบจะปฏิเสธคำขอทันที ร่วมกับระบบ In-Memory Rate Limiting และเลขออเดอร์มีอายุเพียง 30 นาที หากไม่โอนจะตัดสิทธิ์คืนตั๋วให้คนอื่นทันที"
          }
        },
        {
          slide: 8,
          title: "สไลด์ที่ 08: ฟีเจอร์ที่ 2 — สร้าง PromptPay QR อัตโนมัติ & แนบสลิป (/checkout)",
          text: \`<blockquote>"ฟีเจอร์ที่สองคือการจ่ายเงิน ปัญหาคลาสสิกของการโอนเงินคือ 'คนชอบโอนผิดยอด' เช่น สั่ง 2 ใบแต่โอนเงินมาใบเดียว ระบบเราแก้ปัญหานี้ด้วยการสร้าง <strong>Dynamic PromptPay QR Code</strong> ขึ้นมาโดยเอายอดเงินจริงฝังลงไปในคิวอาร์โค้ดเลย เช่น สั่ง 2 ใบ ยอด 98 บาท สแกนปุ๊บขึ้น 98 บาททันที หรือถ้าโอนผ่านเลขบัญชีกสิกรไทย xxx-x-xxxxx-x ก็ทำได้ โอนเสร็จก็แนบรูปสลิปเข้ามาในระบบได้ทันทีครับ"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • คลิกกล่องแนบสลิปด้านขวาเพื่อจำลองการแนบสลิปและโชว์ SHA-256 Hash<br>
            • นาฬิกานับถอยหลัง 30 นาทีช่วยกระตุ้นการโอนและคืนโควตาถ้าไม่ชำระ<br>
            • Split Payment รองรับกรณีเพื่อนโอนแยก 2 บัญชี
          </div>\`,
          grillMe: {
            q: "ถ้าระบบรองรับ Multi-slip / Split Payment มีโอกาสที่ผู้ซื้อจะส่งสลิปเดิมซ้ำๆ เพื่อรวมยอดให้ครบได้หรือไม่?",
            a: "ไม่มีทางทำได้ เพราะทุกไฟล์สลิปที่อัปโหลดเข้า Supabase Storage Bucket 'slips' จะถูกคำนวณลายนิ้วมือดิจิทัลด้วย SHA-256 Hash ทันที หากนำไฟล์สลิปเดิมมาส่งซ้ำ ระบบจะเทียบ Hash กับประวัติในตาราง payments และขึ้นแถบเตือนสีแดงทันที อีกทั้งสถานะออเดอร์จะเปลี่ยนเป็น paid และออกตั๋วได้ก็ต่อเมื่อสตาฟใน /admin ตรวจสอบยอดเงินเข้าบัญชีจริงครบถ้วนแล้วเท่านั้น (Human-in-the-loop verification)"
          }
        },
        {
          slide: 9,
          title: "สไลด์ที่ 09: ฟีเจอร์ที่ 3 — หลังบ้านตรวจสลิปฉับไว (/admin)",
          text: \`<blockquote>"ฟีเจอร์ที่สามเป็นหัวใจของฝั่งสตาฟเลยครับ หน้าตรวจสลิปทำงานเหมือนแอปเดลิเวอรี คือพอมีคนส่งสลิปเข้ามา <strong>จะมีเสียงกริ่งดังเตือนทันที</strong> สตาฟไม่ต้องนั่งจ้องจอทั้งคืน และที่เจ๋งมากคือ <strong>ระบบตรวจจับสลิปซ้ำด้วย SHA-256</strong> ถ้าระบบจำได้ว่าภาพสลิปนี้เคยมีคนส่งมาแล้ว จะขึ้นแถบสีแดงเตือนสตาฟทันทีว่าสลิปนี้ซ้ำ ช่วยป้องกันการถูกโกงหน้างานได้ 100% ครับ"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • กดปุ่ม '🔔 กดเพื่อทดสอบฟังเสียงกริ่ง' เพื่อโชว์ Web Audio API สดๆ<br>
            • อธิบายการทำงานของ SHA-256 Hash เปรียบเหมือน 'ลายนิ้วมือดิจิทัล' ของไฟล์ภาพ<br>
            • Concurrency Lock ป้องกันกรณีสตาฟ 2 คนเปิดดูพร้อมกันแล้วกดอนุมัติซ้ำ
          </div>\`,
          grillMe: {
            q: "Web Audio API ในหน้าตรวจสลิปต่างจากการใช้แท็ก audio ธรรมดาอย่างไร และ Concurrency Lock ป้องกันสตาฟกดชนกันอย่างไร?",
            a: "แท็ก audio ทั่วไปต้องโหลดไฟล์ mp3 ผ่านเน็ต หากเน็ตกระตุกเสียงจะไม่ดัง และเบราว์เซอร์มักบล็อกเสียง Autoplay แต่ Web Audio API สังเคราะห์คลื่นเสียงความถี่คู่ (880Hz Sine + 1320Hz Triangle) ขึ้นมาสดๆ บนแรมเครื่อง ไม่ต้องโหลดไฟล์แม้แต่ไบต์เดียว ดังฉับไวใน 0 มิลลิวินาที ส่วน Concurrency Lock ใน /admin อาศัย Database Optimistic Locking เมื่อสตาฟคนแรกกดอนุมัติ สถานะจะเปลี่ยนจาก pending เป็น paid ทันที หากสตาฟคนที่สองกดตามหลัง ระบบจะพบว่าสถานะไม่ใช่ pending แล้ว และปฏิเสธคำขอของคนที่สองทันที ป้องกันการออกตั๋วเบิ้ล 100%"
          }
        },
        {
          slide: 10,
          title: "สไลด์ที่ 10: ฟีเจอร์ที่ 4 — สแกน QR Code หน้างาน รับ Wristband (/staff/scan)",
          text: \`<blockquote>"ฟีเจอร์ที่สี่คือหน้าประตูทางเข้าครับ ลูกค้าที่ได้รับอนุมัติจะมีตั๋ว QR Code ในมือถือ สตาฟหน้าประตูแค่เปิดหน้าเว็บแล้วยกมือถือขึ้นมาสแกน ถ้าบัตรถูกต้องจะขึ้น <strong>หน้าจอสีเขียว</strong> สตาฟก็มอบสายรัดข้อมือให้เข้างานได้เลย ใช้เวลาแค่ 1-2 วินาทีต่อคน และถ้ามีใครเอาภาพแคปหน้าจอมาสแกนซ้ำ ระบบจะขึ้น <strong>สีแดงเตือนทันที</strong> ว่าบัตรนี้ถูกใช้ไปแล้วครับ"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • กดปุ่มจำลอง '🟢 สแกนผ่าน' และ '🔴 สแกนซ้ำ' ในหน้าจอเพื่อสาธิตผลลัพธ์<br>
            • อธิบายกลไก Atomic Check-in ที่ตัดสถานะทันทีในดาต้าเบส กันการแคปจอส่งต่อ<br>
            • มีระบบค้นหาสำรองด้วยชื่อ/เบอร์โทร กรณีลูกค้าจอแตกหรือแบตหมด
          </div>\`,
          grillMe: {
            q: "ถ้าสตาฟ 2 คน ใช้มือถือคนละเครื่องสแกนตั๋วใบเดียวกันในเสี้ยววินาทีเดียวกัน (Race Condition) มีโอกาสที่คนจะเข้างานได้ 2 คนหรือไม่?",
            a: "ไม่สามารถเกิดขึ้นได้ เพราะเราใช้ Atomic Database Update: 'UPDATE tickets SET status = 'checked_in', checked_in_at = NOW() WHERE code = $code AND status = 'issued';' PostgreSQL มี Row-Level Lock คำขอแรกที่ถึง DB จะอัปเดตคืนค่า 1 row สำเร็จ สตาฟคนแรกจะได้หน้าจอสีเขียว ส่วนคำขอที่สองในเสี้ยววินาทีเดียวกันจะพบว่า status ไม่ใช่ 'issued' อีกต่อไป คืนค่า 0 row และหน้าจอจะขึ้นเตือนสีแดงทันทีว่าตั๋วถูกใช้งานไปแล้ว"
          }
        },
        {
          slide: 11,
          title: "สไลด์ที่ 11: ฟีเจอร์ที่ 5 — สวิตช์ปิดรับออเดอร์ชั่วคราว (Venue Full Killswitch)",
          text: \`<blockquote>"ฟีเจอร์ที่ห้าคือสวิตช์แก้ปัญหาคนล้นร้านครับ ปกติร้านอาหารพื้นที่จำกัด ถ้าปล่อยให้ซื้อออนไลน์เรื่อยๆ ร้านจะแตก เราเลยทำปุ่มชื่อว่า <strong>'ร้านเต็มชั่วคราว'</strong> ไว้บนหน้าจอของสตาฟ พอเห็นว่าโต๊ะเต็ม สตาฟกดปุ่มนี้ปุ๊บ หน้าเว็บจะหยุดรับออเดอร์ใหม่ทันที แต่คนที่มีบัตรอยู่แล้วยังสแกนเข้างานได้ตามปกติ พอโต๊ะเริ่มว่าง สตาฟก็กดเปิดขายต่อได้ทันทีครับ"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • คลิกสวิตช์ใน Mockup เพื่อโชว์การสลับระหว่าง ปิดรับออเดอร์ (ON) และ เปิดขายปกติ (OFF)<br>
            • ชี้ให้เห็นว่าคนที่มีตั๋วแล้วยังเข้างานได้ตามปกติ ไม่กระทบสิทธิ์เดิม<br>
            • เปิดขายต่อได้ทันทีโดยไม่ต้อง Restart Server หรือแก้โค้ด
          </div>\`,
          grillMe: {
            q: "ปุ่ม Killswitch ร้านเต็มชั่วคราว (venue_status.is_full) ตัดการทำงานส่วนไหนบ้าง และทำไมไม่บล็อกคนที่มีตั๋วแล้วไม่ให้เข้างาน?",
            a: "สวิตช์ Killswitch ถูกออกแบบมาเพื่อ Crowd Control จะตัดเฉพาะเส้นทางสร้างคำสั่งซื้อใหม่ (POST /api/orders) และบล็อกปุ่มสั่งซื้อในหน้า /buy ทันที แต่ไม่แตะต้องระบบสแกนตั๋ว (/api/scan) หรือหน้าดูตั๋ว (/orders) เพราะคนที่ซื้อตั๋วถูกต้องล่วงหน้าย่อมมีสิทธิ์เข้างานเสมอ และเมื่อมีลูกค้าเช็คบิลออกจากร้าน สตาฟสามารถกดปิดสวิตช์เพื่อให้ระบบเปิดรับออเดอร์ใหม่ได้ทันทีโดยไม่ต้อง Restart Server หรือแก้โค้ด"
          }
        },
        {
          slide: 12,
          title: "สไลด์ที่ 12: ฟีเจอร์ที่ 6 — ระบบขายบัตรหน้างาน (Walk-up Onsite Sales)",
          text: \`<blockquote>"ฟีเจอร์ที่หกคือระบบขายตั๋วหน้างานครับ เพราะในงานจริงมีคนเดินวอล์กอินเข้ามาซื้อหน้างานเยอะมาก สตาฟสามารถกดเปิดหน้านี้ เลือกจำนวนใบ เลือกว่าจ่ายเงินสดหรือพร้อมเพย์ แล้วกดยืนยัน ระบบจะตัดตั๋วและเช็คอินให้อัตโนมัติทันที สตาฟก็สวมสายรัดข้อมือให้ลูกค้าเดินเข้าร้านได้เลย รวดเร็วและเก็บยอดเงินได้ครบถ้วนครับ"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • คลิกเลือกจำนวน 1, 2, 3 ใบ (49฿, 98฿, 147฿) และสลับระหว่าง 'เงินสด' กับ 'พร้อมเพย์'<br>
            • One-click checkout: ออกตั๋ว + อนุมัติ + เช็คอิน พร้อมกันในคลิกเดียว<br>
            • แดชบอร์ดสรุปยอดแยกประเภทชัดเจน: เงินโอนออนไลน์ vs เงินสดหน้างาน
          </div>\`,
          grillMe: {
            q: "ทำไมระบบ Walk-up Sales ถึงต้องทำเป็น One-Click และป้องกันสตาฟทุจริตเงินสดหน้าร้านได้อย่างไร?",
            a: "บรรยากาศหน้าประตูร้านเสียงเพลงดังมากและมีคนต่อคิว การมีปุ่มลัด 1 ใบ (49฿), 2 ใบ (98฿), 3 ใบ (147฿) แล้วคลิกเดียวออกตั๋ว + อนุมัติ + เช็คอินแจก Wristband ช่วยระบายคิวใน 5 วินาที ส่วนการป้องกันทุจริตเงินสด ระบบผูกทุกรายการกับ Staff Session บันทึกเวลา และสรุปยอดเงินสดแยกจากเงินโอนอย่างชัดเจนในแดชบอร์ด โดยนำจำนวนเงินสดที่ได้มาเทียบกับจำนวนสายรัดข้อมือ (Wristband Count) ที่สตาฟเบิกไป หากยอดเงินไม่ตรงกับสายรัดข้อมือที่หายไปจะตรวจพบได้ทันที"
          }
        },
        {
          slide: 13,
          title: "สไลด์ที่ 13: สรุปภาพรวมการเชื่อมโยงทั้งระบบ (End-to-End Diagram)",
          text: \`<blockquote>"สไลด์นี้สรุปภาพใหญ่ให้เพื่อนๆ เห็นทั้งหมดครับ ฝั่งซ้ายคือผู้ซื้อที่ทำรายการผ่านมือถือ ข้อมูลทั้งหมดจะวิ่งเข้าไปที่ฐานข้อมูล Supabase ตรงกลาง แล้วฝั่งขวาคือสตาฟที่ใช้มือถือคนละเครื่อง คอยตรวจสลิป สแกนตั๋วหน้าประตู และควบคุมสวิตช์ร้านเต็ม ทุกส่วนทำงานแบบเรียลไทม์เชื่อมถึงกันหมดอย่างราบรื่นครับ"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • ชี้ตาม Flow: Buyer ➔ Next.js on Vercel ➔ Supabase Cloud ➔ Staff & Gmail SMTP<br>
            • อธิบาย 4 ตารางหลัก: orders, payments, tickets, venue_status และ Storage 'slips'<br>
            • ระบบเชื่อมถึงกันแบบ Realtime ทั่วทั้งงาน
          </div>\`,
          grillMe: {
            q: "ถ้าฐานข้อมูล Supabase เกิดขัดข้องหรือ Down ไปชั่วขณะ ระบบมีแผนรับมือฉุกเฉิน (Fallback Plan) อย่างไร?",
            a: "ระบบออกแบบตามหลัก Fail-Closed เพื่อความปลอดภัย: API Routes จะส่ง HTTP 503 Service Unavailable แจ้งเตือนลูกค้าอย่างสุภาพ แทนที่จะปล่อยให้ออเดอร์ค้างคา ส่วนหน้างานสตาฟมี Offline Export Manifest (ไฟล์สำรองรายชื่อและโค้ดตั๋วที่ export ไว้ล่วงหน้า) ซึ่งสตาฟสามารถใช้หน้า /staff/search แบบ Local Cache ค้นหาชื่อและเบอร์โทรเพื่อติ๊กรับสายรัดข้อมือเข้างานได้ต่อเนื่องโดยไม่สะดุดแม้คลาวด์จะขัดข้อง"
          }
        },
        {
          slide: 14,
          title: "สไลด์ที่ 14: สรุปสิ่งที่ได้เรียนรู้และนำไปต่อยอด (Key Takeaways)",
          text: \`<blockquote>"สรุปแล้ว การสร้างเว็บไซต์นี้ทำให้เราได้เรียนรู้ว่า <strong>การทำเว็บที่ดี ไม่ใช่แค่หน้าตาดูสวย แต่คือการคิดเผื่อปัญหาหน้างานจริง</strong> ทั้งเรื่องการตรวจสลิป การกันคนโกง และการทำให้สตาฟทำงานได้เร็วที่สุดด้วยมือถือเครื่องเดียว หวังว่าสิ่งที่พวกเรานำเสนอในวันนี้จะช่วยให้เพื่อนๆ เห็นไอเดียและนำไปต่อยอดกับการทำโปรเจกต์ของตัวเองได้ครับ ขอบคุณครับ!"</blockquote>
          <div class="talking-points">
            <strong>💡 จุดเน้นสำหรับผู้บรรยาย:</strong><br>
            • สรุป 3 เสาหลัก: Mobile-First, Fraud Prevention, Real-World Operational Flexibility<br>
            • ย้ำว่าการเขียนโปรแกรมต้องตอบโจทย์ชีวิตจริงของผู้ใช้งาน<br>
            • ขอบคุณอาจารย์และเพื่อนๆ เปิดรับคำถามช่วง Q&A
          </div>\`,
          grillMe: {
            q: "ตัวเลขสถิติ 51 ใบ เช็คอิน 96.1% สกัดสลิปซ้ำ 100% พิสูจน์ความคุ้มค่าของการพัฒนาระบบนี้อย่างไรเมื่อเทียบกับต้นทุน?",
            a: "ต้นทุนโครงสร้างพื้นฐานของระบบนี้คือ 0 บาท (Zero Dollar Tech Stack): Vercel Hobby Tier ฟรี, Supabase Free Tier ฟรี, Gmail SMTP ฟรี ในขณะที่งานจริงครั้งที่ 1 และ 2 ขายบัตรได้ครบ 51 ใบ มีผู้เข้างานจริง 49 คน (96.1%) ตรวจพบความพยายามส่งสลิปซ้ำ 2 ครั้งและระบบสกัดได้ 100% สตาฟหน้างานใช้เวลาตรวจตั๋วเฉลี่ยเพียง 1.2 วินาทีต่อคน ไม่เกิดปัญหาคิวหน้าประตูล้นออกไปบนถนน และเงินรายได้เข้าบัญชีร้านเต็มเม็ดเต็มหน่วย 100% พิสูจน์ว่าสถาปัตยกรรมระดับโปรดักชันสามารถสร้างขึ้นได้ด้วยงบประหยัดแต่มีเสถียรภาพสูงสุด"
          }
        }
      ];`;

// Replace const speakerNotes = [...]
const notesBlockRegex = /const speakerNotes = \[[\s\S]*?\];/;
if (notesBlockRegex.test(html)) {
  html = html.replace(notesBlockRegex, speakerNotesJs);
  console.log('✓ Updated speakerNotes array with grillMe object for all 14 slides');
}

// 7. Update script state & functions for tab switching, clipboard fallback, shortcuts modal
const scriptAdditions = `
      // Speaker Notes Mode State ('speech' or 'grill')
      let notesMode = 'speech';
      const btnTabSpeech = document.getElementById('btn-tab-speech');
      const btnTabGrill = document.getElementById('btn-tab-grill');

      const shortcutsModal = document.getElementById('shortcuts-modal');
      const btnShortcutsHelp = document.getElementById('btn-shortcuts-help');
      const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');

      function toggleShortcutsModal(forceState) {
        if (!shortcutsModal) return;
        const isOpen = shortcutsModal.classList.contains('open');
        const shouldOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
        shortcutsModal.classList.toggle('open', shouldOpen);
      }

      if (btnShortcutsHelp) {
        btnShortcutsHelp.addEventListener('click', (e) => {
          e.currentTarget.blur();
          toggleShortcutsModal(true);
        });
      }
      if (btnCloseShortcuts) {
        btnCloseShortcuts.addEventListener('click', () => {
          toggleShortcutsModal(false);
        });
      }
      if (shortcutsModal) {
        shortcutsModal.addEventListener('click', (e) => {
          if (e.target === shortcutsModal) toggleShortcutsModal(false);
        });
      }

      if (btnTabSpeech && btnTabGrill) {
        btnTabSpeech.addEventListener('click', () => {
          notesMode = 'speech';
          btnTabSpeech.classList.add('active');
          btnTabGrill.classList.remove('active');
          updateSpeakerNotes();
        });
        btnTabGrill.addEventListener('click', () => {
          notesMode = 'grill';
          btnTabGrill.classList.add('active');
          btnTabSpeech.classList.remove('active');
          updateSpeakerNotes();
        });
      }

      // Robust Clipboard with Fallback for file:// protocol and offline browsers
      function copyToClipboard(text, successMessage) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            showToast(successMessage);
          }).catch(() => {
            fallbackCopy(text, successMessage);
          });
        } else {
          fallbackCopy(text, successMessage);
        }
      }

      function fallbackCopy(text, successMessage) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          showToast(successMessage);
        } catch (err) {
          showToast('คัดลอก: ' + text);
        }
        document.body.removeChild(ta);
      }
`;

// Insert script additions before updateSpeakerNotes
html = html.replace('      // Speaker Notes\n      function updateSpeakerNotes() {', `${scriptAdditions}\n      // Speaker Notes\n      function updateSpeakerNotes() {`);

// Update updateSpeakerNotes function to render based on notesMode
const oldUpdateNotes = `      // Speaker Notes
      function updateSpeakerNotes() {
        const noteData = speakerNotes.find(n => n.slide === currentSlide);
        if (noteData) {
          notesTitleEl.textContent = noteData.title;
          notesContentEl.innerHTML = noteData.text;
          notesContentEl.style.fontSize = \`\${notesFontSize}px\`;
        } else {
          notesTitleEl.textContent = \`สไลด์ที่ \${currentSlide}\`;
          notesContentEl.innerHTML = "<p>ไม่มีบทพูดสำหรับสไลด์นี้</p>";
        }
      }`;

const newUpdateNotes = `      // Speaker Notes
      function updateSpeakerNotes() {
        const noteData = speakerNotes.find(n => n.slide === currentSlide);
        if (noteData) {
          notesTitleEl.textContent = noteData.title;
          if (notesMode === 'speech') {
            notesContentEl.innerHTML = noteData.text;
          } else {
            notesContentEl.innerHTML = \`
              <div class="grill-card">
                <div class="grill-q-title">
                  <span>❓</span>
                  <span>คำถามที่คาดว่าจะถูกซักถามเจาะลึก (Grill-Me):</span>
                </div>
                <div class="grill-q-text">\${noteData.grillMe.q}</div>
                <div class="grill-a-title">
                  <span>🛡️</span>
                  <span>แนวทางการตอบโต้เชิงสถาปัตยกรรม (Defense Script):</span>
                </div>
                <div class="grill-a-text">\${noteData.grillMe.a}</div>
              </div>
            \`;
          }
          notesContentEl.style.fontSize = \`\${notesFontSize}px\`;
        } else {
          notesTitleEl.textContent = \`สไลด์ที่ \${currentSlide}\`;
          notesContentEl.innerHTML = "<p>ไม่มีบทพูดสำหรับสไลด์นี้</p>";
        }
      }`;

if (html.includes(oldUpdateNotes)) {
  html = html.replace(oldUpdateNotes, newUpdateNotes);
  console.log('✓ Updated updateSpeakerNotes function to support Grill-Me tab rendering');
}

// Update copy button listeners to use copyToClipboard
const oldCopyListeners = `      // Copy Notes
      btnCopyNotes.addEventListener('click', () => {
        const textToCopy = notesContentEl.innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
          showToast('✓ คัดลอกบทพูดสไลด์เรียบร้อย!');
        });
      });

      // Copy Bank & PromptPay Listeners
      const btnCopyKbank = document.getElementById('btn-copy-kbank');
      if (btnCopyKbank) {
        btnCopyKbank.addEventListener('click', () => {
          navigator.clipboard.writeText('xxxxxxxxx').then(() => {
            showToast('✓ คัดลอกเลขบัญชีกสิกรไทยแล้ว (xxxxxxxxx)');
          });
        });
      }
      const btnCopyPromptpay = document.getElementById('btn-copy-promptpay');
      if (btnCopyPromptpay) {
        btnCopyPromptpay.addEventListener('click', () => {
          navigator.clipboard.writeText('081-234-5678').then(() => {
            showToast('✓ คัดลอก PromptPay ID แล้ว (081-234-5678)');
          });
        });
      }`;

const newCopyListeners = `      // Copy Notes (Active mode: speech or grill)
      btnCopyNotes.addEventListener('click', () => {
        const textToCopy = notesContentEl.innerText;
        copyToClipboard(textToCopy, notesMode === 'speech' ? '✓ คัดลอกบทพูดสไลด์เรียบร้อย!' : '✓ คัดลอกแนวทางตอบ Grill-Me เรียบร้อย!');
      });

      // Copy Bank & PromptPay Listeners with offline fallback
      const btnCopyKbank = document.getElementById('btn-copy-kbank');
      if (btnCopyKbank) {
        btnCopyKbank.addEventListener('click', () => {
          copyToClipboard('xxxxxxxxx', '✓ คัดลอกเลขบัญชีกสิกรไทยแล้ว (xxxxxxxxx)');
        });
      }
      const btnCopyPromptpay = document.getElementById('btn-copy-promptpay');
      if (btnCopyPromptpay) {
        btnCopyPromptpay.addEventListener('click', () => {
          copyToClipboard('081-234-5678', '✓ คัดลอก PromptPay ID แล้ว (081-234-5678)');
        });
      }`;

if (html.includes(oldCopyListeners)) {
  html = html.replace(oldCopyListeners, newCopyListeners);
  console.log('✓ Updated copy listeners with robust fallback');
}

// Update keydown handler to support 'm', 'M', '?', '/', and Escape handling
const oldKeydownHandler = `          case 'g':
          case 'G':
            e.preventDefault();
            toggleGridModal();
            break;
          case 'f':
          case 'F':
            e.preventDefault();
            toggleFullscreen();
            break;
          case 'Escape':
            toggleGridModal(false);
            toggleSpeakerNotes(false);
            break;`;

const newKeydownHandler = `          case 'g':
          case 'G':
          case 'm':
          case 'M':
            e.preventDefault();
            toggleGridModal();
            break;
          case '?':
          case '/':
            e.preventDefault();
            toggleShortcutsModal();
            break;
          case 'f':
          case 'F':
            e.preventDefault();
            toggleFullscreen();
            break;
          case 'Escape':
            toggleGridModal(false);
            toggleShortcutsModal(false);
            toggleSpeakerNotes(false);
            break;`;

if (html.includes(oldKeydownHandler)) {
  html = html.replace(oldKeydownHandler, newKeydownHandler);
  console.log('✓ Updated keyboard shortcuts listener with m/M and ? support');
}

fs.writeFileSync('presentation-slides.html', html, 'utf8');
console.log('Successfully saved all updates to presentation-slides.html!');
