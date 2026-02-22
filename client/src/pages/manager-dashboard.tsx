import { useState, useMemo, useDeferredValue } from "react";
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { apiRequest, fetchWithCsrf } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LabelList,
  ResponsiveContainer as RechartsContainer
} from "recharts";
import { format, subDays, addDays, isSameDay, formatDistanceToNow } from "date-fns";

import {
  Card,
  CardContent,
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
  AlertCircle,
  TrendingUp,
  Award,
  Package,
  AlertTriangle,
  Camera,
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
  Play,
  Pause,
  Volume2,
  ChevronDown,
  Car,
  Shield
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
        "group flex items-center gap-4 p-2 transition-all hover:bg-gray-50/80 active:scale-[0.98] cursor-pointer",
        "border-b border-gray-100 last:border-0"
      )}
      onClick={() => onSelect(household)}
    >
      {/* Dynamic Status Indicator */}
      <div className="relative group-active:scale-90 transition-transform">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm font-outfit",
          household.collected ? "bg-green-400 shadow-green-100" : "bg-red-400 shadow-red-100"
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
          <h3 className="font-bold text-sm text-gray-900 truncate font-outfit">{household.headName}</h3>
          {household.collected ? (
            <span className="text-[10px] font-semibold text-green-500 uppercase tracking-wider">Collected</span>
          ) : (
            <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">Pending</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
            <MapPin className="h-2 w-2" />
            {household.houseNumber} • {household.ward}
          </p>
          {household.collected && (
            <Badge variant="outline" className="truncate h-4 px-1.5 text-[9px] border-green-200 text-green-600 bg-green-50/50">
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
    <div className="bg-white py-1 border-b border-gray-100 overflow-hidden">
      <div className="px-4 mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 font-outfit">Needs Attention</h3>
        <Badge variant="secondary" className="bg-red-50 text-red-600 border-red-100 rounded-full text-[10px]">
          {items.length} critical
        </Badge>
      </div>
      <div className="flex px-6 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {items.map((item) => (
          <button
            key={item.householdId}
            onClick={() => onSelect(item)}
            className="flex-shrink-0 w-20 flex flex-col items-center gap-1.5 snap-start creative-bounce"
          >
            <div className="relative rounded-full border-2 border-red-500 animate-in zoom-in-50 duration-500">
              <div className="w-[50px] h-[50px] rounded-full overflow-hidden bg-gray-100 border-2 border-white">
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
    <div className="fixed top-[58px] inset-x-0 bottom-0 z-[110] bg-white flex flex-col animate-in slide-in-from-bottom-full duration-500 ease-out overflow-hidden shadow-2xl">
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
        <div className="py-1 px-4 border-t border-gray-100 flex items-center justify-between">
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
        <div className="mb-2 py-1 px-2 border-t border-gray-100 flex gap-3 pb-safe">
          <Button
            onClick={handleCall}
            className="flex-1 h-10 rounded-[1.25rem] bg-green-500 text-white font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
          >
            <Phone className="h-4 w-4" />
            Call
          </Button>

          <Button
            onClick={handleNavigate}
            variant="outline"
            className="flex-1 h-10 rounded-[1.25rem] bg-blue-500 text-white font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
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
    <div className="flex items-center justify-between bg-white px-4 py-1 border-b border-gray-100">
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

const StickyDateSwitcher = ({
  date,
  onChange
}: {
  date: string,
  onChange: (d: string) => void
}) => {
  const isToday = isSameDay(new Date(date), new Date());
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const adjustDate = (days: number) => {
    const d = addDays(new Date(date), days);
    onChange(format(d, 'yyyy-MM-dd'));
  };

  return (
    <>
      {/* Fixed bar pinned below the nav header */}
      <div className="fixed left-0 md:left-56 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100/50 px-4 sm:py-2" style={{ top: 60 }}>
        <div className="pt-1 max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-gray-100 active:scale-90 transition-all"
              onClick={() => adjustDate(-1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

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
                className="h-10 px-4 rounded-2xl hover:bg-gray-100 active:scale-95 transition-all flex flex-col items-center justify-center min-w-[140px]"
                onClick={() => dateInputRef.current?.showPicker()}
              >
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 leading-none mb-0.5">
                  {isToday ? "TODAY" : format(new Date(date), 'EEEE').toUpperCase()}
                </span>
                <span className="text-sm font-black text-gray-900 leading-none font-outfit uppercase">
                  {format(new Date(date), 'dd MMM yyyy')}
                </span>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-gray-100 active:scale-90 transition-all disabled:opacity-30"
              onClick={() => adjustDate(1)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100"
            onClick={() => dateInputRef.current?.showPicker()}
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Spacer to push content below the fixed bar */}
      <div className="h-10 mb-2" />
    </>
  );
};

const PremiumReportCard = ({ title, children, icon: Icon, className, description }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "bg-white/70 backdrop-blur-md border border-white/20 shadow-sm rounded-xl p-1 lg:p-8 overflow-hidden relative",
      className
    )}
  >
    <div className=" mb-1">
      <div>
        <h4 className="flex justify-center item-center text-[12px] font-black uppercase tracking-[0.25em] text-gray-600 mb-1 p-2">{title}</h4>
        {description && <p className="text-[11px] text-gray-500 font-medium ">{description}</p>}
      </div>
      {Icon && (
        <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
    {children}
  </motion.div>
);

const EfficiencyDonut = ({ current, total }: { current: number; total: number }) => {
  const [showAbsolute, setShowAbsolute] = React.useState(false);
  const currentPercentage = total > 0 ? (current / total) * 100 : 0;
  const remaining = total - current;
  const remainingPercentage = 100 - currentPercentage;

  const data = [
    { name: 'Collected', value: current, color: '#22c55e' },
    { name: 'Missed', value: remaining, color: '#ef4444' },
  ];

  return (
    <PremiumReportCard title="Collection Efficiency">
      <div className="flex flex-col items-center justify-center">
        <div
          className="w-full h-36 relative cursor-pointer"
          onClick={() => setShowAbsolute(!showAbsolute)}
        >
          <RechartsContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-2 rounded-xl shadow-lg border border-gray-100 text-[10px] font-bold uppercase tracking-widest">
                        {payload[0].name}: {payload[0].value}
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </RechartsContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {showAbsolute ? (
              <div className="text-center">
                <div className="text-2xl font-black text-gray-900 leading-none font-outfit">{current}</div>
                <div className="text-[8px] text-gray-400 font-black uppercase">Collected</div>
              </div>
            ) : (
              <span className="text-3xl font-black text-gray-900 leading-none font-outfit">
                {Math.round(currentPercentage)}<span className="text-sm border-gray-400">%</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 w-full">
          <div className="flex justify-center items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-[#22c55e]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-900 leading-none">{current}</span>
              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">Collected</span>
            </div>
          </div>
          <div className="flex justify-center items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-[#ef4444]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-900 leading-none">{remaining}</span>
              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">Missed</span>
            </div>
          </div>
        </div>
      </div>
    </PremiumReportCard>
  );
};

const PulseCard = ({ title, value, unit, history, color, icon: Icon }: { title: string; value: string | number; unit?: string; history: any[]; color: string; icon: any }) => (
  <PremiumReportCard title={title} icon={Icon}>
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <div className="text-3xl font-black text-gray-900 font-outfit uppercase tracking-tighter">
          {value}
          {unit && <span className="text-sm text-gray-300 ml-1">{unit}</span>}
        </div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current</div>
      </div>

      <div className="flex-1 h-16">
        <RechartsContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#gradient-${title})`}
            />
          </AreaChart>
        </RechartsContainer>
      </div>
    </div>
  </PremiumReportCard>
);

const PeakHoursChart = ({ data }: { data: any[] }) => {
  const peakHour = data.reduce((prev, current) => (prev.count > current.count) ? prev : current, data[0]);

  return (
    <PremiumReportCard
      title="Peak Collection Hours"
      icon={Clock}
      description="Hourly collection distribution"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            Peak Window: {peakHour?.hour}
          </Badge>
        </div>
        <div className="w-full h-64">
          <RechartsContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="count" radius={[10, 10, 10, 10]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.hour === peakHour?.hour ? '#6366f1' : '#e0e7ff'}
                  />
                ))}
              </Bar>
            </BarChart>
          </RechartsContainer>
        </div>
      </div>
    </PremiumReportCard>
  );
};

const WardPerformanceTripleChart = ({ data }: { data: any[] }) => {
  return (
    <PremiumReportCard title="Ward-wise Breakdown">
      {/* Mobile: Horizontal stacked bars — one row per ward */}
      <div className="md:hidden space-y-4">
        {data.map((ward, idx) => {
          const collectedPct = ward.total > 0 ? Math.round((ward.collected / ward.total) * 100) : 0;
          const nonCollectedPct = ward.total > 0 ? Math.round((ward.nonCollected / ward.total) * 100) : 0;
          return (
            <div key={idx}>
              {/* Ward name */}
              <div className="text-[10px] font-black text-gray-800 uppercase tracking-wider">{ward.name}</div>
              {/* Stats line */}
              <div className="flex items-center justify-between px-2">
                <span className="text-[9px] font-bold text-gray-400">Total: {ward.total}</span>
                <span className="text-[9px] font-bold text-green-600">Collected: {ward.collected}</span>
                <span className="text-[9px] font-bold text-red-500">Not Collected: {ward.nonCollected}</span>
              </div>
              {/* Stacked bar */}
              <div className="relative w-full h-5 rounded-lg overflow-hidden bg-gray-100 flex">
                {collectedPct > 0 && (
                  <div
                    className="h-full bg-green-500 flex items-center px-1.5 min-w-0"
                    style={{ width: `${collectedPct}%` }}
                  >
                  </div>
                )}
                {nonCollectedPct > 0 && (
                  <div
                    className="h-full bg-red-400 flex items-center justify-end px-1.5 min-w-0"
                    style={{ width: `${nonCollectedPct}%` }}
                  >
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {/* <div className="flex items-center gap-3 mt-1 justify-center">
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-green-500" /><span className="text-[8px] font-bold text-gray-400 uppercase">Collected</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-red-400" /><span className="text-[8px] font-bold text-gray-400 uppercase">Non-Collected</span></div>
        </div> */}
      </div>

      {/* Desktop: Grouped bar chart */}
      <div className="hidden md:block w-full h-80">
        <RechartsContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ fill: '#f9fafb' }}
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingBottom: '20px' }}
            />
            <Bar dataKey="total" fill="#e5e7eb" name="Total" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="total" position="top" fill="#9ca3af" fontSize={9} fontWeight={700} />
            </Bar>
            <Bar dataKey="collected" fill="#22c55e" name="Collected" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="collected" position="top" fill="#22c55e" fontSize={9} fontWeight={700} />
            </Bar>
            <Bar dataKey="nonCollected" fill="#ef4444" name="Non-Collected" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="nonCollected" position="top" fill="#ef4444" fontSize={9} fontWeight={700} />
            </Bar>
          </BarChart>
        </RechartsContainer>
      </div>
    </PremiumReportCard>
  );
};

const WasteMaterialChart = ({ data }: { data: any[] }) => {
  return (
    <PremiumReportCard title="Waste Material Logs">
      <div className="w-full h-72">
        <RechartsContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ fill: '#f9fafb' }}
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="value" radius={[10, 10, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fontWeight: 900, fill: '#374151' }} formatter={(v: any) => `${v}kg`} />
            </Bar>
          </BarChart>
        </RechartsContainer>
      </div>
    </PremiumReportCard>
  );
};

const CollectionPerformanceCard = ({ data, dateLabel }: { data: any[]; dateLabel: string }) => {
  const fmtMs = (ms: number) => {
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m`;
  };

  return (
    <Card className="bg-white/70 backdrop-blur-md border border-white/20 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-tight">
          Collection Performance
        </CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="bg-green-200 font-bold text-xs rounded-xl">Details</Button>
          </DialogTrigger>
          <DialogContent
            className="max-w-[100vw] w-full md:max-w-4xl md:h-[90vh] md:rounded-xl overflow-hidden p-0 flex flex-col border-none md:border"
            style={{ top: 60, left: 0, transform: 'none', height: 'calc(100dvh - 60px)' }}
          >
            <div className="px-3 border-b flex items-center gap-3 bg-green-50 sticky top-0 z-10 min-h-[56px]">
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-white shadow-sm">
                  <ArrowRight className="h-5 w-5 rotate-180" strokeWidth={3} />
                </Button>
              </DialogTrigger>
              <DialogTitle className="text-base font-black uppercase tracking-tight text-gray-900">Session Report · {dateLabel}</DialogTitle>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3 pb-20 md:pb-6">
              {data.map((vehicle) => {
                if (vehicle.count === 0) return null;
                return (
                  <div key={vehicle.registrationNumber} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-green-100 px-4 py-1 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                        <h3 className="font-bold text-purple-900 text-sm">{vehicle.vehicleName}</h3>
                      </div>
                      <span className="text-[10px] font-mono bg-purple-200 text-black px-2 py-0.5 rounded-full">{vehicle.registrationNumber}</span>
                    </div>

                    <div className="px-3 py-1 space-y-2">
                      <div className="grid grid-cols-1 gap-2">
                        {(vehicle.sessions || []).map((session: any) => {
                          const start = new Date(session.startTime);
                          const end = new Date(session.endTime);
                          const dH = Math.floor(session.durationMs / (1000 * 60 * 60));
                          const dM = Math.floor((session.durationMs % (1000 * 60 * 60)) / (1000 * 60));
                          const bH = Math.floor(session.breakBeforeMs / (1000 * 60 * 60));
                          const bM = Math.floor((session.breakBeforeMs % (1000 * 60 * 60)) / (1000 * 60));

                          return (
                            <div key={session.index} className="relative pl-2 border-l-2 border-blue-200 py-1">
                              {session.breakBeforeMs > 0 && (
                                <div className="absolute -top-3 left-[-9px] flex items-center gap-1.5 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                                  <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tighter">Break: {bH}h {bM}m</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black text-blue-600">S{session.index}</span>
                                    <span className="text-[11px] font-medium text-gray-700">
                                      {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-center">
                                    <div className="text-[10px] text-muted-foreground leading-none">Collections</div>
                                    <div className="text-[11px] font-bold">{session.count}</div>
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

                      <div className="flex justify-between space-x-2 pt-1 border-t bg-gray-50/50 rounded-lg p-1">
                        <div className="text-center">
                          <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Total Collections</div>
                          <div className="text-sm font-black text-blue-900">{vehicle.count}</div>
                        </div>
                        <div className="text-center border-x border-gray-100">
                          <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Total Work</div>
                          <div className="text-sm font-black text-green-700">{fmtMs(vehicle.totalWorkMs)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Total Break</div>
                          <div className="text-sm font-black text-orange-600">{fmtMs(vehicle.totalBreakMs)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((vehicle) => {
            const startTime = vehicle.startTime
              ? new Date(vehicle.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
              : "N/A";
            const endTime = vehicle.endTime
              ? new Date(vehicle.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
              : "N/A";

            return (
              <div key={vehicle.registrationNumber} className="p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold">{vehicle.vehicleName}</h4>
                  <Badge variant="outline">{vehicle.count} collections</Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  <span className="font-bold">Collectors:</span> {vehicle.collectorNames || "None assigned"}
                </div>
                <div className="font-bold text-md flex justify-between text-[10px] border-t pt-1">
                  <span>Start: {startTime}</span>
                  <span>End: {endTime}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
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

const DailyInsightsGrid = ({ kpis, pulses }: { kpis: any; pulses: any[] }) => {
  const collectionHistory = pulses.map(p => ({ day: p.day, value: p.collections }));
  const ratingHistory = pulses.map(p => ({ day: p.day, value: p.rating }));

  const collDiff = kpis.collectedToday - kpis.collectedYesterday;
  const collUp = collDiff >= 0;

  return (
    <div className="space-y-1 w-full mt-2">
      {/* Row 1: Total Households + Not Collected side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center bg-white/70 backdrop-blur-md border border-white/20 shadow-sm rounded-3xl p-2">
          <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Households</div>
          <div className="text-2xl font-black text-gray-900 font-outfit">{kpis.totalHouseholds}</div>
        </div>
        <div className="text-center bg-red-50/50 backdrop-blur-md border border-red-100/20 shadow-sm rounded-3xl p-2">
          <div className="text-[9px] font-black text-red-600/60 uppercase tracking-widest mb-1">Not Collected</div>
          <div className="text-2xl font-black text-red-700 font-outfit">{kpis.nonCollectedToday}</div>
        </div>
      </div>

      {/* Row 2: Collection Pulse — full width */}
      <div className="bg-green-100/50 backdrop-blur-md border border-green-100/20 shadow-sm rounded-3xl py-2 px-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black text-green-600/60 uppercase tracking-widest mb-1">Collection Pulse</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-green-700 font-outfit leading-none">{kpis.collectedToday}</span>
              <span className={`text-[9px] font-black uppercase ${collUp ? 'text-green-600' : 'text-red-500'}`}>
                {collUp ? '▲' : '▼'} {Math.abs(collDiff)} vs yesterday
              </span>
            </div>
          </div>
          <div className="w-24 h-10">
            <RechartsContainer width="100%" height="100%">
              <AreaChart data={collectionHistory}>
                <defs>
                  <linearGradient id="pulse-coll" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={1.5} fillOpacity={1} fill="url(#pulse-coll)" />
              </AreaChart>
            </RechartsContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Segregation Pulse — full width */}
      <div className="bg-yellow-50/50 backdrop-blur-md border border-yellow-100/20 shadow-sm rounded-3xl py-2 px-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black text-yellow-600/60 uppercase tracking-widest mb-1">Segregation Pulse</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-yellow-700 font-outfit leading-none">{kpis.avgSegregationRating}</span>
              <span className="text-xs font-bold text-yellow-500">/5</span>
            </div>
          </div>
          <div className="w-24 h-10">
            <RechartsContainer width="100%" height="100%">
              <AreaChart data={ratingHistory}>
                <defs>
                  <linearGradient id="pulse-seg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#facc15" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#facc15" strokeWidth={1.5} fillOpacity={1} fill="url(#pulse-seg)" />
              </AreaChart>
            </RechartsContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionSummary = ({ text }: { text: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-3 bg-blue-50/30 p-4 rounded-2xl mb-4 border border-blue-50/50"
  >
    <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
    <p className="text-[10px] font-black text-blue-900 leading-tight font-outfit uppercase tracking-tight opacity-80">{text}</p>
  </motion.div>
);

const ReportsTabContent = ({
  filters,
  updateFilter,
  reportData,
  isLoading
}: {
  filters: any;
  updateFilter: (k: any, v: any) => void;
  reportData: any;
  isLoading: boolean;
}) => {
  const targetDate = filters.date || format(new Date(), 'yyyy-MM-dd');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest animate-pulse">Please Wait Generating Reports...</span>
      </div>
    );
  }

  if (!reportData) return null;

  const { kpis, pulses, wardPerformance, materialData, vehicleStats, collectionTimeline } = reportData;

  const materialDataArray = [
    { name: 'Wet', value: materialData.wet, color: '#22c55e' },
    { name: 'Dry', value: materialData.dry, color: '#3b82f6' },
    { name: 'Sanitary', value: materialData.sanitary, color: '#ec4899' },
    { name: 'SpecialCare', value: materialData.rejected, color: '#ef4444' },
  ];

  return (
    <div className="bg-green-50 flex flex-col min-h-screen pb-5">
      <StickyDateSwitcher
        date={targetDate}
        onChange={(d) => updateFilter("date", d)}
      />

      <motion.div
        className="px-2 sm:px-6 space-y-3 max-w-5xl mx-auto w-full"
        initial="hidden"
        animate="show"
        variants={{
          show: { transition: { staggerChildren: 0.1 } }
        }}
      >
        {/* Section 1: Insights & Stats */}
        <section>
          <DailyInsightsGrid kpis={kpis} pulses={pulses} />
        </section>

        {/* Section 2: Efficiency */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <EfficiencyDonut current={kpis.collectedToday} total={kpis.totalHouseholds} />
            <div className="flex flex-col hidden sm:block justify-center bg-gray-50/50 rounded-[2.5rem] p-8 border border-gray-100/50">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Quick Insight</div>
              <div className="text-xl font-black text-gray-900 font-outfit uppercase leading-tight mb-2">
                {kpis.collectedToday >= kpis.totalHouseholds * 0.9 ? 'Outstanding coverage detected.' : 'Opportunity to increase coverage in outer wards.'}
              </div>
              <p className="text-[11px] font-bold text-gray-500 leading-relaxed uppercase tracking-tight">
                {kpis.collectedToday >= kpis.totalHouseholds * 0.9
                  ? 'The village is operating at peak efficiency. Minor missed households are likely seasonal or temporary vacancies.'
                  : 'Targeting missed households in early morning slots could improve the daily collection percentage by up to 15%.'}
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Materials */}
        <section>
          {materialData.isLogged ? (
            <WasteMaterialChart data={materialDataArray} />
          ) : (
            <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-xl px-5 py-10 text-center">
              <div className="flex justify-center items-center gap-3 mb-4">
                <Trash2 className="h-8 w-8 text-green-500" />
                <Trash2 className="h-8 w-8 text-blue-500" />
                <Trash2 className="h-8 w-8 text-red-500" />
                <Trash2 className="h-8 w-8 text-black" />
              </div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Daily Collected Waste Material Type Entries not logged/Entered for this date</div>
            </div>
          )}
        </section>

        {/* Section 4: Wards */}
        <section>
          <WardPerformanceTripleChart data={wardPerformance} />
        </section>

        {/* Section 5: Vehicles */}
        <section>
          <CollectionPerformanceCard
            data={vehicleStats}
            dateLabel={new Date(targetDate).toLocaleDateString()}
          />
        </section>

        {/* Section 6: Hourly Collection Timeline */}
        <section className="bg-white/70 backdrop-blur-md border border-white/20 shadow-sm rounded-xl p-3 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[12px] font-black uppercase tracking-[0.25em] text-gray-600">Collection Timeline</h4>
            <Clock className="h-4 w-4 text-gray-600" />
          </div>

          {(!collectionTimeline || !collectionTimeline.hourly || collectionTimeline.hourly.length === 0) ? (
            <p className="text-[11px] font-bold text-gray-400 uppercase text-center py-12 italic">No collections recorded for this date.</p>
          ) : (
            <>
              <div className="w-full h-64 md:h-80">
                <RechartsContainer width="100%" height="100%">
                  <BarChart data={collectionTimeline.hourly} margin={{ top: 20, right: 10, left: -30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="hour"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 700 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 700 }}
                    />
                    <Tooltip
                      cursor={{ fill: '#f9fafb' }}
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 11 }}
                    />
                    {(collectionTimeline.vehicles || []).map((v: any, i: number) => (
                      <Bar
                        key={v.name}
                        dataKey={v.name}
                        fill={v.color}
                        stackId="timeline"
                        radius={i === collectionTimeline.vehicles.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </RechartsContainer>
              </div>
              {/* Vehicle legend */}
              <div className="flex flex-wrap items-center gap-3 mt-3 justify-center">
                {(collectionTimeline.vehicles || []).map((v: any) => (
                  <div key={v.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: v.color }} />
                    <span className="text-[8px] font-bold text-gray-500 uppercase">{v.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </motion.div>
    </div>
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
  const [moreDeleteConfirm, setMoreDeleteConfirm] = useState<{ label: string; onConfirm: () => void } | null>(null);
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

  // Lazy-loaded historical collections for other tabs (Management, etc.)
  const { data: allCollections = [] } = useQuery<WasteCollection[]>({
    queryKey: ["/api/waste-collections/village", user?.villageId],
    enabled: !!user?.villageId && activeTab !== "reports",
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // NEW: Premium Report Data
  const { data: reportData, isLoading: isReportLoading } = useQuery({
    queryKey: ["/api/analytics/premium", user?.villageId, filters.date],
    queryFn: async () => {
      const date = filters.date || new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/analytics/premium?village=${user?.villageId}&date=${date}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch premium report data");
      return response.json();
    },
    enabled: !!user?.villageId && activeTab === "reports",
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
      activeMoreScreen === "download-qr" ||
      activeMoreScreen === "generate-qr"
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
        <div className="bg-white border-b border-gray-100 px-4 py-2 sticky top-0 z-[60]"
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
          <div className="flex-1 sm:p-6 overflow-auto pb-24 md:pb-6">

            {/* Collections Tab */}
            {activeTab === "collections" && (
              <div className="flex flex-col h-full bg-white overflow-hidden shadow-sm border border-gray-100 relative">
                {selectedCollectionHousehold ? (
                  <CollectionDetailView
                    household={selectedCollectionHousehold}
                    onBack={() => setSelectedCollectionHousehold(null)}
                  />
                ) : isCollectionsSearching ? (
                  /* Focused Search View */
                  <div className="flex flex-col h-full bg-white z-20">
                    <div className="px-2 py-2 bg-white border-b border-gray-100 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-8 rounded-full bg-gray-200"
                        onClick={() => setIsCollectionsSearching(false)}
                      >
                        <ArrowLeft className="h-6 w-6" strokeWidth={3} />
                      </Button>
                      <div className="relative flex-1">
                        <Input
                          autoFocus
                          className="w-full h-10 bg-gray-50 border-none rounded-2xl pl-10 pr-4 focus-visible:ring-1 focus-visible:ring-gray-200 transition-all text-sm font-medium"
                          placeholder="Search name, house # or UID..."
                          value={collectionsSearch}
                          onChange={(e) => setCollectionsSearch(e.target.value)}
                        />
                        <Search className="absolute left-3.5 top-2.5 h-5 w-5 text-gray-400" />
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
                          <div className="px-5 py-1 border-b border-gray-50 flex items-center justify-between">
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
                {/* Back button is now inside each sub-screen component */}

                {/* More Screen: flat menu */}
                {!activeMoreScreen && (
                  <div className="p-2">
                    {/* Profile header */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl ring-1 ring-black/5 shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                        {(user?.name || "M").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{user?.name || "Manager"}</p>
                        <div className="flex px-3 space-x-5 justify-center items-center">
                          <p className="text-xs text-gray-500 truncate">{user?.userId}</p>
                          <Badge variant="secondary" className="text-xs mt-0.5">{user?.role}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Material Logs group */}
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-4 pb-1">Material Logs</p>
                    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden mb-2">
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

                {/* Households sub-screen — Premium */}
                {activeMoreScreen === "household-details" && (
                  <div className="space-y-3 p-3">
                    {/* Search */}
                    <div className="px-2 py-2 bg-white border-b border-gray-100 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-8 rounded-full bg-gray-200"
                        onClick={() => setActiveMoreScreen(null)}
                      >
                        <ArrowLeft className="h-6 w-6" strokeWidth={3} />
                      </Button>
                      <div className="relative flex-1">
                        <Input
                          autoFocus
                          className="w-full h-10 bg-gray-50 border-none rounded-2xl pl-10 pr-4 focus-visible:ring-1 focus-visible:ring-gray-200 transition-all text-sm font-medium"
                          placeholder="Search name, house # or UID or mobile"
                          value={householdSearch}
                          onChange={(e) => setHouseholdSearch(e.target.value)}
                        />
                        <Search className="absolute left-3.5 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                      {householdSearch && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-full bg-gray-50 text-gray-400"
                          onClick={() => setHouseholdSearch("")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {/* Household list */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
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
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex active:scale-[0.98] transition-transform cursor-pointer"
                            onClick={() => { setViewingHousehold(h); setShowHouseholdDetails(true); }}
                          >
                            <div className="w-1 flex-shrink-0 bg-green-500" />
                            <div className="flex-1 flex items-center justify-between p-3 min-w-0">
                              <div className="min-w-0">
                                <h4 className="text-[12px] font-black text-gray-900 truncate">{h.headName}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[8px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">{h.uid}</span>
                                  {h.houseNumber && <span className="text-[8px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">#{h.houseNumber}</span>}
                                  {h.ward && <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md uppercase">{h.ward}</span>}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 ml-2" />
                            </div>
                          </div>
                        ))}
                      {households.filter(h => {
                        const search = householdSearch.toLowerCase();
                        return h.headName.toLowerCase().includes(search) || h.uid.toLowerCase().includes(search) || (h.houseNumber && h.houseNumber.toLowerCase().includes(search)) || (h.phone && h.phone.toLowerCase().includes(search));
                      }).length === 0 && (
                          <div className="text-center py-12">
                            <Package className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No households found</p>
                          </div>
                        )}
                    </div>
                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest text-center">
                      {households.length} households
                    </p>
                  </div>
                )}

                {/* Generate QR — Premium */}
                {activeMoreScreen === "generate-qr" && (
                  <div className="space-y-4 p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveMoreScreen(null)} className="p-1.5 rounded-full hover:bg-gray-100 active:scale-90 transition-all">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                      </button>
                      <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">Generate QR Codes</h2>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5 block">Number of QR Codes</label>
                        <Input
                          id="batch-quantity-hh"
                          type="number"
                          min={1}
                          max={100}
                          value={batchQuantity}
                          onChange={(e) => setBatchQuantity(parseInt(e.target.value) || 10)}
                          data-testid="input-batch-quantity-households"
                          className="rounded-xl border-gray-200 h-10 text-sm"
                        />
                      </div>
                      <button
                        onClick={() => generateBatchQRMutation.mutate(batchQuantity)}
                        disabled={generateBatchQRMutation.isPending || batchQuantity < 1}
                        data-testid="button-generate-batch-households"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all"
                      >
                        <QrCode className="h-4 w-4" />
                        {generateBatchQRMutation.isPending ? "Generating..." : "Generate Batch"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Download QR — Premium */}
                {activeMoreScreen === "download-qr" && (
                  <div className="space-y-3 p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveMoreScreen(null)} className="p-1.5 rounded-full hover:bg-gray-100 active:scale-90 transition-all">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                      </button>
                      <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">QR Code Batches</h2>
                    </div>
                    {batchQRCodes.length === 0 ? (
                      <div className="text-center py-16">
                        <QrCode className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No QR codes generated yet</p>
                      </div>
                    ) : (
                      Object.entries(
                        batchQRCodes.reduce((acc: any, qr: any) => {
                          if (!acc[qr.batchId]) acc[qr.batchId] = { total: 0, mapped: 0, notMapped: 0 };
                          acc[qr.batchId].total++;
                          if (qr.status === 'mapped') acc[qr.batchId].mapped++;
                          else acc[qr.batchId].notMapped++;
                          return acc;
                        }, {})
                      ).map(([batchId, stats]: [string, any]) => (
                        <div key={batchId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex" data-testid={`row-batch-households-${batchId}`}>
                          <div className="w-1 flex-shrink-0 bg-blue-500" />
                          <div className="flex-1 flex items-center justify-between p-3 min-w-0">
                            <div className="min-w-0">
                              <h4 className="text-[11px] font-black text-gray-900 truncate">{batchId}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[8px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-md">{stats.total} total</span>
                                <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md">{stats.mapped} mapped</span>
                                <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">{stats.notMapped} unmapped</span>
                              </div>
                            </div>
                            <button
                              onClick={() => window.open(`/api/qr-codes/batch/${batchId}/pdf`, '_blank')}
                              data-testid={`button-download-batch-households-${batchId}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-all flex-shrink-0 ml-2"
                            >
                              <Download className="h-3 w-3" />
                              PDF
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}



                {/* Collectors sub-screen — Premium */}
                {activeMoreScreen === "collectors" && (
                  <div className="space-y-3 p-3">
                    {/* Top bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setActiveMoreScreen(null)} className="p-1.5 rounded-full hover:bg-gray-100 active:scale-90 transition-all">
                          <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">Collectors</h2>
                      </div>
                      <CreateCollectorDialog villageId={user?.villageId || ""} />
                    </div>

                    {/* Collector cards */}
                    <div className="space-y-2">
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
                              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex cursor-pointer active:scale-[0.98] transition-transform">
                                <div className="w-1 flex-shrink-0 bg-green-500" />
                                <div className="flex-1 p-3 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                      <h4 className="text-[12px] font-black text-gray-900 truncate">{collector.name}</h4>
                                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        <span className="text-[8px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">{collector.uid}</span>
                                        {collector.phone && <span className="text-[8px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{collector.phone}</span>}
                                        {(collector as any).assignedVehicle && (
                                          <span className="text-[8px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md">🚛 {(collector as any).assignedVehicle}</span>
                                        )}
                                      </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 ml-2" />
                                  </div>
                                  <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm font-black text-green-600">{totalCollections}</span>
                                      <span className="text-[8px] font-bold text-gray-400 uppercase">collections</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm font-black text-amber-500">{averageRating}</span>
                                      <span className="text-[8px] font-bold text-gray-400 uppercase">avg rating</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </DialogTrigger>
                            <DialogContent
                              className="max-w-[100vw] w-full md:max-w-4xl md:rounded-xl overflow-hidden p-0 flex flex-col border-none md:border"
                              style={{ top: 60, left: 0, transform: 'none', height: 'calc(100dvh - 60px)' }}
                            >
                              <div className="px-4 border-b flex items-center justify-between bg-green-50 min-h-[50px] flex-shrink-0">
                                <DialogTitle className="text-sm font-black uppercase tracking-tight text-gray-900 truncate">Feedbacks — {collector.name}</DialogTitle>
                              </div>
                              <div className="flex-1 overflow-y-auto p-3">
                                <CollectorFeedbackModal
                                  collector={collector}
                                  allCollections={allCollections}
                                  feedbacks={feedbacks}
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        );
                      })}
                      {collectors.length === 0 && (
                        <div className="text-center py-16">
                          <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No collectors yet</p>
                        </div>
                      )}
                      {collectors.length > 0 && (
                        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest text-center pt-1">
                          {collectors.length} collector{collectors.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Field Workers sub-screen */}
                {activeMoreScreen === "fieldworkers" && (
                  <div className="space-y-3 p-3">
                    {/* Top bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setActiveMoreScreen(null)} className="p-1.5 rounded-full hover:bg-gray-100 active:scale-90 transition-all">
                          <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">Field Staff</h2>
                      </div>
                      <Dialog open={showCreateFieldWorkerDialog} onOpenChange={setShowCreateFieldWorkerDialog}>
                        <DialogTrigger asChild>
                          <button
                            data-testid="button-add-fieldworker"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </button>
                        </DialogTrigger>
                        <DialogContent
                          className="max-w-[100vw] w-full md:max-w-lg md:rounded-xl overflow-hidden p-0 flex flex-col border-none md:border"
                          style={{ top: 60, left: 0, transform: 'none', height: 'calc(100dvh - 60px)' }}
                        >
                          <div className="px-4 border-b flex items-center justify-between bg-green-50 min-h-[50px] flex-shrink-0">
                            <DialogTitle className="text-sm font-black uppercase tracking-tight text-gray-900">Add Field Worker</DialogTitle>
                            <button onClick={() => setShowCreateFieldWorkerDialog(false)} className="p-2 rounded-full hover:bg-white/50 transition-colors">
                            </button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div>
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5 block">Name *</label>
                              <Input
                                id="fw-name"
                                value={newFieldWorkerName}
                                onChange={(e) => setNewFieldWorkerName(e.target.value)}
                                placeholder="Enter field worker name"
                                data-testid="input-fieldworker-name"
                                className="rounded-xl border-gray-200 h-10 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5 block">Phone</label>
                              <Input
                                id="fw-phone"
                                value={newFieldWorkerPhone}
                                onChange={(e) => setNewFieldWorkerPhone(e.target.value)}
                                placeholder="Enter phone number"
                                data-testid="input-fieldworker-phone"
                                className="rounded-xl border-gray-200 h-10 text-sm"
                              />
                            </div>
                            <button
                              onClick={() => createFieldWorkerMutation.mutate({ name: newFieldWorkerName, phone: newFieldWorkerPhone })}
                              disabled={!newFieldWorkerName.trim() || createFieldWorkerMutation.isPending}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all"
                              data-testid="button-submit-fieldworker"
                            >
                              {createFieldWorkerMutation.isPending ? "Creating..." : "Create Field Worker"}
                            </button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Worker list */}
                    {fieldWorkers.length === 0 ? (
                      <div className="text-center py-16">
                        <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No field workers yet</p>
                        <p className="text-[9px] text-gray-300 mt-1">Tap "Add" to create one</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fieldWorkers.map((fw: any) => (
                          <div key={fw.userId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex" data-testid={`row-fieldworker-${fw.userId}`}>
                            <div className="w-1 flex-shrink-0 bg-green-500" />
                            <div className="flex-1 flex items-center justify-between p-3 min-w-0">
                              <div className="min-w-0">
                                <h4 className="text-[12px] font-black text-gray-900 truncate">{fw.name}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[8px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">{fw.userId}</span>
                                  {fw.phone && <span className="text-[8px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{fw.phone}</span>}
                                </div>
                              </div>
                              <button
                                onClick={() => setMoreDeleteConfirm({ label: 'field worker', onConfirm: () => deleteFieldWorkerMutation.mutate(fw.userId) })}
                                disabled={deleteFieldWorkerMutation.isPending}
                                data-testid={`button-delete-fieldworker-${fw.userId}`}
                                className="p-2 rounded-xl bg-red-50 hover:bg-red-100 active:scale-90 transition-all flex-shrink-0 ml-2"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest text-center pt-1">
                          {fieldWorkers.length} field worker{fieldWorkers.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Announcements sub-screen — Premium */}
                {activeMoreScreen === "announcements" && (
                  <div className="space-y-4 p-3">
                    {/* Top bar */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveMoreScreen(null)} className="p-1.5 rounded-full hover:bg-gray-100 active:scale-90 transition-all">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                      </button>
                      <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">Announcements</h2>
                    </div>

                    {activeTab === "more" && activeMoreScreen === "announcements" && (
                      <div className="space-y-4">
                        {/* Compose */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">New Announcement</label>
                          <Textarea
                            placeholder="Type your announcement..."
                            className="min-h-[80px] rounded-xl border-gray-200 text-sm"
                            id="announcement-message"
                          />
                          <Select defaultValue="all">
                            <SelectTrigger className="rounded-xl border-gray-200 h-10 text-sm">
                              <SelectValue placeholder="Select audience" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="collectors">Collectors</SelectItem>
                              <SelectItem value="households">Households</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Recent Announcements */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Recent</label>
                          {announcements.length > 0 ? (
                            announcements.map((announcement: any) => (
                              <div key={announcement.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
                                <div className="w-1 flex-shrink-0 bg-blue-500" />
                                <div className="flex-1 p-3 min-w-0">
                                  <p className="text-[11px] font-bold text-gray-800 leading-relaxed">{announcement.message}</p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md uppercase">{announcement.targetAudience}</span>
                                    <span className="text-[8px] font-bold text-gray-300">{new Date(announcement.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-12">
                              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("announcements.checkLater")}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Daily Waste Logs sub-screen */}
                {activeMoreScreen === "daily-waste-logs" && (
                  <MaterialLog defaultTab="daily" onBack={() => setActiveMoreScreen(null)} />
                )}

                {/* Compost Logs sub-screen */}
                {activeMoreScreen === "compost-logs" && (
                  <MaterialLog defaultTab="compost" onBack={() => setActiveMoreScreen(null)} />
                )}

                {/* Sales Logs sub-screen */}
                {activeMoreScreen === "sales-logs" && (
                  <MaterialLog defaultTab="sales" onBack={() => setActiveMoreScreen(null)} />
                )}

                {/* Overall Reports sub-screen */}
                {activeMoreScreen === "overall-reports" && (
                  <div className="space-y-6 p-3">
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


                {/* Vehicles sub-screen — Premium */}
                {activeMoreScreen === "vehicles" && (
                  <div className="space-y-3 p-3">
                    {/* Top bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setActiveMoreScreen(null)} className="p-1.5 rounded-full hover:bg-gray-100 active:scale-90 transition-all">
                          <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">Vehicles</h2>
                      </div>
                      <button
                        onClick={() => {
                          setEditingVehicle(null);
                          setNewVehicleReg("");
                          setNewVehicleName("");
                          setSelectedVehicleCollectors([]);
                          setShowVehicleForm(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </div>

                    {/* Inline form */}
                    {showVehicleForm && (
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                          {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
                        </label>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Registration Number *</label>
                          <Input
                            value={newVehicleReg}
                            onChange={(e) => setNewVehicleReg(e.target.value)}
                            disabled={!!editingVehicle}
                            placeholder="e.g. MH-12-AB-1234"
                            className="rounded-xl border-gray-200 h-10 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Vehicle Name *</label>
                          <Input
                            value={newVehicleName}
                            onChange={(e) => setNewVehicleName(e.target.value)}
                            placeholder="e.g. Garbage Truck 1"
                            className="rounded-xl border-gray-200 h-10 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Assign Collectors</label>
                          <div className="max-h-36 overflow-y-auto p-2 border border-gray-200 rounded-xl space-y-2">
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
                                    className="rounded"
                                  />
                                  <label htmlFor={`mv-collector-${c.id}`} className="text-[11px] font-bold text-gray-700 cursor-pointer">{c.name} <span className="text-gray-400">({c.uid})</span></label>
                                </div>
                              ))}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => setShowVehicleForm(false)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider hover:bg-gray-50 active:scale-95 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            disabled={!newVehicleReg || !newVehicleName || addVehicleMutation.isPending || updateVehicleMutation.isPending}
                            onClick={() => {
                              if (editingVehicle) {
                                updateVehicleMutation.mutate({ registrationNumber: newVehicleReg, name: newVehicleName, collectorIds: selectedVehicleCollectors });
                              } else {
                                addVehicleMutation.mutate({ registrationNumber: newVehicleReg, name: newVehicleName, collectorIds: selectedVehicleCollectors });
                              }
                            }}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-all"
                          >
                            {(addVehicleMutation.isPending || updateVehicleMutation.isPending) ? "Saving..." : (editingVehicle ? "Update" : "Add Vehicle")}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Vehicle list */}
                    {(villageData?.vehicles || []).length > 0 ? (
                      <div className="space-y-2">
                        {(villageData?.vehicles || []).map((vehicle: any) => (
                          <div key={vehicle.registrationNumber} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
                            <div className="w-1 flex-shrink-0 bg-purple-500" />
                            <div className="flex-1 flex items-center justify-between p-3 min-w-0">
                              <div className="min-w-0">
                                <h4 className="text-[12px] font-black text-gray-900 truncate">{vehicle.name}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[8px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md">{vehicle.registrationNumber}</span>
                                  {vehicle.collectorIds?.length > 0 && (
                                    <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md">{vehicle.collectorIds.length} collector{vehicle.collectorIds.length !== 1 ? 's' : ''}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0 ml-2">
                                <button
                                  onClick={() => {
                                    setEditingVehicle(vehicle);
                                    setNewVehicleReg(vehicle.registrationNumber);
                                    setNewVehicleName(vehicle.name);
                                    setSelectedVehicleCollectors(vehicle.collectorIds || []);
                                    setShowVehicleForm(true);
                                  }}
                                  className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-90 transition-all"
                                >
                                  <Edit className="h-3.5 w-3.5 text-gray-500" />
                                </button>
                                <button
                                  onClick={() => setMoreDeleteConfirm({ label: 'vehicle', onConfirm: () => removeVehicleMutation.mutate(vehicle.registrationNumber) })}
                                  className="p-2 rounded-xl bg-red-50 hover:bg-red-100 active:scale-90 transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest text-center pt-1">
                          {(villageData?.vehicles || []).length} vehicle{(villageData?.vehicles || []).length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <Package className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No vehicles added yet</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Wards sub-screen — Premium */}
                {activeMoreScreen === "wards" && (
                  <div className="space-y-3 p-3">
                    {/* Top bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setActiveMoreScreen(null)} className="p-1.5 rounded-full hover:bg-gray-100 active:scale-90 transition-all">
                          <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">Wards</h2>
                      </div>
                      <button
                        onClick={() => setShowWardForm(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </div>

                    {/* Ward list */}
                    {wards.length > 0 ? (
                      <div className="space-y-2">
                        {wards.map((ward: string, index: number) => (
                          <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
                            <div className="w-1 flex-shrink-0 bg-amber-500" />
                            <div className="flex-1 flex items-center p-3 min-w-0">
                              <MapPin className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" />
                              <h4 className="text-[12px] font-black text-gray-900 truncate">{ward}</h4>
                            </div>
                          </div>
                        ))}
                        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest text-center pt-1">
                          {wards.length} ward{wards.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <MapPin className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No wards configured yet</p>
                        <p className="text-[9px] text-gray-300 mt-1">Tap "Add" to create your first ward</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Change Password sub-screen — Premium */}
                {activeMoreScreen === "change-password" && (
                  <div className="space-y-4 p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveMoreScreen(null)} className="p-1.5 rounded-full hover:bg-gray-100 active:scale-90 transition-all">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                      </button>
                      <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">Change Password</h2>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
                      <div className="text-center py-2">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                          <Shield className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">Update your account password for security</p>
                      </div>
                      <button
                        onClick={() => setShowPasswordDialog(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all"
                      >
                        Change Password
                      </button>
                    </div>
                  </div>
                )}

                {/* Language sub-screen — Premium */}
                {activeMoreScreen === "language" && (
                  <div className="space-y-4 p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveMoreScreen(null)} className="p-1.5 rounded-full hover:bg-gray-100 active:scale-90 transition-all">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                      </button>
                      <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">Language</h2>
                    </div>
                    <div className="flex justify-center items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">Select Language</label>
                      <LanguageSwitcher />
                    </div>
                  </div>
                )}
              </div>
            )}




            {/* Issues Tab — Premium Mobile-First */}
            {
              activeTab === "issues" && (() => {
                const openCount = allIssues.filter(i => i.status === "open").length;
                const progressCount = allIssues.filter(i => i.status === "in_progress").length;
                const resolvedCount = allIssues.filter(i => i.status === "resolved").length;
                const filteredIssues = allIssues.filter(issue => filters.status === "all" || issue.status === filters.status);

                const statusConfig: Record<string, { dot: string; bg: string; text: string; border: string; label: string }> = {
                  open: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Open' },
                  in_progress: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'In Progress' },
                  resolved: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Resolved' },
                };

                const stripColor = (s: string) => s === 'open' ? 'bg-red-500' : s === 'in_progress' ? 'bg-amber-400' : 'bg-green-500';

                return (
                  <div className="space-y-4 p-3">
                    {/* Status Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 -mx-1">
                      {[
                        { key: 'all', label: 'All', count: allIssues.length, dot: 'bg-gray-400' },
                        { key: 'open', label: 'Open', count: openCount, dot: 'bg-red-500' },
                        { key: 'in_progress', label: 'Progress', count: progressCount, dot: 'bg-amber-500' },
                        { key: 'resolved', label: 'Resolved', count: resolvedCount, dot: 'bg-green-500' },
                      ].map(pill => (
                        <button
                          key={pill.key}
                          onClick={() => updateFilter('status', pill.key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex-shrink-0 ${filters.status === pill.key
                            ? 'bg-gray-900 text-white shadow-md scale-105'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 active:scale-95'
                            }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${filters.status === pill.key ? 'bg-white' : pill.dot}`} />
                          {pill.label}
                          <span className={`ml-0.5 ${filters.status === pill.key ? 'text-white/70' : 'text-gray-400'}`}>{pill.count}</span>
                        </button>
                      ))}
                    </div>

                    {/* Issue Cards */}
                    <div className="space-y-3">
                      {filteredIssues.length === 0 ? (
                        <div className="text-center py-16">
                          <AlertCircle className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No issues found</p>
                        </div>
                      ) : (
                        filteredIssues.map((issue) => {
                          const cfg = statusConfig[issue.status] || statusConfig.open;
                          const timeAgo = issue.createdAt ? formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true }) : '';

                          return (
                            <div
                              key={issue.id}
                              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex active:scale-[0.98] transition-transform"
                            >
                              {/* Left color strip */}
                              <div className={`w-1 flex-shrink-0 ${stripColor(issue.status)}`} />

                              <div className="flex-1 p-3 min-w-0">
                                {/* Header: title + category + time */}
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-[13px] font-black text-gray-900 truncate leading-tight">{issue.title}</h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                                      <span className="text-[8px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md uppercase">{issue.category}</span>
                                      <span className="text-[8px] text-gray-400">{timeAgo}</span>
                                    </div>
                                  </div>
                                  {/* Edit button */}
                                  <button
                                    onClick={() => { setSelectedIssue(issue); setShowIssueDialog(true); }}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                                  >
                                    <Edit className="h-3.5 w-3.5 text-gray-400" />
                                  </button>
                                </div>

                                {/* Description — 2 lines max */}
                                <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2 mb-1.5">{issue.description}</p>

                                {/* Photo + Reporter row */}
                                <div className="flex items-center gap-2">
                                  {issue.photoUrl && (
                                    <img
                                      src={issue.photoUrl}
                                      alt=""
                                      className="w-9 h-9 rounded-lg object-cover border border-gray-100 cursor-pointer flex-shrink-0"
                                      onClick={() => window.open(issue.photoUrl, "_blank")}
                                    />
                                  )}
                                  <span className="text-[9px] font-medium text-gray-400 truncate">by {issue.reportedBy}</span>
                                </div>

                                {/* Manager reply — compact */}
                                {issue.managerReply && (
                                  <div className="mt-2 p-2 bg-green-50/80 rounded-lg border border-green-100">
                                    <div className="flex items-start gap-2">
                                      <div className="w-1 h-full bg-green-400 rounded-full flex-shrink-0 mt-0.5" style={{ minHeight: 16 }} />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-[8px] font-black text-green-700 uppercase tracking-wider">Manager Reply</span>
                                        <p className="text-[10px] text-green-800 leading-snug line-clamp-2 mt-0.5">{issue.managerReply}</p>
                                        {issue.managerProofPhotoUrl && (
                                          <img
                                            src={issue.managerProofPhotoUrl}
                                            alt=""
                                            className="w-8 h-8 rounded-md object-cover mt-1 cursor-pointer border border-green-200"
                                            onClick={() => window.open(issue.managerProofPhotoUrl, "_blank")}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Load More */}
                    {hasNextIssuesPage && (
                      <div className="flex justify-center pt-2">
                        <button
                          onClick={() => fetchNextIssuesPage()}
                          disabled={isFetchingNextIssuesPage}
                          className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors py-2 px-4"
                          data-testid="button-load-more-issues"
                        >
                          {isFetchingNextIssuesPage ? 'Loading...' : `Show more · ${totalIssuesCount - allIssues.length} remaining`}
                        </button>
                      </div>
                    )}

                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest text-center">
                      {filteredIssues.length} of {totalIssuesCount} issues
                    </p>
                  </div>
                );
              })()
            }

            {/* Reports Tab */}
            {activeTab === "reports" && (
              <ReportsTabContent
                filters={filters}
                updateFilter={updateFilter}
                reportData={reportData}
                isLoading={isReportLoading}
              />
            )}

          </div >
        </div >
      </div >

      {/* Delete Confirmation Dialog — More Tab */}
      <Dialog open={!!moreDeleteConfirm} onOpenChange={() => setMoreDeleteConfirm(null)}>
        <DialogContent className="max-w-xs rounded-2xl border-none shadow-xl p-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-sm font-black text-gray-900">Remove {moreDeleteConfirm?.label}?</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              This {moreDeleteConfirm?.label} will be permanently removed.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setMoreDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider hover:bg-gray-50 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  moreDeleteConfirm?.onConfirm();
                  setMoreDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-all"
              >
                Remove
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Issue Management Dialog — Fullscreen */}
      <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <DialogContent
          className="max-w-[100vw] w-full md:max-w-lg md:h-[90vh] md:rounded-xl overflow-hidden p-0 flex flex-col border-none md:border"
          style={{ top: 60, left: 0, transform: 'none', height: 'calc(100dvh - 60px)' }}
        >
          {/* Fixed header */}
          <div className="px-2 border-b flex items-center justify-between bg-green-50 min-h-[50px] flex-shrink-0">
            <DialogTitle className="text-sm font-black uppercase tracking-tight text-gray-900">Manage Issue</DialogTitle>
            {/* <button onClick={() => setShowIssueDialog(false)} className="p-2 rounded-full hover:bg-white/50 transition-colors">
              <X className="h-5 w-5 text-gray-600" />
            </button> */}
          </div>
          {selectedIssue && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const status = formData.get("status") as string;
                const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
                const proofPhotoFile = fileInput?.files?.[0] || null;

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
              className="flex-1 overflow-y-auto px-3 space-y-2 pb-5 md:pb-6"
            >
              {/* Issue summary */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <h4 className="text-[13px] font-black text-gray-900 leading-tight mb-1">{selectedIssue.title}</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">{selectedIssue.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[8px] font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded-md uppercase border border-gray-100">{selectedIssue.category}</span>
                  <span className="text-[8px] font-medium text-gray-400">by {selectedIssue.reportedBy}</span>
                </div>
                {selectedIssue.photoUrl && (
                  <img
                    src={selectedIssue.photoUrl}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover border border-gray-100 cursor-pointer mt-2"
                    onClick={() => window.open(selectedIssue.photoUrl, "_blank")}
                  />
                )}
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5 block">Status</label>
                <Select name="status" defaultValue={selectedIssue.status}>
                  <SelectTrigger className="rounded-xl border-gray-200 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">🔴 Open</SelectItem>
                    <SelectItem value="in_progress">🟡 In Progress</SelectItem>
                    <SelectItem value="resolved">🟢 Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reply */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5 block">Your Reply</label>
                <Textarea
                  name="managerReply"
                  defaultValue={selectedIssue.managerReply || ""}
                  placeholder="Add your response..."
                  rows={7}
                  className="rounded-xl border-gray-200 resize-none text-sm"
                />
              </div>

              {/* Proof photo */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Proof Photo <span className="text-red-400">*</span>
                  <span className="text-[8px] font-medium text-gray-400 ml-1 normal-case tracking-normal">(required for status change)</span>
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  name="proofPhoto"
                  className="cursor-pointer rounded-xl border-gray-200 text-sm"
                />
              </div>

              {selectedIssue.managerProofPhotoUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Current proof:</span>
                  <img
                    src={selectedIssue.managerProofPhotoUrl}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover cursor-pointer border border-gray-100"
                    onClick={() => window.open(selectedIssue.managerProofPhotoUrl, "_blank")}
                  />
                </div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <Button type="submit" disabled={updateIssueMutation.isPending} className="w-full rounded-xl h-11 text-xs font-bold bg-green-600 hover:bg-green-700 text-white">
                  {updateIssueMutation.isPending ? "Updating..." : "Update Issue"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
        <DialogContent
          className="max-w-[100vw] w-full md:max-w-4xl md:h-[90vh] md:rounded-xl overflow-hidden p-0 flex flex-col border-none md:border"
          style={{ top: 60, left: 0, transform: 'none', height: 'calc(100dvh - 60px)' }}
        >
          <div className="flex flex-col h-full bg-background">
            <header className="px-4 border-b flex items-center justify-between bg-green-50 min-h-[50px] sticky top-0 z-10">
              <h1 className="text-sm font-black uppercase tracking-tight text-gray-900">Household Details</h1>
              <button onClick={() => setShowHouseholdDetails(false)} className="p-2 rounded-full hover:bg-white/50 transition-colors">
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </header>

            <main className="flex-1 overflow-y-auto p-3 space-y-3 max-w-4xl mx-auto w-full">
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