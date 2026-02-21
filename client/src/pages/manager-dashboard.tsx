import { useState, useMemo, useDeferredValue } from "react";
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { apiRequest, fetchWithCsrf } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Users,
  User,
  Home,
  Star,
  Trash2,
  Edit,
  LogOut,
  Settings,
  BarChart3,
  MessageSquare,
  QrCode,
  Download,
  Eye,
  AlertCircle,
  TrendingUp,
  Award,
  Package,
  AlertTriangle,
  Camera,
  Mic,
  CheckCircle,
  Bell,
  LayoutDashboard,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Search,
  Map as MapIcon,
  Clock,
  ThumbsDown,
  ThumbsUp,
  Play,
  Pause,
  Volume2,
  ChevronDown
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { MaterialLog } from "@/components/manager/MaterialLog";
import { cn } from "@/lib/utils";

interface Collector {
  id: number;
  uid: string;
  name: string;
  phone: string;
  villageId: string;
  isActive: boolean;
  createdAt: string;
}

interface Household {
  id: number;
  uid: string;
  headName: string;
  houseNumber: string;
  phone: string;
  villageId: string;
  ward: string;
  qrCodeUrl: string;
  qrPrinted: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

interface VillageStats {
  totalHouseholds: number;
  totalCollectors: number;
  openIssues: number;
  collectionsToday: number;
}

interface WasteCollection {
  id: number;
  householdId: number;
  collectorId: number;
  collectionDate: string;
  wasteSegregated: boolean;
  binCleaned: boolean;
  feedbackRating: number;
  feedbackRemarks?: string;
  photo?: string;
  photoUrl?: string;
  voiceUrl?: string;
  createdAt: string;
  householdUid: string;
  headName: string;
  houseNumber: string;
  collectorName: string;
  segregationRating: number;
  plasticRating: number;
  observations?: string;
  remarks?: string;
  status?: string;
  missedReason?: string;
}

interface Issue {
  id: number;
  title: string;
  description: string;
  category: string;
  status: "open" | "in_progress" | "resolved";
  reportedBy: string;
  villageId: string;
  photoUrl?: string;
  managerReply?: string;
  managerProofPhotoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

interface CollectorStats {
  collectorId: number;
  collectorName: string;
  collectionsCompleted: number;
  avgRating: number;
}

// Paginated response interface
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Consolidated filter state
interface FilterState {
  search: string;
  date: string;
  status: string;
  collector: string;
}

// REDESIGNED: Premium Household Status Row
const HouseholdStatusRow = React.memo(({
  household,
  onSelect
}: {
  household: {
    id: number;
    headName: string;
    houseNumber: string;
    ward: string;
    collected: boolean;
    segregationRating: number | null;
    collectorName: string | null;
    collectionTime: string | null;
  };
  onSelect: (h: any) => void;
}) => {
  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-4 transition-all hover:bg-gray-50/80 active:scale-[0.98] cursor-pointer",
        "border-b border-gray-100 last:border-0"
      )}
      onClick={() => onSelect(household)}
    >
      {/* Dynamic Status Indicator */}
      <div className="relative group-active:scale-90 transition-transform">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm font-outfit",
          household.collected ? "bg-green-500 shadow-green-100" : "bg-red-500 shadow-red-100"
        )}>
          {household.headName.charAt(0)}
        </div>
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white",
          household.collected ? "bg-green-500" : "bg-red-500"
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-gray-900 truncate font-outfit">{household.headName}</h3>
          {household.collected ? (
            <span className="text-[11px] font-medium text-gray-400">
              {household.collectionTime ? new Date(household.collectionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wider">Pending</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm text-gray-500 truncate flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {household.houseNumber} • {household.ward}
          </p>
          {household.collected && (
            <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-green-200 text-green-600 bg-green-50/50">
              By {household.collectorName}
            </Badge>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-400" />
    </div>
  );
});

// Horizontal "Needs Attention" Strip (WhatsApp Style)
const NeedsAttentionStrip = ({ items, onSelect }: { items: any[], onSelect: (h: any) => void }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-white py-4 border-b border-gray-100 overflow-hidden">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 font-outfit">Needs Attention</h3>
        <Badge variant="secondary" className="bg-red-50 text-red-600 border-red-100 rounded-full text-[10px]">
          {items.length} critical
        </Badge>
      </div>
      <div className="flex gap-4 px-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {items.map((item) => (
          <button
            key={item.householdId}
            onClick={() => onSelect(item)}
            className="flex-shrink-0 w-20 flex flex-col items-center gap-1.5 snap-start creative-bounce"
          >
            <div className="relative p-[2px] rounded-full border-2 border-red-500 animate-in zoom-in-50 duration-500">
              <div className="w-[66px] h-[66px] rounded-full overflow-hidden bg-gray-100 border-2 border-white">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 text-red-600 font-bold text-xl uppercase">
                    {item.headName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-1 border-2 border-white shadow-sm">
                <AlertTriangle className="h-3 w-3" />
              </div>
            </div>
            <div className="text-center overflow-hidden w-full">
              <p className="text-[10px] font-bold text-gray-900 leading-tight truncate px-1">{item.headName}</p>
              <p className="text-[9px] text-gray-400 font-medium">{item.houseNumber}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Detail sheet for Needs Attention households - Redesigned for full screen Action
const AttentionDetailSheet = ({ household, onClose }: { household: any, onClose: () => void }) => {
  if (!household) return null;
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleCall = () => {
    if (household.phone) {
      window.open(`tel:${household.phone}`);
    }
  };

  const handleNavigate = () => {
    if (household.latitude && household.longitude) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${household.latitude},${household.longitude}`);
    } else {
      alert("Coordinates not available for this household.");
    }
  };

  return (
    <div className="fixed top-[64px] inset-x-0 bottom-0 z-[110] bg-white flex flex-col animate-in slide-in-from-bottom-full duration-500 ease-out overflow-hidden shadow-2xl">
      {/* Detail Header */}
      <div className="bg-white border-b border-gray-100 px-4 h-16 flex items-center gap-4 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-2xl hover:bg-gray-100 text-gray-500"
        >
          <X className="h-6 w-6" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-black tracking-tight text-gray-900 truncate uppercase font-outfit">
            {household.headName}
          </h2>
          <div className="flex items-center gap-1.5 -mt-0.5">
            <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">{household.uid}</span>
            <span className="w-1 h-1 rounded-full bg-gray-200" />
            <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">{household.ward}</span>
          </div>
        </div>
      </div>

      {/* Main Image View - Fills remaining space */}
      <div className="flex-1 bg-gray-900 relative flex items-center justify-center overflow-hidden">
        {household.photoUrl ? (
          <img src={household.photoUrl} alt="Collection Proof" className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center justify-center text-white/20">
            <Camera className="h-16 w-16 mb-4 opacity-10" />
            <p className="text-sm font-black uppercase tracking-widest opacity-40">No collection proof</p>
          </div>
        )}
        <div className="absolute top-6 left-6">
          <Badge className="bg-red-500 text-white border-none text-[10px] font-black tracking-widest uppercase py-1.5 px-4 shadow-xl">
            Needs Attention
          </Badge>
        </div>
      </div>

      {/* Stacked Bottom Detail Area */}
      <div className="shrink-0 shadow-[0_-8px_32px_rgba(0,0,0,0.05)] bg-white">
        {/* Layer 1: Voice Note (Highest in stack) */}
        {household.voiceUrl && (
          <div className="p-3 border-t border-gray-100">
            <div className="bg-gray-50 rounded-[1.5rem] p-3 flex items-center gap-4">
              <audio
                ref={audioRef}
                src={household.voiceUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <Button
                onClick={togglePlay}
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-xl bg-gray-900 text-white shrink-0"
              >
                {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
              </Button>
              <div className="flex-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Voice Note</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className={cn("h-full bg-gray-900 transition-all duration-300", isPlaying ? "w-full" : "w-0")} />
                  </div>
                  <Volume2 className="h-3 w-3 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Layer 2: Rating & Collector info */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Rating</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-red-600 font-outfit">{household.segregationRating}</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={cn("h-3 w-3", s <= (household.segregationRating || 0) ? "fill-red-500 text-red-500" : "text-gray-200")} />
                ))}
              </div>
            </div>
          </div>

          <div className="text-right flex flex-col gap-0.5">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Collector</p>
            <p className="font-bold text-gray-900 text-xs truncate max-w-[150px]">{household.collectorName}</p>
          </div>
        </div>

        {/* Layer 3: Call & Visit Actions (Lowest in stack) */}
        <div className="p-4 border-t border-gray-100 flex gap-3 pb-safe">
          <Button
            onClick={handleCall}
            className="flex-1 h-14 rounded-[1.25rem] bg-green-500 text-white font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
          >
            <Phone className="h-4 w-4" />
            Call
          </Button>

          <Button
            onClick={handleNavigate}
            variant="outline"
            className="flex-1 h-14 rounded-[1.25rem] border-2 border-gray-900 bg-white text-gray-900 font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            Visit
          </Button>
        </div>
      </div>
    </div>
  );
};

// Redesigned Household Collection Details View (Timeline History)
// Media Popup for Timeline details
const MediaPopup = ({ type, url, remarks, onClose }: { type: 'photo' | 'voice', url: string | null, remarks?: string | null, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-2xl bg-white/80 backdrop-blur-md h-10 w-10 shadow-sm"
        >
          <X className="h-5 w-5" />
        </Button>

        {type === 'photo' ? (
          <div className="flex flex-col">
            {url ? (
              <img src={url} alt="Collection Proof" className="w-full h-auto max-h-[70vh] object-contain" />
            ) : (
              <div className="p-20 flex flex-col items-center justify-center text-gray-200">
                <Camera className="h-20 w-20 mb-4 opacity-10" />
                <p className="text-sm font-black uppercase tracking-widest opacity-30">No Image Available</p>
              </div>
            )}
            <div className="p-6 bg-white border-t border-gray-100">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Observation</h4>
              <p className="text-gray-900 font-medium leading-relaxed">{remarks || "No additional remarks provided."}</p>
            </div>
          </div>
        ) : (
          <div className="p-8">
            <h3 className="text-xl font-black text-gray-900 font-outfit uppercase tracking-tight mb-6">Voice Remark</h3>
            {url ? (
              <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 mb-6">
                <audio src={url} controls className="w-full" autoPlay />
              </div>
            ) : (
              <div className="py-10 text-center opacity-30">
                <Volume2 className="h-10 w-10 mx-auto mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">No voice recording</p>
              </div>
            )}
            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Remarks</h4>
              <p className="text-gray-900 font-medium leading-relaxed italic">"{remarks || "No written remarks."}"</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Redesigned Household Collection Details View (Timeline History)
const CollectionDetailView = ({
  household,
  onBack
}: {
  household: any;
  onBack: () => void;
}) => {
  const [offset, setOffset] = React.useState(0);
  const [limit] = React.useState(10);
  const [allCollections, setAllCollections] = React.useState<any[]>([]);
  const [mediaPopup, setMediaPopup] = React.useState<{ type: 'photo' | 'voice', url: string | null, remarks?: string | null } | null>(null);

  const { data, isLoading: collectionsLoading } = useQuery<{ data: any[], stats: { avgRating: number, totalCollections: number } }>({
    queryKey: ["/api/waste-collections/household", household.uid, limit, offset],
    queryFn: async () => {
      const response = await fetch(`/api/waste-collections/household/${household.uid}?limit=${limit}&offset=${offset}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch collections");
      return response.json();
    },
    // Keep data fresh but don't reset on every fetch
    staleTime: 60000,
  });

  // Append data when page changes
  React.useEffect(() => {
    if (data?.data) {
      if (offset === 0) {
        setAllCollections(data.data);
      } else {
        setAllCollections(prev => [...prev, ...data.data]);
      }
    }
  }, [data, offset]);

  const hasMore = (allCollections.length < (data?.stats?.totalCollections || 0));

  return (
    <div className="bg-white fixed top-[64px] inset-x-0 bottom-0 z-[100] animate-in slide-in-from-right-full duration-500 ease-out overflow-hidden flex flex-col">
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-100 shrink-0">
        <div className="px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-2xl hover:bg-gray-100 text-gray-600">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black tracking-tight text-gray-900 truncate uppercase font-outfit">{household.headName}</h2>
            <div className="flex items-center gap-1.5 -mt-0.5">
              <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">{household.uid}</span>
              <span className="w-1 h-1 rounded-full bg-gray-200" />
              <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">{household.ward}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/30 scrollbar-hide">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          {/* Real Aggregates Header */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total visits</p>
              <p className="text-2xl font-black text-gray-900 font-outfit">{data?.stats?.totalCollections || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Rating</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-black text-gray-900 font-outfit">
                  {data?.stats?.avgRating ? data.stats.avgRating.toFixed(1) : "0.0"}
                </p>
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 -mt-1" />
              </div>
            </div>
          </div>

          {/* Timeline listing */}
          <div className="space-y-4 pb-20">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Recent Collections</h3>

            {collectionsLoading && allCollections.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center opacity-40">
                <div className="animate-spin h-10 w-10 border-[5px] border-gray-900 border-t-transparent rounded-full mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Loading history</p>
              </div>
            ) : allCollections.length > 0 ? (
              <div className="space-y-3">
                {allCollections.map((collection) => (
                  <div key={collection.id} className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      {/* Left Top: Date & Time */}
                      <div className="flex flex-col">
                        <p className="font-black text-gray-900 text-sm font-outfit uppercase">
                          {new Date(collection.collectionDate).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          {new Date(collection.collectionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </p>
                      </div>

                      {/* Right Top: Rating & Collector */}
                      <div className="flex flex-col items-end">
                        <div className="flex gap-0.5 mb-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={cn("h-3 w-3", s <= (collection.segregationRating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-100")} />
                          ))}
                        </div>
                        <p className="text-[10px] font-bold text-gray-800 uppercase tracking-tight truncate max-w-[120px]">
                          {collection.collectorName || "Staff"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Status */}
                      <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full", collection.status === 'missed' ? "bg-red-500" : "bg-green-500")} />
                        <span className={cn("text-[10px] font-black uppercase tracking-[0.15em] shrink-0",
                          collection.status === 'missed' ? "text-red-500" : "text-green-500"
                        )}>
                          {collection.status === 'missed' ? "Missed" : "Collected"}
                        </span>
                      </div>

                      {/* Action Buttons (Small) */}
                      <div className="flex gap-2">
                        {collection.photoUrl && (
                          <Button
                            onClick={() => setMediaPopup({ type: 'photo', url: collection.photoUrl, remarks: collection.remarks || collection.observations })}
                            variant="secondary"
                            className="h-8 px-3 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border-none text-[9px] font-black uppercase tracking-widest gap-1.5"
                          >
                            <Camera className="h-3 w-3" />
                            Photo
                          </Button>
                        )}
                        {(collection.voiceUrl || collection.remarks || collection.observations) && (
                          <Button
                            onClick={() => setMediaPopup({ type: 'voice', url: collection.voiceUrl || null, remarks: collection.remarks || collection.observations })}
                            variant="secondary"
                            className="h-8 px-3 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 border-none text-[9px] font-black uppercase tracking-widest gap-1.5"
                          >
                            <Volume2 className="h-3 w-3" />
                            Remark
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Load More */}
                {hasMore && (
                  <div className="pt-4 flex justify-center">
                    <Button
                      onClick={() => setOffset(prev => prev + limit)}
                      disabled={collectionsLoading}
                      variant="outline"
                      className="h-10 px-8 rounded-2xl border-2 border-gray-900 text-gray-900 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2"
                    >
                      {collectionsLoading ? <div className="animate-spin h-3 w-3 border-2 border-gray-900 border-t-transparent rounded-full" /> : <ChevronDown className="h-4 w-4" />}
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] p-16 text-center shadow-sm border border-gray-100">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ClipboardList className="h-10 w-10 text-gray-300" />
                </div>
                <h4 className="text-xl font-black text-gray-900 font-outfit mb-1 uppercase tracking-tight">Empty timeline</h4>
                <p className="text-sm text-gray-400 font-medium max-w-[200px] mx-auto leading-relaxed">No visits recorded for this household yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Popup Modal */}
      {mediaPopup && (
        <MediaPopup
          type={mediaPopup.type}
          url={mediaPopup.url}
          remarks={mediaPopup.remarks}
          onClose={() => setMediaPopup(null)}
        />
      )}
    </div>
  );
};

const DateNavBar = ({
  date,
  onChange
}: {
  date: string,
  onChange: (d: string) => void
}) => {
  const isToday = date === new Date().toISOString().split('T')[0];
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const adjustDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    onChange(d.toISOString().split('T')[0]);
  };

  return (
    <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-100">
      <div className="relative">
        <input
          type="date"
          ref={dateInputRef}
          className="absolute opacity-0 pointer-events-none"
          value={date}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-10 px-3 rounded-2xl bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center gap-2"
          onClick={() => dateInputRef.current?.showPicker()}
        >
          <Calendar className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select</span>
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => adjustDate(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center px-2 min-w-[120px]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
            {isToday ? "Today" : new Date(date).toLocaleDateString(undefined, { weekday: 'short' })}
          </span>
          <span className="text-sm font-black text-gray-900 leading-none font-outfit">
            {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => adjustDate(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Simple dialog components
const CreateCollectorDialog = ({ villageId }: { villageId: string }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const collectorMutation = useMutation({
    mutationFn: (data: { name: string; phone: string }) =>
      apiRequest("POST", "/api/collectors", { ...data, villageId }),
    onSuccess: () => {
      toast({ title: t("messages.operationSuccess") });
      queryClient.invalidateQueries({ queryKey: ["/api/collectors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/stats"] });
      setFormData({ name: "", phone: "" });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t("messages.operationFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ title: t("validation.required"), variant: "destructive" });
      return;
    }
    collectorMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("collectors.addCollector")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("collectors.addCollector")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="collector-name">{t("collectors.collectorName")} *</Label>
            <Input
              id="collector-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t("collectors.collectorName")}
              required
            />
          </div>
          <div>
            <Label htmlFor="collector-phone">{t("collectors.phone")} *</Label>
            <Input
              id="collector-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder={t("collectors.phone")}
              required
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              {t("app.cancel")}
            </Button>
            <Button type="submit" disabled={collectorMutation.isPending} className="flex-1">
              {collectorMutation.isPending ? t("app.submitting") : t("collectors.addCollector")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Simplified state management
  const [activeTab, setActiveTab] = useState("reports");
  const [activeMoreScreen, setActiveMoreScreen] = useState<string | null>(null);
  const [householdApproachTab, setHouseholdApproachTab] = useState("details");
  const [qrFirstSubTab, setQrFirstSubTab] = useState("generate-batch");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState("generators");

  // Consolidated filters
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    date: "",
    status: "all",
    collector: "all"
  });

  // REDESIGNED: Collections tab state
  const [collectionsDate, setCollectionsDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectionsSearch, setCollectionsSearch] = useState("");
  const deferredCollectionsSearch = useDeferredValue(collectionsSearch);
  const [isCollectionsSearching, setIsCollectionsSearching] = useState(false);
  const [householdsLimit, setHouseholdsLimit] = useState(25);
  const [selectedAttentionHousehold, setSelectedAttentionHousehold] = useState<any>(null);

  // Excel upload state
  const [showWardForm, setShowWardForm] = useState(false);
  const [newWard, setNewWard] = useState("");

  // Field Worker and Batch QR state
  const [collectorsSubTab, setCollectorsSubTab] = useState("collectors");
  const [batchQuantity, setBatchQuantity] = useState(10);
  const [showCreateFieldWorkerDialog, setShowCreateFieldWorkerDialog] = useState(false);
  const [newFieldWorkerName, setNewFieldWorkerName] = useState("");
  const [newFieldWorkerPhone, setNewFieldWorkerPhone] = useState("");
  const [householdSearch, setHouseholdSearch] = useState("");

  // Fetch ALL households at once (no pagination) for accurate totals across all tabs
  // Used by Field Staff and Management tabs
  const { data: households = [] } = useQuery<Household[]>({
    queryKey: ["/api/households", user?.villageId],
    enabled: !!user?.villageId,
  });

  // NEW: Daily Summary query for Collections tab
  const { data: dailySummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["/api/collections/daily-summary", user?.villageId, collectionsDate],
    queryFn: async () => {
      const response = await fetch(`/api/collections/daily-summary?date=${collectionsDate}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch daily summary");
      return response.json();
    },
    enabled: !!user?.villageId && activeTab === "collections",
    staleTime: 30000, // 30 seconds
  });

  // Lazy-loaded historical collections for other tabs (Reports, Management, etc.)
  const { data: allCollections = [] } = useQuery<WasteCollection[]>({
    queryKey: ["/api/waste-collections/village", user?.villageId],
    enabled: !!user?.villageId && activeTab !== "collections",
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Vehicle Management State
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<{ registrationNumber: string; name: string; collectorIds: number[] } | null>(null);
  const [newVehicleReg, setNewVehicleReg] = useState("");
  const [newVehicleName, setNewVehicleName] = useState("");
  const [selectedVehicleCollectors, setSelectedVehicleCollectors] = useState<number[]>([]);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      window.location.href = "/login";
    },
  });

  // Household Details Dialog State
  const [showHouseholdDetails, setShowHouseholdDetails] = useState(false);
  const [viewingHousehold, setViewingHousehold] = useState<Household | null>(null);

  // Collection detail view state
  const [selectedCollectionHousehold, setSelectedCollectionHousehold] = useState<Household | null>(null);

  const handleDownloadSingleQR = async (h: Household) => {
    try {
      const cardElement = document.createElement("div");

      cardElement.style.width = "70mm";
      cardElement.style.height = "99mm";
      cardElement.style.backgroundColor = "white";
      cardElement.style.display = "flex";
      cardElement.style.flexDirection = "column";
      cardElement.style.alignItems = "center";
      cardElement.style.justifyContent = "center";
      cardElement.style.boxSizing = "border-box";
      cardElement.style.padding = "8mm";
      cardElement.style.fontFamily = "sans-serif";
      cardElement.style.textAlign = "center";
      cardElement.style.position = "fixed";
      cardElement.style.left = "-9999px";
      cardElement.style.top = "-9999px";

      cardElement.innerHTML = `
      <!-- Logo (from public folder) -->
      <img 
        src="/logos/png/logo-full-1024x256.png"
        style="width:40mm; margin-bottom:-2mm;"
      />

      <!-- Subheading -->
      <div style="font-size:10pt; color:#555; margin-bottom:4mm;">
        Waste Management System
      </div>

      <!-- QR -->
      <div style="
        width:45mm;
        height:45mm;
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <img 
          src="${h.qrCodeUrl}" 
          style="width:100%; height:100%; object-fit:contain;"
        />
      </div>

      <!-- Info -->
      <div style="font-size:11pt; font-weight:400; margin-bottom:2mm;">
        House UID: GEN-${h.uid}
      </div>

      <div style="font-size:11pt; margin-bottom:3mm;">
        Head: ${h.headName}
      </div>

      <div style="font-size:9pt; color:#555;">
        Login & manage at:
      </div>

      <div style="font-size:12pt; color:#008000;">
        www.greenpathindia.in
      </div>
    `;

      document.body.appendChild(cardElement);

      const canvas = await html2canvas(cardElement, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [70, 99],
      });

      pdf.addImage(imgData, "PNG", 0, 0, 70, 99);
      pdf.save(`QR_Card_${h.uid}.pdf`);

      document.body.removeChild(cardElement);

      toast({ title: "QR Card downloaded successfully" });

    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to download QR",
        variant: "destructive",
      });
    }
  };




  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingHousehold, setDeletingHousehold] = useState<Household | null>(null);

  const deleteHouseholdMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/households/${id}`),
    onSuccess: () => {
      toast({ title: "Household deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      setShowDeleteConfirm(false);
      setShowHouseholdDetails(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete household",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLocateHousehold = (h: Household) => {
    if (h.latitude && h.longitude) {
      window.open(`https://www.google.com/maps?q=${h.latitude},${h.longitude}`, '_blank');
    } else {
      toast({
        title: "Location Unavailable",
        description: "Latitude and Longitude details are not available for this household.",
        variant: "destructive"
      });
    }
  };

  // Data fetching
  const { data: stats } = useQuery<VillageStats>({
    queryKey: ["/api/manager/stats", user?.villageId],
    enabled: !!user?.villageId,
  });

  const { data: villageData } = useQuery({
    queryKey: ["/api/villages", user?.villageId],
    enabled: !!user?.villageId,
    queryFn: async () => {
      const response = await fetch(`/api/villages/${user?.villageId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch village data");
      return response.json();
    },
  });

  const { data: collectors = [] } = useQuery<Collector[]>({
    queryKey: ["/api/collectors", user?.villageId],
    enabled: !!user?.villageId,
  });

  // Fetch ALL households at once (no pagination) for accurate totals
  // (Fetched above to support useMemo)

  // Total households count is the actual length since we fetch all
  const totalHouseholdsCount = households.length;

  const { data: collectorStats = [] } = useQuery<CollectorStats[]>({
    queryKey: ["/api/collectors/stats", user?.villageId],
    enabled: !!user?.villageId,
  });

  // Fetch ALL waste collections at once (no pagination) for accurate aggregates and reports
  // (Fetched above to support useMemo)

  // Total collections count is the actual length since we fetch all
  const totalCollectionsCount = allCollections.length;

  // Paginated issues query with infinite scroll support
  const {
    data: issuesData,
    fetchNextPage: fetchNextIssuesPage,
    hasNextPage: hasNextIssuesPage,
    isFetchingNextPage: isFetchingNextIssuesPage,
  } = useInfiniteQuery<PaginatedResponse<Issue>>({
    queryKey: ["/api/issues/paginated", user?.villageId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(
        `/api/issues/paginated?page=${pageParam}&limit=20`,
        { credentials: "include" }
      );
      return response.json();
    },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!user?.villageId,
  });

  // Flatten issues from all pages
  const allIssues = issuesData?.pages.flatMap((page) => page.data) ?? [];
  const totalIssuesCount = issuesData?.pages[0]?.total ?? 0;

  const { data: feedbacks = [] } = useQuery<any[]>({
    queryKey: ["/api/feedback/village", user?.villageId],
    enabled: !!user?.villageId,
  });

  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["/api/announcements", user?.villageId],
    enabled: !!user?.villageId,
  });

  const { data: wards = [] } = useQuery<string[]>({
    queryKey: ["/api/villages", user?.villageId, "wards"],
    queryFn: () => fetch(`/api/villages/${user?.villageId}/wards`, { credentials: "include" }).then(res => res.json()),
    enabled: !!user?.villageId,
  });

  // Field workers query
  const { data: fieldWorkers = [] } = useQuery<any[]>({
    queryKey: ["/api/fieldworkers", user?.villageId],
    enabled: !!user?.villageId && activeTab === "more" && activeMoreScreen === "fieldworkers",
  });

  // Batch QR codes query - enabled for both Field Workers tab and Households QR-first approach
  const { data: batchQRCodes = [] } = useQuery<any[]>({
    queryKey: ["/api/qr-codes", user?.villageId],
    enabled: !!user?.villageId && activeTab === "more" && (
      activeMoreScreen === "fieldworkers" ||
      activeMoreScreen === "households"
    ),
  });

  // Mutations
  const updateIssueMutation = useMutation({
    mutationFn: async ({ issueId, status, managerReply, proofPhotoFile }: {
      issueId: number;
      status: string;
      managerReply?: string;
      proofPhotoFile?: File | null;
    }) => {
      let managerProofPhotoUrl = null;

      // If status is changing to in_progress or resolved, upload proof photo
      if ((status === 'in_progress' || status === 'resolved') && proofPhotoFile) {
        try {
          const formData = new FormData();
          formData.append('file', proofPhotoFile);

          const uploadResponse = await fetchWithCsrf('/api/upload/manager-proof', {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });

          if (!uploadResponse.ok) {
            throw new Error('Proof photo upload failed');
          }

          const uploadResult = await uploadResponse.json();
          managerProofPhotoUrl = uploadResult.url;
        } catch (uploadError) {
          throw new Error('Failed to upload proof photo. Please try again.');
        }
      }

      return apiRequest("PATCH", `/api/issues/${issueId}`, {
        status,
        managerReply,
        managerProofPhotoUrl
      });
    },
    onSuccess: () => {
      toast({ title: "Issue updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/issues/paginated"] });
      setShowIssueDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update issue",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    },
  });

  // Field worker mutations
  const createFieldWorkerMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const response = await apiRequest("POST", "/api/fieldworkers", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Field Worker Created",
        description: `User ID: ${data.userId}, Password: ${data.userId}`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fieldworkers"] });
      setShowCreateFieldWorkerDialog(false);
      setNewFieldWorkerName("");
      setNewFieldWorkerPhone("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to create field worker", description: error.message, variant: "destructive" });
    },
  });

  const deleteFieldWorkerMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/fieldworkers/${userId}`);
    },
    onSuccess: () => {
      toast({ title: "Field worker deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/fieldworkers"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete field worker", description: error.message, variant: "destructive" });
    },
  });

  // Batch QR generation mutation
  const generateBatchQRMutation = useMutation({
    mutationFn: async (quantity: number) => {
      const response = await apiRequest("POST", "/api/qr-codes/batch", { quantity });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "QR Codes Generated", description: `Batch ${data.batchId} with ${data.qrCodes.length} QR codes created` });
      queryClient.invalidateQueries({ queryKey: ["/api/qr-codes"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to generate QR codes", description: error.message, variant: "destructive" });
    },
  });

  const sendAnnouncementMutation = useMutation({
    mutationFn: async (data: { message: string; targetAudience: string, photoFile: File | null }) => {
      let photoUrl = null;

      // Upload photo first if provided
      if (data.photoFile) {
        try {
          const formData = new FormData();
          formData.append('file', data.photoFile);

          const uploadResponse = await fetchWithCsrf('/api/upload/photo', {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });

          if (!uploadResponse.ok) {
            throw new Error('Photo upload failed');
          }

          const uploadResult = await uploadResponse.json();
          photoUrl = uploadResult.url;
        } catch (uploadError) {
          // Continue without photo if upload fails
        }
      }

      // Create announcement with photo URL
      const response = await apiRequest("POST", "/api/announcements", {
        message: data.message,
        targetAudience: data.targetAudience,
        villageId: user?.villageId || "",
        photoUrl: photoUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Announcement sent successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setAnnouncementMessage("");

    },
    onError: () => {
      toast({ title: "Failed to send announcement", variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiRequest("PUT", "/api/profile", data),
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setShowPasswordDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to change password",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const addWardMutation = useMutation({
    mutationFn: (wardName: string) =>
      apiRequest("POST", `/api/villages/${user?.villageId}/wards`, { ward: wardName }),
    onSuccess: () => {
      toast({ title: "Ward added successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId, "wards"] });
      setNewWard("");
      setShowWardForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add ward",
        variant: "destructive",
      });
    },
  });

  // Vehicle Mutations
  const addVehicleMutation = useMutation({
    mutationFn: (data: { registrationNumber: string; name: string; collectorIds: number[] }) =>
      apiRequest("POST", `/api/villages/${user?.villageId}/vehicles`, data),
    onSuccess: () => {
      toast({ title: "Vehicle added successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
      queryClient.invalidateQueries({ queryKey: ["/api/collectors", user?.villageId] });
      setNewVehicleReg("");
      setNewVehicleName("");
      setSelectedVehicleCollectors([]);
      setShowVehicleForm(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add vehicle", variant: "destructive" });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: (data: { registrationNumber: string; name: string; collectorIds: number[] }) =>
      apiRequest("PATCH", `/api/villages/${user?.villageId}/vehicles/${data.registrationNumber}`, {
        name: data.name,
        collectorIds: data.collectorIds
      }),
    onSuccess: () => {
      toast({ title: "Vehicle updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
      queryClient.invalidateQueries({ queryKey: ["/api/collectors", user?.villageId] });
      setEditingVehicle(null);
      setNewVehicleReg("");
      setNewVehicleName("");
      setSelectedVehicleCollectors([]);
      setShowVehicleForm(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update vehicle", variant: "destructive" });
    },
  });

  const removeVehicleMutation = useMutation({
    mutationFn: (regNumber: string) =>
      apiRequest("DELETE", `/api/villages/${user?.villageId}/vehicles/${regNumber}`),
    onSuccess: () => {
      toast({ title: "Vehicle removed successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
      queryClient.invalidateQueries({ queryKey: ["/api/collectors", user?.villageId] });
    },
  });

  const updateCollectorVehicleMutation = useMutation({
    mutationFn: (data: { collectorId: number; registrationNumber: string | null }) =>
      apiRequest("PATCH", `/api/collectors/${data.collectorId}/vehicle`, { registrationNumber: data.registrationNumber }),
    onSuccess: () => {
      toast({ title: "Collector vehicle updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/collectors", user?.villageId] });
      queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
    },
  });

  // Helper functions
  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: "", date: "", status: "all", collector: "all" });
    setCollectionsSearch("");
  };

  const StatCard = ({ title, value, icon: Icon, description }: any) => (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
        <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
          {title}
        </CardTitle>
        <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0">
        <div className="text-lg sm:text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 leading-tight">
          {description}
        </p>
      </CardContent>
    </Card>
  );

  const CollectorFeedbackModal = ({ collector, allCollections, feedbacks }: {
    collector: Collector;
    allCollections: WasteCollection[];
    feedbacks: any[];
  }) => {
    const [feedbackDateFilter, setFeedbackDateFilter] = useState("");
    const { t } = useTranslation();

    // Get feedbacks for this collector
    const collectorFeedbacks = feedbacks.filter(feedback => feedback.toCollectorId === collector.id);

    // Filter feedbacks by date if selected
    const filteredFeedbacks = collectorFeedbacks.filter(feedback => {
      if (!feedbackDateFilter) return true;
      const feedbackDate = new Date(feedback.createdAt).toDateString();
      const filterDate = new Date(feedbackDateFilter).toDateString();
      return feedbackDate === filterDate;
    });

    // Calculate stats for this collector
    const collectorCollections = allCollections.filter(c => c.collectorId === collector.id);
    const avgRating = filteredFeedbacks.length > 0
      ? (filteredFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / filteredFeedbacks.length).toFixed(1)
      : "0.0";

    return (
      <div className="space-y-6">
        {/* Collector Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">{collector.name}</h3>
                <p className="text-sm text-blue-700">
                  ID: {collector.uid} | {t("collectors.phone")}: {collector.phone}
                </p>
                <div className="mt-2">
                  <Label className="text-xs text-blue-800">Assigned Vehicle</Label>
                  <Select
                    value={(collector as any).assignedVehicle || "none"}
                    onValueChange={(val) => updateCollectorVehicleMutation.mutate({
                      collectorId: collector.id,
                      registrationNumber: val === "none" ? null : val
                    })}
                  >
                    <SelectTrigger className="h-8 bg-white border-blue-200">
                      <SelectValue placeholder="Select Vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Vehicle</SelectItem>
                      {villageData?.vehicles?.map((v: any) => (
                        <SelectItem key={v.registrationNumber} value={v.registrationNumber}>
                          {v.name} ({v.registrationNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-900">
                    {collectorCollections.length}
                  </div>
                  <div className="text-xs text-blue-700">{t("collections.totalCollections")}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-900">
                    {avgRating}
                  </div>
                  <div className="text-xs text-blue-700">{t("app.rating")}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-900">
                    {filteredFeedbacks.length}
                  </div>
                  <div className="text-xs text-blue-700">{t("feedback.title")}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Filter for Feedbacks */}
        <Card>
          <CardHeader>
            <CardTitle>{t("app.filter")} {t("feedback.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <Label htmlFor="feedback-date">{t("filters.startDate")}</Label>
                <Input
                  id="feedback-date"
                  type="date"
                  value={feedbackDateFilter}
                  onChange={(e) => setFeedbackDateFilter(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => setFeedbackDateFilter("")}>
                {t("app.clear")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {feedbackDateFilter
                ? `${t("app.filter")} ${new Date(feedbackDateFilter).toLocaleDateString()}`
                : t("app.all")}
            </p>
          </CardContent>
        </Card>

        {/* Generator Feedbacks List */}
        <Card>
          <CardHeader>
            <CardTitle>{t("feedback.title")} ({filteredFeedbacks.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("feedback.fromHousehold")} {t("feedback.toCollector")} {collector.name}
            </p>
          </CardHeader>
          <CardContent>
            {filteredFeedbacks.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredFeedbacks
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((feedback) => {
                    // Find the household that gave this feedback
                    const household = households.find(h => h.id === feedback.fromHouseholdId);

                    return (
                      <Card key={feedback.id} className="border-l-4 border-l-purple-400">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{household?.headName || t("messages.noData")}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {t("households.houseNumber")}: {household?.houseNumber || "N/A"} | UID: {household?.uid || "N/A"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {new Date(feedback.createdAt).toLocaleDateString()}
                                </Badge>
                              </div>
                            </div>

                            {/* Feedback Rating */}
                            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                              <span className="text-sm font-medium">{t("app.rating")}:</span>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-5 w-5 ${i < (feedback.rating || 0) ? "fill-purple-400 text-purple-400" : "text-gray-300"}`}
                                  />
                                ))}
                                <span className="ml-2 text-lg font-bold text-purple-700">
                                  {feedback.rating || 0}/5
                                </span>
                              </div>
                            </div>

                            {/* Feedback Remarks */}
                            {feedback.remarks && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium block mb-2">{t("feedback.comments")}:</span>
                                <p className="text-sm text-gray-700 italic">"{feedback.remarks}"</p>
                              </div>
                            )}

                            {/* Rating Description */}
                            <div className="p-2 bg-yellow-50 rounded text-center">
                              <span className="text-sm font-medium">
                                {feedback.rating === 1 && `😞 ${t("collections.veryPoor")}`}
                                {feedback.rating === 2 && `😐 ${t("collections.poor")}`}
                                {feedback.rating === 3 && `😊 ${t("collections.average")}`}
                                {feedback.rating === 4 && `😄 ${t("collections.good")}`}
                                {feedback.rating === 5 && `🤩 ${t("collections.excellent")}`}
                                {!feedback.rating && t("messages.noData")}
                              </span>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t text-xs text-muted-foreground">
                              <span>{t("feedback.title")} ID: {feedback.id}</span>
                              <span>{new Date(feedback.createdAt).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {feedbackDateFilter ? t("messages.noData") : t("feedback.title")}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("feedback.fromHousehold")} {t("feedback.toCollector")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>

      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Top App Bar – Premium Native */}
        <div className="bg-white border-b border-gray-100 px-4 py-2 sticky top-0 z-10"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between h-11">
            {/* Left: Logo + village + screen title */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon-only logo: small screens */}
              <img
                src="/logos/logo.svg"
                alt="GreenPath"
                className="h-9 w-9 flex-shrink-0 md:hidden"
              />
              {/* Full logo: big screens (md+) */}
              <img
                src="/logos/logo-full.svg"
                alt="GreenPath"
                className="hidden md:block h-8 w-auto flex-shrink-0"
              />
              <div className="flex flex-col justify-center min-w-0">
                <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest leading-none truncate">
                  {villageData?.name || "GreenPath"}
                </span>
                <span className="text-lg font-bold text-gray-900 leading-tight truncate">
                  {activeMoreScreen === "household-details" ? "Household Details"
                    : activeMoreScreen === "generate-qr" ? "Generate QR Batches"
                      : activeMoreScreen === "download-qr" ? "Download QR Batches"
                        : activeMoreScreen === "collectors" ? "Collectors"
                          : activeMoreScreen === "fieldworkers" ? "Field Workers"
                            : activeMoreScreen === "announcements" ? "Announcements"
                              : activeMoreScreen === "daily-waste-logs" ? "Daily Waste Logs"
                                : activeMoreScreen === "compost-logs" ? "Compost Logs"
                                  : activeMoreScreen === "sales-logs" ? "Sales Logs"
                                    : activeMoreScreen === "vehicles" ? "Vehicle Management"
                                      : activeMoreScreen === "wards" ? "Wards Management"
                                        : activeMoreScreen === "overall-reports" ? "Overall Reports"
                                          : activeMoreScreen === "change-password" ? "Change Password"
                                            : activeMoreScreen === "language" ? "Language"
                                              : activeTab === "reports" ? "Daily Reports"
                                                : activeTab === "collections" ? "Collections"
                                                  : activeTab === "issues" ? "Issues"
                                                    : activeTab === "more" ? "More"
                                                      : "Dashboard"}
                </span>
              </div>
            </div>

            {/* Right: Bell + Avatar */}
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              <button
                onClick={() => { setActiveTab("more"); setActiveMoreScreen("announcements"); }}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors active:scale-90"
                aria-label="Announcements"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {announcements.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => { setActiveTab("more"); setActiveMoreScreen(null); }}
                className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold transition-all active:scale-90 flex-shrink-0"
                aria-label="Profile"
              >
                {(user?.name || "M").charAt(0).toUpperCase()}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Mobile Bottom Navigation – 4 Tabs */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex">
              {[
                { id: "reports", icon: BarChart3, label: "Reports" },
                { id: "collections", icon: Package, label: "Collections" },
                { id: "issues", icon: AlertCircle, label: "Issues" },
                { id: "more", icon: LayoutDashboard, label: "More" },
              ].map(({ id, icon: Icon, label }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => { setActiveTab(id); setActiveMoreScreen(null); }}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all duration-150 active:scale-90 relative",
                      isActive ? "text-green-600" : "text-gray-400"
                    )}
                  >
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-600 rounded-full" />
                    )}
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                    <span className={cn("text-[10px] font-semibold", isActive ? "text-green-600" : "text-gray-400")}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Sidebar Navigation */}
          <div className="hidden md:block w-56 bg-white border-r sticky top-[64px] h-[calc(100vh-64px)] overflow-y-auto">
            <div className="p-3">
              <nav className="space-y-1">
                {[
                  { id: "reports", icon: BarChart3, label: "Reports & Analytics" },
                  { id: "collections", icon: Package, label: t("navigation.collections") },
                  { id: "issues", icon: AlertCircle, label: t("navigation.issues") },
                  { id: "more", icon: LayoutDashboard, label: "More" },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => { setActiveTab(id); setActiveMoreScreen(null); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-sm font-medium",
                      activeTab === id
                        ? "bg-green-50 text-green-700"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {label}
                  </button>
                ))}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mb-2">More Screens</p>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mb-1">Households</p>
                  {[
                    { id: "household-details", icon: Home, label: "Household Details" },
                    { id: "generate-qr", icon: QrCode, label: "Generate QR Batches" },
                    { id: "download-qr", icon: Download, label: "Download QR Batches" },
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => { setActiveTab("more"); setActiveMoreScreen(id); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-sm font-medium",
                        activeMoreScreen === id ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50",
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {label}
                    </button>
                  ))}
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mt-3 mb-1">Field Staff</p>
                  {[
                    { id: "collectors", icon: Users, label: "Collectors" },
                    { id: "fieldworkers", icon: Users, label: "Field Workers" },
                    { id: "announcements", icon: Bell, label: "Announcements" },
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => { setActiveTab("more"); setActiveMoreScreen(id); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-sm font-medium",
                        activeMoreScreen === id ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50",
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {label}
                    </button>
                  ))}
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mt-3 mb-1">Material Logs</p>
                  {[
                    { id: "daily-waste-logs", icon: ClipboardList, label: "Daily Waste Logs" },
                    { id: "compost-logs", icon: Package, label: "Compost Logs" },
                    { id: "sales-logs", icon: BarChart3, label: "Sales Logs" },
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => { setActiveTab("more"); setActiveMoreScreen(id); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-sm font-medium",
                        activeMoreScreen === id ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50",
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {label}
                    </button>
                  ))}
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mt-3 mb-1">Management</p>
                  {[
                    { id: "vehicles", icon: Package, label: "Vehicles" },
                    { id: "wards", icon: MapPin, label: "Wards" },
                    { id: "overall-reports", icon: TrendingUp, label: "Overall Reports" },
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => { setActiveTab("more"); setActiveMoreScreen(id); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-sm font-medium",
                        activeMoreScreen === id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50",
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-2 sm:p-6 overflow-auto pb-24 md:pb-6">

            {/* Collectors Tab */}

            {/* Households Tab */}

            {/* Collections Tab */}
            {activeTab === "collections" && (
              <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 relative">
                {selectedCollectionHousehold ? (
                  <CollectionDetailView
                    household={selectedCollectionHousehold}
                    onBack={() => setSelectedCollectionHousehold(null)}
                  />
                ) : isCollectionsSearching ? (
                  /* Focused Search View */
                  <div className="flex flex-col h-full bg-white z-20">
                    <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={() => setIsCollectionsSearching(false)}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div className="relative flex-1">
                        <Input
                          autoFocus
                          className="w-full h-11 bg-gray-50 border-none rounded-2xl pl-10 pr-4 focus-visible:ring-1 focus-visible:ring-gray-200 transition-all text-sm font-medium"
                          placeholder="Search name, house # or UID..."
                          value={collectionsSearch}
                          onChange={(e) => setCollectionsSearch(e.target.value)}
                        />
                        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                      </div>
                      {collectionsSearch && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-full bg-gray-50 text-gray-400"
                          onClick={() => setCollectionsSearch("")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-hide p-1">
                      {dailySummary?.households
                        .filter((h: any) => {
                          if (!deferredCollectionsSearch) return true;
                          const s = deferredCollectionsSearch.toLowerCase();
                          return h.headName.toLowerCase().includes(s) ||
                            h.houseNumber.toLowerCase().includes(s) ||
                            h.uid.toLowerCase().includes(s);
                        })
                        .map((household: any) => (
                          <HouseholdStatusRow
                            key={household.id}
                            household={household}
                            onSelect={(h) => setSelectedCollectionHousehold(h)}
                          />
                        ))
                      }

                      {dailySummary?.households?.length === 0 && (
                        <div className="py-20 text-center px-10">
                          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-loose">
                            No matching members found.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <DateNavBar
                      date={collectionsDate}
                      onChange={(d) => {
                        setCollectionsDate(d);
                        setHouseholdsLimit(25); // Reset scroll on date change
                      }}
                    />

                    {isSummaryLoading && householdsLimit === 25 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
                        <div className="animate-spin h-10 w-10 border-[5px] border-gray-900 border-t-transparent rounded-full"></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Synchronizing Data</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto scrollbar-hide">
                        {/* Story-style Needs Attention Strip */}
                        <NeedsAttentionStrip
                          items={dailySummary?.needsAttention || []}
                          onSelect={(h) => setSelectedAttentionHousehold(h)}
                        />

                        {/* Main Household List */}
                        <div className="bg-white">
                          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Village Members</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 px-3 rounded-xl bg-gray-50 text-gray-400 hover:text-green-600 transition-colors flex items-center gap-2"
                              onClick={() => setIsCollectionsSearching(true)}
                            >
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Search</span>
                              <Search className="h-4 w-4" />
                            </Button>
                          </div>

                          {(dailySummary?.households || [])
                            .slice(0, householdsLimit)
                            .map((household: any) => (
                              <HouseholdStatusRow
                                key={household.id}
                                household={household}
                                onSelect={(h) => setSelectedCollectionHousehold(h)}
                              />
                            ))
                          }

                          {/* Pagination / Load More */}
                          {(dailySummary?.households?.length || 0) > householdsLimit && (
                            <div className="p-6 text-center">
                              <Button
                                variant="ghost"
                                className="w-full h-14 rounded-[2rem] bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-100 active:scale-[0.98] transition-all"
                                onClick={() => setHouseholdsLimit(prev => prev + 25)}
                              >
                                View More Members
                                <ChevronRight className="h-4 w-4 ml-2" />
                              </Button>
                            </div>
                          )}

                          {dailySummary?.households?.length === 0 && (
                            <div className="py-20 text-center px-10">
                              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="h-8 w-8 text-gray-200" />
                              </div>
                              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-loose">
                                No members found for this village or date.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Floating Detail Sheet for Attention */}
                    <AttentionDetailSheet
                      household={selectedAttentionHousehold}
                      onClose={() => setSelectedAttentionHousehold(null)}
                    />
                  </>
                )}
              </div>
            )}




            {activeTab === "more" && (
              <div className="space-y-2">
                {activeMoreScreen ? (
                  // Sub-screen back button
                  <button
                    onClick={() => setActiveMoreScreen(null)}
                    className="flex items-center gap-2 text-green-700 font-semibold py-2 mb-2 active:scale-95 transition-transform"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    <span>Back</span>
                  </button>
                ) : null}

                {/* More Screen: flat menu */}
                {!activeMoreScreen && (
                  <div className="space-y-1">
                    {/* Profile header */}
                    <div className="flex items-center gap-3 p-4 mb-2 bg-white rounded-2xl ring-1 ring-black/5 shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                        {(user?.name || "M").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{user?.name || "Manager"}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.userId}</p>
                        <Badge variant="secondary" className="text-xs mt-0.5">{user?.role}</Badge>
                      </div>
                    </div>

                    {/* Daily Ops group */}
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-2 pb-1">Households</p>
                    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
                      {[
                        { id: "household-details", icon: Home, label: "Household Details", description: "View & manage registered households" },
                        { id: "generate-qr", icon: QrCode, label: "Generate New QR Batches", description: "Create QR code batches for households" },
                        { id: "download-qr", icon: Download, label: "Download QR Batches", description: "Download existing QR code batches" },
                      ].map(({ id, icon: Icon, label, description }, idx, arr) => (
                        <button
                          key={id}
                          onClick={() => setActiveMoreScreen(id)}
                          className={cn(
                            "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors active:bg-gray-50 active:scale-[0.99]",
                            idx < arr.length - 1 ? "border-b border-gray-100" : ""
                          )}
                        >
                          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{label}</p>
                            <p className="text-xs text-gray-400 truncate">{description}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>

                    {/* Field Staff group */}
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-4 pb-1">Field Staff</p>
                    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
                      {[
                        { id: "collectors", icon: Users, label: "Collectors", description: "View & manage collectors" },
                        { id: "fieldworkers", icon: Users, label: "Field Workers", description: "Manage field staff" },
                        { id: "announcements", icon: Bell, label: "Announcements", description: "Send & view announcements" },
                      ].map(({ id, icon: Icon, label, description }, idx, arr) => (
                        <button
                          key={id}
                          onClick={() => setActiveMoreScreen(id)}
                          className={cn(
                            "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors active:bg-gray-50 active:scale-[0.99]",
                            idx < arr.length - 1 ? "border-b border-gray-100" : ""
                          )}
                        >
                          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{label}</p>
                            <p className="text-xs text-gray-400 truncate">{description}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>

                    {/* Material Logs group */}
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-4 pb-1">Material Logs</p>
                    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
                      {[
                        { id: "daily-waste-logs", icon: ClipboardList, label: "Daily Waste Logs", description: "Log & view daily waste records" },
                        { id: "compost-logs", icon: Package, label: "Compost Logs", description: "Track compost production" },
                        { id: "sales-logs", icon: BarChart3, label: "Sales Logs", description: "Record material sales" },
                      ].map(({ id, icon: Icon, label, description }, idx, arr) => (
                        <button
                          key={id}
                          onClick={() => setActiveMoreScreen(id)}
                          className={cn(
                            "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors active:bg-gray-50 active:scale-[0.99]",
                            idx < arr.length - 1 ? "border-b border-gray-100" : ""
                          )}
                        >
                          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-4 w-4 text-orange-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{label}</p>
                            <p className="text-xs text-gray-400 truncate">{description}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>

                    {/* Analytics group */}
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-4 pb-1">Analytics</p>
                    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
                      <button
                        onClick={() => setActiveMoreScreen("overall-reports")}
                        className="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors active:bg-gray-50 active:scale-[0.99]"
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">Overall Reports</p>
                          <p className="text-xs text-gray-400 truncate">Village-wide analytics & trends</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      </button>
                    </div>

                    {/* Settings/Management group */}
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-4 pb-1">Management</p>
                    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
                      {[
                        { id: "vehicles", icon: Package, label: "Vehicle Management", description: "Manage collection vehicles" },
                        { id: "wards", icon: MapPin, label: "Wards Management", description: "Configure village wards" },
                      ].map(({ id, icon: Icon, label, description }, idx, arr) => (
                        <button
                          key={id}
                          onClick={() => setActiveMoreScreen(id)}
                          className={cn(
                            "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors active:bg-gray-50 active:scale-[0.99]",
                            idx < arr.length - 1 ? "border-b border-gray-100" : ""
                          )}
                        >
                          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{label}</p>
                            <p className="text-xs text-gray-400 truncate">{description}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>

                    {/* Analytics group */}
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-4 pb-1">Account</p>
                    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
                      {[
                        { id: "change-password", icon: Settings, label: "Change Password" },
                        { id: "language", icon: Bell, label: "Language" },
                      ].map(({ id, icon: Icon, label }, idx, arr) => (
                        <button
                          key={id}
                          onClick={() => setActiveMoreScreen(id)}
                          className={cn(
                            "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors active:bg-gray-50",
                            idx < arr.length - 1 ? "border-b border-gray-100" : ""
                          )}
                        >
                          <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-4 w-4 text-gray-500" />
                          </div>
                          <p className="flex-1 font-semibold text-gray-900 text-sm">{label}</p>
                          <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        </button>
                      ))}
                      <button
                        onClick={() => logoutMutation.mutate()}
                        className="w-full flex items-center gap-4 px-4 py-3 text-left border-t border-gray-100 transition-colors active:bg-red-50"
                      >
                        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                          <LogOut className="h-4 w-4 text-red-500" />
                        </div>
                        <p className="flex-1 font-semibold text-red-600 text-sm">Logout</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Households sub-screen */}
                {activeMoreScreen === "household-details" && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Household Details</CardTitle>
                        <CardDescription>Listing of all registered households</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <Input
                            placeholder="Search by head name, UID, house number, or mobile..."
                            value={householdSearch}
                            onChange={(e) => setHouseholdSearch(e.target.value)}
                          />
                          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                            {households
                              .filter(h => {
                                const search = householdSearch.toLowerCase();
                                return (
                                  h.headName.toLowerCase().includes(search) ||
                                  h.uid.toLowerCase().includes(search) ||
                                  (h.houseNumber && h.houseNumber.toLowerCase().includes(search)) ||
                                  (h.phone && h.phone.toLowerCase().includes(search))
                                );
                              })
                              .map((h) => (
                                <div
                                  key={h.id}
                                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                  onClick={() => { setViewingHousehold(h); setShowHouseholdDetails(true); }}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium">{h.headName}</p>
                                      <p className="text-sm text-muted-foreground">UID: {h.uid}</p>
                                    </div>
                                    <Badge variant="outline">{h.ward || "N/A"}</Badge>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeMoreScreen === "generate-qr" && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader><CardTitle>Generate QR Codes</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-end gap-4">
                          <div className="flex-1">
                            <Label htmlFor="batch-quantity-hh">Number of QR Codes</Label>
                            <Input
                              id="batch-quantity-hh"
                              type="number"
                              min={1}
                              max={100}
                              value={batchQuantity}
                              onChange={(e) => setBatchQuantity(parseInt(e.target.value) || 10)}
                              data-testid="input-batch-quantity-households"
                            />
                          </div>
                          <Button
                            onClick={() => generateBatchQRMutation.mutate(batchQuantity)}
                            disabled={generateBatchQRMutation.isPending || batchQuantity < 1}
                            data-testid="button-generate-batch-households"
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            {generateBatchQRMutation.isPending ? "Generating..." : "Generate Batch"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeMoreScreen === "download-qr" && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader><CardTitle>QR Code Batches</CardTitle></CardHeader>
                      <CardContent>
                        {batchQRCodes.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">No QR codes generated yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(
                              batchQRCodes.reduce((acc: any, qr: any) => {
                                if (!acc[qr.batchId]) acc[qr.batchId] = { total: 0, mapped: 0, notMapped: 0 };
                                acc[qr.batchId].total++;
                                if (qr.status === 'mapped') acc[qr.batchId].mapped++;
                                else acc[qr.batchId].notMapped++;
                                return acc;
                              }, {})
                            ).map(([batchId, stats]: [string, any]) => (
                              <div key={batchId} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`row-batch-households-${batchId}`}>
                                <div>
                                  <p className="font-medium">{batchId}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Total: {stats.total} | Mapped: {stats.mapped} | Unmapped: {stats.notMapped}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/qr-codes/batch/${batchId}/pdf`, '_blank')}
                                  data-testid={`button-download-batch-households-${batchId}`}
                                >
                                  <Download className="h-4 w-4 mr-2" /> Download PDF
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}



                {/* Collectors sub-screen */}
                {activeMoreScreen === "collectors" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="flex-1 w-full">
                        <Input
                          id="analytics-date-col"
                          type="date"
                          value={filters.date}
                          onChange={(e) => updateFilter("date", e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="w-full sm:w-auto">
                        <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">{t("app.clear")}</Button>
                      </div>
                      <CreateCollectorDialog villageId={user?.villageId || ""} />
                    </div>

                    <div className="space-y-4">
                      {collectors.map((collector) => {
                        const filteredCollections = allCollections.filter(c => {
                          const collectionMatches = c.collectorId === collector.id;
                          if (!filters.date) return collectionMatches;
                          const collectionDate = new Date(c.collectionDate).toDateString();
                          const filterDate = new Date(filters.date).toDateString();
                          return collectionMatches && collectionDate === filterDate;
                        });
                        const totalCollections = filteredCollections.length;
                        const averageRating = filteredCollections.length > 0
                          ? (filteredCollections.reduce((sum, c) => sum + (c.segregationRating || 0), 0) / filteredCollections.length).toFixed(1)
                          : "0.0";

                        return (
                          <Dialog key={collector.id}>
                            <DialogTrigger asChild>
                              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex-1">
                                      <h3 className="font-semibold break-words">{collector.name}</h3>
                                      <p className="text-sm text-muted-foreground break-words">
                                        ID: {collector.uid} | Phone: {collector.phone}
                                      </p>
                                      {(collector as any).assignedVehicle && (
                                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                          <Package className="h-3 w-3" /> Vehicle: {(collector as any).assignedVehicle}
                                        </p>
                                      )}
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center mt-3">
                                        <div>
                                          <div className="text-lg font-bold">{totalCollections}</div>
                                          <div className="text-xs text-muted-foreground">Collections</div>
                                        </div>
                                        <div>
                                          <div className="text-lg font-bold">{averageRating}</div>
                                          <div className="text-xs text-muted-foreground">Avg Rating</div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="sm:self-start">
                                      <Badge className="text-xs whitespace-nowrap">Click to view feedbacks</Badge>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </DialogTrigger>
                            <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Collector Feedbacks - {collector.name}</DialogTitle>
                              </DialogHeader>
                              <CollectorFeedbackModal
                                collector={collector}
                                allCollections={allCollections}
                                feedbacks={feedbacks}
                              />
                            </DialogContent>
                          </Dialog>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Field Workers sub-screen */}
                {activeMoreScreen === "fieldworkers" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Field Workers</h3>
                      <Dialog open={showCreateFieldWorkerDialog} onOpenChange={setShowCreateFieldWorkerDialog}>
                        <DialogTrigger asChild>
                          <Button data-testid="button-add-fieldworker">
                            <Plus className="h-4 w-4 mr-2" /> Add Field Worker
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Create Field Worker</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="fw-name">Name *</Label>
                              <Input
                                id="fw-name"
                                value={newFieldWorkerName}
                                onChange={(e) => setNewFieldWorkerName(e.target.value)}
                                placeholder="Enter field worker name"
                                data-testid="input-fieldworker-name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="fw-phone">Phone</Label>
                              <Input
                                id="fw-phone"
                                value={newFieldWorkerPhone}
                                onChange={(e) => setNewFieldWorkerPhone(e.target.value)}
                                placeholder="Enter phone number"
                                data-testid="input-fieldworker-phone"
                              />
                            </div>
                            <Button
                              onClick={() => createFieldWorkerMutation.mutate({ name: newFieldWorkerName, phone: newFieldWorkerPhone })}
                              disabled={!newFieldWorkerName.trim() || createFieldWorkerMutation.isPending}
                              className="w-full"
                              data-testid="button-submit-fieldworker"
                            >
                              {createFieldWorkerMutation.isPending ? "Creating..." : "Create Field Worker"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Card>
                      <CardHeader>
                        <CardTitle>Field Workers ({fieldWorkers.length})</CardTitle>
                        <CardDescription>Manage field workers who can map QR codes to households</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {fieldWorkers.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">No field workers yet. Create one to get started.</p>
                        ) : (
                          <div className="space-y-2">
                            {fieldWorkers.map((fw: any) => (
                              <div key={fw.userId} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`row-fieldworker-${fw.userId}`}>
                                <div>
                                  <p className="font-medium">{fw.name}</p>
                                  <p className="text-sm text-muted-foreground">ID: {fw.userId} | Phone: {fw.phone || 'N/A'}</p>
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteFieldWorkerMutation.mutate(fw.userId)}
                                  disabled={deleteFieldWorkerMutation.isPending}
                                  data-testid={`button-delete-fieldworker-${fw.userId}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Announcements sub-screen */}
                {activeMoreScreen === "announcements" && (
                  <div className="space-y-4">
                    {/* (existing announcements JSX will render here) */}
                    {activeTab === "more" && activeMoreScreen === "announcements" && (
                      <div className="space-y-4">
                        <Card>
                          <CardHeader><CardTitle>Send Announcement</CardTitle></CardHeader>
                          <CardContent className="space-y-4">
                            <Textarea
                              placeholder="Type your announcement..."
                              className="min-h-[100px]"
                              id="announcement-message"
                            />
                            <Select defaultValue="all">
                              <SelectTrigger>
                                <SelectValue placeholder="Select audience" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="collectors">Collectors</SelectItem>
                                <SelectItem value="households">Households</SelectItem>
                              </SelectContent>
                            </Select>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader><CardTitle>Recent Announcements</CardTitle></CardHeader>
                          <CardContent>
                            {announcements.length > 0 ? (
                              <div className="space-y-3">
                                {announcements.map((announcement: any) => (
                                  <div key={announcement.id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                    <p className="text-sm text-gray-800 font-medium">{announcement.message}</p>
                                    <div className="flex justify-between items-center mt-2">
                                      <Badge variant="secondary" className="text-xs">{announcement.targetAudience}</Badge>
                                      <p className="text-xs text-gray-500">{new Date(announcement.createdAt).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-center text-muted-foreground py-4">{t("announcements.checkLater")}</p>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                )}

                {/* Daily Waste Logs sub-screen */}
                {activeMoreScreen === "daily-waste-logs" && (
                  <div className="space-y-4">
                    <MaterialLog defaultTab="daily" />
                  </div>
                )}

                {/* Compost Logs sub-screen */}
                {activeMoreScreen === "compost-logs" && (
                  <div className="space-y-4">
                    <MaterialLog defaultTab="compost" />
                  </div>
                )}

                {/* Sales Logs sub-screen */}
                {activeMoreScreen === "sales-logs" && (
                  <div className="space-y-4">
                    <MaterialLog defaultTab="sales" />
                  </div>
                )}

                {/* Overall Reports sub-screen */}
                {activeMoreScreen === "overall-reports" && (
                  <div className="space-y-6">
                    {/* Top KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Collection Efficiency
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-blue-900">
                            {(() => {
                              const targetDate = filters.date || new Date().toISOString().split('T')[0];
                              const todayCollections = allCollections.filter(c =>
                                new Date(c.collectionDate).toDateString() === new Date(targetDate).toDateString()
                              ).length;
                              return stats && stats.totalHouseholds > 0
                                ? Math.round((todayCollections / stats.totalHouseholds) * 100)
                                : 0;
                            })()}%
                          </div>
                          <p className="text-xs text-blue-700 mt-1">
                            {(() => {
                              const targetDate = filters.date || new Date().toISOString().split('T')[0];
                              const todayCollections = allCollections.filter(c =>
                                new Date(c.collectionDate).toDateString() === new Date(targetDate).toDateString()
                              ).length;
                              return `${todayCollections} of ${stats?.totalHouseholds || 0} households`;
                            })()}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Average Segregation Rating
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-yellow-900">
                            {(() => {
                              let filteredCollections = allCollections;
                              if (filters.date) {
                                filteredCollections = allCollections.filter(c =>
                                  new Date(c.collectionDate).toDateString() === new Date(filters.date).toDateString()
                                );
                              }
                              return filteredCollections.length > 0
                                ? (filteredCollections.reduce((sum, c) => sum + (c.segregationRating || 0), 0) / filteredCollections.length).toFixed(1)
                                : "0.0";
                            })()}
                          </div>
                          <p className="text-xs text-yellow-700 mt-1">
                            Out of 5.0 stars ({(() => {
                              let filteredCollections = allCollections;
                              if (filters.date) {
                                filteredCollections = allCollections.filter(c =>
                                  new Date(c.collectionDate).toDateString() === new Date(filters.date).toDateString()
                                );
                              }
                              return filteredCollections.length;
                            })()} collections)
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* 6 Analytics Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* 1. Daily Collection Trend (Last 7 Days) */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            Daily Collection Trend (Last 7 Days)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Array.from({ length: 7 }).map((_, i) => {
                              const date = new Date();
                              date.setDate(date.getDate() - (6 - i));
                              const dateStr = date.toDateString();
                              const collectionsForDay = allCollections.filter(c =>
                                new Date(c.collectionDate).toDateString() === dateStr
                              ).length;
                              const percentage = (stats?.totalHouseholds ?? 0) > 0
                                ? (collectionsForDay / (stats?.totalHouseholds ?? 1)) * 100
                                : 0;

                              return (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="w-16 text-xs text-muted-foreground">
                                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                                    <div
                                      className="bg-blue-500 h-4 rounded-full transition-all"
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                      {collectionsForDay}
                                    </span>
                                  </div>
                                  <div className="w-12 text-xs text-right">
                                    {Math.round(percentage)}%
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* 2. Segregation Rating Trends (Last 7 Days) */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            Segregation Rating Trends (Last 7 Days)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Array.from({ length: 7 }).map((_, i) => {
                              const date = new Date();
                              date.setDate(date.getDate() - (6 - i));
                              const dateStr = date.toDateString();
                              const dayCollections = allCollections.filter(c =>
                                new Date(c.collectionDate).toDateString() === dateStr
                              );
                              const avgRating = dayCollections.length > 0
                                ? dayCollections.reduce((sum, c) => sum + (c.segregationRating || 0), 0) / dayCollections.length
                                : 0;

                              return (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="w-16 text-xs text-muted-foreground">
                                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                                    <div
                                      className={`h-4 rounded-full transition-all ${avgRating >= 4 ? 'bg-green-500' :
                                        avgRating >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                      style={{ width: `${(avgRating / 5) * 100}%` }}
                                    />
                                  </div>
                                  <div className="w-12 text-xs text-right font-medium">
                                    {avgRating.toFixed(1)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* 3. Overall Segregation Rate Pie Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-purple-600" />
                            Overall Segregation Rate
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-center">
                            {(() => {
                              let filteredCollections = allCollections;
                              if (filters.date) {
                                filteredCollections = allCollections.filter(c =>
                                  new Date(c.collectionDate).toDateString() === new Date(filters.date).toDateString()
                                );
                              }

                              const excellent = filteredCollections.filter(c => (c.segregationRating || 0) >= 4).length;
                              const good = filteredCollections.filter(c => (c.segregationRating || 0) >= 3 && (c.segregationRating || 0) < 4).length;
                              const poor = filteredCollections.filter(c => (c.segregationRating || 0) < 3).length;
                              const total = filteredCollections.length;

                              return (
                                <div className="w-48 h-48 relative">
                                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="20" />
                                    {total > 0 && (
                                      <>
                                        <circle
                                          cx="50" cy="50" r="40" fill="none"
                                          stroke="#ef4444" strokeWidth="20"
                                          strokeDasharray={`${(poor / total) * 251.3} 251.3`}
                                          strokeDashoffset="0"
                                        />
                                        <circle
                                          cx="50" cy="50" r="40" fill="none"
                                          stroke="#eab308" strokeWidth="20"
                                          strokeDasharray={`${(good / total) * 251.3} 251.3`}
                                          strokeDashoffset={`-${(poor / total) * 251.3}`}
                                        />
                                        <circle
                                          cx="50" cy="50" r="40" fill="none"
                                          stroke="#22c55e" strokeWidth="20"
                                          strokeDasharray={`${(excellent / total) * 251.3} 251.3`}
                                          strokeDashoffset={`-${((poor + good) / total) * 251.3}`}
                                        />
                                      </>
                                    )}
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold">
                                        {total > 0 ? Math.round((excellent / total) * 100) : 0}%
                                      </div>
                                      <div className="text-xs text-muted-foreground">Excellent</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-4">
                            <div className="text-center">
                              <div className="w-4 h-4 bg-green-500 rounded mx-auto mb-1"></div>
                              <div className="text-xs">Excellent (4-5★)</div>
                            </div>
                            <div className="text-center">
                              <div className="w-4 h-4 bg-yellow-500 rounded mx-auto mb-1"></div>
                              <div className="text-xs">Good (3-4★)</div>
                            </div>
                            <div className="text-center">
                              <div className="w-4 h-4 bg-red-500 rounded mx-auto mb-1"></div>
                              <div className="text-xs">Poor (0-3★)</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 4. Last 7 Days Segregation Rates Graph */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-indigo-600" />
                            7-Day Segregation Performance
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {Array.from({ length: 7 }).map((_, i) => {
                              const date = new Date();
                              date.setDate(date.getDate() - (6 - i));
                              const dateStr = date.toDateString();
                              const dayCollections = allCollections.filter(c =>
                                new Date(c.collectionDate).toDateString() === dateStr
                              );

                              const excellent = dayCollections.filter(c => (c.segregationRating || 0) >= 4).length;
                              const good = dayCollections.filter(c => (c.segregationRating || 0) >= 3 && (c.segregationRating || 0) < 4).length;
                              const poor = dayCollections.filter(c => (c.segregationRating || 0) < 3).length;
                              const total = dayCollections.length;

                              return (
                                <div key={i} className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    <span>{total} collections</span>
                                  </div>
                                  <div className="flex h-6 bg-gray-200 rounded overflow-hidden">
                                    {total > 0 ? (
                                      <>
                                        <div
                                          className="bg-green-500"
                                          style={{ width: `${(excellent / total) * 100}%` }}
                                          title={`Excellent: ${excellent}`}
                                        />
                                        <div
                                          className="bg-yellow-500"
                                          style={{ width: `${(good / total) * 100}%` }}
                                          title={`Good: ${good}`}
                                        />
                                        <div
                                          className="bg-red-500"
                                          style={{ width: `${(poor / total) * 100}%` }}
                                          title={`Poor: ${poor}`}
                                        />
                                      </>
                                    ) : (
                                      <div className="w-full bg-gray-300" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* 5. Home Composting Pie Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-green-600" />
                            Home Composting Rate
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-center">
                            {(() => {
                              let filteredCollections = allCollections;
                              if (filters.date) {
                                filteredCollections = allCollections.filter(c =>
                                  new Date(c.collectionDate).toDateString() === new Date(filters.date).toDateString()
                                );
                              }

                              // Assuming we have wetWasteComposting field in collections
                              const composting = filteredCollections.filter(c => c.wasteSegregated === true).length;
                              const notComposting = filteredCollections.length - composting;
                              const total = filteredCollections.length;

                              return (
                                <div className="w-40 h-40 relative">
                                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                    <circle cx="50" cy="50" r="35" fill="none" stroke="#f3f4f6" strokeWidth="25" />
                                    {total > 0 && (
                                      <>
                                        <circle
                                          cx="50" cy="50" r="35" fill="none"
                                          stroke="#22c55e" strokeWidth="25"
                                          strokeDasharray={`${(composting / total) * 219.9} 219.9`}
                                          strokeDashoffset="0"
                                        />
                                      </>
                                    )}
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                      <div className="text-xl font-bold text-green-600">
                                        {total > 0 ? Math.round((composting / total) * 100) : 0}%
                                      </div>
                                      <div className="text-xs text-muted-foreground">Segregated</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-4">
                            <div className="text-center">
                              <div className="w-4 h-4 bg-green-500 rounded mx-auto mb-1"></div>
                              <div className="text-xs">Segregated</div>
                            </div>
                            <div className="text-center">
                              <div className="w-4 h-4 bg-gray-300 rounded mx-auto mb-1"></div>
                              <div className="text-xs">Not Segregated</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 6. Collection Performance Metrics */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                            Collection Performance Metrics
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {collectors.map(collector => {
                              let collectorCollections = allCollections.filter(c => c.collectorId === collector.id);
                              if (filters.date) {
                                collectorCollections = collectorCollections.filter(c =>
                                  new Date(c.collectionDate).toDateString() === new Date(filters.date).toDateString()
                                );
                              }

                              const avgRating = collectorCollections.length > 0
                                ? (collectorCollections.reduce((sum, c) => sum + (c.segregationRating || 0), 0) / collectorCollections.length)
                                : 0;

                              return (
                                <div key={collector.id} className="flex items-center gap-3">
                                  <div className="w-24 text-xs font-medium truncate">
                                    {collector.name}
                                  </div>
                                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                                    <div
                                      className={`h-3 rounded-full transition-all ${avgRating >= 4 ? 'bg-green-500' :
                                        avgRating >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                      style={{ width: `${(avgRating / 5) * 100}%` }}
                                    />
                                  </div>
                                  <div className="w-16 text-xs text-right">
                                    {avgRating.toFixed(1)} ({collectorCollections.length})
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}


                {/* Vehicles sub-screen */}
                {activeMoreScreen === "vehicles" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 font-bold text-xl">
                      <Package className="w-5 h-5 text-purple-600" />
                      Vehicle Management
                    </div>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <Button size="sm" className="flex items-center gap-2" onClick={() => {
                            setEditingVehicle(null);
                            setNewVehicleReg("");
                            setNewVehicleName("");
                            setSelectedVehicleCollectors([]);
                            setShowVehicleForm(true);
                          }}>
                            <Plus className="w-4 h-4" />
                            Add Vehicle
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {showVehicleForm && (
                          <Card className="mb-4">
                            <CardHeader>
                              <CardTitle>{editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label>Registration Number *</Label>
                                <Input
                                  value={newVehicleReg}
                                  onChange={(e) => setNewVehicleReg(e.target.value)}
                                  disabled={!!editingVehicle}
                                  placeholder="e.g. MH-12-AB-1234"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Vehicle Name *</Label>
                                <Input
                                  value={newVehicleName}
                                  onChange={(e) => setNewVehicleName(e.target.value)}
                                  placeholder="e.g. Garbage Truck 1"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Assign Collectors</Label>
                                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                                  {collectors
                                    .filter(c => {
                                      const vehicleWithCollector = (villageData?.vehicles || []).find((v: any) =>
                                        (v.collectorIds || []).includes(c.id)
                                      );
                                      return !vehicleWithCollector || (editingVehicle && vehicleWithCollector.registrationNumber === editingVehicle.registrationNumber);
                                    })
                                    .map(c => (
                                      <div key={c.id} className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          id={`mv-collector-${c.id}`}
                                          checked={selectedVehicleCollectors.includes(c.id)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedVehicleCollectors([...selectedVehicleCollectors, c.id]);
                                            } else {
                                              setSelectedVehicleCollectors(selectedVehicleCollectors.filter(id => id !== c.id));
                                            }
                                          }}
                                        />
                                        <label htmlFor={`mv-collector-${c.id}`} className="text-sm cursor-pointer">{c.name} ({c.uid})</label>
                                      </div>
                                    ))}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  className="flex-1"
                                  disabled={!newVehicleReg || !newVehicleName || addVehicleMutation.isPending || updateVehicleMutation.isPending}
                                  onClick={() => {
                                    if (editingVehicle) {
                                      updateVehicleMutation.mutate({ registrationNumber: newVehicleReg, name: newVehicleName, collectorIds: selectedVehicleCollectors });
                                    } else {
                                      addVehicleMutation.mutate({ registrationNumber: newVehicleReg, name: newVehicleName, collectorIds: selectedVehicleCollectors });
                                    }
                                  }}
                                >
                                  {(addVehicleMutation.isPending || updateVehicleMutation.isPending) ? "Saving..." : (editingVehicle ? "Update Vehicle" : "Add Vehicle")}
                                </Button>
                                <Button variant="outline" className="flex-1" onClick={() => setShowVehicleForm(false)}>Cancel</Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        {(villageData?.vehicles || []).length > 0 ? (
                          <div className="space-y-2">
                            {(villageData?.vehicles || []).map((vehicle: any) => (
                              <div key={vehicle.registrationNumber} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <p className="font-medium">{vehicle.name}</p>
                                  <p className="text-xs text-muted-foreground">{vehicle.registrationNumber}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => {
                                    setEditingVehicle(vehicle);
                                    setNewVehicleReg(vehicle.registrationNumber);
                                    setNewVehicleName(vehicle.name);
                                    setSelectedVehicleCollectors(vehicle.collectorIds || []);
                                    setShowVehicleForm(true);
                                  }}>Edit</Button>
                                  <Button size="sm" variant="destructive" onClick={() => removeVehicleMutation.mutate(vehicle.registrationNumber)}>Remove</Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No vehicles added yet.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Wards sub-screen */}
                {activeMoreScreen === "wards" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 font-bold text-xl">
                      <MapPin className="w-5 h-5 text-purple-600" />
                      Wards Management
                    </div>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <Button size="sm" className="flex items-center gap-2" onClick={() => setShowWardForm(true)}>
                            <Plus className="w-4 h-4" />
                            Add Ward
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {wards.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {wards.map((ward: string, index: number) => (
                              <Badge key={index} variant="outline" className="justify-center py-2 px-3">
                                {ward}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            No wards configured yet. Add your first ward to organize households.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Change Password sub-screen */}
                {activeMoreScreen === "change-password" && (
                  <Card>
                    <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
                    <CardContent>
                      <Button onClick={() => setShowPasswordDialog(true)} className="w-full">
                        Open Change Password Form
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Language sub-screen */}
                {activeMoreScreen === "language" && (
                  <Card>
                    <CardHeader><CardTitle>Language</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <h2 className="font-bold">Select Language:</h2>
                        <LanguageSwitcher />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-4 p-4">
                {/* Management Tabs */}
                <Tabs defaultValue="settings" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="settings">Profile</TabsTrigger>
                    <TabsTrigger value="wards">Wards</TabsTrigger>
                    <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                  </TabsList>

                  <TabsContent value="settings" className="space-y-4 mt-4">
                    {/* User Info */}
                    <Card>
                      <CardHeader className="pb-3 items-center">

                        <CardTitle className="flex items-center text-2xl font-bold">
                          <User className="w-6 h-6 mr-2" strokeWidth={3} />
                          User Info
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-center">
                        <div>
                          <Label className="text-xs text-gray-600">Manager Name</Label>
                          <p className="font-medium">{user?.name}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">{t("auth.userId")}</Label>
                          <p className="font-medium">{user?.userId}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Village</Label>
                          <p className="font-medium">{user?.villageId}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 pr-3">{t("roles.manager")}</Label>
                          <Badge variant="secondary">{user?.role}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-lg">
                          <User className="w-5 h-5 mr-2" />
                          {t("navigation.settings")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-center items-center space-x-3">
                          <h2 className="font-bold">Select Language: </h2>
                          <LanguageSwitcher />
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPasswordDialog(true)}
                          className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm w-full"
                        >
                          <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{t("app.changePassword")}</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => logoutMutation.mutate()}
                          className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm w-full"
                        >
                          <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{t("auth.logout")}</span>
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="wards" className="space-y-4 mt-4">
                    <div className="flex items-center justify-center gap-2 font-bold text-xl">
                      Ward Management
                    </div>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <Button
                            size="sm"
                            onClick={() => setShowWardForm(true)}
                            className="flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Ward
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {wards.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {wards.map((ward: string, index: number) => (
                              <Badge key={index} variant="outline" className="justify-center py-2 px-3">
                                {ward}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            No wards configured yet. Add your first ward to organize households.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="vehicles" className="space-y-4 mt-4">
                    <div className="flex items-center justify-center gap-2 font-bold text-xl">
                      <Package className="w-5 h-5 text-blue-600" />
                      Vehicle Management
                    </div>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <Button size="sm" className="flex items-center gap-2" onClick={() => {
                            setEditingVehicle(null);
                            setNewVehicleReg("");
                            setNewVehicleName("");
                            setSelectedVehicleCollectors([]);
                            setShowVehicleForm(true);
                          }}>
                            <Plus className="w-4 h-4" />
                            Add Vehicle
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {showVehicleForm && (
                          <Card className="mb-4">
                            <CardHeader>
                              <CardTitle>{editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label>Registration Number *</Label>
                                <Input
                                  value={newVehicleReg}
                                  onChange={(e) => setNewVehicleReg(e.target.value)}
                                  disabled={!!editingVehicle}
                                  placeholder="e.g. MH-12-AB-1234"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Vehicle Name *</Label>
                                <Input
                                  value={newVehicleName}
                                  onChange={(e) => setNewVehicleName(e.target.value)}
                                  placeholder="e.g. Garbage Truck 1"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Assign Collectors</Label>
                                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                                  {collectors
                                    .filter(c => {
                                      const vehicleWithCollector = (villageData?.vehicles || []).find((v: any) =>
                                        (v.collectorIds || []).includes(c.id)
                                      );
                                      return !vehicleWithCollector || (editingVehicle && vehicleWithCollector.registrationNumber === editingVehicle.registrationNumber);
                                    })
                                    .map(c => (
                                      <div key={c.id} className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          id={`v-collector-${c.id}`}
                                          checked={selectedVehicleCollectors.includes(c.id)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedVehicleCollectors([...selectedVehicleCollectors, c.id]);
                                            } else {
                                              setSelectedVehicleCollectors(selectedVehicleCollectors.filter(id => id !== c.id));
                                            }
                                          }}
                                        />
                                        <label htmlFor={`v-collector-${c.id}`} className="text-sm cursor-pointer">{c.name} ({c.uid})</label>
                                      </div>
                                    ))}
                                </div>
                                {collectors.filter(c => {
                                  const vehicleWithCollector = (villageData?.vehicles || []).find((v: any) =>
                                    (v.collectorIds || []).includes(c.id)
                                  );
                                  return !vehicleWithCollector || (editingVehicle && vehicleWithCollector.registrationNumber === editingVehicle.registrationNumber);
                                }).length === 0 && (
                                    <p className="text-sm text-muted-foreground italic">No unassigned collectors available</p>
                                  )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  className="flex-1"
                                  disabled={!newVehicleReg || !newVehicleName || addVehicleMutation.isPending || updateVehicleMutation.isPending}
                                  onClick={() => {
                                    if (editingVehicle) {
                                      updateVehicleMutation.mutate({
                                        registrationNumber: newVehicleReg,
                                        name: newVehicleName,
                                        collectorIds: selectedVehicleCollectors
                                      });
                                    } else {
                                      addVehicleMutation.mutate({
                                        registrationNumber: newVehicleReg,
                                        name: newVehicleName,
                                        collectorIds: selectedVehicleCollectors
                                      });
                                    }
                                  }}
                                >
                                  {(addVehicleMutation.isPending || updateVehicleMutation.isPending) ? "Saving..." : (editingVehicle ? "Update Vehicle" : "Add Vehicle")}
                                </Button>
                                <Button variant="outline" className="flex-1" onClick={() => setShowVehicleForm(false)}>
                                  Cancel
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {villageData?.vehicles && villageData.vehicles.length > 0 ? (
                          <div className="space-y-3">
                            {villageData.vehicles.map((v: any) => (
                              <div key={v.registrationNumber} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <p className="font-medium">{v.name}</p>
                                  <p className="text-sm text-muted-foreground">{v.registrationNumber}</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {v.collectorIds?.map((cid: number) => {
                                      const collector = collectors.find(c => c.id === cid);
                                      return collector ? (
                                        <Badge key={cid} variant="secondary" className="text-[10px] px-1 py-0">
                                          {collector.name}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingVehicle(v);
                                      setNewVehicleReg(v.registrationNumber);
                                      setNewVehicleName(v.name);
                                      setSelectedVehicleCollectors(v.collectorIds || []);
                                      setShowVehicleForm(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => {
                                      if (confirm("Are you sure you want to remove this vehicle?")) {
                                        removeVehicleMutation.mutate(v.registrationNumber);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No vehicles added yet.</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )
            }


            {/* Issues Tab */}
            {
              activeTab === "issues" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <StatCard
                      title="Total Issues"
                      value={allIssues.length}
                      icon={AlertTriangle}
                      description="All time"
                    />
                    <StatCard
                      title="Open Issues"
                      value={allIssues.filter(i => i.status === "open").length}
                      icon={AlertCircle}
                      description="Need attention"
                    />
                    <StatCard
                      title="In Progress"
                      value={allIssues.filter(i => i.status === "in_progress").length}
                      icon={Package}
                      description="Being worked on"
                    />
                    <StatCard
                      title="Resolved"
                      value={allIssues.filter(i => i.status === "resolved").length}
                      icon={CheckCircle}
                      description="Completed"
                    />
                  </div>

                  <Card>
                    <CardHeader>
                      <div className="flex justify-between">
                        <CardTitle>Issue Reports</CardTitle>
                        <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Issues</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const filteredIssues = allIssues.filter(issue => filters.status === "all" || issue.status === filters.status);

                        return (
                          <>
                            <div className="space-y-4">
                              {filteredIssues.map((issue) => (
                                <Card key={issue.id}>
                                  <CardContent className="p-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                      {/* Left: Issue Info */}
                                      <div className="flex-1 w-full">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                          <h4 className="font-semibold break-words">{issue.title}</h4>
                                          <Badge
                                            variant={
                                              issue.status === "open" ? "destructive" :
                                                issue.status === "in_progress" ? "secondary" : "default"
                                            }
                                          >
                                            {issue.status.replace("_", " ").toUpperCase()}
                                          </Badge>
                                          <Badge variant="outline">{issue.category}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2 break-words">
                                          Reported by: {issue.reportedBy} on {new Date(issue.createdAt).toLocaleDateString()}
                                        </p>
                                        <p className="text-sm break-words">{issue.description}</p>

                                        {/* Show reporter's image if available */}
                                        {issue.photoUrl && (
                                          <div className="mt-2">
                                            <p className="text-xs font-medium mb-1">Reported with image:</p>
                                            <img
                                              src={issue.photoUrl}
                                              alt="Issue photo"
                                              className="w-16 h-16 object-cover rounded cursor-pointer"
                                              onClick={() => window.open(issue.photoUrl, "_blank")}
                                            />
                                          </div>
                                        )}

                                        {issue.managerReply && (
                                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                            <p className="text-sm break-words">
                                              <strong>Manager Reply:</strong> {issue.managerReply}
                                            </p>
                                            {/* Show manager's proof photo if available */}
                                            {issue.managerProofPhotoUrl && (
                                              <div className="mt-2">
                                                <p className="text-xs font-medium mb-1">Manager proof:</p>
                                                <img
                                                  src={issue.managerProofPhotoUrl}
                                                  alt="Manager proof photo"
                                                  className="w-16 h-16 object-cover rounded cursor-pointer"
                                                  onClick={() => window.open(issue.managerProofPhotoUrl, "_blank")}
                                                />
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* Right: Action Buttons */}
                                      <div className="flex gap-2 mt-3 sm:mt-0 self-end sm:self-auto">
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            setSelectedIssue(issue);
                                            setShowIssueDialog(true);
                                          }}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>

                            {/* Load More Controls for Issues - Server-side pagination */}
                            <div className="mt-4 flex justify-center gap-2">
                              {hasNextIssuesPage && (
                                <Button
                                  variant="outline"
                                  onClick={() => fetchNextIssuesPage()}
                                  disabled={isFetchingNextIssuesPage}
                                  data-testid="button-load-more-issues"
                                >
                                  {isFetchingNextIssuesPage ? "Loading..." : `Load More (${totalIssuesCount - allIssues.length} remaining)`}
                                </Button>
                              )}
                            </div>

                            {/* Summary */}
                            <p className="text-sm text-muted-foreground text-center mt-2">
                              Showing {filteredIssues.length} of {totalIssuesCount} issues
                            </p>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>
              )
            }

            {/* Reports Tab */}
            {
              activeTab === "reports" && (
                <div className="space-y-6">
                  {/* Date Filter for Daily Reports */}
                  <Card>
                    <div className="flex items-center justify-between p-2">
                      <CardTitle>Date: </CardTitle>
                      <div className="flex">
                        <Input
                          id="daily-date"
                          type="date"
                          value={filters.date || new Date().toISOString().split("T")[0]}
                          onChange={(e) => updateFilter("date", e.target.value)}
                        />
                      </div>
                    </div>
                  </Card>



                  {/* Daily KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {(() => {
                      const targetDate = filters.date || new Date().toISOString().split('T')[0];
                      const dayCollections = allCollections.filter(c =>
                        new Date(c.collectionDate).toDateString() === new Date(targetDate).toDateString()
                      );
                      const avgSegregationRating = dayCollections.length > 0
                        ? (dayCollections.reduce((sum, c) => sum + (c.segregationRating || 0), 0) / dayCollections.length)
                        : 0;
                      const totalHouses = stats?.totalHouseholds || 0;
                      const collected = dayCollections.length;
                      const remaining = totalHouses - collected;

                      return (
                        <>
                          <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-yellow-800">Avg Segregation Rating</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-yellow-900">
                                {avgSegregationRating.toFixed(1)}
                              </div>
                              <p className="text-xs text-yellow-700">Out of 5.0 stars</p>
                            </CardContent>
                          </Card>

                          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-blue-800">Total Houses</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-blue-900">
                                {totalHouses}
                              </div>
                              <p className="text-xs text-blue-700">Registered households</p>
                            </CardContent>
                          </Card>

                          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-green-800">Collected</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-green-900">
                                {collected}
                              </div>
                              <p className="text-xs text-green-700">Collections completed</p>
                            </CardContent>
                          </Card>

                          <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-red-800">Remaining</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-red-900">
                                {remaining}
                              </div>
                              <p className="text-xs text-red-700">Yet to collect</p>
                            </CardContent>
                          </Card>
                        </>
                      );
                    })()}
                  </div>

                  {/* 4 Analytics Cards for Daily Reports */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 1. Collection Status Pie Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                          Collection Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center">
                          {(() => {
                            const targetDate = filters.date || new Date().toISOString().split('T')[0];
                            const collected = allCollections.filter(c =>
                              new Date(c.collectionDate).toDateString() === new Date(targetDate).toDateString()
                            ).length;
                            const total = stats?.totalHouseholds || 0;
                            const notCollected = total - collected;

                            return (
                              <div className="w-48 h-48 relative">
                                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="20" />
                                  {total > 0 && (
                                    <>
                                      <circle
                                        cx="50" cy="50" r="40" fill="none"
                                        stroke="#22c55e" strokeWidth="20"
                                        strokeDasharray={`${(collected / total) * 251.3} 251.3`}
                                        strokeDashoffset="0"
                                      />
                                      <circle
                                        cx="50" cy="50" r="40" fill="none"
                                        stroke="#ef4444" strokeWidth="20"
                                        strokeDasharray={`${(notCollected / total) * 251.3} 251.3`}
                                        strokeDashoffset={`-${(collected / total) * 251.3}`}
                                      />
                                    </>
                                  )}
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold">
                                      {total > 0 ? Math.round((collected / total) * 100) : 0}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">Collected</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <div className="text-center">
                            <div className="w-4 h-4 bg-green-500 rounded mx-auto mb-1"></div>
                            <div className="text-xs">Collected</div>
                          </div>
                          <div className="text-center">
                            <div className="w-4 h-4 bg-red-500 rounded mx-auto mb-1"></div>
                            <div className="text-xs">Not Collected</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 2. Star Rating Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                          Segregation Rating
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[5, 4, 3, 2, 1].map(stars => {
                            const targetDate = filters.date || new Date().toISOString().split('T')[0];
                            const dayCollections = allCollections.filter(c =>
                              new Date(c.collectionDate).toDateString() === new Date(targetDate).toDateString()
                            );
                            const starCount = dayCollections.filter(c => (c.segregationRating || 0) === stars).length;
                            const total = dayCollections.length;
                            const percentage = total > 0 ? (starCount / total) * 100 : 0;

                            return (
                              <div key={stars} className="flex items-center gap-3">
                                <div className="flex items-center gap-1 w-16">
                                  <span className="text-sm font-medium">{stars}</span>
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                </div>
                                <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                                  <div
                                    className="bg-yellow-500 h-4 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                    {starCount}
                                  </span>
                                </div>
                                <div className="w-12 text-xs text-right">
                                  {Math.round(percentage)}%
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* 3. Vehicle Collection Performance */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="flex items-center gap-2">
                          Collection Performance
                        </CardTitle>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-green-200">Details</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[100vw] w-full h-[100dvh] md:max-w-4xl md:h-[90vh] md:rounded-xl overflow-hidden p-0 flex flex-col border-none md:border">
                            <DialogHeader className="px-1 py-2 border-b flex flex-row items-center justify-between space-y-0 bg-white sticky top-0 z-10">
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 px-2 md:hidden bg-green-200 ">
                                  <ArrowRight className="h-4 w-4 mr-1 rotate-180" strokeWidth={3} />
                                </Button>
                              </DialogTrigger>
                              <div className="flex items-center gap-2">
                                <DialogTitle className="text-lg font-bold mr-8">Vehicle Session Report {new Date(filters.date || new Date()).toLocaleDateString()}</DialogTitle>
                              </div>

                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto p-2 space-y-3 pb-20 md:pb-6">
                              {(() => {
                                const targetDate = filters.date || new Date().toISOString().split('T')[0];
                                const villageVehicles = villageData?.vehicles || [];

                                return villageVehicles.map((vehicle: any) => {
                                  const vehicleCollections = allCollections
                                    .filter(c =>
                                      vehicle.collectorIds.includes(c.collectorId) &&
                                      new Date(c.collectionDate).toDateString() === new Date(targetDate).toDateString()
                                    )
                                    .sort((a, b) => new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime());

                                  if (vehicleCollections.length === 0) return null;

                                  const sessions: any[] = [];
                                  let currentSession: any[] = [vehicleCollections[0]];

                                  for (let i = 1; i < vehicleCollections.length; i++) {
                                    const prevTime = new Date(vehicleCollections[i - 1].collectionDate).getTime();
                                    const currTime = new Date(vehicleCollections[i].collectionDate).getTime();
                                    const diffMinutes = (currTime - prevTime) / (1000 * 60);

                                    if (diffMinutes > 20) {
                                      sessions.push(currentSession);
                                      currentSession = [vehicleCollections[i]];
                                    } else {
                                      currentSession.push(vehicleCollections[i]);
                                    }
                                  }
                                  sessions.push(currentSession);

                                  let totalWorkMs = 0;
                                  let totalBreakMs = 0;

                                  return (
                                    <div key={vehicle.registrationNumber} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                                      <div className="bg-green-100 px-4 py-1 border-b flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                                          <h3 className="font-bold text-purple-900 text-sm">{vehicle.name}</h3>
                                        </div>
                                        <span className="text-[10px] font-mono bg-purple-200 text-black px-2 py-0.5 rounded-full">{vehicle.registrationNumber}</span>
                                      </div>

                                      <div className="px-3 py-1 space-y-2">
                                        <div className="grid grid-cols-1 gap-2">
                                          {sessions.map((session, sIdx) => {
                                            const start = new Date(session[0].collectionDate);
                                            const end = new Date(session[session.length - 1].collectionDate);
                                            const durationMs = end.getTime() - start.getTime();
                                            totalWorkMs += durationMs;

                                            let breakMs = 0;
                                            if (sIdx > 0) {
                                              const prevSessionEnd = new Date(sessions[sIdx - 1][sessions[sIdx - 1].length - 1].collectionDate);
                                              breakMs = start.getTime() - prevSessionEnd.getTime();
                                              totalBreakMs += breakMs;
                                            }

                                            const dH = Math.floor(durationMs / (1000 * 60 * 60));
                                            const dM = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                                            const bH = Math.floor(breakMs / (1000 * 60 * 60));
                                            const bM = Math.floor((breakMs % (1000 * 60 * 60)) / (1000 * 60));

                                            return (
                                              <div key={sIdx} className="relative pl-2 border-l-2 border-blue-200 py-1">
                                                {sIdx > 0 && (
                                                  <div className="absolute -top-3 left-[-9px] flex items-center gap-1.5 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tighter">Break: {bH}h {bM}m</span>
                                                  </div>
                                                )}
                                                <div className="flex items-center justify-between gap-4">
                                                  <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-[11px] font-black text-blue-600">S{sIdx + 1}</span>
                                                      <span className="text-[11px] font-medium text-gray-700">
                                                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                    <div className="text-center">
                                                      <div className="text-[10px] text-muted-foreground leading-none">Collections</div>
                                                      <div className="text-[11px] font-bold">{session.length}</div>
                                                    </div>
                                                    <div className="text-center">
                                                      <div className="text-[10px] text-muted-foreground leading-none">Work time</div>
                                                      <div className="text-[11px] font-bold text-green-700">{dH}h {dM}m</div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        <div className="pt-1 border-t grid grid-cols-3 bg-gray-50/50 rounded-lg p-1">
                                          <div className="text-center">
                                            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Total collections</div>
                                            <div className="text-sm font-black text-blue-900">{vehicleCollections.length}</div>
                                          </div>
                                          <div className="text-center border-x border-gray-100">
                                            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Total Work</div>
                                            <div className="text-sm font-black text-green-700">
                                              {Math.floor(totalWorkMs / (1000 * 60 * 60))}h {Math.floor((totalWorkMs % (1000 * 60 * 60)) / (1000 * 60))}m
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Total Break</div>
                                            <div className="text-sm font-black text-orange-600">
                                              {Math.floor(totalBreakMs / (1000 * 60 * 60))}h {Math.floor((totalBreakMs % (1000 * 60 * 60)) / (1000 * 60))}m
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {(() => {
                            const targetDate = filters.date || new Date().toISOString().split('T')[0];
                            const villageVehicles = villageData?.vehicles || [];

                            return villageVehicles.map((vehicle: any) => {
                              // Find collections for this vehicle by looking at collectors assigned to it
                              const vehicleCollections = allCollections.filter(c =>
                                vehicle.collectorIds.includes(c.collectorId) &&
                                new Date(c.collectionDate).toDateString() === new Date(targetDate).toDateString()
                              );

                              const collectorNames = collectors
                                .filter(c => vehicle.collectorIds.includes(c.id))
                                .map(c => c.name)
                                .join(", ");

                              const sortedCollections = [...vehicleCollections].sort((a, b) =>
                                new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime()
                              );

                              const startTime = sortedCollections.length > 0
                                ? new Date(sortedCollections[0].collectionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                                : "N/A";
                              const endTime = sortedCollections.length > 0
                                ? new Date(sortedCollections[sortedCollections.length - 1].collectionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                                : "N/A";

                              return (
                                <div key={vehicle.registrationNumber} className="p-1 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-bold">{vehicle.name}</h4>
                                    <Badge variant="outline">{vehicleCollections.length} collections</Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground mb-2">
                                    <span className="font-bold">Collectors:</span> {collectorNames || "None assigned"}
                                  </div>
                                  <div className="font-bold text-md flex justify-between text-[10px] border-t pt-1">
                                    <span>Start: {startTime}</span>
                                    <span>End: {endTime}</span>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </CardContent>
                    </Card>

                    {/* 4. Collection Timeline */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                          <BarChart3 className="h-5 w-5 text-indigo-600" />
                          Collection Timeline
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(() => {
                            const targetDate = filters.date || new Date().toISOString().split("T")[0];
                            const dateObj = new Date(targetDate);

                            const counts = Array.from({ length: 14 }, (_, i) => {
                              const hour = i + 5;
                              return allCollections.filter(c => {
                                const d = new Date(c.collectionDate);
                                return d.toDateString() === dateObj.toDateString() && d.getHours() === hour;
                              }).length;
                            });

                            const maxCollections = Math.max(...counts, 0);

                            return counts.map((count, i) => {
                              const hour = i + 5;
                              const percentage = maxCollections > 0 ? (count / maxCollections) * 100 : 0;

                              return (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-8 text-xs text-muted-foreground">
                                    {hour}:00
                                  </div>
                                  <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
                                    <div
                                      className="bg-indigo-500 h-3 rounded-full transition-all"
                                      style={{ width: `${percentage}%` }}
                                    />
                                    {count > 0 && (
                                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                        {count}
                                      </span>
                                    )}
                                  </div>
                                  <div className="w-8 text-xs text-right">
                                    {count}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </CardContent>

                    </Card>
                  </div>
                </div>
              )
            }

          </div >
        </div >
      </div >

      {/* Password Change Dialog */}
      < Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog} >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("app.changePassword")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const currentPassword = formData.get("currentPassword") as string;
              const newPassword = formData.get("newPassword") as string;
              const confirmPassword = formData.get("confirmPassword") as string;

              if (newPassword !== confirmPassword) {
                toast({ title: t("validation.passwordsDoNotMatch"), variant: "destructive" });
                return;
              }
              changePasswordMutation.mutate({ currentPassword, newPassword });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="currentPassword">{t("profile.currentPassword")}</Label>
              <Input id="currentPassword" name="currentPassword" type="password" required />
            </div>
            <div>
              <Label htmlFor="newPassword">{t("profile.newPassword")}</Label>
              <Input id="newPassword" name="newPassword" type="password" required />
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t("profile.confirmPassword")}</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required />
            </div>
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? t("app.changing") : t("app.changePassword")}
            </Button>
          </form>
        </DialogContent>
      </Dialog >

      {/* Issue Management Dialog */}
      < Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog} >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Issue</DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const status = formData.get("status") as string;
                const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
                const proofPhotoFile = fileInput?.files?.[0] || null;

                // Check if proof photo is required
                if ((status === 'in_progress' || status === 'resolved') && !proofPhotoFile) {
                  toast({
                    title: "Proof photo required",
                    description: "Please upload a proof photo when changing status to 'In Progress' or 'Resolved'",
                    variant: "destructive"
                  });
                  return;
                }

                updateIssueMutation.mutate({
                  issueId: selectedIssue.id,
                  status,
                  managerReply: formData.get("managerReply") as string,
                  proofPhotoFile,
                });
              }}
              className="space-y-4"
            >
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">{selectedIssue.title}</h4>
                <p className="text-sm">{selectedIssue.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  By: {selectedIssue.reportedBy} | {selectedIssue.category}
                </p>
                {/* Show original reporter's image if available */}
                {selectedIssue.photoUrl && (
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1">Reported with image:</p>
                    <img
                      src={selectedIssue.photoUrl}
                      alt="Issue photo"
                      className="w-20 h-20 object-cover rounded cursor-pointer"
                      onClick={() => window.open(selectedIssue.photoUrl, "_blank")}
                    />
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={selectedIssue.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="managerReply">Reply</Label>
                <Textarea
                  name="managerReply"
                  defaultValue={selectedIssue.managerReply || ""}
                  placeholder="Add your response..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="proofPhoto">
                  Proof Photo *
                  <span className="text-xs text-muted-foreground ml-1">
                    (Required when changing status to In Progress or Resolved)
                  </span>
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  name="proofPhoto"
                  className="cursor-pointer"
                />
              </div>
              {/* Show existing manager proof photo if available */}
              {selectedIssue.managerProofPhotoUrl && (
                <div>
                  <Label className="text-xs font-medium">Current Proof Photo:</Label>
                  <img
                    src={selectedIssue.managerProofPhotoUrl}
                    alt="Manager proof photo"
                    className="w-20 h-20 object-cover rounded cursor-pointer mt-1"
                    onClick={() => window.open(selectedIssue.managerProofPhotoUrl, "_blank")}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowIssueDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateIssueMutation.isPending} className="flex-1">
                  {updateIssueMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog >

      {/* Ward Form Dialog */}
      < Dialog open={showWardForm} onOpenChange={setShowWardForm} >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Ward/Sub-Village</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newWard.trim()) {
                toast({ title: "Ward name is required", variant: "destructive" });
                return;
              }
              if (wards.includes(newWard.trim())) {
                toast({ title: "Ward already exists", variant: "destructive" });
                return;
              }
              addWardMutation.mutate(newWard.trim());
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="ward-name">Ward/Sub-Village Name *</Label>
              <Input
                id="ward-name"
                value={newWard}
                onChange={(e) => setNewWard(e.target.value)}
                placeholder="Enter ward or sub-village name"
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowWardForm(false);
                  setNewWard("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={addWardMutation.isPending}
              >
                {addWardMutation.isPending ? "Adding..." : "Add Ward"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog >
      {/* Household Details Fullscreen Popup */}
      < Dialog open={showHouseholdDetails} onOpenChange={setShowHouseholdDetails} >
        <DialogContent className="max-w-[100vw] w-screen h-screen m-0 p-0 rounded-none overflow-y-auto border-none">
          <div className="flex flex-col h-full bg-background">
            <header className="flex items-center gap-10 ml-1 p-2 border-b sticky top-0 bg-background z-10">
              <Button variant="ghost" size="sm" className="h-8 px-2 !bg-green-200" onClick={() => setShowHouseholdDetails(false)}>
                <ArrowLeft className="h-4 w-4 mr-1" strokeWidth={3} />
              </Button>
              <h1 className="ml-3 text-xl font-bold">Household Details</h1>
            </header>

            <main className="flex-1 p-3 space-y-3 max-w-4xl mx-auto w-full">
              {viewingHousehold && (
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <section>
                      <Label className="text-muted-foreground">Household UID</Label>
                      <p className="text-md font-mono font-bold">{`GEN-${viewingHousehold.uid}`}</p>
                    </section>

                    <section>
                      <Label className="text-muted-foreground">Head Name</Label>
                      <p className="text-md font-semibold">{viewingHousehold.headName}</p>
                    </section>

                    <section>
                      <Label className="text-muted-foreground">Phone Number</Label>
                      <div className="flex items-center gap-10">
                        <p className="text-md">{viewingHousehold.phone || "Not provided"}</p>
                        {viewingHousehold.phone && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-auto px-2 text-white bg-primary border-primary/20 hover:bg-primary/10"
                            onClick={() => window.open(`tel:${viewingHousehold.phone}`)}
                          >
                            <Phone className="h-4 w-4" />
                            Call
                          </Button>
                        )}
                      </div>
                    </section>

                    <section>
                      <Label className="text-muted-foreground">House Number</Label>
                      <p className="text-md">{viewingHousehold.houseNumber || "N/A"}</p>
                    </section>

                    <div className="flex flex-col gap-2 pt-3">
                      <Button
                        size="lg"
                        className="w-full"
                        onClick={() => handleLocateHousehold(viewingHousehold)}
                      >
                        <MapPin />
                        Locate On Map
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-2xl space-y-3">
                    {viewingHousehold.qrCodeUrl ? (
                      <>
                        <div className="bg-white rounded-xl shadow-sm">
                          <img
                            src={viewingHousehold.qrCodeUrl}
                            alt="QR Code"
                            className="w-48 h-48 object-contain"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full bg-blue-300"
                          onClick={() => handleDownloadSingleQR(viewingHousehold)}
                        >
                          <Download className="mr-2 h-5 w-5" />
                          Download QR Code Card
                        </Button>
                        <Button
                          variant="destructive"
                          size="lg"
                          className="w-full"
                          onClick={() => {
                            setDeletingHousehold(viewingHousehold);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-5 w-5" />
                          Delete Household
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-20" />
                        <p className="text-muted-foreground">QR code not generated yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </main>
          </div>
        </DialogContent>
      </Dialog >
      {/* Delete Household Confirmation */}
      < Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this household? This action cannot be undone.
              {(() => {
                if (!deletingHousehold) return null;
                const hhCollections = allCollections.filter(c => c.householdId === deletingHousehold.id);
                if (hhCollections.length > 0) {
                  const lastCollection = hhCollections.reduce((latest, current) =>
                    new Date(current.collectionDate) > new Date(latest.collectionDate) ? current : latest
                  );
                  return (
                    <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                      <p className="font-semibold">Collection History:</p>
                      <ul className="list-disc list-inside text-sm mt-1">
                        <li>Total collections: {hhCollections.length}</li>
                        <li>Last collection: {new Date(lastCollection.collectionDate).toLocaleDateString()}</li>
                      </ul>
                      <p className="text-xs mt-2 italic text-destructive/80">
                        * All collection records for this household will also be permanently deleted.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingHousehold && deleteHouseholdMutation.mutate(deletingHousehold.id)}
              disabled={deleteHouseholdMutation.isPending}
            >
              {deleteHouseholdMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog >
    </>
  );
}