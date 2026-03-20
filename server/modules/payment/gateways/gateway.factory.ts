/**
 * Gateway Adapter Factory
 *
 * Returns the correct adapter instance based on provider name.
 * Decrypts config JSON at runtime — never persists decrypted keys.
 */
import { decryptConfig } from "../../../utils/crypto";
import type { PaymentGatewayAdapter } from "./gateway.interface";
import { RazorpayAdapter } from "./razorpay.adapter";
import { CashfreeAdapter } from "./cashfree.adapter";
import { PayUAdapter } from "./payu.adapter";

export interface GatewayFactoryInput {
  provider: string;
  encryptedConfigJson: string;
  isTestMode?: boolean;
}

/**
 * Get a gateway adapter instance for the given provider.
 * Decrypts the config at runtime — adapter holds decrypted keys in memory only.
 */
export function getGatewayAdapter(input: GatewayFactoryInput): PaymentGatewayAdapter {
  const { provider, encryptedConfigJson, isTestMode } = input;
  const config = decryptConfig(encryptedConfigJson);

  switch (provider) {
    case "razorpay":
      return new RazorpayAdapter(config, isTestMode);

    case "cashfree":
      return new CashfreeAdapter(config, isTestMode);

    case "payu":
      return new PayUAdapter(config, isTestMode);

    default:
      throw new Error(`Unsupported payment gateway provider: ${provider}`);
  }
}
