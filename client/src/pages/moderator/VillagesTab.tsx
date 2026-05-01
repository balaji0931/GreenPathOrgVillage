import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ReportsTabContent } from "@/pages/manager-dashboard";

interface VillagesTabProps {
  villages: any[];
  selectedVillageId: string | null;
  onSelectVillage: (id: string | null) => void;
}

export default function VillagesTab({ villages, selectedVillageId, onSelectVillage }: VillagesTabProps) {
  if (selectedVillageId) {
    const village = villages.find((v: any) => v.villageId === selectedVillageId);
    return <VillageReport villageId={selectedVillageId} villageName={village?.name || selectedVillageId} unitType={village?.unitType} onBack={() => onSelectVillage(null)} />;
  }

  const coverageColor = (pct: number) => pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  const coverageText = (pct: number) => pct >= 80 ? "text-green-700" : pct >= 50 ? "text-amber-700" : "text-red-600";

  return (
    <div className="space-y-3 pb-4">
      <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Select a Village</h3>
      {villages.map((v: any) => {
        const pct = v.collectionRate || 0;
        return (
          <button
            key={v.villageId}
            onClick={() => onSelectVillage(v.villageId)}
            className="w-full text-left bg-white/70 backdrop-blur-md border border-white/20 shadow-sm rounded-2xl p-4 transition-all active:scale-[0.98] hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-black text-gray-900">{v.name}</div>
                <div className="text-[9px] font-bold text-gray-400 uppercase">{v.villageId}</div>
              </div>
              <span className={`text-lg font-black ${coverageText(pct)}`}>{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${coverageColor(pct)}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 text-[9px] font-bold text-blue-600 uppercase tracking-widest">Tap to view detailed report →</div>
          </button>
        );
      })}
      {villages.length === 0 && (
        <div className="text-center py-12 text-[10px] font-black text-gray-400 uppercase">No villages assigned</div>
      )}
    </div>
  );
}

/* ──── Village Detailed Report — uses exact same ReportsTabContent as manager ──── */
function VillageReport({ villageId, villageName, unitType, onBack }: { villageId: string; villageName: string; unitType?: string; onBack: () => void }) {
  const [filters, setFilters] = useState<any>({ date: format(new Date(), "yyyy-MM-dd") });
  const updateFilter = (key: string, value: any) => setFilters((prev: any) => ({ ...prev, [key]: value }));

  const targetDate = useMemo(() => {
    if (filters.date) return filters.date;
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(Date.now() + istOffset);
    return nowIst.toISOString().split('T')[0];
  }, [filters.date]);

  const { data: reportData, isLoading } = useQuery<any>({
    queryKey: ["/api/moderator/village/report", villageId, targetDate],
    queryFn: async () => {
      const res = await fetch(`/api/moderator/village/${villageId}/report?date=${targetDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  /* No separate back header — back arrow is inside StickyDateSwitcher via onBack prop */
  return (
    <ReportsTabContent
      filters={filters}
      updateFilter={updateFilter}
      reportData={reportData}
      isLoading={isLoading}
      villageName={villageName}
      villageId={villageId}
      managerName="Moderator View"
      unitType={unitType}
      onBack={onBack}
    />
  );
}
