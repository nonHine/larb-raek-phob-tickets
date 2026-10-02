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
import { supabaseAdmin } from "./supabase";

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

function toUuid(str?: string | null): string | null {
  if (!str) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  const hash = crypto.createHash("md5").update(str).digest("hex");
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

export class OrderEngine {
  // In-memory tables for local testing & cache
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

  // Mutex per order to simulate Postgres row locking
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

  private isSupabaseReady(): boolean {
    return !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    );
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
    if (this.isSupabaseReady()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("venue_status")
          .select("*")
          .eq("id", 1)
          .maybeSingle();

        if (data && !error) {
          this.venueStatus = {
            id: 1,
            is_full: Boolean(data.is_full),
            updated_by: data.updated_by,
            updated_at: data.updated_at,
          };
          return { ...this.venueStatus };
        }
      } catch (err) {
        console.error("getVenueStatus error from Supabase, using cache:", err);
      }
    }
    return { ...this.venueStatus };
  }

  public async setVenueFull(is_full: boolean, staff_id: string): Promise<VenueStatus> {
    const now = new Date().toISOString();
    this.venueStatus = {
      id: 1,
      is_full,
      updated_by: staff_id,
      updated_at: now,
    };

    if (this.isSupabaseReady()) {
      try {
        await supabaseAdmin
          .from("venue_status")
          .upsert({
            id: 1,
            is_full,
            updated_by: toUuid(staff_id),
            updated_at: now,
          });

        await supabaseAdmin.from("audit_log").insert({
          actor: toUuid(staff_id),
          action: is_full ? "venue_full_enabled" : "venue_full_disabled",
          entity: "venue_status",
          entity_id: null,
          meta: { is_full, staff_id },
          created_at: now,
        });
      } catch (err) {
        console.error("setVenueFull error in Supabase:", err);
      }
    }

    this.auditLogs.push({
      id: this.auditLogs.length + 1,
      actor: staff_id,
      action: is_full ? "venue_full_enabled" : "venue_full_disabled",
      entity: "venue_status",
      entity_id: null,
      meta: { is_full },
      created_at: now,
    });

    return { ...this.venueStatus };
  }

  // --- Order Creation ---
  public async createOrder(
    input: CreateOrderInput
  ): Promise<{ success: true; order: Order } | { success: false; error: string }> {
    const venue = await this.getVenueStatus();
    if (venue.is_full) {
      return { success: false, error: "venue_full" };
    }

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

    if (this.isSupabaseReady()) {
      try {
        const { error } = await supabaseAdmin.from("orders").insert({
          id: order.id,
          code: order.code,
          access_token: order.access_token,
          buyer_name: order.buyer_name,
          phone: order.phone,
          email: order.email,
          backup_contact: order.backup_contact,
          quantity: order.quantity,
          unit_price_thb: order.unit_price_thb,
          total_thb: order.total_thb,
          status: order.status,
          expires_at: order.expires_at,
          consented_at: order.consented_at,
          admin_note: order.admin_note,
          created_at: order.created_at,
        });

        if (error) {
          console.error("Supabase createOrder insert error:", error);
        }
      } catch (err) {
        console.error("Supabase createOrder exception:", err);
      }
    }

    this.orders.set(id, { ...order });
    return { success: true, order: { ...order } };
  }

  public async getOrderByCode(
    code: string,
    accessToken?: string
  ): Promise<Order | null> {
    if (this.isSupabaseReady()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("code", code)
          .maybeSingle();

        if (error) {
          console.error("Supabase getOrderByCode error:", error);
          return null;
        }
        if (!data) return null;

        const ord = data as Order;
        if (accessToken && ord.access_token !== accessToken) {
          return null;
        }
        this.orders.set(ord.id, ord);
        return { ...ord };
      } catch (err) {
        console.error("Supabase getOrderByCode error:", err);
        return null;
      }
    }

    for (const order of this.orders.values()) {
      if (order.code === code) {
        if (accessToken && order.access_token !== accessToken) {
          return null;
        }
        return { ...order };
      }
    }
    return null;
  }

  public async getOrderById(id: string): Promise<Order | null> {
    if (this.isSupabaseReady()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) {
          console.error("Supabase getOrderById error:", error);
          return null;
        }
        if (!data) return null;

        const ord = data as Order;
        this.orders.set(ord.id, ord);
        return { ...ord };
      } catch (err) {
        console.error("Supabase getOrderById exception:", err);
        return null;
      }
    }

    const order = this.orders.get(id);
    return order ? { ...order } : null;
  }

  public async getOrdersByPhone(phone: string): Promise<Order[]> {
    const cleanPhone = phone.replace(/[^0-9]/g, "").trim();
    if (!cleanPhone) return [];

    if (this.isSupabaseReady()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("phone", cleanPhone)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Supabase getOrdersByPhone error:", error);
          return [];
        }
        const list = (data || []) as Order[];
        list.forEach((ord) => this.orders.set(ord.id, ord));
        return list.map((ord) => ({ ...ord }));
      } catch (err) {
        console.error("Supabase getOrdersByPhone exception:", err);
        return [];
      }
    }

    const list: Order[] = [];
    for (const order of this.orders.values()) {
      if (order.phone.replace(/[^0-9]/g, "") === cleanPhone) {
        list.push({ ...order });
      }
    }
    return list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public async searchOrders(query: string): Promise<Order[]> {
    const q = query.trim();
    if (!q) return [];

    if (this.isSupabaseReady()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("*")
          .or(`code.ilike.%${q}%,buyer_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Supabase searchOrders error:", error);
          return [];
        }
        const list = (data || []) as Order[];
        list.forEach((ord) => this.orders.set(ord.id, ord));
        return list.map((ord) => ({ ...ord }));
      } catch (err) {
        console.error("Supabase searchOrders exception:", err);
        return [];
      }
    }

    const qLower = q.toLowerCase();
    const list: Order[] = [];
    for (const order of this.orders.values()) {
      if (
        order.code.toLowerCase().includes(qLower) ||
        order.buyer_name.toLowerCase().includes(qLower) ||
        order.phone.includes(q) ||
        order.email.toLowerCase().includes(qLower)
      ) {
        list.push({ ...order });
      }
    }
    return list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public async searchTickets(query: string): Promise<Ticket[]> {
    const q = query.trim().toUpperCase();
    if (!q) return [];

    if (this.isSupabaseReady()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("tickets")
          .select("*")
          .or(`code.ilike.%${q}%,holder_name.ilike.%${q}%`)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Supabase searchTickets error:", error);
          return [];
        }
        const list = (data || []) as Ticket[];
        list.forEach((t) => this.tickets.set(t.id, t));
        return list.map((t) => ({ ...t }));
      } catch (err) {
        console.error("Supabase searchTickets exception:", err);
        return [];
      }
    }

    const list: Ticket[] = [];
    for (const t of this.tickets.values()) {
      if (
        t.code.toUpperCase().includes(q) ||
        (t.holder_name && t.holder_name.toUpperCase().includes(q))
      ) {
        list.push({ ...t });
      }
    }
    return list;
  }

  // --- Payments / Slips ---
  public async addPayment(input: AddPaymentInput): Promise<Payment> {
    const releaseLock = await this.acquireLock(input.order_id);
    try {
      const order = await this.getOrderById(input.order_id);
      if (!order) {
        throw new Error("Order not found");
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
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
        created_at: now,
      };

      if (this.isSupabaseReady()) {
        try {
          await supabaseAdmin.from("payments").insert({
            id: payment.id,
            order_id: payment.order_id,
            slip_path: payment.slip_path,
            slip_sha256: payment.slip_sha256,
            amount_thb: payment.amount_thb,
            transferred_at: payment.transferred_at,
            to_bank: payment.to_bank,
            payer_name_or_last4: payment.payer_name_or_last4,
            status: payment.status,
            created_at: payment.created_at,
          });

          if (order.status === "pending_payment") {
            await supabaseAdmin
              .from("orders")
              .update({ status: "under_review" })
              .eq("id", order.id);
          }
        } catch (err) {
          console.error("Supabase addPayment error:", err);
        }
      }

      this.payments.set(id, { ...payment });

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
    if (this.isSupabaseReady()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("payments")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Supabase getPaymentsForOrder error:", error);
          return [];
        }

        const list: Payment[] = (data || []).map((p: any) => {
          const cached = this.payments.get(p.id);
          return {
            ...p,
            slip_url: cached?.slip_url || null,
          };
        });
        return list;
      } catch (err) {
        console.error("Supabase getPaymentsForOrder exception:", err);
        return [];
      }
    }

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
    if (this.isSupabaseReady()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("payments")
          .select("*")
          .eq("slip_sha256", sha256);

        if (error) {
          console.error("Supabase findDuplicatePayments error:", error);
          return [];
        }
        return (data || []) as Payment[];
      } catch (err) {
        console.error("Supabase findDuplicatePayments exception:", err);
        return [];
      }
    }

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
    let currentPayment: Payment | null = null;
    if (this.isSupabaseReady()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("payments")
          .select("*")
          .eq("id", params.payment_id)
          .maybeSingle();
        if (error) {
          console.error("Supabase getPayment for approval error:", error);
        } else if (data) {
          currentPayment = data as Payment;
        }
      } catch (err) {
        console.error("Supabase getPayment exception:", err);
      }
    } else {
      currentPayment = this.payments.get(params.payment_id) || null;
    }

    if (!currentPayment) {
      return { success: false, error: "payment_not_found" };
    }

    if (currentPayment.status !== "pending") {
      return {
        success: false,
        error: "already_reviewed",
        payment: { ...currentPayment },
      };
    }

    const releaseLock = await this.acquireLock(currentPayment.order_id);
    try {
      // Re-check status under lock to handle concurrent race conditions
      if (this.isSupabaseReady()) {
        try {
          const { data } = await supabaseAdmin
            .from("payments")
            .select("*")
            .eq("id", params.payment_id)
            .maybeSingle();
          if (data) currentPayment = data as Payment;
        } catch {}
      } else {
        currentPayment = this.payments.get(params.payment_id) || currentPayment;
      }
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

      const now = new Date().toISOString();
      currentPayment.status = "approved";
      currentPayment.amount_thb = approvedAmount;
      currentPayment.reviewed_by = params.reviewer_id;
      currentPayment.reviewed_at = now;
      this.payments.set(currentPayment.id, { ...currentPayment });

      if (this.isSupabaseReady()) {
        try {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "approved",
              amount_thb: approvedAmount,
              reviewed_by: toUuid(params.reviewer_id),
              reviewed_at: now,
            })
            .eq("id", currentPayment.id);

          await supabaseAdmin.from("audit_log").insert({
            actor: toUuid(params.reviewer_id),
            action: "approve_payment",
            entity: "payment",
            entity_id: currentPayment.id,
            meta: { amount_thb: approvedAmount },
            created_at: now,
          });
        } catch (err) {
          console.error("Supabase approvePayment update error:", err);
        }
      }

      this.auditLogs.push({
        id: this.auditLogs.length + 1,
        actor: params.reviewer_id,
        action: "approve_payment",
        entity: "payment",
        entity_id: currentPayment.id,
        meta: { amount_thb: approvedAmount },
        created_at: now,
      });

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
    let currentPayment: Payment | null = null;
    if (this.isSupabaseReady()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("payments")
          .select("*")
          .eq("id", params.payment_id)
          .maybeSingle();
        if (error) {
          console.error("Supabase getPayment for reject error:", error);
        } else if (data) {
          currentPayment = data as Payment;
        }
      } catch (err) {
        console.error("Supabase getPayment for reject exception:", err);
      }
    } else {
      currentPayment = this.payments.get(params.payment_id) || null;
    }

    if (!currentPayment) {
      return { success: false, error: "payment_not_found" };
    }

    if (currentPayment.status !== "pending") {
      return {
        success: false,
        error: "already_reviewed",
        payment: { ...currentPayment },
      };
    }

    const releaseLock = await this.acquireLock(currentPayment.order_id);
    try {
      // Re-check status under lock to handle concurrent race conditions
      if (this.isSupabaseReady()) {
        try {
          const { data } = await supabaseAdmin
            .from("payments")
            .select("*")
            .eq("id", params.payment_id)
            .maybeSingle();
          if (data) currentPayment = data as Payment;
        } catch {}
      } else {
        currentPayment = this.payments.get(params.payment_id) || currentPayment;
      }
      if (currentPayment.status !== "pending") {
        return {
          success: false,
          error: "already_reviewed",
          payment: { ...currentPayment },
        };
      }

      const now = new Date().toISOString();
      currentPayment.status = "rejected";
      currentPayment.reject_reason = params.reason;
      currentPayment.reviewed_by = params.reviewer_id;
      currentPayment.reviewed_at = now;
      this.payments.set(currentPayment.id, { ...currentPayment });

      if (this.isSupabaseReady()) {
        try {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "rejected",
              reject_reason: params.reason,
              reviewed_by: toUuid(params.reviewer_id),
              reviewed_at: now,
            })
            .eq("id", currentPayment.id);

          await supabaseAdmin.from("audit_log").insert({
            actor: toUuid(params.reviewer_id),
            action: "reject_payment",
            entity: "payment",
            entity_id: currentPayment.id,
            meta: { reason: params.reason },
            created_at: now,
          });
        } catch (err) {
          console.error("Supabase rejectPayment update error:", err);
        }
      }

      this.auditLogs.push({
        id: this.auditLogs.length + 1,
        actor: params.reviewer_id,
        action: "reject_payment",
        entity: "payment",
        entity_id: currentPayment.id,
        meta: { reason: params.reason },
        created_at: now,
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
    let order = await this.getOrderById(orderId);
    if (!order) throw new Error("Order not found");

    const orderPayments = await this.getPaymentsForOrder(orderId);

    const approvedSum = orderPayments
      .filter((p) => p.status === "approved")
      .reduce((sum, p) => sum + Number(p.amount_thb), 0);

    const hasPendingSlips = orderPayments.some((p) => p.status === "pending");
    let ticketsIssuedCount = 0;

    if (approvedSum >= order.total_thb) {
      order.status = "paid";
      order.expires_at = null;

      if (approvedSum > order.total_thb) {
        order.admin_note = (order.admin_note ? order.admin_note + " " : "") +
          `[Overpaid: ${approvedSum} THB vs ${order.total_thb} THB]`;
      }

      ticketsIssuedCount = await this.issueTicketsLocked(order);
    } else if (approvedSum > 0) {
      order.status = hasPendingSlips ? "under_review" : "pending_payment";
      order.expires_at = null;
    } else {
      if (hasPendingSlips) {
        order.status = "under_review";
      } else {
        order.status = "pending_payment";
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

    if (this.isSupabaseReady()) {
      try {
        await supabaseAdmin
          .from("orders")
          .update({
            status: order.status,
            expires_at: order.expires_at,
            admin_note: order.admin_note,
          })
          .eq("id", order.id);
      } catch (err) {
        console.error("Supabase update order status error:", err);
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

      if (this.isSupabaseReady()) {
        try {
          await supabaseAdmin.from("tickets").insert({
            id: ticket.id,
            order_id: ticket.order_id,
            code: ticket.code,
            holder_name: ticket.holder_name,
            status: ticket.status,
            created_at: ticket.created_at,
          });
        } catch (err) {
          console.error("Supabase issue ticket insert error:", err);
        }
      }

      this.tickets.set(ticketId, { ...ticket });
    }

    return needed;
  }

  public async getTicketsForOrder(orderId: string): Promise<Ticket[]> {
    if (this.isSupabaseReady()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("tickets")
          .select("*")
          .eq("order_id", orderId);

        if (error) throw error;
        return (data || []) as Ticket[];
      } catch (err) {
        console.error("Supabase getTicketsForOrder error:", err);
        throw err;
      }
    }

    const list: Ticket[] = [];
    for (const t of this.tickets.values()) {
      if (t.order_id === orderId) {
        list.push({ ...t });
      }
    }
    return list;
  }

  public async getTicketByCode(code: string): Promise<Ticket | null> {
    const cleanCode = code.trim().toUpperCase();

    if (this.isSupabaseReady()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("tickets")
          .select("*")
          .eq("code", cleanCode)
          .maybeSingle();

        if (error) {
          console.error("Supabase getTicketByCode error:", error);
          return null;
        }
        if (!data) return null;

        const t = data as Ticket;
        this.tickets.set(t.id, t);
        return { ...t };
      } catch (err) {
        console.error("Supabase getTicketByCode exception:", err);
        return null;
      }
    }

    for (const t of this.tickets.values()) {
      if (t.code === cleanCode) {
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

    const now = new Date().toISOString();
    ticket.status = "checked_in";
    ticket.checked_in_at = now;
    ticket.checked_in_by = staffId;
    this.tickets.set(ticket.id, { ...ticket });

    if (this.isSupabaseReady()) {
      try {
        await supabaseAdmin
          .from("tickets")
          .update({
            status: "checked_in",
            checked_in_at: now,
            checked_in_by: toUuid(staffId),
          })
          .eq("id", ticket.id);

        await supabaseAdmin.from("audit_log").insert({
          actor: toUuid(staffId),
          action: "check_in_ticket",
          entity: "ticket",
          entity_id: ticket.id,
          meta: { code: ticket.code },
          created_at: now,
        });
      } catch (err) {
        console.error("Supabase checkInTicket update error:", err);
      }
    }

    this.auditLogs.push({
      id: this.auditLogs.length + 1,
      actor: staffId,
      action: "check_in_ticket",
      entity: "ticket",
      entity_id: ticket.id,
      meta: { code: ticket.code },
      created_at: now,
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
      const order = await this.getOrderById(orderId);
      if (!order) throw new Error("Order not found");

      order.status = "cancelled";
      this.orders.set(order.id, { ...order });

      if (this.isSupabaseReady()) {
        try {
          await supabaseAdmin
            .from("orders")
            .update({ status: "cancelled" })
            .eq("id", orderId);

          await supabaseAdmin
            .from("tickets")
            .update({ status: "void" })
            .eq("order_id", orderId);
        } catch (err) {
          console.error("Supabase cancelOrder error:", err);
        }
      }

      for (const t of this.tickets.values()) {
        if (t.order_id === orderId) {
          t.status = "void";
          this.tickets.set(t.id, { ...t });
        }
      }

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

    if (this.isSupabaseReady()) {
      try {
        await supabaseAdmin
          .from("tickets")
          .update({
            status: "issued",
            checked_in_at: null,
            checked_in_by: null,
          })
          .eq("id", ticket.id);
      } catch (err) {
        console.error("Supabase revertTicketScan error:", err);
      }
    }

    return { ...ticket };
  }

  // --- Admin Support Methods ---
  public async getPendingPayments(): Promise<Payment[]> {
    if (this.isSupabaseReady()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("payments")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Supabase getPendingPayments error:", error);
          return [];
        }
        return (data || []) as Payment[];
      } catch (err) {
        console.error("Supabase getPendingPayments exception:", err);
        return [];
      }
    }

    const list: Payment[] = [];
    for (const p of this.payments.values()) {
      if (p.status === "pending") {
        list.push({ ...p });
      }
    }
    return list.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  public async getAllOrders(filters?: { status?: string; query?: string }): Promise<Order[]> {
    const q = (filters?.query || "").toLowerCase().trim();
    const status = filters?.status || "all";

    if (this.isSupabaseReady()) {
      try {
        let query = supabaseAdmin
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (status !== "all") {
          query = query.eq("status", status);
        }
        if (q) {
          query = query.or(`code.ilike.%${q}%,buyer_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
        }

        const { data, error } = await query;
        if (error) {
          console.error("Supabase getAllOrders error:", error);
          return [];
        }
        return (data || []) as Order[];
      } catch (err) {
        console.error("Supabase getAllOrders exception:", err);
        return [];
      }
    }

    const list: Order[] = [];
    for (const order of this.orders.values()) {
      if (status !== "all" && order.status !== status) continue;
      if (q) {
        const match =
          order.code.toLowerCase().includes(q) ||
          order.buyer_name.toLowerCase().includes(q) ||
          order.phone.includes(q) ||
          order.email.toLowerCase().includes(q);
        if (!match) continue;
      }
      list.push({ ...order });
    }
    return list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public async updateOrderAdminNote(orderId: string, note: string): Promise<Order | null> {
    const order = await this.getOrderById(orderId);
    if (!order) return null;

    order.admin_note = note;
    this.orders.set(order.id, { ...order });

    if (this.isSupabaseReady()) {
      try {
        await supabaseAdmin
          .from("orders")
          .update({ admin_note: note })
          .eq("id", orderId);
      } catch (err) {
        console.error("Supabase updateOrderAdminNote error:", err);
      }
    }

    return { ...order };
  }

  public async getDashboardStats(): Promise<{
    total_orders: number;
    pending_payment_count: number;
    under_review_count: number;
    paid_count: number;
    cancelled_count: number;
    confirmed_revenue_thb: number;
    tickets_issued: number;
    tickets_checked_in: number;
  }> {
    if (this.isSupabaseReady()) {
      try {
        const [ordersRes, paymentsRes, ticketsRes] = await Promise.all([
          supabaseAdmin.from("orders").select("id, status"),
          supabaseAdmin.from("payments").select("amount_thb, status").eq("status", "approved"),
          supabaseAdmin.from("tickets").select("id, status"),
        ]);

        const orders = ordersRes.data || [];
        const payments = paymentsRes.data || [];
        const tickets = ticketsRes.data || [];

        return {
          total_orders: orders.length,
          pending_payment_count: orders.filter((o: any) => o.status === "pending_payment").length,
          under_review_count: orders.filter((o: any) => o.status === "under_review").length,
          paid_count: orders.filter((o: any) => o.status === "paid").length,
          cancelled_count: orders.filter((o: any) => o.status === "cancelled").length,
          confirmed_revenue_thb: payments.reduce((sum: number, p: any) => sum + Number(p.amount_thb || 0), 0),
          tickets_issued: tickets.filter((t: any) => t.status === "issued" || t.status === "checked_in").length,
          tickets_checked_in: tickets.filter((t: any) => t.status === "checked_in").length,
        };
      } catch (err) {
        console.error("Supabase getDashboardStats exception:", err);
      }
    }

    let pendingPaymentCount = 0;
    let underReviewCount = 0;
    let paidCount = 0;
    let cancelledCount = 0;
    let confirmedRevenue = 0;

    for (const order of this.orders.values()) {
      if (order.status === "pending_payment") pendingPaymentCount++;
      else if (order.status === "under_review") underReviewCount++;
      else if (order.status === "paid") paidCount++;
      else if (order.status === "cancelled") cancelledCount++;
    }

    for (const payment of this.payments.values()) {
      if (payment.status === "approved") {
        confirmedRevenue += Number(payment.amount_thb);
      }
    }

    let ticketsIssued = 0;
    let ticketsCheckedIn = 0;
    for (const ticket of this.tickets.values()) {
      if (ticket.status === "issued" || ticket.status === "checked_in") {
        ticketsIssued++;
      }
      if (ticket.status === "checked_in") {
        ticketsCheckedIn++;
      }
    }

    return {
      total_orders: this.orders.size,
      pending_payment_count: pendingPaymentCount,
      under_review_count: underReviewCount,
      paid_count: paidCount,
      cancelled_count: cancelledCount,
      confirmed_revenue_thb: confirmedRevenue,
      tickets_issued: ticketsIssued,
      tickets_checked_in: ticketsCheckedIn,
    };
  }
}

// Global engine instance with globalThis persistence for Next.js dev server hot-reloading
const globalForEngine = globalThis as unknown as { engine?: OrderEngine };
export const engine = globalForEngine.engine ?? new OrderEngine();
if (process.env.NODE_ENV !== "production") {
  globalForEngine.engine = engine;
}
