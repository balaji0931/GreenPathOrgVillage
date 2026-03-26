import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, fetchWithCsrf } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Edit,
  ArrowLeft,
  Loader2,
  Camera,
  X,
  Check,
  Leaf,
} from "lucide-react";

interface CollectorWasteLogProps {
  onBack?: () => void;
}

export default function CollectorWasteLog({ onBack }: CollectorWasteLogProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    wetWasteKg: "",
    dryWasteKg: "",
    specialCareWasteKg: "",
    sanitaryWasteKg: "",
    mixedWasteKg: "",
    wetWastePhotoUrl: "",
    dryWastePhotoUrl: "",
    specialCareWastePhotoUrl: "",
    sanitaryWastePhotoUrl: "",
    mixedWastePhotoUrl: "",
    remarks: "",
  });

  // Fetch own logs
  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/collector-waste-log"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/collector-waste-log");
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/collector-waste-log", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('wasteLog.saved') });
      queryClient.invalidateQueries({ queryKey: ["/api/collector-waste-log"] });
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: err.message || t('wasteLog.failedToSave'), variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/collector-waste-log/${id}`, data);
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('wasteLog.updated') });
      queryClient.invalidateQueries({ queryKey: ["/api/collector-waste-log"] });
      resetForm();
    },
    onError: () => {
      toast({ title: t('wasteLog.failedToUpdate'), variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/collector-waste-log/${id}`);
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('wasteLog.deleted') });
      queryClient.invalidateQueries({ queryKey: ["/api/collector-waste-log"] });
    },
    onError: () => {
      toast({ title: t('wasteLog.failedToDelete'), variant: "destructive" });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      wetWasteKg: "",
      dryWasteKg: "",
      specialCareWasteKg: "",
      sanitaryWasteKg: "",
      mixedWasteKg: "",
      wetWastePhotoUrl: "",
      dryWastePhotoUrl: "",
      specialCareWastePhotoUrl: "",
      sanitaryWastePhotoUrl: "",
      mixedWastePhotoUrl: "",
      remarks: "",
    });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      date: item.date,
      wetWasteKg: item.wetWasteKg || "",
      dryWasteKg: item.dryWasteKg || "",
      specialCareWasteKg: item.specialCareWasteKg || "",
      sanitaryWasteKg: item.sanitaryWasteKg || "",
      mixedWasteKg: item.mixedWasteKg || "",
      wetWastePhotoUrl: item.wetWastePhotoUrl || "",
      dryWastePhotoUrl: item.dryWastePhotoUrl || "",
      specialCareWastePhotoUrl: item.specialCareWastePhotoUrl || "",
      sanitaryWastePhotoUrl: item.sanitaryWastePhotoUrl || "",
      mixedWastePhotoUrl: item.mixedWastePhotoUrl || "",
      remarks: item.remarks || "",
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      wetWasteKg: formData.wetWasteKg || "0",
      dryWasteKg: formData.dryWasteKg || "0",
      specialCareWasteKg: formData.specialCareWasteKg || "0",
      sanitaryWasteKg: formData.sanitaryWasteKg || "0",
      mixedWasteKg: formData.mixedWasteKg || "0",
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const uploadPhoto = async (file: File, key: string) => {
    setUploading(key);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetchWithCsrf("/api/upload/photo", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      setFormData(prev => ({ ...prev, [`${key}PhotoUrl`]: result.url }));
    } catch {
      toast({ title: t('wasteLog.photoUploadFailed'), variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  // Group logs by date
  const logsByDate = logs.reduce((acc: Record<string, any[]>, log: any) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {});

  const sortedDates = Object.keys(logsByDate).sort((a, b) => b.localeCompare(a));

  const wasteFields = [
    { key: "wetWaste", label: t('enums.wetWaste'), color: "green", bgColor: "bg-green-50", textColor: "text-green-700" },
    { key: "dryWaste", label: t('enums.dryWaste'), color: "blue", bgColor: "bg-blue-50", textColor: "text-blue-700" },
    { key: "specialCareWaste", label: t('enums.specialCare'), color: "purple", bgColor: "bg-purple-50", textColor: "text-purple-700" },
    { key: "sanitaryWaste", label: t('enums.sanitary'), color: "red", bgColor: "bg-red-50", textColor: "text-red-700" },
    { key: "mixedWaste", label: t('enums.mixed'), color: "yellow", bgColor: "bg-yellow-50", textColor: "text-yellow-700" },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">{t('wasteLog.title')}</h2>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div className="flex items-center justify-between">
              <Label className="font-bold text-sm">{t('wasteLog.date')}</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                max={new Date().toISOString().split("T")[0]}
                required
                className="w-auto"
              />
            </div>

            {/* Waste type inputs */}
            <div className="grid grid-cols-2 gap-3">
              {wasteFields.map((field) => {
                const kgKey = `${field.key}Kg` as keyof typeof formData;
                const photoKey = `${field.key}PhotoUrl` as keyof typeof formData;
                return (
                  <div key={field.key} className={`space-y-2 p-3 ${field.bgColor} rounded-xl`}>
                    <Label className={`text-xs font-bold ${field.textColor}`}>{field.label} (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData[kgKey]}
                      onChange={(e) => setFormData({ ...formData, [kgKey]: e.target.value })}
                      placeholder="0.0"
                      className="h-9 text-sm"
                    />
                    {/* Photo upload button */}
                    {formData[photoKey] ? (
                      <div className="flex items-center gap-1">
                        <img src={formData[photoKey]} alt="" className="h-8 w-8 rounded object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, [photoKey]: "" })}
                          className="text-red-500 p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer hover:text-gray-700">
                        <Camera className="h-3 w-3" />
                        {uploading === field.key ? t('wasteLog.uploading') : t('wasteLog.photo')}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadPhoto(file, field.key);
                          }}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs font-bold text-gray-600">{t('wasteLog.notes')}</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder={t('wasteLog.notesPlaceholder')}
                className="min-h-[60px] mt-1 text-sm"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </span>
                ) : editingItem ? t('wasteLog.update') : t('wasteLog.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Log list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="text-center py-16">
          <Leaf className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('wasteLog.noLogs')}</p>
          <p className="text-[9px] text-gray-300 mt-1">{t('wasteLog.tapAdd')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const entries = logsByDate[date];
            const totalWet = entries.reduce((s: number, e: any) => s + parseFloat(e.wetWasteKg || "0"), 0);
            const totalDry = entries.reduce((s: number, e: any) => s + parseFloat(e.dryWasteKg || "0"), 0);
            const totalSpecial = entries.reduce((s: number, e: any) => s + parseFloat(e.specialCareWasteKg || "0"), 0);
            const totalSanitary = entries.reduce((s: number, e: any) => s + parseFloat(e.sanitaryWasteKg || "0"), 0);
            const totalMixed = entries.reduce((s: number, e: any) => s + parseFloat(e.mixedWasteKg || "0"), 0);
            const totalKg = totalWet + totalDry + totalSpecial + totalSanitary + totalMixed;

            return (
              <div key={date}>
                {/* Date header with totals */}
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    {totalKg.toFixed(1)} kg total · {entries.length} 
                  </span>
                </div>

                {/* Entries */}
                {entries.map((entry: any) => {
                  const entryTotal =
                    parseFloat(entry.wetWasteKg || "0") +
                    parseFloat(entry.dryWasteKg || "0") +
                    parseFloat(entry.specialCareWasteKg || "0") +
                    parseFloat(entry.sanitaryWasteKg || "0") +
                    parseFloat(entry.mixedWasteKg || "0");

                  return (
                    <div key={entry.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex mb-2">
                      <div className="w-1 flex-shrink-0 bg-green-500" />
                      <div className="flex-1 p-3 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-black text-gray-900">{entryTotal.toFixed(1)} kg</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100"
                            >
                              <Edit className="h-3 w-3 text-gray-500" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(entry.id)}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {parseFloat(entry.wetWasteKg || "0") > 0 && (
                            <span className="text-[8px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">{t('enums.wet')}: {entry.wetWasteKg}kg</span>
                          )}
                          {parseFloat(entry.dryWasteKg || "0") > 0 && (
                            <span className="text-[8px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">{t('enums.dry')}: {entry.dryWasteKg}kg</span>
                          )}
                          {parseFloat(entry.specialCareWasteKg || "0") > 0 && (
                            <span className="text-[8px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full">{t('enums.specialCare')}: {entry.specialCareWasteKg}kg</span>
                          )}
                          {parseFloat(entry.sanitaryWasteKg || "0") > 0 && (
                            <span className="text-[8px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">{t('enums.sanitary')}: {entry.sanitaryWasteKg}kg</span>
                          )}
                          {parseFloat(entry.mixedWasteKg || "0") > 0 && (
                            <span className="text-[8px] font-bold text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded-full">{t('enums.mixed')}: {entry.mixedWasteKg}kg</span>
                          )}
                        </div>
                        {entry.remarks && (
                          <p className="text-[9px] text-gray-400 mt-1 truncate">{entry.remarks}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
