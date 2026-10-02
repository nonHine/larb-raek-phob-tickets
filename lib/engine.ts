import { EVENT } from "@/config/event.config";
import {
  AuditLog,
  Order,
  OrderStatus,
  Payment,
  PaymentStatus,
  Ticket,
  VenueStatus,
} from "./types";
import crypto from "crypto";

export interface CreateOrderInput {
  buyer_name: string;
  phone: string;
  email: string;
  backup_contact?: string | null;
  quantity: number;
}

export interface AddPaymentInput {
  order_id: string;
  slip_path: string;
  slip_sha256: string;
  amount_thb: number;
  transferred_at: string;
  to_bank: string;
  payer_name_or_last4: string;
  slip_url?: string | null;
}

export class OrderEngine {
  // In-memory tables for local testing & development
  public orders: Map<string, Order> = new Map();
  public payments: Map<string, Payment> = new Map();
  public tickets: Map<string, Ticket> = new Map();
  public auditLogs: AuditLog[] = [];
  public venueStatus: VenueStatus = {
    id: 1,
    is_full: false,
    updated_by: null,
    updated_at: new Date().toISOString(),
  };

  // Mutex per order to simulate Postgres row locking (SELECT ... FOR UPDATE)
  private orderLocks: Map<string, Promise<void>> = new Map();

  private async acquireLock(key: string): Promise<() => void> {
    while (this.orderLocks.has(key)) {
      await this.orderLocks.get(key);
    }
    let resolveLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.orderLocks.set(key, lockPromise);

    return () => {
      this.orderLocks.delete(key);
      resolveLock();
    };
  }

  public reset() {
    this.orders.clear();
    this.payments.clear();
    this.tickets.clear();
    this.auditLogs = [];
    this.venueStatus = {
      id: 1,
      is_full: false,
      updated_by: null,
      updated_at: new Date().toISOString(),
    };
  }

  // --- Venue Status ---
  public async getVenueStatus(): Promise<VenueStatus> {
    return { ...this.venueStatus };
  }

  public async setVenueFull(is_full: boolean, staff_id: string): Promise<VenueStatus> {
    this.venueStatus = {
      id: 1,
      is_full,
      updated_by: staff_id,
      updated_at: new Date().toISOString(),
    };

    this.auditLogs.push({
      id: this.auditLogs.length + 1,
      actor: staff_id,
      action: is_full ? "venue_full_enabled" : "venue_full_disabled",
      entity: "venue_status",
      entity_id: null,
      meta: { is_full },
      created_at: new Date().toISOString(),
    });

    return { ...this.venueStatus };
  }

  // --- Order Creation ---
  public async createOrder(
    input: CreateOrderInput
  ): Promise<{ success: true; order: Order } | { success: false; error: string }> {
    // 1. Check venue status
    if (this.venueStatus.is_full) {
      return { success: false, error: "venue_full" };
    }

    // 2. Validate input
    if (!input.buyer_name || input.buyer_name.trim().length === 0) {
      return { success: false, error: "invalid_buyer_name" };
    }
    if (!/^0[0-9]{9}$/.test(input.phone)) {
      return { success: false, error: "invalid_phone" };
    }
    if (!input.email || !input.email.includes("@")) {
      return { success: false, error: "invalid_email" };
    }
    if (
      !input.quantity ||
      input.quantity < 1 ||
      input.quantity > EVENT.maxTicketsPerOrder
    ) {
      return { success: false, error: "invalid_quantity" };
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + EVENT.orderExpiryMinutes * 60 * 1000
    ).toISOString();

    const id = crypto.randomUUID();
    const randomCodeSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const code = `${EVENT.orderCodePrefix}-${randomCodeSuffix}`;
    const access_token = crypto.randomBytes(24).toString("hex");

    const order: Order = {
      id,
      code,
      access_token,
      buyer_name: input.buyer_name.trim(),
      phone: input.phone,
      email: input.email.trim(),
      backup_contact: input.backup_contact?.trim() || null,
      quantity: input.quantity,
      unit_price_thb: EVENT.ticketPriceThb,
      total_thb: input.quantity * EVENT.ticketPriceThb,
      status: "pending_payment",
      expires_at: expiresAt,
      consented_at: now.toISOString(),
      admin_note: null,
      created_at: now.toISOString(),
    };

    this.orders.set(id, order);

    return { success: true, order: { ...order } };
  }

