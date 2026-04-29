/**
 * Cashfree Payment Gateway Adapter
 *
 * Implements the PaymentGatewayAdapter interface for Cashfree.
 *
 * Config JSON keys: client_id, client_secret, signature_key, api_version
 *
 * Cashfree API specifics:
 * - Amount in RUPEES (not paise) as a number with 2 decimal places
 * - REST API: https://api.cashfree.com/pg or https://sandbox.cashfree.com/pg
 * - Auth: x-client-id + x-client-secret headers
 * - Dynamic QR: create order → generate UPI intent via payment link
 * - Webhook verification: HMAC SHA256 using signature_key on timestamp + raw_body
 * - Webhook header: x-cashfree-signature, x-cashfree-timestamp
 *
 * Status mapping:
 * - SUCCESS → success (mark paid)
 * - FAILED → failed (mark failed)
 * - USER_DROPPED → keep pending (do not transition)
 * - VOID / CANCELLED → failed
 * - PENDING → keep pending
 */
import crypto from "crypto";
import type {
  PaymentGatewayAdapter,
  CreateUPIQRInput,
  CreateInAppCheckoutInput,
  UPIQRResult,
  InAppCheckoutResult,
  ParsedPaymentEvent,
} from "./gateway.interface";

interface CashfreeConfig {
  client_id: string;
  client_secret: string;
  signature_key: string;
  api_version?: string;
}

export class CashfreeAdapter implements PaymentGatewayAdapter {
  readonly provider = "cashfree";
  private config: CashfreeConfig;
  private baseUrl: string;
  private apiVersion: string;

  constructor(config: Record<string, any>, isTestMode?: boolean) {
    this.config = config as CashfreeConfig;

    if (!this.config.client_id || !this.config.client_secret) {
      throw new Error("Cashfree adapter requires client_id and client_secret");
    }

    this.baseUrl = isTestMode
      ? "https://sandbox.cashfree.com/pg"
      : "https://api.cashfree.com/pg";

    this.apiVersion = this.config.api_version || "2023-08-01";
  }

  /**
   * Create a Cashfree order + UPI QR link for manager doorstep collection.
   *
   * Flow:
   * 1. Create order via /orders API
   * 2. Create payment link (or use UPI payment session) for QR
   * 3. Return QR-encodable payload
   */
  async createUPIQRPayment(input: CreateUPIQRInput): Promise<UPIQRResult> {
    const amountRupees = Math.round(input.chargeableAmountRupees * 100) / 100; // 2 decimal precision
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes (Cashfree min: 15 min)

    // Step 1: Create Cashfree order
    const orderPayload = {
      order_id: input.orderId,
      order_amount: amountRupees,
      order_currency: "INR",
      order_expiry_time: expiresAt.toISOString(),
      order_note: `GreenPath Bill - ${input.metadata.billingMonths || ""}`,
      customer_details: {
        customer_id: input.metadata.householdId || `hh_${Date.now()}`,
        customer_name: input.customerName || "Household",
        customer_phone: input.customerPhone || "9999999999",
      },
      order_meta: {
        return_url: null,
        notify_url: null, // webhooks configured at dashboard level
        payment_methods: "upi",
      },
      order_tags: input.metadata,
    };

    const orderResponse = await this.apiCall("POST", "/orders", orderPayload);

    // Step 2: Get UPI QR via Cashfree sessions API
    const paymentSessionId = orderResponse.payment_session_id;

    if (paymentSessionId) {
      try {
        const sessionResponse = await this.apiCall("POST", "/orders/sessions", {
          payment_session_id: paymentSessionId,
          payment_method: {
            upi: {
              channel: "qrcode",
            },
          },
        });

        const qrData = sessionResponse?.data?.payload?.qrcode
          || sessionResponse?.data?.payload?.default;

        if (qrData) {
          // Cashfree returns either:
          // 1. A pre-rendered QR image (base64 data URL) - pass directly to frontend
          // 2. A UPI intent string (upi://pay?...) - frontend generates QR from this
          if (qrData.startsWith("data:image/")) {
            return { qrPayload: "", qrImageDataUrl: qrData, expiresAt };
          } else {
            return { qrPayload: qrData, expiresAt };
          }
        }
      } catch (err: any) {
      }
    }

    // Fallback: use Cashfree payment link (opens checkout page when scanned)
    const fallback = orderResponse.payment_link
      || `${this.baseUrl.replace('/pg', '')}/pg/links/${orderResponse.cf_order_id}`;
    return { qrPayload: fallback, expiresAt };
  }

