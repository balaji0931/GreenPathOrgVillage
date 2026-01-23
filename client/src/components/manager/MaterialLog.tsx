import { useState, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
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
  Package,
  Image as ImageIcon,
  X,
  Check,
  Loader2,
} from "lucide-react";

interface DailyWasteLog {
  id: number;
  villageId: string;
  date: string;
  wetWasteKg: string;
  dryWasteKg: string;
  rejectedWasteKg: string;
  sanitaryWasteKg: string;
  wetWastePhotoUrl?: string;
  dryWastePhotoUrl?: string;
  rejectedWastePhotoUrl?: string;
  sanitaryWastePhotoUrl?: string;
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
  date: string;
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

export function MaterialLog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeLogType, setActiveLogType] = useState<LogType>("daily");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null);

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
    onError: (error: any) => {
      toast({ title: error.message || "Failed to create log", variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update log", variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: error.message || "Failed to create log", variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update log", variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: error.message || "Failed to record sale", variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update sale", variant: "destructive" });
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

  const LogTypeSelector = () => (
    <div className="flex gap-2 p-2 bg-gray-100 rounded-2xl mb-4">
      {[
        { id: "daily" as LogType, icon: Package, label: "Daily Waste" },
        { id: "compost" as LogType, icon: Leaf, label: "Compost" },
        { id: "sales" as LogType, icon: IndianRupee, label: "Sales" },
      ].map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setActiveLogType(id)}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200",
            activeLogType === id
              ? "bg-white shadow-md text-green-700"
              : "text-gray-500 hover:bg-white/50"
          )}
        >
          <Icon className="h-5 w-5" />
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Material & Output Log</h2>
        <Button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="rounded-full bg-green-600 hover:bg-green-700 shadow-lg"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Entry
        </Button>
      </div>

      <LogTypeSelector />

      {activeLogType === "daily" && (
        <DailyWasteList
          logs={dailyLogs}
          loading={loadingDaily}
          onEdit={(item) => {
            setEditingItem(item);
            setShowForm(true);
          }}
          onDelete={(id) => deleteDailyLogMutation.mutate(id)}
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
          onDelete={(id) => deleteCompostLogMutation.mutate(id)}
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
          onDelete={(id) => deleteSaleMutation.mutate(id)}
          onImageClick={setShowImagePreview}
          formatDate={formatDate}
        />
      )}

      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingItem(null);
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit" : "Add"} {activeLogType === "daily" ? "Daily Waste Log" : activeLogType === "compost" ? "Compost Production" : "Dry Waste Sale"}
            </DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>

      <Dialog open={!!showImagePreview} onOpenChange={() => setShowImagePreview(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {showImagePreview && (
            <img src={showImagePreview} alt="Preview" className="w-full h-auto" />
          )}
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
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  return (
    <div className="space-y-2">
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
    rejectedWasteKg: editingItem?.rejectedWasteKg || "",
    sanitaryWasteKg: editingItem?.sanitaryWasteKg || "",
    wetWastePhotoUrl: editingItem?.wetWastePhotoUrl || "",
    dryWastePhotoUrl: editingItem?.dryWastePhotoUrl || "",
    rejectedWastePhotoUrl: editingItem?.rejectedWastePhotoUrl || "",
    sanitaryWastePhotoUrl: editingItem?.sanitaryWastePhotoUrl || "",
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

        <div className="space-y-3 p-3 bg-red-50 rounded-xl">
          <div>
            <Label className="text-red-700">Rejected Waste (kg)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={formData.rejectedWasteKg}
              onChange={(e) => setFormData({ ...formData, rejectedWasteKg: e.target.value })}
              placeholder="0.0"
              className="mt-1"
            />
          </div>
          <PhotoUploadButton
            label="Photo"
            photoUrl={formData.rejectedWastePhotoUrl}
            onUpload={(url) => setFormData({ ...formData, rejectedWastePhotoUrl: url })}
            uploading={uploading}
            uploadKey="rejected"
            required={parseFloat(formData.rejectedWasteKg) > 0}
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
    saleDate: editingItem?.date || new Date().toISOString().split("T")[0],
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
      (parseFloat(log.rejectedWasteKg) || 0) +
      (parseFloat(log.sanitaryWasteKg) || 0)
    ).toFixed(1);
  };

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const isExpanded = expandedId === log.id;
        const total = calculateTotal(log);

        return (
          <Card key={log.id} className="overflow-hidden">
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
            >
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{formatDate(log.date)}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center">
                  <span className="text-lg font-bold text-green-600">{total} kg</span>
                  <span className="text-xs text-gray-500 ml-1">total</span>
                </div>

                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(log)} className="h-8 w-8 p-0">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(log.id)}
                    className="h-8 w-8 p-0 text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <ChevronRight className={cn("h-4 w-4 text-gray-400 transition-transform", isExpanded && "rotate-90")} />
              </div>
            </div>

            {isExpanded && (
              <CardContent className="pt-0 pb-4 px-4 border-t">
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <WasteTypeCard
                    label="Wet"
                    value={log.wetWasteKg}
                    color="green"
                    photoUrl={log.wetWastePhotoUrl}
                    onImageClick={onImageClick}
                  />
                  <WasteTypeCard
                    label="Dry"
                    value={log.dryWasteKg}
                    color="blue"
                    photoUrl={log.dryWastePhotoUrl}
                    onImageClick={onImageClick}
                  />
                  <WasteTypeCard
                    label="Rejected"
                    value={log.rejectedWasteKg}
                    color="red"
                    photoUrl={log.rejectedWastePhotoUrl}
                    onImageClick={onImageClick}
                  />
                  <WasteTypeCard
                    label="Sanitary"
                    value={log.sanitaryWasteKg}
                    color="purple"
                    photoUrl={log.sanitaryWastePhotoUrl}
                    onImageClick={onImageClick}
                  />
                </div>

                {log.notes && <p className="mt-3 text-sm text-gray-600 italic">{log.notes}</p>}
              </CardContent>
            )}
          </Card>
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
  color: "green" | "blue" | "red" | "purple";
  photoUrl?: string;
  onImageClick: (url: string) => void;
}) {
  const colorClasses = {
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    red: "bg-red-50 text-red-700 border-red-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div className={cn("p-2 rounded-lg border", colorClasses[color])}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium">{label}</span>
          <div className="text-lg font-bold">{value || "0"} kg</div>
        </div>
        {photoUrl && (
          <button onClick={() => onImageClick(photoUrl)} className="flex-shrink-0">
            <img src={photoUrl} alt={label} className="h-10 w-10 object-cover rounded" />
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

        return (
          <Card key={log.id} className="overflow-hidden">
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
            >
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{formatDate(log.date)}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center">
                  <span className="text-lg font-bold text-green-600">{log.quantityKg} kg</span>
                </div>

                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(log)} className="h-8 w-8 p-0">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(log.id)}
                    className="h-8 w-8 p-0 text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <ChevronRight className={cn("h-4 w-4 text-gray-400 transition-transform", isExpanded && "rotate-90")} />
              </div>
            </div>

            {isExpanded && (
              <CardContent className="pt-0 pb-4 px-4 border-t">
                <div className="flex items-center gap-4 mt-3">
                  {log.photoUrl && (
                    <button onClick={() => onImageClick(log.photoUrl)} className="flex-shrink-0">
                      <img src={log.photoUrl} alt="Compost" className="h-20 w-20 object-cover rounded-lg" />
                    </button>
                  )}
                  <div>
                    <Badge className={cn("mb-2", statusColors[log.compostStatus])}>
                      {log.compostStatus.charAt(0).toUpperCase() + log.compostStatus.slice(1)} Quality
                    </Badge>
                    {log.notes && <p className="text-sm text-gray-600 italic">{log.notes}</p>}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
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
          <Card key={sale.id} className="overflow-hidden">
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedId(isExpanded ? null : sale.id)}
            >
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{formatDate(sale.date)}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm text-gray-600">{totalKg} kg</div>
                  <div className="text-lg font-bold text-green-600">₹{totalAmount}</div>
                </div>

                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(sale)} className="h-8 w-8 p-0">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(sale.id)}
                    className="h-8 w-8 p-0 text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <ChevronRight className={cn("h-4 w-4 text-gray-400 transition-transform", isExpanded && "rotate-90")} />
              </div>
            </div>

            {isExpanded && (
              <CardContent className="pt-0 pb-4 px-4 border-t">
                <div className="mt-3 space-y-3">
                  {sale.materials && sale.materials.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Materials Sold:</div>
                      {sale.materials.map((m, i) => (
                        <div key={i} className="flex justify-between text-sm p-2 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium">{m.materialType}</span>
                            <span className="text-gray-500 ml-2">({m.quantityKg} kg @ ₹{m.ratePerKg}/kg)</span>
                          </div>
                          <span className="font-medium text-green-600">₹{m.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {sale.receiptPhotoUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Receipt:</span>
                      <button onClick={() => onImageClick(sale.receiptPhotoUrl!)}>
                        <img src={sale.receiptPhotoUrl} alt="Receipt" className="h-16 w-16 object-cover rounded-lg" />
                      </button>
                    </div>
                  )}

                  {sale.notes && <p className="text-sm text-gray-600 italic">{sale.notes}</p>}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