  public async getOrderByCode(
    code: string,
    accessToken?: string
  ): Promise<Order | null> {
    for (const order of this.orders.values()) {
      if (order.code === code) {
        if (accessToken && order.access_token !== accessToken) {
          return null; // Token mismatch -> generic not found
        }
        return { ...order };
      }
    }
    return null;
  }

  public async getOrderById(id: string): Promise<Order | null> {
    const order = this.orders.get(id);
    return order ? { ...order } : null;
  }

  // --- Payments / Slips ---
  public async addPayment(input: AddPaymentInput): Promise<Payment> {
    const releaseLock = await this.acquireLock(input.order_id);
    try {
      const order = this.orders.get(input.order_id);
      if (!order) {
        throw new Error("Order not found");
      }

      const id = crypto.randomUUID();
      const payment: Payment = {
        id,
        order_id: input.order_id,
        slip_path: input.slip_path,
        slip_sha256: input.slip_sha256,
        amount_thb: input.amount_thb,
        transferred_at: input.transferred_at,
        to_bank: input.to_bank,
        payer_name_or_last4: input.payer_name_or_last4,
        status: "pending",
        reviewed_by: null,
        reviewed_at: null,
        reject_reason: null,
        slip_url: input.slip_url || null,
        created_at: new Date().toISOString(),
      };

      this.payments.set(id, payment);

      // Transition order to under_review if not paid/cancelled
      if (order.status === "pending_payment") {
        order.status = "under_review";
        this.orders.set(order.id, { ...order });
      }

      return { ...payment };
    } finally {
      releaseLock();
    }
  }

