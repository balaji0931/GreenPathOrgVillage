import { useState, useMemo, useDeferredValue } from "react";
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { apiRequest, fetchWithCsrf } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { translateEnum } from '../i18n/enumTranslations';
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
import { QRScanner } from "@/components/qr-scanner";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
  Package,
  AlertTriangle,
  Camera,
  CheckCircle,
  Bell,
  TrendingUp,
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
  Shield,
  Send,
  FileDown,
  RefreshCw,
  Wrench
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { generateDailyReportPDF, type PDFReportData } from "@/components/DailyReportPDF";
import { DataExportWizard } from "@/components/DataExportWizard";
import { MaterialLog } from "@/components/manager/MaterialLog";
import PaymentsTab from "@/components/payments-tab";
import ActivityLog from "@/components/ActivityLog";
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
  const { t } = useTranslation();
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
            <span className="text-[10px] font-semibold text-green-500 uppercase tracking-wider">{t('manager.collected')}</span>
          ) : (
            <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">{t('manager.pending')}</span>
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
  const { t } = useTranslation();
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-white py-1 border-b border-gray-100 overflow-hidden">
      <div className="px-4 mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 font-outfit">{t('manager.needsAttention')}</h3>
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
  const { t } = useTranslation();
  if (!household) return null;
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const { toast: detailToast } = useToast();

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
      detailToast({ title: t('app.error'), description: t('app.error'), variant: "destructive" });
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
            <p className="text-sm font-black uppercase tracking-widest opacity-40">{t('manager.collectionPhoto')}</p>
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
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('manager.voiceRecording')}</p>
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
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('app.rating')}</p>
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
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('manager.collector')}</p>
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
            {t('householdPerformance.call')}
          </Button>

          <Button
            onClick={handleNavigate}
            variant="outline"
            className="flex-1 h-10 rounded-[1.25rem] bg-blue-500 text-white font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            {t('householdPerformance.visit')}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Redesigned Household Collection Details View (Timeline History)
