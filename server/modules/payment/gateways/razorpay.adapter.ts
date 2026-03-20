/**
 * Razorpay Payment Gateway Adapter
 *
 * Implements the PaymentGatewayAdapter interface for Razorpay.
 *
 * Config JSON keys: key_id, key_secret, signature_key, merchant_label
 *
 * Gotchas:
 * - Amount must be in PAISE (₹100 = 10000)
 * - Dynamic QR: Razorpay does NOT return raw QR payload.
 *   Flow: createOrder → generate payment link → QR-encode the link URL
 * - Webhook verification: HMAC SHA256 of raw body using signature_key
 * - Webhook header: x-razorpay-signature
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

interface RazorpayConfig {
  key_id: string;
  key_secret: string;
  signature_key: string;
  merchant_label?: string;
}

export class RazorpayAdapter implements PaymentGatewayAdapter {
  readonly provider = "razorpay";
  private config: RazorpayConfig;
  private baseUrl: string;

  constructor(config: Record<string, any>, isTestMode?: boolean) {
    this.config = config as RazorpayConfig;

    if (!this.config.key_id || !this.config.key_secret) {
      throw new Error("Razorpay adapter requires key_id and key_secret");
    }

    this.baseUrl = "https://api.razorpay.com/v1";
  }

  /**
   * Create a Razorpay order then generate a payment link for QR encoding.
   * Manager shows this QR to household at doorstep.
   */
  async createUPIQRPayment(input: CreateUPIQRInput): Promise<UPIQRResult> {
    const amountPaise = Math.round(input.chargeableAmountRupees * 100);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Step 1: Create Razorpay order
    const orderPayload = {
      amount: amountPaise,
      currency: "INR",
      receipt: input.orderId.slice(0, 40), // Razorpay limits receipt to 40 chars
      notes: input.metadata,
      payment_capture: 1, // auto-capture
    };

    const orderResponse = await this.apiCall("POST", "/orders", orderPayload);

    // Step 2: Create a payment link for UPI QR
    // Razorpay payment links support UPI QR scanning
    const linkPayload = {
      amount: amountPaise,
      currency: "INR",
      accept_partial: false,
      first_min_partial_amount: 0,
      description: `GreenPath Bill - ${input.metadata.billingMonths || ""}`,
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: {
        ...input.metadata,
        razorpay_order_id: orderResponse.id,
      },
      expire_by: Math.floor(expiresAt.getTime() / 1000),
      upi_link: true, // Creates a UPI intent link
    };

    const linkResponse = await this.apiCall("POST", "/payment_links", linkPayload);

    // The short_url is QR-encodable (UPI intent link)
    return {
      qrPayload: linkResponse.short_url || linkResponse.upi_link || `upi://pay?pa=${this.config.key_id}`,
      expiresAt,
    };
  }

  /**
   * Create a Razorpay order for in-app checkout (household dashboard).
   * Frontend uses Razorpay checkout.js with the returned config.
   */
  async createInAppCheckout(input: CreateInAppCheckoutInput): Promise<InAppCheckoutResult> {
    const amountPaise = Math.round(input.chargeableAmountRupees * 100);

    const orderPayload = {
      amount: amountPaise,
      currency: "INR",
      receipt: input.orderId,
      notes: input.metadata,
      payment_capture: 1,
    };

    const orderResponse = await this.apiCall("POST", "/orders", orderPayload);

    return {
      orderId: orderResponse.id,
      checkoutData: {
        key: this.config.key_id,
        amount: amountPaise,
        currency: "INR",
        name: this.config.merchant_label || "GreenPath",
        description: `Waste Collection Fee - ${input.metadata.billingMonths || ""}`,
        order_id: orderResponse.id,
        redirect: false, // IMPORTANT: stay on page, use JS handler instead of redirecting
        prefill: {
          name: input.customerName || "",
          contact: input.customerPhone || "",
        },
        notes: input.metadata,
        theme: { color: "#16a34a" }, // green-600
      },
    };
  }

  /**
   * Verify Razorpay webhook signature.
   * Uses HMAC SHA256 of raw body with the signature_key.
   */
  verifyWebhook(headers: Record<string, string>, rawBody: string, signatureKey: string): boolean {
    const receivedSignature = headers["x-razorpay-signature"];
    if (!receivedSignature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", signatureKey)
      .update(rawBody)
      .digest("hex");

    const receivedBuf = Buffer.from(receivedSignature, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");

    // timingSafeEqual requires same-length buffers; mismatch = invalid signature
    if (receivedBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(receivedBuf, expectedBuf);
  }

  /**
   * Parse Razorpay webhook event body.
   */
  parsePaymentEvent(body: any): ParsedPaymentEvent {
    const event = body.event;
    const entity = body.payload?.payment?.entity;

    if (!entity) {
      throw new Error("Razorpay webhook: missing payment entity in payload");
    }

    let status: "success" | "failed";
    if (event === "payment.captured" || event === "payment.authorized") {
      status = "success";
    } else {
      status = "failed";
    }

    return {
      orderId: entity.order_id || entity.notes?.orderId || "",
      gatewayTxnId: entity.id, // pay_xxxx
      status,
      amountPaise: entity.amount,
    };
  }

  /**
   * Make an authenticated API call to Razorpay.
   */
  private async apiCall(method: string, endpoint: string, body?: any): Promise<any> {
    const auth = Buffer.from(`${this.config.key_id}:${this.config.key_secret}`).toString("base64");

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Razorpay API error: ${response.status} - ${errorBody}`);
    }

    return response.json();
  }
}
