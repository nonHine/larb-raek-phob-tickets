export type OrderStatus = 'pending_payment' | 'under_review' | 'paid' | 'cancelled';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type TicketStatus = 'issued' | 'checked_in' | 'void';
export type StaffRole = 'admin' | 'scanner';

export interface Order {
  id: string;
  code: string;
  access_token: string;
  buyer_name: string;
  phone: string;
  email: string;
  backup_contact: string | null;
  quantity: number;
  unit_price_thb: number;
  total_thb: number;
  status: OrderStatus;
  expires_at: string | null;
  consented_at: string;
  admin_note: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  slip_path: string;
  slip_sha256: string;
  amount_thb: number;
  transferred_at: string;
  to_bank: string;
  payer_name_or_last4: string;
  status: PaymentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  slip_url?: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  order_id: string;
  code: string;
  holder_name: string | null;
  status: TicketStatus;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
}

export interface StaffProfile {
  user_id: string;
  role: StaffRole;
}

export interface AuditLog {
  id: number;
  actor: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface VenueStatus {
  id: 1;
  is_full: boolean;
  updated_by: string | null;
  updated_at: string;
}
