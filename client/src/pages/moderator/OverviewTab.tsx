import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { StickyDateSwitcher } from "@/pages/manager-dashboard";
import {
  Building2, Users, CheckCircle, AlertTriangle, Star,
  ArrowRight
} from "lucide-react";

interface OverviewTabProps {
  onVillageTap: (villageId: string) => void;
}

export default function OverviewTab({ onVillageTap }: OverviewTabProps) {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/moderator/overview-stats", date],
    queryFn: async () => {
      const res = await fetch(`/api/moderator/overview-stats?date=${date}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Loading overview...</span>
      </div>
    );
  }

  const agg = data?.aggregate || { totalVillages: 0, totalHouseholds: 0, collectionsToday: 0, notCollectedToday: 0, avgRating: 0, openIssues: 0 };
  const villageList: any[] = data?.villages || [];
  const coveragePct = agg.totalHouseholds > 0 ? Math.round((agg.collectionsToday / agg.totalHouseholds) * 100) : 0;

  const ratingColor = (r: number) => r >= 4 ? "text-green-600" : r >= 3 ? "text-amber-500" : "text-red-500";
  const coverageColor = (pct: number) => pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  const coverageBorder = (pct: number) => pct >= 80 ? "border-green-100" : pct >= 50 ? "border-amber-100" : "border-red-100";
  const coverageText = (pct: number) => pct >= 80 ? "text-green-700" : pct >= 50 ? "text-amber-700" : "text-red-600";

  return (
    <div className="pb-4">
      {/* Sticky Date Switcher — same as manager's */}
      <StickyDateSwitcher date={date} onChange={setDate} />

      <div className="space-y-4">
        {/* Territory KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <KPICard icon={<Building2 className="h-4 w-4" />} label="Organizations" value={agg.totalVillages} color="bg-blue-50 text-blue-600" />
          <KPICard icon={<Users className="h-4 w-4" />} label="Households" value={agg.totalHouseholds.toLocaleString()} color="bg-purple-50 text-purple-600" />
          <KPICard icon={<CheckCircle className="h-4 w-4" />} label="Collected" value={agg.collectionsToday.toLocaleString()} color="bg-green-50 text-green-600" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <KPICard icon={<AlertTriangle className="h-4 w-4" />} label="Not Collected" value={agg.notCollectedToday.toLocaleString()} color="bg-red-50 text-red-600" />
          <KPICard icon={<Star className="h-4 w-4" />} label="Avg Rating" value={`${agg.avgRating}/5`} color="bg-amber-50 text-amber-600" />
          <KPICard icon={<AlertTriangle className="h-4 w-4" />} label="Open Issues" value={agg.openIssues} color={agg.openIssues > 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"} />
        </div>

        {/* Territory Coverage Bar */}
        <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Territory Coverage</span>
            <span className={`text-lg font-black ${coverageText(coveragePct)}`}>{coveragePct}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${coverageColor(coveragePct)}`} style={{ width: `${coveragePct}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] font-bold text-gray-400">{agg.collectionsToday} collected</span>
            <span className="text-[9px] font-bold text-gray-400">{agg.totalHouseholds} total</span>
          </div>
        </div>

        {/* Village Performance Ranking */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Village Performance</h3>
            <span className="text-[9px] font-bold text-gray-400 uppercase">Worst first ↑</span>
          </div>
          <div className="space-y-2">
            {villageList.map((v) => {
              const pct = v.collectionRate;
              return (
                <button
                  key={v.villageId}
                  onClick={() => onVillageTap(v.villageId)}
                  className={`w-full text-left bg-white/70 backdrop-blur-md border shadow-sm rounded-2xl p-3 transition-all active:scale-[0.98] hover:shadow-md ${coverageBorder(pct)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-gray-900 truncate">{v.name}</div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{v.villageId}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0 ml-2" />
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${coverageColor(pct)}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-xs font-black min-w-[42px] text-right ${coverageText(pct)}`}>{pct}%</span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-[9px] font-bold text-gray-500 uppercase">
                    <span>{v.collectionsToday}/{v.totalHouseholds} collected</span>
                    <span className={ratingColor(v.avgRating)}>⭐ {v.avgRating}</span>
                    {v.openIssues > 0 && <span className="text-red-500">⚠ {v.openIssues} issues</span>}
                  </div>
                </button>
              );
            })}

            {villageList.length === 0 && (
              <div className="text-center py-12 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                No villages assigned
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className={`rounded-2xl p-3 text-center ${color} border border-white/20`}>
      <div className="flex justify-center mb-1 opacity-60">{icon}</div>
      <div className="text-lg font-black leading-tight">{value}</div>
      <div className="text-[8px] font-black uppercase tracking-widest opacity-60 mt-0.5">{label}</div>
    </div>
  );
}
