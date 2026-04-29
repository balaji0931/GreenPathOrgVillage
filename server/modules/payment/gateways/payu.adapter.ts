/**
 * PayU Payment Gateway Adapter
 *
 * Implements the PaymentGatewayAdapter interface for PayU India.
 *
 * Config JSON keys: merchant_key, merchant_salt, merchant_id, signature_key
 *
 * PayU API specifics:
 * - Amount in RUPEES as string (e.g., "100.00")
 * - Hash = sha512(key|txnid|amount|productinfo|firstname|email|||||||||||salt)
 * - Auth: Hash-based verification (no API key headers)
 * - URL: https://secure.payu.in/_payment (production) or https://test.payu.in/_payment (test)
 * - Webhook: reverse hash verification using salt
 *
 * Status mapping:
 * - success → "success" (mark paid)
 * - failure → "failed" (mark failed)
 * - pending → keep pending
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

interface PayUConfig {
  merchant_key: string;
  merchant_salt: string;
  merchant_id: string;
  signature_key?: string; // for webhook verification
}

export class PayUAdapter implements PaymentGatewayAdapter {
  readonly provider = "payu";
  private config: PayUConfig;
  private baseUrl: string;

  constructor(config: Record<string, any>, isTestMode?: boolean) {
    this.config = config as PayUConfig;

    if (!this.config.merchant_key || !this.config.merchant_salt) {
      throw new Error("PayU adapter requires merchant_key and merchant_salt");
    }

    this.baseUrl = isTestMode
      ? "https://test.payu.in"
      : "https://secure.payu.in";
  }

  /**
   * Generate PayU payment hash.
   *
   * PayU hash formula:
   * sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
   */
  private generateHash(params: {
    txnid: string;
    amount: string;
    productinfo: string;
    firstname: string;
    email: string;
  }): string {
    const hashString = [
      this.config.merchant_key,
      params.txnid,
      params.amount,
      params.productinfo,
      params.firstname,
      params.email,
      "", // udf1
      "", // udf2
      "", // udf3
      "", // udf4
      "", // udf5
      "", "", "", "", "", // reserved
      this.config.merchant_salt,
    ].join("|");

    return crypto.createHash("sha512").update(hashString).digest("hex");
  }

  /**
   * Generate reverse hash for webhook/response verification.
   *
   * Reverse hash formula:
   * sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
   */
  private generateReverseHash(params: {
    txnid: string;
    amount: string;
    productinfo: string;
    firstname: string;
    email: string;
    status: string;
  }): string {
    const hashString = [
      this.config.merchant_salt,
      params.status,
      "", "", "", "", "", // reserved
      "", // udf5
      "", // udf4
      "", // udf3
      "", // udf2
      "", // udf1
      params.email,
      params.firstname,
      params.productinfo,
      params.amount,
      params.txnid,
      this.config.merchant_key,
    ].join("|");

    return crypto.createHash("sha512").update(hashString).digest("hex");
  }

  /**
   * Create a PayU payment for UPI QR.
   *
   * PayU is form-POST based, so we:
   * 1. Generate the payment hash
   * 2. Build the payment URL with form params
   * 3. Return URL as QR payload (user scans and opens)
   */
  async createUPIQRPayment(input: CreateUPIQRInput): Promise<UPIQRResult> {
    const amount = input.chargeableAmountRupees.toFixed(2);
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    const params = {
      txnid: input.orderId,
      amount,
      productinfo: `GreenPath Bill - ${input.metadata.billingMonths || ""}`,
      firstname: input.customerName || "Household",
      email: "noreply@greenpath.org",
    };

    const hash = this.generateHash(params);
    const callbackUrl = input.metadata.callbackUrl || "";

    // Build payment URL with query params for QR encoding
    const formParams = new URLSearchParams({
      key: this.config.merchant_key,
      txnid: params.txnid,
      amount: params.amount,
      productinfo: params.productinfo,
      firstname: params.firstname,
      email: params.email,
      phone: input.customerPhone || "",
      surl: callbackUrl,
      furl: callbackUrl,
      hash,
      pg: "UPI",
      enforce_paymethod: "upi",
    });

    const paymentUrl = `${this.baseUrl}/_payment?${formParams.toString()}`;

    return {
      qrPayload: paymentUrl,
      expiresAt,
    };
  }

  /**
   * Create a PayU in-app checkout session.
   * Returns payment URL and form fields for frontend to auto-submit.
   */
  async createInAppCheckout(input: CreateInAppCheckoutInput): Promise<InAppCheckoutResult> {
    const amount = input.chargeableAmountRupees.toFixed(2);

    const params = {
      txnid: input.orderId,
      amount,
      productinfo: `Waste Collection Fee - ${input.metadata.billingMonths || ""}`,
      firstname: input.customerName || "Household",
      email: "noreply@greenpath.org",
    };

    const hash = this.generateHash(params);
    const callbackUrl = input.metadata.callbackUrl || "";

    return {
      orderId: input.orderId,
      checkoutData: {
        paymentUrl: `${this.baseUrl}/_payment`,
        formFields: {
          key: this.config.merchant_key,
          txnid: params.txnid,
          amount: params.amount,
          productinfo: params.productinfo,
          firstname: params.firstname,
          email: params.email,
          phone: input.customerPhone || "",
          surl: callbackUrl,
          furl: callbackUrl,
          hash,
        },
        environment: this.baseUrl.includes("test") ? "test" : "production",
      },
    };
  }

  /**
   * Verify PayU webhook/callback using reverse hash.
   *
   * PayU verification:
   * 1. Extract status, txnid, amount, productinfo, firstname, email from body
   * 2. Generate reverse hash
   * 3. Compare with received hash
   */
  verifyWebhook(headers: Record<string, string>, rawBody: string, signatureKey: string): boolean {
    try {
      // PayU sends data as form-encoded or JSON body
      let body: Record<string, string>;
      try {
        body = JSON.parse(rawBody);
      } catch {
        // form-encoded
        body = Object.fromEntries(new URLSearchParams(rawBody));
      }

      const receivedHash = body.hash;
      if (!receivedHash) {
        return false;
      }

      const reverseHash = this.generateReverseHash({
        txnid: body.txnid || "",
        amount: body.amount || "",
        productinfo: body.productinfo || "",
        firstname: body.firstname || "",
        email: body.email || "",
        status: body.status || "",
      });

      // Timing-safe comparison
      try {
        return crypto.timingSafeEqual(
          Buffer.from(receivedHash, "hex"),
          Buffer.from(reverseHash, "hex"),
        );
      } catch {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse PayU webhook/callback into normalized payment event.
   *
   * Status mapping:
   * - "success" → success (bills marked paid)
   * - "failure" → failed
   * - "pending" → failed (stays pending, filtered by webhook handler)
   */
  parsePaymentEvent(body: any): ParsedPaymentEvent {
    const rawStatus = (body.status || "").toLowerCase();

    let status: "success" | "failed";
    switch (rawStatus) {
      case "success":
        status = "success";
        break;
      case "failure":
      case "failed":
      case "cancelled":
      case "dropped":
        status = "failed";
        break;
      case "pending":
      case "in_progress":
        // Pending - should not trigger final state change
        status = "failed"; // filtered at webhook handler level
        break;
      default:
        status = "failed";
    }

    return {
      orderId: body.txnid || "",
      gatewayTxnId: body.mihpayid || body.payuMoneyId || "",
      status,
      amountPaise: body.amount ? Math.round(parseFloat(body.amount) * 100) : undefined,
    };
  }
}
