import type { Express, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import * as paymentStorage from "./payment.storage";
import { getGatewayAdapter } from "./gateways/gateway.factory";
import { decryptConfig } from "../../utils/crypto";
import { PAYMENT_METHODS, GATEWAY_FIELD_MAP } from "@shared/payment.constants";
import { db } from "../../db";
import { villages } from "@shared/schema";
import { eq } from "drizzle-orm";

// Middleware: reject requests if payments feature is disabled for this village
async function requirePaymentsEnabled(req: Request, res: Response, next: NextFunction) {
  const villageId = req.session?.villageId;
  if (!villageId) return next(); // Let requireAuth handle missing session

  const [village] = await db
    .select({ paymentsEnabled: villages.paymentsEnabled })
    .from(villages)
    .where(eq(villages.villageId, villageId));

  if (!village || !village.paymentsEnabled) {
    return res.status(403).json({ message: "Payments feature is not enabled for this village. Contact your administrator." });
  }
  next();
}

export function registerPaymentRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Apply payments guard to all payment routes (except public webhook)
  // This runs before individual route handlers - if payments is disabled, returns 403
  app.use(['/api/payments'], async (req: Request, res: Response, next: NextFunction) => {
    // Skip webhook - it's gateway-initiated and doesn't have a session
    if (req.path.includes('/gateway/webhook')) return next();
    // Skip if no session (let requireAuth handle)
    const villageId = req.session?.villageId;
    if (!villageId) return next();

    const [village] = await db
      .select({ paymentsEnabled: villages.paymentsEnabled })
      .from(villages)
      .where(eq(villages.villageId, villageId));

    if (!village || !village.paymentsEnabled) {
      return res.status(403).json({ message: "Payments feature is not enabled for this village. Contact your administrator." });
    }
    next();
  });

  // ═══════════════════════════════════════════
  // Household Types
  // ═══════════════════════════════════════════

  // List household types for village (auto-seeds defaults if none exist)
  app.get('/api/household-types', requireAuth, requireRole(['manager', 'fieldworker', 'collector']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      let types = await paymentStorage.getHouseholdTypesByVillage(villageId);

      // Auto-seed defaults on first access
      if (types.length === 0) {
        types = await paymentStorage.seedDefaultHouseholdTypes(villageId);
      }

      res.json(types);
    } catch (error) {
      res.status(500).json({ message: "Failed to get household types" });
    }
  });

  // Create or update a household type
  app.post('/api/household-types', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const { typeCode, displayName, description, isActive, sortOrder } = req.body;

      if (!typeCode || !displayName) {
        return res.status(400).json({ message: "typeCode and displayName are required" });
      }

      const result = await paymentStorage.upsertHouseholdType({
        villageId,
        typeCode,
        displayName,
        description,
        isActive,
        sortOrder,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to save household type" });
    }
  });

  // ═══════════════════════════════════════════
  // Fee Config
  // ═══════════════════════════════════════════

  // Get current fee config for village
  app.get('/api/payments/fee-config', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const config = await paymentStorage.getFeeConfigByVillage(villageId);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to get fee config" });
    }
  });

  // Save fee config (bulk upsert all types at once)
  app.post('/api/payments/fee-config', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const userId = req.session.userId!;
      const { configs } = req.body;

      if (!Array.isArray(configs) || configs.length === 0) {
        return res.status(400).json({ message: "configs array is required" });
      }

      const result = await paymentStorage.saveFeeConfigBulk(villageId, userId, configs);
      res.json({ message: "Fee config saved", configs: result });
    } catch (error) {
      res.status(500).json({ message: "Failed to save fee config" });
    }
  });

  // ═══════════════════════════════════════════
  // Billing Cycle
  // ═══════════════════════════════════════════

  // Get activation preview (counts, revenue, gateway status)
  app.get('/api/payments/activation-preview', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const month = req.query.month as string;

      // Check if cycle already exists
      if (month) {
        const existing = await paymentStorage.getCycleByVillageMonth(villageId, month);
        if (existing) {
          return res.json({ alreadyActivated: true, cycle: existing });
        }
      }

      const preview = await paymentStorage.getActivationPreview(villageId);
      res.json({ alreadyActivated: false, ...preview });
    } catch (error) {
      res.status(500).json({ message: "Failed to get activation preview" });
    }
  });

  // Activate billing cycle (generate bills)
  app.post('/api/payments/activate-cycle', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const userId = req.session.userId!;
      const { billingMonth } = req.body;

      if (!billingMonth || !/^\d{4}-\d{2}$/.test(billingMonth)) {
        return res.status(400).json({ message: "billingMonth must be in YYYY-MM format" });
      }

      const result = await paymentStorage.activateBillingCycle(villageId, billingMonth, userId);
      res.json({ message: "Billing cycle activated", ...result });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to activate billing cycle" });
    }
  });

  // List past billing cycles
  app.get('/api/payments/cycles', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const cycles = await paymentStorage.getCyclesByVillage(villageId);
      res.json(cycles);
    } catch (error) {
      res.status(500).json({ message: "Failed to get billing cycles" });
    }
  });

  // ═══════════════════════════════════════════
  // Bills
  // ═══════════════════════════════════════════

  // List bills with filters
  app.get('/api/payments/bills', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const month = req.query.month as string;

      if (!month) {
        return res.status(400).json({ message: "month query parameter is required" });
      }

      const bills = await paymentStorage.getBillsByVillageMonth(villageId, month, {
        status: req.query.status as string,
        ward: req.query.ward as string,
        householdType: req.query.type as string,
      });

      res.json(bills);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bills" });
    }
  });

  // Get all bills for a household
  app.get('/api/payments/bills/household/:id', requireAuth, requireRole(['manager', 'generator']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const householdId = parseInt(req.params.id);
      const bills = await paymentStorage.getBillsByHousehold(householdId);
      // Handler-level village validation: filter to session village only
      const safeBills = bills.filter((b: any) => b.villageId === villageId);
      res.json(safeBills);
    } catch (error) {
      res.status(500).json({ message: "Failed to get household bills" });
    }
  });

  // Add individual bill (post-activation for new household)
  app.post('/api/payments/add-bill', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const { householdId, billingMonth } = req.body;

      // Get the current cycle
      const cycle = await paymentStorage.getCycleByVillageMonth(villageId, billingMonth);
      if (!cycle) {
        return res.status(400).json({ message: "No billing cycle exists for this month. Activate a cycle first." });
      }

      // Get fee config to determine fee
      const feeConfig = await paymentStorage.getFeeConfigByVillage(villageId);
      // We would need to look up the household type - simplified here
      const bill = await paymentStorage.addIndividualBill({
        householdId,
        villageId,
        billingMonth,
        cycleId: cycle.id,
        householdTypeSnapshot: "residential_small",
        feeAmountSnapshot: feeConfig[0]?.feeAmount || "0",
      });

      res.json({ message: "Bill added", bill });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to add bill" });
    }
  });

  // ═══════════════════════════════════════════
  // Payments
  // ═══════════════════════════════════════════

  // Mark bill as paid (cash)
  app.post('/api/payments/mark-paid', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const userId = req.session.userId!;
      const { billId, paymentMethod } = req.body;

      if (!billId) {
        return res.status(400).json({ message: "billId is required" });
      }

      // Handler-level village validation
      const bill = await paymentStorage.getBillById(billId);
      if (!bill) return res.status(404).json({ message: "Bill not found" });
      if (bill.villageId !== villageId) {
        return res.status(403).json({ message: "Access denied - bill belongs to another village" });
      }

      const method = paymentMethod || "cash";
      if (!["cash", "gateway_upi_qr", "gateway_inapp"].includes(method)) {
        return res.status(400).json({ message: "Invalid payment method" });
      }

      const result = await paymentStorage.markBillPaid(billId, {
        paymentMethod: method,
        receivedByUserId: userId,
      });

      res.json({ message: "Payment recorded", ...result });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to record payment" });
    }
  });

  // Mark multiple months paid (bulk)
  app.post('/api/payments/mark-paid-bulk', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const userId = req.session.userId!;
      const { billIds } = req.body;

      if (!Array.isArray(billIds) || billIds.length === 0) {
        return res.status(400).json({ message: "billIds array is required" });
      }

      // Handler-level village validation for all bills
      for (const id of billIds) {
        const bill = await paymentStorage.getBillById(id);
        if (!bill) return res.status(404).json({ message: `Bill ${id} not found` });
        if (bill.villageId !== villageId) {
          return res.status(403).json({ message: "Access denied - bill belongs to another village" });
        }
      }

      const { paymentMethod } = req.body;
      const results = await paymentStorage.markBillsPaidBulk(billIds, {
        paymentMethod: paymentMethod || "cash",
        receivedByUserId: userId,
      });

      res.json({ message: "Bulk payment recorded", results });
    } catch (error) {
      res.status(500).json({ message: "Failed to record bulk payment" });
    }
  });

  // Undo cash payment
  app.post('/api/payments/undo/:billId', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const billId = parseInt(req.params.billId);
      const userId = req.session.userId!;

      // Handler-level village validation
      const bill = await paymentStorage.getBillById(billId);
      if (!bill) return res.status(404).json({ message: "Bill not found" });
      if (bill.villageId !== villageId) {
        return res.status(403).json({ message: "Access denied - bill belongs to another village" });
      }

      await paymentStorage.undoBillPayment(billId, userId);
      res.json({ message: "Payment undone" });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to undo payment" });
    }
  });

  // Waive a bill
  app.post('/api/payments/waive/:billId', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const userId = req.session.userId!;
      const billId = parseInt(req.params.billId);
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Waiver reason is required" });
      }

      // Handler-level village validation
      const bill = await paymentStorage.getBillById(billId);
      if (!bill) return res.status(404).json({ message: "Bill not found" });
      if (bill.villageId !== villageId) {
        return res.status(403).json({ message: "Access denied - bill belongs to another village" });
      }

      await paymentStorage.waiveBill(billId, userId, reason);
      res.json({ message: "Bill waived" });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to waive bill" });
    }
  });

  // Monthly summary KPIs
  app.get('/api/payments/summary', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const month = req.query.month as string;

      if (!month) {
        return res.status(400).json({ message: "month query parameter is required" });
      }

      const summary = await paymentStorage.getPaymentSummary(villageId, month);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to get payment summary" });
    }
  });

  // Get all unpaid bills for a household (for multi-select payment UI)
  app.get('/api/payments/household-unpaid/:householdId', requireAuth, requireRole(['manager', 'generator']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const householdId = parseInt(req.params.householdId);
      const results = await paymentStorage.getUnpaidBillsByHousehold(householdId);
      // Flatten for frontend - filter to session village for defense-in-depth
      const bills = results
        .filter(r => r.bill.villageId === villageId)
        .map(r => ({
          ...r.bill,
          headName: r.headName,
          houseNumber: r.houseNumber,
          ward: r.ward,
          phone: r.phone,
        }));
      res.json(bills);
    } catch (error) {
      res.status(500).json({ message: "Failed to get unpaid bills" });
    }
  });

  // ═══════════════════════════════════════════
  // Gateway Config
  // ═══════════════════════════════════════════

  // Get gateway status - returns all active gateways for the village
  app.get('/api/payments/gateway/status', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const allConfigs = await paymentStorage.getAllGatewayConfigs(villageId);
      const activeConfigs = allConfigs.filter(c => c.isActive);

      if (activeConfigs.length === 0) {
        return res.json({ configured: false, gateways: [] });
      }

      const gateways = activeConfigs.map(config => ({
        provider: config.provider,
        mdrPolicy: config.mdrPolicy,
        mdrPercentage: config.mdrPercentage,
        isActive: config.isActive,
        isTestMode: config.isTestMode,
        successRateLast30Days: config.successRateLast30Days,
        avgWebhookLatencyMs: config.avgWebhookLatencyMs,
        lastVerifiedAt: config.lastVerifiedAt,
        lastTestStatus: config.lastTestStatus,
      }));

      // Backward compatible: first gateway as default
      res.json({
        configured: true,
        provider: gateways[0].provider,
        gateways,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get gateway status" });
    }
  });

  // Get masked config for a specific provider (for form pre-fill)
  app.get('/api/payments/gateway/config/:provider', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const provider = req.params.provider;
      const config = await paymentStorage.getGatewayConfig(villageId, provider);

      if (!config || !config.encryptedConfigJson) {
        return res.json({ exists: false });
      }

      const { decryptConfig } = await import("../../utils/crypto");
      const decrypted = decryptConfig<Record<string, string>>(config.encryptedConfigJson);

      // Mask values: show first 4 + last 3 chars
      const masked: Record<string, string> = {};
      for (const [key, val] of Object.entries(decrypted)) {
        if (typeof val === "string" && val.length > 8) {
          masked[key] = val.slice(0, 4) + "***" + val.slice(-3);
        } else if (typeof val === "string") {
          masked[key] = "***";
        }
      }

      res.json({
        exists: true,
        maskedConfig: masked,
        mdrPolicy: config.mdrPolicy,
        mdrPercentage: config.mdrPercentage,
        isTestMode: config.isTestMode,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get config" });
    }
  });

  // Delete a gateway config
  app.delete('/api/payments/gateway/config/:provider', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const provider = req.params.provider;
      await paymentStorage.deactivateGateway(villageId, provider);
      res.json({ message: `Gateway '${provider}' deactivated` });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete config" });
    }
  });

  // Save gateway config (provider-agnostic, encrypted)
  app.post('/api/payments/gateway/config', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const userId = req.session.userId!;
      const { provider, configJson, mdrPolicy, mdrPercentage } = req.body;

      if (!provider || !configJson) {
        return res.status(400).json({ message: "provider and configJson are required" });
      }

      // Auto-determine test mode from environment - not a manager decision
      const isTestMode = process.env.NODE_ENV !== "production";

      // Handle partial updates: merge new fields with existing config
      let finalConfigJson = configJson;
      if (configJson._mdrOnly || Object.keys(configJson).length < (GATEWAY_FIELD_MAP[provider]?.length || 0)) {
        const existing = await paymentStorage.getGatewayConfig(villageId, provider);
        if (existing?.encryptedConfigJson) {
          const { decryptConfig } = await import("../../utils/crypto");
          const existingDecrypted = decryptConfig<Record<string, string>>(existing.encryptedConfigJson);
          // Merge: new values override existing, keep unchanged fields
          finalConfigJson = { ...existingDecrypted };
          for (const [k, v] of Object.entries(configJson)) {
            if (k !== "_mdrOnly" && v) {
              finalConfigJson[k] = v;
            }
          }
        }
        delete finalConfigJson._mdrOnly;
      }

      const config = await paymentStorage.saveGatewayConfig({
        villageId,
        provider,
        configJson: finalConfigJson,
        mdrPolicy,
        mdrPercentage,
        isTestMode,
        configuredBy: userId,
      });

      res.json({ message: "Gateway config saved", config: { configured: true, provider } });
    } catch (error) {
      res.status(500).json({ message: "Failed to save gateway config" });
    }
  });

  // Test gateway connection (uses adapter)
  app.post('/api/payments/gateway/test', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const config = await paymentStorage.getGatewayConfig(villageId);

      if (!config || !config.encryptedConfigJson) {
        return res.status(400).json({ message: "No gateway configured" });
      }

      try {
        // Try to create an adapter - validates config decrypts and has required fields
        getGatewayAdapter({
          provider: config.provider,
          encryptedConfigJson: config.encryptedConfigJson,
          isTestMode: config.isTestMode || false,
        });
        await paymentStorage.updateGatewayTestStatus(villageId, "success");
        res.json({ status: "success", message: "Gateway credentials validated" });
      } catch {
        await paymentStorage.updateGatewayTestStatus(villageId, "failed");
        res.json({ status: "failed", message: "Invalid gateway credentials - adapter initialization failed" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to test gateway" });
    }
  });

  // Gateway webhook (public endpoint, signature-verified)
  app.post('/api/payments/gateway/webhook', async (req, res) => {
    try {
      const rawBody = JSON.stringify(req.body);

      // Step 1: Parse event to extract orderId
      // We need the orderId to look up which village this is for
      const body = req.body;
      const eventType = body.event || body.eventType || "unknown";

      // Try to extract orderId from different gateway formats
      let rawOrderId: string | undefined;
      if (body.payload?.payment?.entity?.order_id) rawOrderId = body.payload.payment.entity.order_id;
      else if (body.data?.order?.order_id) rawOrderId = body.data.order.order_id;
      else if (body.orderId) rawOrderId = body.orderId;

      if (!rawOrderId) {
        return res.json({ status: "ignored", reason: "no orderId" });
      }

      // Step 2: Look up our order → get villageId, billIds
      const order = await paymentStorage.getOrderById(rawOrderId);
      if (!order) {
        return res.json({ status: "ignored", reason: "unknown order" });
      }

      // Step 3: Get gateway config → decrypt → verify signature
      const gatewayConfig = await paymentStorage.getGatewayConfig(order.villageId);
      if (!gatewayConfig || !gatewayConfig.encryptedConfigJson) {
        return res.json({ status: "ignored", reason: "no gateway config" });
      }

      const adapter = getGatewayAdapter({
        provider: gatewayConfig.provider,
        encryptedConfigJson: gatewayConfig.encryptedConfigJson,
      });

      const decryptedConf = decryptConfig(gatewayConfig.encryptedConfigJson);
      const signatureKey = decryptedConf.signature_key || "";

      // Fix 4: Mandatory signature verification - NEVER allow unsigned webhooks
      if (!signatureKey) {
        return res.status(400).json({ status: "error", reason: "no_signature_key_configured" });
      }
      if (!adapter.verifyWebhook(req.headers as Record<string, string>, rawBody, signatureKey)) {
        return res.status(400).json({ status: "error", reason: "invalid signature" });
      }

      // Step 4: Parse event
      const parsed = adapter.parsePaymentEvent(body);

      // Step 5: Calculate webhook latency
      const latencyMs = order.createdAt ? Date.now() - new Date(order.createdAt).getTime() : 0;

      // Step 6: Log event (idempotency check via unique constraint)
      const eventResult = await paymentStorage.logGatewayEvent({
        villageId: order.villageId,
        provider: order.provider,
        eventType,
        orderId: rawOrderId,
        gatewayTxnId: parsed.gatewayTxnId,
        amountPaise: parsed.amountPaise,
        rawPayload: body,
        webhookLatencyMs: latencyMs,
        status: "processed",
      });

      if (eventResult.isDuplicate) {
        return res.json({ status: "ok", duplicate: true });
      }

      // Fix 3: Webhook amount verification - reject if gateway amount mismatches stored order
      if (parsed.amountPaise && order.chargeableAmount) {
        const expectedPaise = Math.round(parseFloat(order.chargeableAmount) * 100);
        if (Math.abs(parsed.amountPaise - expectedPaise) > 100) { // ₹1 tolerance for rounding
          await paymentStorage.logGatewayEvent({
            villageId: order.villageId,
            provider: order.provider,
            eventType: 'amount_mismatch_alert',
            orderId: rawOrderId,
            gatewayTxnId: parsed.gatewayTxnId,
            amountPaise: parsed.amountPaise,
            rawPayload: body,
            webhookLatencyMs: latencyMs,
            status: 'suspicious',
          });
          return res.json({ status: "ignored", reason: "amount_mismatch" });
        }
      }

      // Step 7: Process payment
      if (parsed.status === "success") {
        // Mark order as captured (even if it was expired - delayed webhook scenario)
        await paymentStorage.updateOrderStatus(rawOrderId, "captured");

        // Mark all bills paid
        const billIds = (order.billIds || []) as number[];
        if (billIds.length > 0) {
          await paymentStorage.markBillsPaidBulk(billIds, {
            paymentMethod: order.method || PAYMENT_METHODS.GATEWAY_INAPP,
            receivedByUserId: "gateway",
            gatewayTxnId: parsed.gatewayTxnId,
          });
        }

        // Update health stats
        await paymentStorage.updateGatewayHealthStats(order.villageId, latencyMs);
      } else {
        await paymentStorage.updateOrderStatus(rawOrderId, "failed");
        // Unlock bills so they can be paid again
        const billIds = (order.billIds || []) as number[];
        if (billIds.length > 0) {
          await paymentStorage.unlockBills(billIds);
        }
      }

      // Always return 200 to gateway to prevent retries
      res.json({ status: "ok" });
    } catch (error: any) {
      res.json({ status: "error", message: "Webhook processing failed" });
    }
  });

  // Available gateways for a village (used by households/generators to choose)
  app.get('/api/payments/gateway/available', requireAuth, requireRole(['manager', 'generator']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const gateways = await paymentStorage.getActiveGateways(villageId);
      res.json({ gateways });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to load available gateways" });
    }
  });

  // Create gateway order (multi-bill, with locking + MDR)
  app.post('/api/payments/gateway/create-order', requireAuth, requireRole(['manager', 'generator']), requireVillageAccess, async (req, res) => {
    try {
      const sessionVillageId = req.session.villageId!;
      const { billIds, method, provider: requestedProvider } = req.body; // billIds: number[], method: "upi" | "inapp", provider?: string

      if (!Array.isArray(billIds) || billIds.length === 0) {
        return res.status(400).json({ message: "billIds array is required" });
      }

      // Validate all bills exist and are unpaid
      const bills = [];
      for (const id of billIds) {
        const bill = await paymentStorage.getBillById(id);
        if (!bill) return res.status(404).json({ message: `Bill ${id} not found` });
        if (bill.status !== "unpaid") return res.status(400).json({ message: `Bill ${id} is not unpaid` });
        bills.push(bill);
      }

      // Validate all bills belong to same household + same village
      const householdIds = new Set(bills.map(b => b.householdId));
      if (householdIds.size > 1) {
        return res.status(400).json({ message: "All bills must belong to the same household" });
      }

      // Handler-level village validation - prevent cross-village order creation
      const billVillageIds = new Set(bills.map(b => b.villageId));
      if (billVillageIds.size > 1 || !billVillageIds.has(sessionVillageId)) {
        return res.status(403).json({ message: "Access denied - bills belong to another village" });
      }

      // Check for overlapping pending order → return existing session
      const existingOrder = await paymentStorage.findPendingOrderForBills(billIds);
      if (existingOrder) {
        return res.status(409).json({
          message: "ACTIVE_PAYMENT_SESSION_EXISTS",
          existingOrder: {
            orderId: existingOrder.orderId,
            status: existingOrder.status,
            billIds: existingOrder.billIds,
            totalAmount: existingOrder.totalAmount,
            chargeableAmount: existingOrder.chargeableAmount,
            expiresAt: existingOrder.expiresAt,
          },
        });
      }

      const villageId = bills[0].villageId;
      // Use requested provider if specified, otherwise fall back to first active
      const config = requestedProvider
        ? await paymentStorage.getGatewayConfig(villageId, requestedProvider)
        : await paymentStorage.getGatewayConfig(villageId);
      if (!config || !config.isActive || !config.encryptedConfigJson) {
        return res.status(400).json({ message: requestedProvider ? `Gateway '${requestedProvider}' not configured or inactive` : "Payment gateway not configured or inactive" });
      }

      // Lock bills
      const locked = await paymentStorage.lockBillsForPayment(billIds);
      if (!locked) {
        return res.status(409).json({ message: "Could not lock all bills - some may already be in payment" });
      }

      try {
        // Calculate amounts
        const billAmounts = bills.map(b => parseFloat(b.feeAmountSnapshot || "0"));
        const totalAmount = billAmounts.reduce((sum, a) => sum + a, 0);

        // MDR calculation - no rounding internally, round half-up for gateway
        let mdrAmount = 0;
        if (config.mdrPolicy === "household_pays" && config.mdrPercentage) {
          mdrAmount = totalAmount * (parseFloat(config.mdrPercentage) / 100);
        }
        const chargeableAmount = Math.round(totalAmount + mdrAmount); // round half-up for gateway

        const paymentMethod = method === "upi" ? PAYMENT_METHODS.GATEWAY_UPI_QR : PAYMENT_METHODS.GATEWAY_INAPP;
        const billingMonths = bills.map(b => b.billingMonth).join(",");

        // Get adapter
        const adapter = getGatewayAdapter({
          provider: config.provider,
          encryptedConfigJson: config.encryptedConfigJson,
          isTestMode: config.isTestMode || false,
        });

        const metadata: Record<string, string> = {
          billIds: billIds.join(","),
          villageId,
          billingMonths,
          method: paymentMethod,
          householdId: String(bills[0].householdId),
        };

        // For PayU: set callback URL (redirect-based flow)
        if (config.provider === "payu") {
          const protocol = req.protocol;
          const host = req.get("host") || "localhost:5000";
          metadata.callbackUrl = `${protocol}://${host}/api/payments/payu/callback`;
        }

        // Look up household for real customer details
        const household = await paymentStorage.getHouseholdById(bills[0].householdId);
        const customerName = household?.headName || "Household";
        const customerPhone = household?.phone || "9999999999";

        let result;
        const internalOrderId = `gp_${villageId}_${crypto.randomUUID()}`;

        if (method === "upi") {
          // Manager QR flow - create Payment Link for household to scan
          // Note: UPI Payment Links only work in Razorpay LIVE mode
          const qrResult = await adapter.createUPIQRPayment({
            orderId: internalOrderId.slice(0, 40),
            chargeableAmountRupees: chargeableAmount,
            customerName,
            customerPhone,
            metadata,
          });

          const order = await paymentStorage.createGatewayOrder({
            orderId: internalOrderId,
            villageId,
            provider: config.provider,
            billIds,
            billAmounts,
            totalAmount: totalAmount.toFixed(2),
            mdrAmount: mdrAmount.toFixed(2),
            chargeableAmount: chargeableAmount.toFixed(2),
            method: paymentMethod,
          });

          // Use pre-rendered QR image from gateway, or generate from payload
          let qrImageDataUrl: string | undefined = qrResult.qrImageDataUrl;
          if (!qrImageDataUrl && qrResult.qrPayload) {

            try {
              qrImageDataUrl = await (await import("qrcode")).toDataURL(qrResult.qrPayload, {
                width: 280, margin: 2, errorCorrectionLevel: "L",
              });
            } catch {
            }
          }

          result = {
            orderId: order.orderId,
            qrPayload: qrResult.qrPayload,
            qrImageDataUrl,
            expiresAt: qrResult.expiresAt,
            totalAmount,
            mdrAmount,
            chargeableAmount,
          };
        } else {
          // Generator checkout flow - standard Razorpay Checkout.js (works in test & live)
          const checkoutResult = await adapter.createInAppCheckout({
            orderId: internalOrderId.slice(0, 40),
            chargeableAmountRupees: chargeableAmount,
            customerName,
            customerPhone,
            metadata,
          });

          const order = await paymentStorage.createGatewayOrder({
            orderId: internalOrderId,
            villageId,
            provider: config.provider,
            billIds,
            billAmounts,
            totalAmount: totalAmount.toFixed(2),
            mdrAmount: mdrAmount.toFixed(2),
            chargeableAmount: chargeableAmount.toFixed(2),
            method: paymentMethod,
          });

          result = {
            orderId: order.orderId,
            checkoutData: checkoutResult.checkoutData,
            razorpayOrderId: checkoutResult.orderId,
            totalAmount,
            mdrAmount,
            chargeableAmount,
          };
        }

        res.json(result);
      } catch (adapterError) {
        // Unlock bills on adapter failure
        await paymentStorage.unlockBills(billIds);
        throw adapterError;
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  // Check order status (for frontend polling)
  app.get('/api/payments/order-status/:orderId', requireAuth, requireRole(['manager', 'generator']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const order = await paymentStorage.getOrderById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Fix 6: Village scope check - prevent cross-village order polling
      if (order.villageId !== villageId) {
        return res.status(404).json({ message: "Order not found" }); // 404 not 403 to avoid info leak
      }

      res.json({
        orderId: order.orderId,
        status: order.status,
        billIds: order.billIds,
        totalAmount: order.totalAmount,
        chargeableAmount: order.chargeableAmount,
        expiresAt: order.expiresAt,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get order status" });
    }
  });

  // ═══════════════════════════════════════════
  // Household Self-Service (My Bills)
  // ═══════════════════════════════════════════

  // Get my unpaid bills (generator self-service, secured by session userId)
  app.get('/api/payments/my-bills', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const household = await paymentStorage.getHouseholdByGeneratorUserId(userId);
      if (!household) {
        return res.json({ household: null, bills: [], totalDue: 0 });
      }
      const bills = await paymentStorage.getMyUnpaidBills(household.id);
      const totalDue = bills.reduce((sum, b) => sum + parseFloat(b.feeAmountSnapshot || "0"), 0);
      res.json({
        household: {
          id: household.id,
          headName: household.headName,
          houseNumber: household.houseNumber,
          ward: household.ward,
          phone: household.phone,
          householdType: household.householdType,
        },
        bills,
        totalDue,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get bills" });
    }
  });

  // Get my payment history (generator self-service)
  app.get('/api/payments/my-history', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const household = await paymentStorage.getHouseholdByGeneratorUserId(userId);
      if (!household) {
        return res.json([]);
      }
      const history = await paymentStorage.getMyPaymentHistory(household.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to get payment history" });
    }
  });

  // Check if online payment is available for my village
  app.get('/api/payments/my-gateway-status', requireAuth, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      if (!villageId) return res.json({ available: false, gateways: [] });
      const gateways = await paymentStorage.getActiveGateways(villageId);
      res.json({
        available: gateways.length > 0,
        provider: gateways[0]?.provider || null, // backward compatible
        gateways,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check gateway" });
    }
  });

  // ═══════════════════════════════════════════
  // Payment Verification (Checkout.js callback)
  // ═══════════════════════════════════════════

  // After checkout succeeds, frontend sends payment details here for server-side verification
  app.post('/api/payments/gateway/verify-payment', requireAuth, requireRole(['manager', 'generator']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const { orderId, provider } = req.body;

      if (!orderId || !provider) {
        return res.status(400).json({ message: "orderId and provider are required" });
      }

      // Get our order
      const order = await paymentStorage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.villageId !== villageId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (order.status === "captured") {
        return res.json({ message: "Payment already verified", status: "captured" });
      }

      // Get gateway config - use the specific provider's config
      const config = await paymentStorage.getGatewayConfig(villageId, provider);
      if (!config || !config.encryptedConfigJson) {
        return res.status(400).json({ message: `Gateway '${provider}' not configured` });
      }

      const { decryptConfig } = await import("../../utils/crypto");
      const gatewayKeys = decryptConfig<Record<string, string>>(config.encryptedConfigJson);

      let verified = false;
      let gatewayTxnId = "";

      if (provider === "razorpay") {
        // ── Razorpay: verify HMAC signature ──
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
          return res.status(400).json({ message: "Missing Razorpay verification fields" });
        }

        const keySecret = gatewayKeys.key_secret || gatewayKeys.secret_key;
        if (!keySecret) {
          return res.status(500).json({ message: "Gateway secret key not found" });
        }

        const expectedSignature = crypto
          .createHmac("sha256", keySecret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest("hex");

        const receivedBuf = Buffer.from(razorpay_signature, "hex");
        const expectedBuf = Buffer.from(expectedSignature, "hex");

        verified = receivedBuf.length === expectedBuf.length &&
          crypto.timingSafeEqual(receivedBuf, expectedBuf);
        

        if (!verified) {
        }
        gatewayTxnId = razorpay_payment_id;

      } else if (provider === "cashfree") {
        // ── Cashfree: verify by checking order status via API ──
        const isTestMode = process.env.NODE_ENV !== "production";
        const baseUrl = isTestMode
          ? "https://sandbox.cashfree.com/pg"
          : "https://api.cashfree.com/pg";

        const apiVersion = gatewayKeys.api_version || "2023-08-01";

        // Cashfree knows the order by the truncated ID (max 40 chars)
        const cfOrderId = orderId.slice(0, 40);


        // Call Cashfree API to get actual order status
        const cfResponse = await fetch(`${baseUrl}/orders/${cfOrderId}`, {
          headers: {
            "x-client-id": gatewayKeys.client_id,
            "x-client-secret": gatewayKeys.client_secret,
            "x-api-version": apiVersion,
          },
        });

        if (cfResponse.ok) {
          const cfOrder = await cfResponse.json();

          // Cashfree order_status: PAID, ACTIVE, EXPIRED, etc.
          if (cfOrder.order_status === "PAID") {
            verified = true;
            gatewayTxnId = cfOrder.cf_order_id || cfOrder.order_id || orderId;
          }
        } else {
          const errText = await cfResponse.text();
        }
      } else if (provider === "payu") {
        // ── PayU: verify by checking transaction status via API ──
        const isTestMode = process.env.NODE_ENV !== "production";
        const baseUrl = isTestMode
          ? "https://test.payu.in"
          : "https://info.payu.in";

        const command = "verify_payment";
        const key = gatewayKeys.merchant_key;
        const salt = gatewayKeys.merchant_salt;
        const txnId = orderId.slice(0, 40);

        // PayU verify hash: sha512(key|command|var1|salt)
        const hashStr = `${key}|${command}|${txnId}|${salt}`;
        const hash = crypto.createHash("sha512").update(hashStr).digest("hex");



        const verifyResponse = await fetch(`${baseUrl}/merchant/postservice?form=2`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            key,
            command,
            var1: txnId,
            hash,
          }).toString(),
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          const txnInfo = verifyData?.transaction_details?.[txnId];

          if (txnInfo && txnInfo.status === "success") {
            verified = true;
            gatewayTxnId = txnInfo.mihpayid || txnId;
          }
        } else {
          const errText = await verifyResponse.text();
        }
      }

      if (!verified) {
        return res.status(400).json({ message: "Payment could not be verified" });
      }

      // Verified - mark order as captured and bills as paid
      await paymentStorage.updateOrderStatus(orderId, "captured");

      const billIds = (order.billIds || []) as number[];
      let results: any[] = [];
      if (billIds.length > 0) {
        results = await paymentStorage.markBillsPaidBulk(billIds, {
          paymentMethod: order.method || PAYMENT_METHODS.GATEWAY_INAPP,
          receivedByUserId: req.session.userId!,
          gatewayTxnId,
        });
      }


      res.json({ message: "Payment verified and recorded", status: "captured", billCount: billIds.length, results });
    } catch (error: any) {
      res.status(500).json({ message: "Payment verification failed" });
    }
  });

  // ═══════════════════════════════════════════
  // PayU Callback (redirect-based flow)
  // ═══════════════════════════════════════════

  // PayU redirects the user here after payment (both success and failure)
  // This is a public endpoint - no requireAuth (user's session may not persist across redirect)
  app.post('/api/payments/payu/callback', async (req, res) => {
    try {
      const body = req.body;
      const txnid = body.txnid || "";
      const status = (body.status || "").toLowerCase();
      const receivedHash = body.hash || "";
      const mihpayid = body.mihpayid || "";



      if (!txnid) {
        return res.redirect('/?payment=error&reason=missing_txnid');
      }

      // Find order by orderId (txnid was sliced to 40 chars)
      // Try exact match first, then partial match
      let order = await paymentStorage.getOrderById(txnid);
      if (!order) {
        // txnid is the truncated orderId - find by matching prefix
        const allPending = await paymentStorage.findOrderByTruncatedId(txnid);
        order = allPending;
      }

      if (!order) {
        return res.redirect('/?payment=error&reason=order_not_found');
      }

      if (order.status === "captured") {
        // Already processed
        return res.redirect('/?payment=success');
      }

      if (status !== "success") {
        // Payment failed or dropped
        await paymentStorage.updateOrderStatus(order.orderId, "failed");
        const billIds = (order.billIds || []) as number[];
        await paymentStorage.unlockBills(billIds);

        return res.redirect('/?payment=failed');
      }

      // Verify PayU reverse hash
      const config = await paymentStorage.getGatewayConfig(order.villageId);
      if (!config || !config.encryptedConfigJson) {
        return res.redirect('/?payment=error&reason=config_missing');
      }

      const { decryptConfig } = await import("../../utils/crypto");
      const gatewayKeys = decryptConfig<Record<string, string>>(config.encryptedConfigJson);
      const { getGatewayAdapter } = await import("./gateways/gateway.factory");

      const adapter = getGatewayAdapter({
        provider: "payu",
        encryptedConfigJson: config.encryptedConfigJson,
        isTestMode: process.env.NODE_ENV !== "production",
      });

      const signatureKey = gatewayKeys.merchant_salt || gatewayKeys.signature_key || "";
      const isValid = adapter.verifyWebhook({}, JSON.stringify(body), signatureKey);

      if (!isValid) {
        return res.redirect('/?payment=error&reason=verification_failed');
      }

      // Verified - mark order as captured and bills as paid
      await paymentStorage.updateOrderStatus(order.orderId, "captured");

      const billIds = (order.billIds || []) as number[];
      if (billIds.length > 0) {
        await paymentStorage.markBillsPaidBulk(billIds, {
          paymentMethod: order.method || PAYMENT_METHODS.GATEWAY_INAPP,
          receivedByUserId: "payu_callback", // No user session in redirect flow
          gatewayTxnId: mihpayid,
        });
      }


      return res.redirect('/?payment=success');
    } catch (error: any) {
      return res.redirect('/?payment=error');
    }
  });

  // ═══════════════════════════════════════════
  // Dev Simulation (non-production only)
  // ═══════════════════════════════════════════

  if (process.env.NODE_ENV !== "production") {
    // Simulate payment success - instantly marks bills as paid via order
    app.post('/api/dev/simulate-payment-success', requireAuth, async (req, res) => {
      try {
        const { orderId } = req.body;
        if (!orderId) {
          return res.status(400).json({ message: "orderId is required" });
        }

        const order = await paymentStorage.getOrderById(orderId);
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }

        if (order.status === "captured") {
          return res.status(400).json({ message: "Order already captured" });
        }

        // Mark order as captured
        await paymentStorage.updateOrderStatus(orderId, "captured");

        // Mark all bills paid
        const billIds = (order.billIds || []) as number[];
        if (billIds.length > 0) {
          const results = await paymentStorage.markBillsPaidBulk(billIds, {
            paymentMethod: order.method || PAYMENT_METHODS.GATEWAY_INAPP,
            receivedByUserId: "dev_simulation",
            gatewayTxnId: `sim_${Date.now()}`,
          });
          res.json({ message: "Payment simulated", orderId, billIds, results });
        } else {
          res.json({ message: "Order has no bills", orderId });
        }
      } catch (error: any) {
        res.status(500).json({ message: "Simulation failed" });
      }
    });
  }
}