// Media Popup for Timeline details
const MediaPopup = ({ type, url, remarks, onClose }: { type: 'photo' | 'voice', url: string | null, remarks?: string | null, onClose: () => void }) => {
  const { t } = useTranslation();
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
                <p className="text-sm font-black uppercase tracking-widest opacity-30">{t('app.noData')}</p>
              </div>
            )}
            <div className="p-6 bg-white border-t border-gray-100">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('manager.remarks')}</h4>
              <p className="text-gray-900 font-medium leading-relaxed">{remarks || "No additional remarks provided."}</p>
            </div>
          </div>
        ) : (
          <div className="p-8">
            <h3 className="text-xl font-black text-gray-900 font-outfit uppercase tracking-tight mb-6">{t('manager.voiceRecording')}</h3>
            {url ? (
              <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 mb-6">
                <audio src={url} controls className="w-full" autoPlay />
              </div>
            ) : (
              <div className="py-10 text-center opacity-30">
                <Volume2 className="h-10 w-10 mx-auto mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">{t('app.noData')}</p>
              </div>
            )}
            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('manager.remarks')}</h4>
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
  const { t } = useTranslation();
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
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('manager.totalCollections')}</p>
              <p className="text-2xl font-black text-gray-900 font-outfit">{data?.stats?.totalCollections || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('manager.avgSegregation')}</p>
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
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">{t('manager.collectionHistory')}</h3>

            {collectionsLoading && allCollections.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center opacity-40">
                <div className="animate-spin h-10 w-10 border-[5px] border-gray-900 border-t-transparent rounded-full mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">{t('app.loading')}</p>
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
                          {collection.collectorName || t('manager.fieldWorkers')}
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
                          {collection.status === 'missed' ? t('dashboard.missed') : t('manager.collected')}
                        </span>
                      </div>

                      {/* Action Buttons (Small) */}
                      <div className="flex gap-2">
                        {collection.photoUrl && (
                          <Button
                            onClick={() => setMediaPopup({ type: 'photo', url: collection.photoUrl, remarks: collection.remarks })}
                            variant="secondary"
                            className="h-8 px-3 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border-none text-[9px] font-black uppercase tracking-widest gap-1.5"
                          >
                            <Camera className="h-3 w-3" />
                            {t('manager.collectionPhoto')}
                          </Button>
                        )}
                        {(collection.voiceUrl || collection.remarks) && (
                          <Button
                            onClick={() => setMediaPopup({ type: 'voice', url: collection.voiceUrl || null, remarks: collection.remarks })}
                            variant="secondary"
                            className="h-8 px-3 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 border-none text-[9px] font-black uppercase tracking-widest gap-1.5"
                          >
                            <Volume2 className="h-3 w-3" />
                            {t('manager.remarks')}
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
                      {t('app.viewAll')}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] p-16 text-center shadow-sm border border-gray-100">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ClipboardList className="h-10 w-10 text-gray-300" />
                </div>
                <h4 className="text-xl font-black text-gray-900 font-outfit mb-1 uppercase tracking-tight">{t('app.noData')}</h4>
                <p className="text-sm text-gray-400 font-medium max-w-[200px] mx-auto leading-relaxed">{t('manager.noCollectionsRecorded')}</p>
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
  const { t } = useTranslation();
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
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('manager.selectDate')}</span>
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
            {isToday ? t('manager.today') : new Date(date).toLocaleDateString(undefined, { weekday: 'short' })}
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
  const { t } = useTranslation();
  const [showAbsolute, setShowAbsolute] = React.useState(false);
  const currentPercentage = total > 0 ? (current / total) * 100 : 0;
  const remaining = total - current;
  const remainingPercentage = 100 - currentPercentage;

  const data = [
    { name: t('manager.collected'), value: current, color: '#22c55e' },
    { name: t('dashboard.missed'), value: remaining, color: '#ef4444' },
  ];

  return (
    <PremiumReportCard title={t('manager.collectionEfficiency')}>
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
                <div className="text-[8px] text-gray-400 font-black uppercase">{t('manager.collected')}</div>
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
  const { t } = useTranslation();
  const peakHour = data.reduce((prev, current) => (prev.count > current.count) ? prev : current, data[0]);

  return (
    <PremiumReportCard
      title={t('manager.peakHours')}
      icon={Clock}
      description={t('manager.hourlyDistribution')}
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
  const { t } = useTranslation();
  return (
    <PremiumReportCard title={t('manager.wardBreakdown')}>
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
                <span className="text-[9px] font-bold text-blue-600">Total: {ward.total}</span>
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
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-red-400" /><span className="text-[8px] font-bold text-gray-400 uppercase">{t('manager.nonCollected')}</span></div>
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
            <Bar dataKey="total" fill="#1f1fcbff" name={t('app.total')} radius={[4, 4, 0, 0]}>
              <LabelList dataKey="total" position="top" fill="#9ca3af" fontSize={9} fontWeight={700} />
            </Bar>
            <Bar dataKey="collected" fill="#22c55e" name={t('manager.collected')} radius={[4, 4, 0, 0]}>
              <LabelList dataKey="collected" position="top" fill="#22c55e" fontSize={9} fontWeight={700} />
            </Bar>
            <Bar dataKey="nonCollected" fill="#ef4444" name={t('manager.nonCollected')} radius={[4, 4, 0, 0]}>
              <LabelList dataKey="nonCollected" position="top" fill="#ef4444" fontSize={9} fontWeight={700} />
            </Bar>
          </BarChart>
        </RechartsContainer>
      </div>
    </PremiumReportCard>
  );
};

const WasteMaterialChart = ({ data }: { data: any[] }) => {
  const { t } = useTranslation();
  return (
    <PremiumReportCard title={t('manager.dailyWasteLogs')}>
      <div className="w-full h-72">
        <RechartsContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 30, right: 0, left: 0, bottom: 10 }}>
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

const WasteDiversionGauge = ({ materialData }: { materialData: { wet: number; dry: number; sanitary: number; specialCare: number; mixed: number } }) => {
  const { t } = useTranslation();
  const diverted = materialData.wet + materialData.dry;
  const landfill = materialData.mixed + materialData.sanitary + materialData.specialCare;
  const total = diverted + landfill;
  const diversionRate = total > 0 ? (diverted / total) * 100 : 0;

  const statusColor = diversionRate >= 70 ? '#22c55e' : diversionRate >= 40 ? '#f59e0b' : '#ef4444';
  const statusBg = diversionRate >= 70 ? 'bg-green-50' : diversionRate >= 40 ? 'bg-amber-50' : 'bg-red-50';
  const statusLabel = diversionRate >= 70 ? 'Excellent' : diversionRate >= 40 ? 'Needs Improvement' : 'Critical';

  const gaugeData = [
    { name: t('manager.divertedWetDry'), value: diverted || 0, color: '#22c55e' },
    { name: t('manager.landfill'), value: landfill || (total === 0 ? 1 : 0), color: '#ef4444' },
  ];

  return (
    <PremiumReportCard title={t('manager.diversionRate')}>
      <div className="flex flex-col items-center justify-center">
        {/* Semicircle gauge */}
        <div className="w-full h-32 relative">
          <RechartsContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="85%"
                startAngle={180}
                endAngle={0}
                innerRadius={55}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {gaugeData.map((entry, index) => (
                  <Cell key={`div-cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </RechartsContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
            <span className="text-3xl font-black font-outfit leading-none" style={{ color: statusColor }}>
              {total > 0 ? Math.round(diversionRate) : '—'}<span className="text-sm text-gray-400">{total > 0 ? '%' : ''}</span>
            </span>
            <span className={`text-[8px] font-black uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full ${statusBg}`} style={{ color: statusColor }}>
              {total > 0 ? statusLabel : t('manager.noDataStatus')}
            </span>
          </div>
        </div>

        {/* Diverted vs Landfill legend */}
        <div className="mt-3 grid grid-cols-2 gap-4 w-full">
          <div className="flex justify-center items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-[#22c55e]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-900 leading-none">{diverted.toFixed(1)} kg</span>
              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">Diverted (Wet+Dry)</span>
            </div>
          </div>
          <div className="flex justify-center items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-[#ef4444]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-900 leading-none">{landfill.toFixed(1)} kg</span>
              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">Landfill Stream</span>
            </div>
          </div>
        </div>

        {/* Proportional breakdown bar */}
        {total > 0 && (
          <div className="mt-3 w-full">
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
              {materialData.wet > 0 && <div className="bg-[#22c55e]" style={{ width: `${(materialData.wet / total) * 100}%` }} title={`Wet: ${materialData.wet}kg`} />}
              {materialData.dry > 0 && <div className="bg-[#3b82f6]" style={{ width: `${(materialData.dry / total) * 100}%` }} title={`Dry: ${materialData.dry}kg`} />}
              {materialData.mixed > 0 && <div className="bg-[#6b7280]" style={{ width: `${(materialData.mixed / total) * 100}%` }} title={`Mixed: ${materialData.mixed}kg`} />}
              {materialData.sanitary > 0 && <div className="bg-[#ec4899]" style={{ width: `${(materialData.sanitary / total) * 100}%` }} title={`Sanitary: ${materialData.sanitary}kg`} />}
              {materialData.specialCare > 0 && <div className="bg-[#f59e0b]" style={{ width: `${(materialData.specialCare / total) * 100}%` }} title={`Special Care: ${materialData.specialCare}kg`} />}
            </div>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
              {[
                { label: t('enums.wet'), value: materialData.wet, color: '#22c55e' },
                { label: t('enums.dry'), value: materialData.dry, color: '#3b82f6' },
                { label: t('enums.mixed'), value: materialData.mixed, color: '#6b7280' },
                { label: t('enums.sanitary'), value: materialData.sanitary, color: '#ec4899' },
                { label: t('enums.specialCare'), value: materialData.specialCare, color: '#f59e0b' },
              ].filter(i => i.value > 0).map(item => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[8px] font-bold text-gray-500 uppercase">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PremiumReportCard>
  );
};

const CollectionPerformanceCard = ({ data, dateLabel }: { data: any[]; dateLabel: string }) => {
  const { t } = useTranslation();
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
                  <span>{t('manager.start')}: {startTime}</span>
                  <span>{t('manager.end')}: {endTime}</span>
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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();


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
    onError: (_error: unknown) => {
      toast({
        title: t("messages.operationFailed"),
        description: t('app.error'),
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
  const { t } = useTranslation();
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
  isLoading,
  villageName,
  villageId,
  managerName
}: {
  filters: any;
  updateFilter: (k: any, v: any) => void;
  reportData: any;
  isLoading: boolean;
  villageName: string;
  villageId: string;
  managerName: string;
}) => {
  const [pdfGenerating, setPdfGenerating] = React.useState(false);
  const [pdfProgress, setPdfProgress] = React.useState("");
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDownloadPDF = async () => {
    if (!reportData || pdfGenerating) return;
    setPdfGenerating(true);
    setPdfProgress(t('app.loading'));
    try {
      // Fetch attendance for all worker types in parallel
      let attendance: PDFReportData['attendance'] | undefined;
      try {
        const [colRes, helpRes, segRes] = await Promise.all([
          fetch(`/api/attendance/daily?date=${targetDate}&workerType=collector`, { credentials: 'include' }),
          fetch(`/api/attendance/daily?date=${targetDate}&workerType=helper`, { credentials: 'include' }),
          fetch(`/api/attendance/daily?date=${targetDate}&workerType=segregator`, { credentials: 'include' }),
        ]);
        const [colData, helpData, segData] = await Promise.all([
          colRes.ok ? colRes.json() : { workers: [] },
          helpRes.ok ? helpRes.json() : { workers: [] },
          segRes.ok ? segRes.json() : { workers: [] },
        ]);
        attendance = {
          collectors: (colData.workers || []).map((w: any) => ({ workerName: w.workerName, attendance: w.attendance })),
          helpers: (helpData.workers || []).map((w: any) => ({ workerName: w.workerName, attendance: w.attendance })),
          segregators: (segData.workers || []).map((w: any) => ({ workerName: w.workerName, attendance: w.attendance })),
        };
      } catch { /* attendance not available — PDF will show fallback */ }

      const pdfData: PDFReportData = {
        villageName,
        villageId,
        date: targetDate,
        managerName,
        kpis: reportData.kpis,
        pulses: reportData.pulses,
        wardPerformance: reportData.wardPerformance,
        materialData: reportData.materialData,
        vehicleStats: reportData.vehicleStats,
        collectionTimeline: reportData.collectionTimeline,
        attendance,
      };
      await generateDailyReportPDF(pdfData, setPdfProgress);
      toast({ title: "✅ Daily report PDF downloaded!" });
    } catch (_err) {
      toast({ title: t('app.error'), variant: "destructive" });
    } finally {
      setPdfGenerating(false);
      setPdfProgress("");
    }
  };
  const targetDate = useMemo(() => {
    if (filters.date) return filters.date;
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(Date.now() + istOffset);
    return nowIst.toISOString().split('T')[0];
  }, [filters.date]);

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
    { name: t('enums.wet'), value: materialData.wet, color: '#22c55e' },
    { name: t('enums.dry'), value: materialData.dry, color: '#3b82f6' },
    { name: t('enums.sanitary'), value: materialData.sanitary, color: '#ec4899' },
    { name: t('enums.specialCare'), value: materialData.specialCare, color: '#f59e0b' },
    { name: t('enums.mixed'), value: materialData.mixed, color: '#6b7280' },
  ];

  return (
    <div className="bg-green-50 flex flex-col min-h-screen pb-5">
      <StickyDateSwitcher
        date={targetDate}
        onChange={(d) => updateFilter("date", d)}
      />

      {/* PDF Download Button */}
      {reportData && (
        <div className="flex justify-center mb-2">
          <button
            onClick={handleDownloadPDF}
            disabled={pdfGenerating}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${pdfGenerating
              ? 'bg-gray-100 text-gray-400 cursor-wait'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md'
              }`}
          >
            {pdfGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                {pdfProgress || t('manager.generatingPdf')}
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Download PDF Report
              </>
            )}
          </button>
        </div>
      )}

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
                {kpis.collectedToday >= kpis.totalHouseholds * 0.9 ? t('manager.outstandingCoverage') : t('manager.improveCoverage')}
              </div>
              <p className="text-[11px] font-bold text-gray-500 leading-relaxed uppercase tracking-tight">
                {kpis.collectedToday >= kpis.totalHouseholds * 0.9
                  ? t('manager.outstandingCoverageDesc')
                  : t('manager.improveCoverageDesc')}
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

        {/* Section 3.5: Waste Diversion Rate */}
        <section>
          {materialData.isLogged ? (
            <WasteDiversionGauge materialData={materialData} />
          ) : (
            <PremiumReportCard title={t('manager.diversionRate')}>
              <div className="text-center py-8">
                <div className="flex justify-center items-center gap-2 mb-4">
                  <TrendingUp className="h-8 w-8 text-gray-300" />
                </div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Diversion rate will appear once daily waste type entries are logged</div>
              </div>
            </PremiumReportCard>
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

// ═══════════════════════════════════════════
// Household Performance Monitor
// ═══════════════════════════════════════════
const DEFAULT_THRESHOLDS = { minAvgRating: 3, maxMixed7Days: 3, maxInactiveDays: 21 };

function getHouseholdFlag(stats: any, thresholds: any) {
  if (stats.totalCollections === 0) return { flag: 'no_data', reasons: ['No collections recorded'] };

  const reasons: string[] = [];
  const t = thresholds || DEFAULT_THRESHOLDS;

  if (stats.avgRatingLast10 && parseFloat(stats.avgRatingLast10) < t.minAvgRating) {
    reasons.push(`Avg rating ${parseFloat(stats.avgRatingLast10).toFixed(1)} (min: ${t.minAvgRating})`);
  }
  if (stats.mixedCountLast7 > t.maxMixed7Days) {
    reasons.push(`Mixed waste ${stats.mixedCountLast7}x this week (max: ${t.maxMixed7Days})`);
  }
  // Only apply inactivity when totalCollections >= 3
  if (stats.totalCollections >= 3 && stats.daysSinceLastCollection > t.maxInactiveDays) {
    reasons.push(`Inactive for ${stats.daysSinceLastCollection} days (max: ${t.maxInactiveDays})`);
  }

  return reasons.length > 0
    ? { flag: 'needs_attention', reasons }
    : { flag: 'good', reasons: [] };
}

function HouseholdPerformance({ onBack, villageId }: { onBack: () => void; villageId: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<string>('all_flagged');
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [thresholdForm, setThresholdForm] = useState(DEFAULT_THRESHOLDS);
  const [selectedHousehold, setSelectedHousehold] = useState<any>(null);

  // Fetch stats + thresholds
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/behaviour/stats', villageId, wardFilter],
    queryFn: async () => {
      const url = wardFilter !== 'all'
        ? `/api/behaviour/stats?ward=${encodeURIComponent(wardFilter)}`
        : '/api/behaviour/stats';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
  });

  const updateThresholdsMutation = useMutation({
    mutationFn: async (t: any) => {
      const response = await apiRequest('PUT', '/api/behaviour/thresholds', t);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Thresholds updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/behaviour/stats'] });
      setShowSettings(false);
    },
    onError: () => {
      toast({ title: 'Failed to update', variant: 'destructive' });
    },
  });

  const stats = data?.stats || [];
  const thresholds = data?.thresholds || DEFAULT_THRESHOLDS;

  // Compute flags for each household
  const flaggedStats = stats.map((s: any) => ({
    ...s,
    ...getHouseholdFlag(s, thresholds),
    participationRate: Math.round((s.collectionsLast7 / 7) * 100),
  }));

  const needsAttention = flaggedStats.filter((s: any) => s.flag === 'needs_attention');
  const good = flaggedStats.filter((s: any) => s.flag === 'good');
  const noData = flaggedStats.filter((s: any) => s.flag === 'no_data');

  // Apply filter
  const filtered = (() => {
    switch (activeFilter) {
      case 'all_flagged': return needsAttention;
      case 'low_rating': return needsAttention.filter((s: any) =>
        s.avgRatingLast10 && parseFloat(s.avgRatingLast10) < thresholds.minAvgRating);
      case 'mixed_waste': return needsAttention.filter((s: any) =>
        s.mixedCountLast7 > thresholds.maxMixed7Days);
      case 'inactive': return needsAttention.filter((s: any) =>
        s.totalCollections >= 3 && s.daysSinceLastCollection > thresholds.maxInactiveDays);
      case 'never': return noData;
      case 'good': return good;
      default: return needsAttention;
    }
  })();

  // Get unique wards
  const wards = Array.from(new Set(stats.map((s: any) => s.ward))).sort() as string[];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 pb-2">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-sm font-black uppercase tracking-tight text-gray-900 flex-1">Household Performance</h2>
        <button onClick={() => { setThresholdForm(thresholds); setShowSettings(true); }}
          className="p-1.5 rounded-full hover:bg-gray-100">
          <Settings className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Summary counters */}
      <div className="flex gap-2 px-3 pb-2">
        <button onClick={() => setActiveFilter('all_flagged')}
          className={`flex-1 rounded-xl p-2 text-center transition-all ${activeFilter === 'all_flagged' ? 'ring-2 ring-red-400' : ''} bg-red-50`}>
          <div className="text-lg font-bold text-red-700">{needsAttention.length}</div>
          <div className="text-[10px] font-bold text-red-600 uppercase">Attention</div>
        </button>
        <button onClick={() => setActiveFilter('good')}
          className={`flex-1 rounded-xl p-2 text-center transition-all ${activeFilter === 'good' ? 'ring-2 ring-green-400' : ''} bg-green-50`}>
          <div className="text-lg font-bold text-green-700">{good.length}</div>
          <div className="text-[10px] font-bold text-green-600 uppercase">Good</div>
        </button>
        <button onClick={() => setActiveFilter('never')}
          className={`flex-1 rounded-xl p-2 text-center transition-all ${activeFilter === 'never' ? 'ring-2 ring-gray-400' : ''} bg-gray-50`}>
          <div className="text-lg font-bold text-gray-700">{noData.length}</div>
          <div className="text-[10px] font-bold text-gray-500 uppercase">No Data</div>
        </button>
        <div className="flex-1 bg-blue-50 rounded-xl p-2 text-center">
          <div className="text-lg font-bold text-blue-700">{stats.length}</div>
          <div className="text-[10px] font-bold text-blue-500 uppercase">{t('app.total')}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto">
        {[
          { id: 'all_flagged', label: t('householdPerformance.allFlagged') },
          { id: 'low_rating', label: t('householdPerformance.lowRating') },
          { id: 'mixed_waste', label: t('householdPerformance.mixedWaste') },
          { id: 'inactive', label: t('householdPerformance.inactive') },
          { id: 'never', label: t('householdPerformance.never') },
          { id: 'good', label: t('householdPerformance.good') },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveFilter(id)}
            className={`px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all ${activeFilter === id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Ward filter */}
      {wards.length > 1 && (
        <div className="px-3 pb-2">
          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="w-full text-xs border rounded-lg px-2 py-1.5 bg-gray-50"
          >
            <option value="all">{t('householdPerformance.allWards')}</option>
            {wards.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No households in this category</p>
          </div>
        ) : (
          filtered.map((h: any) => (
            <div key={h.householdId} className="bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:border-gray-400 transition-colors" onClick={() => setSelectedHousehold(h)}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-bold text-gray-800">{h.headName}</p>
                  <p className="text-[10px] text-gray-400">
                    {h.houseNumber ? `#${h.houseNumber} · ` : ''}{h.ward} · {h.uid}
                  </p>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${h.flag === 'needs_attention' ? 'bg-red-100 text-red-700' :
                  h.flag === 'good' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                  {h.flag === 'needs_attention' ? '🔴' : h.flag === 'good' ? '🟢' : '⚪'}
                </div>
              </div>

              {/* Flag reasons */}
              {h.reasons.length > 0 && h.flag === 'needs_attention' && (
                <div className="space-y-0.5 mb-2">
                  {h.reasons.map((r: string, i: number) => (
                    <p key={i} className="text-[11px] text-red-600 font-medium">⚠ {r}</p>
                  ))}
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                {h.lastCollectionDate ? (
                  <span>Last: {h.daysSinceLastCollection === 0 ? 'today' :
                    h.daysSinceLastCollection === 1 ? 'yesterday' :
                      `${h.daysSinceLastCollection}d ago`}
                    {h.lastCollectionType === 'mixed' ? ' 🟤' : ' 🟢'}
                  </span>
                ) : (
                  <span>{t('householdPerformance.neverCollected')}</span>
                )}
                <span className="text-gray-300">|</span>
                <span>⭐{h.avgRatingLast10 ? parseFloat(h.avgRatingLast10).toFixed(1) : '—'}</span>
                <span className="text-gray-300">|</span>
                <span>7d: {h.collectionsLast7}</span>
                <span className="text-gray-300">|</span>
                <span>{h.participationRate}%</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Household Detail Dialog */}
      <Dialog open={!!selectedHousehold} onOpenChange={() => setSelectedHousehold(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          {selectedHousehold && (
            <div className="space-y-4">
              {/* Header: Name + UID */}
              <div className="text-center border-b pb-3">
                <h3 className="text-lg font-bold text-gray-900">{selectedHousehold.headName}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  UID: {selectedHousehold.uid}
                  {selectedHousehold.houseNumber && ` · House #${selectedHousehold.houseNumber}`}
                  {selectedHousehold.ward && ` · ${selectedHousehold.ward}`}
                </p>
                {selectedHousehold.address && (
                  <p className="text-xs text-gray-400 mt-1">{selectedHousehold.address}</p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-gray-800">{selectedHousehold.totalCollections}</div>
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">Total Collections</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-gray-800">⭐ {selectedHousehold.avgRatingLast10 ? parseFloat(selectedHousehold.avgRatingLast10).toFixed(1) : '—'}</div>
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">Avg Rating</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-gray-800">{selectedHousehold.collectionsLast7}</div>
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">Last 7 Days</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-gray-800">{selectedHousehold.collectionsLast30}</div>
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">Last 30 Days</div>
                </div>
              </div>

              {/* Reasons (why flagged) */}
              {selectedHousehold.flag === 'needs_attention' && selectedHousehold.reasons.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-red-700 uppercase mb-2">⚠ Needs Attention</p>
                  {selectedHousehold.reasons.map((r: string, i: number) => (
                    <p key={i} className="text-sm text-red-600 mb-1">• {r}</p>
                  ))}
                </div>
              )}
              {selectedHousehold.flag === 'good' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-sm font-bold text-green-700">🟢 Good Standing</p>
                  <p className="text-xs text-green-600 mt-1">This household is meeting all thresholds</p>
                </div>
              )}
              {selectedHousehold.flag === 'no_data' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-sm font-bold text-gray-600">⚪ No Collection Data</p>
                  <p className="text-xs text-gray-500 mt-1">This household has not had any recorded collections</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 border-t">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    if (selectedHousehold.latitude && selectedHousehold.longitude) {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${selectedHousehold.latitude},${selectedHousehold.longitude}`,
                        '_blank'
                      );
                    } else if (selectedHousehold.address) {
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedHousehold.address)}`,
                        '_blank'
                      );
                    } else {
                      toast({ title: 'No location data', description: 'This household has no address or coordinates', variant: 'destructive' });
                    }
                  }}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Visit
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (selectedHousehold.phone) {
                      window.open(`tel:${selectedHousehold.phone}`);
                    } else {
                      toast({ title: 'No phone number', description: 'This household has no phone number on file', variant: 'destructive' });
                    }
                  }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Threshold settings dialog */}
      {showSettings && (
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('householdPerformance.monitoringThresholds')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Configure when a household gets flagged for attention.</p>
              <div>
                <Label>{t('householdPerformance.minAvgRating')}</Label>
                <Input type="number" min={1} max={5} step={0.5}
                  value={thresholdForm.minAvgRating}
                  onChange={(e) => setThresholdForm({ ...thresholdForm, minAvgRating: parseFloat(e.target.value) })} />
              </div>
              <div>
                <Label>{t('householdPerformance.maxMixed7Days')}</Label>
                <Input type="number" min={0}
                  value={thresholdForm.maxMixed7Days}
                  onChange={(e) => setThresholdForm({ ...thresholdForm, maxMixed7Days: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label>{t('householdPerformance.maxInactiveDays')}</Label>
                <Input type="number" min={1}
                  value={thresholdForm.maxInactiveDays}
                  onChange={(e) => setThresholdForm({ ...thresholdForm, maxInactiveDays: parseInt(e.target.value) })} />
              </div>
              <Button
                onClick={() => updateThresholdsMutation.mutate(thresholdForm)}
                disabled={updateThresholdsMutation.isPending}
                className="w-full"
              >
                {updateThresholdsMutation.isPending ? t('app.saving') : t('householdPerformance.saveThresholds')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// Staff Screen — Manage Helpers & Segregators
// ═══════════════════════════════════════════
const WORK_TYPE_OPTIONS = [
  { value: 'compost_helper', label: 'Compost Helper' },
  { value: 'sweeper', label: 'Sweeper' },
  { value: 'driver', label: 'Driver' },
  { value: 'loader', label: 'Loader' },
  { value: 'garden_worker', label: 'Garden Worker' },
  { value: 'drain_cleaner', label: 'Drain Cleaner' },
];

function StaffScreen({ onBack, staffType, title }: { onBack: () => void; staffType: 'helper' | 'segregator'; title: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [workType, setWorkType] = useState('compost_helper');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState('');

  const { data: staff = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/staff', staffType],
    queryFn: async () => {
      const res = await fetch(`/api/staff?type=${staffType}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/staff', {
        name,
        phone: phone || undefined,
        staffType,
        workType: staffType === 'helper' ? workType : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `${staffType === 'helper' ? 'Helper' : 'Segregator'} Added`, description: data.name });
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      setShowForm(false);
      setName('');
      setPhone('');
    },
    onError: () => {
      toast({ title: 'Failed to add staff', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/staff/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({ title: 'Staff removed' });
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 pb-2">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-sm font-black uppercase tracking-tight text-gray-900 flex-1">{title}</h2>
        <span className="text-xs text-gray-400 font-bold">{staff.length} total</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
        ) : staff.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No {title.toLowerCase()} added yet</p>
          </div>
        ) : (
          staff.map((s: any) => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                {s.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{s.name}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-gray-400 uppercase">{s.uid}</p>
                  {s.workType && (
                    <span className="text-[9px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded-full uppercase">
                      {s.workType.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
              {s.phone && (
                <a
                  href={`tel:${s.phone}`}
                  className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 hover:bg-green-100 active:scale-95 transition-all flex-shrink-0"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                onClick={() => {
                  setConfirmDeleteId(s.id);
                  setConfirmDeleteName(s.name);
                }}
                className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 active:scale-95 transition-all flex-shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100"
        >
          + Add {staffType === 'helper' ? t('manager.helpers') : t('manager.segregators')}
        </button>
      </div>

      {showForm && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{staffType === 'helper' ? t('staff.addHelper') : t('staff.addSegregator')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('staff.fullName')}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("staff.fullName")} />
              </div>
              <div>
                <Label>{t('staff.mobileNumber')}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" type="tel" />
              </div>
              {staffType === 'helper' && (
                <div>
                  <Label>{t('staff.workType')}</Label>
                  <select
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    {WORK_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!name.trim() || createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? t('manager.adding') : `Add ${staffType === 'helper' ? 'Helper' : 'Segregator'}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
        title={`Remove ${confirmDeleteName}?`}
        description={t('manager.removeStaffDesc')}
        confirmLabel={t('app.delete')}
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteId !== null) deleteMutation.mutate(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// Attendance Screen — Mark attendance + view shifts
// ═══════════════════════════════════════════
function AttendanceScreen({ onBack, villageId, mode = 'mark' }: { onBack: () => void; villageId: string; mode?: 'centers' | 'mark' | 'shifts' }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [workerType, setWorkerType] = useState<'collector' | 'helper' | 'segregator'>('collector');
  const [attDate, setAttDate] = useState(() => {
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(Date.now() + istOffset).toISOString().split('T')[0];
  });
  const [showCenterForm, setShowCenterForm] = useState(false);
  const [centerName, setCenterName] = useState('');
  const [centerRadius, setCenterRadius] = useState('200');
  const [rotateConfirm, setRotateConfirm] = useState<number | null>(null);

  // Fetch daily attendance + shift data
  const { data: dailyData, isLoading } = useQuery<any>({
    queryKey: ['/api/attendance/daily', villageId, attDate, workerType],
    enabled: mode !== 'centers',
    queryFn: async () => {
      const response = await fetch(`/api/attendance/daily?date=${attDate}&workerType=${workerType}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch attendance');
      return response.json();
    },
  });

  // Fetch centers
  const { data: centers = [] } = useQuery<any[]>({
    queryKey: ['/api/attendance/centers', villageId],
    queryFn: async () => {
      const response = await fetch('/api/attendance/centers', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
  });

  // Mark attendance mutation
  const markMutation = useMutation({
    mutationFn: async (data: { workerId: string; workerName: string; status: string }) => {
      const response = await apiRequest('POST', '/api/attendance/mark', {
        ...data,
        attendanceDate: attDate,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/daily'] });
    },
    onError: () => {
      toast({ title: 'Failed to mark attendance', variant: 'destructive' });
    },
  });

  // Create center mutation
  const createCenterMutation = useMutation({
    mutationFn: async () => {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
        });
      });
      const response = await apiRequest('POST', '/api/attendance/centers', {
        name: centerName,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        radiusMeters: parseInt(centerRadius) || 200,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Center Created', description: `${data.name} — QR poster downloading...` });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/centers'] });
      setShowCenterForm(false);
      setCenterName('');
      // Auto-download QR poster for new center
      setTimeout(() => window.open(`/api/attendance/centers/${data.id}/qr`, '_blank'), 500);
    },
    onError: (_error: unknown) => {
      toast({ title: 'Failed', description: 'Could not create center. Please try again.', variant: 'destructive' });
    },
  });

  // Rotate QR mutation
  const rotateMutation = useMutation({
    mutationFn: async (centerId: number) => {
      const response = await apiRequest('PUT', `/api/attendance/centers/${centerId}/rotate-qr`);
      return response.json();
    },
    onSuccess: (_data, centerId) => {
      toast({ title: 'QR Rotated', description: 'New QR poster downloading. Please remove the old one and print this.' });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/centers'] });
      setRotateConfirm(null);
      // Auto-download new QR after rotation
      setTimeout(() => window.open(`/api/attendance/centers/${centerId}/qr`, '_blank'), 500);
    },
    onError: () => {
      toast({ title: 'Failed to rotate QR', variant: 'destructive' });
    },
  });

  const workers = dailyData?.workers || [];
  const presentCount = workers.filter((w: any) => w.attendance === 'present').length;
  const halfCount = workers.filter((w: any) => w.attendance === 'half_day').length;
  const absentCount = workers.filter((w: any) => w.attendance === 'absent').length;

  // Worker type toggle (for mark and shifts modes)
  const WorkerTypeToggle = () => (
    <div className="flex mx-3 mb-3 bg-gray-100 rounded-xl p-1">
      {([
        { type: 'collector' as const, label: t('manager.collectors') },
        { type: 'helper' as const, label: t('manager.helpers') },
        { type: 'segregator' as const, label: t('manager.segregators') },
      ]).map(({ type, label }) => (
        <button
          key={type}
          onClick={() => setWorkerType(type)}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${workerType === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 pb-2">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-sm font-black uppercase tracking-tight text-gray-900 flex-1">
          {mode === 'centers' ? t('manager.attendanceCenters') : mode === 'mark' ? 'Mark Attendance' : 'View Shifts'}
        </h2>
        {mode !== 'centers' && (
          <input
            type="date"
            value={attDate}
            onChange={(e) => setAttDate(e.target.value)}
            className="text-xs border rounded-lg px-2 py-1.5 bg-gray-50"
          />
        )}
      </div>

      {/* ── CENTERS MODE ── */}
      {mode === 'centers' && (
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">
          {centers.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No attendance centers yet</p>
            </div>
          ) : (
            centers.map((c: any) => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{c.name}</p>
                    <p className="text-[10px] text-gray-400">{c.radiusMeters}m radius</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(`/api/attendance/centers/${c.id}/qr`, '_blank')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download QR
                  </button>
                  <button
                    onClick={() => setRotateConfirm(c.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-[11px] font-bold border border-orange-200 active:scale-95 transition-all"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Rotate QR
                  </button>
                </div>
              </div>
            ))
          )}
          <button
            onClick={() => setShowCenterForm(true)}
            className="w-full py-2.5 text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100"
          >
            + Add Attendance Center
          </button>
        </div>
      )}

      {/* ── MARK MODE ── */}
      {mode === 'mark' && (
        <>
          {/* Summary */}
          <div className="flex gap-2 px-3 pb-2">
            <div className="flex-1 bg-green-50 rounded-xl p-2 text-center">
              <div className="text-lg font-bold text-green-700">{presentCount}</div>
              <div className="text-[10px] font-bold text-green-600 uppercase">Present</div>
            </div>
            <div className="flex-1 bg-yellow-50 rounded-xl p-2 text-center">
              <div className="text-lg font-bold text-yellow-700">{halfCount}</div>
              <div className="text-[10px] font-bold text-yellow-600 uppercase">Half Day</div>
            </div>
            <div className="flex-1 bg-red-50 rounded-xl p-2 text-center">
              <div className="text-lg font-bold text-red-700">{absentCount}</div>
              <div className="text-[10px] font-bold text-red-600 uppercase">Absent</div>
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
              <div className="text-lg font-bold text-gray-700">{workers.length}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">Total</div>
            </div>
          </div>

          <WorkerTypeToggle />

          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
            {isLoading ? (
              <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
            ) : workers.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No {workerType}s found</p>
              </div>
            ) : (
              workers.map((worker: any) => (
                <div key={worker.workerId} className="bg-white border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{worker.workerName}</p>
                      <p className="text-[10px] text-gray-400 uppercase">
                        {worker.workerId}
                        {worker.workType && ` · ${worker.workType.replace(/_/g, ' ')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[
                      { status: 'present', label: t('attendance.present'), bg: 'bg-green-500', bgOut: 'bg-green-50 text-green-700 border border-green-200' },
                      { status: 'half_day', label: t('attendance.halfDay'), bg: 'bg-yellow-500', bgOut: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
                      { status: 'absent', label: t('attendance.absent'), bg: 'bg-red-500', bgOut: 'bg-red-50 text-red-700 border border-red-200' },
                    ].map(({ status, label, bg, bgOut }) => (
                      <button
                        key={status}
                        onClick={() => markMutation.mutate({ workerId: worker.workerId, workerName: worker.workerName, status })}
                        disabled={markMutation.isPending}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${worker.attendance === status ? `${bg} text-white shadow-sm` : bgOut
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── SHIFTS MODE ── */}
      {mode === 'shifts' && (
        <>
          <WorkerTypeToggle />

          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
            {isLoading ? (
              <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
            ) : workers.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No {workerType}s found</p>
              </div>
            ) : (
              workers.map((worker: any) => (
                <div key={worker.workerId} className="bg-white border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{worker.workerName}</p>
                      {worker.workType && <p className="text-[10px] text-gray-400">{worker.workType.replace(/_/g, ' ')}</p>}
                    </div>
                    {worker.shifts.length > 0 ? (
                      <Badge className="bg-green-100 text-green-700 text-[10px]">
                        {worker.shifts.length} shift{worker.shifts.length > 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-500 text-[10px]">No shifts</Badge>
                    )}
                  </div>
                  {worker.shifts.length > 0 ? (
                    <div className="space-y-1.5">
                      {worker.shifts.map((shift: any) => {
                        const startTime = shift.startedAt
                          ? new Date(shift.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                          : '—';
                        const endTime = shift.endedAt
                          ? new Date(shift.endedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                          : null;
                        const durationMin = shift.startedAt && shift.endedAt
                          ? Math.round((new Date(shift.endedAt).getTime() - new Date(shift.startedAt).getTime()) / 60000)
                          : null;
                        const durationH = durationMin ? Math.floor(durationMin / 60) : null;
                        const durationM = durationMin ? durationMin % 60 : null;

                        return (
                          <div key={shift.shiftNumber} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-xs font-bold text-gray-700">Shift #{shift.shiftNumber}</p>
                              <p className="text-[11px] text-gray-500">
                                {startTime} → {endTime || <span className="text-green-600 font-bold animate-pulse">Active</span>}
                              </p>
                            </div>
                            <div>
                              {durationMin != null ? (
                                <Badge className="bg-blue-50 text-blue-700 text-[10px]">
                                  {durationH! > 0 ? `${durationH}h ` : ''}{durationM}m
                                </Badge>
                              ) : !shift.endedAt ? (
                                <Badge className="bg-green-100 text-green-700 text-[10px] animate-pulse">Active</Badge>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic">No shift scans recorded for this date</p>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Center creation dialog */}
      {showCenterForm && (
        <Dialog open={showCenterForm} onOpenChange={setShowCenterForm}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('attendance.addCenter')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Stand at the center location and tap create. Your current GPS will be used.</p>
              <div>
                <Label>{t('attendance.centerName')}</Label>
                <Input value={centerName} onChange={(e) => setCenterName(e.target.value)} placeholder="e.g. Main Depot" />
              </div>
              <div>
                <Label>{t('attendance.centerRadius')}</Label>
                <Input type="number" value={centerRadius} onChange={(e) => setCenterRadius(e.target.value)} placeholder="200" />
              </div>
              <Button
                onClick={() => createCenterMutation.mutate()}
                disabled={!centerName || createCenterMutation.isPending}
                className="w-full"
              >
                {createCenterMutation.isPending ? t('manager.creating') : t('attendance.addCenter')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* QR Rotation confirmation dialog */}
      {rotateConfirm !== null && (
        <Dialog open={rotateConfirm !== null} onOpenChange={() => setRotateConfirm(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('attendance.rotateQr')}?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800 font-medium">⚠️ Please note:</p>
                <ul className="text-xs text-orange-700 mt-1 space-y-1 list-disc list-inside">
                  <li>{t('attendance.rotateDesc')}</li>
                  <li>{t('attendance.rotateDesc')}</li>
                  <li>{t('attendance.rotateDesc')}</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setRotateConfirm(null)}>{t('app.cancel')}</Button>
                <Button
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  disabled={rotateMutation.isPending}
                  onClick={() => rotateMutation.mutate(rotateConfirm)}
                >
                  {rotateMutation.isPending ? t('app.loading') : t('attendance.rotateQr')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

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
  const [sliderRadius, setSliderRadius] = useState<number | null>(null);
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
  const [collectionsDate, setCollectionsDate] = useState(() => {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(Date.now() + istOffset);
    return nowIst.toISOString().split('T')[0];
  });
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
      const istOffset = 5.5 * 60 * 60 * 1000;
      const nowIst = new Date(Date.now() + istOffset);
      const defaultDate = nowIst.toISOString().split('T')[0];
      const date = filters.date || defaultDate;
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
          src="/api/qr-codes/${h.uid}/image" 
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

      toast({ title: t('app.success') });

    } catch (_err) {
      toast({
        title: t('app.error'),
        variant: "destructive",
      });
    }
  };




  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingHousehold, setDeletingHousehold] = useState<Household | null>(null);

  const deleteHouseholdMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/households/${id}`),
    onSuccess: () => {
      toast({ title: t('app.success') });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      setShowDeleteConfirm(false);
      setShowHouseholdDetails(false);
    },
    onError: (_error: unknown) => {
      toast({
        title: t('app.error'),
        description: t('app.error'),
        variant: "destructive",
      });
    },
  });

  const handleLocateHousehold = (h: Household) => {
    if (h.latitude && h.longitude) {
      window.open(`https://www.google.com/maps?q=${h.latitude},${h.longitude}`, '_blank');
    } else {
      toast({
        title: t('app.error'),
        description: t('app.error'),
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
  const totalHouseholdsCount = households?.length ?? 0;

  const { data: collectorStats = [] } = useQuery<CollectorStats[]>({
    queryKey: ["/api/collectors/stats", user?.villageId],
    enabled: !!user?.villageId,
  });

  // Fetch ALL waste collections at once (no pagination) for accurate aggregates and reports
  // (Fetched above to support useMemo)

  // Total collections count is the actual length since we fetch all
  const totalCollectionsCount = allCollections?.length ?? 0;

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
      toast({ title: t('app.success') });
      queryClient.invalidateQueries({ queryKey: ["/api/issues/paginated"] });
      setShowIssueDialog(false);
    },
    onError: (_error: unknown) => {
      toast({
        title: t('app.error'),
        description: t('app.error'),
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
        title: t('app.success'),
        description: `User ID: ${data.userId}, Password: ${data.userId}`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fieldworkers"] });
      setShowCreateFieldWorkerDialog(false);
      setNewFieldWorkerName("");
      setNewFieldWorkerPhone("");
    },
    onError: (_error: unknown) => {
      toast({ title: t('app.error'), description: "Please try again.", variant: "destructive" });
    },
  });

  const deleteFieldWorkerMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/fieldworkers/${userId}`);
    },
    onSuccess: () => {
      toast({ title: t('app.success') });
      queryClient.invalidateQueries({ queryKey: ["/api/fieldworkers"] });
    },
    onError: (_error: unknown) => {
      toast({ title: t('app.error'), description: "Please try again.", variant: "destructive" });
    },
  });

  // Batch QR generation mutation
  const generateBatchQRMutation = useMutation({
    mutationFn: async (quantity: number) => {
      const response = await apiRequest("POST", "/api/qr-codes/batch", { quantity });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: t('app.success'), description: `Batch ${data.batchId} with ${data.qrCodes.length} QR codes created` });
      queryClient.invalidateQueries({ queryKey: ["/api/qr-codes"] });
    },
    onError: (_error: unknown) => {
      toast({ title: t('app.error'), description: "Please try again.", variant: "destructive" });
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
      toast({ title: t('app.success') });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setAnnouncementMessage("");

    },
    onError: () => {
      toast({ title: t('app.error'), variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiRequest("PUT", "/api/profile", data),
    onSuccess: () => {
      toast({ title: t('app.success') });
      setShowPasswordDialog(false);
    },
    onError: (_error: unknown) => {
      toast({
        title: t('app.error'),
        description: t('app.error'),
        variant: "destructive"
      });
    },
  });

  const addWardMutation = useMutation({
    mutationFn: (wardName: string) =>
      apiRequest("POST", `/api/villages/${user?.villageId}/wards`, { ward: wardName }),
    onSuccess: () => {
      toast({ title: t('app.success') });
      queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId, "wards"] });
      setNewWard("");
      setShowWardForm(false);
    },
    onError: (_error: unknown) => {
      toast({
        title: t('app.error'),
        description: t('app.error'),
        variant: "destructive",
      });
    },
  });

  // Vehicle Mutations
  const addVehicleMutation = useMutation({
    mutationFn: (data: { registrationNumber: string; name: string; collectorIds: number[] }) =>
      apiRequest("POST", `/api/villages/${user?.villageId}/vehicles`, data),
    onSuccess: () => {
      toast({ title: t('app.success') });
      queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
      queryClient.invalidateQueries({ queryKey: ["/api/collectors", user?.villageId] });
      setNewVehicleReg("");
      setNewVehicleName("");
      setSelectedVehicleCollectors([]);
      setShowVehicleForm(false);
    },
    onError: (_error: unknown) => {
      toast({ title: t('app.error'), description: "Failed to add vehicle. Please try again.", variant: "destructive" });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: (data: { registrationNumber: string; name: string; collectorIds: number[] }) =>
      apiRequest("PATCH", `/api/villages/${user?.villageId}/vehicles/${data.registrationNumber}`, {
        name: data.name,
        collectorIds: data.collectorIds
      }),
    onSuccess: () => {
      toast({ title: t('app.success') });
      queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
      queryClient.invalidateQueries({ queryKey: ["/api/collectors", user?.villageId] });
      setEditingVehicle(null);
      setNewVehicleReg("");
      setNewVehicleName("");
      setSelectedVehicleCollectors([]);
      setShowVehicleForm(false);
    },
    onError: (_error: unknown) => {
      toast({ title: t('app.error'), description: "Failed to update vehicle. Please try again.", variant: "destructive" });
    },
  });

  const removeVehicleMutation = useMutation({
    mutationFn: (regNumber: string) =>
      apiRequest("DELETE", `/api/villages/${user?.villageId}/vehicles/${regNumber}`),
    onSuccess: () => {
      toast({ title: t('app.success') });
      queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
      queryClient.invalidateQueries({ queryKey: ["/api/collectors", user?.villageId] });
    },
  });

  const updateCollectorVehicleMutation = useMutation({
    mutationFn: (data: { collectorId: number; registrationNumber: string | null }) =>
      apiRequest("PATCH", `/api/collectors/${data.collectorId}/vehicle`, { registrationNumber: data.registrationNumber }),
    onSuccess: () => {
      toast({ title: t('app.success') });
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
                      <SelectValue placeholder={t("manager.selectVehicle")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('vehicles.noVehiclesYet')}</SelectItem>
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
                className="hidden md:block h-12 w-auto flex-shrink-0"
              />
              <div className="sm:pl-10 flex flex-col justify-center min-w-0">
                <span className="text-[10px] sm:text-[12px] text-green-600 font-bold uppercase tracking-widest leading-none truncate">
                  {villageData?.name || "GreenPath"}
                </span>
                <span className="text-lg font-bold text-gray-900 leading-tight truncate">
                  {activeMoreScreen === "household-details" ? t('manager.householdDetails')
                    : activeMoreScreen === "generate-qr" ? t('manager.generateQr')
                      : activeMoreScreen === "download-qr" ? t('manager.downloadQr')
                        : activeMoreScreen === "collectors" ? t('manager.collectors')
                          : activeMoreScreen === "fieldworkers" ? t('manager.fieldWorkers')
                            : activeMoreScreen === "helpers" ? t('manager.helpers')
                              : activeMoreScreen === "segregators" ? t('manager.segregators')
                                : activeMoreScreen === "announcements" ? t('manager.announcements')
                                  : activeMoreScreen === "daily-waste-logs" ? t('manager.dailyWasteLogs')
                                    : activeMoreScreen === "compost-logs" ? t('manager.compostLogs')
                                      : activeMoreScreen === "sales-logs" ? t('manager.salesLogs')
                                        : activeMoreScreen === "vehicles" ? t('manager.vehicleManagement')
                                          : activeMoreScreen === "wards" ? t('manager.wardsManagement')
                                            : activeMoreScreen === "village-settings" ? t('manager.villageSettings')
                                              : activeMoreScreen === "payments-ledger" ? t('manager.paymentLedger')
                                                : activeMoreScreen === "payments-settings" ? t('manager.paymentSettings')
                                                  : activeMoreScreen === "att-centers" ? t('manager.attendanceCenters')
                                                    : activeMoreScreen === "att-mark" ? t('manager.markAttendance')
                                                      : activeMoreScreen === "att-shifts" ? t('manager.viewShifts')
                                                        : activeMoreScreen === "activity-log" ? t('manager.activityLog')
                                                          : activeMoreScreen === "data-export" ? t('manager.dataExport')
                                                            : activeMoreScreen === "change-password" ? t('app.changePassword')
                                                              : activeMoreScreen === "language" ? t('generator.language')
                                                                : activeTab === "reports" ? t('manager.dailyReports')
                                                                  : activeTab === "collections" ? t('collections.title')
                                                                    : activeTab === "issues" ? t('navigation.issues')
                                                                      : activeTab === "more" ? t('manager.more')
                                                                        : t('manager.dashboard')}
                </span>
              </div>
            </div>

            {/* Right: Bell + Avatar */}
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              <button
                onClick={() => { setActiveTab("more"); setActiveMoreScreen("announcements"); }}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors active:scale-90"
                aria-label={t('manager.announcements')}
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {announcements.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => { setActiveTab("more"); setActiveMoreScreen(null); }}
                className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold transition-all active:scale-90 flex-shrink-0"
                aria-label={t('manager.profile')}
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
                { id: "reports", icon: BarChart3, label: t('manager.reports') },
                { id: "collections", icon: Package, label: t('collections.title') },
                { id: "issues", icon: AlertCircle, label: t('navigation.issues') },
                { id: "more", icon: LayoutDashboard, label: t('manager.more') },
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

          {/* Desktop Sidebar Navigation — no More button, all items inline */}
          <div className="hidden md:block w-56 bg-white border-r sticky top-[64px] h-[calc(100vh-64px)] overflow-y-auto">
            <div className="p-3">
              <nav className="space-y-1">
                {[
                  { id: "reports", icon: BarChart3, label: t('manager.dailyReports') },
                  { id: "collections", icon: Package, label: t("navigation.collections") },
                  { id: "issues", icon: AlertCircle, label: t("navigation.issues") },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => { setActiveTab(id); setActiveMoreScreen(null); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-sm font-medium",
                      activeTab === id && !activeMoreScreen
                        ? "bg-green-50 text-green-700"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {label}
                  </button>
                ))}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mb-1">{t('manager.households')}</p>
                  {[
                    { id: "household-details", icon: Home, label: t('manager.householdDetails') },
                    { id: "generate-qr", icon: QrCode, label: t('manager.generateQr') },
                    { id: "download-qr", icon: Download, label: t('manager.downloadQr') },
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
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mt-3 mb-1">{t('manager.fieldWorkers')}</p>
                  {[
                    { id: "collectors", icon: Users, label: t('manager.collectors') },
                    { id: "fieldworkers", icon: Users, label: t('manager.fieldWorkers') },
                    { id: "helpers", icon: Wrench, label: t('manager.helpers') },
                    { id: "segregators", icon: Users, label: t('manager.segregators') },
                    { id: "announcements", icon: Bell, label: t('manager.announcements') },
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
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mt-3 mb-1">{t('manager.dailyWasteLogs')}</p>
                  {[
                    { id: "daily-waste-logs", icon: ClipboardList, label: t('manager.dailyWasteLogs') },
                    { id: "compost-logs", icon: Package, label: t('manager.compostLogs') },
                    { id: "sales-logs", icon: BarChart3, label: t('manager.salesLogs') },
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
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mt-3 mb-1">{t('manager.analytics')}</p>
                  {[
                    { id: "household-performance", icon: TrendingUp, label: t('manager.householdPerformance') },
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
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mt-3 mb-1">{t('manager.management')}</p>
                  {[
                    { id: "vehicles", icon: Package, label: t('manager.vehicles') },
                    { id: "wards", icon: MapPin, label: t('manager.wards') },
                    { id: "village-settings", icon: Settings, label: t('manager.villageSettings') },
                    { id: "activity-log", icon: ClipboardList, label: t('manager.activityLog') },
                    { id: "data-export", icon: FileDown, label: t('manager.dataExport') },
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
                  {villageData?.paymentsEnabled && (
                    <>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mt-3 mb-1">{t('manager.paymentLedger')}</p>
                      {[
                        { id: "payments-ledger", icon: BarChart3, label: t('manager.paymentLedger') },
                        { id: "payments-settings", icon: Settings, label: t('manager.paymentSettings') },
                      ].map(({ id, icon: Icon, label }) => (
                        <button
                          key={id}
                          onClick={() => { setActiveTab("more"); setActiveMoreScreen(id); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-sm font-medium",
                            activeMoreScreen === id ? "bg-purple-50 text-purple-700" : "text-gray-600 hover:bg-gray-50",
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {label}
                        </button>
                      ))}
                    </>
                  )}
                  {villageData?.attendanceEnabled && (
                    <>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mt-3 mb-1">{t('manager.attendanceCenters')}</p>
                      {[
                        { id: "att-centers", icon: MapPin, label: t('manager.attendanceCenters') },
                        { id: "att-mark", icon: Clock, label: t('manager.markAttendance') },
                        { id: "att-shifts", icon: ClipboardList, label: t('manager.viewShifts') },
                      ].map(({ id, icon: Icon, label }) => (
                        <button
                          key={id}
                          onClick={() => { setActiveTab("more"); setActiveMoreScreen(id); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-sm font-medium",
                            activeMoreScreen === id ? "bg-teal-50 text-teal-700" : "text-gray-600 hover:bg-gray-50",
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {label}
                        </button>
                      ))}
                    </>
                  )}
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
                        <p className="font-bold text-gray-900 truncate">{user?.name || t('roles.manager')}</p>
                        <div className="flex px-3 space-x-5 justify-center items-center">
                          <p className="text-xs text-gray-500 truncate">{user?.userId}</p>
                          <Badge variant="secondary" className="text-xs mt-0.5">{user?.role}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Households group */}
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-2 pb-1">Households</p>
                    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
                      {[
                        { id: "household-details", icon: Home, label: t('manager.householdDetails'), description: t('manager.householdDetails') },
                        { id: "generate-qr", icon: QrCode, label: t('manager.generateQr'), description: t('manager.generateQr') },
                        { id: "download-qr", icon: Download, label: t('manager.downloadQr'), description: t('manager.downloadQr') },
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
                        { id: "collectors", icon: Users, label: t('manager.collectors'), description: t('manager.collectors') },
                        { id: "fieldworkers", icon: Users, label: t('manager.fieldWorkers'), description: t('manager.fieldWorkers') },
                        { id: "helpers", icon: Wrench, label: t('manager.helpers'), description: t('manager.helpers') },
                        { id: "segregators", icon: Users, label: t('manager.segregators'), description: t('manager.segregators') },
                        { id: "announcements", icon: Bell, label: t('manager.announcements'), description: t('manager.announcements') },
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
                        { id: "daily-waste-logs", icon: ClipboardList, label: t('manager.dailyWasteLogs'), description: t('manager.dailyWasteLogs') },
                        { id: "compost-logs", icon: Package, label: t('manager.compostLogs'), description: t('manager.compostLogs') },
                        { id: "sales-logs", icon: BarChart3, label: t('manager.salesLogs'), description: t('manager.salesLogs') },
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
                      {[
                        { id: "household-performance", icon: TrendingUp, label: t('manager.householdPerformance'), description: t('manager.householdPerformance') },
                      ].map(({ id, icon: Icon, label, description }, idx, arr) => (
                        <button
                          key={id}
                          onClick={() => setActiveMoreScreen(id)}
                          className={cn(
                            "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors active:bg-gray-50 active:scale-[0.99]",
                            idx < arr.length - 1 ? "border-b border-gray-100" : ""
                          )}
                        >
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{label}</p>
                            <p className="text-xs text-gray-400 truncate">{description}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>

                    {/* Management group */}
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-4 pb-1">Management</p>
                    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
                      {[
                        { id: "vehicles", icon: Package, label: t('manager.vehicleManagement'), description: t('manager.vehicleManagement') },
                        { id: "wards", icon: MapPin, label: t('manager.wardsManagement'), description: t('manager.wardsManagement') },
                        { id: "village-settings", icon: Settings, label: t('manager.villageSettings'), description: t('manager.villageSettings') },
                        { id: "activity-log", icon: ClipboardList, label: t('manager.activityLog'), description: t('manager.activityLog') },
                        { id: "data-export", icon: FileDown, label: t('manager.dataExport'), description: t('manager.dataExport') },
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

                    {/* Payments & Billing group */}
                    {villageData?.paymentsEnabled && (
                      <>
                        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-4 pb-1">Payments & Billing</p>
                        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
                          {[
                            { id: "payments-ledger", icon: BarChart3, label: t('manager.paymentLedger'), description: t('manager.paymentLedger') },
                            { id: "payments-settings", icon: Settings, label: t('manager.paymentSettings'), description: t('manager.paymentSettings') },
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
                      </>
                    )}

                    {/* Attendance & Shifts group */}
                    {villageData?.attendanceEnabled && (
                      <>
                        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-4 pb-1">Attendance & Shifts</p>
                        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
                          {[
                            { id: "att-centers", icon: MapPin, label: t('manager.attendanceCenters'), description: t('manager.attendanceCenters') },
                            { id: "att-mark", icon: Clock, label: t('manager.markAttendance'), description: t('manager.markAttendance') },
                            { id: "att-shifts", icon: ClipboardList, label: t('manager.viewShifts'), description: t('manager.viewShifts') },
                          ].map(({ id, icon: Icon, label, description }, idx, arr) => (
                            <button
                              key={id}
                              onClick={() => setActiveMoreScreen(id)}
                              className={cn(
                                "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors active:bg-gray-50 active:scale-[0.99]",
                                idx < arr.length - 1 ? "border-b border-gray-100" : ""
                              )}
                            >
                              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                                <Icon className="h-4 w-4 text-teal-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                                <p className="text-xs text-gray-400 truncate">{description}</p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Account group */}
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-4 pb-1">{t('manager.profile')}</p>
                    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
                      {[
                        { id: "change-password", icon: Settings, label: t('app.changePassword') },
                        { id: "language", icon: Bell, label: t('generator.language') },
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
                        {generateBatchQRMutation.isPending ? t('manager.generatingPdf') : "Generate Batch"}
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
                                placeholder={t("staff.fullName")}
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
                                placeholder={t("staff.mobileNumber")}
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
                              {createFieldWorkerMutation.isPending ? t('manager.creating') : "Create Field Worker"}
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
                              <h4 className="text-[12px] font-black text-gray-900 truncate">{fw.name}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[8px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">{fw.userId}</span>
                                {fw.phone && <span className="text-[8px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{fw.phone}</span>}
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
                            placeholder={t("manager.typeAnnouncement")}
                            className="min-h-[80px] rounded-xl border-gray-200 text-sm"
                            id="announcement-message"
                            value={announcementMessage}
                            onChange={(e) => setAnnouncementMessage(e.target.value)}
                          />
                          <Select value={announcementTarget} onValueChange={setAnnouncementTarget}>
                            <SelectTrigger className="rounded-xl border-gray-200 h-10 text-sm">
                              <SelectValue placeholder={t("manager.selectAudience")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('app.all')}</SelectItem>
                              <SelectItem value="collectors">{t('manager.collectors')}</SelectItem>
                              <SelectItem value="generators">{t('manager.households')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            className="w-full rounded-xl h-10 bg-green-600 hover:bg-green-700 text-white font-bold text-sm"
                            disabled={!announcementMessage.trim() || sendAnnouncementMutation.isPending}
                            onClick={() => sendAnnouncementMutation.mutate({
                              message: announcementMessage.trim(),
                              targetAudience: announcementTarget,
                              photoFile: null,
                            })}
                          >
                            {sendAnnouncementMutation.isPending ? (
                              <span className="flex items-center gap-2">
                                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Sending...
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <Send className="h-4 w-4" />
                                Send Announcement
                              </span>
                            )}
                          </Button>
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
                          {editingVehicle ? t('manager.editVehicle') : "Add New Vehicle"}
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
                            {(addVehicleMutation.isPending || updateVehicleMutation.isPending) ? t('app.saving') : (editingVehicle ? "Update" : "Add Vehicle")}
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

                {/* Village Settings sub-screen */}
                {activeMoreScreen === "village-settings" && (
                  <div className="space-y-4 p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveMoreScreen(null)} className="p-1.5 rounded-full hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                      </button>
                      <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">Village Settings</h2>
                    </div>

                    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
                      {/* Village name */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t('navigation.villages')}</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{villageData?.name || t('app.loading')}</p>
                        <p className="text-xs text-gray-500">{user?.villageId}</p>
                      </div>

                      {/* Weight Required Toggle */}
                      <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-semibold text-gray-900 text-sm">⚖️ Household Weight Entry</p>
                          <p className="text-xs text-gray-400 mt-0.5">When enabled, collectors must enter estimated waste weight (kg) during each collection</p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const newVal = !villageData?.weightRequired;
                              await apiRequest('PATCH', `/api/villages/${user?.villageId}`, { weightRequired: newVal });
                              queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
                              toast({ title: newVal ? 'Weight entry enabled' : 'Weight entry disabled' });
                            } catch (_err: unknown) {
                              toast({ title: 'Failed to update. Please try again.', variant: 'destructive' });
                            }
                          }}
                          className={cn(
                            "relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0",
                            villageData?.weightRequired ? "bg-green-500" : "bg-gray-300"
                          )}
                        >
                          <span className={cn(
                            "inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                            villageData?.weightRequired ? "translate-x-6" : "translate-x-1"
                          )} />
                        </button>
                      </div>

                      {/* Image Upload Required Toggle */}
                      <div className="px-4 py-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-semibold text-gray-900 text-sm">📸 Photo Required for All Collections</p>
                          <p className="text-xs text-gray-400 mt-0.5">When enabled, collectors must upload a photo for every collection. When disabled, photos are only required for low-rated collections (≤3 stars)</p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const newVal = !villageData?.imageUploadRequired;
                              await apiRequest('PATCH', `/api/villages/${user?.villageId}`, { imageUploadRequired: newVal });
                              queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
                              toast({ title: newVal ? 'Photo required for all' : 'Photo required only for low ratings' });
                            } catch (_err: unknown) {
                              toast({ title: 'Failed to update. Please try again.', variant: 'destructive' });
                            }
                          }}
                          className={cn(
                            "relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0",
                            villageData?.imageUploadRequired ? "bg-green-500" : "bg-gray-300"
                          )}
                        >
                          <span className={cn(
                            "inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                            villageData?.imageUploadRequired ? "translate-x-6" : "translate-x-1"
                          )} />
                        </button>
                      </div>

                      {/* Collector Waste Logging Toggle */}
                      <div className="px-4 py-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-semibold text-gray-900 text-sm">🗒️ Collector Waste Logging</p>
                          <p className="text-xs text-gray-400 mt-0.5">When enabled, collectors can enter daily waste logs from their dashboard. Your (manager) entry takes priority in reports</p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const newVal = !villageData?.collectorWasteLogEnabled;
                              await apiRequest('PATCH', `/api/villages/${user?.villageId}`, { collectorWasteLogEnabled: newVal });
                              queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
                              toast({ title: newVal ? 'Collector waste logging enabled' : 'Collector waste logging disabled' });
                            } catch (_err: unknown) {
                              toast({ title: 'Failed to update. Please try again.', variant: 'destructive' });
                            }
                          }}
                          className={cn(
                            "relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0",
                            villageData?.collectorWasteLogEnabled ? "bg-green-500" : "bg-gray-300"
                          )}
                        >
                          <span className={cn(
                            "inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                            villageData?.collectorWasteLogEnabled ? "translate-x-6" : "translate-x-1"
                          )} />
                        </button>
                      </div>
                    </div>

                    {/* Vehicle Notification Settings — only if proximity alerts enabled */}
                    {villageData?.proximityAlertsEnabled && (
                      <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 bg-amber-50/50">
                          <p className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">🔔 Vehicle Notification Settings</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Configure proximity alerts sent to households when a collection vehicle is nearby</p>
                        </div>

                        {/* Notification Radius */}
                        <div className="px-4 py-4 border-b border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-700">📍 Notification Radius</p>
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{sliderRadius ?? villageData?.notificationRadiusMeters ?? 150}m</span>
                          </div>
                          <input
                            type="range"
                            min={120}
                            max={300}
                            step={10}
                            value={sliderRadius ?? villageData?.notificationRadiusMeters ?? 150}
                            onChange={(e) => setSliderRadius(parseInt(e.target.value))}
                            onMouseUp={async () => {
                              if (sliderRadius == null) return;
                              try {
                                await apiRequest('PATCH', `/api/villages/${user?.villageId}`, { notificationRadiusMeters: sliderRadius });
                                queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
                              } catch {
                                toast({ title: 'Failed to update radius', variant: 'destructive' });
                              }
                              setSliderRadius(null);
                            }}
                            onTouchEnd={async () => {
                              if (sliderRadius == null) return;
                              try {
                                await apiRequest('PATCH', `/api/villages/${user?.villageId}`, { notificationRadiusMeters: sliderRadius });
                                queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
                              } catch {
                                toast({ title: 'Failed to update radius', variant: 'destructive' });
                              }
                              setSliderRadius(null);
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                          />
                          <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                            <span>120m</span>
                            <span>300m</span>
                          </div>
                        </div>

                        {/* Notification Window Start */}
                        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-xs font-semibold text-gray-700">🌅 Window Start</p>
                            <p className="text-[10px] text-gray-400">Earliest time to push notifications</p>
                          </div>
                          <input
                            type="time"
                            value={villageData?.notificationWindowStart || "05:30"}
                            onChange={async (e) => {
                              try {
                                await apiRequest('PATCH', `/api/villages/${user?.villageId}`, { notificationWindowStart: e.target.value });
                                queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
                                toast({ title: `Window start set to ${e.target.value}` });
                              } catch {
                                toast({ title: 'Failed to update', variant: 'destructive' });
                              }
                            }}
                            className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 bg-gray-50 focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                          />
                        </div>

                        {/* Notification Window End */}
                        <div className="px-4 py-4 flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-xs font-semibold text-gray-700">🌇 Window End</p>
                            <p className="text-[10px] text-gray-400">Latest time to push notifications</p>
                          </div>
                          <input
                            type="time"
                            value={villageData?.notificationWindowEnd || "13:00"}
                            onChange={async (e) => {
                              try {
                                await apiRequest('PATCH', `/api/villages/${user?.villageId}`, { notificationWindowEnd: e.target.value });
                                queryClient.invalidateQueries({ queryKey: ["/api/villages", user?.villageId] });
                                toast({ title: `Window end set to ${e.target.value}` });
                              } catch {
                                toast({ title: 'Failed to update', variant: 'destructive' });
                              }
                            }}
                            className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 bg-gray-50 focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-center text-gray-300 mt-4">Changes take effect immediately for all collectors</p>
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

                {/* Payments sub-screen — Ledger */}
                {activeMoreScreen === "payments-ledger" && villageData?.paymentsEnabled && (
                  <div>
                    <div className="flex items-center gap-2 p-3 pb-0">
                      <button onClick={() => setActiveMoreScreen(null)} className="p-1.5 rounded-full hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                      </button>
                      <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">Payment Ledger</h2>
                    </div>
                    <PaymentsTab initialScreen="overview" />
                  </div>
                )}

                {/* Payments sub-screen — Settings */}
                {activeMoreScreen === "payments-settings" && villageData?.paymentsEnabled && (
                  <div>
                    <div className="flex items-center gap-2 p-3 pb-0">
                      <button onClick={() => setActiveMoreScreen(null)} className="p-1.5 rounded-full hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                      </button>
                      <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">Payment Settings</h2>
                    </div>
                    <PaymentsTab initialScreen="settings" />
                  </div>
                )}

                {/* Activity Log sub-screen */}

                {/* Household Performance sub-screen */}
                {activeMoreScreen === "household-performance" && (
                  <HouseholdPerformance
                    onBack={() => setActiveMoreScreen(null)}
                    villageId={user?.villageId || ""}
                  />
                )}

                {/* Attendance — 3 separate screens */}
                {activeMoreScreen === "att-centers" && villageData?.attendanceEnabled && (
                  <AttendanceScreen
                    onBack={() => setActiveMoreScreen(null)}
                    villageId={user?.villageId || ""}
                    mode="centers"
                  />
                )}
                {activeMoreScreen === "att-mark" && villageData?.attendanceEnabled && (
                  <AttendanceScreen
                    onBack={() => setActiveMoreScreen(null)}
                    villageId={user?.villageId || ""}
                    mode="mark"
                  />
                )}
                {activeMoreScreen === "att-shifts" && villageData?.attendanceEnabled && (
                  <AttendanceScreen
                    onBack={() => setActiveMoreScreen(null)}
                    villageId={user?.villageId || ""}
                    mode="shifts"
                  />
                )}

                {/* Helpers sub-screen */}
                {activeMoreScreen === "helpers" && (
                  <StaffScreen
                    onBack={() => setActiveMoreScreen(null)}
                    staffType="helper"
                    title={t('manager.helpers')}
                  />
                )}

                {/* Segregators sub-screen */}
                {activeMoreScreen === "segregators" && (
                  <StaffScreen
                    onBack={() => setActiveMoreScreen(null)}
                    staffType="segregator"
                    title={t('manager.segregators')}
                  />
                )}

                {activeMoreScreen === "activity-log" && (
                  <ActivityLog onBack={() => setActiveMoreScreen(null)} apiUrl="/api/audit-logs" />
                )}

                {activeMoreScreen === "data-export" && (
                  <DataExportWizard
                    role="manager"
                    userVillageId={user?.villageId ?? undefined}
                    userId={user?.userId}
                    onBack={() => setActiveMoreScreen(null)}
                  />
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
                  open: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: t('manager.open') },
                  in_progress: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: t('manager.inProgress') },
                  resolved: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: t('manager.resolved') },
                };

                const stripColor = (s: string) => s === 'open' ? 'bg-red-500' : s === 'in_progress' ? 'bg-amber-400' : 'bg-green-500';

                return (
                  <div className="space-y-4 p-3">
                    {/* Status Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 -mx-1">
                      {[
                        { key: 'all', label: t('app.all'), count: allIssues.length, dot: 'bg-gray-400' },
                        { key: 'open', label: t('manager.open'), count: openCount, dot: 'bg-red-500' },
                        { key: 'in_progress', label: t('manager.inProgress'), count: progressCount, dot: 'bg-amber-500' },
                        { key: 'resolved', label: t('manager.resolved'), count: resolvedCount, dot: 'bg-green-500' },
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
                                      <span className="text-[8px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md uppercase">{translateEnum('issueCategory', issue.category)}</span>
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
                          {isFetchingNextIssuesPage ? t('app.loading') : `${t('app.viewAll')} · ${totalIssuesCount - allIssues.length} ${t('manager.remaining')}`}
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
                villageName={villageData?.name || t('navigation.villages')}
                villageId={user?.villageId || ""}
                managerName={user?.name || t('roles.manager')}
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
                    title: t('app.error'),
                    description: t('manager.proofPhotoDesc'),
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
                  <span className="text-[8px] font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded-md uppercase border border-gray-100">{translateEnum('issueCategory', selectedIssue.category)}</span>
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
                  placeholder={t("manager.addResponse")}
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
                  {updateIssueMutation.isPending ? t('manager.updating') : "Update Issue"}
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
            <DialogTitle>{t('villages.addWard')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newWard.trim()) {
                toast({ title: t('app.error'), variant: "destructive" });
                return;
              }
              if (wards.includes(newWard.trim())) {
                toast({ title: t('app.error'), variant: "destructive" });
                return;
              }
              addWardMutation.mutate(newWard.trim());
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="ward-name">{t('villages.wardName')} *</Label>
              <Input
                id="ward-name"
                value={newWard}
                onChange={(e) => setNewWard(e.target.value)}
                placeholder={t("villages.wardName")}
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
                {addWardMutation.isPending ? t('manager.adding') : "Add Ward"}
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
                    <>
                      <div className="bg-white rounded-xl shadow-sm">
                        <img
                          src={`/api/qr-codes/${viewingHousehold.uid}/image`}
                          alt={t('generator.qrCode')}
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
            <DialogTitle>{t('app.delete')}</DialogTitle>
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
                        <li>{t('manager.totalCollections')}: {hhCollections.length}</li>
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
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>{t('app.cancel')}</Button>
            <Button
              variant="destructive"
              onClick={() => deletingHousehold && deleteHouseholdMutation.mutate(deletingHousehold.id)}
              disabled={deleteHouseholdMutation.isPending}
            >
              {deleteHouseholdMutation.isPending ? t('manager.deleting') : "Confirm Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog >
    </>
  );
}