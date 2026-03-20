import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ChevronDown,
  ClipboardList,
  Filter,
  Home,
  Users,
  Settings,
  Package,
  QrCode,
  AlertCircle,
  Car,
  Bell,
  Shield,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface AuditLogEntry {
  id: number;
  villageId: string | null;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, any> | null;
  createdAt: string;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Human-readable labels
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: "Created", color: "bg-green-50 text-green-700" },
  updated: { label: "Updated", color: "bg-blue-50 text-blue-700" },
  deleted: { label: "Deleted", color: "bg-red-50 text-red-700" },
  activated: { label: "Activated", color: "bg-emerald-50 text-emerald-700" },
  deactivated: { label: "Deactivated", color: "bg-gray-100 text-gray-600" },
  accepted: { label: "Accepted", color: "bg-green-50 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-50 text-red-700" },
  reset_password: { label: "Password Reset", color: "bg-amber-50 text-amber-700" },
  mapped: { label: "Mapped", color: "bg-indigo-50 text-indigo-700" },
  paid: { label: "Paid", color: "bg-green-50 text-green-700" },
  waived: { label: "Waived", color: "bg-purple-50 text-purple-700" },
  undone: { label: "Undone", color: "bg-orange-50 text-orange-700" },
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  household: Home,
  collector: Users,
  fieldworker: Users,
  village: Settings,
  village_settings: Settings,
  bill: Package,
  billing_cycle: Package,
  fee_config: Settings,
  gateway_config: Shield,
  qr_batch: QrCode,
  qr_mapping: QrCode,
  vehicle: Car,
  issue: AlertCircle,
  announcement: Bell,
  user: User,
  ward: Settings,
};

const ENTITY_LABELS: Record<string, string> = {
  household: "Household",
  collector: "Collector",
  fieldworker: "Field Worker",
  village: "Village",
  village_settings: "Village Settings",
  bill: "Bill",
  billing_cycle: "Billing Cycle",
  fee_config: "Fee Config",
  gateway_config: "Gateway Config",
  qr_batch: "QR Batch",
  qr_mapping: "QR Mapping",
  vehicle: "Vehicle",
  issue: "Issue",
  announcement: "Announcement",
  user: "User",
  ward: "Ward",
};

// Format details into readable string
function formatDetails(details: Record<string, any> | null): string {
  if (!details) return "";
  const parts: string[] = [];
  if (details.headName) parts.push(details.headName);
  if (details.name) parts.push(details.name);
  if (details.uid) parts.push(details.uid);
  if (details.ward) parts.push(`Ward: ${details.ward}`);
  if (details.newStatus) parts.push(`→ ${details.newStatus}`);
  if (details.quantity) parts.push(`Qty: ${details.quantity}`);
  if (details.field) parts.push(`Field: ${details.field}`);
  if (details.self) parts.push("(self)");
  if (details.updatedFields) parts.push(`Fields: ${details.updatedFields.join(", ")}`);
  return parts.join(" · ");
}

interface ActivityLogProps {
  onBack: () => void;
  apiUrl?: string;         // "/api/audit-logs" for manager, "/api/admin/audit-logs" for admin
  showVillageFilter?: boolean;
}

export default function ActivityLog({ onBack, apiUrl = "/api/audit-logs", showVillageFilter = false }: ActivityLogProps) {
  const [page, setPage] = useState(1);
  const [allLogs, setAllLogs] = useState<AuditLogEntry[]>([]);
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "50");
    if (entityFilter && entityFilter !== "all") params.set("entity", entityFilter);
    if (actionFilter && actionFilter !== "all") params.set("action", actionFilter);
    return `${apiUrl}?${params}`;
  }, [apiUrl, page, entityFilter, actionFilter]);

  const { data, isLoading, isFetching } = useQuery<AuditLogResponse>({
    queryKey: ["audit-logs", apiUrl, page, entityFilter, actionFilter],
    queryFn: async () => {
      const res = await fetch(buildUrl(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
    staleTime: 30000,
  });

  // Append new page data or reset on filter change
  React.useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAllLogs(data.data);
      } else {
        setAllLogs(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          const newItems = data.data.filter(l => !existingIds.has(l.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [data, page]);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
    setAllLogs([]);
  }, [entityFilter, actionFilter]);

  const hasMore = data ? page < data.totalPages : false;
  const total = data?.total || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shrink-0">
        <div className="px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl hover:bg-gray-100 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black tracking-tight text-gray-900 uppercase font-outfit">Activity Log</h2>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              {total} total entries
            </p>
          </div>
          <Button
            variant={showFilters ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "rounded-xl h-9 px-3 gap-1.5 text-xs font-bold",
              showFilters ? "bg-green-50 text-green-700" : ""
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </Button>
        </div>

        {/* Filter Row */}
        {showFilters && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-8 text-xs rounded-lg min-w-[130px] max-w-[160px]">
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 text-xs rounded-lg min-w-[120px] max-w-[150px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(entityFilter !== "all" || actionFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEntityFilter("all"); setActionFilter("all"); }}
                className="h-8 text-xs text-red-500 hover:text-red-600 rounded-lg px-2 shrink-0"
              >
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto bg-gray-50/30">
        {isLoading && allLogs.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center opacity-40">
            <div className="animate-spin h-8 w-8 border-[3px] border-gray-900 border-t-transparent rounded-full mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest">Loading logs</p>
          </div>
        ) : allLogs.length === 0 ? (
          <div className="py-20 text-center">
            <ClipboardList className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <h4 className="font-bold text-gray-400 text-sm">No activity logs yet</h4>
            <p className="text-xs text-gray-300 mt-1">Actions will appear here as they happen</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {allLogs.map((log) => {
              const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "bg-gray-100 text-gray-600" };
              const EntityIcon = ENTITY_ICONS[log.entity] || ClipboardList;
              const entityLabel = ENTITY_LABELS[log.entity] || log.entity;
              const detailStr = formatDetails(log.details);

              return (
                <div key={log.id} className="bg-white px-4 py-3 flex items-start gap-3">
                  {/* Entity icon */}
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                    <EntityIcon className="h-4 w-4 text-gray-500" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge className={cn("text-[9px] font-bold px-1.5 py-0 rounded border-0", actionInfo.color)}>
                        {actionInfo.label}
                      </Badge>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase">{entityLabel}</span>
                    </div>

                    {/* Details line */}
                    {(log.entityId || detailStr) && (
                      <p className="text-xs text-gray-600 truncate">
                        {log.entityId && <span className="font-semibold">{log.entityId}</span>}
                        {log.entityId && detailStr && " · "}
                        {detailStr}
                      </p>
                    )}

                    {/* Meta line */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400 font-medium">
                        {format(new Date(log.createdAt), "dd MMM, hh:mm a")}
                      </span>
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {log.userId}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load More */}
            {hasMore && (
              <div className="py-4 flex justify-center bg-white">
                <Button
                  onClick={() => setPage(p => p + 1)}
                  disabled={isFetching}
                  variant="outline"
                  className="h-10 px-6 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 gap-2"
                >
                  {isFetching ? (
                    <div className="animate-spin h-3 w-3 border-2 border-gray-600 border-t-transparent rounded-full" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
