import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  IndianRupee,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  CreditCard,
  FileText,
  ChevronRight,
} from "lucide-react";

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function formatMonth(billingMonth: string) {
  const [year, month] = billingMonth.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// Load checkout script dynamically based on provider
const CHECKOUT_SCRIPTS: Record<string, { src: string; globalName: string }> = {
  razorpay: {
    src: "https://checkout.razorpay.com/v1/checkout.js",
    globalName: "Razorpay",
  },
  cashfree: {
    src: "https://sdk.cashfree.com/js/v3/cashfree.js",
    globalName: "Cashfree",
  },
  payu: {
    src: "https://jssdk.payu.in/bolt/bolt.min.js",
    globalName: "bolt",
  },
};

function loadCheckoutScript(provider: string): Promise<boolean> {
  const config = CHECKOUT_SCRIPTS[provider];
  if (!config) {
    // Provider doesn't use an external SDK (e.g. PayU uses form redirect)
    return Promise.resolve(true);
  }

  // Already loaded
  if ((window as any)[config.globalName]) {
    return Promise.resolve(true);
  }

  // Check if script tag already exists (previous load attempt)
  const existing = document.querySelector(`script[src="${config.src}"]`);
  if (existing) {
    // Script tag exists but global isn't set - wait a moment
    return new Promise((resolve) => {
      setTimeout(() => resolve(!!(window as any)[config.globalName]), 1000);
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = config.src;
    script.onload = () => {
      // Small delay to ensure global is registered
      setTimeout(() => resolve(!!(window as any)[config.globalName]), 200);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

function openProviderCheckout(
  provider: string,
  checkoutData: any,
  onSuccess: (response: any) => void,
  onFailed: (response: any) => void,
  onDismiss: () => void,
) {
  if (provider === "razorpay") {
    const rzp = new (window as any).Razorpay({
      ...checkoutData,
      handler: onSuccess,
      modal: { ondismiss: onDismiss },
    });
    rzp.on("payment.failed", onFailed);
    rzp.open();
  } else if (provider === "cashfree") {
    const cashfree = (window as any).Cashfree({
      mode: checkoutData.environment || "sandbox",
    });
    cashfree.checkout({
      paymentSessionId: checkoutData.paymentSessionId,
      redirectTarget: "_modal", // open in popup, not redirect
    }).then((result: any) => {
      if (result.error) {
        // Payment failed or user cancelled
        if (result.error.code === "ORDER_PAYMENT_NOT_CAPTURED") {
          onDismiss();
        } else {
          onFailed(result.error);
        }
      } else {
        // Payment was successful
        onSuccess(result);
      }
    }).catch((err: any) => {
      onFailed(err);
    });
  } else if (provider === "payu") {
    // PayU Bolt SDK - opens a payment popup (like Razorpay/Cashfree)
    const { formFields } = checkoutData;
    if (!formFields) {
      onFailed(new Error("Missing PayU checkout data"));
      return;
    }

    const bolt = (window as any).bolt;
    if (!bolt) {
      onFailed(new Error("PayU Bolt SDK not loaded"));
      return;
    }

    bolt.launch(formFields, {
      responseHandler: (response: any) => {
        if (response.response.txnStatus === "SUCCESS") {
          onSuccess(response.response);
        } else {
          onFailed(new Error(response.response.txnMessage || "Payment failed"));
        }
      },
      catchException: (error: any) => {
        onFailed(error);
      },
    });
  }
}

// ═══════════════════════════════════════════
// MyBillsTab Component
// ═══════════════════════════════════════════

type PaymentState = "idle" | "creating" | "checkout_open" | "success" | "failed" | "session_exists";

export function MyBillsTab() {
  const { toast } = useToast();

  // State
  const [selectedBillIds, setSelectedBillIds] = useState<Set<number>>(new Set());
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // ── Queries ──

  const { data: myBillsData, isLoading } = useQuery<{
    household: any;
    bills: any[];
    totalDue: number;
  }>({
    queryKey: ["my-bills"],
    queryFn: () => fetch("/api/payments/my-bills", { credentials: "include" }).then(r => r.json()),
    staleTime: 0,
  });

  const { data: historyData } = useQuery<any[]>({
    queryKey: ["my-history"],
    queryFn: () => fetch("/api/payments/my-history", { credentials: "include" }).then(r => r.json()),
    staleTime: 0,
  });

  const { data: gatewayStatus } = useQuery<{ available: boolean; provider: string | null; gateways: { provider: string; mdrPercentage: string }[] }>({
    queryKey: ["my-gateway-status"],
    queryFn: () => fetch("/api/payments/my-gateway-status", { credentials: "include" }).then(r => r.json()),
    staleTime: 0,
  });

  // Auto-select provider when only one gateway is available
  const gateways = gatewayStatus?.gateways || [];
  const effectiveProvider = selectedProvider || gatewayStatus?.provider;

  // ── Mutations ──

  const createOrderMutation = useMutation({
    mutationFn: async (billIds: number[]) => {
      const res = await apiRequest("POST", "/api/payments/gateway/create-order", {
        billIds,
        method: "checkout",
        provider: effectiveProvider,
      });
      if (res.status === 409) {
        const data = await res.json();
        return { ...data, _isExistingSession: true };
      }
      return res.json();
    },
  });

  // Main pay handler: pre-load script → create order → open checkout
  async function handlePayNow() {
    const provider = effectiveProvider;
    if (!provider) {
      toast({ title: "Payment Error", description: "No payment gateway configured.", variant: "destructive" });
      return;
    }

    setPaymentState("creating");

    // Step 1: Pre-load the checkout script BEFORE creating order
    const scriptLoaded = await loadCheckoutScript(provider);
    if (!scriptLoaded) {
      toast({
        title: "Payment Error",
        description: "Could not load payment gateway. Check your internet connection and try again.",
        variant: "destructive",
      });
      setPaymentState("failed");
      return; // No order created → bills NOT locked
    }

    // Step 2: Create the order (now bills get locked)
    try {
      const data = await createOrderMutation.mutateAsync(Array.from(selectedBillIds));

      if (data._isExistingSession && data.existingOrder) {
        setPaymentState("session_exists");
        return;
      }

      const checkoutData = data.checkoutData;
      if (!checkoutData) {
        toast({ title: "Payment Error", description: "No checkout data received.", variant: "destructive" });
        setPaymentState("failed");
        return;
      }

      // Step 3: Open the provider's checkout popup
      setPaymentState("checkout_open");

      openProviderCheckout(
        provider,
        checkoutData,
        // onSuccess - send payment details to backend for verification
        async (response: any) => {
          try {
            // Build verify payload based on provider
            const verifyPayload: any = {
              orderId: data.orderId,
              provider,
            };

            if (provider === "razorpay") {
              verifyPayload.razorpay_payment_id = response.razorpay_payment_id;
              verifyPayload.razorpay_order_id = response.razorpay_order_id;
              verifyPayload.razorpay_signature = response.razorpay_signature;
            } else if (provider === "cashfree") {
              // Cashfree checkout returns order status - server verifies via API
              verifyPayload.cf_order_id = checkoutData.cfOrderId || response?.order?.orderId;
            } else if (provider === "payu") {
              verifyPayload.mihpayid = response.mihpayid;
            }

            const verifyRes = await apiRequest("POST", "/api/payments/gateway/verify-payment", verifyPayload);

            if (verifyRes.ok) {
              setPaymentState("success");
              if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
              queryClient.invalidateQueries({ queryKey: ["my-bills"] });
              queryClient.invalidateQueries({ queryKey: ["my-history"] });
              toast({ title: "✅ Payment Successful!" });
            } else {
              setPaymentState("failed");
              toast({ title: "Verification Failed", description: "Payment could not be verified. Please check your bank statement or contact support.", variant: "destructive" });
            }
          } catch (_err: unknown) {
            setPaymentState("failed");
            toast({
              title: "⚠ Verification Error",
              description: "Payment may have been captured but could not be verified. Check your bank or contact support.",
              variant: "destructive",
            });
          }
        },
        // onFailed
        (response: any) => {
          setPaymentState("failed");
          toast({
            title: "Payment Failed",
            description: response?.error?.description || "Something went wrong",
            variant: "destructive",
          });
        },
        // onDismiss
        () => {
          setPaymentState("idle");
          toast({ title: "Payment cancelled", description: "You can try again anytime." });
        },
      );
    } catch (_error: unknown) {
      setPaymentState("failed");
      toast({ title: "Payment failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
  }

  // ── Derived ──

  const household = myBillsData?.household;
  const unpaidBills = myBillsData?.bills || [];
  const totalDue = myBillsData?.totalDue || 0;
  const paidHistory = Array.isArray(historyData) ? historyData.filter((b: any) => b.status !== "unpaid") : [];
  const canPayOnline = gatewayStatus?.available === true;

  // Auto-select all unpaid when bills load
  useEffect(() => {
    if (unpaidBills.length > 0 && selectedBillIds.size === 0 && paymentState === "idle") {
      setSelectedBillIds(new Set(unpaidBills.map((b: any) => b.id)));
    }
  }, [unpaidBills.length]);

  const selectedTotal = unpaidBills
    .filter((b: any) => selectedBillIds.has(b.id))
    .reduce((s: number, b: any) => s + parseFloat(b.feeAmountSnapshot || "0"), 0);

  // ── Loading ──

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-green-200 border-t-green-600 rounded-full"></div>
      </div>
    );
  }

  // ── No household linked ──

  if (!household) {
    return (
      <div className="text-center py-16 px-4">
        <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-700 mb-1">No Bills</h3>
        <p className="text-sm text-gray-500">Your account is not linked to a household yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-1">
      {/* ── Summary Card (Conversion Trigger) ── */}
      {unpaidBills.length > 0 ? (
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <CardContent className="pt-5 pb-4 text-center">
            <div className="text-sm text-red-600 font-medium mb-1">Outstanding Waste Collection Fees</div>
            <div className="text-3xl font-bold text-red-700 mb-1">
              ₹{totalDue.toLocaleString("en-IN")}
            </div>
            <div className="text-sm text-red-500 mb-4">
              {unpaidBills.length} month{unpaidBills.length > 1 ? "s" : ""} due
            </div>
            {canPayOnline ? (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white h-14 text-lg px-8 rounded-xl shadow-lg"
                onClick={() => {
                  setSelectedBillIds(new Set(unpaidBills.map((b: any) => b.id)));
                  setShowPayDialog(true);
                }}
              >
                <CreditCard className="h-5 w-5 mr-2" /> Pay Now
              </Button>
            ) : (
              <div className="bg-white rounded-xl p-3 border border-orange-200">
                <p className="text-sm text-gray-600">
                  💰 Please pay fee to your collection staff.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-5 pb-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <div className="text-lg font-semibold text-green-700">All Clear!</div>
            <div className="text-sm text-green-600">No fees due at this time.</div>
          </CardContent>
        </Card>
      )}

      {/* ── Unpaid Bills List (Selectable) ── */}
      {unpaidBills.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1">Unpaid Dues</div>
          {unpaidBills.map((bill: any) => {
            const isSelected = selectedBillIds.has(bill.id);
            return (
              <label
                key={bill.id}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all",
                  isSelected
                    ? "border-green-300 bg-green-50 shadow-sm"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-3">
                  {canPayOnline && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedBillIds(prev => {
                          const next = new Set(prev);
                          if (next.has(bill.id)) next.delete(bill.id);
                          else next.add(bill.id);
                          return next;
                        });
                      }}
                      className="accent-green-600 w-5 h-5"
                    />
                  )}
                  <div>
                    <div className="text-sm font-medium">{formatMonth(bill.billingMonth)}</div>
                    <div className="text-xs text-gray-400">
                      <Clock className="h-3 w-3 inline mr-0.5" />Due
                    </div>
                  </div>
                </div>
                <span className="text-base font-bold text-red-600">₹{bill.feeAmountSnapshot}</span>
              </label>
            );
          })}

          {/* Selected total + pay button */}
          {canPayOnline && selectedBillIds.size > 0 && (
            <div className="pt-2">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg rounded-xl shadow-lg"
                onClick={() => setShowPayDialog(true)}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Pay ₹{selectedTotal.toLocaleString("en-IN")} ({selectedBillIds.size} month{selectedBillIds.size > 1 ? "s" : ""})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Payment History ── */}
      {paidHistory.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1">Payment History</div>
          {paidHistory.map((bill: any) => (
            <div
              key={bill.id}
              className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100"
            >
              <div className="flex items-center gap-3">
                {bill.status === "paid" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : bill.status === "waived" ? (
                  <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center text-xs">⚪</div>
                ) : (
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                )}
                <div>
                  <div className="text-sm font-medium">{formatMonth(bill.billingMonth)}</div>
                  <div className="text-xs text-gray-400">
                    {bill.status === "paid" && bill.paymentMethod && (
                      <span className="capitalize">
                        {bill.paymentMethod === "cash" ? "Cash" :
                         bill.paymentMethod === "gateway_upi_qr" ? "UPI" : bill.paymentMethod}
                      </span>
                    )}
                    {bill.status === "waived" && "Waived"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {bill.status === "paid" ? (
                  <span className="text-sm font-medium text-green-600">₹{bill.feeAmountSnapshot}</span>
                ) : (
                  <Badge variant="secondary" className="text-xs">Waived</Badge>
                )}
                {bill.receiptNumber && (
                  <button className="text-gray-400 hover:text-gray-600">
                    <FileText className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No history at all */}
      {unpaidBills.length === 0 && paidHistory.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400">
          No billing history yet.
        </div>
      )}

      {/* ── Payment Confirmation Dialog ── */}
      <Dialog open={showPayDialog} onOpenChange={(open) => {
        if (!open) {
          setShowPayDialog(false);
          setPaymentState("idle");
        }
      }}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {paymentState === "success" ? "✅ Payment Successful" :
               paymentState === "creating" ? "Setting up payment..." :
               paymentState === "checkout_open" ? "Complete payment..." :
               paymentState === "failed" ? "❌ Payment Failed" :
               paymentState === "session_exists" ? "⏳ Payment In Progress" :
               "Confirm Payment"}
            </DialogTitle>
          </DialogHeader>

          {/* IDLE - Show bill breakdown + confirm */}
          {paymentState === "idle" && (
            <div className="space-y-4">
              {/* Bill breakdown */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="text-xs font-medium text-gray-500 uppercase">Bill Details</div>
                {unpaidBills
                  .filter((b: any) => selectedBillIds.has(b.id))
                  .map((bill: any) => (
                    <div key={bill.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{formatMonth(bill.billingMonth)}</span>
                      <span className="font-medium">₹{parseFloat(bill.feeAmountSnapshot).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                <div className="border-t pt-2 flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span className="text-green-700">₹{selectedTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Gateway selector - shown only when multiple gateways available */}
              {gateways.length > 1 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 uppercase">Pay via</div>
                  <div className="flex gap-2">
                    {gateways.map((gw: any) => (
                      <button
                        key={gw.provider}
                        onClick={() => setSelectedProvider(gw.provider)}
                        className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all capitalize ${
                          effectiveProvider === gw.provider
                            ? "border-green-600 bg-green-50 text-green-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {gw.provider}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg rounded-xl"
                disabled={createOrderMutation.isPending}
                onClick={handlePayNow}
              >
                <CreditCard className="h-5 w-5 mr-2" /> Pay ₹{selectedTotal.toLocaleString("en-IN")}
              </Button>

              <p className="text-xs text-center text-gray-400">
                Secure payment via {effectiveProvider ? effectiveProvider.charAt(0).toUpperCase() + effectiveProvider.slice(1) : "gateway"}. UPI, Card, Net Banking accepted.
              </p>
            </div>
          )}

          {/* CREATING */}
          {paymentState === "creating" && (
            <div className="text-center py-8">
              <div className="animate-spin h-10 w-10 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Setting up payment...</p>
            </div>
          )}

          {/* CHECKOUT OPEN */}
          {paymentState === "checkout_open" && (
            <div className="text-center py-6 space-y-3">
              <div className="animate-pulse">
                <CreditCard className="h-12 w-12 text-blue-500 mx-auto mb-3" />
              </div>
              <div className="text-base font-medium text-gray-700">Complete payment in the popup</div>
              <p className="text-sm text-gray-500">
                Select UPI, Card, or Net Banking to pay ₹{selectedTotal.toLocaleString("en-IN")}
              </p>
            </div>
          )}

          {/* SUCCESS */}
          {paymentState === "success" && (
            <div className="text-center py-6 space-y-3">
              <div className="text-6xl">✅</div>
              <div className="text-xl font-bold text-green-700">
                ₹{selectedTotal.toLocaleString("en-IN")} Paid!
              </div>
              <div className="text-sm text-gray-600">
                {selectedBillIds.size} receipt(s) will be generated
              </div>
              <Button className="mt-4 w-full bg-green-600 hover:bg-green-700 h-12 rounded-xl" onClick={() => {
                setShowPayDialog(false);
                setPaymentState("idle");
                setSelectedBillIds(new Set());
              }}>
                Done
              </Button>
            </div>
          )}

          {/* FAILED */}
          {paymentState === "failed" && (
            <div className="text-center py-6 space-y-3">
              <div className="text-5xl">❌</div>
              <div className="text-lg font-semibold text-red-600">Payment Failed</div>
              <p className="text-sm text-gray-500">Could not complete payment. Please try again.</p>
              <Button className="w-full bg-green-600 hover:bg-green-700 h-12 rounded-xl" onClick={() => setPaymentState("idle")}>
                Try Again
              </Button>
            </div>
          )}

          {/* SESSION EXISTS */}
          {paymentState === "session_exists" && (
            <div className="text-center py-6 space-y-3">
              <div className="text-5xl">⏳</div>
              <div className="text-lg font-semibold text-orange-600">Payment In Progress</div>
              <p className="text-sm text-gray-500">
                A previous payment session is still active. It will expire in a few minutes.
              </p>
              <p className="text-sm text-gray-500">
                If you already paid, your payment will be processed automatically.
              </p>
              <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => {
                setShowPayDialog(false);
                setPaymentState("idle");
              }}>
                OK, I'll Wait
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
