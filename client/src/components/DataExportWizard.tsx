/**
 * Data Export Wizard - 6-step export flow.
 * Steps: Villages → Date Range → Reports → Preview → Options → Terms & Download
 * Shared by Manager, Moderator, and Admin dashboards.
 */
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchWithCsrf, getFetchHeaders } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Download, FileDown, Check, Copy,
  AlertTriangle, Shield, Loader2, Lock, Eye, EyeOff,
  Home, Package, Scale, Leaf, DollarSign, CreditCard,
  Users, AlertCircle, BarChart3, Building2, Truck, Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───
interface ExportType {
  id: string;
  label: string;
  description: string;
  icon: any;
  needsDateRange: boolean;
  needsBillingMonth: boolean;
  sensitivity: "personal" | "aggregated";
}

interface EstimateItem {
  villageId: string;
  villageName: string;
  type: string;
  label: string;
  rowCount: number;
  sizeKB: number;
  sensitivity: string;
}

interface Props {
  role: "manager" | "moderator" | "admin";
  userVillageId?: string;
  userId?: string;
  onBack?: () => void;
}

// ─── Constants ───
const EXPORT_TYPES: ExportType[] = [
  { id: "households",     label: "Household Register",               description: "Full household list with addresses, QR status",   icon: Home,        needsDateRange: false, needsBillingMonth: false, sensitivity: "personal" },
  { id: "collections",    label: "Waste Collections",                description: "Door-to-door collection records",                 icon: Package,     needsDateRange: true,  needsBillingMonth: false, sensitivity: "personal" },
  { id: "daily-waste",    label: "Daily Waste Quantity",              description: "Wet/dry/mixed waste weights by date",              icon: Scale,       needsDateRange: true,  needsBillingMonth: false, sensitivity: "aggregated" },
  { id: "compost",        label: "Compost Production",               description: "Composting logs with quality ratings",             icon: Leaf,        needsDateRange: true,  needsBillingMonth: false, sensitivity: "aggregated" },
  { id: "sales",          label: "Dry Waste Sales",                  description: "Material sales with revenue breakdown",            icon: DollarSign,  needsDateRange: true,  needsBillingMonth: false, sensitivity: "aggregated" },
  { id: "payments",       label: "Payment Ledger",                   description: "Monthly billing status per household",             icon: CreditCard,  needsDateRange: false, needsBillingMonth: true,  sensitivity: "personal" },
  { id: "collectors",     label: "Collector Performance",            description: "Collector stats and ratings",                      icon: Users,       needsDateRange: false, needsBillingMonth: false, sensitivity: "personal" },
  { id: "issues",         label: "Issue Tracker",                    description: "Complaints and resolutions",                      icon: AlertCircle, needsDateRange: true,  needsBillingMonth: false, sensitivity: "personal" },
  { id: "coverage",       label: "Coverage & Segregation Summary",   description: "Daily coverage & segregation",                    icon: BarChart3,   needsDateRange: true,  needsBillingMonth: false, sensitivity: "aggregated" },
  { id: "ward-daily",     label: "Ward-Level Daily Report",          description: "Ward-wise collection breakdown",                  icon: Building2,   needsDateRange: true,  needsBillingMonth: false, sensitivity: "aggregated" },
  { id: "vehicle-daily",  label: "Vehicle Daily Report",             description: "Vehicle/fleet performance by date",               icon: Truck,       needsDateRange: true,  needsBillingMonth: false, sensitivity: "aggregated" },
];

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

function getDefaultBillingMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatBytes(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// ─── Component ───
export function DataExportWizard({ role, userVillageId, userId, onBack }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(role === "manager" ? 2 : 1); // Manager skips step 1
  const [selectedVillages, setSelectedVillages] = useState<string[]>(
    role === "manager" && userVillageId ? [userVillageId] : []
  );
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [billingMonth, setBillingMonth] = useState(getDefaultBillingMonth);
  const [selectedExports, setSelectedExports] = useState<string[]>([]);
  const [maskPersonal, setMaskPersonal] = useState(false);

  // Step 5 options
  const [passwordOption, setPasswordOption] = useState<"none" | "suggested" | "custom">("none");
  const [suggestedPassword, setSuggestedPassword] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Step 6 terms
  const [terms, setTerms] = useState({ authorized: false, audit: false, security: false });
  const [sensitivePassword, setSensitivePassword] = useState("");
  const [showSensitivePassword, setShowSensitivePassword] = useState(false);

  // Downloading state
  const [isDownloading, setIsDownloading] = useState(false);

  // ─── Fetch available villages ───
  const { data: villages = [] } = useQuery<any[]>({
    queryKey: ["/api/villages"],
    enabled: role !== "manager",
  });

  const assignedVillages = useMemo(() => {
    if (role === "manager") return [];
    if (role === "moderator") {
      // Moderator sees assigned villages only - this is filtered server-side
      return villages;
    }
    return villages; // Admin sees all
  }, [role, villages]);

  // ─── Estimate query ───
  const estimateMutation = useMutation({
    mutationFn: async () => {
      const exportItems = selectedExports.map(type => {
        const exp = EXPORT_TYPES.find(e => e.id === type)!;
        return {
          type,
          ...(exp.needsDateRange ? { from: dateRange.from, to: dateRange.to } : {}),
          ...(exp.needsBillingMonth ? { billingMonth } : {}),
        };
      });

      const res = await fetchWithCsrf("/api/export/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ villageIds: selectedVillages, exports: exportItems }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server error (${res.status})`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.suggestedPassword) {
        setSuggestedPassword(data.suggestedPassword);
      }
    },
  });

  // Personal exports selected?
  const hasPersonalExports = selectedExports.some(
    e => EXPORT_TYPES.find(t => t.id === e)?.sensitivity === "personal"
  );

  // Date range days
  const dateRangeDays = useMemo(() => {
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [dateRange]);

  // ─── Navigation ───
  const goNext = useCallback(() => {
    if (step === 3) {
      // Fire estimate mutation and move to step 4
      // Step 4 will show loading/data/error based on mutation state
      estimateMutation.mutate();
      setStep(4);
      return;
    }
    setStep(s => s + 1);
  }, [step, estimateMutation]);

  const goBack = useCallback(() => {
    if (step === 1 || (step === 2 && role === "manager")) {
      onBack?.();
      return;
    }
    setStep(s => s - 1);
  }, [step, role, onBack]);

  // Can proceed?
  const canProceed = useMemo(() => {
    switch (step) {
      case 1: return selectedVillages.length > 0;
      case 2: return dateRange.from && dateRange.to && dateRangeDays > 0 && dateRangeDays <= 365;
      case 3: return selectedExports.length > 0;
      case 4: return estimateMutation.data && !estimateMutation.data.exceedsSizeLimit;
      case 5: {
        if (passwordOption === "custom") {
          return customPassword.length >= 6 && customPassword === confirmPassword;
        }
        return true;
      }
      case 6: {
        const allTerms = terms.authorized && terms.audit && terms.security;
        const isSensitive = estimateMutation.data?.isSensitive;
        if (isSensitive) return allTerms && sensitivePassword.length > 0;
        return allTerms;
      }
      default: return false;
    }
  }, [step, selectedVillages, dateRange, dateRangeDays, selectedExports, estimateMutation, passwordOption, customPassword, confirmPassword, terms, sensitivePassword]);

  // ─── Download handler ───
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Verify sensitive password if needed
      if (estimateMutation.data?.isSensitive) {
        const verifyRes = await fetchWithCsrf("/api/export/verify-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: sensitivePassword }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.verified) {
          toast({ title: "Incorrect password", description: "Please check your password and try again.", variant: "destructive" });
          setIsDownloading(false);
          return;
        }
      }

      const exportItems = selectedExports.map(type => {
        const exp = EXPORT_TYPES.find(e => e.id === type)!;
        return {
          type,
          ...(exp.needsDateRange ? { from: dateRange.from, to: dateRange.to } : {}),
          ...(exp.needsBillingMonth ? { billingMonth } : {}),
        };
      });

      let zipPassword: string | null = null;
      if (passwordOption === "suggested") zipPassword = suggestedPassword;
      if (passwordOption === "custom") zipPassword = customPassword;

      const isSingleVillageSingleExport = selectedVillages.length === 1 && selectedExports.length === 1;

      if (isSingleVillageSingleExport) {
        // Single CSV download
        const exp = exportItems[0];
        const params = new URLSearchParams({
          villageId: selectedVillages[0],
          type: exp.type,
          ...(exp.from ? { from: exp.from } : {}),
          ...(exp.to ? { to: exp.to } : {}),
          ...(exp.billingMonth ? { billingMonth: exp.billingMonth } : {}),
          ...(maskPersonal ? { mask: "true" } : {}),
        });

        const res = await fetchWithCsrf(`/api/export/single?${params}`);

        if (!res.ok) {
          if (res.status === 401) throw new Error("SESSION_EXPIRED");
          throw new Error("Export failed");
        }
        const blob = await res.blob();
        const filename = res.headers.get("Content-Disposition")?.match(/filename="(.+?)"/)?.[1] || "export.csv";
        downloadBlob(blob, filename);
      } else {
        // Bulk ZIP download
        const res = await fetchWithCsrf("/api/export/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            villageIds: selectedVillages,
            exports: exportItems,
            password: zipPassword,
            includeSummary,
            maskPersonalData: maskPersonal,
            terms: ["authorized_purpose", "audit_recorded", "data_security"],
          }),
        });

        if (!res.ok) {
          if (res.status === 401) throw new Error("SESSION_EXPIRED");
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Export failed");
        }
        const blob = await res.blob();
        const filename = res.headers.get("Content-Disposition")?.match(/filename="(.+?)"/)?.[1] || "export.zip";
        downloadBlob(blob, filename);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error && error.message === "SESSION_EXPIRED" ? "SESSION_EXPIRED" : null;
      if (errMsg === "SESSION_EXPIRED") {
        toast({ title: "Session Expired", description: "Please log in again and retry the export.", variant: "destructive" });
      } else {
        toast({ title: "Export Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      }
    } finally {
      setIsDownloading(false);
    }
  };

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── Render ───
  return (
    <div className="space-y-4 p-3 sm:p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={goBack}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileDown className="h-5 w-5 text-green-600" />
            Data Export
          </h2>
          <p className="text-xs text-gray-500">Download village data as CSV files</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1 px-2">
        {[1, 2, 3, 4, 5, 6].filter(s => role !== "manager" || s !== 1).map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? "bg-green-500" : "bg-gray-200"}`} />
          </div>
        ))}
      </div>
      <p className="text-xs text-center text-gray-400">
        Step {role === "manager" ? step - 1 : step} of {role === "manager" ? 5 : 6}
      </p>

      {/* ═══ STEP 1: Villages ═══ */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Select Villages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedVillages(assignedVillages.map((v: any) => v.villageId))}>
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedVillages([])}>
                Clear
              </Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {assignedVillages.map((v: any) => (
                <label key={v.villageId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedVillages.includes(v.villageId)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedVillages(p => [...p, v.villageId]);
                      else setSelectedVillages(p => p.filter(id => id !== v.villageId));
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium">{v.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400">{selectedVillages.length} village(s) selected</p>
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 2: Date Range ═══ */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Date Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(d => ({ ...d, from: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(d => ({ ...d, to: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Payment Month (for Payment Ledger)</Label>
              <Input
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
              />
            </div>

            {dateRangeDays > 90 && dateRangeDays <= 365 && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-amber-700 text-xs">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{dateRangeDays} days selected - large range may take longer</span>
              </div>
            )}
            {dateRangeDays > 365 && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-red-700 text-xs">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Maximum 1 year per export. Please reduce date range.</span>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Default: last 30 days • {dateRangeDays} day(s) selected
            </p>
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 3: Select Reports ═══ */}
      {step === 3 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Select Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedExports(EXPORT_TYPES.map(e => e.id))}>
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedExports([])}>
                Clear
              </Button>
            </div>

            <div className="space-y-1 max-h-80 overflow-y-auto">
              {EXPORT_TYPES.map((exp) => (
                <label key={exp.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedExports.includes(exp.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedExports(p => [...p, exp.id]);
                      else setSelectedExports(p => p.filter(id => id !== exp.id));
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <exp.icon className={`h-4 w-4 flex-shrink-0 ${exp.sensitivity === "personal" ? "text-amber-500" : "text-green-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      {exp.label}
                      {exp.sensitivity === "personal" && <Lock className="h-3 w-3 text-amber-400" />}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{exp.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Masking toggle */}
            {hasPersonalExports && (
              <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={maskPersonal}
                  onChange={(e) => setMaskPersonal(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <p className="text-sm font-medium text-amber-800">Mask personal contact details</p>
                  <p className="text-xs text-amber-600">Phone → last 3 digits only • Address → ward name only</p>
                </div>
              </label>
            )}

            <p className="text-xs text-gray-400">{selectedExports.length} report(s) selected</p>
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 4: Preview ═══ */}
      {step === 4 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Export Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {estimateMutation.isPending || estimateMutation.isIdle ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                <span className="text-sm text-gray-500">Calculating estimates...</span>
              </div>
            ) : estimateMutation.isError ? (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Failed to load estimates</p>
                    <p className="text-xs text-red-500 mt-1">
                      {"Something went wrong. Please check your connection and try again."}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => estimateMutation.mutate()}
                  className="w-full"
                >
                  Retry
                </Button>
              </div>
            ) : estimateMutation.data ? (
              <div className="space-y-4">
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{selectedVillages.length}</p>
                    <p className="text-xs text-gray-500">Village(s)</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{estimateMutation.data.totalRows.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total Rows</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{formatBytes(estimateMutation.data.totalSizeKB)}</p>
                    <p className="text-xs text-gray-500">Est. Size</p>
                  </div>
                </div>

                {/* Per-export breakdown */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 font-medium">Report</th>
                        <th className="pb-2 font-medium text-right">Rows</th>
                        <th className="pb-2 font-medium text-right">Size</th>
                        <th className="pb-2 font-medium text-center">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(estimateMutation.data.estimates as EstimateItem[]).map((est, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-2">
                            <span className="font-medium">{est.label}</span>
                            <br />
                            <span className="text-gray-400">{est.villageName}</span>
                          </td>
                          <td className="py-2 text-right">{est.rowCount.toLocaleString()}</td>
                          <td className="py-2 text-right">{formatBytes(est.sizeKB)}</td>
                          <td className="py-2 text-center">
                            {est.sensitivity === "personal"
                              ? <Lock className="h-3.5 w-3.5 text-amber-400 mx-auto" />
                              : <span className="text-green-500 text-sm">🟢</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sensitivity legend */}
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-amber-400" /> Personal data</span>
                  <span>🟢 Aggregated data</span>
                </div>

                {/* Time estimate */}
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                  <Info className="h-3.5 w-3.5 flex-shrink-0" />
                  Est. download time: ~{estimateMutation.data.estimatedTimeSec}s
                  {(selectedVillages.length > 1 || selectedExports.length > 1) && " • ZIP with village folders"}
                </div>

                {/* Size limit warning */}
                {estimateMutation.data.exceedsSizeLimit && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    Export too large (max 250 MB). Reduce villages or date range.
                  </div>
                )}

                {/* Sensitive export badge */}
                {estimateMutation.data.isSensitive && (
                  <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg text-purple-700 text-xs">
                    <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                    Sensitive export - password re-entry required at final step
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                <span className="text-sm text-gray-500">Preparing...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 5: Options (Password + Summary) ═══ */}
      {step === 5 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Export Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Password protection */}
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-400" />
                Password Protection
              </p>

              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="radio" name="pw" checked={passwordOption === "none"} onChange={() => setPasswordOption("none")}
                  className="text-green-600 focus:ring-green-500" />
                <span className="text-sm">No password (default)</span>
              </label>

              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="radio" name="pw" checked={passwordOption === "suggested"} onChange={() => setPasswordOption("suggested")}
                  className="text-green-600 focus:ring-green-500" />
                <div className="flex-1">
                  <span className="text-sm">Use suggested password</span>
                  {passwordOption === "suggested" && suggestedPassword && (
                    <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                      <Lock className="h-3.5 w-3.5 text-green-600" />
                      <code className="text-sm font-bold text-green-800 tracking-wide">{suggestedPassword}</code>
                      <Button
                        size="sm" variant="ghost"
                        className="h-6 px-2 ml-auto"
                        onClick={() => {
                          navigator.clipboard.writeText(suggestedPassword);
                          setCopiedPassword(true);
                          setTimeout(() => setCopiedPassword(false), 2000);
                        }}
                      >
                        {copiedPassword ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  )}
                </div>
              </label>

              <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="radio" name="pw" checked={passwordOption === "custom"} onChange={() => setPasswordOption("custom")}
                  className="mt-1 text-green-600 focus:ring-green-500" />
                <div className="flex-1">
                  <span className="text-sm">Custom password</span>
                  {passwordOption === "custom" && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password (min 6)"
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          className="pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-2.5"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                        </button>
                      </div>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      {customPassword && confirmPassword && customPassword !== confirmPassword && (
                        <p className="text-xs text-red-500 col-span-2">Passwords don't match</p>
                      )}
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Summary sheet */}
            <div className="border-t pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div>
                  <p className="text-sm font-medium">Include summary sheet</p>
                  <p className="text-xs text-gray-400">Adds ExportSummary.csv with export metadata</p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 6: Terms & Download ═══ */}
      {step === 6 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Confirm & Download</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={terms.authorized}
                  onChange={(e) => setTerms(t => ({ ...t, authorized: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">
                  I confirm this data is being downloaded for authorized organizational purposes.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={terms.audit}
                  onChange={(e) => setTerms(t => ({ ...t, audit: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">
                  I understand that this download is permanently recorded in the audit trail.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={terms.security}
                  onChange={(e) => setTerms(t => ({ ...t, security: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">
                  I accept responsibility for the security of the exported data.
                </span>
              </label>
            </div>

            {/* Sensitive export: password re-entry */}
            {estimateMutation.data?.isSensitive && (
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2 text-purple-700">
                  <Shield className="h-4 w-4" />
                  Sensitive export - re-enter your password
                </p>
                <div className="relative">
                  <Input
                    type={showSensitivePassword ? "text" : "password"}
                    placeholder="Enter your account password"
                    value={sensitivePassword}
                    onChange={(e) => setSensitivePassword(e.target.value)}
                    className="pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSensitivePassword(!showSensitivePassword)}
                    className="absolute right-2 top-2.5"
                  >
                    {showSensitivePassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 p-2 rounded-lg">
              <Info className="h-3.5 w-3.5 flex-shrink-0" />
              All exports are permanently logged for audit purposes.
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Navigation Buttons ─── */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={goBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {step < 6 ? (
          <Button
            onClick={goNext}
            disabled={!canProceed || (step === 3 && estimateMutation.isPending)}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleDownload}
            disabled={!canProceed || isDownloading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-1" />
                Download
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
