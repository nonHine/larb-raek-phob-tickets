import { NextResponse } from "next/server";
import { engine } from "@/lib/engine";

export const dynamic = "force-dynamic";

function extractCodes(raw: string): {
  ticketCode: string | null;
  orderCode: string | null;
  cleanRaw: string;
} {
  const trimmed = (raw || "").trim();
  // Match 32 hex chars ticket code (case-insensitive)
  const ticketMatch =
    trimmed.match(/\b([0-9a-fA-F]{32})\b/) || trimmed.match(/([0-9a-fA-F]{32})/);
  // Match LRP-XXXXXX order code
  const orderMatch = trimmed.match(/LRP-[0-9a-zA-Z]{5,8}/i);

  return {
    ticketCode: ticketMatch ? ticketMatch[1].toUpperCase() : null,
    orderCode: orderMatch ? orderMatch[0].toUpperCase() : null,
    cleanRaw: trimmed.toUpperCase(),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ticket_code, action, order_id, order_code, staff_id } = body;
    const actorId = staff_id || "staff-gate-1";

    // 1. Batch check-in all issued tickets for an order
    if (action === "check_in_all") {
      let targetOrderId = order_id;
      if (!targetOrderId && order_code) {
        const order = await engine.getOrderByCode(order_code.trim().toUpperCase());
        if (order) targetOrderId = order.id;
      }

      if (!targetOrderId) {
        return NextResponse.json(
          { error: "order_not_found", message: "ไม่พบรหัสออเดอร์สำหรับเช็กอินยกกลุ่ม" },
          { status: 404 }
        );
      }

      const batchRes = await engine.checkInTicketsForOrder(targetOrderId, actorId);
      if (!batchRes.success || !batchRes.order) {
        return NextResponse.json(
          { error: "order_not_found", message: "ไม่พบคำสั่งซื้อนี้ในระบบ" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `เช็กอินสำเร็จ ${batchRes.checkedInCount} ใบ — ให้ wristband แล้ว!`,
        order: batchRes.order,
        tickets: batchRes.tickets,
        checked_in_count: batchRes.checkedInCount,
        already_checked_in_count: batchRes.alreadyCheckedInCount,
      });
    }

    // 2. Validate input for single / QR scan
    if (!ticket_code || !String(ticket_code).trim()) {
      return NextResponse.json(
        { error: "invalid_ticket", message: "ไม่พบรหัสบัตรหรือ QR Code" },
        { status: 400 }
      );
    }

    const { ticketCode, orderCode, cleanRaw } = extractCodes(String(ticket_code));

    // 3. Attempt direct ticket check-in if candidate 32-hex ticket code is present
    if (ticketCode) {
      const directTicket = await engine.getTicketByCode(ticketCode);
      if (directTicket) {
        const res = await engine.checkInTicket(ticketCode, actorId);

        if (!res.success) {
          if (res.error === "already_checked_in") {
            const timeStr = res.checked_in_at
              ? new Date(res.checked_in_at).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "ก่อนหน้านี้";

            const order = await engine.getOrderById(directTicket.order_id);

            return NextResponse.json(
              {
                error: "already_checked_in",
                message: `บัตรนี้เข้างานแล้วเมื่อ ${timeStr}`,
                checked_in_at: res.checked_in_at,
                checked_in_by: res.checked_in_by,
                ticket: res.ticket || directTicket,
                order,
              },
              { status: 409 }
            );
          }

          if (res.error === "void_ticket") {
            return NextResponse.json(
              {
                error: "void_ticket",
                message: "บัตรนี้ถูกยกเลิกแล้ว (โมฆะ)",
                ticket: directTicket,
              },
              { status: 400 }
            );
          }
        } else {
          const order = await engine.getOrderById(res.ticket.order_id);
          return NextResponse.json({
            success: true,
            message: "เช็กอินสำเร็จ — ให้ wristband แล้ว",
            ticket: {
              code: res.ticket.code,
              holder_name: res.ticket.holder_name || order?.buyer_name,
              order_code: order?.code,
              checked_in_at: res.ticket.checked_in_at,
            },
            order,
          });
        }
      }
    }

    // 4. If not a direct ticket code, check if it matches an Order Code / URL
    const targetOrderCode = orderCode || (cleanRaw.startsWith("LRP-") ? cleanRaw : null);
    if (targetOrderCode) {
      const order = await engine.getOrderByCode(targetOrderCode);
      if (order) {
        if (order.status === "cancelled") {
          return NextResponse.json(
            {
              error: "void_ticket",
              message: `ออเดอร์ ${order.code} ถูกยกเลิกแล้ว (โมฆะ)`,
              order,
            },
            { status: 400 }
          );
        }

        if (order.status !== "paid") {
          const statusText =
            order.status === "under_review"
              ? "รอตรวจสอบสลิป"
              : order.status === "pending_payment"
              ? "รอชำระเงิน"
              : order.status;

          return NextResponse.json(
            {
              error: "order_not_paid",
              message: `ออเดอร์ ${order.code} ยังไม่พร้อมเข้างาน (สถานะ: ${statusText})`,
              order,
            },
            { status: 400 }
          );
        }

        const tickets = await engine.getTicketsForOrder(order.id);
        if (tickets.length === 0) {
          return NextResponse.json(
            {
              error: "no_tickets",
              message: `ไม่พบตั๋วในออเดอร์ ${order.code}`,
              order,
            },
            { status: 400 }
          );
        }

        // Case 4A: Order has exactly 1 ticket -> auto check in immediately
        if (tickets.length === 1) {
          const singleT = tickets[0];
          if (singleT.status === "issued") {
            const checkInRes = await engine.checkInTicket(singleT.code, actorId);
            if (checkInRes.success) {
              return NextResponse.json({
                success: true,
                message: "เช็กอินสำเร็จ — ให้ wristband แล้ว",
                ticket: {
                  code: checkInRes.ticket.code,
                  holder_name: checkInRes.ticket.holder_name || order.buyer_name,
                  order_code: order.code,
                  checked_in_at: checkInRes.ticket.checked_in_at,
                },
                order,
              });
            }
          }

          if (singleT.status === "checked_in") {
            const timeStr = singleT.checked_in_at
              ? new Date(singleT.checked_in_at).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "ก่อนหน้านี้";

            return NextResponse.json(
              {
                error: "already_checked_in",
                message: `บัตรออเดอร์นี้ (${order.code}) เข้างานแล้วเมื่อ ${timeStr}`,
                checked_in_at: singleT.checked_in_at,
                checked_in_by: singleT.checked_in_by,
                ticket: singleT,
                order,
              },
              { status: 409 }
            );
          }
        }

        // Case 4B: Order has multiple tickets -> return multi-ticket inspectable response
        const issuedTickets = tickets.filter((t) => t.status === "issued");
        const checkedInTickets = tickets.filter((t) => t.status === "checked_in");

        if (issuedTickets.length === 0) {
          return NextResponse.json(
            {
              error: "already_checked_in",
              message: `บัตรทั้งหมด ${tickets.length} ใบในออเดอร์นี้ (${order.code}) เข้างานครบแล้ว`,
              order,
              tickets,
            },
            { status: 409 }
          );
        }

        return NextResponse.json({
          success: true,
          is_order: true,
          message: `พบออเดอร์ ${order.code} (${order.buyer_name}) มีบัตรทั้งหมด ${tickets.length} ใบ`,
          order: {
            id: order.id,
            code: order.code,
            buyer_name: order.buyer_name,
            phone: order.phone,
            quantity: order.quantity,
          },
          tickets: tickets.map((t) => ({
            id: t.id,
            code: t.code,
            holder_name: t.holder_name || order.buyer_name,
            status: t.status,
            checked_in_at: t.checked_in_at,
            checked_in_by: t.checked_in_by,
          })),
          issued_count: issuedTickets.length,
          checked_in_count: checkedInTickets.length,
        });
      }
    }

    // 5. Final fallback: try raw code directly on checkInTicket
    const fallbackRes = await engine.checkInTicket(cleanRaw, actorId);
    if (fallbackRes.success) {
      const order = await engine.getOrderById(fallbackRes.ticket.order_id);
      return NextResponse.json({
        success: true,
        message: "เช็กอินสำเร็จ — ให้ wristband แล้ว",
        ticket: {
          code: fallbackRes.ticket.code,
          holder_name: fallbackRes.ticket.holder_name || order?.buyer_name,
          order_code: order?.code,
          checked_in_at: fallbackRes.ticket.checked_in_at,
        },
        order,
      });
    }

    if (fallbackRes.error === "already_checked_in") {
      const timeStr = fallbackRes.checked_in_at
        ? new Date(fallbackRes.checked_in_at).toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "ก่อนหน้านี้";

      return NextResponse.json(
        {
          error: "already_checked_in",
          message: `บัตรนี้เข้างานแล้วเมื่อ ${timeStr}`,
          checked_in_at: fallbackRes.checked_in_at,
          checked_in_by: fallbackRes.checked_in_by,
          ticket: fallbackRes.ticket,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "invalid_ticket",
        message: "บัตรไม่ถูกต้อง หรือไม่พบในระบบ",
        scanned_code: cleanRaw,
      },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("API /api/staff/scan exception:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process scan" },
      { status: 500 }
    );
  }
}
