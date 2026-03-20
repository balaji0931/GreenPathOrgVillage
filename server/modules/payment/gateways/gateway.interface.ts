/**
 * Payment Gateway Adapter Interface
 *
 * Generic contract that all payment gateway adapters must implement.
 * Rest of the system NEVER depends on a specific gateway provider.
 */

export interface CreateUPIQRInput {
  orderId: string;
  chargeableAmountRupees: number;     // final amount (MDR included if applicable)
  customerName?: string;
  customerPhone?: string;
  metadata: Record<string, string>;    // billIds, villageId, billingMonths, method
}

export interface CreateInAppCheckoutInput {
  orderId: string;
  chargeableAmountRupees: number;
  customerName?: string;
  customerPhone?: string;
  metadata: Record<string, string>;
}

export interface UPIQRResult {
  qrPayload: string;                  // UPI intent URL or payment link (QR-encodable)
  qrImageDataUrl?: string;            // Pre-rendered QR image (base64 data URL) — some gateways provide this
  expiresAt: Date;                     // 5 min from now
}

export interface InAppCheckoutResult {
  checkoutData: Record<string, any>;   // provider-specific checkout config for frontend SDK
  orderId: string;
}

export interface ParsedPaymentEvent {
  orderId: string;
  gatewayTxnId: string;
  status: "success" | "failed";
  amountPaise?: number;
}

export interface PaymentGatewayAdapter {
  /** Provider name for logging */
  readonly provider: string;

  /**
   * Create a UPI QR payment (manager doorstep flow).
   * Returns QR-encodable string (UPI intent or payment link).
   */
  createUPIQRPayment(input: CreateUPIQRInput): Promise<UPIQRResult>;

  /**
   * Create an in-app checkout session (household dashboard flow).
   * Returns provider-specific checkout config for frontend SDK.
   */
  createInAppCheckout(input: CreateInAppCheckoutInput): Promise<InAppCheckoutResult>;

  /**
   * Verify webhook signature using the provider's mechanism.
   * Returns true if signature is valid.
   */
  verifyWebhook(headers: Record<string, string>, rawBody: string, signatureKey: string): boolean;

  /**
   * Parse a webhook event body into a normalized payment event.
   */
  parsePaymentEvent(body: any): ParsedPaymentEvent;
}
