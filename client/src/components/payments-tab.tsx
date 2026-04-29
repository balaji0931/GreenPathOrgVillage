import { useState, useEffect, useRef } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  IndianRupee,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  Search,
  Filter,
  ChevronRight,
  Zap,
  AlertTriangle,
  Settings,
  QrCode,
  Undo2,
  ShieldCheck,
  CreditCard,
  Save,
  Edit3,
  X,
  Activity,
  ToggleLeft,
  ToggleRight,
  Wifi,
} from "lucide-react";
import { GATEWAY_PROVIDERS, GATEWAY_FIELD_MAP, MDR_POLICIES } from "@shared/payment.constants";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface BillWithHousehold {
  id: number;
  householdId: number;
  villageId: string;
  billingMonth: string;
  cycleId: number;
  householdTypeSnapshot: string;
  feeAmountSnapshot: string;
  status: string;
  paidAt: string | null;
  paymentMethod: string | null;
  receiptNumber: string | null;
  headName: string;
  houseNumber: string;
  ward: string;
  phone: string;
  householdUid: string;
}

interface PaymentSummary {
  billingMonth: string;
  totalDue: string;
  totalCollected: string;
  outstanding: string;
  collectionRate: string;
  paidCount: number;
  unpaidCount: number;
  waivedCount: number;
  cashCount: number;
  gatewayCount: number;
  totalBills: number;
  pastArrears: number;
}

interface ActivationPreview {
  alreadyActivated: boolean;
  cycle?: any;
  breakdown?: {
    typeCode: string;
    displayName: string;
    feeAmount: string;
    isWaived: boolean;
    householdCount: number;
  }[];
  totalBillable?: number;
  totalWaived?: number;
  totalExpectedRevenue?: string;
  unclassifiedCount?: number;
  hasFeeConfig?: boolean;
  gatewayStatus?: {
    provider: string;
    isActive: boolean;
    mdrPolicy: string;
    isTestMode: boolean;
    lastVerifiedAt: string;
    lastTestStatus: string;
  } | null;
}

interface FeeEntry {
  householdTypeCode: string;
  feeAmount: string;
  isWaivedCategory: boolean;
}

