import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { translateEnum } from '../i18n/enumTranslations';
import { useTerminology } from '@/hooks/useTerminology';
import { MyBillsTab } from "@/components/my-bills-tab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/demo/DemoContext";
import { apiRequest, queryClient, fetchWithCsrf } from "@/lib/queryClient";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { TourButton } from "@/components/tours/TourButton";
import { Checkbox } from "@/components/ui/checkbox";
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from "@/hooks/usePWA";
import {
  Home,
  FileText,
  AlertTriangle,
  Star,
  Camera,
  Upload,
  LogOut,
  User,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Bell,
  Eye,
  Trash2,
  MapPin,
  BarChart3,
  PieChart,
  Settings,
  History,
  Search,
  QrCode,
  IndianRupee,
  Download,
} from "lucide-react";

const ISSUE_CATEGORIES = [
  'Illegal Dumping',
  'Collection Delay',
  'Missed Pickup',
  'Road Cleanliness',
  'Plastic Usage',
  'Collector Behavior',
  'Infrastructure',
  'Other',
];

export default function GeneratorDashboard() {
  const { user, logout } = useAuth();
  const demo = useDemo();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Fetch village settings first so they are available for useTerminology
  const { data: villageDetails } = useQuery<any>({
    queryKey: [`/api/villages/${user?.villageId}`],
    enabled: !!user?.villageId,
  });

  const { tt, label } = useTerminology((villageDetails as any)?.unitType);

  const [activeTab, setActiveTab] = useState("home");
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [issueFilter, setIssueFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [pushBannerDismissed, setPushBannerDismissed] = useState(() => {
    return localStorage.getItem('greenpath-push-banner-dismissed') === 'true';
  });

  const [newIssue, setNewIssue] = useState({
    title: "",
    category: "",
    description: "",
    photoFile: null as File | null,
  });

  const [collectorFeedback, setCollectorFeedback] = useState({
    collectionId: null as number | null,
    rating: 0,
    remarks: "",
  });

  // Fetch household collection history
  const { data: collectionHistoryRaw, isLoading: historyLoading } = useQuery<any[]>({
    queryKey: ["/api/waste-collections/household"],
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
  const collectionHistory = Array.isArray(collectionHistoryRaw) ? collectionHistoryRaw : [];

  // Fetch village issues
  const { data: issues, isLoading: issuesLoading } = useQuery<any[]>({
    queryKey: ["/api/issues"],
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch announcements
  const { data: announcements, isLoading: announcementsLoading } = useQuery<any[]>({
    queryKey: ["/api/announcements"],
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch household data for QR code display
  const { data: householdData, isLoading: householdLoading, error: householdError } = useQuery<any>({
    queryKey: ["/api/generator/household"],
    enabled: !!user?.userId,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/generator/household");
      const data = await response.json();
      return data;
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch push subscription status
  const { data: pushSubscribed, refetch: refetchPushStatus } = useQuery({
    queryKey: ["push-subscription-status"],
    queryFn: isPushSubscribed,
    enabled: !!user?.userId,
  });

  // Toggle push subscription mutation
  const togglePushMutation = useMutation({
    mutationFn: async (checked: boolean) => {
      if (checked) {
        return await subscribeToPush();
      } else {
        return await unsubscribeFromPush();
      }
    },
    onSuccess: (success) => {
      if (success) {
        refetchPushStatus();
        toast({
          title: tt('app.success'),
          description: tt('app.success'),
        });
      } else {
        toast({
          title: tt('app.error'),
          description: tt('app.error'),
          variant: "destructive",
        });
      }
    },
  });

  // Auto-slide announcements every 5 seconds
  useEffect(() => {
    if (announcements && announcements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAnnouncementIndex(
          (prev) => (prev + 1) % Math.min(announcements.length, 3),
        );
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [announcements]);

  // Submit new issue mutation
  const createIssueMutation = useMutation({
    mutationFn: async (issueData: any) => {
      let photoUrl = null;

      // Upload photo first if provided
      if (newIssue.photoFile) {
        try {
          const formData = new FormData();
          formData.append("file", newIssue.photoFile);

          const uploadResponse = await fetchWithCsrf("/api/upload/photo", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.text();
            throw new Error(
              `Photo upload failed: ${uploadResponse.status} ${errorData}`,
            );
          }

          const uploadResult = await uploadResponse.json();
          photoUrl = uploadResult.url;
        } catch (uploadError) {
          toast({
            title: tt('app.error'),
            description: tt('app.error'),
            variant: "destructive",
          });
          photoUrl = null;
        }
      }

      const response = await fetchWithCsrf("/api/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...issueData,
          photoUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Failed to create issue: ${response.status} ${errorData}`,
        );
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      setShowIssueModal(false);
      setNewIssue({
        title: "",
        category: "",
        description: "",
        photoFile: null,
      });
      toast({
        title: tt('app.success'),
        description: tt('generator.issueReportedSuccess'),
      });
    },
    onError: (_error: unknown) => {
      toast({
        title: tt('app.error'),
        description: tt('app.error'),
        variant: "destructive",
      });
    },
  });

  // Submit feedback mutation
  const createFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: any) => {
      const response = await fetchWithCsrf("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Failed to submit feedback: ${response.status} ${errorData}`,
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/waste-collections/household"],
      });
      setShowFeedbackModal(false);
      setCollectorFeedback({ collectionId: null, rating: 0, remarks: "" });
      toast({
        title: tt('app.success'),
        description: tt('app.success'),
      });
    },
    onError: (_error: unknown) => {
      toast({
        title: tt('app.error'),
        description: tt('app.error'),
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: tt('app.success'),
        description: tt('app.success'),
      });
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (_error: unknown) => {
      toast({
        title: tt('app.error'),
        description: tt('app.error'),
        variant: "destructive",
      });
    },
  });

  const handleSubmitIssue = async () => {
    // Trim whitespace for validation
    const trimmedTitle = newIssue.title.trim();
    const trimmedDescription = newIssue.description.trim();

    // Validation
    if (!trimmedTitle || !newIssue.category || !trimmedDescription) {
      toast({
        title: tt('app.error'),
        description: tt('app.error'),
        variant: "destructive",
      });
      return;
    }

    if (trimmedTitle.length < 3) {
      toast({
        title: tt('app.error'),
        description: tt('app.minimumChars'),
        variant: "destructive",
      });
      return;
    }

    if (trimmedDescription.length < 10) {
      toast({
        title: tt('app.error'),
        description: tt('app.minimum10Chars'),
        variant: "destructive",
      });
      return;
    }

    // Check file size if photo is provided
    if (newIssue.photoFile) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (newIssue.photoFile.size > maxSize) {
        toast({
          title: tt('app.error'),
          description: tt('app.error'),
          variant: "destructive",
        });
        return;
      }
    }

    createIssueMutation.mutate({
      title: trimmedTitle,
      category: newIssue.category,
      description: trimmedDescription,
    });
  };

  const handleSubmitFeedback = () => {
    if (!collectorFeedback.rating || !collectorFeedback.collectionId) {
      toast({
        title: tt('app.error'),
        description: tt('app.error'),
        variant: "destructive",
      });
      return;
    }

    createFeedbackMutation.mutate({
      collectionId: collectorFeedback.collectionId,
      rating: collectorFeedback.rating,
      remarks: collectorFeedback.remarks,
    });
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: tt('app.error'),
        description: tt('app.error'),
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: tt('app.error'),
        description: tt('app.error'),
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({ newPassword });
  };

  // Calculate stats from collection history
  const monthlyStats = {
    totalCollections: collectionHistory?.length || 0,
    avgSegregationRating: collectionHistory?.length
      ? (
        collectionHistory.reduce(
          (sum: number, item: any) => sum + (item.segregationRating || 0),
          0,
        ) / collectionHistory.length
      ).toFixed(1)
      : "0.0",
    thisMonthCollections:
      collectionHistory?.filter((item: any) => {
        const collectionDate = new Date(item.collectionDate);
        const now = new Date();
        return (
          collectionDate.getMonth() === now.getMonth() &&
          collectionDate.getFullYear() === now.getFullYear()
        );
      }).length || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {/* Dashboard Tour Component
      <DashboardTour 
        userRole="generator" 
        shouldShowWelcome={user?.isFirstLogin}
      /> */}

      {/* Mobile Header */}
      <div className="bg-green-600 text-white px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logos/logo-dark.svg" alt="GreenPath" className="w-auto h-9" />
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-20">
        {" "}
        {/* Bottom padding for nav */}
        {/* HOME TAB */}
        {activeTab === "home" && (
          <div className="space-y-4 p-4">
            {/* Push Notification Opt-in Banner */}
            {!pushBannerDismissed && !pushSubscribed && (villageDetails as any)?.proximityAlertsEnabled && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 relative">
                <button
                  onClick={() => {
                    setPushBannerDismissed(true);
                    localStorage.setItem('greenpath-push-banner-dismissed', 'true');
                  }}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
                  aria-label={tt('app.close')}
                >
                  ✕
                </button>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{tt('generator.pushNotifications')}</p>
                    <p className="text-xs text-gray-500 mt-0.5 mb-2">
                      {tt('generator.notificationsDesc')}
                    </p>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4"
                      disabled={togglePushMutation.isPending}
                      onClick={() => {
                        togglePushMutation.mutate(true, {
                          onSuccess: (success) => {
                            if (success) {
                              setPushBannerDismissed(true);
                              localStorage.setItem('greenpath-push-banner-dismissed', 'true');
                            }
                          }
                        });
                      }}
                    >
                      {togglePushMutation.isPending ? tt('app.loading') : '🔔 ' + tt('generator.enableNotifications')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {/* Sliding Announcements */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-blue-600" />
                    {tt('announcements.title')}
                  </div>
                  {announcements && announcements.length > 3 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab("announcements")}
                      className="text-xs"
                    >
                      {tt('app.viewAll')}
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
                              {announcement.photoUrl && (
                                <div className="mt-2">
                                  <img
                                    src={announcement.photoUrl}
                                    alt={tt('announcements.title')}
                                    className="max-w-full h-24 object-cover rounded border"
                                  />
                                </div>
                              )}
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
                            onClick={() => setCurrentAnnouncementIndex(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${index ===
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
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">{tt('app.noData')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{tt('app.quickActions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {/* <Button
                    onClick={() => setActiveTab("reports")}
                    className="h-16 flex-col space-y-1 bg-green-50 text-green-700 hover:bg-green-100"
                    variant="outline"
                  >
                    <BarChart3 className="w-6 h-6" />
                    <span className="text-xs">{tt('reports.title')}</span>
                  </Button> */}

                  <Button
                    onClick={() => setShowIssueModal(true)}
                    className="h-16 flex-col space-y-1 bg-red-50 text-red-700 hover:bg-red-100"
                    variant="outline"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-xs">{tt('issues.reportIssue')}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="generator-collection-stats">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{tt('collections.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                  </div>
                ) : collectionHistory && collectionHistory.length > 0 ? (
                  <div className="space-y-3">
                    {collectionHistory.slice(0, 3).map((collection: any) => (
                      <div
                        key={collection.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${collection.status === "collected" ? "bg-green-500" : "bg-red-500"}`}
                          ></div>
                          <div>
                            <p className="text-sm font-medium">
                              {new Date(
                                collection.collectionDate,
                              ).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-600">
                              {tt('app.rating')}:{" "}
                              {collection.segregationRating
                                ? `${collection.segregationRating}/5`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            collection.status === "collected"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {translateEnum('collectionStatus', collection.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Trash2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">{tt('app.noData')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <div className="space-y-4 p-4">
            {/* Monthly Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                  {tt('generator.collectionHistory')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>{tt('generator.collectionHistory')}</span>
                      <span>{monthlyStats.thisMonthCollections}/30</span>
                    </div>
                    <Progress
                      value={(monthlyStats.thisMonthCollections / 30) * 100}
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>{tt('generator.segregationRating')}</span>
                      <span>{monthlyStats.avgSegregationRating}/5.0</span>
                    </div>
                    <Progress
                      value={
                        (parseFloat(monthlyStats.avgSegregationRating) / 5) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Collection Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                  {tt('generator.collectionHistory')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">{tt('generator.collectionHistory')}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {monthlyStats.totalCollections}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{tt('generator.segregationRating')}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {monthlyStats.avgSegregationRating}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Chart Placeholder */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                  {tt('generator.collectionHistory')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <PieChart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{tt('app.noData')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {/* COLLECTIONS HISTORY TAB */}
        {activeTab === "collections" && (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{tt('generator.collectionHistory')}</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder={tt("app.search") + "..."}
                  className="pl-9 h-8 w-32"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {historyLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              </div>
            ) : collectionHistory && collectionHistory.length > 0 ? (
              <div className="space-y-3">
                {collectionHistory
                  .filter((collection: any) => {
                    if (!searchQuery) return true;
                    const searchTerm = searchQuery.toLowerCase();
                    const collectionDate = new Date(collection.collectionDate)
                      .toLocaleDateString()
                      .toLowerCase();
                    const status = collection.status.toLowerCase();
                    const remarks = (collection.remarks || "").toLowerCase();
                    return (
                      collectionDate.includes(searchTerm) ||
                      status.includes(searchTerm) ||
                      remarks.includes(searchTerm)
                    );
                  })
                  .slice(0, showAllCollections ? undefined : 10)
                  .map((collection: any) => (
                    <Card key={collection.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <div
                              className={`w-3 h-3 rounded-full ${collection.status === "collected" ? "bg-green-500" : "bg-red-500"}`}
                            ></div>
                            <p className="font-medium text-sm">
                              {new Date(
                                collection.collectionDate,
                              ).toLocaleDateString()}
                            </p>
                            <Badge
                              variant={
                                collection.status === "collected"
                                  ? "default"
                                  : "destructive"
                              }
                              className="text-xs"
                            >
                              {translateEnum('collectionStatus', collection.status)}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-xs text-gray-600">
                            <p>
                              {tt('generator.segregationRating')}:{" "}
                              {collection.segregationRating
                                ? `${collection.segregationRating}/5 ⭐`
                                : tt('app.noData')}
                            </p>
                            {collection.remarks && (
                              <p>{tt('generator.collectorRemarks')}: {collection.remarks}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2 ml-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCollection(collection);
                              setCollectorFeedback({
                                collectionId: collection.id,
                                rating: 0,
                                remarks: "",
                              });
                              setShowFeedbackModal(true);
                            }}
                            className="text-xs h-7"
                          >
                            <Star className="w-3 h-3 mr-1" />
                            {tt('feedback.title')}
                          </Button>

                          {collection.photoUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                window.open(collection.photoUrl, "_blank")
                              }
                              className="text-xs h-7"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              {tt('generator.collectionPhoto')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}

                {/* View All Button */}
                {!showAllCollections &&
                  collectionHistory &&
                  collectionHistory.length > 10 && (
                    <div className="text-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllCollections(true)}
                        className="w-full"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {tt('app.viewAll')} ({collectionHistory.length} {tt('app.total')})
                      </Button>
                    </div>
                  )}

                {/* Show Less Button */}
                {showAllCollections &&
                  collectionHistory &&
                  collectionHistory.length > 10 && (
                    <div className="text-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllCollections(false)}
                        className="w-full"
                      >
                        <History className="w-4 h-4 mr-2" />
                        {tt('generator.viewMore')}
                      </Button>
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{tt('generator.noCollectionsYet')}</p>
              </div>
            )}
          </div>
        )}
        {/* ANNOUNCEMENTS TAB */}
        {activeTab === "announcements" && (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{tt('announcements.title')}</h2>
            </div>

            {announcementsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">
                  {tt('app.loading')}...
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
                          {tt('app.new')}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                          <Bell className="w-3 h-3" />
                          <span className="font-medium">
                            {tt('announcements.title')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3" />
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
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tt('generator.noAnnouncements')}
                </h3>
                <p className="text-gray-500 mb-4">
                  {tt('generator.checkLater')}
                </p>
              </div>
            )}
          </div>
        )}
        {/* VILLAGE ISSUES TAB */}
        {activeTab === "issues" && (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{tt('navigation.issues')}</h2>
              <Button
                size="sm"
                onClick={() => setShowIssueModal(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                {tt('generator.reportIssue')}
              </Button>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {[{ key: "All", label: tt("app.all") }, { key: "Open", label: tt("issues.open") }, { key: tt('issues.inProgress'), label: tt("issues.inProgress") }, { key: tt('issues.resolved'), label: tt("issues.resolved") }].map((filter) => (
                <Button
                  key={filter.key}
                  variant={issueFilter === filter.key ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap text-xs"
                  onClick={() => setIssueFilter(filter.key)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {issuesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">{tt('app.loading')}...</p>
              </div>
            ) : issues && issues.length > 0 ? (
              <div className="space-y-3">
                {issues
                  .filter((issue: any) => {
                    if (issueFilter === "All") return true;
                    if (issueFilter === "Open") return issue.status === "open";
                    if (issueFilter === tt('issues.inProgress'))
                      return issue.status === "in_progress";
                    if (issueFilter === tt('issues.resolved'))
                      return issue.status === "resolved";
                    return true;
                  })
                  .map((issue: any) => (
                    <Card
                      key={issue.id}
                      className="p-4 shadow-sm border-l-4 border-l-red-400"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-2">
                            <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">
                              {issue.title}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-3">
                              {issue.description}
                            </p>
                          </div>
                          <Badge
                            variant={
                              issue.status === "open"
                                ? "destructive"
                                : issue.status === "in_progress"
                                  ? "secondary"
                                  : "default"
                            }
                            className="text-xs whitespace-nowrap"
                          >
                            {issue.status === 'open' ? tt('issues.open') : issue.status === 'in_progress' ? tt('issues.inProgress') : tt('issues.resolved')}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3 h-3" />
                            <span className="font-medium">
                              {translateEnum('issueCategory', issue.category)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(issue.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {issue.photoUrl && (
                          <div className="mt-2">
                            <img
                              src={issue.photoUrl}
                              alt={tt('generator.issuePhoto')}
                              className="w-full h-32 object-cover rounded-lg"
                              onClick={() =>
                                window.open(issue.photoUrl, "_blank")
                              }
                            />
                          </div>
                        )}

                        {issue.managerReply && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                            <div className="flex items-center space-x-2 mb-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <p className="text-xs font-semibold text-green-800">
                                {tt('generator.managerResponse')}:
                              </p>
                            </div>
                            <p className="text-xs text-green-700 leading-relaxed">
                              {issue.managerReply}
                            </p>
                            {/* Show manager's proof photo if available */}
                            {issue.managerProofPhotoUrl && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-green-800 mb-1">{tt('generator.managerResponseProof')}:</p>
                                <img
                                  src={issue.managerProofPhotoUrl}
                                  alt={tt('generator.managerResponseProof')}
                                  className="w-16 h-16 object-cover rounded cursor-pointer"
                                  onClick={() => window.open(issue.managerProofPhotoUrl, "_blank")}
                                />
                              </div>
                            )}
                            {issue.updatedAt && (
                              <p className="text-xs text-green-600 mt-1">
                                Updated:{" "}
                                {new Date(issue.updatedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                {issueFilter === "All" ? (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {tt('generator.noIssuesYet')}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {tt('generator.noIssuesYetDesc')}
                    </p>
                    <Button
                      onClick={() => setShowIssueModal(true)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {tt('generator.reportIssue')}
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {tt('generator.noIssuesYet')}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {tt('generator.noIssuesYetDesc')}
                    </p>
                    <Button
                      onClick={() => setIssueFilter("All")}
                      variant="outline"
                    >
                      View All Issues
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {/* QR CODE TAB */}
        {activeTab === "qr-code" && (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{tt('generator.yourQrCode')}</h2>
            </div>

            {householdLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tt('app.loading')}
                </h3>
                <p className="text-gray-500">
                  {tt('app.loading')}
                </p>
              </div>
            ) : householdError ? (
              <div className="text-center py-12">
                <XCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tt('app.error')}
                </h3>
                <p className="text-gray-500 mb-4">
                  {tt('app.error')}
                </p>
                <Button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/generator/household"] })}
                  variant="outline"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            ) : householdData ? (
              <div className="space-y-4">
                {/* QR Code Display */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <QrCode className="w-5 h-5 mr-2 text-green-600" />
                      {tt('generator.yourQrCode')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                        <img
                          src={demo?.isDemo 
                            ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=DEMO-GEN-${householdData.uid}`
                            : `/api/qr-codes/${householdData.uid}/image`}
                          alt={tt('generator.yourQrCode')}
                          className="w-48 h-48 mx-auto"
                        />
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={async () => {
                          try {
                            const html2canvas = (await import('html2canvas')).default;
                            const { jsPDF } = await import('jspdf');

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
                              <img 
                                src="/logos/png/logo-full-1024x256.png"
                                style="width:40mm; margin-bottom:-2mm;"
                              />
                              <div style="font-size:10pt; color:#555; margin-bottom:4mm;">
                                GreenPath
                              </div>
                              <div style="width:45mm; height:45mm; display:flex; align-items:center; justify-content:center;">
                                <img 
                                  src="${demo?.isDemo 
                                    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=DEMO-GEN-${householdData.uid}`
                                    : `/api/qr-codes/${householdData.uid}/image`}"
                                  style="width:100%; height:100%; object-fit:contain;"
                                />
                              </div>
                              <div style="font-size:11pt; font-weight:400; margin-bottom:2mm;">
                                ${label.household} UID: GEN-${householdData.uid}
                              </div>
                              <div style="font-size:11pt; margin-bottom:3mm;">
                                ${label.headName}: ${householdData.headName}
                              </div>
                              <div style="font-size:9pt; color:#555;">
                                Login &amp; manage at:
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
                            pdf.save(`QR_Card_${householdData.uid}.pdf`);

                            document.body.removeChild(cardElement);

                            toast({ title: tt('app.success'), description: tt('generator.downloadQrCode') });
                          } catch {
                            toast({ title: 'Error', description: tt('app.error'), variant: 'destructive' });
                          }
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {tt('generator.downloadQrCode')}
                      </Button>

                      <div className="space-y-2 text-center">
                        <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                          <p className="text-sm text-green-800 font-medium">
                            📱 {tt('generator.qrCodeDesc')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Household Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <Home className="w-5 h-5 mr-2 text-blue-600" />
                      {tt('generator.householdInfo')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Label className="text-xs text-gray-600">{tt('generator.headOfHousehold')}</Label>
                        <p className="font-medium text-gray-900">{householdData.headName}</p>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Label className="text-xs text-gray-600">{tt('generator.uid')}</Label>
                        <p className="font-medium text-gray-900">{householdData.uid}</p>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Label className="text-xs text-gray-600">{tt('generator.houseNumber')}</Label>
                        <p className="font-medium text-gray-900">{householdData.houseNumber || tt('app.noData')}</p>
                      </div>

                      {householdData.phone && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <Label className="text-xs text-gray-600">{tt('generator.phone')}</Label>
                          <p className="font-medium text-gray-900">{householdData.phone}</p>
                        </div>
                      )}

                      {householdData.address && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <Label className="text-xs text-gray-600">{tt('generator.address')}</Label>
                          <p className="font-medium text-gray-900">{householdData.address}</p>
                        </div>
                      )}

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Label className="text-xs text-gray-600">{tt('generator.householdInfo')}</Label>
                        <p className="font-medium text-gray-900">{householdData.familySize || 1} {tt('generator.members')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Usage Instructions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg">
                      <Bell className="w-5 h-5 mr-2 text-orange-600" />
                      {tt('generator.qrCodeDesc')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                        <p className="text-gray-700">{tt('generator.qrCodeDesc')}</p>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                        <p className="text-gray-700">{tt('generator.qrCodeDesc')}</p>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                        <p className="text-gray-700">{tt('generator.segregationRating')}</p>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                        <p className="text-gray-700">{tt('generator.collectionHistory')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12">
                <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tt('app.noData')}
                </h3>
                <p className="text-gray-500">
                  {tt('generator.contactManager')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* BILLS TAB */}
        {activeTab === "bills" && (
          <div className="p-4 pb-24">
            <MyBillsTab />
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="space-y-4 p-4">
            {/* User Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <User className="w-5 h-5 mr-2" />
                  {tt('generator.profile')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-600">{tt('generator.profile')}</Label>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">{tt('auth.userId')}</Label>
                  <p className="font-medium">{user?.userId}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">{tt('navigation.villages')}</Label>
                  <p className="font-medium">{user?.villageId}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">{tt('generator.profile')}</Label>
                  <Badge variant="secondary">{user?.role}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Settings className="w-5 h-5 mr-2" />
                  {tt('navigation.settings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <Settings className="mr-3" size={20} />
                  {tt('auth.changePassword')}
                </Button>

                {(villageDetails as any)?.proximityAlertsEnabled && (
                  <>
                    <Separator />
                    <div className="flex items-center space-x-3 p-1">
                      <Checkbox
                        id="push-notifications"
                        checked={pushSubscribed}
                        onCheckedChange={(checked) => togglePushMutation.mutate(!!checked)}
                        disabled={togglePushMutation.isPending}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor="push-notifications"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                        >
                          <Bell className="w-4 h-4 mr-2 text-blue-600" />
                          Collection Vehicle Alerts
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Get notified when the waste collection vehicle is near your home.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700"
                  onClick={() => logout()}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {tt('auth.logout')}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-2 py-2 rounded-lg">
        <div className="flex justify-around">
          {[
            { id: "home", icon: Home, class: "generator-home-tab", label: tt('generator.home') },
            (villageDetails as any)?.paymentsEnabled && { id: "bills", icon: IndianRupee, class: "generator-bills-tab", label: tt('generator.bills') },
            // { id: "reports", icon: BarChart3, class: "generator-collection-stats", label: "Reports" },
            { id: "collections", icon: FileText, class: "generator-collections-tab", label: tt('generator.collections') },
            { id: "qr-code", icon: QrCode, class: "generator-qr-tab", label: tt('generator.qrCode') },
            { id: "issues", icon: AlertTriangle, class: "generator-issues-tab", label: tt('generator.issues') },
            { id: "profile", icon: User, class: "generator-profile-tab", label: tt('generator.profile') },
          ].filter(Boolean).map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${tab.class} flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${activeTab === tab.id
                ? "text-green-600 bg-green-50"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <tab.icon className="w-6 h-6 mb-1" strokeWidth={2.5} />
            </button>
          ))}
        </div>
      </div>

      {/* Issue Report Modal - Enhanced Mobile-First Design */}
      <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
        <DialogContent className="w-[96vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 mx-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold text-center text-gray-900">
              🚨 {tt('generator.reportIssue')}
            </DialogTitle>
            <p className="text-sm text-gray-600 text-center mt-1">
              {tt('generator.noIssuesYetDesc')}
            </p>
          </DialogHeader>

          <div className="space-y-5">
            {/* Title Field */}
            <div className="space-y-2">
              <Label
                htmlFor="title"
                className="text-sm font-semibold text-gray-800 flex items-center"
              >
                📝 {tt('generator.issueTitle')} <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="title"
                value={newIssue.title}
                onChange={(e) =>
                  setNewIssue({ ...newIssue, title: e.target.value })
                }
                placeholder={tt("generator.issueTitlePlaceholder")}
                className="h-12 text-base border-2 focus:border-red-400"
                maxLength={100}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {newIssue.title.length}/100 characters
                </p>
                {newIssue.title.trim().length < 3 &&
                  newIssue.title.length > 0 && (
                    <p className="text-xs text-red-500">
                      {tt('app.minimumChars')}
                    </p>
                  )}
              </div>
            </div>

            {/* Category Field */}
            <div className="space-y-2">
              <Label
                htmlFor="category"
                className="text-sm font-semibold text-gray-800 flex items-center"
              >
                🏷️ {tt('generator.category')} <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select
                value={newIssue.category}
                onValueChange={(value) =>
                  setNewIssue({ ...newIssue, category: value })
                }
              >
                <SelectTrigger className="h-12 text-base border-2 focus:border-red-400">
                  <SelectValue placeholder={tt("generator.category")} />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_CATEGORIES.map((category) => (
                    <SelectItem
                      key={category}
                      value={category}
                      className="text-base py-3"
                    >
                      {translateEnum('issueCategory', category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-sm font-semibold text-gray-800 flex items-center"
              >
                📄 {tt('generator.description')} <span className="text-red-500 ml-1">*</span>
              </Label>
              <Textarea
                id="description"
                value={newIssue.description}
                onChange={(e) =>
                  setNewIssue({ ...newIssue, description: e.target.value })
                }
                placeholder={tt("generator.descriptionPlaceholder")}
                rows={5}
                className="text-base border-2 focus:border-red-400 resize-none"
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {newIssue.description.length}/500 characters
                </p>
                {newIssue.description.trim().length < 10 &&
                  newIssue.description.length > 0 && (
                    <p className="text-xs text-red-500">
                      {tt('app.minimum10Chars')}
                    </p>
                  )}
              </div>
            </div>

            {/* Photo Upload Field */}
            <div className="space-y-2">
              <Label
                htmlFor="photo"
                className="text-sm font-semibold text-gray-800 flex items-center"
              >
                📸 {tt('generator.photoEvidence')} ({tt('app.optional')})
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Input
                  id="photo"
                  type="file"
                  accept="image/*,image/heic,image/heif"
                  onChange={(e) =>
                    setNewIssue({
                      ...newIssue,
                      photoFile: e.target.files?.[0] || null,
                    })
                  }
                  className="hidden"
                />
                <label
                  htmlFor="photo"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  {newIssue.photoFile ? (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Camera className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="text-sm font-medium text-green-700">
                        📷 {newIssue.photoFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tt('app.tapToChange')}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        {tt('app.tapToUpload')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tt('app.photosHelp')}
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-3 pt-4 border-t">
              <Button
                onClick={handleSubmitIssue}
                disabled={
                  createIssueMutation.isPending ||
                  !newIssue.title.trim() ||
                  !newIssue.category ||
                  !newIssue.description.trim() ||
                  newIssue.title.trim().length < 3 ||
                  newIssue.description.trim().length < 10
                }
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-base font-semibold"
              >
                {createIssueMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{tt('generator.submittingIssue')}...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{tt('generator.submitIssue')}</span>
                  </div>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowIssueModal(false);
                  setNewIssue({
                    title: "",
                    category: "",
                    description: "",
                    photoFile: null,
                  });
                }}
                className="w-full h-12 border-2 text-base font-medium"
                disabled={createIssueMutation.isPending}
              >
                {tt('app.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal - Enhanced Mobile-First Design */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="w-[96vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 mx-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold text-center text-gray-900">
              ⭐ {tt('feedback.title')}
            </DialogTitle>
            <p className="text-sm text-gray-600 text-center mt-1">
              {tt('feedback.title')}
            </p>
          </DialogHeader>

          <div className="space-y-5">
            {/* Collection Info */}
            {selectedCollection && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-800">
                  {tt('generator.collectionDate')}:{" "}
                  {new Date(
                    selectedCollection.collectionDate,
                  ).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-600">
                  {tt('generator.status')}: {translateEnum('collectionStatus', selectedCollection.status)} | {tt('generator.segregationRating')}:{" "}
                  {selectedCollection.segregationRating || "N/A"}/5
                </p>
              </div>
            )}

            {/* Star Rating */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-800 flex items-center">
                ⭐ {tt('app.rating')} <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="flex justify-center space-x-2 mt-2 p-4 bg-gray-50 rounded-lg">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() =>
                      setCollectorFeedback({
                        ...collectorFeedback,
                        rating: star,
                      })
                    }
                    className={`p-2 transition-all duration-200 ${collectorFeedback.rating >= star
                      ? "text-yellow-500 scale-110"
                      : "text-gray-300 hover:text-yellow-400"
                      }`}
                  >
                    <Star className="w-8 h-8 fill-current" />
                  </button>
                ))}
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {collectorFeedback.rating === 0 && tt('generator.tapStarToRate')}
                  {collectorFeedback.rating === 1 && '😞 ' + tt('collections.veryPoor')}
                  {collectorFeedback.rating === 2 && '😐 ' + tt('collections.poor')}
                  {collectorFeedback.rating === 3 && '😊 ' + tt('collections.average')}
                  {collectorFeedback.rating === 4 && '😄 ' + tt('collections.good')}
                  {collectorFeedback.rating === 5 && '🤩 ' + tt('collections.excellent')}
                </p>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label
                htmlFor="remarks"
                className="text-sm font-semibold text-gray-800 flex items-center"
              >
                💬 {tt('collector.remarks')} ({tt('app.optional')})
              </Label>
              <Textarea
                id="remarks"
                value={collectorFeedback.remarks}
                onChange={(e) =>
                  setCollectorFeedback({
                    ...collectorFeedback,
                    remarks: e.target.value,
                  })
                }
                placeholder={tt("collector.typeComments")}
                rows={4}
                className="text-base border-2 focus:border-blue-400 resize-none"
                maxLength={300}
              />
              <p className="text-xs text-gray-500">
                {collectorFeedback.remarks.length}/300 characters
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-3 pt-4 border-t">
              <Button
                onClick={handleSubmitFeedback}
                disabled={
                  createFeedbackMutation.isPending ||
                  collectorFeedback.rating === 0
                }
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base font-semibold"
              >
                {createFeedbackMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{tt('app.submitting')}...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5" />
                    <span>{tt('app.submit')}</span>
                  </div>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowFeedbackModal(false);
                  setCollectorFeedback({
                    collectionId: null,
                    rating: 0,
                    remarks: "",
                  });
                }}
                className="w-full h-12 border-2 text-base font-medium"
                disabled={createFeedbackMutation.isPending}
              >
                {tt('app.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tt('app.changePassword')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{tt('app.newPassword')}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={tt("app.newPassword")}
              />
            </div>
            <div>
              <Label>{tt('app.confirmPassword')}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={tt("app.confirmPassword")}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending || !newPassword || !confirmPassword}
            >
              {changePasswordMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  {tt('app.changing')}...
                </>
              ) : (
                tt('app.changePassword')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}