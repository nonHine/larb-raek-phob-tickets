const fs = require('fs');

const html = fs.readFileSync('presentation-slides.html', 'utf8');
const md = fs.readFileSync('PRESENTATION_SLIDES.md', 'utf8');

console.log('=== AUDITING REQUIREMENTS IN HTML & MD ===\n');

const checks = [
  { name: 'Ticket price 49 THB', pattern: /49/ },
  { name: 'KBANK xxx-x-xxxxx-x', pattern: /xxx-x-xxxxx-x/ },
  { name: 'KBANK raw xxxxxxxxx', pattern: /xxxxxxxxx/ },
  { name: 'Account name บัญชีทางการ งานลาบแรกพบ', pattern: /ผู้จัดงาน\s*ทางการ/ },
  { name: 'PromptPay ID 081-234-5678', pattern: /081-234-5678/ },
  { name: 'QR Reference 000000000000000', pattern: /000000000000000/ },
  { name: 'promptpay-qr EMVCo payload', pattern: /promptpay-qr/ },
  { name: 'EMVCo payload mention', pattern: /EMVCo/i },
  { name: 'crypto.randomBytes(16)', pattern: /randomBytes\(16\)/ },
  { name: '32 hex characters / characters', pattern: /32/ },
  { name: 'html5-qrcode', pattern: /html5-qrcode/ },
  { name: 'Atomic check-in', pattern: /Atomic\s*(check-in|เช็คอิน)/i },
  { name: 'nodemailer Gmail SMTP smtp.gmail.com:465', pattern: /smtp\.gmail\.com/ },
  { name: 'App Password 16 digits/chars', pattern: /16/ },
  { name: 'Inline CID attachment (cid:ticket-)', pattern: /cid:/ },
  { name: 'QRCode.toBuffer', pattern: /toBuffer/ },
  { name: '5 email types: order_created', pattern: /order_created/ },
  { name: '5 email types: slip_received', pattern: /slip_received/ },
  { name: '5 email types: paid', pattern: /paid/ },
  { name: '5 email types: partial_approval', pattern: /partial_approval/ },
  { name: '5 email types: slip_rejected', pattern: /slip_rejected/ },
  { name: 'Error handling: auth_failed', pattern: /auth_failed/ },
  { name: 'Error handling: provider_error', pattern: /provider_error/ },
  { name: 'Error handling: quota / rate limit', pattern: /quota|rate limit/i },
  { name: 'Next.js 14 App Router', pattern: /Next\.js\s*14/i },
  { name: 'TypeScript + Tailwind CSS', pattern: /TypeScript/i },
  { name: 'GitHub source code', pattern: /GitHub/i },
  { name: 'Vercel Serverless + Edge CDN', pattern: /Vercel/i },
  { name: 'Supabase PostgreSQL + Storage slips', pattern: /Supabase/i },
  { name: 'Bucket slips', pattern: /'slips'|"slips"|slips bucket/i },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', pattern: /NEXT_PUBLIC_SUPABASE_URL/ },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', pattern: /NEXT_PUBLIC_SUPABASE_ANON_KEY/ },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', pattern: /SUPABASE_SERVICE_ROLE_KEY/ },
  { name: 'SMTP_USER', pattern: /SMTP_USER/ },
  { name: 'SMTP_PASS', pattern: /SMTP_PASS/ },
  { name: 'PROMPTPAY_ID', pattern: /PROMPTPAY_ID/ },
  { name: 'SHA-256 Duplicate Slip Detection', pattern: /SHA-256/i },
  { name: 'Web Audio API chime / sound', pattern: /Web Audio/i },
  { name: 'Killswitch venue_status.is_full', pattern: /venue_status\.is_full|killswitch/i },
  { name: 'Walk-up Onsite Ticket Sale', pattern: /walk-up|ขายบัตรหน้างาน/i },
];

console.log('--- Checking in HTML: ---');
checks.forEach(c => {
  const found = c.pattern.test(html);
  console.log(`[HTML] ${c.name}: ${found ? 'PASS' : 'FAIL'}`);
});

console.log('\n--- Checking in MD: ---');
checks.forEach(c => {
  const found = c.pattern.test(md);
  console.log(`[MD] ${c.name}: ${found ? 'PASS' : 'FAIL'}`);
});
