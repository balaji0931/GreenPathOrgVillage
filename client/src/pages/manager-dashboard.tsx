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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Plus,
  Users,
  Home,
  UserCheck,
  Star,
  Trash2,
  Edit,
  UserPlus,
  LogOut,
  Settings,
  BarChart3,
  ClipboardList,
  UserCog,
  QrCode,
  Download,
  Clock,
  Eye,
  AlertCircle,
  MessageSquare,
  TrendingUp,
  Award,
  FileText,
  Package,
  AlertTriangle,
  Camera,
  Mic,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import { format } from "date-fns";
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

interface CollectorAssignment {
  id: number;
  collectorId: number;
  householdId: number;
  isActive: boolean;
  householdUid: string;
  headName: string;
  houseNumber: string;
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

// Isolated dialog components to prevent state reset issues
const CreateCollectorDialog = React.memo(({ villageId }: { villageId: string }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const collectorMutation = useMutation({
    mutationFn: (data: { name: string; phone: string }) =>
      apiRequest("POST", "/api/collectors", {
        ...data,
        villageId,
      }),
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

    const name = formData.name.trim();
    const phone = formData.phone.trim();

    if (!name || !phone) {
      toast({
        title: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    collectorMutation.mutate({ name, phone });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setFormData({ name: "", phone: "" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter collector name"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="collector-phone">Phone *</Label>
            <Input
              id="collector-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="Enter phone number"
              required
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={collectorMutation.isPending}
              className="flex-1"
            >
              {collectorMutation.isPending ? "Adding..." : "Add Collector"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

const CreateHouseholdDialog = React.memo(({ villageId }: { villageId: string }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    headName: "",
    houseNumber: "",
    phone: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const householdMutation = useMutation({
    mutationFn: (data: {
      headName: string;
      houseNumber: string;
      phone: string;
    }) =>
      apiRequest("POST", "/api/households", {
        ...data,
        villageId,
      }),
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

    const headName = formData.headName.trim();
    const houseNumber = formData.houseNumber.trim();
    const phone = formData.phone.trim();

    if (!headName || !houseNumber || !phone) {
      toast({
        title: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    householdMutation.mutate({ headName, houseNumber, phone });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setFormData({ headName: "", houseNumber: "", phone: "" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, headName: e.target.value }))
              }
              placeholder="Enter head of household name"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="household-houseNumber">House Number *</Label>
            <Input
              id="household-houseNumber"
              value={formData.houseNumber}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  houseNumber: e.target.value,
                }))
              }
              placeholder="Enter house number"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="household-phone">Phone *</Label>
            <Input
              id="household-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="Enter phone number"
              required
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={householdMutation.isPending}
              className="flex-1"
            >
              {householdMutation.isPending ? "Adding..." : "Add Household"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("overview");
  const [householdSubTab, setHouseholdSubTab] = useState("list");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showComplaintDialog, setShowComplaintDialog] = useState(false);

  // Collections filters
  const [collectionsFilter, setCollectionsFilter] = useState("all");
  const [collectionsDateFilter, setCollectionsDateFilter] = useState("");
  const [collectionsSearch, setCollectionsSearch] = useState("");
  const [segregationFilter, setSegregationFilter] = useState("");
  const [plasticFilter, setPlasticFilter] = useState("");

  // Feedback filters
  const [feedbackDate, setFeedbackDate] = useState("");
  const [feedbackSearch, setFeedbackSearch] = useState("");

  // Issues filters
  const [issuesFilter, setIssuesFilter] = useState("all");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showIssueDialog, setShowIssueDialog] = useState(false);

  // Reports filters
  const [reportsFilter, setReportsFilter] = useState("today");

  // Announcements state
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState("generators");

  // Initialize filters with proper default values
  const [selectedHouseholdFilter, setSelectedHouseholdFilter] =
    useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch announcements
  const { data: announcements = [], isLoading: announcementsLoading } =
    useQuery<any[]>({
      queryKey: ["/api/announcements", user?.villageId],
      enabled: !!user?.villageId,
    });
  // Auto-rotate announcements
  React.useEffect(() => {
    if (announcements && announcements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAnnouncementIndex(
          (prev) => (prev + 1) % Math.min(announcements.length, 3),
        );
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [announcements]);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      window.location.href = "/login";
    },
  });

  // Fetch village stats
  const { data: stats } = useQuery<VillageStats>({
    queryKey: ["/api/manager/stats", user?.villageId],
    enabled: !!user?.villageId,
  });

  // Fetch collectors
  const { data: collectors = [], isLoading: collectorsLoading } = useQuery<
    Collector[]
  >({
    queryKey: ["/api/collectors", user?.villageId],
    enabled: !!user?.villageId,
  });

  // Fetch households
  const { data: households = [], isLoading: householdsLoading } = useQuery<
    Household[]
  >({
    queryKey: ["/api/households", user?.villageId],
    enabled: !!user?.villageId,
  });

  // Fetch collector stats
  const { data: collectorStats = [] } = useQuery<CollectorStats[]>({
    queryKey: ["/api/collectors/stats", user?.villageId],
    enabled: !!user?.villageId,
  });

  // Fetch complaints
  const { data: complaints = [] } = useQuery<Complaint[]>({
    queryKey: ["/api/complaints", user?.villageId],
    enabled: !!user?.villageId,
  });

  // Fetch collections for the collections tab
  const { data: allCollections = [] } = useQuery<WasteCollection[]>({
    queryKey: ["/api/waste-collections/village", user?.villageId],
    enabled: !!user?.villageId,
  });

  // Fetch issues
  const { data: allIssues = [] } = useQuery<Issue[]>({
    queryKey: ["/api/issues", user?.villageId],
    enabled: !!user?.villageId,
  });

  // Fetch village feedback data
  const { data: feedbacks = [] } = useQuery<any[]>({
    queryKey: ["/api/feedback/village", user?.villageId],
    enabled: !!user?.villageId,
  });

  // Fetch collections with filters
  const [collectionsDate, setCollectionsDate] = useState<string>("");
  const { data: villageCollections = [] } = useQuery({
    queryKey: [
      "/api/waste-collections/village",
      user?.villageId,
      collectionsDate,
      selectedHouseholdFilter,
    ],
    enabled: !!user?.villageId,
  });

  // Update issue mutation
  const updateIssueMutation = useMutation({
    mutationFn: ({
      issueId,
      status,
      managerReply,
    }: {
      issueId: number;
      status: string;
      managerReply?: string;
    }) => apiRequest("PUT", `/api/issues/${issueId}`, { status, managerReply }),
    onSuccess: () => {
      toast({ title: "Issue updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
    },
    onError: () => {
      toast({ title: "Failed to update issue", variant: "destructive" });
    },
  });

  // Create collector mutation
  const createCollectorMutation = useMutation({
    mutationFn: (data: { name: string; phone: string }) =>
      apiRequest("POST", "/api/collectors", {
        ...data,
        villageId: user?.villageId,
      }),
    onError: (error) => {
      console.error("Failed to create collector:", error);
    },
  });

  // Create household mutation
  const createHouseholdMutation = useMutation({
    mutationFn: (data: {
      headName: string;
      houseNumber: string;
      phone: string;
    }) =>
      apiRequest("POST", "/api/households", {
        ...data,
        villageId: user?.villageId,
      }),
    onError: (error) => {
      console.error("Failed to create household:", error);
    },
  });

  // Resolve complaint mutation
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

  // Send announcement mutation
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

  

  const CollectorDetailsDialog = ({ collector }: { collector: Collector }) => {
    const [open, setOpen] = useState(false);
    const stats = collectorStats.find((s) => s.id === collector.id);

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Collector Details - {collector.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">
                    {stats?.totalCollections || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Collections
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">
                    {stats?.averageRating?.toFixed(1) || "0.0"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Avg Rating
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">
                    {stats?.complaintsCount || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Complaints
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const ComplaintManagementDialog = () => {
    const [open, setOpen] = useState(false);
    const [selectedComplaint, setSelectedComplaint] =
      useState<Complaint | null>(null);
    const [managerResponse, setManagerResponse] = useState("");

    const handleResolve = (complaint: Complaint) => {
      setSelectedComplaint(complaint);
      setShowComplaintDialog(true);
    };

    const submitResolution = () => {
      if (selectedComplaint && managerResponse) {
        resolveComplaintMutation.mutate({
          complaintId: selectedComplaint.id,
          managerResponse,
        });
        setShowComplaintDialog(false);
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
          </DialogContent>
        </Dialog>

        <Dialog
          open={showComplaintDialog}
          onOpenChange={setShowComplaintDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Complaint</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Complaint</Label>
                <p className="text-sm p-2 bg-muted rounded">
                  {selectedComplaint?.complaint}
                </p>
              </div>
              <div>
                <Label>Manager Response</Label>
                <Textarea
                  value={managerResponse}
                  onChange={(e) => setManagerResponse(e.target.value)}
                  placeholder="Enter your response to resolve this complaint..."
                  rows={4}
                />
              </div>
              <Button
                onClick={submitResolution}
                disabled={!managerResponse}
                className="w-full"
              >
                Resolve Complaint
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  const PasswordChangeDialog = () => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const changePasswordMutation = useMutation({
      mutationFn: (data: { currentPassword: string; newPassword: string }) =>
        apiRequest("PUT", "/api/profile", data),
      onSuccess: () => {
        toast({ title: "Password changed successfully" });
        setShowPasswordDialog(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      },
      onError: (error: any) => {
        toast({
          title: "Failed to change password",
          description: error.message,
        });
      },
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
        toast({ title: "Passwords don't match" });
        return;
      }
      changePasswordMutation.mutate({ currentPassword, newPassword });
    };

    return (
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending
                ? "Changing..."
                : "Change Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  // Bulk household creation component
  const BulkHouseholdCreation = React.memo(() => {
    const [households, setHouseholds] = useState([
      { headName: "", houseNumber: "", phone: "", address: "" },
    ]);

    const createHouseholdsMutation = useMutation({
      mutationFn: (householdsData: any[]) =>
        apiRequest("POST", "/api/households/bulk", {
          households: householdsData,
        }),
      onSuccess: (response: any) => {
        const successCount = Array.isArray(response) ? response.length : 0;
        toast({
          title: "Success",
          description: `${successCount} households created successfully with QR codes!`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/households"] });
        queryClient.invalidateQueries({ queryKey: ["/api/manager/stats"] });
        setHouseholds([
          { headName: "", houseNumber: "", phone: "", address: "" },
        ]);
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to create households",
          variant: "destructive",
        });
      },
    });

    const addHousehold = () => {
      setHouseholds([
        ...households,
        { headName: "", houseNumber: "", phone: "", address: "" },
      ]);
    };

    const removeHousehold = (index: number) => {
      if (households.length > 1) {
        setHouseholds(households.filter((_, i) => i !== index));
      }
    };

    const updateHousehold = (index: number, field: string, value: string) => {
      const updated = [...households];
      updated[index] = { ...updated[index], [field]: value };
      setHouseholds(updated);
    };

    const handleSubmit = () => {
      const validHouseholds = households.filter(
        (h) => h.headName && h.houseNumber && h.phone,
      );
      if (validHouseholds.length === 0) {
        toast({
          title: "Error",
          description: "Please fill required fields for at least one household",
          variant: "destructive",
        });
        return;
      }
      createHouseholdsMutation.mutate(validHouseholds);
    };

    return (
      <div className="space-y-4">
        {households.map((household, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">Household {index + 1}</h4>
                {households.length > 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeHousehold(index)}
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
                    onChange={(e) =>
                      updateHousehold(index, "headName", e.target.value)
                    }
                    placeholder="Enter head name"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label>House Number *</Label>
                  <Input
                    value={household.houseNumber}
                    onChange={(e) =>
                      updateHousehold(index, "houseNumber", e.target.value)
                    }
                    placeholder="Enter house number"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label>Phone Number *</Label>
                  <Input
                    value={household.phone}
                    onChange={(e) =>
                      updateHousehold(index, "phone", e.target.value)
                    }
                    placeholder="Enter phone number"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={household.address}
                    onChange={(e) =>
                      updateHousehold(index, "address", e.target.value)
                    }
                    placeholder="Enter address"
                    autoComplete="off"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-2">
          <Button onClick={addHousehold} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Household
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createHouseholdsMutation.isPending}
          >
            {createHouseholdsMutation.isPending
              ? "Creating..."
              : "Create Households with QR Codes"}
          </Button>
        </div>
      </div>
    );
  });

  // QR Code generation panel
  function QRCodeGenerationPanel({ households }: { households: Household[] }) {
    const [selectedHouseholds, setSelectedHouseholds] = useState<number[]>([]);

    const generateQRMutation = useMutation({
      mutationFn: (householdIds: number[]) =>
        apiRequest("POST", "/api/qr-codes/generate", { householdIds }),
      onSuccess: () => {
        toast({
          title: "Success",
          description: "QR codes generated successfully!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/households"] });
        setSelectedHouseholds([]);
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to generate QR codes",
          variant: "destructive",
        });
      },
    });

    const toggleHousehold = (id: number) => {
      setSelectedHouseholds((prev) =>
        prev.includes(id) ? prev.filter((hId) => hId !== id) : [...prev, id],
      );
    };

    const selectAll = () => {
      const householdsWithoutQR = households.filter((h) => !h.qrCodeUrl);
      setSelectedHouseholds(householdsWithoutQR.map((h) => h.id));
    };

    const householdsWithoutQR = households.filter((h) => !h.qrCodeUrl);

    return (
      <div className="space-y-4">
        {householdsWithoutQR.length === 0 ? (
          <p className="text-center text-muted-foreground">
            All households already have QR codes!
          </p>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {householdsWithoutQR.length} households without QR codes
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>
                  Select All
                </Button>
                <Button
                  size="sm"
                  onClick={() => generateQRMutation.mutate(selectedHouseholds)}
                  disabled={
                    selectedHouseholds.length === 0 ||
                    generateQRMutation.isPending
                  }
                >
                  {generateQRMutation.isPending
                    ? "Generating..."
                    : `Generate QR (${selectedHouseholds.length})`}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {householdsWithoutQR.map((household) => (
                <Card
                  key={household.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleHousehold(household.id)}
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
                        checked={selectedHouseholds.includes(household.id)}
                        onChange={() => toggleHousehold(household.id)}
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
  }

  // QR Code download panel
  function QRCodeDownloadPanel({ households }: { households: Household[] }) {
    const [selectedHouseholds, setSelectedHouseholds] = useState<number[]>([]);

    const downloadPDFMutation = useMutation({
      mutationFn: async (householdIds: number[]) => {
        const response = await fetch("/api/qr-codes/download-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ householdIds }),
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to download PDF");
        }

        return response.blob();
      },
      onSuccess: (blob: Blob) => {
        // Create blob URL and download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `household-qr-codes-${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast({ title: "Success", description: "QR codes PDF downloaded!" });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to download QR codes",
          variant: "destructive",
        });
      },
    });

    const toggleHousehold = (id: number) => {
      setSelectedHouseholds((prev) =>
        prev.includes(id) ? prev.filter((hId) => hId !== id) : [...prev, id],
      );
    };

    const selectAll = () => {
      setSelectedHouseholds(households.map((h) => h.id));
    };

    return (
      <div className="space-y-4">
        {households.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No QR codes available for download. Generate QR codes first!
          </p>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {households.length} households with QR codes
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>
                  Select All
                </Button>
                <Button
                  size="sm"
                  onClick={() => downloadPDFMutation.mutate(selectedHouseholds)}
                  disabled={
                    selectedHouseholds.length === 0 ||
                    downloadPDFMutation.isPending
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadPDFMutation.isPending
                    ? "Downloading..."
                    : `Download PDF (${selectedHouseholds.length})`}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {households.map((household) => (
                <Card
                  key={household.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleHousehold(household.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {household.qrCodeUrl && (
                          <img
                            src={household.qrCodeUrl}
                            alt="QR Code"
                            className="h-12 w-12 rounded border"
                          />
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
                        checked={selectedHouseholds.includes(household.id)}
                        onChange={() => toggleHousehold(household.id)}
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
  }

  return (
    <>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Top Navbar -Mobile Responsive */}
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
                <span className="hidden xs:inline">Change Password</span>
                <span className="xs:hidden">Password</span>
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
          {/* Mobile Bottom Navigation (Hidden on desktop) */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 md:hidden">
            <div className="flex">
              {[
                { id: "overview", icon: LayoutDashboard },
                { id: "collectors", icon: Users },
                { id: "households", icon: Home },
                { id: "collections", icon: Package },
                { id: "issues", icon: AlertTriangle },
                { id: "reports", icon: BarChart3 },
                { id: "feedback", icon: MessageSquare },
                { id: "announcements", icon: Bell },
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
                  <Icon className="h-6 w-6 font-bold" strokeWidth={2.5} />
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Sidebar Navigation (Hidden on mobile) */}
          <div className="hidden md:block w-64 bg-white border-r">
            <div className="p-4">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                    activeTab === "overview"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  {t("dashboard.overview")}
                </button>
                <button
                  onClick={() => setActiveTab("collectors")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                    activeTab === "collectors"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <Users className="h-5 w-5" />
                  {t("navigation.collectors")}
                </button>
                <button
                  onClick={() => setActiveTab("households")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                    activeTab === "households"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <Home className="h-5 w-5" />
                  {t("navigation.households")}
                </button>
                <button
                  onClick={() => setActiveTab("collections")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                    activeTab === "collections"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <Package className="h-5 w-5" />
                  {t("navigation.collections")}
                </button>
                <button
                  onClick={() => setActiveTab("issues")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                    activeTab === "issues"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <AlertTriangle className="h-5 w-5" />
                  {t("navigation.issues")}
                </button>
                <button
                  onClick={() => setActiveTab("reports")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                    activeTab === "reports"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <BarChart3 className="h-5 w-5" />
                  {t("navigation.reports")}
                </button>
                <button
                  onClick={() => setActiveTab("feedback")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                    activeTab === "feedback"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <MessageSquare className="h-5 w-5" />
                  {t("navigation.feedback")}
                </button>
                <button
                  onClick={() => setActiveTab("announcements")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                    activeTab === "announcements"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <Bell className="h-5 w-5" />
                  {t("navigation.announcements")}
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content Area - Mobile Responsive */}
          <div className="flex-1 p-3 sm:p-6 overflow-auto pb-20 md:pb-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    {t("dashboard.overview")}
                  </h2>
                  <p className="text-muted-foreground">
                    {t("dashboard.stats")}
                  </p>
                </div>

                {/* Statistics Overview - Mobile Responsive */}
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
                    icon={UserCheck}
                    description="Waste collections completed"
                  />
                  <StatCard
                    title="Open Issues"
                    value={stats?.openIssues || 0}
                    icon={Star}
                    description="Pending resolution"
                  />
                </div>

                {/* Sliding Announcements */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center">
                        <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                        Latest Announcements
                      </div>
                      {announcements && announcements.length > 3 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveTab("announcements")}
                          className="text-xs"
                        >
                          View All
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {announcementsLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                      </div>
                    ) : announcements && announcements.length > 0 ? (
                      <div className="relative overflow-hidden">
                        <div
                          className="flex transition-transform duration-500 ease-in-out"
                          style={{
                            transform: `translateX(-${(currentAnnouncementIndex % Math.min(announcements.length, 3)) * 100}%)`,
                            width: `${Math.min(announcements.length, 3) * 100}%`,
                          }}
                        >
                          {announcements
                            .slice(0, 3)
                            .map((announcement: any, index: number) => (
                              <div
                                key={announcement.id}
                                className="w-full flex-shrink-0 px-1"
                              >
                                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                  <p className="text-sm text-gray-800 font-medium line-clamp-2">
                                    {announcement.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(
                                      announcement.createdAt,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                        {announcements.length > 1 && (
                          <div className="flex justify-center mt-3 space-x-1">
                            {announcements.slice(0, 3).map((_, index) => (
                              <button
                                key={index}
                                onClick={() =>
                                  setCurrentAnnouncementIndex(index)
                                }
                                className={`w-2 h-2 rounded-full transition-colors ${
                                  index ===
                                  currentAnnouncementIndex %
                                    Math.min(announcements.length, 3)
                                    ? "bg-blue-600"
                                    : "bg-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">
                          No announcements
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">
                      Quick Actions
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Common management tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="flex flex-col sm:flex-row gap-3"></div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "collectors" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">
                      Collectors Management
                    </h2>
                    <p className="text-muted-foreground">
                      Manage waste collectors with performance tracking
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <CreateCollectorDialog villageId={user?.villageId || ""} />
                    <ComplaintManagementDialog />
                  </div>
                </div>

                {/* Performance Overview Cards - Mobile Responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Collections
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {collectorStats.reduce(
                          (sum, stats) => sum + stats.totalCollections,
                          0,
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This month
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Average Rating
                      </CardTitle>
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {collectorStats.length > 0
                          ? (
                              collectorStats.reduce(
                                (sum, stats) => sum + stats.averageRating,
                                0,
                              ) / collectorStats.length
                            ).toFixed(1)
                          : "0.0"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Out of 5.0
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Open Complaints
                      </CardTitle>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {complaints.filter((c) => c.status === "open").length}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Require attention
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {collectorsLoading ? (
                  <p>Loading collectors...</p>
                ) : (
                  <div className="space-y-4">
                    {collectors.map((collector) => {
                      const stats = collectorStats.find(
                        (s) => s.id === collector.id,
                      );

                      return (
                        <Card key={collector.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 ">
                                  <div className="sm:flex sm:justify-between">
                                    <h3 className="font-semibold">
                                      {collector.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      ID: {collector.uid} | Phone:{" "}
                                      {collector.phone}
                                    </p>
                                  </div>

                                  {/* Performance Stats */}
                                  <div className="grid grid-cols-4 gap-4 text-center">
                                    <div>
                                      <div className="text-lg font-bold">
                                        {stats?.totalCollections || 0}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Collections
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-lg font-bold">
                                        {stats?.averageRating?.toFixed(1) ||
                                          "0.0"}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Avg Rating
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-lg font-bold">
                                        {stats?.attendanceRate?.toFixed(0) || 0}
                                        %
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Attendance
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-lg font-bold">
                                        {stats?.complaintsCount || 0}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Complaints
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    collector.isActive ? "default" : "secondary"
                                  }
                                >
                                  {collector.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <CollectorDetailsDialog collector={collector} />
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
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
                          <p className="text-muted-foreground">
                            No collectors found. Add your first collector!
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "collections" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">
                      Collections Management
                    </h2>
                    <p className="text-muted-foreground">
                      View all household collection status and details
                    </p>
                  </div>
                </div>

                {/* Search & Filter Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Search & Filter</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label>Search Household</Label>
                        <Input
                          placeholder="Search by name, UID, or house number..."
                          value={collectionsSearch}
                          onChange={(e) => setCollectionsSearch(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Date Filter</Label>
                        <Input
                          type="date"
                          value={collectionsDateFilter}
                          onChange={(e) =>
                            setCollectionsDateFilter(e.target.value)
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setCollectionsSearch("");
                            setCollectionsDateFilter("");
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Collections Overview Stats - Mobile Responsive */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Households
                      </CardTitle>
                      <Home className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {households?.length || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Registered households
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Collections Today
                      </CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Array.isArray(allCollections)
                          ? allCollections.filter((c) => {
                              const collectionDate = new Date(c.collectionDate);
                              const today = new Date();
                              return (
                                collectionDate.toDateString() ===
                                today.toDateString()
                              );
                            }).length
                          : 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Completed today
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Collections
                      </CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Array.isArray(allCollections)
                          ? allCollections.length
                          : 0}
                      </div>
                      <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Avg Segregation Rating
                      </CardTitle>
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Array.isArray(allCollections) &&
                        allCollections.length > 0
                          ? (
                              allCollections.reduce(
                                (sum, c) => sum + (c.segregationRating || 0),
                                0,
                              ) / allCollections.length
                            ).toFixed(1)
                          : "0.0"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Segregation Quality
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Household Collection Status List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Household Collection Status</CardTitle>
                    <CardDescription>
                      Click on any household to view detailed collection history
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Array.isArray(households) && households.length > 0 ? (
                        households
                          .filter((household) => {
                            if (!collectionsSearch) return true;
                            const searchLower = collectionsSearch.toLowerCase();
                            return (
                              household.headName
                                ?.toLowerCase()
                                .includes(searchLower) ||
                              household.uid
                                ?.toLowerCase()
                                .includes(searchLower) ||
                              household.houseNumber
                                ?.toLowerCase()
                                .includes(searchLower)
                            );
                          })
                          .map((household) => {
                            // Find collections for this household
                            const householdCollections = Array.isArray(
                              allCollections,
                            )
                              ? allCollections.filter(
                                  (c) => c.householdId === household.id,
                                )
                              : [];

                            // Filter by date if date filter is applied
                            const filteredCollections = collectionsDateFilter
                              ? householdCollections.filter((c) => {
                                  const collectionDate = new Date(
                                    c.collectionDate,
                                  );
                                  const filterDate = new Date(
                                    collectionsDateFilter,
                                  );
                                  return (
                                    collectionDate.toDateString() ===
                                    filterDate.toDateString()
                                  );
                                })
                              : householdCollections;

                            // Check if collected today
                            const todayCollection = householdCollections.find(
                              (c) => {
                                const collectionDate = new Date(
                                  c.collectionDate,
                                );
                                const today = new Date();
                                return (
                                  collectionDate.toDateString() ===
                                  today.toDateString()
                                );
                              },
                            );

                            // Get latest collection
                            const latestCollection =
                              householdCollections.length > 0
                                ? householdCollections.sort(
                                    (a, b) =>
                                      new Date(b.collectionDate).getTime() -
                                      new Date(a.collectionDate).getTime(),
                                  )[0]
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
                                            {household.uid} • House:{" "}
                                            {household.houseNumber}
                                          </p>
                                          {/* Hide detailed stats on mobile, show only on larger screens */}
                                          <div className="hidden lg:grid lg:grid-cols-3 gap-4 text-center mt-2">
                                            <div>
                                              <div className="text-lg font-bold">
                                                {householdCollections.length}
                                              </div>
                                              <div className="text-xs text-muted-foreground">
                                                Collections
                                              </div>
                                            </div>
                                            <div>
                                              <div className="text-sm font-bold">
                                                {latestCollection
                                                  ? new Date(
                                                      latestCollection.collectionDate,
                                                    ).toLocaleDateString()
                                                  : "Never"}
                                              </div>
                                              <div className="text-xs text-muted-foreground">
                                                Last Collection
                                              </div>
                                            </div>
                                            <div>
                                              <div className="text-sm font-bold">
                                                {householdCollections.length > 0
                                                  ? (
                                                      householdCollections.reduce(
                                                        (sum, c) =>
                                                          sum +
                                                          (c.segregationRating ||
                                                            0),
                                                        0,
                                                      ) /
                                                      householdCollections.length
                                                    ).toFixed(1)
                                                  : "0.0"}
                                              </div>
                                              <div className="text-xs text-muted-foreground">
                                                Avg Rating
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                          <Badge
                                            variant={
                                              todayCollection
                                                ? "default"
                                                : latestCollection
                                                  ? "secondary"
                                                  : "destructive"
                                            }
                                            className="text-xs sm:text-sm whitespace-nowrap"
                                          >
                                            {todayCollection
                                              ? "✅ Today"
                                              : latestCollection
                                                ? "📅 Done"
                                                : "❌ Never"}
                                          </Badge>
                                          <div className="text-xs text-muted-foreground hidden sm:block">
                                            Tap for details
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </DialogTrigger>

                                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>
                                      Collection Details - {household.headName}
                                    </DialogTitle>
                                  </DialogHeader>

                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Household ID</Label>
                                        <p className="font-medium">
                                          {household.uid}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>House Number</Label>
                                        <p className="font-medium">
                                          {household.houseNumber}
                                        </p>
                                      </div>
                                    </div>

                                    <div>
                                      <Label>
                                        Collection History (
                                        {householdCollections.length} total)
                                      </Label>
                                      {householdCollections.length > 0 ? (
                                        <div className="mt-2 space-y-3 max-h-96 overflow-y-auto">
                                          {householdCollections
                                            .sort(
                                              (a, b) =>
                                                new Date(
                                                  b.collectionDate,
                                                ).getTime() -
                                                new Date(
                                                  a.collectionDate,
                                                ).getTime(),
                                            )
                                            .map((collection, index) => (
                                              <Card key={collection.id}>
                                                <CardContent className="p-4">
                                                  <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                      <h4 className="font-medium">
                                                        Collection #
                                                        {householdCollections.length -
                                                          index}
                                                      </h4>
                                                      <div className="flex items-center gap-2">
                                                        <Badge variant="outline">
                                                          {new Date(
                                                            collection.collectionDate,
                                                          ).toLocaleDateString()}
                                                        </Badge>
                                                        <Badge
                                                          variant={
                                                            collection.status ===
                                                            "collected"
                                                              ? "default"
                                                              : collection.status ===
                                                                  "missed"
                                                                ? "destructive"
                                                                : "secondary"
                                                          }
                                                        >
                                                          {collection.status ||
                                                            "collected"}
                                                        </Badge>
                                                      </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                      <div>
                                                        <span className="text-muted-foreground">
                                                          Collector:
                                                        </span>{" "}
                                                        {collection.collectorName ||
                                                          "Unknown"}
                                                      </div>
                                                      <div>
                                                        <span className="text-muted-foreground">
                                                          Time:
                                                        </span>{" "}
                                                        {new Date(
                                                          collection.collectionDate,
                                                        ).toLocaleTimeString()}
                                                      </div>
                                                    </div>

                                                    {/* Form Data Section */}
                                                    <div className="border-t pt-3">
                                                      <h5 className="font-medium text-sm mb-2">
                                                        Collection Form Data:
                                                      </h5>
                                                      <div className="space-y-2">
                                                        {/* Segregation Rating */}
                                                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                          <span className="text-sm font-medium">
                                                            Segregation Rating:
                                                          </span>
                                                          <div className="flex items-center gap-1">
                                                            {Array.from({
                                                              length: 5,
                                                            }).map((_, i) => (
                                                              <Star
                                                                key={i}
                                                                className={`h-4 w-4 ${i < (collection.segregationRating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                                              />
                                                            ))}
                                                            <span className="ml-2 text-sm font-bold">
                                                              (
                                                              {collection.segregationRating ||
                                                                0}
                                                              /5)
                                                            </span>
                                                          </div>
                                                        </div>

                                                        {/* Plastic Rating */}
                                                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                          <span className="text-sm font-medium">
                                                            Plastic Handling
                                                            Rating:
                                                          </span>
                                                          <div className="flex items-center gap-1">
                                                            {Array.from({
                                                              length: 5,
                                                            }).map((_, i) => (
                                                              <Star
                                                                key={i}
                                                                className={`h-4 w-4 ${i < (collection.plasticRating || 0) ? "fill-blue-400 text-blue-400" : "text-gray-300"}`}
                                                              />
                                                            ))}
                                                            <span className="ml-2 text-sm font-bold">
                                                              (
                                                              {collection.plasticRating ||
                                                                0}
                                                              /5)
                                                            </span>
                                                          </div>
                                                        </div>

                                                        {/* Observations */}
                                                        {collection.observations && (
                                                          <div className="p-2 bg-blue-50 rounded">
                                                            <span className="text-sm font-medium block mb-1">
                                                              Collector
                                                              Observations:
                                                            </span>
                                                            <p className="text-sm text-gray-700">
                                                              "
                                                              {
                                                                collection.observations
                                                              }
                                                              "
                                                            </p>
                                                          </div>
                                                        )}

                                                        {/* Remarks */}
                                                        {collection.remarks && (
                                                          <div className="p-2 bg-green-50 rounded">
                                                            <span className="text-sm font-medium block mb-1">
                                                              Collector Remarks:
                                                            </span>
                                                            <p className="text-sm text-gray-700">
                                                              "
                                                              {
                                                                collection.remarks
                                                              }
                                                              "
                                                            </p>
                                                          </div>
                                                        )}

                                                        {/* Missed Reason */}
                                                        {collection.status ===
                                                          "missed" &&
                                                          collection.missedReason && (
                                                            <div className="p-2 bg-red-50 rounded">
                                                              <span className="text-sm font-medium block mb-1">
                                                                Missed Reason:
                                                              </span>
                                                              <p className="text-sm text-red-700">
                                                                "
                                                                {
                                                                  collection.missedReason
                                                                }
                                                                "
                                                              </p>
                                                            </div>
                                                          )}
                                                      </div>
                                                    </div>

                                                    {/* Media Section */}
                                                    <div className="flex gap-2 pt-2 border-t">
                                                      {collection.photoUrl && (
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          onClick={() =>
                                                            window.open(
                                                              collection.photoUrl,
                                                              "_blank",
                                                            )
                                                          }
                                                        >
                                                          <Camera className="h-4 w-4 mr-1" />
                                                          View Photo
                                                        </Button>
                                                      )}
                                                      {collection.voiceUrl && (
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          onClick={() =>
                                                            window.open(
                                                              collection.voiceUrl,
                                                              "_blank",
                                                            )
                                                          }
                                                        >
                                                          <Mic className="h-4 w-4 mr-1" />
                                                          Play Voice
                                                        </Button>
                                                      )}
                                                      {!collection.photoUrl &&
                                                        !collection.voiceUrl && (
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
                                          <p className="text-muted-foreground">
                                            No collections recorded for this
                                            household
                                          </p>
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
                          <p className="text-lg font-medium mb-2">
                            No Households Found
                          </p>
                          <p className="text-muted-foreground">
                            No households are registered in your village yet.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "feedback" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Feedback Management</h2>
                    <p className="text-muted-foreground">
                      View and analyze generator feedback for collectors
                    </p>
                  </div>
                </div>

                {/* Enhanced Filtering Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Filters & Search</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Search</Label>
                        <Input
                          placeholder="Search by household name or collector..."
                          value={feedbackSearch}
                          onChange={(e) => setFeedbackSearch(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Date Filter</Label>
                        <Input
                          type="date"
                          value={feedbackDate}
                          onChange={(e) => setFeedbackDate(e.target.value)}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFeedbackDate("");
                            setFeedbackSearch("");
                          }}
                          className="w-full"
                        >
                          <Filter className="h-4 w-4 mr-2" />
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Feedback Summary Cards - Mobile Responsive */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Feedback
                      </CardTitle>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Array.isArray(feedbacks) ? feedbacks.length : 0}
                      </div>
                      <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Average Rating
                      </CardTitle>
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Array.isArray(feedbacks) && feedbacks.length > 0
                          ? (
                              feedbacks.reduce(
                                (sum: number, f: any) => sum + (f.rating || 0),
                                0,
                              ) / feedbacks.length
                            ).toFixed(1)
                          : "0.0"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Out of 5.0
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Excellent Ratings
                      </CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Array.isArray(feedbacks)
                          ? feedbacks.filter((f: any) => (f.rating || 0) >= 4)
                              .length
                          : 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        4+ star ratings
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Needs Attention
                      </CardTitle>
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Array.isArray(feedbacks)
                          ? feedbacks.filter((f: any) => (f.rating || 0) <= 2)
                              .length
                          : 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Low ratings
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Feedback List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Feedback History</CardTitle>
                    <CardDescription>
                      Generator feedback about waste collection services
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Array.isArray(feedbacks) && feedbacks.length > 0 ? (
                        feedbacks
                          .filter((feedback: any) => {
                            // Search filter
                            if (feedbackSearch) {
                              const searchLower = feedbackSearch.toLowerCase();
                              const headName = (
                                feedback.headName || ""
                              ).toLowerCase();
                              const collectorName = (
                                feedback.collectorName || ""
                              ).toLowerCase();
                              const householdUid = (
                                feedback.householdUid || ""
                              ).toLowerCase();

                              if (
                                !headName.includes(searchLower) &&
                                !collectorName.includes(searchLower) &&
                                !householdUid.includes(searchLower)
                              ) {
                                return false;
                              }
                            }

                            // Date filter
                            if (feedbackDate) {
                              const feedbackDateObj = new Date(
                                feedback.createdAt,
                              );
                              const filterDateObj = new Date(feedbackDate);
                              if (
                                feedbackDateObj.toDateString() !==
                                filterDateObj.toDateString()
                              ) {
                                return false;
                              }
                            }
                            return true;
                          })
                          .map((feedback: any) => (
                            <Card
                              key={feedback.id}
                              className="hover:shadow-md transition-shadow"
                            >
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-6 mb-4">
                                      <div>
                                        <h3 className="text-lg font-semibold">
                                          {feedback.headName ||
                                            "Unknown Household"}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                          Household:{" "}
                                          {feedback.householdUid || "N/A"} |
                                          House: {feedback.houseNumber || "N/A"}
                                        </p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-blue-600">
                                          For Collector:{" "}
                                          {feedback.collectorName || "Unknown"}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                          {feedback.collectorUid || "N/A"}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 mb-4">
                                      <div>
                                        <span className="font-medium text-sm">
                                          Rating Given:
                                        </span>
                                        <div className="flex items-center mt-2">
                                          {Array.from({ length: 5 }).map(
                                            (_, i) => (
                                              <Star
                                                key={i}
                                                className={`h-5 w-5 ${i < (feedback.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                              />
                                            ),
                                          )}
                                          <span className="ml-3 text-lg font-medium">
                                            ({feedback.rating || 0}/5)
                                          </span>
                                        </div>
                                      </div>
                                      <div>
                                        <span className="font-medium text-sm">
                                          Feedback Date:
                                        </span>
                                        <p className="text-sm mt-2">
                                          {new Date(
                                            feedback.createdAt,
                                          ).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(
                                            feedback.createdAt,
                                          ).toLocaleTimeString()}
                                        </p>
                                      </div>
                                    </div>

                                    {feedback.remarks && (
                                      <div className="mb-4">
                                        <span className="font-medium text-sm">
                                          Generator Comments:
                                        </span>
                                        <p className="text-sm text-muted-foreground bg-gray-50 p-4 rounded-lg mt-2 italic">
                                          "{feedback.remarks}"
                                        </p>
                                      </div>
                                    )}

                                    {feedback.collectionDate && (
                                      <div className="text-xs text-muted-foreground">
                                        Collection Date:{" "}
                                        {new Date(
                                          feedback.collectionDate,
                                        ).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-col items-end gap-2 ml-4">
                                    <Badge
                                      variant={
                                        (feedback.rating || 0) >= 4
                                          ? "default"
                                          : (feedback.rating || 0) >= 3
                                            ? "secondary"
                                            : "destructive"
                                      }
                                      className="text-sm px-3 py-1"
                                    >
                                      {(feedback.rating || 0) >= 4
                                        ? "Excellent Service"
                                        : (feedback.rating || 0) >= 3
                                          ? "Good Service"
                                          : "Needs Improvement"}
                                    </Badge>

                                    {(feedback.rating || 0) <= 2 && (
                                      <Badge
                                        variant="destructive"
                                        className="text-xs"
                                      >
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Requires Attention
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                      ) : (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-lg font-medium mb-2">
                              No Feedback Available
                            </p>
                            <p className="text-muted-foreground">
                              No generator feedback has been recorded yet or
                              matches your current filters.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "households" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">
                      Households Management
                    </h2>
                    <p className="text-muted-foreground">
                      Manage households and assign collectors
                    </p>
                  </div>
                </div>

                {/* Horizontal Navigation Bar for Households - Mobile Responsive */}
                <div className="bg-white border rounded-lg p-1">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
                    <Button
                      variant={householdSubTab === "list" ? "default" : "ghost"}
                      onClick={() => setHouseholdSubTab("list")}
                      className="text-xs sm:text-sm h-auto py-2 px-2 sm:px-4"
                    >
                      <Home className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">View Households</span>
                      <span className="xs:hidden">View</span>
                    </Button>
                    <Button
                      variant={householdSubTab === "add" ? "default" : "ghost"}
                      onClick={() => setHouseholdSubTab("add")}
                      className="text-xs sm:text-sm h-auto py-2 px-2 sm:px-4"
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">Add Households</span>
                      <span className="xs:hidden">Add</span>
                    </Button>
                    <Button
                      variant={
                        householdSubTab === "qr-create" ? "default" : "ghost"
                      }
                      onClick={() => setHouseholdSubTab("qr-create")}
                      className="text-xs sm:text-sm h-auto py-2 px-2 sm:px-4"
                    >
                      <QrCode className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">Create QR</span>
                      <span className="xs:hidden">QR</span>
                    </Button>
                    <Button
                      variant={
                        householdSubTab === "qr-download" ? "default" : "ghost"
                      }
                      onClick={() => setHouseholdSubTab("qr-download")}
                      className="text-xs sm:text-sm h-auto py-2 px-2 sm:px-4"
                    >
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">Download</span>
                      <span className="xs:hidden">Download</span>
                    </Button>
                  </div>
                </div>

                {/* Household Sub-Tab Content */}
                {householdSubTab === "list" && (
                  <div className="space-y-4">
                    {householdsLoading ? (
                      <p>Loading households...</p>
                    ) : (
                      <>
                        {households.map((household) => (
                          <Card key={household.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-semibold">
                                    {household.headName}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    House: {household.houseNumber} | ID:{" "}
                                    {household.uid} | Phone: {household.phone}
                                  </p>
                                  {household.qrCodeUrl && (
                                    <Badge variant="secondary" className="mt-2">
                                      <QrCode className="h-3 w-3 mr-1" />
                                      QR Code Available
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {households.length === 0 && (
                          <Card>
                            <CardContent className="p-8 text-center">
                              <p className="text-muted-foreground">
                                No households found. Add your first household!
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}
                  </div>
                )}

                {householdSubTab === "add" && (
                  <div className="space-y-4">
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
                        <CardDescription>
                          Create multiple households with QR code generation
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <BulkHouseholdCreation />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {householdSubTab === "qr-create" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Generate QR Codes</CardTitle>
                      <CardDescription>
                        Create QR codes for existing households
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <QRCodeGenerationPanel households={households} />
                    </CardContent>
                  </Card>
                )}

                {householdSubTab === "qr-download" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Download QR Codes</CardTitle>
                      <CardDescription>
                        Download QR codes as PDF for printing
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <QRCodeDownloadPanel
                        households={households.filter((h) => h.qrCodeUrl)}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "segregators" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">
                      Segregators Management
                    </h2>
                    <p className="text-muted-foreground">
                      Manage waste segregation workers with performance tracking
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <CreateSegregatorDialog />
                    <Button onClick={() => setShowAttendanceDialog(true)}>
                      <Clock className="h-4 w-4 mr-2" />
                      Mark Attendance
                    </Button>
                  </div>
                </div>

                {/* Performance Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Present Today
                      </CardTitle>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {
                          segregatorAttendance.filter(
                            (a) => a.status === "present",
                          ).length
                        }
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Out of {segregators.length} segregators
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Average Rating
                      </CardTitle>
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {segregatorAttendance.length > 0
                          ? (
                              segregatorAttendance
                                .filter((a) => a.workRating)
                                .reduce(
                                  (sum, a) => sum + (a.workRating || 0),
                                  0,
                                ) /
                              segregatorAttendance.filter((a) => a.workRating)
                                .length
                            ).toFixed(1)
                          : "0.0"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Today's performance
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Work Hours
                      </CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {detailedAttendance
                          .filter((a) => a.segregatorId && a.workHours)
                          .reduce((sum, a) => sum + (a.workHours || 0), 0)}
                        h
                      </div>
                      <p className="text-xs text-muted-foreground">Today</p>
                    </CardContent>
                  </Card>
                </div>

                {segregatorsLoading ? (
                  <p>Loading segregators...</p>
                ) : (
                  <div className="space-y-4">
                    {segregators.map((segregator) => {
                      const todayAttendance = segregatorAttendance.find(
                        (a) => a.segregatorId === segregator.id,
                      );
                      const detailedRecord = detailedAttendance.find(
                        (a) => a.segregatorId === segregator.id,
                      );

                      return (
                        <Card key={segregator.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-4">
                                  <div>
                                    <h3 className="font-semibold">
                                      {segregator.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      Phone: {segregator.phone}
                                    </p>
                                    {segregator.address && (
                                      <p className="text-sm text-muted-foreground">
                                        Address: {segregator.address}
                                      </p>
                                    )}
                                  </div>

                                  {/* Today's Performance */}
                                  {detailedRecord && (
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                      <div>
                                        <div className="text-lg font-bold">
                                          {detailedRecord.workHours || 0}h
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Work Hours
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-lg font-bold">
                                          {detailedRecord.workRating || 0}/5
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Rating
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-lg font-bold">
                                          {detailedRecord.startTime &&
                                          detailedRecord.endTime
                                            ? `${detailedRecord.startTime}-${detailedRecord.endTime}`
                                            : "N/A"}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Shift
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Today's Attendance Status */}
                                {(todayAttendance || detailedRecord) && (
                                  <div className="mt-3 p-2 bg-muted rounded-lg">
                                    <div className="flex items-center justify-between text-sm">
                                      <span>Today's Status:</span>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant={
                                            todayAttendance?.status ===
                                              "present" ||
                                            detailedRecord?.status === "present"
                                              ? "default"
                                              : todayAttendance?.status ===
                                                    "half_day" ||
                                                  detailedRecord?.status ===
                                                    "half_day"
                                                ? "secondary"
                                                : "destructive"
                                          }
                                        >
                                          {(
                                            todayAttendance?.status ||
                                            detailedRecord?.status ||
                                            "absent"
                                          )
                                            .replace("_", " ")
                                            .toUpperCase()}
                                        </Badge>
                                        {(todayAttendance?.workRating ||
                                          detailedRecord?.workRating) && (
                                          <span className="text-muted-foreground">
                                            Rating:{" "}
                                            {todayAttendance?.workRating ||
                                              detailedRecord?.workRating}
                                            /5
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {(todayAttendance?.remarks ||
                                      detailedRecord?.remarks) && (
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        <strong>Remarks:</strong>{" "}
                                        {todayAttendance?.remarks ||
                                          detailedRecord?.remarks}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    segregator.isActive
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {segregator.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Details
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {segregators.length === 0 && (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <p className="text-muted-foreground">
                            No segregators found. Add your first segregator!
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Segregator Attendance</h2>
                  <p className="text-muted-foreground">
                    Mark and track segregator attendance
                  </p>
                </div>

                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Label>Select Date:</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-[240px] justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? (
                                format(selectedDate, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => date && setSelectedDate(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-4">
                        {segregators.map((segregator) => {
                          const attendance = segregatorAttendance.find(
                            (a) => a.segregatorId === segregator.id,
                          );

                          return (
                            <div
                              key={segregator.id}
                              className="flex items-center justify-between p-4 border rounded-lg"
                            >
                              <div>
                                <h3 className="font-semibold">
                                  {segregator.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Phone: {segregator.phone}
                                </p>
                                {attendance && (
                                  <div className="mt-2 space-y-1">
                                    <Badge
                                      variant={
                                        attendance.status === "present"
                                          ? "default"
                                          : attendance.status === "half_day"
                                            ? "secondary"
                                            : "destructive"
                                      }
                                    >
                                      {attendance.status
                                        .replace("_", " ")
                                        .toUpperCase()}
                                    </Badge>
                                    {attendance.workRating && (
                                      <p className="text-sm text-muted-foreground">
                                        Rating: {attendance.workRating}/5 ⭐
                                      </p>
                                    )}
                                    {attendance.remarks && (
                                      <p className="text-sm text-muted-foreground">
                                        Remarks: {attendance.remarks}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                              <AttendanceMarkingDialog
                                segregator={segregator}
                              />
                            </div>
                          );
                        })}
                        {segregators.length === 0 && (
                          <p className="text-center text-muted-foreground">
                            No segregators found. Add segregators first!
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {activeTab === "issues" && (
            <div className="space-y-6 md:w-full md:mr-8 mb-10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    Issues Management
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Manage and resolve issues reported by villagers
                  </p>
                </div>
                <Select value={issuesFilter} onValueChange={setIssuesFilter}>
                  <SelectTrigger className="w-full sm:w-40">
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

              {/* Issues Overview Cards - Mobile Responsive */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                    <CardTitle className="text-xs sm:text-sm font-medium truncate pr-1">
                      Total Issues
                    </CardTitle>
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="text-lg sm:text-2xl font-bold">
                      {allIssues.length}
                    </div>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                    <CardTitle className="text-xs sm:text-sm font-medium truncate pr-1">
                      Open Issues
                    </CardTitle>
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="text-lg sm:text-2xl font-bold text-red-600">
                      {allIssues.filter((i) => i.status === "open").length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Needs attention
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                    <CardTitle className="text-xs sm:text-sm font-medium truncate pr-1">
                      In Progress
                    </CardTitle>
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="text-lg sm:text-2xl font-bold text-yellow-600">
                      {
                        allIssues.filter((i) => i.status === "in_progress")
                          .length
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Being worked on
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                    <CardTitle className="text-xs sm:text-sm font-medium truncate pr-1">
                      Resolved
                    </CardTitle>
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="text-lg sm:text-2xl font-bold text-green-600">
                      {allIssues.filter((i) => i.status === "resolved").length}
                    </div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Issues List */}
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl">
                    Issue Reports
                  </CardTitle>
                  <CardDescription className="text-sm">
                    View and manage issues reported by village residents
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="space-y-3 sm:space-y-4">
                    {Array.isArray(allIssues) && allIssues.length > 0 ? (
                      allIssues
                        .filter((issue) => {
                          if (issuesFilter === "all") return true;
                          return issue.status === issuesFilter;
                        })
                        .map((issue) => (
                          <Card key={issue.id} className="overflow-hidden">
                            <CardContent className="p-3 sm:p-4">
                              <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                      <h4 className="font-semibold text-sm sm:text-base truncate">
                                        {issue.title}
                                      </h4>
                                      <div className="flex flex-wrap gap-1">
                                        <Badge
                                          variant={
                                            issue.status === "open"
                                              ? "destructive"
                                              : issue.status === "in_progress"
                                                ? "secondary"
                                                : "default"
                                          }
                                          className="text-xs"
                                        >
                                          {issue.status
                                            .replace("_", " ")
                                            .toUpperCase()}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {issue.category}
                                        </Badge>
                                      </div>
                                    </div>
                                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                                      Reported by: {issue.reportedBy} on{" "}
                                      {new Date(
                                        issue.createdAt,
                                      ).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs sm:text-sm break-words">
                                      {issue.description}
                                    </p>

                                    {issue.managerReply && (
                                      <div className="mt-3 p-2 sm:p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs sm:text-sm break-words">
                                          <strong>Manager Reply:</strong>{" "}
                                          {issue.managerReply}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                                    {issue.photoUrl && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          window.open(issue.photoUrl, "_blank")
                                        }
                                        className="text-xs"
                                      >
                                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                        <span className="hidden xs:inline">
                                          Photo
                                        </span>
                                        <span className="xs:hidden">📷</span>
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedIssue(issue);
                                        setShowIssueDialog(true);
                                      }}
                                      className="text-xs"
                                    >
                                      <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                      <span className="hidden xs:inline">
                                        Manage
                                      </span>
                                      <span className="xs:hidden">Edit</span>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                    ) : (
                      <div className="text-center py-8">
                        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm sm:text-base text-muted-foreground">
                          No issues reported
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="w-full mr-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Reports & Analytics</h2>
                  <p className="text-muted-foreground">
                    Real-time data analytics and performance insights
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Select
                    value={reportsFilter}
                    onValueChange={setReportsFilter}
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="weekly">This Week</SelectItem>
                      <SelectItem value="monthly">This Month</SelectItem>
                      <SelectItem value="alltime">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => {
                      queryClient.invalidateQueries({
                        queryKey: ["/api/waste-collections"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["/api/issues"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["/api/feedback"],
                      });
                      toast({ title: "Data refreshed" });
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                </div>
              </div>

              {/* Advanced Filter Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Advanced Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Date Range</Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={collectionsDateFilter}
                          onChange={(e) =>
                            setCollectionsDateFilter(e.target.value)
                          }
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Collector</Label>
                      <Select
                        value={selectedHouseholdFilter}
                        onValueChange={setSelectedHouseholdFilter}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Collectors" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Collectors</SelectItem>
                          {collectors?.map((collector) => (
                            <SelectItem
                              key={collector.id}
                              value={collector.id.toString()}
                            >
                              {collector.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status Filter</Label>
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="collected">Collected</SelectItem>
                          <SelectItem value="missed">Missed</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCollectionsDateFilter("");
                          setSelectedHouseholdFilter("all");
                          setStatusFilter("all");
                        }}
                        className="w-full"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Performance Indicators */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-800">
                      Collection Efficiency
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-900">
                      {stats && stats.totalHouseholds > 0
                        ? Math.round(
                            (stats.collectionsToday / stats.totalHouseholds) *
                              100,
                          )
                        : 0}
                      %
                    </div>
                    <p className="text-xs text-blue-700">
                      {stats?.collectionsToday || 0} of{" "}
                      {stats?.totalHouseholds || 0} households
                    </p>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            stats && stats.totalHouseholds > 0
                              ? Math.round(
                                  (stats.collectionsToday /
                                    stats.totalHouseholds) *
                                    100,
                                )
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-800">
                      Segregation Quality
                    </CardTitle>
                    <Award className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-900">
                      {Array.isArray(allCollections) &&
                      allCollections.length > 0
                        ? Math.round(
                            (allCollections.filter((c) => c.wasteSegregated)
                              .length /
                              allCollections.length) *
                              100,
                          )
                        : 0}
                      %
                    </div>
                    <p className="text-xs text-green-700">
                      {Array.isArray(allCollections)
                        ? allCollections.filter((c) => c.wasteSegregated).length
                        : 0}{" "}
                      properly segregated
                    </p>
                    <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            Array.isArray(allCollections) &&
                            allCollections.length > 0
                              ? Math.round(
                                  (allCollections.filter(
                                    (c) => c.wasteSegregated,
                                  ).length /
                                    allCollections.length) *
                                    100,
                                )
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-yellow-800">
                      Average Rating
                    </CardTitle>
                    <Star className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-900">
                      {Array.isArray(allCollections) &&
                      allCollections.length > 0
                        ? (
                            allCollections.reduce(
                              (sum, c) => sum + (c.segregationRating || 0),
                              0,
                            ) / allCollections.length
                          ).toFixed(1)
                        : "0.0"}
                    </div>
                    <p className="text-xs text-yellow-700">Out of 5.0 stars</p>
                    <div className="flex items-center mt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i <
                            Math.round(
                              Array.isArray(allCollections) &&
                                allCollections.length > 0
                                ? allCollections.reduce(
                                    (sum, c) =>
                                      sum + (c.segregationRating || 0),
                                    0,
                                  ) / allCollections.length
                                : 0,
                            )
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-yellow-200"
                          }`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-800">
                      Open Issues
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-900">
                      {Array.isArray(allIssues)
                        ? allIssues.filter((i) => i.status === "open").length
                        : 0}
                    </div>
                    <p className="text-xs text-red-700">
                      {Array.isArray(allIssues) ? allIssues.length : 0} total
                      issues
                    </p>
                    <div className="w-full bg-red-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-red-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            Array.isArray(allIssues) && allIssues.length > 0
                              ? Math.round(
                                  (allIssues.filter((i) => i.status === "open")
                                    .length /
                                    allIssues.length) *
                                    100,
                                )
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Real-time Analytics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Collection Trends Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Collection Trends</CardTitle>
                    <CardDescription>
                      Collection patterns over the last 7 days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {(() => {
                        // Calculate daily collections for last 7 days
                        const last7Days = Array.from({ length: 7 }, (_, i) => {
                          const date = new Date();
                          date.setDate(date.getDate() - (6 - i));
                          return date;
                        });

                        const dailyData = last7Days.map((date) => {
                          const dayCollections = Array.isArray(allCollections)
                            ? allCollections.filter((c) => {
                                const collectionDate = new Date(
                                  c.collectionDate,
                                );
                                return (
                                  collectionDate.toDateString() ===
                                  date.toDateString()
                                );
                              }).length
                            : 0;
                          return {
                            day: date.toLocaleDateString("en-US", {
                              weekday: "short",
                            }),
                            collections: dayCollections,
                          };
                        });

                        const maxCollections = Math.max(
                          ...dailyData.map((d) => d.collections),
                          1,
                        );

                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-end h-48 gap-2">
                              {dailyData.map((data, index) => (
                                <div
                                  key={index}
                                  className="flex flex-col items-center flex-1"
                                >
                                  <div className="flex flex-col justify-end h-40 w-full">
                                    <div
                                      className="bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-md flex items-end justify-center text-white text-xs font-medium transition-all duration-500 hover:from-blue-600 hover:to-blue-400"
                                      style={{
                                        height: `${(data.collections / maxCollections) * 100}%`,
                                        minHeight:
                                          data.collections > 0 ? "8px" : "0px",
                                      }}
                                    >
                                      {data.collections > 0 && (
                                        <span className="mb-1">
                                          {data.collections}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-2 font-medium">
                                    {data.day}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-muted-foreground">
                                Total:{" "}
                                {dailyData.reduce(
                                  (sum, d) => sum + d.collections,
                                  0,
                                )}{" "}
                                collections this week
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Waste Segregation Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Waste Segregation Analysis</CardTitle>
                    <CardDescription>
                      Breakdown of segregation compliance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center">
                      {(() => {
                        const segregatedCount = Array.isArray(allCollections)
                          ? allCollections.filter((c) => c.wasteSegregated)
                              .length
                          : 0;
                        const notSegregatedCount = Array.isArray(allCollections)
                          ? allCollections.length - segregatedCount
                          : 0;
                        const total = segregatedCount + notSegregatedCount;

                        if (total === 0) {
                          return (
                            <div className="text-center">
                              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-muted-foreground">
                                No collection data available
                              </p>
                            </div>
                          );
                        }

                        const segregatedPercentage =
                          (segregatedCount / total) * 100;
                        const notSegregatedPercentage =
                          (notSegregatedCount / total) * 100;

                        return (
                          <div className="space-y-6">
                            <div className="relative w-40 h-40 mx-auto">
                              <svg
                                className="w-40 h-40 transform -rotate-90"
                                viewBox="0 0 36 36"
                              >
                                <path
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="#e5e7eb"
                                  strokeWidth="3"
                                />
                                <path
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="3"
                                  strokeDasharray={`${segregatedPercentage}, 100`}
                                  className="transition-all duration-1000"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600">
                                    {segregatedPercentage.toFixed(0)}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Segregated
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                  <span className="text-sm">
                                    Properly Segregated
                                  </span>
                                </div>
                                <span className="text-sm font-medium">
                                  {segregatedCount}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
                                  <span className="text-sm">
                                    Not Segregated
                                  </span>
                                </div>
                                <span className="text-sm font-medium">
                                  {notSegregatedCount}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Collector Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Collector Performance Ranking</CardTitle>
                    <CardDescription>
                      Top performing collectors by collections count
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 space-y-3">
                      {(() => {
                        const collectorPerformance =
                          collectors
                            ?.map((collector) => {
                              const collectorCollections = Array.isArray(
                                allCollections,
                              )
                                ? allCollections.filter(
                                    (c) => c.collectorId === collector.id,
                                  )
                                : [];

                              const avgRating =
                                collectorCollections.length > 0
                                  ? collectorCollections.reduce(
                                      (sum, c) =>
                                        sum + (c.segregationRating || 0),
                                      0,
                                    ) / collectorCollections.length
                                  : 0;

                              return {
                                name: collector.name,
                                collections: collectorCollections.length,
                                rating: avgRating,
                              };
                            })
                            .sort((a, b) => b.collections - a.collections) ||
                          [];

                        const maxCollections = Math.max(
                          ...collectorPerformance.map((c) => c.collections),
                          1,
                        );

                        return collectorPerformance.length > 0 ? (
                          <div className="space-y-3">
                            {collectorPerformance
                              .slice(0, 5)
                              .map((collector, index) => (
                                <div key={index} className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center">
                                      <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3 ${
                                          index === 0
                                            ? "bg-yellow-500"
                                            : index === 1
                                              ? "bg-gray-400"
                                              : index === 2
                                                ? "bg-orange-600"
                                                : "bg-blue-500"
                                        }`}
                                      >
                                        {index + 1}
                                      </div>
                                      <div>
                                        <div className="font-medium text-sm">
                                          {collector.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {collector.rating.toFixed(1)} ⭐
                                          rating
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold">
                                        {collector.collections}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        collections
                                      </div>
                                    </div>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all duration-500 ${
                                        index === 0
                                          ? "bg-yellow-500"
                                          : index === 1
                                            ? "bg-gray-400"
                                            : index === 2
                                              ? "bg-orange-600"
                                              : "bg-blue-500"
                                      }`}
                                      style={{
                                        width: `${(collector.collections / maxCollections) * 100}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-muted-foreground">
                                No collector data available
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Issue Resolution Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle>Issue Resolution Status</CardTitle>
                    <CardDescription>
                      Current status of reported issues
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {(() => {
                        const openIssues = Array.isArray(allIssues)
                          ? allIssues.filter((i) => i.status === "open").length
                          : 0;
                        const inProgressIssues = Array.isArray(allIssues)
                          ? allIssues.filter((i) => i.status === "in_progress")
                              .length
                          : 0;
                        const resolvedIssues = Array.isArray(allIssues)
                          ? allIssues.filter((i) => i.status === "resolved")
                              .length
                          : 0;
                        const totalIssues =
                          openIssues + inProgressIssues + resolvedIssues;

                        if (totalIssues === 0) {
                          return (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-center">
                                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                                <p className="text-muted-foreground">
                                  No issues reported - Great job!
                                </p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center">
                                    <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                                    <span className="text-sm">Open Issues</span>
                                  </div>
                                  <span className="text-sm font-bold">
                                    {openIssues}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div
                                    className="bg-red-500 h-3 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${(openIssues / totalIssues) * 100}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center">
                                    <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                                    <span className="text-sm">In Progress</span>
                                  </div>
                                  <span className="text-sm font-bold">
                                    {inProgressIssues}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div
                                    className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${(inProgressIssues / totalIssues) * 100}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center">
                                    <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                                    <span className="text-sm">Resolved</span>
                                  </div>
                                  <span className="text-sm font-bold">
                                    {resolvedIssues}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div
                                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${(resolvedIssues / totalIssues) * 100}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>

                            <div className="text-center pt-4 border-t">
                              <div className="text-lg font-bold">
                                {totalIssues > 0
                                  ? Math.round(
                                      (resolvedIssues / totalIssues) * 100,
                                    )
                                  : 0}
                                %
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Resolution Rate
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Performance Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Performance Metrics</CardTitle>
                  <CardDescription>
                    Comprehensive breakdown of village waste management
                    performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm border-b pb-2">
                        Collection Analytics
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                          <span className="text-sm">Total Collections:</span>
                          <span className="font-bold">
                            {Array.isArray(allCollections)
                              ? allCollections.length
                              : 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <span className="text-sm">Today's Collections:</span>
                          <span className="font-bold">
                            {stats?.collectionsToday || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                          <span className="text-sm">Coverage Rate:</span>
                          <span className="font-bold">
                            {stats && stats.totalHouseholds > 0
                              ? Math.round(
                                  (stats.collectionsToday /
                                    stats.totalHouseholds) *
                                    100,
                                )
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                          <span className="text-sm">Missed Collections:</span>
                          <span className="font-bold">
                            {Array.isArray(allCollections)
                              ? allCollections.filter(
                                  (c) => c.status === "missed",
                                ).length
                              : 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm border-b pb-2">
                        Quality Metrics
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <span className="text-sm">Segregated Waste:</span>
                          <span className="font-bold text-green-600">
                            {Array.isArray(allCollections) &&
                            allCollections.length > 0
                              ? Math.round(
                                  (allCollections.filter(
                                    (c) => c.wasteSegregated,
                                  ).length /
                                    allCollections.length) *
                                    100,
                                )
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                          <span className="text-sm">Clean Bins:</span>
                          <span className="font-bold text-blue-600">
                            {Array.isArray(allCollections) &&
                            allCollections.length > 0
                              ? Math.round(
                                  (allCollections.filter((c) => c.binCleaned)
                                    .length /
                                    allCollections.length) *
                                    100,
                                )
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                          <span className="text-sm">Avg. Rating:</span>
                          <span className="font-bold text-yellow-600">
                            {Array.isArray(allCollections) &&
                            allCollections.length > 0
                              ? (
                                  allCollections.reduce(
                                    (sum, c) =>
                                      sum + (c.segregationRating || 0),
                                    0,
                                  ) / allCollections.length
                                ).toFixed(1)
                              : "0.0"}
                            /5
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                          <span className="text-sm">High Ratings (4+):</span>
                          <span className="font-bold text-orange-600">
                            {Array.isArray(allCollections)
                              ? allCollections.filter(
                                  (c) => (c.segregationRating || 0) >= 4,
                                ).length
                              : 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm border-b pb-2">
                        Issue Management
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">Total Issues:</span>
                          <span className="font-bold">
                            {Array.isArray(allIssues) ? allIssues.length : 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <span className="text-sm">Open Issues:</span>
                          <span className="font-bold text-red-600">
                            {Array.isArray(allIssues)
                              ? allIssues.filter((i) => i.status === "open")
                                  .length
                              : 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <span className="text-sm">Resolution Rate:</span>
                          <span className="font-bold text-green-600">
                            {Array.isArray(allIssues) && allIssues.length > 0
                              ? Math.round(
                                  (allIssues.filter(
                                    (i) => i.status === "resolved",
                                  ).length /
                                    allIssues.length) *
                                    100,
                                )
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                          <span className="text-sm">Avg. Response Time:</span>
                          <span className="font-bold text-blue-600">
                            {Array.isArray(allIssues) && allIssues.length > 0
                              ? "< 24h"
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Frequently used management tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button
                      onClick={() => setActiveTab("collections")}
                      variant="outline"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      View Collections
                    </Button>
                    <Button
                      onClick={() => setActiveTab("issues")}
                      variant="outline"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Manage Issues
                    </Button>
                    <Button
                      onClick={() => setActiveTab("collectors")}
                      variant="outline"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Collector Performance
                    </Button>
                    <Button
                      onClick={() => setActiveTab("feedback")}
                      variant="outline"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View Feedback
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "announcements" && (
            <div className="space-y-6 md:w-full sm:mb-10 md:mr-8">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Announcements</h2>
                  <p className="text-muted-foreground">
                    Send announcements to your village community
                  </p>
                </div>
              </div>

              {/* Send New Announcement */}
              <Card>
                <CardHeader>
                  <CardTitle>Send New Announcement</CardTitle>
                  <CardDescription>
                    Send important updates and notifications to your villagers
                  </CardDescription>
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
                      <Label htmlFor="message">Announcement Message</Label>
                      <Textarea
                        id="message"
                        value={announcementMessage}
                        onChange={(e) => setAnnouncementMessage(e.target.value)}
                        placeholder="Type your announcement message..."
                        rows={4}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="target">Target Audience</Label>
                      <Select
                        value={announcementTarget}
                        onValueChange={setAnnouncementTarget}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="generators">
                            Generators (Households)
                          </SelectItem>
                          <SelectItem value="collectors">Collectors</SelectItem>
                          <SelectItem value="all">All Village Users</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="submit"
                      disabled={
                        sendAnnouncementMutation.isPending ||
                        !announcementMessage.trim()
                      }
                      className="w-full"
                    >
                      {sendAnnouncementMutation.isPending
                        ? "Sending..."
                        : "Send Announcement"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Announcements History */}
              <Card>
                <CardHeader>
                  <CardTitle>Announcement History</CardTitle>
                  <CardDescription>
                    View all previously sent announcements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {announcementsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">
                          Loading announcements...
                        </p>
                      </div>
                    ) : announcements && announcements.length > 0 ? (
                      <div className="space-y-3">
                        {announcements.map((announcement: any) => (
                          <Card
                            key={announcement.id}
                            className="p-4 shadow-sm border-l-4 border-l-blue-400"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <p className="text-sm font-medium text-gray-900 flex-1 pr-2">
                                  {announcement.message}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className="text-xs whitespace-nowrap"
                                >
                                  {announcement.targetAudience === "generators"
                                    ? "Households"
                                    : announcement.targetAudience ===
                                        "collectors"
                                      ? "Collectors"
                                      : "All Users"}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center space-x-2">
                                  <MessageSquare className="w-3 h-3" />
                                  <span className="font-medium">
                                    Official Announcement
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span>
                                    {new Date(
                                      announcement.createdAt,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No Announcements
                        </h3>
                        <p className="text-gray-500 mb-4">
                          You haven't sent any announcements yet. Send your
                          first announcement above!
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <PasswordChangeDialog />

      {/* Issue Management Dialog */}
      <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Manage Issue
            </DialogTitle>
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
                setShowIssueDialog(false);
              }}
              className="space-y-4"
            >
              {/* Issue Details Section */}
              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <h4 className="font-medium text-sm">Issue Details</h4>
                <div>
                  <Label className="text-xs text-gray-600">Title</Label>
                  <p className="text-sm font-medium break-words">
                    {selectedIssue.title}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Description</Label>
                  <p className="text-sm break-words">
                    {selectedIssue.description}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Reported By</Label>
                  <p className="text-sm">{selectedIssue.reportedBy}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Category</Label>
                  <Badge variant="outline" className="text-xs">
                    {selectedIssue.category}
                  </Badge>
                </div>
                {selectedIssue.photoUrl && (
                  <div>
                    <Label className="text-xs text-gray-600">
                      Attached Photo
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(selectedIssue.photoUrl, "_blank")
                      }
                      className="mt-1"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Photo
                    </Button>
                  </div>
                )}
                {selectedIssue.managerReply && (
                  <div>
                    <Label className="text-xs text-gray-600">
                      Current Manager Reply
                    </Label>
                    <p className="text-sm p-2 bg-blue-50 rounded border break-words">
                      {selectedIssue.managerReply}
                    </p>
                  </div>
                )}
              </div>

              {/* Update Form Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm border-b pb-2">
                  Update Issue
                </h4>
                <div>
                  <Label htmlFor="status" className="text-sm">
                    Status
                  </Label>
                  <Select name="status" defaultValue={selectedIssue.status}>
                    <SelectTrigger className="mt-1">
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
                  <Label htmlFor="managerReply" className="text-sm">
                    Manager Reply
                  </Label>
                  <Textarea
                    id="managerReply"
                    name="managerReply"
                    defaultValue={selectedIssue.managerReply || ""}
                    placeholder="Add your response to this issue..."
                    rows={3}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowIssueDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateIssueMutation.isPending}
                  className="flex-1"
                >
                  {updateIssueMutation.isPending
                    ? "Updating..."
                    : "Update Issue"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