  public async getPaymentsForOrder(orderId: string): Promise<Payment[]> {
    const list: Payment[] = [];
    for (const p of this.payments.values()) {
      if (p.order_id === orderId) {
        list.push({ ...p });
      }
    }
    return list.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  public async findDuplicatePayments(sha256: string): Promise<Payment[]> {
    const list: Payment[] = [];
    for (const p of this.payments.values()) {
      if (p.slip_sha256 === sha256) {
        list.push({ ...p });
      }
    }
    return list;
  }

  // --- Payment Approval (Idempotent & Concurrency Safe) ---
  public async approvePayment(params: {
    payment_id: string;
    reviewer_id: string;
    corrected_amount?: number;
  }): Promise<
    | { success: true; payment: Payment; order: Order; ticketsIssued: number }
    | { success: false; error: "already_reviewed"; payment: Payment }
    | { success: false; error: string }
  > {
    const payment = this.payments.get(params.payment_id);
    if (!payment) {
      return { success: false, error: "payment_not_found" };
    }

    // Atomic update simulation: WHERE id = $1 AND status = 'pending'
    if (payment.status !== "pending") {
      return {
        success: false,
        error: "already_reviewed",
        payment: { ...payment },
      };
    }

    const releaseLock = await this.acquireLock(payment.order_id);
    try {
      // Re-check after lock
      const currentPayment = this.payments.get(params.payment_id)!;
      if (currentPayment.status !== "pending") {
        return {
          success: false,
          error: "already_reviewed",
          payment: { ...currentPayment },
        };
      }

      const approvedAmount =
        params.corrected_amount !== undefined
          ? params.corrected_amount
          : currentPayment.amount_thb;

      currentPayment.status = "approved";
      currentPayment.amount_thb = approvedAmount;
      currentPayment.reviewed_by = params.reviewer_id;
      currentPayment.reviewed_at = new Date().toISOString();
      this.payments.set(currentPayment.id, { ...currentPayment });

      // Audit log
      this.auditLogs.push({
        id: this.auditLogs.length + 1,
        actor: params.reviewer_id,
        action: "approve_payment",
        entity: "payment",
        entity_id: currentPayment.id,
        meta: { amount_thb: approvedAmount },
        created_at: new Date().toISOString(),
      });

      // Recalculate order status and issue tickets under row lock
      const { order, ticketsIssued } = await this.recomputeOrderStatusLocked(
        currentPayment.order_id
      );

      return {
        success: true,
        payment: { ...currentPayment },
        order,
        ticketsIssued,
      };
    } finally {
      releaseLock();
    }
  }

  // --- Payment Rejection ---
  public async rejectPayment(params: {
    payment_id: string;
    reviewer_id: string;
    reason: string;
  }): Promise<
    | { success: true; payment: Payment; order: Order }
    | { success: false; error: "already_reviewed"; payment: Payment }
    | { success: false; error: string }
  > {
    const payment = this.payments.get(params.payment_id);
    if (!payment) {
      return { success: false, error: "payment_not_found" };
    }

    if (payment.status !== "pending") {
      return {
        success: false,
        error: "already_reviewed",
        payment: { ...payment },
      };
    }

    const releaseLock = await this.acquireLock(payment.order_id);
    try {
      const currentPayment = this.payments.get(params.payment_id)!;
      if (currentPayment.status !== "pending") {
        return {
          success: false,
          error: "already_reviewed",
          payment: { ...currentPayment },
        };
      }

      currentPayment.status = "rejected";
      currentPayment.reject_reason = params.reason;
      currentPayment.reviewed_by = params.reviewer_id;
      currentPayment.reviewed_at = new Date().toISOString();
      this.payments.set(currentPayment.id, { ...currentPayment });

      this.auditLogs.push({
        id: this.auditLogs.length + 1,
        actor: params.reviewer_id,
        action: "reject_payment",
        entity: "payment",
        entity_id: currentPayment.id,
        meta: { reason: params.reason },
        created_at: new Date().toISOString(),
      });

      const { order } = await this.recomputeOrderStatusLocked(
        currentPayment.order_id
      );

      return {
        success: true,
        payment: { ...currentPayment },
        order,
      };
    } finally {
      releaseLock();
    }
  }

  // --- Recalculate Order Status & Issue Tickets (under lock) ---
  private async recomputeOrderStatusLocked(
    orderId: string
  ): Promise<{ order: Order; ticketsIssued: number }> {
    const order = this.orders.get(orderId)!;
    const orderPayments = await this.getPaymentsForOrder(orderId);

    const approvedSum = orderPayments
      .filter((p) => p.status === "approved")
      .reduce((sum, p) => sum + Number(p.amount_thb), 0);

    const hasPendingSlips = orderPayments.some((p) => p.status === "pending");
    let ticketsIssuedCount = 0;

    if (approvedSum >= order.total_thb) {
      // Order is fully paid
      order.status = "paid";
      order.expires_at = null; // Cleared

      // Check if overpaid
      if (approvedSum > order.total_thb) {
        order.admin_note = (order.admin_note ? order.admin_note + " " : "") +
          `[Overpaid: ${approvedSum} THB vs ${order.total_thb} THB]`;
      }

      // Issue tickets idempotently
      ticketsIssuedCount = await this.issueTicketsLocked(order);
    } else if (approvedSum > 0) {
      // Partially paid
      order.status = hasPendingSlips ? "under_review" : "pending_payment";
      order.expires_at = null; // Partially paid orders never show as expired!
    } else {
      // approvedSum == 0
      if (hasPendingSlips) {
        order.status = "under_review";
      } else {
        order.status = "pending_payment";
        // If rejected and no approved payments yet, restart expiry countdown
        const allRejected =
          orderPayments.length > 0 &&
          orderPayments.every((p) => p.status === "rejected");
        if (allRejected) {
          order.expires_at = new Date(
            Date.now() + EVENT.orderExpiryMinutes * 60 * 1000
          ).toISOString();
        }
      }
    }

    this.orders.set(order.id, { ...order });
    return { order: { ...order }, ticketsIssued: ticketsIssuedCount };
  }

  // --- Issue Tickets (Idempotent) ---
  private async issueTicketsLocked(order: Order): Promise<number> {
    const existingTickets = await this.getTicketsForOrder(order.id);
    const existingCount = existingTickets.length;
    const needed = order.quantity - existingCount;

    if (needed <= 0) {
      return 0;
    }

    for (let i = 0; i < needed; i++) {
      const ticketId = crypto.randomUUID();
      // Generate unguessable ticket code >= 16 characters
      const code = crypto.randomBytes(16).toString("hex").toUpperCase();
      const ticket: Ticket = {
        id: ticketId,
        order_id: order.id,
        code,
        holder_name: order.buyer_name,
        status: "issued",
        checked_in_at: null,
        checked_in_by: null,
        created_at: new Date().toISOString(),
      };
      this.tickets.set(ticketId, ticket);
    }

    return needed;
  }

  public async getTicketsForOrder(orderId: string): Promise<Ticket[]> {
    const list: Ticket[] = [];
    for (const t of this.tickets.values()) {
      if (t.order_id === orderId) {
        list.push({ ...t });
      }
    }
    return list;
  }

  public async getTicketByCode(code: string): Promise<Ticket | null> {
    for (const t of this.tickets.values()) {
      if (t.code === code) {
        return { ...t };
      }
    }
    return null;
  }

  // --- Ticket Scanner Check-in (Atomic) ---
  public async checkInTicket(
    code: string,
    staffId: string
  ): Promise<
    | { success: true; ticket: Ticket }
    | {
        success: false;
        error: "already_checked_in" | "void_ticket" | "invalid_ticket";
        ticket?: Ticket;
        checked_in_at?: string;
        checked_in_by?: string;
      }
  > {
    const ticket = await this.getTicketByCode(code);
    if (!ticket) {
      return { success: false, error: "invalid_ticket" };
    }

    // Atomic update simulation: WHERE code = $1 AND status = 'issued'
    if (ticket.status === "checked_in") {
      return {
        success: false,
        error: "already_checked_in",
        ticket: { ...ticket },
        checked_in_at: ticket.checked_in_at || undefined,
        checked_in_by: ticket.checked_in_by || undefined,
      };
    }

    if (ticket.status === "void") {
      return { success: false, error: "void_ticket", ticket: { ...ticket } };
    }

    // Success check in
    ticket.status = "checked_in";
    ticket.checked_in_at = new Date().toISOString();
    ticket.checked_in_by = staffId;
    this.tickets.set(ticket.id, { ...ticket });

    this.auditLogs.push({
      id: this.auditLogs.length + 1,
      actor: staffId,
      action: "check_in_ticket",
      entity: "ticket",
      entity_id: ticket.id,
      meta: { code: ticket.code },
      created_at: new Date().toISOString(),
    });

    return { success: true, ticket: { ...ticket } };
  }

  // --- Admin Cancel Order ---
  public async cancelOrder(
    orderId: string,
    staffId: string,
    reason?: string
  ): Promise<Order> {
    const releaseLock = await this.acquireLock(orderId);
    try {
      const order = this.orders.get(orderId);
      if (!order) throw new Error("Order not found");

      order.status = "cancelled";
      this.orders.set(order.id, { ...order });

      // Void all issued tickets
      for (const t of this.tickets.values()) {
        if (t.order_id === orderId) {
          t.status = "void";
          this.tickets.set(t.id, { ...t });
        }
      }

      this.auditLogs.push({
        id: this.auditLogs.length + 1,
        actor: staffId,
        action: "cancel_order",
        entity: "order",
        entity_id: orderId,
        meta: { reason },
        created_at: new Date().toISOString(),
      });

      return { ...order };
    } finally {
      releaseLock();
    }
  }

  // --- Admin Revert Scan (Admin Only) ---
  public async revertTicketScan(
    ticketCode: string,
    staffId: string
  ): Promise<Ticket> {
    const ticket = await this.getTicketByCode(ticketCode);
    if (!ticket) throw new Error("Ticket not found");

    ticket.status = "issued";
    ticket.checked_in_at = null;
    ticket.checked_in_by = null;
    this.tickets.set(ticket.id, { ...ticket });

    this.auditLogs.push({
      id: this.auditLogs.length + 1,
      actor: staffId,
      action: "revert_ticket_scan",
      entity: "ticket",
      entity_id: ticket.id,
      meta: { code: ticketCode },
      created_at: new Date().toISOString(),
    });

    return { ...ticket };
  }
}

// Global engine instance with globalThis persistence for Next.js dev server hot-reloading
const globalForEngine = globalThis as unknown as { engine?: OrderEngine };
export const engine = globalForEngine.engine ?? new OrderEngine();
if (process.env.NODE_ENV !== "production") {
  globalForEngine.engine = engine;
}
