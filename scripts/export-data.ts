import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function parseEnv(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return "";
    let str = typeof val === "object" ? JSON.stringify(val) : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.join(",");
  const dataLines = rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(","));
  return "\uFEFF" + [headerLine, ...dataLines].join("\n");
}

async function main() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const env = parseEnv(envPath);
  const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseKey = env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials in .env.local");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Fetching data from Supabase...");

  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: true });
  if (ordersErr) throw ordersErr;

  const { data: payments, error: paymentsErr } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: true });
  if (paymentsErr) throw paymentsErr;

  const { data: tickets, error: ticketsErr } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: true });
  if (ticketsErr) throw ticketsErr;

  const { data: venueStatus, error: venueErr } = await supabase
    .from("venue_status")
    .select("*");
  if (venueErr) console.warn("Could not fetch venue_status:", venueErr.message);

  const { data: auditLogs, error: auditErr } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: true });
  if (auditErr) console.warn("Could not fetch audit_log:", auditErr.message);

  const exportsDir = path.resolve(process.cwd(), "exports");
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  // 1. Save CSVs
  fs.writeFileSync(path.join(exportsDir, "orders.csv"), toCsv(orders || []), "utf-8");
  fs.writeFileSync(path.join(exportsDir, "payments.csv"), toCsv(payments || []), "utf-8");
  fs.writeFileSync(path.join(exportsDir, "tickets.csv"), toCsv(tickets || []), "utf-8");
  if (auditLogs && auditLogs.length > 0) {
    fs.writeFileSync(path.join(exportsDir, "audit_log.csv"), toCsv(auditLogs), "utf-8");
  }

  // 2. Save full JSON backup
  const fullBackup = {
    exported_at: new Date().toISOString(),
    orders: orders || [],
    payments: payments || [],
    tickets: tickets || [],
    venue_status: venueStatus || [],
    audit_logs: auditLogs || [],
  };
  fs.writeFileSync(
    path.join(exportsDir, "full_backup.json"),
    JSON.stringify(fullBackup, null, 2),
    "utf-8"
  );

  // 3. Compute Metrics
  const orderList = orders || [];
  const paymentList = payments || [];
  const ticketList = tickets || [];

  const totalOrders = orderList.length;
  const paidOrders = orderList.filter((o) => o.status === "paid");
  const pendingOrders = orderList.filter((o) => o.status === "pending_payment");
  const underReviewOrders = orderList.filter((o) => o.status === "under_review");
  const cancelledOrders = orderList.filter((o) => o.status === "cancelled");

  // Approved payments
  const approvedPayments = paymentList.filter((p) => p.status === "approved");
  const totalRevenue = approvedPayments.reduce((acc, p) => acc + Number(p.amount_thb || 0), 0);

  // Walk-up vs Online
  const walkUpPayments = approvedPayments.filter(
    (p) => p.to_bank === "CASH_ONSITE" || p.to_bank === "PROMPTPAY_ONSITE"
  );
  const onlinePayments = approvedPayments.filter(
    (p) => p.to_bank !== "CASH_ONSITE" && p.to_bank !== "PROMPTPAY_ONSITE"
  );

  const cashOnsiteRevenue = walkUpPayments
    .filter((p) => p.to_bank === "CASH_ONSITE")
    .reduce((acc, p) => acc + Number(p.amount_thb || 0), 0);
  const promptPayOnsiteRevenue = walkUpPayments
    .filter((p) => p.to_bank === "PROMPTPAY_ONSITE")
    .reduce((acc, p) => acc + Number(p.amount_thb || 0), 0);
  const onlineRevenue = onlinePayments.reduce((acc, p) => acc + Number(p.amount_thb || 0), 0);

  // Tickets
  const totalTickets = ticketList.length;
  const checkedInTickets = ticketList.filter((t) => t.status === "checked_in").length;
  const issuedTickets = ticketList.filter((t) => t.status === "issued").length;
  const voidTickets = ticketList.filter((t) => t.status === "void").length;
  const checkInRate = totalTickets > 0 ? ((checkedInTickets / totalTickets) * 100).toFixed(1) : "0.0";

  // Report markdown
  const reportMd = `# รายงานสรุปผลการจัดงาน — งานลาบแรกพบ ครั้งที่ 2
วันที่สรุปข้อมูล: ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}

---

## 1. ข้อมูลสรุปยอดรวม (Executive Summary)

| รายการ | จำนวน / ยอดเงิน |
|---|---|
| **รายได้รวมทั้งหมด (Total Confirmed Revenue)** | **${totalRevenue.toLocaleString()} บาท** |
| ├ รายได้จากการซื้อบัตรออนไลน์ (PromptPay / Bank Transfer) | ${onlineRevenue.toLocaleString()} บาท |
| ├ รายได้บัตรหน้างาน (เงินสด On-site Cash) | ${cashOnsiteRevenue.toLocaleString()} บาท |
| └ รายได้บัตรหน้างาน (สแกน PromptPay On-site) | ${promptPayOnsiteRevenue.toLocaleString()} บาท |
| **จำนวนบัตรทั้งหมดที่ออก (Total Tickets Issued)** | **${totalTickets.toLocaleString()} ใบ** |
| **จำนวนผู้เข้างานจริง (Checked-in Wristbands)** | **${checkedInTickets.toLocaleString()} คน (${checkInRate}%)** |
| จำนวนบัตรที่ไม่ได้มาแสดงตัว (Issued / Unused) | ${issuedTickets.toLocaleString()} ใบ |
| จำนวนบัตรที่ถูกยกเลิก (Void) | ${voidTickets.toLocaleString()} ใบ |

---

## 2. สถานะคำสั่งซื้อ (Orders Breakdown)

| สถานะออเดอร์ | จำนวนออเดอร์ | ร้อยละ |
|---|---|---|
| **ชำระเงินเรียบร้อย (Paid)** | **${paidOrders.length} รายการ** | ${totalOrders > 0 ? ((paidOrders.length / totalOrders) * 100).toFixed(1) : 0}% |
| รอชำระเงิน / หมดเวลา (Pending Payment) | ${pendingOrders.length} รายการ | ${totalOrders > 0 ? ((pendingOrders.length / totalOrders) * 100).toFixed(1) : 0}% |
| อยู่ระหว่างตรวจสลิป (Under Review) | ${underReviewOrders.length} รายการ | ${totalOrders > 0 ? ((underReviewOrders.length / totalOrders) * 100).toFixed(1) : 0}% |
| ยกเลิกคำสั่งซื้อ (Cancelled) | ${cancelledOrders.length} รายการ | ${totalOrders > 0 ? ((cancelledOrders.length / totalOrders) * 100).toFixed(1) : 0}% |
| **รวมคำสั่งซื้อทั้งหมด** | **${totalOrders} รายการ** | **100%** |

---

## 3. รายการไฟล์ข้อมูลที่ส่งออก (Exported Files)

- \`exports/orders.csv\` — ข้อมูลคำสั่งซื้อทั้งหมด
- \`exports/payments.csv\` — ข้อมูลสลิปและการชำระเงิน
- \`exports/tickets.csv\` — ข้อมูลบัตร QR Code และสถานะการเช็คอินเข้างาน
- \`exports/full_backup.json\` — ข้อมูลสำรองฉบับสมบูรณ์ (JSON)
`;

  fs.writeFileSync(path.join(exportsDir, "EVENT_SUMMARY_REPORT.md"), reportMd, "utf-8");

  console.log("Export completed successfully!");
  console.log(`- Orders: ${totalOrders}`);
  console.log(`- Revenue: ${totalRevenue} THB`);
  console.log(`- Tickets: ${totalTickets} (Checked-in: ${checkedInTickets})`);
}

main().catch((err) => {
  console.error("Export error:", err);
  process.exit(1);
});