// ═══════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(m: string): string {
  const [year, month] = m.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(month) - 1]} ${year}`;
}

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════

export default function PaymentsTab({ initialScreen = "overview" }: { initialScreen?: "overview" | "settings" } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const villageId = user?.villageId;

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showActivation, setShowActivation] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillWithHousehold | null>(null);
  const [showHouseholdBills, setShowHouseholdBills] = useState<number | null>(null);
  const [paymentScreen, setPaymentScreen] = useState<"overview" | "settings">(initialScreen);

  // Fee config editing state
  const [isEditingFees, setIsEditingFees] = useState(false);
  const [editableFees, setEditableFees] = useState<Record<string, FeeEntry>>({});

  // Gateway config editing state
  const [showGatewaySetup, setShowGatewaySetup] = useState(false);
  const [gwProvider, setGwProvider] = useState("");
  const [gwConfig, setGwConfig] = useState<Record<string, string>>({});
  const [gwMdrPolicy, setGwMdrPolicy] = useState("village_absorbs");
  const [gwMdrPercentage, setGwMdrPercentage] = useState("");
  const [removeGwProvider, setRemoveGwProvider] = useState<string | null>(null);


  // QR Payment Session state machine
  type QRSessionState = "idle" | "selecting" | "creating_order" | "qr_active" | "payment_success" | "payment_failed" | "expired";
  const [qrState, setQrState] = useState<QRSessionState>("idle");
  const [selectedBillIds, setSelectedBillIds] = useState<Set<number>>(new Set());
  const [selectedGatewayForQR, setSelectedGatewayForQR] = useState<string>("");
  const [paymentSessionId] = useState(() => `ps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const [qrData, setQrData] = useState<{
    orderId: string;
    qrPayload?: string;
    qrImageDataUrl?: string;
    checkoutData?: any;
    expiresAt?: string;
    totalAmount: number;
    mdrAmount: number;
    chargeableAmount: number;
  } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [pollingActive, setPollingActive] = useState(false);
  const [successData, setSuccessData] = useState<{ billCount: number; totalAmount: number; receiptCount: number } | null>(null);

  // ── Queries ──

  const { data: summary, isLoading: summaryLoading } = useQuery<PaymentSummary>({
    queryKey: ["payment-summary", villageId, selectedMonth],
    enabled: !!villageId,
    staleTime: 0,
    queryFn: () => fetch(`/api/payments/summary?month=${selectedMonth}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: bills, isLoading: billsLoading } = useQuery<BillWithHousehold[]>({
    queryKey: ["payment-bills", villageId, selectedMonth, statusFilter],
    enabled: !!villageId,
    staleTime: 0,
    queryFn: () => {
      const params = new URLSearchParams({ month: selectedMonth });
      if (statusFilter !== "all") params.set("status", statusFilter);
      return fetch(`/api/payments/bills?${params}`, { credentials: "include" }).then(r => r.json());
    },
  });

  const { data: activationPreview } = useQuery<ActivationPreview>({
    queryKey: ["activation-preview", villageId, selectedMonth],
    enabled: !!villageId && showActivation,
    queryFn: () =>
      fetch(`/api/payments/activation-preview?month=${selectedMonth}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: householdBills } = useQuery<any[]>({
    queryKey: ["household-bills", showHouseholdBills],
    enabled: showHouseholdBills !== null,
    staleTime: 0,
    queryFn: () =>
      fetch(`/api/payments/bills/household/${showHouseholdBills}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: cycles } = useQuery<any[]>({
    queryKey: ["billing-cycles", villageId],
    enabled: !!villageId && paymentScreen === "settings",
    queryFn: () => fetch("/api/payments/cycles", { credentials: "include" }).then(r => r.json()),
  });

  const { data: feeConfig } = useQuery<any[]>({
    queryKey: ["fee-config", villageId],
    enabled: !!villageId && paymentScreen === "settings",
    queryFn: () => fetch("/api/payments/fee-config", { credentials: "include" }).then(r => r.json()),
  });

  const { data: gatewayStatus } = useQuery<any>({
    queryKey: ["gateway-status", villageId],
    enabled: !!villageId && paymentScreen === "settings",
    staleTime: 0,
    queryFn: () => fetch("/api/payments/gateway/status", { credentials: "include" }).then(r => r.json()),
  });

  const { data: householdTypes } = useQuery<any[]>({
    queryKey: ["household-types", villageId],
    enabled: !!villageId && paymentScreen === "settings",
    queryFn: () => fetch("/api/household-types", { credentials: "include" }).then(r => {
      if (!r.ok) return [];
      return r.json();
    }),
  });

  // Unpaid bills for selected household (for multi-select dialog)
  const { data: unpaidBillsForHH } = useQuery<BillWithHousehold[]>({
    queryKey: ["household-unpaid", selectedBill?.householdId],
    enabled: !!selectedBill?.householdId && showPayDialog,
    staleTime: 0,
    queryFn: () => fetch(`/api/payments/household-unpaid/${selectedBill!.householdId}`, { credentials: "include" }).then(r => r.json()),
  });

  // Poll order status when QR active
  const { data: orderPollStatus } = useQuery<any>({
    queryKey: ["order-poll", qrData?.orderId],
    enabled: pollingActive && !!qrData?.orderId,
    refetchInterval: 3000,
    queryFn: () => fetch(`/api/payments/order-status/${qrData!.orderId}`, { credentials: "include" }).then(r => r.json()),
  });

  // ── Mutations ──

  // Helper: invalidate ALL payment-related queries after any mutation
  function invalidateAllPaymentQueries() {
    queryClient.invalidateQueries({ queryKey: ["payment-summary"] });
    queryClient.invalidateQueries({ queryKey: ["payment-bills"] });
    queryClient.invalidateQueries({ queryKey: ["activation-preview"] });
    queryClient.invalidateQueries({ queryKey: ["household-bills"] });
    queryClient.invalidateQueries({ queryKey: ["fee-config"] });
    queryClient.invalidateQueries({ queryKey: ["gateway-status"] });
  }

  const activateMutation = useMutation({
    mutationFn: async (billingMonth: string) => {
      const res = await apiRequest("POST", "/api/payments/activate-cycle", { billingMonth });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "✅ Billing Cycle Activated", description: `${data.totalBillsGenerated} bills generated. Expected revenue: ₹${data.totalExpectedRevenue}` });
      setShowActivation(false);
      invalidateAllPaymentQueries();
    },
    onError: (_error: unknown) => {
      toast({ title: "Activation Failed", description: "Could not activate billing cycle. Please try again.", variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ billId, paymentMethod }: { billId: number; paymentMethod: string }) => {
      const res = await apiRequest("POST", "/api/payments/mark-paid", { billId, paymentMethod });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "✅ Payment Recorded", description: `Receipt: ${data.receiptNumber}` });
      setShowPayDialog(false);
      setSelectedBill(null);
      invalidateAllPaymentQueries();
    },
    onError: (_error: unknown) => {
      toast({ title: "Payment Failed", description: "Could not record payment. Please try again.", variant: "destructive" });
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (billId: number) => {
      const res = await apiRequest("POST", `/api/payments/undo/${billId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Payment Undone" });
      invalidateAllPaymentQueries();
    },
    onError: (_error: unknown) => {
      toast({ title: "Undo Failed", description: "Could not undo payment. Please try again.", variant: "destructive" });
    },
  });

  const bulkMarkPaidMutation = useMutation({
    mutationFn: async (billIds: number[]) => {
      const res = await apiRequest("POST", "/api/payments/mark-paid-bulk", { billIds });
      return res.json();
    },
    onSuccess: (data) => {
      const successCount = data.results.filter((r: any) => r.success).length;
      toast({ title: "✅ Bulk Payment", description: `${successCount} bills marked as paid` });
      setShowHouseholdBills(null);
      invalidateAllPaymentQueries();
    },
    onError: (_error: unknown) => {
      toast({ title: "Bulk Payment Failed", description: "Could not process bulk payment. Please try again.", variant: "destructive" });
    },
  });

  const saveFeesMutation = useMutation({
    mutationFn: async (configs: FeeEntry[]) => {
      const res = await apiRequest("POST", "/api/payments/fee-config", { configs });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Fee Policy Saved" });
      setIsEditingFees(false);
      invalidateAllPaymentQueries();
    },
    onError: (_error: unknown) => {
      toast({ title: "Save Failed", description: "Could not save fee policy. Please try again.", variant: "destructive" });
    },
  });

  const saveGatewayMutation = useMutation({
    mutationFn: async (data: { provider: string; configJson: Record<string, any>; mdrPolicy: string; mdrPercentage: string }) => {
      const res = await apiRequest("POST", "/api/payments/gateway/config", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Gateway Config Saved" });
      setShowGatewaySetup(false);
      invalidateAllPaymentQueries();
    },
    onError: (_error: unknown) => {
      toast({ title: "Save Failed", description: "Could not save gateway config. Please try again.", variant: "destructive" });
    },
  });

  const testGatewayMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments/gateway/test");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.status === "success" ? "✅ Connection Verified" : "❌ Test Failed", description: data.message });
      invalidateAllPaymentQueries();
    },
    onError: (_error: unknown) => {
      toast({ title: "Test Failed", description: "Gateway connection test failed. Please check your credentials.", variant: "destructive" });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async ({ billIds, method }: { billIds: number[]; method: "upi" | "inapp" }) => {
      const provider = selectedGatewayForQR || gatewayStatus?.provider || undefined;
      const res = await apiRequest("POST", "/api/payments/gateway/create-order", { billIds, method, provider });
      if (res.status === 409) {
        const data = await res.json();
        return { ...data, _isExistingSession: true };
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data._isExistingSession && data.existingOrder) {
        // Resume existing session
        setQrData({
          orderId: data.existingOrder.orderId,
          totalAmount: parseFloat(data.existingOrder.totalAmount),
          mdrAmount: 0,
          chargeableAmount: parseFloat(data.existingOrder.chargeableAmount),
          expiresAt: data.existingOrder.expiresAt,
        });
        setQrState("qr_active");
        setPollingActive(true);
        toast({ title: "Resuming existing payment session" });
        return;
      }
      setQrData(data);
      setQrState("qr_active");
      setPollingActive(true);
    },
    onError: (_error: unknown) => {
      setQrState("payment_failed");
      toast({ title: "Order creation failed", description: "Could not create payment order. Please try again.", variant: "destructive" });
    },
  });

  // ── QR Polling effect ──

  // Watch poll results for status changes
  if (pollingActive && orderPollStatus) {
    if (orderPollStatus.status === "captured" && qrState === "qr_active") {
      setPollingActive(false);
      setQrState("payment_success");
      const billCount = Array.from(selectedBillIds).length;
      const totalAmt = (unpaidBillsForHH || []).filter(b => selectedBillIds.has(b.id)).reduce((s, b) => s + parseFloat(b.feeAmountSnapshot || "0"), 0);
      setSuccessData({ billCount, totalAmount: totalAmt, receiptCount: billCount });
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
      // Invalidate queries
      invalidateAllPaymentQueries();
    } else if (orderPollStatus.status === "failed" && qrState === "qr_active") {
      setPollingActive(false);
      setQrState("payment_failed");
    } else if (orderPollStatus.status === "expired" && qrState === "qr_active") {
      setPollingActive(false);
      setQrState("expired");
    }
  }

  // Countdown timer effect - computed inline
  const expiresAtMs = qrData?.expiresAt ? new Date(qrData.expiresAt).getTime() : 0;
  const remainingMs = expiresAtMs ? Math.max(0, expiresAtMs - Date.now()) : 0;
  const remainingSecs = Math.ceil(remainingMs / 1000);

  // Check expiry client-side
  if (qrState === "qr_active" && expiresAtMs && remainingMs <= 0) {
    setPollingActive(false);
    setQrState("expired");
  }

  // Helper to reset QR session
  function resetQrSession() {
    setQrState("idle");
    setQrData(null);
    setPollingActive(false);
    setSuccessData(null);
    setSelectedBillIds(new Set());
  }

  // ── Filtered bills ──

  const filteredBills = (bills || []).filter(bill => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      bill.headName?.toLowerCase().includes(q) ||
      bill.houseNumber?.toLowerCase().includes(q) ||
      bill.householdUid?.toLowerCase().includes(q)
    );
  });

  const hasCycle = summary && summary.totalBills > 0;

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════

  return (
    <div className="space-y-4 p-4">
      {/* Header - month selector for ledger view */}
      {paymentScreen === "overview" && (
        <div className="flex items-center justify-end flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-40 h-9 text-sm"
            />
            {!hasCycle && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setShowActivation(true)}
              >
                <Zap className="h-4 w-4 mr-1" /> Activate Cycle
              </Button>
            )}
          </div>
        </div>
      )}

      {paymentScreen === "overview" ? (
        <>
          {/* KPI Cards */}
          {summary && hasCycle && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-green-100">
                <CardContent className="p-3">
                  <div className="text-xs text-gray-500 mb-1">Collected</div>
                  <div className="text-lg font-bold text-green-700">₹{Number(summary.totalCollected).toLocaleString("en-IN")}</div>
                  <div className="text-xs text-green-600">{summary.paidCount} households</div>
                </CardContent>
              </Card>
              <Card className="border-red-100">
                <CardContent className="p-3">
                  <div className="text-xs text-gray-500 mb-1">Outstanding</div>
                  <div className="text-lg font-bold text-red-600">₹{Number(summary.outstanding).toLocaleString("en-IN")}</div>
                  <div className="text-xs text-red-500">{summary.unpaidCount} unpaid</div>
                </CardContent>
              </Card>
              <Card className="border-blue-100">
                <CardContent className="p-3">
                  <div className="text-xs text-gray-500 mb-1">Collection Rate</div>
                  <div className={cn("text-lg font-bold",
                    parseFloat(summary.collectionRate) >= 80 ? "text-green-700" :
                    parseFloat(summary.collectionRate) >= 50 ? "text-yellow-600" : "text-red-600"
                  )}>{summary.collectionRate}%</div>
                  <div className="text-xs text-gray-500">{summary.cashCount} cash / {summary.gatewayCount} digital</div>
                </CardContent>
              </Card>
              <Card className="border-orange-100">
                <CardContent className="p-3">
                  <div className="text-xs text-gray-500 mb-1">Past Arrears</div>
                  <div className="text-lg font-bold text-orange-600">{summary.pastArrears}</div>
                  <div className="text-xs text-gray-500">{summary.waivedCount} waived</div>
                </CardContent>
              </Card>
            </div>
          )}

          {!hasCycle && !summaryLoading && (
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="p-8 text-center">
                <Zap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-600">No Billing Cycle for {formatMonth(selectedMonth)}</h3>
                <p className="text-sm text-gray-500 mt-1">Activate a billing cycle to generate bills for all households.</p>
                <Button className="mt-4 bg-green-600 hover:bg-green-700" onClick={() => setShowActivation(true)}>
                  <Zap className="h-4 w-4 mr-2" /> Activate Billing Cycle
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Bills Table */}
          {hasCycle && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">Household Ledger - {formatMonth(selectedMonth)}</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                      <Input
                        placeholder="Search name, house#..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-9 w-44 text-sm"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-28 h-9 text-sm">
                        <Filter className="h-3.5 w-3.5 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="waived">Waived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[60vh] overflow-auto">
                  {billsLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading bills...</div>
                  ) : filteredBills.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No bills found</div>
                  ) : (
                    filteredBills.map(bill => (
                      <div key={bill.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{bill.headName}</span>
                            {bill.houseNumber && (
                              <span className="text-xs text-gray-400">#{bill.houseNumber}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">{bill.ward}</span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-500">{bill.householdTypeSnapshot}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">₹{bill.feeAmountSnapshot}</span>

                          {bill.status === "paid" ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-0.5" /> Paid
                            </Badge>
                          ) : bill.status === "waived" ? (
                            <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 text-xs">
                              <ShieldCheck className="h-3 w-3 mr-0.5" /> Waived
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
                              <Clock className="h-3 w-3 mr-0.5" /> Unpaid
                            </Badge>
                          )}

                          {bill.status === "unpaid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                              onClick={() => {
                                setSelectedBill(bill);
                                setSelectedBillIds(new Set([bill.id]));
                                setShowPayDialog(true);
                              }}
                            >
                              <IndianRupee className="h-3 w-3 mr-0.5" /> Pay
                            </Button>
                          )}

                          {bill.status === "paid" && bill.paymentMethod === "cash" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-gray-400 hover:text-red-500"
                              onClick={() => undoMutation.mutate(bill.id)}
                            >
                              <Undo2 className="h-3 w-3" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setShowHouseholdBills(bill.householdId)}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* Settings Screen */
        <div className="space-y-4">
          {/* Fee Config Card - Editable */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Fee Policy</CardTitle>
                {!isEditingFees ? (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                    // Initialize editable state from existing config + all types
                    const map: Record<string, FeeEntry> = {};
                    (householdTypes || []).forEach((t: any) => {
                      const existing = (feeConfig || []).find((f: any) => f.householdTypeCode === t.typeCode);
                      map[t.typeCode] = {
                        householdTypeCode: t.typeCode,
                        feeAmount: existing?.feeAmount || "0",
                        isWaivedCategory: existing?.isWaivedCategory || false,
                      };
                    });
                    setEditableFees(map);
                    setIsEditingFees(true);
                  }}>
                    <Edit3 className="h-3 w-3 mr-1" /> Edit Fees
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsEditingFees(false)}>
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" disabled={saveFeesMutation.isPending}
                      onClick={() => {
                        const configs = Object.values(editableFees).filter(f => f.feeAmount !== "" || f.isWaivedCategory);
                        if (configs.length === 0) {
                          toast({ title: "Please set at least one fee", variant: "destructive" });
                          return;
                        }
                        // Validate no zero non-waived fees
                        const invalid = configs.find(f => !f.isWaivedCategory && (parseFloat(f.feeAmount) <= 0 || isNaN(parseFloat(f.feeAmount))));
                        if (invalid) {
                          toast({ title: `Fee for ${invalid.householdTypeCode} must be > 0 (or mark as waived)`, variant: "destructive" });
                          return;
                        }
                        saveFeesMutation.mutate(configs);
                      }}>
                      <Save className="h-3 w-3 mr-1" /> Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingFees ? (
                <div className="space-y-3">
                  {(householdTypes || []).filter((t: any) => t.isActive).map((type: any) => {
                    const entry = editableFees[type.typeCode] || { householdTypeCode: type.typeCode, feeAmount: "0", isWaivedCategory: false };
                    return (
                      <div key={type.typeCode} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{type.displayName}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="flex items-center gap-1 text-xs"
                            onClick={() => {
                              setEditableFees(prev => ({
                                ...prev,
                                [type.typeCode]: { ...entry, isWaivedCategory: !entry.isWaivedCategory }
                              }));
                            }}
                          >
                            {entry.isWaivedCategory ? (
                              <><ToggleRight className="h-5 w-5 text-green-600" /><span className="text-green-600">Waived</span></>
                            ) : (
                              <><ToggleLeft className="h-5 w-5 text-gray-400" /><span className="text-gray-400">Waive</span></>
                            )}
                          </button>
                          {!entry.isWaivedCategory && (
                            <div className="flex items-center">
                              <span className="text-sm text-gray-500 mr-1">₹</span>
                              <Input
                                type="number"
                                min="0"
                                step="10"
                                value={entry.feeAmount}
                                onChange={(e) => setEditableFees(prev => ({
                                  ...prev,
                                  [type.typeCode]: { ...entry, feeAmount: e.target.value }
                                }))}
                                className="w-24 h-8 text-sm text-right"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(!householdTypes || householdTypes.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-2">Loading household types...</p>
                  )}
                </div>
              ) : feeConfig && feeConfig.length > 0 ? (
                <div className="space-y-2">
                  {feeConfig.map((fc: any) => {
                    const typeMeta = (householdTypes || []).find((t: any) => t.typeCode === fc.householdTypeCode);
                    return (
                      <div key={fc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <span className="text-sm">{typeMeta?.displayName || fc.householdTypeCode}</span>
                          {typeMeta?.description && <span className="text-xs text-gray-400 ml-2">{typeMeta.description}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {fc.isWaivedCategory ? (
                            <Badge variant="secondary" className="text-xs">Waived</Badge>
                          ) : (
                            <span className="text-sm font-semibold">₹{fc.feeAmount}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No fee policy configured yet.</p>
                  <Button size="sm" className="mt-2 bg-green-600 hover:bg-green-700" onClick={() => {
                    const map: Record<string, FeeEntry> = {};
                    (householdTypes || []).forEach((t: any) => {
                      map[t.typeCode] = { householdTypeCode: t.typeCode, feeAmount: "100", isWaivedCategory: false };
                    });
                    setEditableFees(map);
                    setIsEditingFees(true);
                  }}>
                    <Edit3 className="h-3.5 w-3.5 mr-1" /> Set Up Fees
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gateway Config Card - Multi-Gateway */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Payment Gateways
                </CardTitle>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                  setGwProvider("");
                  setGwConfig({});
                  setGwMdrPolicy("village_absorbs");
                  setGwMdrPercentage("2");
                  setShowGatewaySetup(true);
                }}>
                  <Settings className="h-3 w-3 mr-1" /> Add Gateway
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {gatewayStatus?.gateways && gatewayStatus.gateways.length > 0 ? (
                <div className="space-y-3">
                  {gatewayStatus.gateways.map((gw: any) => (
                    <div key={gw.provider} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold capitalize text-sm">{gw.provider}</span>
                        <div className="flex items-center gap-1">
                          <Badge className={gw.isActive !== false ? "bg-green-100 text-green-700 text-[10px]" : "bg-red-100 text-red-700 text-[10px]"}>
                            {gw.isActive !== false ? "Active" : "Inactive"}
                          </Badge>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={async () => {
                            // Fetch masked config for pre-fill
                            try {
                              const res = await fetch(`/api/payments/gateway/config/${gw.provider}`, { credentials: "include" });
                              const data = await res.json();
                              setGwProvider(gw.provider);
                              setGwConfig(data.exists ? data.maskedConfig : {});
                              setGwMdrPolicy(data.mdrPolicy || gw.mdrPolicy || "village_absorbs");
                              setGwMdrPercentage(data.mdrPercentage || gw.mdrPercentage || "2");
                              setShowGatewaySetup(true);
                            } catch {
                              setGwProvider(gw.provider);
                              setGwConfig({});
                              setGwMdrPolicy(gw.mdrPolicy || "village_absorbs");
                              setGwMdrPercentage(gw.mdrPercentage || "2");
                              setShowGatewaySetup(true);
                            }
                          }}>Edit</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-red-500 hover:text-red-700" onClick={() => {
                            setRemoveGwProvider(gw.provider);
                          }}>Remove</Button>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>MDR</span>
                        <span className="font-medium text-gray-700">{gw.mdrPolicy === "household_pays" ? `Household +${gw.mdrPercentage}%` : "Village Absorbs"}</span>
                      </div>
                    </div>
                  ))}

                  <div className="pt-1">
                    <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => testGatewayMutation.mutate()}
                      disabled={testGatewayMutation.isPending}>
                      {testGatewayMutation.isPending ? "Testing..." : "🔌 Test Connection"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CreditCard className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No gateway configured. Cash-only mode.</p>
                  <Button size="sm" className="mt-2" variant="outline" onClick={() => setShowGatewaySetup(true)}>
                    <CreditCard className="h-3.5 w-3.5 mr-1" /> Configure Gateway
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Cycles Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Billing Cycle History</CardTitle>
            </CardHeader>
            <CardContent>
              {cycles && cycles.length > 0 ? (
                <div className="space-y-2">
                  {cycles.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <span className="text-sm font-medium">{formatMonth(c.billingMonth)}</span>
                        <div className="text-xs text-gray-500">{c.totalBillsGenerated} bills · ₹{Number(c.totalExpectedRevenue).toLocaleString("en-IN")}</div>
                      </div>
                      <Badge className={c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                        {c.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No billing cycles yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Activation Dialog ── */}
      <Dialog open={showActivation} onOpenChange={setShowActivation}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              Activate Billing Cycle - {formatMonth(selectedMonth)}
            </DialogTitle>
          </DialogHeader>

          {activationPreview?.alreadyActivated ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Billing cycle for {formatMonth(selectedMonth)} is already active.</p>
            </div>
          ) : activationPreview ? (
            <div className="space-y-4 max-h-[60vh] overflow-auto">
              {!activationPreview.hasFeeConfig && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    No fee policy configured. Please set up fees in Settings before activating.
                  </div>
                </div>
              )}

              {activationPreview.breakdown && (
                <>
                  <div className="text-xs text-green-600 font-medium">✔ Using existing fee policy</div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Type</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Fee</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">HH</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {activationPreview.breakdown.map(row => (
                          <tr key={row.typeCode}>
                            <td className="px-3 py-2">{row.displayName}</td>
                            <td className="px-3 py-2 text-right">
                              {row.isWaived ? <Badge variant="secondary" className="text-xs">Waived</Badge> : `₹${row.feeAmount}`}
                            </td>
                            <td className="px-3 py-2 text-right">{row.householdCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected Revenue</span>
                  <span className="font-bold">₹{Number(activationPreview.totalExpectedRevenue).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Billable</span>
                  <span>{activationPreview.totalBillable}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Waived</span>
                  <span>{activationPreview.totalWaived}</span>
                </div>
              </div>

              {activationPreview.gatewayStatus ? (
                <div className="text-xs text-green-600 font-medium">
                  ✔ Using existing gateway: {activationPreview.gatewayStatus.provider}
                  {activationPreview.gatewayStatus.isActive ? " - Connected" : " - ⚠ Inactive"}
                </div>
              ) : (
                <div className="text-xs text-gray-500">ℹ No gateway configured. Cash-only mode.</div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                ⚠ After activation, fees for {formatMonth(selectedMonth)} are locked and cannot be changed.
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">Loading preview...</div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivation(false)}>Cancel</Button>
            {activationPreview && !activationPreview.alreadyActivated && activationPreview.hasFeeConfig && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => activateMutation.mutate(selectedMonth)}
                disabled={activateMutation.isPending}
              >
                <Zap className="h-4 w-4 mr-1" />
                {activateMutation.isPending ? "Activating..." : `Activate & Generate ${activationPreview.totalBillable} Bills`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Multi-Select Pay + QR Dialog ── */}
      <Dialog open={showPayDialog} onOpenChange={(open) => {
        if (!open) {
          setShowPayDialog(false);
          setSelectedBill(null);
          resetQrSession();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {qrState === "payment_success" ? "✅ Payment Successful" :
               qrState === "qr_active" ? "📱 Scan QR to Pay" :
               qrState === "creating_order" ? "Creating Payment..." :
               qrState === "expired" ? "⏰ QR Expired" :
               qrState === "payment_failed" ? "❌ Payment Failed" :
               "Collect Payment"}
            </DialogTitle>
          </DialogHeader>

          {/* ── STATE: SELECTING / IDLE ── */}
          {(qrState === "idle" || qrState === "selecting") && selectedBill && (
            <div className="space-y-4">
              {/* Household info */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="font-medium">{selectedBill.headName}</div>
                <div className="text-gray-500">#{selectedBill.houseNumber} · {selectedBill.ward}</div>
              </div>

              {/* Multi-bill checkboxes (oldest → newest) */}
              {unpaidBillsForHH && unpaidBillsForHH.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-600 mb-2">Select dues to collect:</div>
                  {unpaidBillsForHH.map(bill => {
                    const isSelected = selectedBillIds.has(bill.id);
                    return (
                      <label key={bill.id} className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                        isSelected ? "border-green-300 bg-green-50" : "border-gray-200 hover:bg-gray-50"
                      )}>
                        <div className="flex items-center gap-2">
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
                            className="accent-green-600 w-4 h-4"
                          />
                          <span className="text-sm">{formatMonth(bill.billingMonth)}</span>
                        </div>
                        <span className="text-sm font-semibold">₹{bill.feeAmountSnapshot}</span>
                      </label>
                    );
                  })}

                  {/* Total */}
                  {selectedBillIds.size > 0 && (
                    <div className="flex justify-between px-3 py-2 mt-2 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-sm font-medium text-green-700">Total ({selectedBillIds.size} months)</span>
                      <span className="text-lg font-bold text-green-700">
                        ₹{unpaidBillsForHH.filter(b => selectedBillIds.has(b.id)).reduce((s, b) => s + parseFloat(b.feeAmountSnapshot || "0"), 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">Loading unpaid bills...</div>
              )}

              {/* Payment method buttons */}
              {selectedBillIds.size > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700 h-12"
                    onClick={() => {
                      const ids = Array.from(selectedBillIds);
                      if (ids.length === 1) {
                        markPaidMutation.mutate({ billId: ids[0], paymentMethod: "cash" });
                      } else {
                        bulkMarkPaidMutation.mutate(ids);
                      }
                    }}
                    disabled={markPaidMutation.isPending || bulkMarkPaidMutation.isPending}
                  >
                    <IndianRupee className="h-4 w-4 mr-1" /> Cash
                  </Button>
                  {gatewayStatus?.configured && (
                    <>
                      {/* Gateway selector - show when multiple gateways configured */}
                      {gatewayStatus.gateways && gatewayStatus.gateways.length > 1 && (
                        <select
                          className="h-12 px-3 rounded-lg border border-gray-200 text-sm bg-white"
                          value={selectedGatewayForQR || gatewayStatus.provider || ""}
                          onChange={(e) => setSelectedGatewayForQR(e.target.value)}
                        >
                          {gatewayStatus.gateways.map((gw: any) => (
                            <option key={gw.provider} value={gw.provider}>
                              {gw.provider.charAt(0).toUpperCase() + gw.provider.slice(1)}
                            </option>
                          ))}
                        </select>
                      )}
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 h-12"
                        onClick={() => {
                          setQrState("creating_order");
                          createOrderMutation.mutate({
                            billIds: Array.from(selectedBillIds),
                            method: "upi",
                          });
                        }}
                        disabled={createOrderMutation.isPending}
                      >
                        <QrCode className="h-4 w-4 mr-1" /> UPI QR
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STATE: CREATING ORDER ── */}
          {qrState === "creating_order" && (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Creating payment order...</p>
            </div>
          )}

          {/* ── STATE: QR ACTIVE ── */}
          {qrState === "qr_active" && qrData && (
            <div className="space-y-4 text-center">
              {/* Amount summary */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-700">₹{qrData.chargeableAmount.toLocaleString("en-IN")}</div>
                {qrData.mdrAmount > 0 && (
                  <div className="text-xs text-blue-600 mt-1">
                    Amount: ₹{qrData.totalAmount} + MDR: ₹{qrData.mdrAmount.toFixed(2)}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">{selectedBillIds.size} month(s)</div>
              </div>

              {/* QR Code display */}
              {(qrData.qrPayload || qrData.qrImageDataUrl) && (
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4 inline-block mx-auto">
                  <div className="text-center text-xs text-gray-400 mb-2">Scan with any UPI app</div>
                  {qrData.qrImageDataUrl ? (
                    <img
                      src={qrData.qrImageDataUrl}
                      alt="UPI QR Code"
                      className="mx-auto"
                      style={{ width: 250, height: 250 }}
                    />
                  ) : (
                    <div className="bg-gray-100 rounded p-4 text-xs break-all font-mono max-w-[250px] mx-auto">
                      {qrData.qrPayload}
                    </div>
                  )}
                </div>
              )}

              {/* Countdown timer */}
              <div className={cn(
                "text-sm font-medium",
                remainingSecs <= 60 ? "text-red-600" : "text-gray-600"
              )}>
                ⏱ Expires in {Math.floor(remainingSecs / 60)}:{String(remainingSecs % 60).padStart(2, "0")}
              </div>

              {/* Polling indicator */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <div className="animate-pulse h-2 w-2 rounded-full bg-green-500"></div>
                Waiting for payment confirmation...
              </div>
            </div>
          )}

          {/* ── STATE: PAYMENT SUCCESS ── */}
          {qrState === "payment_success" && successData && (
            <div className="text-center py-6 space-y-3">
              <div className="text-6xl">✅</div>
              <div className="text-xl font-bold text-green-700">
                ₹{successData.totalAmount.toLocaleString("en-IN")} Collected!
              </div>
              <div className="text-sm text-gray-600">
                {successData.receiptCount} receipt(s) generated
              </div>
              <Button className="mt-4 bg-green-600 hover:bg-green-700" onClick={() => {
                setShowPayDialog(false);
                setSelectedBill(null);
                resetQrSession();
              }}>
                Done
              </Button>
            </div>
          )}

          {/* ── STATE: EXPIRED ── */}
          {qrState === "expired" && (
            <div className="text-center py-6 space-y-3">
              <div className="text-5xl">⏰</div>
              <div className="text-lg font-semibold text-orange-600">QR Code Expired</div>
              <p className="text-sm text-gray-500">The payment window has timed out.</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => {
                  resetQrSession();
                }}>Back to Selection</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                  setQrState("creating_order");
                  createOrderMutation.mutate({
                    billIds: Array.from(selectedBillIds),
                    method: "upi",
                  });
                }}>
                  <QrCode className="h-4 w-4 mr-1" /> Generate New QR
                </Button>
              </div>
            </div>
          )}

          {/* ── STATE: PAYMENT FAILED ── */}
          {qrState === "payment_failed" && (
            <div className="text-center py-6 space-y-3">
              <div className="text-5xl">❌</div>
              <div className="text-lg font-semibold text-red-600">Payment Failed</div>
              <p className="text-sm text-gray-500">The payment could not be processed.</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => resetQrSession()}>Try Again</Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => {
                  // Fallback to cash for selected bills
                  const ids = Array.from(selectedBillIds);
                  if (ids.length === 1) {
                    markPaidMutation.mutate({ billId: ids[0], paymentMethod: "cash" });
                  } else {
                    bulkMarkPaidMutation.mutate(ids);
                  }
                }}>
                  <IndianRupee className="h-4 w-4 mr-1" /> Mark Cash Instead
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Household History Dialog ── */}
      <Dialog open={showHouseholdBills !== null} onOpenChange={() => setShowHouseholdBills(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Household Payment History</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-auto">
            {householdBills?.map((bill: any) => (
              <div key={bill.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="text-sm font-medium">{formatMonth(bill.billingMonth)}</div>
                  <div className="text-xs text-gray-500">₹{bill.feeAmountSnapshot}</div>
                </div>
                <div className="flex items-center gap-2">
                  {bill.status === "paid" ? (
                    <Badge className="bg-green-100 text-green-700 text-xs">Paid</Badge>
                  ) : bill.status === "waived" ? (
                    <Badge className="bg-gray-100 text-gray-600 text-xs">Waived</Badge>
                  ) : (
                    <>
                      <Badge className="bg-red-100 text-red-700 text-xs">Unpaid</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs"
                        onClick={() => {
                          setSelectedBill({ ...bill, headName: "Household", houseNumber: "", ward: "" } as any);
                          setSelectedBillIds(new Set([bill.id]));
                          setShowPayDialog(true);
                        }}
                      >
                        Pay
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {householdBills && householdBills.filter((b: any) => b.status === "unpaid").length > 1 && (
              <Button
                className="w-full mt-2 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  const unpaidIds = householdBills.filter((b: any) => b.status === "unpaid").map((b: any) => b.id);
                  bulkMarkPaidMutation.mutate(unpaidIds);
                }}
                disabled={bulkMarkPaidMutation.isPending}
              >
                Mark All Unpaid as Paid (Cash)
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Gateway Setup Dialog ── */}
      <Dialog open={showGatewaySetup} onOpenChange={setShowGatewaySetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {gwProvider ? `${gwProvider.charAt(0).toUpperCase() + gwProvider.slice(1)} - Edit Config` : "Add Payment Gateway"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-auto">
            {/* Provider Selector */}
            <div className="space-y-1.5">
              <Label className="text-sm">Gateway Provider</Label>
              <Select value={gwProvider} onValueChange={(v) => { setGwProvider(v); setGwConfig({}); }} disabled={!!gwProvider && Object.keys(gwConfig).length > 0}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={GATEWAY_PROVIDERS.RAZORPAY}>Razorpay</SelectItem>
                  <SelectItem value={GATEWAY_PROVIDERS.CASHFREE}>Cashfree</SelectItem>
                  <SelectItem value={GATEWAY_PROVIDERS.PAYU}>PayU</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic credential fields */}
            {gwProvider && GATEWAY_FIELD_MAP[gwProvider] && (
              <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {gwProvider} Credentials
                </div>
                <p className="text-xs text-gray-400">
                  {Object.values(gwConfig).some(v => v?.includes("***"))
                    ? "Masked values shown. Leave blank to keep existing, or enter new values to update."
                    : "Enter your API credentials."}
                </p>
                {GATEWAY_FIELD_MAP[gwProvider].map(field => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs text-gray-600">{field.label}</Label>
                    <Input
                      type={field.type === "password" ? "text" : field.type}
                      value={gwConfig[field.key]?.includes("***") ? "" : (gwConfig[field.key] || "")}
                      onChange={(e) => setGwConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={gwConfig[field.key]?.includes("***") ? `Current: ${gwConfig[field.key]}` : field.label}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}

                {/* Webhook URL info */}
                <div className="border-t pt-3 mt-2">
                  <div className="text-xs font-medium text-gray-600 mb-1.5">📌 Webhook URL</div>
                  <div className="text-xs text-gray-500 mb-1.5">
                    Paste this URL in your <strong>{gwProvider}</strong> dashboard → Webhooks section:
                  </div>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 bg-white border rounded px-2 py-1.5 text-xs font-mono text-gray-700 select-all break-all">
                      https://greenpathindia.in/api/payments/gateway/webhook
                    </code>
                    <button
                      type="button"
                      className="shrink-0 bg-gray-200 hover:bg-gray-300 rounded px-2 py-1.5 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText("https://greenpathindia.in/api/payments/gateway/webhook");
                      }}
                    >
                      Copy
                    </button>
                  </div>

                  {/* Per-provider setup instructions */}
                  {gwProvider === "razorpay" && (
                    <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                      <div className="font-medium text-gray-600">🔑 How to get API Keys:</div>
                      <ol className="list-decimal ml-4 space-y-0.5">
                        <li>Go to <strong>Razorpay Dashboard → Settings → API Keys</strong></li>
                        <li>Generate a new key pair</li>
                        <li><strong>Key ID</strong> → paste in "Key ID" field above</li>
                        <li><strong>Key Secret</strong> → paste in "Key Secret" field above (shown only once!)</li>
                      </ol>
                      <div className="font-medium text-gray-600 mt-2">📡 Webhook Events to Enable:</div>
                      <div className="text-[11px] text-gray-500">Settings → Webhooks → Add New → select these events:</div>
                      <ul className="list-disc ml-4 space-y-0.5">
                        <li><code className="bg-gray-100 px-1 rounded">payment.captured</code> - payment successful</li>
                        <li><code className="bg-gray-100 px-1 rounded">payment.failed</code> - payment failed</li>
                      </ul>
                      <div className="font-medium text-gray-600 mt-2">🔒 Webhook Secret:</div>
                      <div>In the webhook form, set a secret → paste it in "Webhook Secret" field above.</div>
                    </div>
                  )}

                  {gwProvider === "cashfree" && (
                    <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                      <div className="font-medium text-gray-600">🔑 How to get API Keys:</div>
                      <ol className="list-decimal ml-4 space-y-0.5">
                        <li>Go to <strong>Cashfree Dashboard → Developers → API Keys</strong></li>
                        <li>Create a new set of keys</li>
                        <li><strong>App ID</strong> → paste in "Client ID" field above</li>
                        <li><strong>Secret Key</strong> → paste in "Client Secret" field above</li>
                      </ol>
                      <div className="font-medium text-gray-600 mt-2">📡 Webhook Events to Enable:</div>
                      <div className="text-[11px] text-gray-500">Developers → Webhooks → Add → select these events:</div>
                      <ul className="list-disc ml-4 space-y-0.5">
                        <li><code className="bg-gray-100 px-1 rounded">PAYMENT_SUCCESS_WEBHOOK</code> - payment successful</li>
                        <li><code className="bg-gray-100 px-1 rounded">PAYMENT_FAILED_WEBHOOK</code> - payment failed</li>
                      </ul>
                      <p className="text-amber-600 mt-1">
                        ⚠ Cashfree uses your Secret Key for webhook verification - no separate webhook secret needed.
                      </p>
                    </div>
                  )}

                  {gwProvider === "payu" && (
                    <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                      <div className="font-medium text-gray-600">🔑 How to get API Keys:</div>
                      <ol className="list-decimal ml-4 space-y-0.5">
                        <li>Go to <strong>PayU Dashboard → One Dashboard → Manage Account → Merchant Key-Salt</strong></li>
                        <li><strong>Merchant Key</strong> → paste in "Merchant Key" field above</li>
                        <li><strong>Salt (V1)</strong> → paste in "Salt (V1)" field above</li>
                        <li><strong>Merchant ID</strong> → found on the dashboard header</li>
                      </ol>
                      <div className="font-medium text-gray-600 mt-2">📡 Webhook / Callback:</div>
                      <p>PayU uses <strong>redirect callbacks</strong>, not webhook events. No event selection needed.</p>
                      <p className="text-amber-600 mt-1">
                        ⚠ PayU uses Merchant Salt for hash verification - no separate webhook secret needed.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MDR Policy */}
            <div className="space-y-1.5">
              <Label className="text-sm">MDR / Convenience Fee</Label>
              <Select value={gwMdrPolicy} onValueChange={setGwMdrPolicy}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={MDR_POLICIES.VILLAGE_ABSORBS}>Village Absorbs (~2%)</SelectItem>
                  <SelectItem value={MDR_POLICIES.HOUSEHOLD_PAYS}>Household Pays Extra</SelectItem>
                </SelectContent>
              </Select>
              {gwMdrPolicy === MDR_POLICIES.HOUSEHOLD_PAYS && (
                <div className="flex items-center gap-2 mt-2">
                  <Label className="text-xs text-gray-600">MDR %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={gwMdrPercentage}
                    onChange={(e) => setGwMdrPercentage(e.target.value)}
                    className="w-20 h-8 text-sm text-right"
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              )}
            </div>


          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGatewaySetup(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={!gwProvider || saveGatewayMutation.isPending}
              onClick={() => {
                // Build config - filter out masked values (keep only new values)
                const fields = GATEWAY_FIELD_MAP[gwProvider] || [];
                const isEditing = Object.values(gwConfig).some(v => v?.includes("***"));
                const cleanConfig: Record<string, string> = {};
                for (const field of fields) {
                  const val = gwConfig[field.key];
                  if (val && !val.includes("***")) {
                    cleanConfig[field.key] = val;
                  }
                }
                // For new gateway, all fields required
                if (!isEditing) {
                  const missing = fields.filter(f => !cleanConfig[f.key]).map(f => f.label);
                  if (missing.length > 0) {
                    toast({ title: `Missing: ${missing.join(", ")}`, variant: "destructive" });
                    return;
                  }
                }
                // For editing, at least one field must be provided (or MDR change)
                if (isEditing && Object.keys(cleanConfig).length === 0) {
                  // Just MDR update, send empty configJson - server will merge
                  cleanConfig._mdrOnly = "true";
                }
                saveGatewayMutation.mutate({
                  provider: gwProvider,
                  configJson: cleanConfig,
                  mdrPolicy: gwMdrPolicy,
                  mdrPercentage: gwMdrPolicy === MDR_POLICIES.HOUSEHOLD_PAYS ? gwMdrPercentage : "0",
                });
              }}
            >
              <Save className="h-4 w-4 mr-1" />
              {saveGatewayMutation.isPending ? "Saving..." : "Save & Encrypt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeGwProvider !== null}
        onOpenChange={(open) => { if (!open) setRemoveGwProvider(null); }}
        title={`Remove ${removeGwProvider}?`}
        description="This payment gateway will be removed."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={async () => {
          if (removeGwProvider) {
            await apiRequest("DELETE", `/api/payments/gateway/config/${removeGwProvider}`);
            invalidateAllPaymentQueries();
            toast({ title: `${removeGwProvider} gateway removed` });
          }
          setRemoveGwProvider(null);
        }}
      />
    </div>
  );
}
