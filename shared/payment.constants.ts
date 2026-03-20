// ── Payment Ledger Shared Constants ──

export const PAYMENT_METHODS = {
  CASH: "cash",
  GATEWAY_UPI_QR: "gateway_upi_qr",
  GATEWAY_INAPP: "gateway_inapp",
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

export const BILL_STATUSES = {
  UNPAID: "unpaid",
  PAID: "paid",
  WAIVED: "waived",
} as const;

export type BillStatus = typeof BILL_STATUSES[keyof typeof BILL_STATUSES];

export const MDR_POLICIES = {
  VILLAGE_ABSORBS: "village_absorbs",
  HOUSEHOLD_PAYS: "household_pays",
} as const;

export type MdrPolicy = typeof MDR_POLICIES[keyof typeof MDR_POLICIES];

export const GATEWAY_PROVIDERS = {
  RAZORPAY: "razorpay",
  CASHFREE: "cashfree",
  PAYU: "payu",
} as const;

export type GatewayProvider = typeof GATEWAY_PROVIDERS[keyof typeof GATEWAY_PROVIDERS];

export const ORDER_STATUSES = {
  PENDING: "pending",
  CAPTURED: "captured",
  FAILED: "failed",
  EXPIRED: "expired",
} as const;

export type OrderStatus = typeof ORDER_STATUSES[keyof typeof ORDER_STATUSES];

export const AUDIT_ACTIONS = {
  MARKED_PAID: "marked_paid",
  UNDONE: "undone",
  WAIVED: "waived",
  BULK_PAID: "bulk_paid",
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

// ── Provider UI field mapping (for dynamic gateway setup form) ──

export const GATEWAY_FIELD_MAP: Record<string, { label: string; key: string; type: "text" | "password" }[]> = {
  razorpay: [
    { label: "Key ID", key: "key_id", type: "text" },
    { label: "Key Secret", key: "key_secret", type: "password" },
    { label: "Webhook Secret", key: "signature_key", type: "password" },
    { label: "Merchant Label", key: "merchant_label", type: "text" },
  ],
  cashfree: [
    { label: "App ID (Client ID)", key: "client_id", type: "text" },
    { label: "Secret Key", key: "client_secret", type: "password" },
    { label: "API Version", key: "api_version", type: "text" },
  ],
  payu: [
    { label: "Merchant Key", key: "merchant_key", type: "text" },
    { label: "Merchant Salt (V1)", key: "merchant_salt", type: "password" },
    { label: "Merchant ID", key: "merchant_id", type: "text" },
  ],
};
