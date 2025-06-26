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

interface CollectorStats {
  id: number;
  name: string;
  totalCollections: number;
  averageRating: number;
  complaintsCount: number;
}

interface Complaint {
  id: number;
  collectorId: number;
  householdId: number;
  complaint: string;
  managerResponse?: string;
  status: "open" | "resolved";
  createdAt: string;
  collectorName: string;
  householdUid: string;
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

  const collectorMutation = useMutation({
    mutationFn: (data: { name: string; phone: string }) =>
      apiRequest("POST", "/api/collectors", { ...data, villageId }),
    onSuccess: () => {
      toast({ title: "Collector created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/collectors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/stats"] });
      setFormData({ name: "", phone: "" });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create collector",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    collectorMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Collector
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Collector</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="collector-name">Name *</Label>
            <Input
              id="collector-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter collector name"
              required
            />
          </div>
          <div>
            <Label htmlFor="collector-phone">Phone *</Label>
            <Input
              id="collector-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter phone number"
              required
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={collectorMutation.isPending} className="flex-1">
              {collectorMutation.isPending ? "Adding..." : "Add Collector"}
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

  const householdMutation = useMutation({
    mutationFn: (data: { headName: string; houseNumber: string; phone: string }) =>
      apiRequest("POST", "/api/households", { ...data, villageId }),
    onSuccess: () => {
      toast({ title: "Household created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/stats"] });
      setFormData({ headName: "", houseNumber: "", phone: "" });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create household",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.headName.trim() || !formData.houseNumber.trim() || !formData.phone.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    householdMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Household
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Household</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="household-headName">Head of Household *</Label>
            <Input
              id="household-headName"
              value={formData.headName}
              onChange={(e) => setFormData(prev => ({ ...prev, headName: e.target.value }))}
              placeholder="Enter head of household name"
              required
            />
          </div>
          <div>
            <Label htmlFor="household-houseNumber">House Number *</Label>
            <Input
              id="household-houseNumber"
              value={formData.houseNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, houseNumber: e.target.value }))}
              placeholder="Enter house number"
              required
            />
          </div>
          <div>
            <Label htmlFor="household-phone">Phone *</Label>
            <Input
              id="household-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter phone number"
              required
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={householdMutation.isPending} className="flex-1">
              {householdMutation.isPending ? "Adding..." : "Add Household"}
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

  const { data: complaints = [] } = useQuery<Complaint[]>({
    queryKey: ["/api/complaints", user?.villageId],
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
    mutationFn: ({ issueId, status, managerReply }: {
      issueId: number;
      status: string;
      managerReply?: string;
    }) => apiRequest("PUT", `/api/issues/${issueId}`, { status, managerReply }),
    onSuccess: () => {
      toast({ title: "Issue updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      setShowIssueDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to update issue", variant: "destructive" });
    },
  });

  const resolveComplaintMutation = useMutation({
    mutationFn: (data: { complaintId: number; managerResponse: string }) =>
      apiRequest("PUT", `/api/complaints/${data.complaintId}/resolve`, {
        managerResponse: data.managerResponse,
      }),
    onSuccess: () => {
      toast({ title: "Complaint resolved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
    },
  });

  const sendAnnouncementMutation = useMutation({
    mutationFn: (data: { message: string; targetAudience: string }) =>
      apiRequest("POST", "/api/announcements", {
        ...data,
        villageId: user?.villageId,
      }),
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

  const ComplaintManagementDialog = () => {
    const [open, setOpen] = useState(false);
    const [selectedComplaint, setSelectedComplaint] =
      useState<Complaint | null>(null);
    const [managerResponse, setManagerResponse] = useState("");
  
    const handleResolve = (complaint: Complaint) => {
      setSelectedComplaint(complaint);
      setOpen(true);
    };
  
    const submitResolution = () => {
      if (selectedComplaint && managerResponse) {
        resolveComplaintMutation.mutate({
          complaintId: selectedComplaint.id,
          managerResponse,
        });
        setOpen(false);
        setManagerResponse("");
        setSelectedComplaint(null);
      }
    };
  
    return (
      <>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Manage Complaints (
              {complaints.filter((c) => c.status === "open").length})
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Collector Complaints Management</DialogTitle>
            </DialogHeader>
  
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {complaints.map((complaint) => (
                <Card key={complaint.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              complaint.status === "open"
                                ? "destructive"
                                : "default"
                            }
                          >
                            {complaint.status}
                          </Badge>
                          <span className="font-medium">
                            {complaint.collectorName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Household: {complaint.householdUid}
                          </span>
                        </div>
                        <p className="text-sm">{complaint.complaint}</p>
                        {complaint.managerResponse && (
                          <div className="mt-2 p-2 bg-muted rounded">
                            <p className="text-sm">
                              <strong>Manager Response:</strong>{" "}
                              {complaint.managerResponse}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(complaint.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {complaint.status === "open" && (
                        <Button
                          size="sm"
                          onClick={() => handleResolve(complaint)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {complaints.length === 0 && (
                <p className="text-center text-muted-foreground">
                  No complaints found.
                </p>
              )}
            </div>
  
            <div>
              {selectedComplaint && (
                <div className="mt-4">
                  <Textarea
                    value={managerResponse}
                    onChange={(e) => setManagerResponse(e.target.value)}
                    placeholder="Enter your response to resolve this complaint..."
                    rows={4}
                  />
                  <Button
                    onClick={submitResolution}
                    disabled={!managerResponse}
                    className="w-full mt-2"
                  >
                    Resolve Complaint
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  const CollectorFeedbackModal = ({ collector, allCollections, feedbacks }: {
    collector: Collector;
    allCollections: WasteCollection[];
    feedbacks: any[];
  }) => {
    const [feedbackDateFilter, setFeedbackDateFilter] = useState("");

    // Get feedbacks for this collector
    const collectorFeedbacks = feedbacks.filter(feedback => feedback.toCollectorId === collector.id);
    
    // Filter feedbacks by date if selected
    const filteredFeedbacks = collectorFeedbacks.filter(feedback => {
      if (!feedbackDateFilter) return true;
      const feedbackDate = new Date(feedback.createdAt).toDateString();
      const filterDate = new Date(feedbackDateFilter).toDateString();
      return feedbackDate === filterDate;
    });

    // Get collections count for this collector
    const collectorCollections = allCollections.filter(c => c.collectorId === collector.id);
    const filteredCollections = collectorCollections.filter(collection => {
      if (!feedbackDateFilter) return true;
      const collectionDate = new Date(collection.collectionDate).toDateString();
      const filterDate = new Date(feedbackDateFilter).toDateString();
      return collectionDate === filterDate;
    });

    return (
      <div className="space-y-6">
        {/* Collector Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">{collector.name}</h3>
                <p className="text-sm text-blue-700">
                  ID: {collector.uid} | Phone: {collector.phone}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-900">
                    {filteredCollections.length}
                  </div>
                  <div className="text-xs text-blue-700">Collections</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-900">
                    {filteredFeedbacks.length > 0 
                      ? (filteredFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / filteredFeedbacks.length).toFixed(1)
                      : "0.0"}
                  </div>
                  <div className="text-xs text-blue-700">Avg Rating</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-900">
                    {filteredFeedbacks.length}
                  </div>
                  <div className="text-xs text-blue-700">Feedbacks</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Filter for Feedbacks */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Feedbacks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <Label htmlFor="feedback-date">Filter by Date</Label>
                <Input
                  id="feedback-date"
                  type="date"
                  value={feedbackDateFilter}
                  onChange={(e) => setFeedbackDateFilter(e.target.value)}
                  placeholder="Select date to filter feedbacks"
                />
              </div>
              <Button variant="outline" onClick={() => setFeedbackDateFilter("")}>
                Clear Filter
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {feedbackDateFilter 
                ? `Showing feedbacks for ${new Date(feedbackDateFilter).toLocaleDateString()}` 
                : "Showing all feedbacks"}
            </p>
          </CardContent>
        </Card>

        {/* Generator Feedbacks List */}
        <Card>
          <CardHeader>
            <CardTitle>Generator Feedbacks ({filteredFeedbacks.length} feedbacks)</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredFeedbacks.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredFeedbacks
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((feedback) => (
                    <Card key={feedback.id} className="border-l-4 border-l-purple-400">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{feedback.headName}</h4>
                              <p className="text-sm text-muted-foreground">
                                House: {feedback.houseNumber} | UID: {feedback.householdUid}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {new Date(feedback.createdAt).toLocaleDateString()}
                              </Badge>
                              <Badge variant="secondary">
                                Feedback
                              </Badge>
                            </div>
                          </div>

                          {/* Generator's Rating */}
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Generator's Service Rating:</span>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < (feedback.rating || 0) ? "fill-purple-400 text-purple-400" : "text-gray-300"}`}
                                  />
                                ))}
                                <span className="ml-2 text-sm font-bold">
                                  ({feedback.rating || 0}/5)
                                </span>
                              </div>
                            </div>
                            
                            {feedback.remarks && (
                              <div className="mt-2">
                                <span className="text-sm font-medium block mb-1">Generator's Comments:</span>
                                <p className="text-sm text-gray-700 italic">"{feedback.remarks}"</p>
                              </div>
                            )}
                          </div>

                          {/* Additional Info */}
                          <div className="flex justify-between items-center pt-2 border-t">
                            <div className="text-xs text-muted-foreground">
                              Feedback submitted: {new Date(feedback.createdAt).toLocaleDateString()} at {new Date(feedback.createdAt).toLocaleTimeString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4 text-purple-500" />
                              <span className="text-xs text-purple-600">Generator Feedback</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {feedbackDateFilter ? "No generator feedbacks found for selected date" : "No generator feedbacks received yet"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Generators can provide feedback after waste collection
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
        <div className="bg-white border-b px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold truncate">
                {t("navigation.dashboard")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Village: {user?.villageId} | Manager: {user?.name}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <LanguageSwitcher />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordDialog(true)}
                className="flex-1 sm:flex-none text-xs sm:text-sm"
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Password
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                className="flex-1 sm:flex-none text-xs sm:text-sm"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                {t("auth.logout")}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Mobile Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 md:hidden">
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
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Sidebar Navigation */}
          <div className="hidden md:block w-64 bg-white border-r">
            <div className="p-4">
              <nav className="space-y-2">
                {[
                  { id: "overview", icon: LayoutDashboard, label: "Overview" },
                  { id: "collectors", icon: Users, label: "Collectors" },
                  { id: "households", icon: Home, label: "Households" },
                  { id: "collections", icon: Package, label: "Collections" },
                  { id: "issues", icon: AlertTriangle, label: "Issues" },
                  { id: "reports", icon: BarChart3, label: "Reports" },
                  { id: "announcements", icon: Bell, label: "Announcements" },
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
                  <h2 className="text-2xl font-bold mb-2">Dashboard Overview</h2>
                  <p className="text-muted-foreground">Village statistics and insights</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <StatCard
                    title="Total Households"
                    value={stats?.totalHouseholds || 0}
                    icon={Home}
                    description="Registered households"
                  />
                  <StatCard
                    title="Total Collectors"
                    value={stats?.totalCollectors || 0}
                    icon={Users}
                    description="Active collectors"
                  />
                  <StatCard
                    title="Collections Today"
                    value={stats?.collectionsToday || 0}
                    icon={Package}
                    description="Completed today"
                  />
                  <StatCard
                    title="Open Issues"
                    value={stats?.openIssues || 0}
                    icon={AlertTriangle}
                    description="Pending resolution"
                  />
                </div>

                {/* Recent Announcements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-blue-600" />
                      Recent Announcements
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
                        No announcements yet
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
                    <h2 className="text-2xl font-bold">Collectors Management</h2>
                    <p className="text-muted-foreground">Manage waste collectors</p>
                  </div>
                  <div className="flex gap-2">
                    <CreateCollectorDialog villageId={user?.villageId || ""} />
                    <ComplaintManagementDialog />
                  </div>
                </div>

                {/* Date Filter */}
                <Card>
                  <CardHeader>
                    <CardTitle>Filter Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <Label htmlFor="analytics-date">Filter by Date</Label>
                        <Input
                          id="analytics-date"
                          type="date"
                          value={filters.date}
                          onChange={(e) => updateFilter("date", e.target.value)}
                          placeholder="Select date to filter analytics"
                        />
                      </div>
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filter
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {filters.date ? `Showing analytics for ${new Date(filters.date).toLocaleDateString()}` : "Showing overall analytics"}
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
                    
                    // Filter complaints by date
                    const filteredComplaints = complaints.filter(c => {
                      const complaintMatches = c.collectorId === collector.id;
                      if (!filters.date) return complaintMatches;
                      const complaintDate = new Date(c.createdAt).toDateString();
                      const filterDate = new Date(filters.date).toDateString();
                      return complaintMatches && complaintDate === filterDate;
                    });

                    return (
                      <Dialog key={collector.id}>
                        <DialogTrigger asChild>
                          <Card className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold">{collector.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    ID: {collector.uid} | Phone: {collector.phone}
                                  </p>
                                  <div className="grid grid-cols-3 gap-4 text-center mt-3">
                                    <div>
                                      <div className="text-lg font-bold">
                                        {totalCollections}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Collections</div>
                                    </div>
                                    <div>
                                      <div className="text-lg font-bold">
                                        {averageRating}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Avg Rating</div>
                                    </div>
                                    <div>
                                      <div className="text-lg font-bold">
                                        {filteredComplaints.length}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Complaints</div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className="text-xs">
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
                  <TabsList className="grid w-full grid-cols-4">
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
                              <Button size="sm" variant="outline">
                                <Edit className="h-4 w-4" />
                              </Button>
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

                <Card>
                  <CardHeader>
                    <CardTitle>Search & Filter</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Search by name, UID, or house number..."
                          value={filters.search}
                          onChange={(e) => updateFilter("search", e.target.value)}
                        />
                      </div>
                      <div>
                        <Input
                          type="date"
                          value={filters.date}
                          onChange={(e) => updateFilter("date", e.target.value)}
                        />
                      </div>
                      <Button variant="outline" onClick={clearFilters}>
                        Clear
                      </Button>
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
                    value={allCollections.filter(c => {
                      const collectionDate = new Date(c.collectionDate);
                      const today = new Date();
                      return collectionDate.toDateString() === today.toDateString();
                    }).length}
                    icon={CheckCircle}
                    description="Completed today"
                  />
                  <StatCard
                    title="Total Collections"
                    value={allCollections.length}
                    icon={Package}
                    description="All time"
                  />
                  <StatCard
                    title="Avg Segregation"
                    value={allCollections.length > 0 
                      ? (allCollections.reduce((sum, c) => sum + (c.segregationRating || 0), 0) / allCollections.length).toFixed(1)
                      : "0.0"}
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
                          const todayCollection = householdCollections.find(c => {
                            const collectionDate = new Date(c.collectionDate);
                            const today = new Date();
                            return collectionDate.toDateString() === today.toDateString();
                          });
                          const latestCollection = householdCollections.length > 0 
                            ? householdCollections.sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime())[0]
                            : null;

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
                                      </div>
                                      <Badge
                                        variant={
                                          todayCollection ? "default" : 
                                          latestCollection ? "secondary" : "destructive"
                                        }
                                        className="text-xs whitespace-nowrap"
                                      >
                                        {todayCollection ? "✅ Today" : 
                                         latestCollection ? "📅 Done" : "❌ Never"}
                                      </Badge>
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

                                                  <div className="flex gap-2 pt-2 border-t">
                                                    {collection.photo && (
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => window.open(collection.photo, "_blank")}
                                                      >
                                                        <Camera className="h-4 w-4 mr-1" />
                                                        View Photo
                                                      </Button>
                                                    )}
                                                    {collection.voiceUrl && (
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => window.open(collection.voiceUrl, "_blank")}
                                                      >
                                                        <Mic className="h-4 w-4 mr-1" />
                                                        Play Voice
                                                      </Button>
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
                                </div>
                              </DialogContent>
                            </Dialog>
                          );
                        })}
                    </div>
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
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold">{issue.title}</h4>
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
                                  <p className="text-sm text-muted-foreground mb-2">
                                    Reported by: {issue.reportedBy} on {new Date(issue.createdAt).toLocaleDateString()}
                                  </p>
                                  <p className="text-sm">{issue.description}</p>
                                  {issue.managerReply && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                      <p className="text-sm">
                                        <strong>Manager Reply:</strong> {issue.managerReply}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {issue.photoUrl && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(issue.photoUrl, "_blank")}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
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
                  <p className="text-muted-foreground">Performance insights</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-blue-800">Collection Efficiency</CardTitle>
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-900">
                        {stats && stats.totalHouseholds > 0
                          ? Math.round((stats.collectionsToday / stats.totalHouseholds) * 100)
                          : 0}%
                      </div>
                      <p className="text-xs text-blue-700">
                        {stats?.collectionsToday || 0} of {stats?.totalHouseholds || 0} households
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-green-800">Segregation Quality</CardTitle>
                      <Award className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-900">
                        {allCollections.length > 0
                          ? Math.round((allCollections.filter(c => c.wasteSegregated).length / allCollections.length) * 100)
                          : 0}%
                      </div>
                      <p className="text-xs text-green-700">
                        {allCollections.filter(c => c.wasteSegregated).length} properly segregated
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-yellow-800">Average Rating</CardTitle>
                      <Star className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-900">
                        {allCollections.length > 0
                          ? (allCollections.reduce((sum, c) => sum + (c.segregationRating || 0), 0) / allCollections.length).toFixed(1)
                          : "0.0"}
                      </div>
                      <p className="text-xs text-yellow-700">Out of 5.0 stars</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-red-800">Open Issues</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-900">
                        {allIssues.filter(i => i.status === "open").length}
                      </div>
                      <p className="text-xs text-red-700">
                        {allIssues.length} total issues
                      </p>
                    </CardContent>
                  </Card>
                </div>
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
            <DialogTitle>Change Password</DialogTitle>
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
                toast({ title: "Passwords don't match", variant: "destructive" });
                return;
              }
              changePasswordMutation.mutate({ currentPassword, newPassword });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" name="currentPassword" type="password" required />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" name="newPassword" type="password" required />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required />
            </div>
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
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
                updateIssueMutation.mutate({
                  issueId: selectedIssue.id,
                  status: formData.get("status") as string,
                  managerReply: formData.get("managerReply") as string,
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