import { useState, useCallback, useMemo } from "react";
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
  ClipboardList,
  QrCode,
  Download,
  Eye,
  AlertCircle,
  MessageSquare,
  TrendingUp,
  Award,
  Package,
  AlertTriangle,
  Camera,
  Mic,
  CheckCircle,
  Filter,
  Search,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Interfaces
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
  attendanceRate: number;
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
  plasticRating?: number;
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

// Simplified Dialog Components
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Collector</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter collector name"
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Household</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="headName">Head of Household *</Label>
            <Input
              id="headName"
              value={formData.headName}
              onChange={(e) => setFormData(prev => ({ ...prev, headName: e.target.value }))}
              placeholder="Enter head of household name"
              required
            />
          </div>
          <div>
            <Label htmlFor="houseNumber">House Number *</Label>
            <Input
              id="houseNumber"
              value={formData.houseNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, houseNumber: e.target.value }))}
              placeholder="Enter house number"
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
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
  const [filters, setFilters] = useState({
    search: "",
    dateFilter: "",
    statusFilter: "all",
    issuesFilter: "all",
  });

  // Dialog states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showIssueDialog, setShowIssueDialog] = useState(false);

  // Announcement state
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState("generators");

  // QR code states
  const [selectedQRHouseholds, setSelectedQRHouseholds] = useState<number[]>([]);
  const [selectedDownloadHouseholds, setSelectedDownloadHouseholds] = useState<number[]>([]);

  // Bulk household state
  const [bulkHouseholds, setBulkHouseholds] = useState([
    { headName: "", houseNumber: "", phone: "", address: "" },
  ]);

  // Data fetching with simplified queries
  const { data: stats } = useQuery<VillageStats>({
    queryKey: ["/api/manager/stats", user?.villageId],
    enabled: !!user?.villageId,
  });

  const { data: collectors = [], isLoading: collectorsLoading } = useQuery<Collector[]>({
    queryKey: ["/api/collectors", user?.villageId],
    enabled: !!user?.villageId,
  });

  const { data: households = [], isLoading: householdsLoading } = useQuery<Household[]>({
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
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      window.location.href = "/login";
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: ({ issueId, status, managerReply }: { issueId: number; status: string; managerReply?: string }) =>
      apiRequest("PUT", `/api/issues/${issueId}`, { status, managerReply }),
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
      apiRequest("POST", "/api/announcements", { ...data, villageId: user?.villageId }),
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
        variant: "destructive",
      });
    },
  });

  // Bulk operations
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

  const generateQRMutation = useMutation({
    mutationFn: (householdIds: number[]) =>
      apiRequest("POST", "/api/qr-codes/generate", { householdIds }),
    onSuccess: () => {
      toast({ title: "Success", description: "QR codes generated successfully!" });
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
      toast({ title: "Success", description: "QR codes PDF downloaded!" });
      setSelectedDownloadHouseholds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download QR codes",
        variant: "destructive",
      });
    },
  });

  // Memoized filter functions
  const filteredCollections = useMemo(() => {
    return allCollections.filter((collection) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          collection.headName?.toLowerCase().includes(searchLower) ||
          collection.householdUid?.toLowerCase().includes(searchLower) ||
          collection.houseNumber?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [allCollections, filters.search]);

  const filteredIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      if (filters.issuesFilter === "all") return true;
      return issue.status === filters.issuesFilter;
    });
  }, [allIssues, filters.issuesFilter]);

  // Helper functions
  const updateFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      dateFilter: "",
      statusFilter: "all",
      issuesFilter: "all",
    });
  }, []);

  // QR management functions
  const toggleQRHousehold = useCallback((id: number) => {
    setSelectedQRHouseholds(prev =>
      prev.includes(id) ? prev.filter(hId => hId !== id) : [...prev, id]
    );
  }, []);

  const selectAllQR = useCallback(() => {
    const householdsWithoutQR = households.filter(h => !h.qrCodeUrl);
    setSelectedQRHouseholds(householdsWithoutQR.map(h => h.id));
  }, [households]);

  const toggleDownloadHousehold = useCallback((id: number) => {
    setSelectedDownloadHouseholds(prev =>
      prev.includes(id) ? prev.filter(hId => hId !== id) : [...prev, id]
    );
  }, []);

  const selectAllDownload = useCallback(() => {
    setSelectedDownloadHouseholds(households.map(h => h.id));
  }, [households]);

  // Simplified components
  const StatCard = ({ title, value, icon: Icon, description }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  const BulkHouseholdCreation = () => (
    <div className="space-y-4">
      {bulkHouseholds.map((household, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">Household {index + 1}</h4>
              {bulkHouseholds.length > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkHouseholds(prev => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Head Name *</Label>
                <Input
                  value={household.headName}
                  onChange={(e) => setBulkHouseholds(prev => {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], headName: e.target.value };
                    return updated;
                  })}
                  placeholder="Enter head name"
                />
              </div>
              <div>
                <Label>House Number *</Label>
                <Input
                  value={household.houseNumber}
                  onChange={(e) => setBulkHouseholds(prev => {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], houseNumber: e.target.value };
                    return updated;
                  })}
                  placeholder="Enter house number"
                />
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input
                  type="tel"
                  value={household.phone}
                  onChange={(e) => setBulkHouseholds(prev => {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], phone: e.target.value };
                    return updated;
                  })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={household.address}
                  onChange={(e) => setBulkHouseholds(prev => {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], address: e.target.value };
                    return updated;
                  })}
                  placeholder="Enter address"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button
          onClick={() => setBulkHouseholds(prev => [...prev, { headName: "", houseNumber: "", phone: "", address: "" }])}
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Household
        </Button>
        <Button
          onClick={() => {
            const validHouseholds = bulkHouseholds.filter(h => h.headName && h.houseNumber && h.phone);
            if (validHouseholds.length === 0) {
              toast({
                title: "Error",
                description: "Please fill required fields for at least one household",
                variant: "destructive",
              });
              return;
            }
            createBulkHouseholdsMutation.mutate(validHouseholds);
          }}
          disabled={createBulkHouseholdsMutation.isPending}
        >
          {createBulkHouseholdsMutation.isPending ? "Creating..." : "Create Households"}
        </Button>
      </div>
    </div>
  );

  const QRCodeGenerationPanel = ({ households }: { households: Household[] }) => {
    const householdsWithoutQR = households.filter(h => !h.qrCodeUrl);

    return (
      <div className="space-y-4">
        {householdsWithoutQR.length === 0 ? (
          <p className="text-center text-muted-foreground">All households already have QR codes!</p>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {householdsWithoutQR.length} households without QR codes
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAllQR}>
                  Select All
                </Button>
                <Button
                  size="sm"
                  onClick={() => generateQRMutation.mutate(selectedQRHouseholds)}
                  disabled={selectedQRHouseholds.length === 0 || generateQRMutation.isPending}
                >
                  {generateQRMutation.isPending ? "Generating..." : `Generate QR (${selectedQRHouseholds.length})`}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {householdsWithoutQR.map(household => (
                <Card
                  key={household.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleQRHousehold(household.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{household.headName}</h4>
                        <p className="text-sm text-muted-foreground">
                          House: {household.houseNumber} | ID: {household.uid}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedQRHouseholds.includes(household.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleQRHousehold(household.id);
                        }}
                        className="h-4 w-4"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const QRCodeDownloadPanel = ({ households }: { households: Household[] }) => (
    <div className="space-y-4">
      {households.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No QR codes available for download. Generate QR codes first!
        </p>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{households.length} households with QR codes</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={selectAllDownload}>
                Select All
              </Button>
              <Button
                size="sm"
                onClick={() => downloadPDFMutation.mutate(selectedDownloadHouseholds)}
                disabled={selectedDownloadHouseholds.length === 0 || downloadPDFMutation.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloadPDFMutation.isPending ? "Downloading..." : `Download PDF (${selectedDownloadHouseholds.length})`}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {households.map(household => (
              <Card
                key={household.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleDownloadHousehold(household.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {household.qrCodeUrl && (
                        <img src={household.qrCodeUrl} alt="QR Code" className="h-12 w-12 rounded border" />
                      )}
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
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleDownloadHousehold(household.id);
                      }}
                      className="h-4 w-4"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // Navigation tabs - simplified to 6 essential tabs
  const navigationTabs = [
    { id: "overview", icon: LayoutDashboard, label: "Overview" },
    { id: "collectors", icon: Users, label: "Collectors" },
    { id: "households", icon: Home, label: "Households" },
    { id: "collections", icon: Package, label: "Collections" },
    { id: "issues", icon: AlertTriangle, label: "Issues" },
    { id: "reports", icon: BarChart3, label: "Reports" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Navbar */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold truncate">{t("navigation.dashboard")}</h1>
            <p className="text-sm text-muted-foreground truncate">
              Village: {user?.villageId} | Manager: {user?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Password
            </Button>
            <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-4 w-4 mr-2" />
              {t("auth.logout")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 md:hidden">
          <div className="flex">
            {navigationTabs.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex-1 flex items-center justify-center py-3 transition-colors",
                  activeTab === id
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
              {navigationTabs.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                    activeTab === id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
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
        <div className="flex-1 p-6 overflow-auto pb-20 md:pb-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">{t("dashboard.overview")}</h2>
                <p className="text-muted-foreground">{t("dashboard.stats")}</p>
              </div>

              {/* Statistics Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  icon={CheckCircle}
                  description="Waste collections completed"
                />
                <StatCard
                  title="Open Issues"
                  value={stats?.openIssues || 0}
                  icon={AlertCircle}
                  description="Pending resolution"
                />
              </div>

              {/* Recent Announcements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                    Recent Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {announcements.length > 0 ? (
                    <div className="space-y-3">
                      {announcements.slice(0, 3).map((announcement: any) => (
                        <div key={announcement.id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <p className="text-sm text-gray-800 font-medium">{announcement.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(announcement.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No announcements</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "collectors" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Collectors Management</h2>
                  <p className="text-muted-foreground">Manage waste collectors with performance tracking</p>
                </div>
                <CreateCollectorDialog villageId={user?.villageId || ""} />
              </div>

              {/* Performance Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {collectorStats.reduce((sum, stats) => sum + stats.totalCollections, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {collectorStats.length > 0
                        ? (collectorStats.reduce((sum, stats) => sum + stats.averageRating, 0) / collectorStats.length).toFixed(1)
                        : "0.0"}
                    </div>
                    <p className="text-xs text-muted-foreground">Out of 5.0</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Complaints</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {complaints.filter(c => c.status === "open").length}
                    </div>
                    <p className="text-xs text-muted-foreground">Require attention</p>
                  </CardContent>
                </Card>
              </div>

              {collectorsLoading ? (
                <p>Loading collectors...</p>
              ) : (
                <div className="space-y-4">
                  {collectors.map(collector => {
                    const stats = collectorStats.find(s => s.id === collector.id);
                    return (
                      <Card key={collector.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4">
                                <div>
                                  <h3 className="font-semibold">{collector.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    ID: {collector.uid} | Phone: {collector.phone}
                                  </p>
                                </div>
                                <div className="grid grid-cols-4 gap-4 text-center">
                                  <div>
                                    <div className="text-lg font-bold">{stats?.totalCollections || 0}</div>
                                    <div className="text-xs text-muted-foreground">Collections</div>
                                  </div>
                                  <div>
                                    <div className="text-lg font-bold">
                                      {stats?.averageRating?.toFixed(1) || "0.0"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Avg Rating</div>
                                  </div>
                                  <div>
                                    <div className="text-lg font-bold">
                                      {stats?.attendanceRate?.toFixed(0) || 0}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">Attendance</div>
                                  </div>
                                  <div>
                                    <div className="text-lg font-bold">{stats?.complaintsCount || 0}</div>
                                    <div className="text-xs text-muted-foreground">Complaints</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={collector.isActive ? "default" : "secondary"}>
                                {collector.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {collectors.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">No collectors found. Add your first collector!</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "households" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Households Management</h2>
                  <p className="text-muted-foreground">Manage households and QR codes</p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <Tabs value={householdSubTab} onValueChange={setHouseholdSubTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="list">View Households</TabsTrigger>
                  <TabsTrigger value="add">Add Households</TabsTrigger>
                  <TabsTrigger value="qr-create">Create QR</TabsTrigger>
                  <TabsTrigger value="qr-download">Download QR</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4">
                  {householdsLoading ? (
                    <p>Loading households...</p>
                  ) : (
                    <div className="space-y-4">
                      {households.map(household => (
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
                      {households.length === 0 && (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <p className="text-muted-foreground">No households found. Add your first household!</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="add" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">Add New Household</h3>
                      <p className="text-muted-foreground">Create individual or bulk households</p>
                    </div>
                    <CreateHouseholdDialog villageId={user?.villageId || ""} />
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Bulk Household Creation</CardTitle>
                      <CardDescription>Create multiple households with QR code generation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BulkHouseholdCreation />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="qr-create">
                  <Card>
                    <CardHeader>
                      <CardTitle>Generate QR Codes</CardTitle>
                      <CardDescription>Create QR codes for existing households</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <QRCodeGenerationPanel households={households} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="qr-download">
                  <Card>
                    <CardHeader>
                      <CardTitle>Download QR Codes</CardTitle>
                      <CardDescription>Download QR codes as PDF for printing</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <QRCodeDownloadPanel households={households.filter(h => h.qrCodeUrl)} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeTab === "collections" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Collections Management</h2>
                  <p className="text-muted-foreground">View all household collection status and details</p>
                </div>
              </div>

              {/* Search & Filter Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Search & Filter</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label>Search Household</Label>
                      <Input
                        placeholder="Search by name, UID, or house number..."
                        value={filters.search}
                        onChange={(e) => updateFilter("search", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Date Filter</Label>
                      <Input
                        type="date"
                        value={filters.dateFilter}
                        onChange={(e) => updateFilter("dateFilter", e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" onClick={clearFilters}>
                        Clear
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Collections Overview Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Households"
                  value={households?.length || 0}
                  icon={Home}
                  description="Registered households"
                />
                <StatCard
                  title="Collections Today"
                  value={
                    filteredCollections.filter(c => {
                      const collectionDate = new Date(c.collectionDate);
                      const today = new Date();
                      return collectionDate.toDateString() === today.toDateString();
                    }).length
                  }
                  icon={CheckCircle}
                  description="Completed today"
                />
                <StatCard
                  title="Total Collections"
                  value={filteredCollections.length}
                  icon={Package}
                  description="All time"
                />
                <StatCard
                  title="Avg Segregation Rating"
                  value={
                    filteredCollections.length > 0
                      ? (filteredCollections.reduce((sum, c) => sum + (c.segregationRating || 0), 0) / filteredCollections.length).toFixed(1)
                      : "0.0"
                  }
                  icon={Star}
                  description="Segregation Quality"
                />
              </div>

              {/* Household Collection Status List */}
              <Card>
                <CardHeader>
                  <CardTitle>Household Collection Status</CardTitle>
                  <CardDescription>Click on any household to view detailed collection history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {households.length > 0 ? (
                      households
                        .filter(household => {
                          if (!filters.search) return true;
                          const searchLower = filters.search.toLowerCase();
                          return (
                            household.headName?.toLowerCase().includes(searchLower) ||
                            household.uid?.toLowerCase().includes(searchLower) ||
                            household.houseNumber?.toLowerCase().includes(searchLower)
                          );
                        })
                        .map(household => {
                          const householdCollections = filteredCollections.filter(c => c.householdId === household.id);
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
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold truncate">{household.headName}</h3>
                                        <p className="text-sm text-muted-foreground truncate">
                                          {household.uid} • House: {household.houseNumber}
                                        </p>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <Badge
                                          variant={
                                            todayCollection ? "default" : latestCollection ? "secondary" : "destructive"
                                          }
                                        >
                                          {todayCollection ? "✅ Today" : latestCollection ? "📅 Done" : "❌ Never"}
                                        </Badge>
                                        <div className="text-xs text-muted-foreground">
                                          {householdCollections.length} collections
                                        </div>
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
                                                    <h4 className="font-medium">Collection #{householdCollections.length - index}</h4>
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
                                                    <h5 className="font-medium text-sm mb-2">Collection Form Data:</h5>
                                                    <div className="space-y-2">
                                                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                        <span className="text-sm font-medium">Segregation Rating:</span>
                                                        <div className="flex items-center gap-1">
                                                          {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star
                                                              key={i}
                                                              className={`h-4 w-4 ${
                                                                i < (collection.segregationRating || 0)
                                                                  ? "fill-yellow-400 text-yellow-400"
                                                                  : "text-gray-300"
                                                              }`}
                                                            />
                                                          ))}
                                                          <span className="ml-2 text-sm font-bold">
                                                            ({collection.segregationRating || 0}/5)
                                                          </span>
                                                        </div>
                                                      </div>

                                                      {collection.plasticRating && (
                                                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                          <span className="text-sm font-medium">Plastic Handling Rating:</span>
                                                          <div className="flex items-center gap-1">
                                                            {Array.from({ length: 5 }).map((_, i) => (
                                                              <Star
                                                                key={i}
                                                                className={`h-4 w-4 ${
                                                                  i < (collection.plasticRating || 0)
                                                                    ? "fill-blue-400 text-blue-400"
                                                                    : "text-gray-300"
                                                                }`}
                                                            />
                                                          ))}
                                                          <span className="ml-2 text-sm font-bold">
                                                            ({collection.plasticRating}/5)
                                                          </span>
                                                        </div>
                                                      </div>

                                                      {collection.observations && (
                                                        <div className="p-2 bg-blue-50 rounded">
                                                          <span className="text-sm font-medium block mb-1">Collector Observations:</span>
                                                          <p className="text-sm text-gray-700">"{collection.observations}"</p>
                                                        </div>
                                                      )}

                                                      {collection.remarks && (
                                                        <div className="p-2 bg-green-50 rounded">
                                                          <span className="text-sm font-medium block mb-1">Collector Remarks:</span>
                                                          <p className="text-sm text-gray-700">"{collection.remarks}"</p>
                                                        </div>
                                                      )}

                                                      {collection.status === "missed" && collection.missedReason && (
                                                        <div className="p-2 bg-red-50 rounded">
                                                          <span className="text-sm font-medium block mb-1">Missed Reason:</span>
                                                          <p className="text-sm text-red-700">"{collection.missedReason}"</p>
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
                                                    {!collection.photo && !collection.voiceUrl && (
                                                      <p className="text-xs text-muted-foreground self-center">
                                                        No media attachments
                                                      </p>
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
                                        <p className="text-muted-foreground">No collections recorded for this household</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          );
                        })
                    ) : (
                      <div className="text-center py-8">
                        <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-lg font-medium mb-2">No Households Found</p>
                        <p className="text-muted-foreground">No households are registered in your village yet.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "issues" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Issues Management</h2>
                  <p className="text-muted-foreground">Manage and resolve issues reported by villagers</p>
                </div>
                <Select value={filters.issuesFilter} onValueChange={(value) => updateFilter("issuesFilter", value)}>
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

              {/* Issues Overview Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  description="Needs attention"
                />
                <StatCard
                  title="In Progress"
                  value={allIssues.filter(i => i.status === "in_progress").length}
                  icon={ClipboardList}
                  description="Being worked on"
                />
                <StatCard
                  title="Resolved"
                  value={allIssues.filter(i => i.status === "resolved").length}
                  icon={CheckCircle}
                  description="Completed"
                />
              </div>

              {/* Issues List */}
              <Card>
                <CardHeader>
                  <CardTitle>Issue Reports</CardTitle>
                  <CardDescription>View and manage issues reported by village residents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredIssues.length > 0 ? (
                      filteredIssues.map(issue => (
                        <Card key={issue.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold truncate">{issue.title}</h4>
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
                                <p className="text-sm break-words">{issue.description}</p>

                                {issue.managerReply && (
                                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm break-words">
                                      <strong>Manager Reply:</strong> {issue.managerReply}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                {issue.photoUrl && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(issue.photoUrl, "_blank")}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Photo
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedIssue(issue);
                                    setShowIssueDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Manage
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-muted-foreground">No issues reported</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Reports & Analytics</h2>
                  <p className="text-muted-foreground">Real-time data analytics and performance insights</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/waste-collections"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
                    toast({ title: "Data refreshed" });
                  }}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>

              {/* Key Performance Indicators */}
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
                    <p className="text-xs text-red-700">{allIssues.length} total issues</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <h4 className="font-medium text-sm">Issue Details</h4>
                <div>
                  <Label className="text-xs text-gray-600">Title</Label>
                  <p className="text-sm font-medium break-words">{selectedIssue.title}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Description</Label>
                  <p className="text-sm break-words">{selectedIssue.description}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Reported By</Label>
                  <p className="text-sm">{selectedIssue.reportedBy}</p>
                </div>
              </div>

              <div className="space-y-4">
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
                  <Label htmlFor="managerReply">Manager Reply</Label>
                  <Textarea
                    id="managerReply"
                    name="managerReply"
                    defaultValue={selectedIssue.managerReply || ""}
                    placeholder="Add your response to this issue..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowIssueDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateIssueMutation.isPending} className="flex-1">
                  {updateIssueMutation.isPending ? "Updating..." : "Update Issue"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}