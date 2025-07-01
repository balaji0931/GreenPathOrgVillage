import { useState } from "react";
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  Languages,
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
  Leaf,
} from "lucide-react";
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
  qrCodeUrl: string;
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

// Consolidated filter state
interface FilterState {
  search: string;
  date: string;
  status: string;
  collector: string;
}

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

const CreateHouseholdDialog = ({ villageId }: { villageId: string }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ headName: "", houseNumber: "", phone: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const householdMutation = useMutation({
    mutationFn: (data: { headName: string; houseNumber: string; phone: string }) =>
      apiRequest("POST", "/api/households", { ...data, villageId }),
    onSuccess: () => {
      toast({ title: t("messages.operationSuccess") });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/stats"] });
      setFormData({ headName: "", houseNumber: "", phone: "" });
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
    if (!formData.headName.trim() || !formData.houseNumber.trim() || !formData.phone.trim()) {
      toast({ title: t("validation.required"), variant: "destructive" });
      return;
    }
    householdMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("households.addHousehold")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("households.addHousehold")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="household-headName">{t("households.headName")} *</Label>
            <Input
              id="household-headName"
              value={formData.headName}
              onChange={(e) => setFormData(prev => ({ ...prev, headName: e.target.value }))}
              placeholder={t("households.headName")}
              required
            />
          </div>
          <div>
            <Label htmlFor="household-houseNumber">{t("households.houseNumber")} *</Label>
            <Input
              id="household-houseNumber"
              value={formData.houseNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, houseNumber: e.target.value }))}
              placeholder={t("households.houseNumber")}
              required
            />
          </div>
          <div>
            <Label htmlFor="household-phone">{t("households.phone")} *</Label>
            <Input
              id="household-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder={t("households.phone")}
              required
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              {t("app.cancel")}
            </Button>
            <Button type="submit" disabled={householdMutation.isPending} className="flex-1">
              {householdMutation.isPending ? t("app.submitting") : t("households.addHousehold")}
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
  const [activeTab, setActiveTab] = useState("overview");
  const [householdSubTab, setHouseholdSubTab] = useState("list");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState("generators");
  const [announcementPhotoFile, setAnnouncementPhotoFile] = useState<File | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<{
    type: 'image' | 'audio';
    url: string;
    title: string;
  } | null>(null);

  // Consolidated filters
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    date: "",
    status: "all",
    collector: "all"
  });

  // QR management state
  const [selectedQRHouseholds, setSelectedQRHouseholds] = useState<number[]>([]);
  const [selectedDownloadHouseholds, setSelectedDownloadHouseholds] = useState<number[]>([]);
  const [bulkHouseholds, setBulkHouseholds] = useState([
    { headName: "", houseNumber: "", phone: "", address: "" }
  ]);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      window.location.href = "/login";
    },
  });

  // Data fetching
  const { data: stats } = useQuery<VillageStats>({
    queryKey: ["/api/manager/stats", user?.villageId],
    enabled: !!user?.villageId,
  });

  const { data: collectors = [] } = useQuery<Collector[]>({
    queryKey: ["/api/collectors", user?.villageId],
    enabled: !!user?.villageId,
  });

  const { data: households = [] } = useQuery<Household[]>({
    queryKey: ["/api/households", user?.villageId],
    enabled: !!user?.villageId,
  });

  const { data: collectorStats = [] } = useQuery<CollectorStats[]>({
    queryKey: ["/api/collectors/stats", user?.villageId],
    enabled: !!user?.villageId,
  });

  const { data: allCollections = [] } = useQuery<WasteCollection[]>({
    queryKey: ["/api/waste-collections/village", user?.villageId],
    enabled: !!user?.villageId,
  });

  const { data: allIssues = [] } = useQuery<Issue[]>({
    queryKey: ["/api/issues", user?.villageId],
    enabled: !!user?.villageId,
  });

  const { data: feedbacks = [] } = useQuery<any[]>({
    queryKey: ["/api/feedback/village", user?.villageId],
    enabled: !!user?.villageId,
  });

  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["/api/announcements", user?.villageId],
    enabled: !!user?.villageId,
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
          
          const uploadResponse = await fetch('/api/upload/manager-proof', {
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
          console.error('Proof photo upload error:', uploadError);
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
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
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

  const sendAnnouncementMutation = useMutation({
    mutationFn: async (data: { message: string; targetAudience: string, photoFile: File | null }) => {
      let photoUrl = null;

      // Upload photo first if provided
      if (data.photoFile) {
        try {
          const formData = new FormData();
          formData.append('file', data.photoFile);
          
          const uploadResponse = await fetch('/api/upload/photo', {
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
          console.error('Photo upload error:', uploadError);
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
      setAnnouncementPhotoFile(null);
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

  // QR Code mutations
  const generateQRMutation = useMutation({
    mutationFn: (householdIds: number[]) =>
      apiRequest("POST", "/api/qr-codes/generate", { householdIds }),
    onSuccess: () => {
      toast({ title: "QR codes generated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      setSelectedQRHouseholds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate QR codes",
        variant: "destructive",
      });
    },
  });

  const downloadPDFMutation = useMutation({
    mutationFn: async (householdIds: number[]) => {
      const response = await fetch("/api/qr-codes/download-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdIds }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to download PDF");
      return response.blob();
    },
    onSuccess: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `household-qr-codes-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "QR codes PDF downloaded!" });
      setSelectedDownloadHouseholds([]);
    },
  });

  const createBulkHouseholdsMutation = useMutation({
    mutationFn: (householdsData: any[]) =>
      apiRequest("POST", "/api/households/bulk", { households: householdsData }),
    onSuccess: (response: any) => {
      const successCount = Array.isArray(response) ? response.length : 0;
      toast({
        title: "Success",
        description: `${successCount} households created successfully with QR codes!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/stats"] });
      setBulkHouseholds([{ headName: "", houseNumber: "", phone: "", address: "" }]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create households",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: "", date: "", status: "all", collector: "all" });
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
        {/* Top Navbar */}
        <div className="bg-green-600 text-white px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Leaf className="" size={24} strokeWidth={2.5}/>
            <div>
              <h1 className="font-bold text-2xl">{t('app.title')}</h1>
            </div>
          </div>
            <div className="flex items-center space-x-1">
              <LanguageSwitcher />
                <button
                  key={'announcements'}
                  onClick={() => setActiveTab('announcements')}
                  className={cn(
                    "flex-1 flex items-center justify-center py-3 transition-colors",
                    activeTab === 'announcements'
                      ? "text-green-600 bg-blue-50 p-2 rounded-md"
                      : "text-white hover:text-green-900 hover:bg-gray-50 p-2 rounded-md",
                  )}
                >
                  <Bell className="h-5 w-5" strokeWidth={3}/>
                </button>
                                <button
                  key={'profile'}
                  onClick={() => setActiveTab('profile')}
                  className={cn(
                    "flex-1 flex items-center justify-center py-3 transition-colors",
                    activeTab === 'profile'
                      ? "text-green-600 bg-blue-50 p-2 rounded-md"
                      : "text-white p-2 rounded-md",
                  )}
                >
                  <User className="h-5 w-5" strokeWidth={3}/>
                </button>

            </div>
        </div>
      </div>

        <div className="flex flex-1 min-h-0">
          {/* Mobile Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-green-100 border-t z-50 md:hidden">
            <div className="flex">
              {[
                { id: "overview", icon: LayoutDashboard },
                { id: "collectors", icon: Users },
                { id: "households", icon: Home },
                { id: "collections", icon: Package },
                { id: "issues", icon: AlertTriangle },
                { id: "reports", icon: BarChart3 },
              ].map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex-1 flex items-center justify-center py-3 transition-colors",
                    activeTab === id
                      ? "text-blue-600 bg-blue-50 rouded-lg"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={2.5}/>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Sidebar Navigation */}
          <div className="hidden md:block w-64 bg-white border-r sticky top-[64px] h-[calc(100vh-64px)] overflow-y-auto">
            <div className="p-4">
              <nav className="space-y-2">
                {[
                  { id: "overview", icon: LayoutDashboard, label: t("dashboard.overview") },
                  { id: "collectors", icon: Users, label: t("navigation.collectors") },
                  { id: "households", icon: Home, label: t("navigation.households") },
                  { id: "collections", icon: Package, label: t("navigation.collections") },
                  { id: "issues", icon: AlertTriangle, label: t("navigation.issues") },
                  { id: "reports", icon: BarChart3, label: t("navigation.reports") },
                  { id: "announcements", icon: Bell, label: t("navigation.announcements") },
                  { id: "profile", icon: User, label: t("navigation.profile") },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                      activeTab === id
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-3 sm:p-6 overflow-auto pb-20 md:pb-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{t("dashboard.overview")}</h2>
                  <p className="text-muted-foreground">{t("villages.villageStats")}</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <StatCard
                    title={t("households.totalHouseholds")}
                    value={stats?.totalHouseholds || 0}
                    icon={Home}
                    description={t("households.active")}
                  />
                  <StatCard
                    title={t("collectors.totalCollectors")}
                    value={stats?.totalCollectors || 0}
                    icon={Users}
                    description={t("collectors.activeCollectors")}
                  />
                  <StatCard
                    title={t("collections.todayCollections")}
                    value={stats?.collectionsToday || 0}
                    icon={Package}
                    description={t("reports.today")}
                  />
                  <StatCard
                    title={t("issues.openIssues")}
                    value={stats?.openIssues || 0}
                    icon={AlertTriangle}
                    description={t("app.pending")}
                  />
                </div>

                {/* Recent Announcements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-blue-600" />
                      {t("app.recentActivity")} {t("announcements.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {announcements.length > 0 ? (
                      <div className="space-y-3">
                        {announcements.slice(0, 3).map((announcement: any) => (
                          <div key={announcement.id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                            <p className="text-sm text-gray-800 font-medium">
                              {announcement.message}
                            </p>
                            <div className="flex justify-between items-center mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {announcement.targetAudience}
                              </Badge>
                              <p className="text-xs text-gray-500">
                                {new Date(announcement.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        {t("announcements.checkLater")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Collectors Tab */}
            {activeTab === "collectors" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">{t("collectors.title")}</h2>
                    <p className="text-muted-foreground">{t("collectors.title")}</p>
                  </div>
                  <div className="flex gap-2">
                    <CreateCollectorDialog villageId={user?.villageId || ""} />
                  </div>
                </div>

                {/* Date Filter */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("app.filter")} {t("dashboard.stats")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      
                      {/* Date Input */}
                      <div className="flex-1 w-full">
                        <Label htmlFor="analytics-date" className="text-sm mb-1 block">
                          {t("filters.startDate")}
                        </Label>
                        <Input
                          id="analytics-date"
                          type="date"
                          value={filters.date}
                          onChange={(e) => updateFilter("date", e.target.value)}
                          className="w-full"
                        />
                      </div>

                      {/* Clear Button */}
                      <div className="w-full sm:w-auto">
                        <Button
                          variant="outline"
                          onClick={clearFilters}
                          className="w-full sm:w-auto"
                        >
                          {t("app.clear")}
                        </Button>
                      </div>
                    </div>

                    {/* Info Text */}
                    <p className="text-xs text-muted-foreground mt-2">
                      {filters.date
                        ? `${t("app.filter")} ${new Date(filters.date).toLocaleDateString()}`
                        : t("app.all")}
                    </p>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {collectors.map((collector) => {
                    // Filter collections by date if selected
                    const filteredCollections = allCollections.filter(c => {
                      const collectionMatches = c.collectorId === collector.id;
                      if (!filters.date) return collectionMatches;
                      const collectionDate = new Date(c.collectionDate).toDateString();
                      const filterDate = new Date(filters.date).toDateString();
                      return collectionMatches && collectionDate === filterDate;
                    });

                    // Calculate real-time stats based on filtered data
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
                                
                                {/* Left: Collector Info */}
                                <div className="flex-1">
                                  <h3 className="font-semibold break-words">{collector.name}</h3>
                                  <p className="text-sm text-muted-foreground break-words">
                                    ID: {collector.uid} | Phone: {collector.phone}
                                  </p>

                                  {/* Stats Grid */}
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

                                {/* Right: Badge */}
                                <div className="sm:self-start">
                                  <Badge className="text-xs whitespace-nowrap">
                                    Click to view feedbacks
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                        </DialogTrigger>

                        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center justify-between">
                              <span>Collector Feedbacks - {collector.name}</span>
                            </DialogTitle>
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

            {/* Households Tab */}
            {activeTab === "households" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Households Management</h2>
                    <p className="text-muted-foreground">Manage households and QR codes</p>
                  </div>
                </div>

                <Tabs value={householdSubTab} onValueChange={setHouseholdSubTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 gap-2">
                    <TabsTrigger value="list">View All</TabsTrigger>
                    <TabsTrigger value="bulk">Add HouseHold</TabsTrigger>
                    <TabsTrigger value="qr-download">Download QR</TabsTrigger>
                  </TabsList>

                  <TabsContent value="list" className="space-y-4">
                    <div className="space-y-4">
                      {households.map((household) => (
                        <Card key={household.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold">{household.headName}</h3>
                                <p className="text-sm text-muted-foreground">
                                  House: {household.houseNumber} | ID: {household.uid} | Phone: {household.phone}
                                </p>
                                {household.qrCodeUrl && (
                                  <Badge variant="secondary" className="mt-2">
                                    <QrCode className="h-3 w-3 mr-1" />
                                    QR Code Available
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="bulk" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Add Multiple Households</CardTitle>
                        <CardDescription>Create multiple households at once with automatic QR code generation</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setBulkHouseholds([...bulkHouseholds, { headName: "", houseNumber: "", phone: "", address: "" }])}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Row
                            </Button>
                            <Button
                              onClick={() => {
                                const validHouseholds = bulkHouseholds.filter(h => 
                                  h.headName.trim() && h.houseNumber.trim() && h.phone.trim()
                                );
                                if (validHouseholds.length === 0) {
                                  toast({ title: "Please fill at least one complete household", variant: "destructive" });
                                  return;
                                }
                                createBulkHouseholdsMutation.mutate(validHouseholds);
                              }}
                              disabled={createBulkHouseholdsMutation.isPending || bulkHouseholds.every(h => !h.headName.trim())}
                            >
                              {createBulkHouseholdsMutation.isPending ? "Creating..." : `Create ${bulkHouseholds.filter(h => h.headName.trim() && h.houseNumber.trim() && h.phone.trim()).length} Households`}
                            </Button>
                          </div>

                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {bulkHouseholds.map((household, index) => (
                              <Card key={index} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                  <div>
                                    <Label htmlFor={`headName-${index}`}>Head Name *</Label>
                                    <Input
                                      id={`headName-${index}`}
                                      value={household.headName}
                                      onChange={(e) => {
                                        const updated = [...bulkHouseholds];
                                        updated[index].headName = e.target.value;
                                        setBulkHouseholds(updated);
                                      }}
                                      placeholder="Enter head name"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`houseNumber-${index}`}>House Number *</Label>
                                    <Input
                                      id={`houseNumber-${index}`}
                                      value={household.houseNumber}
                                      onChange={(e) => {
                                        const updated = [...bulkHouseholds];
                                        updated[index].houseNumber = e.target.value;
                                        setBulkHouseholds(updated);
                                      }}
                                      placeholder="House number"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`phone-${index}`}>Phone *</Label>
                                    <Input
                                      id={`phone-${index}`}
                                      value={household.phone}
                                      onChange={(e) => {
                                        const updated = [...bulkHouseholds];
                                        updated[index].phone = e.target.value;
                                        setBulkHouseholds(updated);
                                      }}
                                      placeholder="Phone number"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        if (bulkHouseholds.length > 1) {
                                          const updated = bulkHouseholds.filter((_, i) => i !== index);
                                          setBulkHouseholds(updated);
                                        }
                                      }}
                                      className="w-full"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <Label htmlFor={`address-${index}`}>Address (Optional)</Label>
                                  <Input
                                    id={`address-${index}`}
                                    value={household.address}
                                    onChange={(e) => {
                                      const updated = [...bulkHouseholds];
                                      updated[index].address = e.target.value;
                                      setBulkHouseholds(updated);
                                    }}
                                    placeholder="Full address"
                                  />
                                </div>
                              </Card>
                            ))}
                          </div>

                          {bulkHouseholds.length === 0 && (
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">Click "Add Row" to start adding households</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="qr-download" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Download QR Codes</CardTitle>
                        <CardDescription>Download household QR codes as PDF</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setSelectedDownloadHouseholds(households.filter(h => h.qrCodeUrl).map(h => h.id))}
                            >
                              Select All ({households.filter(h => h.qrCodeUrl).length})
                            </Button>
                            <Button
                              onClick={() => downloadPDFMutation.mutate(selectedDownloadHouseholds)}
                              disabled={selectedDownloadHouseholds.length === 0 || downloadPDFMutation.isPending}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {downloadPDFMutation.isPending ? "Generating..." : `Download PDF (${selectedDownloadHouseholds.length})`}
                            </Button>
                          </div>

                          {households.filter(h => h.qrCodeUrl).length === 0 ? (
                            <div className="text-center py-8">
                              <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-muted-foreground">No QR codes available yet</p>
                              <p className="text-sm text-muted-foreground">Add households to generate QR codes automatically</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {households.filter(h => h.qrCodeUrl).map((household) => (
                                <Card
                                  key={household.id}
                                  className="cursor-pointer hover:bg-gray-50"
                                  onClick={() => {
                                    setSelectedDownloadHouseholds(prev => 
                                      prev.includes(household.id) 
                                        ? prev.filter(id => id !== household.id)
                                        : [...prev, household.id]
                                    );
                                  }}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <img
                                          src={household.qrCodeUrl}
                                          alt="QR Code"
                                          className="h-12 w-12 rounded border"
                                        />
                                        <div>
                                          <h4 className="font-medium">{household.headName}</h4>
                                          <p className="text-sm text-muted-foreground">
                                            House: {household.houseNumber} | ID: {household.uid}
                                          </p>
                                        </div>
                                      </div>
                                      <input
                                        type="checkbox"
                                        checked={selectedDownloadHouseholds.includes(household.id)}
                                        onChange={() => {}}
                                        className="h-4 w-4"
                                      />
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Collections Tab */}
            {activeTab === "collections" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Collections Management</h2>
                  <p className="text-muted-foreground">View household collection status</p>
                </div>

                <Tabs defaultValue="collections" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="collections">Collections</TabsTrigger>
                    <TabsTrigger value="attention">Needs Attention</TabsTrigger>
                  </TabsList>

                  <TabsContent value="collections" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Search & Filter</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4">
                          
                          {/* Search Input */}
                          <div className="flex-1">
                            <Input
                              className="w-full"
                              placeholder="Search by name, UID, or house number..."
                              value={filters.search}
                              onChange={(e) => updateFilter("search", e.target.value)}
                            />
                          </div>

                          {/* Date Picker */}
                          <div className="w-full sm:w-auto">
                            <Input
                              className="w-full"
                              type="date"
                              value={filters.date}
                              onChange={(e) => updateFilter("date", e.target.value)}
                            />
                          </div>

                          {/* Clear Button */}
                          <div className="w-full sm:w-auto">
                            <Button
                              variant="outline"
                              onClick={clearFilters}
                              className="w-full sm:w-auto"
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>


                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <StatCard
                        title="Total Households"
                        value={households.length}
                        icon={Home}
                        description="Registered"
                      />
                      <StatCard
                        title="Collections Today"
                        value={(() => {
                          const targetDate = filters.date || new Date().toISOString().split('T')[0];
                          return allCollections.filter(c => {
                            const collectionDate = new Date(c.collectionDate);
                            return collectionDate.toDateString() === new Date(targetDate).toDateString();
                          }).length;
                        })()}
                        icon={CheckCircle}
                        description={filters.date ? "Selected date" : "Completed today"}
                      />
                      <StatCard
                        title="Total Collections"
                        value={allCollections.length}
                        icon={Package}
                        description="All time"
                      />
                      <StatCard
                        title="Avg Segregation"
                        value={(() => {
                          let filteredCollections = allCollections;
                          if (filters.date) {
                            filteredCollections = allCollections.filter(c => {
                              const collectionDate = new Date(c.collectionDate);
                              return collectionDate.toDateString() === new Date(filters.date).toDateString();
                            });
                          }
                          return filteredCollections.length > 0 
                            ? (filteredCollections.reduce((sum, c) => sum + (c.segregationRating || 0), 0) / filteredCollections.length).toFixed(1)
                            : "0.0";
                        })()}
                        icon={Star}
                        description="Rating"
                      />
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Household Collection Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {households
                            .filter(household => {
                              if (!filters.search) return true;
                              const search = filters.search.toLowerCase();
                              return (
                                household.headName?.toLowerCase().includes(search) ||
                                household.uid?.toLowerCase().includes(search) ||
                                household.houseNumber?.toLowerCase().includes(search)
                              );
                            })
                            .map((household) => {
                              const householdCollections = allCollections.filter(c => c.householdId === household.id);
                              
                              let targetCollection = null;
                              let collectionStatus = "never";
                              
                              if (filters.date) {
                                // Show collection for specific date
                                targetCollection = householdCollections.find(c => {
                                  const collectionDate = new Date(c.collectionDate);
                                  return collectionDate.toDateString() === new Date(filters.date).toDateString();
                                });
                                collectionStatus = targetCollection ? "collected" : "pending";
                              } else {
                                // Show today's collection or latest
                                const todayCollection = householdCollections.find(c => {
                                  const collectionDate = new Date(c.collectionDate);
                                  const today = new Date();
                                  return collectionDate.toDateString() === today.toDateString();
                                });
                                
                                if (todayCollection) {
                                  targetCollection = todayCollection;
                                  collectionStatus = "collected";
                                } else if (householdCollections.length > 0) {
                                  targetCollection = householdCollections.sort((a, b) => 
                                    new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime()
                                  )[0];
                                  collectionStatus = "done_before";
                                } else {
                                  collectionStatus = "never";
                                }
                              }

                          return (
                                <Dialog key={household.id}>
                                  <DialogTrigger asChild>
                                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                      <CardContent className="p-3 sm:p-4">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm sm:text-base truncate">
                                              {household.headName}
                                            </h3>
                                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                              {household.uid} • House: {household.houseNumber}
                                            </p>
                                            {targetCollection && (
                                              <div className="mt-2 text-xs text-muted-foreground">
                                                Rating: {targetCollection.segregationRating || "N/A"}/5 • 
                                                Collector: {targetCollection.collectorName || "Unknown"}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex flex-col items-end gap-1">
                                            <Badge
                                              variant={
                                                collectionStatus === "collected" ? "default" :
                                                collectionStatus === "pending" ? "destructive" :
                                                collectionStatus === "done_before" ? "secondary" : "destructive"
                                              }
                                              className="text-xs whitespace-nowrap"
                                            >
                                              {collectionStatus === "collected" ? "✅ Collected" :
                                               collectionStatus === "pending" ? "⏳ Pending" :
                                               collectionStatus === "done_before" ? "📅 Done Before" : "❌ Never"}
                                            </Badge>
                                            {targetCollection && (
                                              <div className="text-xs text-muted-foreground">
                                                {new Date(targetCollection.collectionDate).toLocaleDateString()}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </DialogTrigger>

                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Collection Details - {household.headName}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label>Household ID</Label>
                                          <p className="font-medium">{household.uid}</p>
                                        </div>
                                        <div>
                                          <Label>House Number</Label>
                                          <p className="font-medium">{household.houseNumber}</p>
                                        </div>
                                      </div>

                                      {filters.date && targetCollection ? (
                                        <div>
                                          <Label>Collection for {new Date(filters.date).toLocaleDateString()}</Label>
                                          <Card className="mt-2">
                                            <CardContent className="p-4">
                                              <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                  <h4 className="font-medium">Collection Details</h4>
                                                  <div className="flex items-center gap-2">
                                                    <Badge variant="outline">
                                                      {new Date(targetCollection.collectionDate).toLocaleDateString()}
                                                    </Badge>
                                                    <Badge variant={targetCollection.status === "collected" ? "default" : "destructive"}>
                                                      {targetCollection.status || "collected"}
                                                    </Badge>
                                                  </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                  <div>
                                                    <span className="text-muted-foreground">Collector:</span> {targetCollection.collectorName || "Unknown"}
                                                  </div>
                                                  <div>
                                                    <span className="text-muted-foreground">Time:</span> {new Date(targetCollection.collectionDate).toLocaleTimeString()}
                                                  </div>
                                                </div>

                                                <div className="border-t pt-3">
                                                  <h5 className="font-medium text-sm mb-2">Collection Details:</h5>
                                                  <div className="space-y-2">
                                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                      <span className="text-sm font-medium">Segregation Rating:</span>
                                                      <div className="flex items-center gap-1">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                          <Star
                                                            key={i}
                                                            className={`h-4 w-4 ${i < (targetCollection.segregationRating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                                          />
                                                        ))}
                                                        <span className="ml-2 text-sm font-bold">
                                                          ({targetCollection.segregationRating || 0}/5)
                                                        </span>
                                                      </div>
                                                    </div>

                                                    {targetCollection.plasticRating && (
                                                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                        <span className="text-sm font-medium">Plastic Rating:</span>
                                                        <div className="flex items-center gap-1">
                                                          {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star
                                                              key={i}
                                                              className={`h-4 w-4 ${i < (targetCollection.plasticRating || 0) ? "fill-blue-400 text-blue-400" : "text-gray-300"}`}
                                                            />
                                                          ))}
                                                          <span className="ml-2 text-sm font-bold">
                                                            ({targetCollection.plasticRating}/5)
                                                          </span>
                                                        </div>
                                                      </div>
                                                    )}

                                                    {targetCollection.observations && (
                                                      <div className="p-2 bg-blue-50 rounded">
                                                        <span className="text-sm font-medium block mb-1">Observations:</span>
                                                        <p className="text-sm text-gray-700">"{targetCollection.observations}"</p>
                                                      </div>
                                                    )}

                                                    {targetCollection.remarks && (
                                                      <div className="p-2 bg-green-50 rounded">
                                                        <span className="text-sm font-medium block mb-1">Remarks:</span>
                                                        <p className="text-sm text-gray-700">"{targetCollection.remarks}"</p>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                <div className="space-y-3 pt-3 border-t">
                                                  {targetCollection.photo && (
                                                    <div className="space-y-2">
                                                      <Label className="text-sm font-medium">Collection Photo:</Label>
                                                      <div className="border rounded-lg overflow-hidden bg-gray-50">
                                                        <img
                                                          src={targetCollection.photo}
                                                          alt="Collection photo"
                                                          className="w-full max-h-64 object-contain"
                                                          onError={(e) => {
                                                            e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDEyVjdIMTlWNUMxOSAzLjg5NTQzIDE4LjEwNDYgMyAxNyAzSDdDNS44OTU0MyAzIDUgMy44OTU0MyA1IDVWMTlDNSAyMC4xMDQ2IDUuODk1NDMgMjEgNyAyMUgxMiIgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjIiLz4KPHBhdGggZD0iTTE0IDE0TDE3IDE3TDIxIDEzIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K";
                                                          }}
                                                        />
                                                      </div>
                                                    </div>
                                                  )}
                                                  {targetCollection.voiceUrl && (
                                                    <div className="space-y-2">
                                                      <Label className="text-sm font-medium">Voice Recording:</Label>
                                                      <audio
                                                        controls
                                                        className="w-full h-10"
                                                        preload="metadata"
                                                      >
                                                        <source src={targetCollection.voiceUrl} type="audio/mpeg" />
                                                        <source src={targetCollection.voiceUrl} type="audio/wav" />
                                                        <source src={targetCollection.voiceUrl} type="audio/ogg" />
                                                        Your browser does not support the audio element.
                                                      </audio>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        </div>
                                      ) : (
                                        <div>
                                          <Label>Collection History ({householdCollections.length} total)</Label>
                                          {householdCollections.length > 0 ? (
                                            <div className="mt-2 space-y-3 max-h-96 overflow-y-auto">
                                              {householdCollections
                                                .sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime())
                                                .map((collection, index) => (
                                                  <Card key={collection.id}>
                                                    <CardContent className="p-4">
                                                      <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                          <h4 className="font-medium">
                                                            Collection #{householdCollections.length - index}
                                                          </h4>
                                                          <div className="flex items-center gap-2">
                                                            <Badge variant="outline">
                                                              {new Date(collection.collectionDate).toLocaleDateString()}
                                                            </Badge>
                                                            <Badge variant={collection.status === "collected" ? "default" : "destructive"}>
                                                              {collection.status || "collected"}
                                                            </Badge>
                                                          </div>
                                                        </div>

                                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                      <span className="text-muted-foreground">Collector:</span> {collection.collectorName || "Unknown"}
                                                    </div>
                                                    <div>
                                                      <span className="text-muted-foreground">Time:</span> {new Date(collection.collectionDate).toLocaleTimeString()}
                                                    </div>
                                                  </div>

                                                  <div className="border-t pt-3">
                                                    <h5 className="font-medium text-sm mb-2">Collection Details:</h5>
                                                    <div className="space-y-2">
                                                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                        <span className="text-sm font-medium">Segregation Rating:</span>
                                                        <div className="flex items-center gap-1">
                                                          {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star
                                                              key={i}
                                                              className={`h-4 w-4 ${i < (collection.segregationRating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                                            />
                                                          ))}
                                                          <span className="ml-2 text-sm font-bold">
                                                            ({collection.segregationRating || 0}/5)
                                                          </span>
                                                        </div>
                                                      </div>

                                                      {collection.plasticRating && (
                                                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                          <span className="text-sm font-medium">Plastic Rating:</span>
                                                          <div className="flex items-center gap-1">
                                                            {Array.from({ length: 5 }).map((_, i) => (
                                                              <Star
                                                                key={i}
                                                                className={`h-4 w-4 ${i < (collection.plasticRating || 0) ? "fill-blue-400 text-blue-400" : "text-gray-300"}`}
                                                              />
                                                            ))}
                                                            <span className="ml-2 text-sm font-bold">
                                                              ({collection.plasticRating}/5)
                                                            </span>
                                                          </div>
                                                        </div>
                                                      )}

                                                      {collection.observations && (
                                                        <div className="p-2 bg-blue-50 rounded">
                                                          <span className="text-sm font-medium block mb-1">Observations:</span>
                                                          <p className="text-sm text-gray-700">"{collection.observations}"</p>
                                                        </div>
                                                      )}

                                                      {collection.remarks && (
                                                        <div className="p-2 bg-green-50 rounded">
                                                          <span className="text-sm font-medium block mb-1">Remarks:</span>
                                                          <p className="text-sm text-gray-700">"{collection.remarks}"</p>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>

                                                  <div className="space-y-3 pt-3 border-t">
                                                    {collection.photo && (
                                                      <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Collection Photo:</Label>
                                                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                                                          <img
                                                            src={collection.photo}
                                                            alt="Collection photo"
                                                            className="w-full max-h-64 object-contain"
                                                            onError={(e) => {
                                                              e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDEyVjdIMTlWNUMxOSAzLjg5NTQzIDE4LjEwNDYgMyAxNyAzSDdDNS44OTU0MyAzIDUgMy44OTU0MyA1IDVWMTlDNSAyMC4xMDQ2IDUuODk1NDMgMjEgNyAyMUgxMiIgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjIiLz4KPHBhdGggZD0iTTE0IDE0TDE3IDE3TDIxIDEzIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K";
                                                            }}
                                                          />
                                                        </div>
                                                      </div>
                                                    )}
                                                    {collection.voiceUrl && (
                                                      <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Voice Recording:</Label>
                                                        <audio
                                                          controls
                                                          className="w-full h-10"
                                                          preload="metadata"
                                                        >
                                                          <source src={collection.voiceUrl} type="audio/mpeg" />
                                                          <source src={collection.voiceUrl} type="audio/wav" />
                                                          <source src={collection.voiceUrl} type="audio/ogg" />
                                                          Your browser does not support the audio element.
                                                        </audio>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          ))}
                                            </div>
                                          ) : (
                                            <div className="text-center py-8">
                                              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                              <p className="text-muted-foreground">No collections recorded</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="attention" className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <StatCard
                        title="Red Flags"
                        value={(() => {
                          return households.filter(household => {
                            const householdCollections = allCollections
                              .filter(c => c.householdId === household.id)
                              .sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime())
                              .slice(0, 10); // Last 10 collections for this household
                            
                            // Count collections where waste was not collected due to poor segregation or rating < 4
                            const problemCollections = householdCollections.filter(c => 
                              (c.segregationRating && c.segregationRating < 4) || 
                              (c.status === "not_collected" && c.missedReason && c.missedReason.includes("segregat"))
                            ).length;
                            
                            return problemCollections >= 3;
                          }).length;
                        })()}
                        icon={AlertTriangle}
                        description="Need immediate attention"
                      />
                      <StatCard
                        title="Green Flags"
                        value={(() => {
                          return households.filter(household => {
                            const householdCollections = allCollections
                              .filter(c => c.householdId === household.id)
                              .sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime())
                              .slice(0, 10); // Last 10 collections for this household
                            
                            // Count collections where waste was not collected due to poor segregation or rating < 4
                            const problemCollections = householdCollections.filter(c => 
                              (c.segregationRating && c.segregationRating < 4) || 
                              (c.status === "not_collected" && c.missedReason && c.missedReason.includes("segregat"))
                            ).length;
                            
                            return problemCollections < 3;
                          }).length;
                        })()}
                        icon={CheckCircle}
                        description="Performing well"
                      />
                      <StatCard
                        title="Total Households"
                        value={households.length}
                        icon={Home}
                        description="Registered"
                      />
                      <StatCard
                        title="Avg Performance"
                        value={(() => {
                          const totalScore = households.reduce((sum, household) => {
                            const householdCollections = allCollections
                              .filter(c => c.householdId === household.id)
                              .sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime())
                              .slice(0, 10);
                            
                            const uncollectedCount = 10 - householdCollections.length;
                            const lowRatingCount = householdCollections.filter(c => (c.segregationRating || 0) < 4).length;
                            const issues = uncollectedCount + lowRatingCount;
                            
                            return sum + Math.max(0, (10 - issues) * 10);
                          }, 0);
                          
                          return households.length > 0 ? Math.round(totalScore / households.length) : 0;
                        })()}
                        icon={Award}
                        description="Performance score"
                      />
                    </div>

                    <Tabs defaultValue="red-flags" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="red-flags">🚩 Red Flags</TabsTrigger>
                        <TabsTrigger value="green-flags">🟢 Green Flags</TabsTrigger>
                      </TabsList>

                      <TabsContent value="red-flags" className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                              Households Needing Immediate Attention
                            </CardTitle>
                            <CardDescription>
                              Households with 3+ missed collections or poor ratings (below 4 stars) in last 10 collections
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {households
                                .filter(household => {
                                  const householdCollections = allCollections
                                    .filter(c => c.householdId === household.id)
                                    .sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime())
                                    .slice(0, 10); // Last 10 collections for this household
                                  
                                  // Count collections where waste was not collected due to poor segregation or rating < 4
                                  const problemCollections = householdCollections.filter(c => 
                                    (c.segregationRating && c.segregationRating < 4) || 
                                    (c.status === "not_collected" && c.missedReason && c.missedReason.includes("segregat"))
                                  ).length;
                                  
                                  return problemCollections >= 3;
                                })
                                .map((household) => {
                                  const householdCollections = allCollections
                                    .filter(c => c.householdId === household.id)
                                    .sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime())
                                    .slice(0, 10); // Last 10 collections for this household
                                  
                                  const problemCollections = householdCollections.filter(c => 
                                    (c.segregationRating && c.segregationRating < 4) || 
                                    (c.status === "not_collected" && c.missedReason && c.missedReason.includes("segregat"))
                                  ).length;
                                  const avgRating = householdCollections.length > 0 
                                    ? (householdCollections.reduce((sum, c) => sum + (c.segregationRating || 0), 0) / householdCollections.length).toFixed(1)
                                    : "0.0";

                                  return (
                                    <Card key={household.id} className="border-l-4 border-l-red-500">
                                      <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <h3 className="font-semibold">{household.headName}</h3>
                                            <p className="text-sm text-muted-foreground">
                                              {household.uid} • House: {household.houseNumber}
                                            </p>
                                            <div className="mt-2 flex gap-4 text-sm">
                                              <span className="text-red-600">
                                                Problem collections: {problemCollections} out of {householdCollections.length}
                                              </span>
                                              <span className="text-blue-600">
                                                Avg rating: {avgRating}/5
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex flex-col items-end gap-2">
                                            <Badge variant="destructive">
                                              🚩 {problemCollections} Issues
                                            </Badge>
                                            <div className="text-xs text-muted-foreground">
                                              {householdCollections.length} total collections
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                            </div>
                            {households.filter(household => {
                              const householdCollections = allCollections
                                .filter(c => c.householdId === household.id)
                                .sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime())
                                .slice(0, 10);
                              
                              const problemCollections = householdCollections.filter(c => 
                                (c.segregationRating && c.segregationRating < 4) || 
                                (c.status === "not_collected" && c.missedReason && c.missedReason.includes("segregat"))
                              ).length;
                              
                              return problemCollections >= 3;
                            }).length === 0 && (
                              <div className="text-center py-8">
                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <p className="text-muted-foreground">All households are performing well!</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="green-flags" className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-green-500" />
                              Well-Performing Households
                            </CardTitle>
                            <CardDescription>
                              Households with good collection compliance and ratings
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {households
                                .filter(household => {
                                  const householdCollections = allCollections
                                    .filter(c => c.householdId === household.id)
                                    .sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime())
                                    .slice(0, 10); // Last 10 collections for this household
                                  
                                  // Count collections where waste was not collected due to poor segregation or rating < 4
                                  const problemCollections = householdCollections.filter(c => 
                                    (c.segregationRating && c.segregationRating < 4) || 
                                    (c.status === "not_collected" && c.missedReason && c.missedReason.includes("segregat"))
                                  ).length;
                                  
                                  return problemCollections < 3;
                                })
                                .map((household) => {
                                  const householdCollections = allCollections
                                    .filter(c => c.householdId === household.id)
                                    .sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime())
                                    .slice(0, 10); // Last 10 collections for this household
                                  
                                  const problemCollections = householdCollections.filter(c => 
                                    (c.segregationRating && c.segregationRating < 4) || 
                                    (c.status === "not_collected" && c.missedReason && c.missedReason.includes("segregat"))
                                  ).length;
                                  const avgRating = householdCollections.length > 0 
                                    ? (householdCollections.reduce((sum, c) => sum + (c.segregationRating || 0), 0) / householdCollections.length).toFixed(1)
                                    : "0.0";

                                  return (
                                    <Card key={household.id} className="border-l-4 border-l-green-500">
                                      <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <h3 className="font-semibold">{household.headName}</h3>
                                            <p className="text-sm text-muted-foreground">
                                              {household.uid} • House: {household.houseNumber}
                                            </p>
                                            <div className="mt-2 flex gap-4 text-sm">
                                              <span className="text-green-600">
                                                Collections: {householdCollections.length} total
                                              </span>
                                              <span className="text-blue-600">
                                                Avg rating: {avgRating}/5
                                              </span>
                                              <span className="text-purple-600">
                                                Good ratings: {householdCollections.filter(c => (c.segregationRating || 0) >= 4).length}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex flex-col items-end gap-2">
                                            <Badge variant="default" className="bg-green-500">
                                              🟢 Excellent
                                            </Badge>
                                            <div className="text-xs text-muted-foreground">
                                              {problemCollections} problem collections only
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>
                </Tabs>
              </div>
            )}

          {activeTab === "profile" && (
          <div className="space-y-4 p-4">
            {/* User Info */}
            <Card>
              <CardHeader className="pb-3 items-center">
                <CardTitle className="flex items-center text-2xl font-bold">
                  <User className="w-6 h-6 mr-2" strokeWidth={3}/>
                  {t("profile.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-center">
                <div>
                  <Label className="text-xs text-gray-600">{t("households.headName")}</Label>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">{t("auth.userId")}</Label>
                  <p className="font-medium">{user?.userId}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">{t("villages.title")}</Label>
                  <p className="font-medium">{user?.villageId}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600 pr-3">{t("roles.manager")}</Label>
                  <Badge variant="secondary">{user?.role}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Settings className="w-5 h-5 mr-2" />
                  {t("navigation.settings")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                            {/* Password Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordDialog(true)}
                className="flex items-center justify-center gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm w-full"
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="">{t("app.changePassword")}</span>
              </Button>

              {/* Logout Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                className="flex items-center justify-center gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm w-full"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="">{t("auth.logout")}</span>
              </Button>
              </CardContent>
            </Card>
          </div>
        )}

            {/* Issues Tab */}
            {activeTab === "issues" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Issues Management</h2>
                    <p className="text-muted-foreground">Manage village issues</p>
                  </div>
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
                    <CardTitle>Issue Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {allIssues
                        .filter(issue => filters.status === "all" || issue.status === filters.status)
                        .map((issue) => (
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
                  </CardContent>

                </Card>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === "reports" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Reports & Analytics</h2>
                  <p className="text-muted-foreground">Comprehensive performance insights and trends</p>
                </div>

                <Tabs defaultValue="overall" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overall">Overall Reports</TabsTrigger>
                    <TabsTrigger value="daily">Daily Reports</TabsTrigger>
                  </TabsList>

                  {/* Overall Reports Tab */}
                  <TabsContent value="overall" className="space-y-6">
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
                              const percentage = stats?.totalHouseholds > 0 
                                ? (collectionsForDay / stats.totalHouseholds) * 100 
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
                                      className={`h-4 rounded-full transition-all ${
                                        avgRating >= 4 ? 'bg-green-500' : 
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
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="20"/>
                                    {total > 0 && (
                                      <>
                                        <circle 
                                          cx="50" cy="50" r="40" fill="none" 
                                          stroke="#ef4444" strokeWidth="20"
                                          strokeDasharray={`${(poor/total) * 251.3} 251.3`}
                                          strokeDashoffset="0"
                                        />
                                        <circle 
                                          cx="50" cy="50" r="40" fill="none" 
                                          stroke="#eab308" strokeWidth="20"
                                          strokeDasharray={`${(good/total) * 251.3} 251.3`}
                                          strokeDashoffset={`-${(poor/total) * 251.3}`}
                                        />
                                        <circle 
                                          cx="50" cy="50" r="40" fill="none" 
                                          stroke="#22c55e" strokeWidth="20"
                                          strokeDasharray={`${(excellent/total) * 251.3} 251.3`}
                                          strokeDashoffset={`-${((poor + good)/total) * 251.3}`}
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
                                    <circle cx="50" cy="50" r="35" fill="none" stroke="#f3f4f6" strokeWidth="25"/>
                                    {total > 0 && (
                                      <>
                                        <circle 
                                          cx="50" cy="50" r="35" fill="none" 
                                          stroke="#22c55e" strokeWidth="25"
                                          strokeDasharray={`${(composting/total) * 219.9} 219.9`}
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
                                      className={`h-3 rounded-full transition-all ${
                                        avgRating >= 4 ? 'bg-green-500' : 
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
                  </TabsContent>

                  {/* Daily Reports Tab */}
                  <TabsContent value="daily" className="space-y-6">
                    {/* Date Filter for Daily Reports */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Select Date for Daily Report</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4 items-center">
                          <div className="flex-1">
                            <Label htmlFor="daily-date">Select Date</Label>
                            <Input
                              id="daily-date"
                              type="date"
                              value={filters.date || new Date().toISOString().split('T')[0]}
                              onChange={(e) => updateFilter("date", e.target.value)}
                            />
                          </div>
                          <Button variant="outline" onClick={() => updateFilter("date", new Date().toISOString().split('T')[0])}>
                            Today
                          </Button>
                        </div>
                      </CardContent>
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
                          <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            Collection Status Overview
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
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="20"/>
                                    {total > 0 && (
                                      <>
                                        <circle 
                                          cx="50" cy="50" r="40" fill="none" 
                                          stroke="#22c55e" strokeWidth="20"
                                          strokeDasharray={`${(collected/total) * 251.3} 251.3`}
                                          strokeDashoffset="0"
                                        />
                                        <circle 
                                          cx="50" cy="50" r="40" fill="none" 
                                          stroke="#ef4444" strokeWidth="20"
                                          strokeDasharray={`${(notCollected/total) * 251.3} 251.3`}
                                          strokeDashoffset={`-${(collected/total) * 251.3}`}
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
                          <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-600" />
                            Segregation Rating Distribution
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

                      {/* 3. Collector Performance for the Day */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-purple-600" />
                            Collector Performance Today
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {collectors.map(collector => {
                              const targetDate = filters.date || new Date().toISOString().split('T')[0];
                              const collectorCollections = allCollections.filter(c => 
                                c.collectorId === collector.id &&
                                new Date(c.collectionDate).toDateString() === new Date(targetDate).toDateString()
                              );
                              const avgRating = collectorCollections.length > 0
                                ? (collectorCollections.reduce((sum, c) => sum + (c.segregationRating || 0), 0) / collectorCollections.length)
                                : 0;

                              return (
                                <div key={collector.id} className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium">{collector.name}</h4>
                                    <Badge variant="outline">{collectorCollections.length} collections</Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          avgRating >= 4 ? 'bg-green-500' : 
                                          avgRating >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${(avgRating / 5) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* 4. Collection Timeline */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-indigo-600" />
                            Collection Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {Array.from({ length: 12 }).map((_, i) => {
                              const hour = i + 8; // Start from 8 AM
                              const targetDate = filters.date || new Date().toISOString().split('T')[0];
                              const hourCollections = allCollections.filter(c => {
                                const collectionDate = new Date(c.collectionDate);
                                return collectionDate.toDateString() === new Date(targetDate).toDateString() &&
                                       collectionDate.getHours() === hour;
                              }).length;

                              const maxCollections = Math.max(...Array.from({ length: 12 }).map((_, j) => {
                                const h = j + 8;
                                return allCollections.filter(c => {
                                  const collectionDate = new Date(c.collectionDate);
                                  return collectionDate.toDateString() === new Date(targetDate).toDateString() &&
                                         collectionDate.getHours() === h;
                                }).length;
                              }));

                              const percentage = maxCollections > 0 ? (hourCollections / maxCollections) * 100 : 0;

                              return (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="w-16 text-xs text-muted-foreground">
                                    {hour}:00
                                  </div>
                                  <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
                                    <div 
                                      className="bg-indigo-500 h-3 rounded-full transition-all" 
                                      style={{ width: `${percentage}%` }}
                                    />
                                    {hourCollections > 0 && (
                                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                        {hourCollections}
                                      </span>
                                    )}
                                  </div>
                                  <div className="w-8 text-xs text-right">
                                    {hourCollections}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Announcements Tab */}
            {activeTab === "announcements" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Announcements</h2>
                  <p className="text-muted-foreground">Send updates to your village</p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Send New Announcement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (announcementMessage.trim()) {
                          sendAnnouncementMutation.mutate({
                            message: announcementMessage,
                            targetAudience: announcementTarget,
                          });
                        }
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={announcementMessage}
                          onChange={(e) => setAnnouncementMessage(e.target.value)}
                          placeholder="Type your announcement..."
                          rows={4}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="target">Target Audience</Label>
                        <Select value={announcementTarget} onValueChange={setAnnouncementTarget}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="generators">Households</SelectItem>
                            <SelectItem value="collectors">Collectors</SelectItem>
                            <SelectItem value="all">All Users</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="submit"
                        disabled={sendAnnouncementMutation.isPending || !announcementMessage.trim()}
                        className="w-full"
                      >
                        {sendAnnouncementMutation.isPending ? "Sending..." : "Send Announcement"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Announcements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {announcements.length > 0 ? (
                        announcements.map((announcement: any) => (
                          <Card key={announcement.id} className="border-l-4 border-l-blue-400">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <p className="text-sm font-medium flex-1">{announcement.message}</p>
                                <Badge variant="secondary">{announcement.targetAudience}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(announcement.createdAt).toLocaleDateString()}
                              </p>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No announcements sent yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
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
      </Dialog>

      {/* Issue Management Dialog */}
      <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
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
      </Dialog>
    </>
  );
}