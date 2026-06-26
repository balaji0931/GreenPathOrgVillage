import { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useGpsRecorder, type GpsSignal, type RecordingState } from '@/hooks/useGpsRecorder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  MapPin, Navigation, Square, Pause, Play, Trash2, Save, Plus,
  ArrowLeft, Wifi, WifiOff, ChevronRight, Route, AlertCircle
} from 'lucide-react';

const RoadMapView = lazy(() => import('./RoadMapView'));

// ─── Types ────────────────────────────────────────────────────
interface VillageRoad {
  id: number;
  villageId: string;
  name: string;
  coordinates: [number, number][];
  distanceMeters: number;
  recordedBy: string;
  createdAt: string;
}

type Screen = 'list' | 'gps-lock' | 'recording' | 'paused' | 'review' | 'full-map';

// ─── Helpers ──────────────────────────────────────────────────
function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function SignalBadge({ signal }: { signal: GpsSignal }) {
  const config: Record<GpsSignal, { label: string; bg: string; text: string; dot: string }> = {
    waiting: { label: 'Waiting for GPS', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    strong: { label: 'GPS Strong', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    fair: { label: 'GPS Fair', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    poor: { label: 'GPS Poor', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  };
  const c = config[signal];
  return (
    <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', c.bg, c.text)}>
      <span className={cn('w-2 h-2 rounded-full', c.dot, signal === 'waiting' && 'animate-pulse')} />
      {c.label}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function RoadMapper() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [screen, setScreen] = useState<Screen>('list');
  const [reviewData, setReviewData] = useState<{ points: [number, number][]; distanceMeters: number } | null>(null);
  const [roadName, setRoadName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<VillageRoad | null>(null);
  const [editTarget, setEditTarget] = useState<VillageRoad | null>(null);
  const [editName, setEditName] = useState('');

  const gps = useGpsRecorder();

  // ─── Queries ──────────────────────────────────────
  const { data: roads = [], isLoading } = useQuery<VillageRoad[]>({
    queryKey: ['/api/village-roads'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/village-roads');
      return res.json();
    },
    enabled: !!user?.villageId,
  });

  const totalDistance = useMemo(() => roads.reduce((sum, r) => sum + (r.distanceMeters || 0), 0), [roads]);

  // ─── Mutations ────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; coordinates: [number, number][]; distanceMeters: number }) => {
      const res = await apiRequest('POST', '/api/village-roads', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/village-roads'] });
      toast({ title: '✅ Road Saved' });
      setScreen('list');
      setReviewData(null);
      setRoadName('');
      gps.reset();
    },
    onError: () => {
      toast({ title: 'Failed to save road', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/village-roads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/village-roads'] });
      toast({ title: 'Road deleted' });
      setDeleteTarget(null);
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await apiRequest('PATCH', `/api/village-roads/${id}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/village-roads'] });
      setEditTarget(null);
    },
  });

  // ─── Handlers ─────────────────────────────────────
  const handleStartFlow = useCallback(() => {
    gps.acquireGps();
    setScreen('gps-lock');
  }, [gps]);

  const handleBeginRecording = useCallback(() => {
    gps.startRecording();
    setScreen('recording');
  }, [gps]);

  const handlePause = useCallback(() => {
    gps.pauseRecording();
    setScreen('paused');
  }, [gps]);

  const handleResume = useCallback(() => {
    gps.resumeRecording();
    setScreen('recording');
  }, [gps]);

  const handleStop = useCallback(() => {
    const result = gps.stopRecording();
    if (result.points.length < 2) {
      toast({ title: 'Not enough points recorded', description: 'Please try again with better GPS signal', variant: 'destructive' });
      gps.reset();
      setScreen('list');
      return;
    }
    setReviewData(result);
    setRoadName(`Road ${roads.length + 1}`);
    setScreen('review');
  }, [gps, roads.length, toast]);

  const handleSave = useCallback(() => {
    if (!reviewData) return;
    saveMutation.mutate({
      name: roadName.trim() || `Road ${roads.length + 1}`,
      coordinates: reviewData.points,
      distanceMeters: reviewData.distanceMeters,
    });
  }, [reviewData, roadName, roads.length, saveMutation]);

  const handleDiscard = useCallback(() => {
    setReviewData(null);
    gps.reset();
    setScreen('list');
  }, [gps]);

  const handleRecoverDraft = useCallback(() => {
    const pts = gps.recoverDraft();
    if (pts && pts.length > 1) {
      const dist = pts.reduce((sum, p, i) => {
        if (i === 0) return 0;
        const R = 6371000;
        const dLat = (p[0] - pts[i-1][0]) * Math.PI / 180;
        const dLng = (p[1] - pts[i-1][1]) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(pts[i-1][0]*Math.PI/180)*Math.cos(p[0]*Math.PI/180)*Math.sin(dLng/2)**2;
        return sum + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }, 0);
      setReviewData({ points: pts, distanceMeters: Math.round(dist) });
      setRoadName(`Road ${roads.length + 1}`);
      setScreen('review');
    } else {
      gps.clearDraft();
      toast({ title: 'Draft could not be recovered', variant: 'destructive' });
    }
  }, [gps, roads.length, toast]);

  const handleBackToList = useCallback(() => {
    gps.reset();
    setScreen('list');
    setReviewData(null);
  }, [gps]);

  // ─── SCREEN: List ─────────────────────────────────
  if (screen === 'list') {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Draft Recovery Banner */}
        {gps.hasDraft && (
          <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-800">Unfinished recording found</p>
              <p className="text-[10px] text-amber-600">Recover your last recorded road?</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => gps.clearDraft()}>Dismiss</Button>
              <Button size="sm" className="h-7 text-[10px] bg-amber-600 hover:bg-amber-700" onClick={handleRecoverDraft}>Recover</Button>
            </div>
          </div>
        )}

        {roads.length === 0 && !isLoading ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
              <Route className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1">Map Your Village Roads</h3>
            <p className="text-xs text-gray-500 mb-6 max-w-[260px]">
              Record the roads that your waste collection vehicles use. Sit in the vehicle and drive the route.
            </p>
            <div className="w-full max-w-[280px] bg-white rounded-xl p-4 border border-gray-100 mb-6 text-left">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">How it works</p>
              {['Sit in the collection vehicle', 'Tap Start Recording', 'Drive the route', 'Tap Stop when done', 'Repeat for each road'].map((step, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5">
                  <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-[11px] text-gray-600">{step}</span>
                </div>
              ))}
            </div>
            <Button className="w-full max-w-[280px] h-12 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-bold" onClick={handleStartFlow}>
              <Navigation className="h-4 w-4 mr-2" />
              Start Recording
            </Button>
          </div>
        ) : (
          /* Road List */
          <div className="flex-1 overflow-y-auto pb-20">
            {/* Mini map preview */}
            {roads.length > 0 && (
              <div className="mx-4 mt-3 h-80 rounded-xl overflow-hidden border border-gray-200 relative" onClick={() => setScreen('full-map')}>
                <Suspense fallback={<div className="h-full bg-gray-100 animate-pulse" />}>
                  <RoadMapView savedRoads={roads} className="rounded-xl" />
                </Suspense>
                <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-gray-600">
                  Tap to view full map
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="mx-4 mt-3 mb-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                Recorded Roads
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {roads.length} road{roads.length !== 1 ? 's' : ''} · {formatDistance(totalDistance)} total
              </p>
            </div>

            {/* Road cards */}
            {roads.map((road, idx) => (
              <div key={road.id} className="mx-4 mb-2 bg-white rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][idx % 6] }} />
                    <div className="min-w-0">
                      <button className="text-sm font-bold text-gray-900 truncate block text-left" onClick={() => { setEditTarget(road); setEditName(road.name); }}>
                        {road.name}
                      </button>
                      <p className="text-[10px] text-gray-400">
                        {formatDistance(road.distanceMeters || 0)} · {new Date(road.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <button className="p-2 text-gray-300 hover:text-red-500 active:scale-90 transition-all" onClick={() => setDeleteTarget(road)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating CTA when roads exist */}
        {roads.length > 0 && (
          <div className="fixed bottom-4 px-4 pb-3 md:pb-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 60px)' }}>
            <Button className="w-full h-12 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-bold shadow-lg shadow-green-600/20" onClick={handleStartFlow}>
              <Plus className="h-4 w-4 mr-2" />
              Record Another Road
            </Button>
          </div>
        )}

        {/* Delete Dialog */}
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="max-w-[320px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base">Delete this road?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500">
              <strong>{deleteTarget?.name}</strong> ({formatDistance(deleteTarget?.distanceMeters || 0)})
            </p>
            <p className="text-xs text-gray-400">You will need to record it again.</p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rename Dialog */}
        <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
          <DialogContent className="max-w-[320px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base">Rename road</DialogTitle>
            </DialogHeader>
            <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Road name" className="mt-1" maxLength={100} />
            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => editTarget && renameMutation.mutate({ id: editTarget.id, name: editName.trim() })} disabled={!editName.trim() || renameMutation.isPending}>
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── SCREEN: GPS Lock ─────────────────────────────
  if (screen === 'gps-lock') {
    const isReady = gps.signal === 'strong' || gps.signal === 'fair';
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b">
          <button onClick={handleBackToList} className="p-1"><ArrowLeft className="h-5 w-5 text-gray-600" /></button>
          <span className="text-sm font-bold text-gray-900">Preparing GPS</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className={cn(
            'w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500',
            isReady ? 'bg-green-100' : 'bg-gray-100 animate-pulse'
          )}>
            <Navigation className={cn('h-10 w-10 transition-colors', isReady ? 'text-green-600' : 'text-gray-400')} />
          </div>
          <SignalBadge signal={gps.signal} />
          <p className="text-xs text-gray-500 mt-4 max-w-[240px]">
            {isReady
              ? 'GPS signal acquired. You can start recording now.'
              : 'Waiting for GPS signal. Make sure you are outdoors with a clear sky view.'}
          </p>
          {gps.accuracy < 999 && (
            <p className="text-[10px] text-gray-400 mt-2">Accuracy: ±{Math.round(gps.accuracy)}m</p>
          )}
          <Button
            className="mt-8 w-full max-w-[280px] h-12 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 disabled:opacity-40"
            disabled={!isReady}
            onClick={handleBeginRecording}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Recording
          </Button>
        </div>
      </div>
    );
  }

  // ─── SCREEN: Recording / Paused (shared full-screen map) ───
  if (screen === 'recording' || screen === 'paused') {
    const isRecording = screen === 'recording';
    return (
      <div className="flex flex-col h-full relative">
        {/* Full-screen map */}
        <div className="flex-1 relative">
          <Suspense fallback={<div className="h-full bg-gray-100 animate-pulse" />}>
            <RoadMapView
              savedRoads={roads}
              activePolyline={gps.points}
              currentPosition={gps.currentPos}
              followPosition={isRecording}
              zoom={17}
            />
          </Suspense>

          {/* GPS signal badge — top left */}
          <div className="absolute top-3 left-3 z-[500]">
            <SignalBadge signal={gps.signal} />
          </div>
        </div>

        {/* Recording bar — bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-[500] p-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isRecording && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
                <span className="text-xs font-black uppercase tracking-widest text-gray-900">
                  {isRecording ? 'Recording' : 'Paused'}
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-400">{formatElapsed(gps.elapsed)}</span>
            </div>
            <p className="text-lg font-black text-gray-900 mb-3">{formatDistance(gps.distanceM)}</p>
            <div className="flex gap-2">
              {isRecording ? (
                <>
                  <Button variant="outline" className="flex-1 h-11 rounded-xl text-xs font-bold" onClick={handlePause}>
                    <Pause className="h-4 w-4 mr-1.5" /> Pause
                  </Button>
                  <Button className="flex-1 h-11 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700" onClick={handleStop}>
                    <Square className="h-3.5 w-3.5 mr-1.5" /> Stop & Save
                  </Button>
                </>
              ) : (
                <>
                  <Button className="flex-1 h-11 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700" onClick={handleResume}>
                    <Play className="h-4 w-4 mr-1.5" /> Resume
                  </Button>
                  <Button className="flex-1 h-11 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700" onClick={handleStop}>
                    <Square className="h-3.5 w-3.5 mr-1.5" /> Stop & Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── SCREEN: Review & Save ────────────────────────
  if (screen === 'review' && reviewData) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Map showing recorded road */}
        <div className="h-[45%] relative">
          <Suspense fallback={<div className="h-full bg-gray-100 animate-pulse" />}>
            <RoadMapView
              savedRoads={roads}
              activePolyline={reviewData.points}
              zoom={16}
            />
          </Suspense>
        </div>

        {/* Review card */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
                <Route className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-base font-black text-gray-900">Road Recorded!</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Distance</p>
                <p className="text-lg font-black text-gray-900">{formatDistance(reviewData.distanceMeters)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Duration</p>
                <p className="text-lg font-black text-gray-900">{formatElapsed(gps.elapsed)}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Name this road</label>
              <Input
                value={roadName}
                onChange={e => setRoadName(e.target.value)}
                placeholder="e.g. Main Road, Temple Lane"
                className="h-10 rounded-xl"
                maxLength={100}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11 rounded-xl text-xs font-bold" onClick={handleDiscard}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" /> {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>

            <button
              className="w-full mt-3 text-center text-xs font-bold text-green-600 py-2 active:scale-95 transition-transform"
              onClick={() => {
                handleSave();
                // After save completes, the onSuccess will reset to list, where user can start another
              }}
            >
              Save & Record Another Road →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── SCREEN: Full Map ─────────────────────────────
  if (screen === 'full-map') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b z-[500] relative">
          <button onClick={handleBackToList} className="p-1"><ArrowLeft className="h-5 w-5 text-gray-600" /></button>
          <span className="text-sm font-bold text-gray-900">Village Roads</span>
        </div>
        <div className="flex-1 relative">
          <Suspense fallback={<div className="h-full bg-gray-100 animate-pulse" />}>
            <RoadMapView savedRoads={roads} />
          </Suspense>
          <div className="absolute bottom-4 left-4 right-4 z-[500]">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-gray-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500">{roads.length} road{roads.length !== 1 ? 's' : ''}</span>
              <span className="text-sm font-black text-gray-900">{formatDistance(totalDistance)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
