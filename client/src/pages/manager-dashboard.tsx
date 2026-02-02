import { useState, useEffect } from "react";
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { apiRequest, fetchWithCsrf } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DashboardTour } from "@/components/tours/DashboardTour";
import { TourButton } from "@/components/tours/TourButton";
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
  Upload,
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
  CreditCard,
  XCircle,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
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

// Lazy-loading household collection card - fetches collections only when clicked
const HouseholdCollectionCard = ({ 
  household, 
  dateFilter 
}: { 
  household: Household; 
  dateFilter: string;
}) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  
  const { data: householdCollections = [], isLoading: collectionsLoading } = useQuery<WasteCollection[]>({
    queryKey: ["/api/waste-collections/household", household.uid],
    queryFn: async () => {
      const response = await fetch(`/api/waste-collections/household/${household.uid}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch collections");
      return response.json();
    },
    enabled: open,
  });
  
  const filteredCollections = dateFilter 
    ? householdCollections.filter(c => {
        const collectionDate = new Date(c.collectionDate);
        return collectionDate.toDateString() === new Date(dateFilter).toDateString();
      })
    : householdCollections;
  
  const sortedCollections = [...filteredCollections].sort((a, b) => 
    new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                Click to view
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

          {collectionsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-muted-foreground">Loading collections...</p>
            </div>
          ) : sortedCollections.length > 0 ? (
            <div className="space-y-3">
              {sortedCollections.map((collection) => (
                <Card key={collection.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Collection Details</h4>
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
                        <h5 className="font-medium text-sm mb-2">Ratings:</h5>
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

                      {(collection.photoUrl || collection.voiceUrl) && (
                        <div className="space-y-3 pt-3 border-t">
                          {collection.photoUrl && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Collection Photo:</Label>
                              <div className="border rounded-lg overflow-hidden bg-gray-50">
                                <img
                                  src={collection.photoUrl}
                                  alt="Collection photo"
                                  className="w-full max-h-32 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {collection.voiceUrl && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Voice Recording:</Label>
                              <audio controls className="w-full h-10" preload="metadata">
                                <source src={collection.voiceUrl} type="audio/mpeg" />
                                <source src={collection.voiceUrl} type="audio/wav" />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {dateFilter ? `No collections for ${new Date(dateFilter).toLocaleDateString()}` : "No collections recorded"}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
  const [activeTab, setActiveTab] = useState("overview");
  const [householdApproachTab, setHouseholdApproachTab] = useState("details");
  const [qrFirstSubTab, setQrFirstSubTab] = useState("generate-batch");
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
  
  // Image modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');

  // Consolidated filters
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    date: "",
    status: "all",
    collector: "all"
  });

  // Search input for collections tab
  const [collectionsSearchInput, setCollectionsSearchInput] = useState("");

  // Excel upload state
  const [showWardForm, setShowWardForm] = useState(false);
  const [newWard, setNewWard] = useState("");

  // Field Worker and Batch QR state
  const [collectorsSubTab, setCollectorsSubTab] = useState("collectors");
  const [batchQuantity, setBatchQuantity] = useState(10);
  const [showCreateFieldWorkerDialog, setShowCreateFieldWorkerDialog] = useState(false);
  const [newFieldWorkerName, setNewFieldWorkerName] = useState("");
  const [newFieldWorkerPhone, setNewFieldWorkerPhone] = useState("");
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [householdSearch, setHouseholdSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  
  // UI-only pagination for households in collections tab (limit 50 at a time)
  const [collectionsHouseholdsLimit, setCollectionsHouseholdsLimit] = useState(50);

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
  const { data: households = [] } = useQuery<Household[]>({
    queryKey: ["/api/households", user?.villageId],
    enabled: !!user?.villageId,
  });

  // Total households count is the actual length since we fetch all
  const totalHouseholdsCount = households.length;

  const { data: collectorStats = [] } = useQuery<CollectorStats[]>({
    queryKey: ["/api/collectors/stats", user?.villageId],
    enabled: !!user?.villageId,
  });

  // Fetch ALL waste collections at once (no pagination) for accurate aggregates and reports
  const { data: allCollections = [] } = useQuery<WasteCollection[]>({
    queryKey: ["/api/waste-collections/village", user?.villageId],
    enabled: !!user?.villageId,
  });

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
    enabled: !!user?.villageId && activeTab === "collectors" && collectorsSubTab === "fieldworkers",
  });

  // Batch QR codes query - enabled for both Field Workers tab and Households QR-first approach
  const { data: batchQRCodes = [] } = useQuery<any[]>({
    queryKey: ["/api/qr-codes", user?.villageId],
    enabled: !!user?.villageId && (
      (activeTab === "collectors" && collectorsSubTab === "fieldworkers") ||
      (activeTab === "households" && householdApproachTab === "qr-first")
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
    setCollectionsSearchInput("");
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
      {/* Dashboard Tour Component */}
      {/* <DashboardTour 
        userRole="manager" 
        shouldShowWelcome={user?.isFirstLogin}
      /> */}
      
      
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Top Navbar */}
        <div className="bg-green-600 text-white px-2 sm:px-7 py-1 sm:py-2 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
             <img src="/logos/logo-dark.svg" alt="GreenPath" className="w-auto h-9" />
          </div>
            <div className="flex items-center space-x-1">
              {/* <TourButton className="text-black bg-white hover:bg-white"/> */}
            
                <button
                  key={'announcements'}
                  onClick={() => setActiveTab('announcements')}
                  className={cn(
                    "flex-1 flex items-center justify-center py-3 transition-colors",
                    activeTab === 'announcements'
                      ? "text-blue-600 bg-blue-50 p-2 rounded-md"
                      : "text-black p-2 bg-white rounded-md",
                  )}
                >
                  <Bell className="h-5 w-5" strokeWidth={3}/>
                </button>
                <button
                  key={'settings'}
                  onClick={() => setActiveTab('settings')}
                  className={cn(
                    "flex-1 flex items-center justify-center py-3 transition-colors",
                    activeTab === 'settings'
                      ? "text-blue-600 bg-blue-50 p-2 rounded-md"
                      : "text-black p-2 bg-white rounded-md",
                  )}
                >
                  <Settings className="h-5 w-5" strokeWidth={3}/>
                </button>

            </div>
        </div>
      </div>

        <div className="flex flex-1 min-h-0">
          {/* Mobile Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-green-100 border-t z-50 md:hidden">
            <div className="flex">
              {[
                { id: "overview", icon: LayoutDashboard, class: "manager-overview-tab" },
                { id: "collectors", icon: Users, class: "manager-collectors-tab" },
                { id: "households", icon: Home, class: "manager-households-tab" },
                { id: "collections", icon: Package, class: "manager-collections-tab" },
                { id: "material-log", icon: ClipboardList, class: "manager-material-log-tab" },
                { id: "issues", icon: AlertTriangle, class: "manager-issues-tab" },
                { id: "reports", icon: BarChart3, class: "manager-reports-tab" },
                // { id: "announcements", icon: Bell, class: "manager-announcements-tab" },
              ].map(({ id, icon: Icon, class: className }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    `${className} flex-1 flex items-center justify-center py-3 transition-colors`,
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
                  { id: "overview", icon: LayoutDashboard, label: t("dashboard.overview"), class: "manager-overview-tab" },
                  { id: "collectors", icon: Users, label: "WorkForce", class: "manager-collectors-tab" },
                  { id: "households", icon: Home, label: t("navigation.households"), class: "manager-households-tab" },
                  { id: "collections", icon: Package, label: t("navigation.collections"), class: "manager-collections-tab" },
                  { id: "material-log", icon: ClipboardList, label: "Material Log", class: "manager-material-log-tab" },
                  { id: "issues", icon: AlertTriangle, label: t("navigation.issues"), class: "manager-issues-tab" },
                  { id: "reports", icon: BarChart3, label: t("navigation.reports"), class: "manager-reports-tab" },
                  { id: "announcements", icon: Bell, label: t("navigation.announcements"), class: "manager-announcements-tab" },
                  { id: "settings", icon: Settings, label: t("navigation.settings"), class: "manager-settings-tab" },
                ].map(({ id, icon: Icon, label, class: className }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      `${className} w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm`,
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
          <div className="flex-1 p-2 sm:p-6 overflow-auto pb-20 md:pb-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
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

              {/* Announcements Section */}
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
                <Tabs value={collectorsSubTab} onValueChange={setCollectorsSubTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="collectors">Collectors</TabsTrigger>
                    <TabsTrigger value="fieldworkers">Field Workers</TabsTrigger>
                  </TabsList>

                  <TabsContent value="collectors" className="space-y-4">

                {/* Date Filter */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      
                      {/* Date Input */}
                      <div className="flex-1 w-full">
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

                      <CreateCollectorDialog villageId={user?.villageId || ""} />
                    </div>

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
                                  {(collector as any).assignedVehicle && (
                                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                      <Package className="h-3 w-3" />
                                      Vehicle: {(collector as any).assignedVehicle}
                                    </p>
                                  )}

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
                  </TabsContent>

                  <TabsContent value="fieldworkers" className="space-y-4">
                    {/* Field Worker Management */}
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Field Workers</h3>
                      <Dialog open={showCreateFieldWorkerDialog} onOpenChange={setShowCreateFieldWorkerDialog}>
                        <DialogTrigger asChild>
                          <Button data-testid="button-add-fieldworker">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Field Worker
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Field Worker</DialogTitle>
                          </DialogHeader>
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

                    {/* Field Workers List */}
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
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Households Tab */}
            {activeTab === "households" && (
              <div className="space-y-6">
                {/* Main Approach Tabs */}
                <Tabs value={householdApproachTab} onValueChange={setHouseholdApproachTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 gap-2 mb-4">
                    <TabsTrigger value="details" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="qr-first" className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      QR Codes
                    </TabsTrigger>
                  </TabsList>

                  {/* Approach 2: QR First - Generate QRs first, field workers scan and fill data */}
                  <TabsContent value="qr-first" className="space-y-4">

                    <Tabs value={qrFirstSubTab} onValueChange={setQrFirstSubTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 gap-2">
                        <TabsTrigger value="generate-batch">Generate QR</TabsTrigger>
                        <TabsTrigger value="download-batches">Download QRs</TabsTrigger>
                      </TabsList>

                      <TabsContent value="generate-batch" className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Generate QR Codes</CardTitle>
                          </CardHeader>
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
                      </TabsContent>

                      <TabsContent value="download-batches" className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Generated QR Codes</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {batchQRCodes.length === 0 ? (
                              <p className="text-center text-muted-foreground py-4">No QR codes generated yet. Go to "Generate Batch" tab to create some.</p>
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
                                      onClick={() => {
                                        window.open(`/api/qr-codes/batch/${batchId}/pdf`, '_blank');
                                      }}
                                      data-testid={`button-download-batch-households-${batchId}`}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download PDF
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="details" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Household Details</CardTitle>
                        <CardDescription>Listing of all registered households</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
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
                                  onClick={() => setSelectedHousehold(h)}
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
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Collections Tab */}
            {activeTab === "collections" && (
              <div className="space-y-6">
                <Tabs defaultValue="collections" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="collections">{t("manager.collections")}</TabsTrigger>
                    <TabsTrigger value="attention">{t("manager.needsAttention")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="collections" className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 pt-3">
                          
                          {/* Search Input */}
                          <div className="flex-1">
                            <Input
                              className="w-full"
                              placeholder={t("manager.searchPlaceholder")}
                              value={collectionsSearchInput}
                              onChange={(e) => setCollectionsSearchInput(e.target.value)}
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
                              {t("manager.clear")}
                            </Button>
                          </div>
                        </div>


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
                        {(() => {
                          // Get target date (selected date or today)
                          const targetDate = filters.date || new Date().toISOString().split('T')[0];
                          const targetDateObj = new Date(targetDate);
                          
                          // Create a map of household ID to their collection for the target date
                          const householdCollectionMap = new Map<number, { hasCollection: boolean; collectionTime: number }>();
                          allCollections.forEach(c => {
                            const collectionDate = new Date(c.collectionDate);
                            if (collectionDate.toDateString() === targetDateObj.toDateString()) {
                              householdCollectionMap.set(c.householdId, {
                                hasCollection: true,
                                collectionTime: collectionDate.getTime()
                              });
                            }
                          });
                          
                          // Filter by search
                          const searchLower = collectionsSearchInput.toLowerCase();
                          const filteredHouseholds = households.filter(household => {
                            if (!collectionsSearchInput) return true;
                            return (
                              household.headName?.toLowerCase().includes(searchLower) ||
                              household.uid?.toLowerCase().includes(searchLower) ||
                              household.houseNumber?.toLowerCase().includes(searchLower)
                            );
                          });
                          
                          // Sort by segregation rating (ascending) for today/selected date
                          // Then by collection time (descending)
                          const sortedHouseholds = [...filteredHouseholds].sort((a, b) => {
                            const aData = householdCollectionMap.get(a.id);
                            const bData = householdCollectionMap.get(b.id);
                            
                            const aRating = aData?.hasCollection ? (allCollections.find(c => c.householdId === a.id && new Date(c.collectionDate).toDateString() === targetDateObj.toDateString())?.segregationRating || 5) : 6;
                            const bRating = bData?.hasCollection ? (allCollections.find(c => c.householdId === b.id && new Date(c.collectionDate).toDateString() === targetDateObj.toDateString())?.segregationRating || 5) : 6;

                            if (aRating !== bRating) {
                              return aRating - bRating;
                            }

                            if (aData?.hasCollection && bData?.hasCollection) {
                              return bData.collectionTime - aData.collectionTime;
                            }
                            if (aData?.hasCollection) return -1;
                            if (bData?.hasCollection) return 1;
                            return 0;
                          });
                          
                          // Apply UI-only pagination (limit 50 at a time with load more)
                          const displayedHouseholds = sortedHouseholds.slice(0, collectionsHouseholdsLimit);
                          const hasMoreHouseholds = sortedHouseholds.length > collectionsHouseholdsLimit;
                          const remainingHouseholds = sortedHouseholds.length - collectionsHouseholdsLimit;
                          
                          return (
                            <>
                              <div className="space-y-3">
                                {displayedHouseholds.map((household) => (
                                  <HouseholdCollectionCard 
                                    key={household.id} 
                                    household={household} 
                                    dateFilter={filters.date} 
                                  />
                                ))}
                              </div>

                              {/* Load More Controls for Households - UI-only pagination */}
                              <div className="mt-4 flex justify-center gap-2">
                                {hasMoreHouseholds && (
                                  <Button
                                    variant="outline"
                                    onClick={() => setCollectionsHouseholdsLimit(prev => prev + 50)}
                                    data-testid="button-load-more-households"
                                  >
                                    Load More ({remainingHouseholds > 0 ? remainingHouseholds : 0} remaining)
                                  </Button>
                                )}
                              </div>
                              
                              {/* Summary */}
                              <p className="text-sm text-muted-foreground text-center mt-2">
                                Showing {displayedHouseholds.length} of {sortedHouseholds.length} households
                              </p>
                            </>
                          );
                        })()}
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
                  <User className="w-6 h-6 mr-2" strokeWidth={3}/>
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
            )}

            {/* Material Log Tab */}
            {activeTab === "material-log" && (
              <MaterialLog />
            )}

            {/* Issues Tab */}
            {activeTab === "issues" && (
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
            )}

            {/* Reports Tab */}
            {activeTab === "reports" && (
              <div className="space-y-6">
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
                              <DialogHeader className="p-2 border-b flex flex-row items-center justify-between space-y-0 bg-white sticky top-0 z-10">
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 px-2 md:hidden bg-green-200 ">
                                    <ArrowRight className="h-4 w-4 mr-1 rotate-180" strokeWidth={3}/>
                                  </Button>
                                </DialogTrigger>
                                <div className="flex items-center gap-2">
                                  <DialogTitle className="text-lg font-bold mr-8">Vehicle Session Report</DialogTitle>
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
                                      const prevTime = new Date(vehicleCollections[i-1].collectionDate).getTime();
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
                                                const prevSessionEnd = new Date(sessions[sIdx-1][sessions[sIdx-1].length - 1].collectionDate);
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
                                                          {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Announcements Tab */}
            {activeTab === "announcements" && (
              <div className="space-y-6">

                <Card>
                  <CardHeader>
                    <CardTitle>Announcement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (announcementMessage.trim()) {
                          sendAnnouncementMutation.mutate({
                            message: announcementMessage,
                            targetAudience: announcementTarget,
                            photoFile: null,
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

      {/* Ward Form Dialog */}
      <Dialog open={showWardForm} onOpenChange={setShowWardForm}>
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
      </Dialog>
    </>
  );
}