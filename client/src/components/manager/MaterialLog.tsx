import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, fetchWithCsrf } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Camera,
  Plus,
  Trash2,
  Edit,
  Calendar,
  Leaf,
  Recycle,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  Image as ImageIcon,
  X,
  Check,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface DailyWasteLog {
  id: number;
  villageId: string;
  date: string;
  wetWasteKg: string;
  dryWasteKg: string;
  specialCareWasteKg: string;
  sanitaryWasteKg: string;
  mixedWasteKg: string;
  wetWastePhotoUrl?: string;
  dryWastePhotoUrl?: string;
  specialCareWastePhotoUrl?: string;
  sanitaryWastePhotoUrl?: string;
  mixedWastePhotoUrl?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

interface CompostProductionLog {
  id: number;
  villageId: string;
  date: string;
  quantityKg: string;
  compostStatus: "good" | "average" | "bad";
  photoUrl: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

interface DryWasteSaleMaterial {
  id: number;
  saleId: number;
  materialType: string;
  quantityKg: string;
  ratePerKg: string;
  amount: string;
}

interface DryWasteSale {
  id: number;
  villageId: string;
  saleDate: string;
  buyerName: string;
  buyerPhone?: string;
  totalQuantityKg: string;
  totalAmount: string;
  receiptPhotoUrl?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  materials: DryWasteSaleMaterial[];
}

type LogType = "daily" | "compost" | "sales";

const materialTypes = [
  "Plastic (Mixed)",
  "Plastic (PET Bottles)",
  "Plastic (HDPE)",
  "Paper/Cardboard",
  "Metal (Iron)",
  "Metal (Aluminum)",
  "Glass",
  "E-Waste",
  "Rubber",
  "Textiles",
  "Other",
];

export function MaterialLog({ defaultTab = "daily", onBack }: { defaultTab?: LogType; onBack?: () => void } = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeLogType, setActiveLogType] = useState<LogType>(defaultTab);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; type: LogType } | null>(null);

  const { data: dailyLogs = [], isLoading: loadingDaily } = useQuery<DailyWasteLog[]>({
    queryKey: ["/api/material-log/daily-waste"],
  });

  const { data: compostLogs = [], isLoading: loadingCompost } = useQuery<CompostProductionLog[]>({
    queryKey: ["/api/material-log/compost"],
  });

  const { data: salesLogs = [], isLoading: loadingSales } = useQuery<DryWasteSale[]>({
    queryKey: ["/api/material-log/dry-waste-sales"],
  });

  const uploadPhoto = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetchWithCsrf("/api/material-log/upload-photo", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to upload photo");
    const data = await response.json();
    return data.url;
  };

  const createDailyLogMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/material-log/daily-waste", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-log/daily-waste"] });
      toast({ title: "Daily waste log created successfully" });
      setShowForm(false);
    },
    onError: (_error: unknown) => {
      toast({ title: "Failed to create log. Please try again.", variant: "destructive" });
    },
  });

  const updateDailyLogMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/material-log/daily-waste/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-log/daily-waste"] });
      toast({ title: "Daily waste log updated successfully" });
      setShowForm(false);
      setEditingItem(null);
    },
    onError: (_error: unknown) => {
      toast({ title: "Failed to update log. Please try again.", variant: "destructive" });
    },
  });

  const deleteDailyLogMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/material-log/daily-waste/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-log/daily-waste"] });
      toast({ title: "Log deleted" });
    },
  });

  const createCompostLogMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/material-log/compost", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-log/compost"] });
      toast({ title: "Compost log created successfully" });
      setShowForm(false);
    },
    onError: (_error: unknown) => {
      toast({ title: "Failed to create log. Please try again.", variant: "destructive" });
    },
  });

  const updateCompostLogMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/material-log/compost/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-log/compost"] });
      toast({ title: "Compost log updated successfully" });
      setShowForm(false);
      setEditingItem(null);
    },
    onError: (_error: unknown) => {
      toast({ title: "Failed to update log. Please try again.", variant: "destructive" });
    },
  });

  const deleteCompostLogMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/material-log/compost/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-log/compost"] });
      toast({ title: "Log deleted" });
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/material-log/dry-waste-sales", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-log/dry-waste-sales"] });
      toast({ title: "Sale recorded successfully" });
      setShowForm(false);
    },
    onError: (_error: unknown) => {
      toast({ title: "Failed to record sale. Please try again.", variant: "destructive" });
    },
  });

  const updateSaleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/material-log/dry-waste-sales/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-log/dry-waste-sales"] });
      toast({ title: "Sale updated successfully" });
      setShowForm(false);
      setEditingItem(null);
    },
    onError: (_error: unknown) => {
      toast({ title: "Failed to update sale. Please try again.", variant: "destructive" });
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/material-log/dry-waste-sales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-log/dry-waste-sales"] });
      toast({ title: "Sale deleted" });
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const tabLabel = activeLogType === 'daily' ? 'Daily Waste Logs' : activeLogType === 'compost' ? 'Compost Logs' : 'Sales Logs';

  return (
    <div className="space-y-3 p-3">
      {/* Header: back + title + add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100 active:scale-90 transition-all">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">{tabLabel}</h2>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Entry
        </button>
      </div>

      {activeLogType === "daily" && (
        <DailyWasteList
          logs={dailyLogs}
          loading={loadingDaily}
          onEdit={(item) => {
            setEditingItem(item);
            setShowForm(true);
          }}
          onDelete={(id) => setDeleteConfirm({ id, type: 'daily' })}
          onImageClick={setShowImagePreview}
          formatDate={formatDate}
        />
      )}

      {activeLogType === "compost" && (
        <CompostList
          logs={compostLogs}
          loading={loadingCompost}
          onEdit={(item) => {
            setEditingItem(item);
            setShowForm(true);
          }}
          onDelete={(id) => setDeleteConfirm({ id, type: 'compost' })}
          onImageClick={setShowImagePreview}
          formatDate={formatDate}
        />
      )}

      {activeLogType === "sales" && (
        <SalesList
          sales={salesLogs}
          loading={loadingSales}
          onEdit={(item) => {
            setEditingItem(item);
            setShowForm(true);
          }}
          onDelete={(id) => setDeleteConfirm({ id, type: 'sales' })}
          onImageClick={setShowImagePreview}
          formatDate={formatDate}
        />
      )}

      {/* Form Dialog - Fullscreen on mobile */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingItem(null);
      }}>
        <DialogContent
          className="max-w-[100vw] w-full md:max-w-lg md:h-[90vh] md:rounded-xl overflow-hidden p-0 flex flex-col border-none md:border"
          style={{ top: 60, left: 0, transform: 'none', height: 'calc(100dvh - 60px)' }}
        >
          <div className="px-4 border-b flex items-center justify-between bg-green-50 min-h-[50px] flex-shrink-0">
            <DialogTitle className="text-sm font-black uppercase tracking-tight text-gray-900">
              {editingItem ? "Edit" : "Add"} {activeLogType === "daily" ? "Daily Waste Log" : activeLogType === "compost" ? "Compost Log" : "Sale Record"}
            </DialogTitle>
            <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="p-2 rounded-full hover:bg-white/50 transition-colors">
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-6">
            {activeLogType === "daily" && (
              <DailyWasteForm
                editingItem={editingItem}
                onSubmit={(data) => {
                  if (editingItem) {
                    updateDailyLogMutation.mutate({ id: editingItem.id, data });
                  } else {
                    createDailyLogMutation.mutate(data);
                  }
                }}
                isPending={createDailyLogMutation.isPending || updateDailyLogMutation.isPending}
                uploadPhoto={uploadPhoto}
                uploading={uploading}
                setUploading={setUploading}
              />
            )}
            {activeLogType === "compost" && (
              <CompostForm
                editingItem={editingItem}
                onSubmit={(data) => {
                  if (editingItem) {
                    updateCompostLogMutation.mutate({ id: editingItem.id, data });
                  } else {
                    createCompostLogMutation.mutate(data);
                  }
                }}
                isPending={createCompostLogMutation.isPending || updateCompostLogMutation.isPending}
                uploadPhoto={uploadPhoto}
                uploading={uploading}
                setUploading={setUploading}
              />
            )}
            {activeLogType === "sales" && (
              <SalesForm
                editingItem={editingItem}
                onSubmit={(data) => {
                  if (editingItem) {
                    updateSaleMutation.mutate({ id: editingItem.id, data });
                  } else {
                    createSaleMutation.mutate(data);
                  }
                }}
                isPending={createSaleMutation.isPending || updateSaleMutation.isPending}
                uploadPhoto={uploadPhoto}
                uploading={uploading}
                setUploading={setUploading}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showImagePreview} onOpenChange={() => setShowImagePreview(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {showImagePreview && (
            <img src={showImagePreview} alt="Preview" className="w-full h-auto" />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-xs rounded-2xl border-none shadow-xl p-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-sm font-black text-gray-900">Delete Entry?</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              This {deleteConfirm?.type === 'daily' ? 'daily waste log' : deleteConfirm?.type === 'compost' ? 'compost log' : 'sale record'} will be permanently removed.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider hover:bg-gray-50 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm) {
                    if (deleteConfirm.type === 'daily') deleteDailyLogMutation.mutate(deleteConfirm.id);
                    else if (deleteConfirm.type === 'compost') deleteCompostLogMutation.mutate(deleteConfirm.id);
                    else deleteSaleMutation.mutate(deleteConfirm.id);
                    setDeleteConfirm(null);
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhotoUploadButton({
  label,
  photoUrl,
  onUpload,
  uploading,
  uploadKey,
  required,
}: {
  label: string;
  photoUrl?: string;
  onUpload: (url: string) => void;
  uploading: string | null;
  uploadKey: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetchWithCsrf("/api/material-log/upload-photo", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      onUpload(data.url);
    } catch (_error) {
      // Upload failed silently - user sees no photo was set
    }
  };

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={inputRef}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading === uploadKey}
          className="flex items-center gap-2"
        >
          {uploading === uploadKey ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {photoUrl ? "Change" : "Take Photo"}
        </Button>
        {photoUrl && (
          <div className="relative">
            <img src={photoUrl} alt={label} className="h-10 w-10 object-cover rounded" />
            <Check className="absolute -top-1 -right-1 h-4 w-4 text-green-600 bg-white rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}

function DailyWasteForm({
  editingItem,
  onSubmit,
  isPending,
  uploadPhoto,
  uploading,
  setUploading,
}: {
  editingItem: DailyWasteLog | null;
  onSubmit: (data: any) => void;
  isPending: boolean;
  uploadPhoto: (file: File) => Promise<string>;
  uploading: string | null;
  setUploading: (key: string | null) => void;
}) {
  const [formData, setFormData] = useState({
    date: editingItem?.date || new Date().toISOString().split("T")[0],
    wetWasteKg: editingItem?.wetWasteKg || "",
    dryWasteKg: editingItem?.dryWasteKg || "",
    specialCareWasteKg: editingItem?.specialCareWasteKg || "",
    sanitaryWasteKg: editingItem?.sanitaryWasteKg || "",
    mixedWasteKg: editingItem?.mixedWasteKg || "",
    wetWastePhotoUrl: editingItem?.wetWastePhotoUrl || "",
    dryWastePhotoUrl: editingItem?.dryWastePhotoUrl || "",
    specialCareWastePhotoUrl: editingItem?.specialCareWastePhotoUrl || "",
    sanitaryWastePhotoUrl: editingItem?.sanitaryWastePhotoUrl || "",
    mixedWastePhotoUrl: editingItem?.mixedWastePhotoUrl || "",
    notes: editingItem?.notes || "",
  });

  // Pre-load collector summary when creating (not editing) and date changes
  const [collectorSummary, setCollectorSummary] = useState<{
    wetWasteKg: number; dryWasteKg: number; specialCareWasteKg: number;
    sanitaryWasteKg: number; mixedWasteKg: number; entryCount: number;
  } | null>(null);

  useEffect(() => {
    if (editingItem) return; // Skip when editing an existing manager entry
    const fetchSummary = async () => {
      try {
        const res = await fetch(`/api/collector-waste-log/village/${formData.date}/summary`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.entryCount > 0) {
          setCollectorSummary(data);
          // Pre-fill only if all fields are empty/zero
          const allEmpty = !formData.wetWasteKg && !formData.dryWasteKg && !formData.specialCareWasteKg && !formData.sanitaryWasteKg && !formData.mixedWasteKg;
          if (allEmpty) {
            setFormData(prev => ({
              ...prev,
              wetWasteKg: data.wetWasteKg > 0 ? String(data.wetWasteKg) : "",
              dryWasteKg: data.dryWasteKg > 0 ? String(data.dryWasteKg) : "",
              specialCareWasteKg: data.specialCareWasteKg > 0 ? String(data.specialCareWasteKg) : "",
              sanitaryWasteKg: data.sanitaryWasteKg > 0 ? String(data.sanitaryWasteKg) : "",
              mixedWasteKg: data.mixedWasteKg > 0 ? String(data.mixedWasteKg) : "",
            }));
          }
        } else {
          setCollectorSummary(null);
        }
      } catch {
        setCollectorSummary(null);
      }
    };
    fetchSummary();
  }, [formData.date, editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-center items-center justify-between">
        <Label className="font-bold">Select Date</Label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          max={new Date().toISOString().split("T")[0]}
          required
        />
      </div>

      {/* Collector summary banner */}
      {collectorSummary && !editingItem && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs font-bold text-blue-800 mb-1">📋 Collectors logged {collectorSummary.entryCount} entr{collectorSummary.entryCount === 1 ? 'y' : 'ies'} for this date:</p>
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-blue-700">
            {collectorSummary.wetWasteKg > 0 && <span className="bg-green-100 px-2 py-0.5 rounded-full">Wet: {collectorSummary.wetWasteKg}kg</span>}
            {collectorSummary.dryWasteKg > 0 && <span className="bg-blue-100 px-2 py-0.5 rounded-full">Dry: {collectorSummary.dryWasteKg}kg</span>}
            {collectorSummary.specialCareWasteKg > 0 && <span className="bg-purple-100 px-2 py-0.5 rounded-full">Special: {collectorSummary.specialCareWasteKg}kg</span>}
            {collectorSummary.sanitaryWasteKg > 0 && <span className="bg-red-100 px-2 py-0.5 rounded-full">Sanitary: {collectorSummary.sanitaryWasteKg}kg</span>}
            {collectorSummary.mixedWasteKg > 0 && <span className="bg-yellow-100 px-2 py-0.5 rounded-full">Mixed: {collectorSummary.mixedWasteKg}kg</span>}
          </div>
          <p className="text-[10px] text-blue-500 mt-1">Values pre-filled below. Review and save - your entry takes priority.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3 p-3 bg-green-50 rounded-xl">
          <div>
            <Label className="text-green-700">Wet Waste (kg)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={formData.wetWasteKg}
              onChange={(e) => setFormData({ ...formData, wetWasteKg: e.target.value })}
              placeholder="0.0"
              className="mt-1"
            />
          </div>
          <PhotoUploadButton
            label="Photo"
            photoUrl={formData.wetWastePhotoUrl}
            onUpload={(url) => setFormData({ ...formData, wetWastePhotoUrl: url })}
            uploading={uploading}
            uploadKey="wet"
            required={parseFloat(formData.wetWasteKg) > 0}
          />
        </div>

        <div className="space-y-3 p-3 bg-blue-50 rounded-xl">
          <div>
            <Label className="text-blue-700">Dry Waste (kg)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={formData.dryWasteKg}
              onChange={(e) => setFormData({ ...formData, dryWasteKg: e.target.value })}
              placeholder="0.0"
              className="mt-1"
            />
          </div>
          <PhotoUploadButton
            label="Photo"
            photoUrl={formData.dryWastePhotoUrl}
            onUpload={(url) => setFormData({ ...formData, dryWastePhotoUrl: url })}
            uploading={uploading}
            uploadKey="dry"
            required={parseFloat(formData.dryWasteKg) > 0}
          />
        </div>

        <div className="space-y-3 p-3 bg-purple-50 rounded-xl">
          <div>
            <Label className="text-purple-700">Sanitary Waste (kg)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={formData.sanitaryWasteKg}
              onChange={(e) => setFormData({ ...formData, sanitaryWasteKg: e.target.value })}
              placeholder="0.0"
              className="mt-1"
            />
          </div>
          <PhotoUploadButton
            label="Photo"
            photoUrl={formData.sanitaryWastePhotoUrl}
            onUpload={(url) => setFormData({ ...formData, sanitaryWastePhotoUrl: url })}
            uploading={uploading}
            uploadKey="sanitary"
            required={parseFloat(formData.sanitaryWasteKg) > 0}
          />
        </div>

        <div className="space-y-3 p-3 bg-amber-50 rounded-xl">
          <div>
            <Label className="text-amber-700">Special Care Waste (kg)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={formData.specialCareWasteKg}
              onChange={(e) => setFormData({ ...formData, specialCareWasteKg: e.target.value })}
              placeholder="0.0"
              className="mt-1"
            />
          </div>
          <PhotoUploadButton
            label="Photo"
            photoUrl={formData.specialCareWastePhotoUrl}
            onUpload={(url) => setFormData({ ...formData, specialCareWastePhotoUrl: url })}
            uploading={uploading}
            uploadKey="specialCare"
            required={parseFloat(formData.specialCareWasteKg) > 0}
          />
        </div>
      </div>

      <div className="space-y-3 p-3 bg-gray-100 rounded-xl">
        <div>
          <Label className="text-gray-700">Mixed Waste / Landfill Sent (kg)</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={formData.mixedWasteKg}
            onChange={(e) => setFormData({ ...formData, mixedWasteKg: e.target.value })}
            placeholder="0.0"
            className="mt-1"
          />
        </div>
        <PhotoUploadButton
          label="Photo"
          photoUrl={formData.mixedWastePhotoUrl}
          onUpload={(url) => setFormData({ ...formData, mixedWastePhotoUrl: url })}
          uploading={uploading}
          uploadKey="mixed"
          required={parseFloat(formData.mixedWasteKg) > 0}
        />
      </div>

      <div>
        <Label>Notes (optional)</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any additional notes..."
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {editingItem ? "Update Log" : "Save Log"}
      </Button>
    </form>
  );
}

function CompostForm({
  editingItem,
  onSubmit,
  isPending,
  uploadPhoto,
  uploading,
  setUploading,
}: {
  editingItem: CompostProductionLog | null;
  onSubmit: (data: any) => void;
  isPending: boolean;
  uploadPhoto: (file: File) => Promise<string>;
  uploading: string | null;
  setUploading: (key: string | null) => void;
}) {
  const [formData, setFormData] = useState({
    date: editingItem?.date || new Date().toISOString().split("T")[0],
    quantityKg: editingItem?.quantityKg || "",
    compostStatus: editingItem?.compostStatus || "good",
    photoUrl: editingItem?.photoUrl || "",
    notes: editingItem?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Date</Label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          max={new Date().toISOString().split("T")[0]}
          required
        />
      </div>

      <div>
        <Label>Compost Quantity (kg) *</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          value={formData.quantityKg}
          onChange={(e) => setFormData({ ...formData, quantityKg: e.target.value })}
          placeholder="Enter quantity"
          required
        />
      </div>

      <div>
        <Label>Compost Quality *</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {["good", "average", "bad"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFormData({ ...formData, compostStatus: status as any })}
              className={cn(
                "py-3 rounded-xl text-sm font-medium transition-all border-2",
                formData.compostStatus === status
                  ? status === "good"
                    ? "bg-green-100 border-green-500 text-green-700"
                    : status === "average"
                      ? "bg-yellow-100 border-yellow-500 text-yellow-700"
                      : "bg-red-100 border-red-500 text-red-700"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              )}
            >
              {status === "good" ? "Good" : status === "average" ? "Average" : "Bad"}
            </button>
          ))}
        </div>
      </div>

      <PhotoUploadButton
        label="Photo"
        photoUrl={formData.photoUrl}
        onUpload={(url) => setFormData({ ...formData, photoUrl: url })}
        uploading={uploading}
        uploadKey="compost"
        required
      />

      <div>
        <Label>Notes (optional)</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any additional notes..."
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending || !formData.photoUrl}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {editingItem ? "Update Log" : "Save Log"}
      </Button>
    </form>
  );
}

function SalesForm({
  editingItem,
  onSubmit,
  isPending,
  uploadPhoto,
  uploading,
  setUploading,
}: {
  editingItem: DryWasteSale | null;
  onSubmit: (data: any) => void;
  isPending: boolean;
  uploadPhoto: (file: File) => Promise<string>;
  uploading: string | null;
  setUploading: (key: string | null) => void;
}) {
  const [formData, setFormData] = useState({
    saleDate: editingItem?.saleDate || new Date().toISOString().split("T")[0],
    receiptImageUrl: editingItem?.receiptPhotoUrl || "",
    remarks: editingItem?.notes || "",
  });

  const [materials, setMaterials] = useState<
    { materialType: string; quantityKg: string; ratePerKg: string }[]
  >(
    editingItem?.materials?.map((m) => ({
      materialType: m.materialType,
      quantityKg: m.quantityKg,
      ratePerKg: m.ratePerKg,
    })) || [{ materialType: "", quantityKg: "", ratePerKg: "" }]
  );

  const addMaterial = () => {
    setMaterials([...materials, { materialType: "", quantityKg: "", ratePerKg: "" }]);
  };

  const removeMaterial = (index: number) => {
    if (materials.length > 1) {
      setMaterials(materials.filter((_, i) => i !== index));
    }
  };

  const updateMaterial = (index: number, field: string, value: string) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  const calculateTotal = () => {
    return materials.reduce((sum, m) => {
      const qty = parseFloat(m.quantityKg) || 0;
      const rate = parseFloat(m.ratePerKg) || 0;
      return sum + qty * rate;
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      materials: materials.filter((m) => m.materialType && m.quantityKg && m.ratePerKg),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Date *</Label>
        <Input
          type="date"
          value={formData.saleDate}
          onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
          max={new Date().toISOString().split("T")[0]}
          required
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Materials Sold *</Label>
          <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {materials.map((material, index) => (
          <div key={index} className="p-3 bg-gray-50 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Item {index + 1}</span>
              {materials.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMaterial(index)}
                  className="h-6 w-6 p-0 text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select
              value={material.materialType}
              onValueChange={(value) => updateMaterial(index, "materialType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select material type" />
              </SelectTrigger>
              <SelectContent>
                {materialTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Quantity (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={material.quantityKg}
                  onChange={(e) => updateMaterial(index, "quantityKg", e.target.value)}
                  placeholder="0.0"
                />
              </div>
              <div>
                <Label className="text-xs">Rate (₹/kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={material.ratePerKg}
                  onChange={(e) => updateMaterial(index, "ratePerKg", e.target.value)}
                  placeholder="0.0"
                />
              </div>
            </div>
            <div className="text-right text-sm font-medium text-green-600">
              Amount: ₹
              {((parseFloat(material.quantityKg) || 0) * (parseFloat(material.ratePerKg) || 0)).toFixed(
                2
              )}
            </div>
          </div>
        ))}

        <div className="p-3 bg-green-100 rounded-xl text-center">
          <span className="text-lg font-bold text-green-700">Total: ₹{calculateTotal().toFixed(2)}</span>
        </div>
      </div>

      <PhotoUploadButton
        label="Receipt Photo"
        photoUrl={formData.receiptImageUrl}
        onUpload={(url) => setFormData({ ...formData, receiptImageUrl: url })}
        uploading={uploading}
        uploadKey="receipt"
      />

      <div>
        <Label>Remarks (optional)</Label>
        <Textarea
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          placeholder="Any additional remarks..."
          rows={2}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || materials.filter((m) => m.materialType && m.quantityKg && m.ratePerKg).length === 0}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {editingItem ? "Update Sale" : "Record Sale"}
      </Button>
    </form>
  );
}

function DailyWasteList({
  logs,
  loading,
  onEdit,
  onDelete,
  onImageClick,
  formatDate,
}: {
  logs: DailyWasteLog[];
  loading: boolean;
  onEdit: (item: DailyWasteLog) => void;
  onDelete: (id: number) => void;
  onImageClick: (url: string) => void;
  formatDate: (date: string) => string;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No daily waste logs yet</p>
        <p className="text-sm">Tap "Add Entry" to create your first log</p>
      </div>
    );
  }

  const calculateTotal = (log: DailyWasteLog) => {
    return (
      (parseFloat(log.wetWasteKg) || 0) +
      (parseFloat(log.dryWasteKg) || 0) +
      (parseFloat(log.specialCareWasteKg) || 0) +
      (parseFloat(log.sanitaryWasteKg) || 0) +
      (parseFloat(log.mixedWasteKg) || 0)
    ).toFixed(1);
  };

  return (
    <div className="space-y-1">
      {logs.map((log) => {
        const isExpanded = expandedId === log.id;
        const total = calculateTotal(log);

        return (
          <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
            <div className="w-1 flex-shrink-0 bg-green-500" />
            <div className="flex-1 min-w-0">
              <div
                className="flex items-center justify-between py-3 px-2 cursor-pointer active:bg-gray-50/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
              >
                <div className="min-w-0">
                  <span className="text-[14px] font-black text-gray-900">{formatDate(log.date)}</span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-sm font-black text-green-600">{total}kg</span>
                  <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onEdit(log)} className="p-1.5 rounded-lg hover:bg-gray-100"><Edit className="h-3.5 w-3.5 text-gray-400" /></button>
                    <button onClick={() => onDelete(log.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-gray-300 transition-transform", isExpanded && "rotate-180")} />
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-50 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <WasteTypeCard label="Wet" value={log.wetWasteKg} color="green" photoUrl={log.wetWastePhotoUrl} onImageClick={onImageClick} />
                    <WasteTypeCard label="Dry" value={log.dryWasteKg} color="blue" photoUrl={log.dryWastePhotoUrl} onImageClick={onImageClick} />
                    <WasteTypeCard label="Sanitary" value={log.sanitaryWasteKg} color="purple" photoUrl={log.sanitaryWastePhotoUrl} onImageClick={onImageClick} />
                    <WasteTypeCard label="Special Care" value={log.specialCareWasteKg} color="amber" photoUrl={log.specialCareWastePhotoUrl} onImageClick={onImageClick} />
                    <WasteTypeCard label="Mixed/Landfill" value={log.mixedWasteKg} color="gray" photoUrl={log.mixedWastePhotoUrl} onImageClick={onImageClick} />
                  </div>
                  {log.notes && <p className="mt-2 text-[10px] text-gray-500 italic">{log.notes}</p>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WasteTypeCard({
  label,
  value,
  color,
  photoUrl,
  onImageClick,
}: {
  label: string;
  value: string;
  color: "green" | "blue" | "red" | "purple" | "amber" | "gray";
  photoUrl?: string;
  onImageClick: (url: string) => void;
}) {
  const colorClasses = {
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    red: "bg-red-50 text-red-700 border-red-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <div className={cn("p-2 rounded-xl border", colorClasses[color])}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
          <div className="text-sm font-black">{value || "0"} kg</div>
        </div>
        {photoUrl && (
          <button onClick={() => onImageClick(photoUrl)} className="flex-shrink-0">
            <img src={photoUrl} alt={label} className="h-9 w-9 object-cover rounded-lg border border-white/50" />
          </button>
        )}
      </div>
    </div>
  );
}

function CompostList({
  logs,
  loading,
  onEdit,
  onDelete,
  onImageClick,
  formatDate,
}: {
  logs: CompostProductionLog[];
  loading: boolean;
  onEdit: (item: CompostProductionLog) => void;
  onDelete: (id: number) => void;
  onImageClick: (url: string) => void;
  formatDate: (date: string) => string;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Leaf className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No compost production logs yet</p>
        <p className="text-sm">Tap "Add Entry" to record compost production</p>
      </div>
    );
  }

  const statusColors = {
    good: "bg-green-100 text-green-700",
    average: "bg-yellow-100 text-yellow-700",
    bad: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const isExpanded = expandedId === log.id;
        const stripColor = log.compostStatus === 'good' ? 'bg-green-500' : log.compostStatus === 'average' ? 'bg-amber-400' : 'bg-red-500';

        return (
          <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
            <div className={`w-1 flex-shrink-0 ${stripColor}`} />
            <div className="flex-1 min-w-0">
              <div
                className="flex items-center justify-between p-3 cursor-pointer active:bg-gray-50/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
              >
                <div className="min-w-0">
                  <span className="text-[11px] font-black text-gray-900">{formatDate(log.date)}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn("text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md", statusColors[log.compostStatus])}>{log.compostStatus}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-black text-green-600">{log.quantityKg}kg</span>
                  <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onEdit(log)} className="p-1.5 rounded-lg hover:bg-gray-100"><Edit className="h-3.5 w-3.5 text-gray-400" /></button>
                    <button onClick={() => onDelete(log.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-gray-300 transition-transform", isExpanded && "rotate-180")} />
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-50 pt-2">
                  <div className="flex items-center gap-3">
                    {log.photoUrl && (
                      <button onClick={() => onImageClick(log.photoUrl)} className="flex-shrink-0">
                        <img src={log.photoUrl} alt="Compost" className="h-16 w-16 object-cover rounded-xl border border-gray-100" />
                      </button>
                    )}
                    <div className="min-w-0">
                      <span className={cn("text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md inline-block", statusColors[log.compostStatus])}>
                        {log.compostStatus.charAt(0).toUpperCase() + log.compostStatus.slice(1)} Quality
                      </span>
                      {log.notes && <p className="text-[10px] text-gray-500 italic mt-1">{log.notes}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SalesList({
  sales,
  loading,
  onEdit,
  onDelete,
  onImageClick,
  formatDate,
}: {
  sales: DryWasteSale[];
  loading: boolean;
  onEdit: (item: DryWasteSale) => void;
  onDelete: (id: number) => void;
  onImageClick: (url: string) => void;
  formatDate: (date: string) => string;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <IndianRupee className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No dry waste sales yet</p>
        <p className="text-sm">Tap "Add Entry" to record a sale</p>
      </div>
    );
  }

  const calculateTotalKg = (sale: DryWasteSale) => {
    if (sale.totalQuantityKg) return sale.totalQuantityKg;
    if (!sale.materials) return "0";
    return sale.materials.reduce((sum, m) => sum + (parseFloat(m.quantityKg) || 0), 0).toFixed(1);
  };

  const calculateTotalAmount = (sale: DryWasteSale) => {
    if (sale.totalAmount) return sale.totalAmount;
    if (!sale.materials) return "0";
    return sale.materials.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0).toFixed(2);
  };

  return (
    <div className="space-y-2">
      {sales.map((sale) => {
        const isExpanded = expandedId === sale.id;
        const totalKg = calculateTotalKg(sale);
        const totalAmount = calculateTotalAmount(sale);

        return (
          <div key={sale.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
            <div className="w-1 flex-shrink-0 bg-blue-500" />
            <div className="flex-1 min-w-0">
              <div
                className="flex items-center justify-between p-3 cursor-pointer active:bg-gray-50/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : sale.id)}
              >
                <div className="min-w-0">
                  <span className="text-[11px] font-black text-gray-900">{formatDate(sale.saleDate)}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-500">{totalKg}kg</span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600">{sale.materials?.length || 0} items</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-black text-green-600">₹{totalAmount}</span>
                  <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onEdit(sale)} className="p-1.5 rounded-lg hover:bg-gray-100"><Edit className="h-3.5 w-3.5 text-gray-400" /></button>
                    <button onClick={() => onDelete(sale.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-gray-300 transition-transform", isExpanded && "rotate-180")} />
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-50 pt-2 space-y-2">
                  {sale.materials && sale.materials.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">Materials</span>
                      {sale.materials.map((m, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-xl">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-gray-800">{m.materialType}</span>
                            <span className="text-[9px] text-gray-400 ml-1">{m.quantityKg}kg × ₹{m.ratePerKg}</span>
                          </div>
                          <span className="text-[11px] font-black text-green-600 flex-shrink-0">₹{m.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {sale.receiptPhotoUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Receipt:</span>
                      <button onClick={() => onImageClick(sale.receiptPhotoUrl!)}>
                        <img src={sale.receiptPhotoUrl} alt="" className="h-12 w-12 object-cover rounded-xl border border-gray-100" />
                      </button>
                    </div>
                  )}
                  {sale.notes && <p className="text-[10px] text-gray-500 italic">{sale.notes}</p>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
