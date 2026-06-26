import { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { format, addDays, isSameDay } from 'date-fns';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Layers, Route, Map as MapPinIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { generateKML, downloadKmlFile } from '@/lib/exportKml';

// ─── Lazy-load Leaflet to keep initial bundle small ─────────────────────────
const MapLayer = lazy(() => import('./MapVisualizationLayer'));

// ─── Types ───────────────────────────────────────────────────────────────────
export interface DailyHousehold {
  id: number; uid: string; headName: string; houseNumber: string; ward: string;
  phone: string; latitude: string | null; longitude: string | null;
  collected: boolean; segregationRating: number | null;
  collectorName: string | null; collectionTime: string | null;
}
export interface VillageCollection {
  id: number; householdId: number; collectorId: number; collectorName: string;
  segregationRating: number | null; status: string | null;
  collectionDate: string; householdUid: string; headName: string;
  houseNumber: string;
}
export interface VehicleInfo {
  registrationNumber: string; name: string; collectorIds: number[];
}
export interface CollectorInfo {
  id: number; name: string; uid: string; registrationNumber?: string | null;
}
export interface Boundary {
  id: number; type: string; wardName?: string | null; coordinates: [number, number][];
}
export interface Road { id: number; name: string; coordinates: [number, number][]; }

export type LayerType =
  | 'collection-status'
  | 'ward-coverage'
  | 'vehicle-territory'
  | 'inferred-route'
  | 'segregation-quality';

const LAYERS: { id: LayerType; label: string; desc: string }[] = [
  { id: 'collection-status', label: 'Collection Status', desc: 'Household dots — collected vs not collected' },
  { id: 'ward-coverage', label: 'Ward Coverage', desc: 'Ward fill — % of households collected' },
  // { id: 'vehicle-territory', label: 'Vehicle Territory', desc: 'Coverage zone per vehicle' },
  // { id: 'inferred-route', label: 'Inferred Route', desc: 'Approximate collection path by timestamp order' },
  { id: 'segregation-quality', label: 'Segregation Quality', desc: 'Ward fill — average segregation score' },
];

// ─── Simple convex hull (gift-wrapping, client-side) ─────────────────────────
function cross(o: [number, number], a: [number, number], b: [number, number]) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
export function convexHull(pts: [number, number][]): [number, number][] {
  if (pts.length < 3) return pts;
  const sorted = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lower: [number, number][] = [];
  for (const p of sorted) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  const upper: [number, number][] = [];
  for (const p of [...sorted].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  upper.pop(); lower.pop();
  return [...lower, ...upper];
}

// ─── IST today helper ────────────────────────────────────────────────────────
function istToday() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

const VEHICLE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#14B8A6'];

// ─── Main component ───────────────────────────────────────────────────────────
export default function MapVisualization({ onBack }: { onBack?: () => void }) {
  const { user } = useAuth();
  const [date, setDate] = useState(istToday);
  const [activeLayer, setActiveLayer] = useState<LayerType>('collection-status');
  const [showRoads, setShowRoads] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');

  const adjustDate = (days: number) => {
    const d = addDays(new Date(date), days);
    setDate(format(d, 'yyyy-MM-dd'));
  };

  // Auto-show roads for route layer
  const roadsVisible = showRoads || activeLayer === 'inferred-route';

  // ── Data fetches (all cached by date) ──────────────────────────────────────
  const { data: dailySummary, isLoading: loadingDaily } = useQuery<{ households: DailyHousehold[] }>({
    queryKey: ['/api/collections/daily-summary', user?.villageId, date],
    queryFn: async () => {
      const r = await fetch(`/api/collections/daily-summary?date=${date}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!user?.villageId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: villageCollections = [] } = useQuery<VillageCollection[]>({
    queryKey: ['/api/waste-collections/village', user?.villageId, date],
    queryFn: async () => {
      const r = await fetch(`/api/waste-collections/village?date=${date}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!user?.villageId && (activeLayer === 'vehicle-territory' || activeLayer === 'inferred-route'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: collectors = [] } = useQuery<CollectorInfo[]>({
    queryKey: ['/api/collectors', user?.villageId],
    queryFn: async () => {
      const r = await fetch('/api/collectors', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!user?.villageId,
    staleTime: 60 * 1000,
  });

  const { data: boundaries = [] } = useQuery<Boundary[]>({
    queryKey: ['/api/village-boundaries', user?.villageId],
    queryFn: async () => {
      const r = await fetch('/api/village-boundaries', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!user?.villageId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: roads = [] } = useQuery<Road[]>({
    queryKey: ['/api/village-roads', user?.villageId],
    queryFn: async () => {
      const r = await fetch('/api/village-roads', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!user?.villageId && roadsVisible,
    staleTime: 5 * 60 * 1000,
  });

  // ── Build collectorId → vehicleReg map ────────────────────────────────────
  const collectorVehicleMap = useMemo(() => {
    const m = new Map<number, string>();
    collectors.forEach(c => { if (c.registrationNumber) m.set(c.id, c.registrationNumber); });
    return m;
  }, [collectors]);

  // ── Derive vehicle list from today's collections ───────────────────────────
  const vehicleList = useMemo(() => {
    const seen = new Set<string>();
    const list: { reg: string; label: string }[] = [];
    villageCollections.forEach(c => {
      const reg = collectorVehicleMap.get(c.collectorId) || `Collector ${c.collectorId}`;
      if (!seen.has(reg)) { seen.add(reg); list.push({ reg, label: reg }); }
    });
    return list;
  }, [villageCollections, collectorVehicleMap]);

  // Reset vehicle selector when switching away
  useEffect(() => {
    if (activeLayer !== 'vehicle-territory' && activeLayer !== 'inferred-route') setSelectedVehicle('all');
  }, [activeLayer]);

  // ── Ward coverage computation (uses ALL households, even no GPS) ──────────
  const wardCoverage = useMemo(() => {
    const households = dailySummary?.households || [];
    const map = new Map<string, { total: number; collected: number }>();
    households.forEach(h => {
      if (!h.ward) return;
      const cur = map.get(h.ward) || { total: 0, collected: 0 };
      cur.total++;
      if (h.collected) cur.collected++;
      map.set(h.ward, cur);
    });
    return map;
  }, [dailySummary]);

  // ── Ward segregation computation ───────────────────────────────────────────
  const wardSegregation = useMemo(() => {
    const households = dailySummary?.households || [];
    const map = new Map<string, { sum: number; count: number }>();
    households.forEach(h => {
      if (!h.ward || !h.collected || h.segregationRating === null) return;
      const cur = map.get(h.ward) || { sum: 0, count: 0 };
      cur.sum += h.segregationRating;
      cur.count++;
      map.set(h.ward, cur);
    });
    return map;
  }, [dailySummary]);

  // ── Summary stats per layer ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const hh = dailySummary?.households || [];
    const total = hh.length;
    const collected = hh.filter(h => h.collected).length;
    const withGps = hh.filter(h => h.latitude && h.longitude).length;
    const ratings = hh.filter(h => h.segregationRating !== null).map(h => h.segregationRating!);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—';
    return { total, collected, pending: total - collected, withGps, avgRating, ratingCount: ratings.length };
  }, [dailySummary]);

  const isToday = isSameDay(new Date(date), new Date());

  const handleExportKml = () => {
    const kml = generateKML({
      villageName: 'GreenPath Village',
      boundaries,
      roads,
      households: activeLayer === 'collection-status' ? dailySummary?.households : undefined,
      showRoads: roadsVisible,
      showHouseholds: activeLayer === 'collection-status',
    });
    downloadKmlFile(kml, `Map_Export_${date}.kml`);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">

      {/* ── Sticky header ── */}
      <div className="sticky fixed top-0 z-20 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between gap-2 px-3 py-1">
          <div className="flex-1 flex justify-start">
            {onBack && (
              <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
            )}
          </div>
          {/* Date selector */}
          <div className="flex items-center gap-0.5 justify-center">
            <button onClick={() => adjustDate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            </button>
            <button
              className="px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors flex flex-col items-center min-w-[90px]"
              onClick={() => (document.getElementById('mapviz-date') as HTMLInputElement)?.showPicker?.()}
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-none">{isToday ? 'TODAY' : format(new Date(date), 'EEEE').toUpperCase()}</span>
              <span className="text-xs font-black text-gray-900">{format(new Date(date), 'dd MMM yyyy')}</span>
            </button>
            <input id="mapviz-date" type="date" value={date} onChange={e => setDate(e.target.value)}
              className="absolute opacity-0 pointer-events-none w-0 h-0" />
            <button onClick={() => adjustDate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 flex justify-end">
            <button 
              onClick={handleExportKml} 
              className="p-1.5 rounded-xl hover:bg-green-50 transition-colors flex items-center gap-1 text-green-700"
              title="Export visible map as KML"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="h-[70vh] relative flex-shrink-0 sticky top-[49px] px-2">
        {loadingDaily ? (
          <div className="h-full bg-gray-100 animate-pulse flex items-center justify-center">
            <span className="text-xs text-gray-400 font-bold">Loading map data…</span>
          </div>
        ) : (
          <Suspense fallback={<div className="h-full bg-gray-100 animate-pulse" />}>
            <MapLayer
              boundaries={boundaries}
              roads={roadsVisible ? roads : []}
              households={dailySummary?.households || []}
              villageCollections={villageCollections}
              collectorVehicleMap={collectorVehicleMap}
              activeLayer={activeLayer}
              wardCoverage={wardCoverage}
              wardSegregation={wardSegregation}
              vehicleColors={VEHICLE_COLORS}
              selectedVehicle={selectedVehicle}
            />
          </Suspense>
        )}
        {/* Layer badge — bottom left */}
        <div className="absolute bottom-0 left-2 z-[501] pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-gray-900 shadow-sm flex items-center gap-1.5">
            <Layers className="h-3 w-3 text-green-600" />
            {LAYERS.find(l => l.id === activeLayer)?.label}
          </div>
        </div>
      </div>

      {/* ── Scrollable controls ── */}
      <div className="flex-1 px-4 pt-4 pb-8 space-y-4 bg-gray-50">

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-lg font-black text-gray-900">{stats.collected}</p>
            <p className="text-[10px] font-bold text-green-600 uppercase">Collected</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-lg font-black text-gray-900">{stats.pending}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Pending</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-lg font-black text-gray-900">{stats.total > 0 ? Math.round(stats.collected / stats.total * 100) : 0}%</p>
            <p className="text-[10px] font-bold text-blue-500 uppercase">Coverage</p>
          </div>
        </div>

        {/* Roads toggle */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">Show Roads</p>
            <p className="text-[10px] text-gray-400">{activeLayer === 'inferred-route' ? 'Auto-enabled for route layer' : 'Road network overlay'}</p>
          </div>
          <button
            onClick={() => setShowRoads(v => !v)}
            disabled={activeLayer === 'inferred-route'}
            className={cn(
              'w-11 h-6 rounded-full transition-colors relative',
              roadsVisible ? 'bg-green-500' : 'bg-gray-200',
              activeLayer === 'inferred-route' && 'opacity-60 cursor-not-allowed'
            )}
          >
            <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', roadsVisible ? 'left-5' : 'left-0.5')} />
          </button>
        </div>

        {/* Layer picker */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-4 pt-3 pb-2">Map Layer</p>
          {LAYERS.map((layer, idx) => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={cn(
                'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                idx < LAYERS.length - 1 && 'border-b border-gray-50',
                activeLayer === layer.id ? 'bg-green-50' : 'hover:bg-gray-50'
              )}
            >
              {/* Radio circle */}
              <div className={cn(
                'mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                activeLayer === layer.id ? 'border-green-600' : 'border-gray-300'
              )}>
                {activeLayer === layer.id && <div className="w-2 h-2 rounded-full bg-green-600" />}
              </div>
              <div className="min-w-0">
                <p className={cn('text-sm font-bold', activeLayer === layer.id ? 'text-green-700' : 'text-gray-900')}>{layer.label}</p>
                <p className="text-[10px] text-gray-400">{layer.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Vehicle sub-selector for vehicle-territory or inferred-route */}
        {(activeLayer === 'vehicle-territory' || activeLayer === 'inferred-route') && (
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              {activeLayer === 'vehicle-territory' ? 'Filter by Vehicle' : 'Show Route for'}
            </p>
            {vehicleList.length === 0 ? (
              <p className="text-xs text-gray-400">No vehicle data for this date</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedVehicle('all')}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                    selectedVehicle === 'all' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200')}
                >All</button>
                {vehicleList.map((v, i) => (
                  <button
                    key={v.reg}
                    onClick={() => setSelectedVehicle(v.reg)}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                      selectedVehicle === v.reg ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200')}
                    style={selectedVehicle === v.reg ? { backgroundColor: VEHICLE_COLORS[i % VEHICLE_COLORS.length] } : {}}
                  >{v.label}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Layer legend */}
        <LayerLegend activeLayer={activeLayer} wardCoverage={wardCoverage} wardSegregation={wardSegregation} stats={stats} />
      </div>
    </div>
  );
}

// ─── Legend component ─────────────────────────────────────────────────────────
function LayerLegend({ activeLayer, wardCoverage, wardSegregation, stats }: {
  activeLayer: LayerType;
  wardCoverage: Map<string, { total: number; collected: number }>;
  wardSegregation: Map<string, { sum: number; count: number }>;
  stats: { total: number; collected: number; pending: number; withGps: number; avgRating: string; ratingCount: number };
}) {
  if (activeLayer === 'collection-status') return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Legend</p>
      <div className="flex flex-wrap gap-3">
        {[['#22c55e', 'Collected'], ['#d1d5db', 'No activity / Unknown']].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
            <span className="text-xs text-gray-600">{l}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-2">{stats.withGps} of {stats.total} households have GPS</p>
    </div>
  );

  if (activeLayer === 'ward-coverage') return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Ward Coverage</p>
      <div className="flex flex-wrap gap-3 mb-3">
        {[['#16a34a', '≥90%'], ['#ca8a04', '60–89%'], ['#ea580c', '30–59%'], ['#dc2626', '<30%']].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: c, opacity: 0.6 }} />
            <span className="text-xs text-gray-600">{l}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {Array.from(wardCoverage.entries()).map(([ward, { total, collected }]) => {
          const pct = total > 0 ? Math.round(collected / total * 100) : 0;
          return (
            <div key={ward} className="flex items-center gap-2">
              <span className="text-xs text-gray-700 flex-1 truncate">{ward}</span>
              <span className="text-xs font-bold text-gray-900">{collected}/{total}</span>
              <span className="text-[10px] font-bold" style={{ color: pct >= 90 ? '#16a34a' : pct >= 60 ? '#ca8a04' : pct >= 30 ? '#ea580c' : '#dc2626' }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (activeLayer === 'segregation-quality') return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Segregation Quality</p>
      <div className="flex flex-wrap gap-3 mb-3">
        {[['#16a34a', 'Avg ≥4 ★'], ['#ca8a04', 'Avg 3–4 ★'], ['#ea580c', 'Avg 2–3 ★'], ['#dc2626', 'Avg <2 ★'], ['#d1d5db', 'No data']].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: c, opacity: 0.6 }} />
            <span className="text-xs text-gray-600">{l}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {Array.from(wardSegregation.entries()).map(([ward, { sum, count }]) => {
          const avg = count > 0 ? (sum / count).toFixed(1) : '—';
          return (
            <div key={ward} className="flex items-center gap-2">
              <span className="text-xs text-gray-700 flex-1 truncate">{ward}</span>
              <span className="text-xs font-bold text-gray-900">{avg} ★</span>
              <span className="text-[10px] text-gray-400">{count} rated</span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-2">Village avg: {stats.avgRating} ★ ({stats.ratingCount} households)</p>
    </div>
  );

  if (activeLayer === 'vehicle-territory') return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Legend</p>
      <p className="text-xs text-gray-500">Each vehicle's service zone shown as a filled convex area. Dots = collected households colored by vehicle.</p>
    </div>
  );

  if (activeLayer === 'inferred-route') return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">How it works</p>
      <p className="text-xs text-gray-500">Collections are sorted by timestamp and connected in order to approximate the path taken. Accuracy depends on collection timestamp — offline-synced records may differ.</p>
    </div>
  );

  return null;
}