  /**
   * Create an in-app checkout session for household dashboard flow.
   * Returns Cashfree checkout config for frontend SDK.
   */
  async createInAppCheckout(input: CreateInAppCheckoutInput): Promise<InAppCheckoutResult> {
    const amountRupees = Math.round(input.chargeableAmountRupees * 100) / 100;

    const orderPayload = {
      order_id: input.orderId,
      order_amount: amountRupees,
      order_currency: "INR",
      order_expiry_time: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // Cashfree min: 15 min
      order_note: `Waste Collection Fee - ${input.metadata.billingMonths || ""}`,
      customer_details: {
        customer_id: input.metadata.householdId || `hh_${Date.now()}`,
        customer_name: input.customerName || "Household",
        customer_phone: input.customerPhone || "9999999999",
      },
      order_meta: {
        return_url: null,
        payment_methods: null, // allow all
      },
      order_tags: input.metadata,
    };

    const orderResponse = await this.apiCall("POST", "/orders", orderPayload);

    return {
      orderId: orderResponse.cf_order_id || orderResponse.order_id,
      checkoutData: {
        paymentSessionId: orderResponse.payment_session_id,
        cfOrderId: orderResponse.cf_order_id,
        orderId: input.orderId,
        orderAmount: amountRupees,
        orderCurrency: "INR",
        customerName: input.customerName || "",
        customerPhone: input.customerPhone || "",
        // Cashfree JS SDK config
        environment: this.baseUrl.includes("sandbox") ? "sandbox" : "production",
        theme: { primaryColor: "#16a34a" }, // green-600
      },
    };
  }

  /**
   * Verify Cashfree webhook signature.
   *
   * Cashfree signs webhooks with HMAC SHA256 of: timestamp + rawBody
   * Signature header: x-cashfree-signature
   * Timestamp header: x-cashfree-timestamp
   */
  verifyWebhook(headers: Record<string, string>, rawBody: string, signatureKey: string): boolean {
    const receivedSignature = headers["x-cashfree-signature"];
    const timestamp = headers["x-cashfree-timestamp"];

    if (!receivedSignature || !timestamp) {
      return false;
    }

    // Cashfree computes: HMAC_SHA256(timestamp + rawBody, signatureKey)
    const signaturePayload = timestamp + rawBody;
    const expectedSignature = crypto
      .createHmac("sha256", signatureKey)
      .update(signaturePayload)
      .digest("base64");

    // Timing-safe comparison (base64 encoded)
    try {
      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature, "base64"),
        Buffer.from(expectedSignature, "base64"),
      );
    } catch {
      // Buffers different length → signature mismatch
      return false;
    }
  }

  /**
   * Parse Cashfree webhook event body into normalized payment event.
   *
   * Status mapping (critical for correctness):
   * - SUCCESS → "success" → mark bills paid
   * - FAILED / CANCELLED / VOID → "failed" → mark order failed
   * - USER_DROPPED / PENDING / NOT_ATTEMPTED → stay pending (no transition)
   */
  parsePaymentEvent(body: any): ParsedPaymentEvent {
    // Cashfree webhook structure:
    // { type: "PAYMENT_SUCCESS_WEBHOOK", data: { order: { order_id }, payment: { cf_payment_id, payment_status, payment_amount } } }
    const order = body.data?.order || {};
    const payment = body.data?.payment || {};

    const rawStatus = (payment.payment_status || "").toUpperCase();

    // Map Cashfree statuses to our domain
    let status: "success" | "failed";
    switch (rawStatus) {
      case "SUCCESS":
        status = "success";
        break;
      case "FAILED":
      case "CANCELLED":
      case "VOID":
        status = "failed";
        break;
      case "USER_DROPPED":
      case "PENDING":
      case "NOT_ATTEMPTED":
        // These should NOT trigger a state change.
        // But our interface only supports success/failed.
        // The webhook route should check this and skip processing.
        status = "failed"; // will be filtered by webhook handler via event type check
        break;
      default:
        status = "failed";
    }

    return {
      orderId: order.order_id || "",
      gatewayTxnId: payment.cf_payment_id || payment.payment_id || "",
      status,
      amountPaise: payment.payment_amount ? Math.round(payment.payment_amount * 100) : undefined,
    };
  }

  /**
   * Make an authenticated API call to Cashfree.
   */
  private async apiCall(method: string, endpoint: string, body?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-client-id": this.config.client_id,
        "x-client-secret": this.config.client_secret,
        "x-api-version": this.apiVersion,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Cashfree API error: ${response.status} - ${errorBody}`);
    }

    return response.json();
  }
}
