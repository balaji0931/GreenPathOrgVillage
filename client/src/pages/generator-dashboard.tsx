import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Home,
  FileText,
  MessageSquare,
  AlertTriangle,
  Star,
  Calendar,
  Camera,
  Upload,
  LogOut,
  User,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Award,
  Bell,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  MapPin,
  BarChart3,
  PieChart,
  Settings,
  Lock,
  History,
  Search,
} from "lucide-react";

const ISSUE_CATEGORIES = [
  "Illegal Dumping",
  "Collection Delay",
  "Missed Pickup",
  "Road Cleanliness",
  "Plastic Usage",
  "Collector Behavior",
  "Infrastructure",
  "Other",
];

export default function GeneratorDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("home");
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [issueFilter, setIssueFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);

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
  const { data: collectionHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/waste-collections/household"],
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Fetch village issues
  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ["/api/issues"],
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch announcements
  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ["/api/announcements"],
    refetchInterval: 60000, // Refetch every minute
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
          console.log("Uploading photo:", newIssue.photoFile.name);
          const formData = new FormData();
          formData.append("file", newIssue.photoFile);

          const uploadResponse = await fetch("/api/upload/photo", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.text();
            console.error("Photo upload failed:", errorData);
            throw new Error(
              `Photo upload failed: ${uploadResponse.status} ${errorData}`,
            );
          }

          const uploadResult = await uploadResponse.json();
          photoUrl = uploadResult.url;
          console.log("Photo uploaded successfully:", photoUrl);
        } catch (uploadError) {
          console.error("Photo upload error:", uploadError);
          toast({
            title: "Warning",
            description: "Photo upload failed, continuing without photo",
            variant: "destructive",
          });
          photoUrl = null;
        }
      }

      // Create the issue with photo URL
      console.log("Submitting issue with data:", { ...issueData, photoUrl });

      const response = await fetch("/api/issues", {
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
        console.error("Issue creation failed:", errorData);
        throw new Error(
          `Failed to create issue: ${response.status} ${errorData}`,
        );
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log("Issue created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      setShowIssueModal(false);
      setNewIssue({
        title: "",
        category: "",
        description: "",
        photoFile: null,
      });
      toast({
        title: "Success! 🎉",
        description:
          "Your issue has been reported successfully. The manager will review it soon.",
      });
    },
    onError: (error: any) => {
      console.error("Issue creation error:", error);
      toast({
        title: "Error",
        description:
          error?.message || "Failed to report issue. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit feedback mutation
  const createFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: any) => {
      const response = await fetch("/api/feedback", {
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
        title: "Success",
        description: "Feedback submitted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: any) => {
      return apiRequest(`/api/auth/change-password`, {
        method: "POST",
        body: JSON.stringify(passwordData),
      });
    },
    onSuccess: () => {
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to change password",
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
        title: "Validation Error",
        description:
          "Please fill in all required fields (Title, Category, Description)",
        variant: "destructive",
      });
      return;
    }

    if (trimmedTitle.length < 3) {
      toast({
        title: "Title Too Short",
        description: "Title must be at least 3 characters long",
        variant: "destructive",
      });
      return;
    }

    if (trimmedDescription.length < 10) {
      toast({
        title: "Description Too Short",
        description: "Description must be at least 10 characters long",
        variant: "destructive",
      });
      return;
    }

    // Check file size if photo is provided
    if (newIssue.photoFile) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (newIssue.photoFile.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "Photo must be smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
    }

    console.log("Submitting issue:", {
      title: trimmedTitle,
      category: newIssue.category,
      description: trimmedDescription,
      hasPhoto: !!newIssue.photoFile,
    });

    createIssueMutation.mutate({
      title: trimmedTitle,
      category: newIssue.category,
      description: trimmedDescription,
    });
  };

  const handleSubmitFeedback = () => {
    if (!collectorFeedback.rating || !collectorFeedback.collectionId) {
      toast({
        title: "Error",
        description: "Please provide a rating",
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
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
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
      {/* Mobile Header */}
      <div className="bg-green-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Home className="mr-3" size={24} />
            <div>
              <h1 className="font-bold text-lg">{t('app.title')}</h1>
              <p className="text-xs opacity-90">{t('roles.generator')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
            <div className="text-right">
              <p className="text-sm font-medium">
                {user?.name?.split(" - ")[1] || user?.name}
              </p>
              <p className="text-xs opacity-90">{user?.userId}</p>
            </div>
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
            {/* Sliding Announcements */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-blue-600" />
                    {t('announcements.title')}
                  </div>
                  {announcements && announcements.length > 3 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab("announcements")}
                      className="text-xs"
                    >
                      {t('app.viewAll')}
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
                            onClick={() => setCurrentAnnouncementIndex(index)}
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
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">{t('app.noData')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('app.quickActions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => setActiveTab("reports")}
                    className="h-16 flex-col space-y-1 bg-green-50 text-green-700 hover:bg-green-100"
                    variant="outline"
                  >
                    <BarChart3 className="w-6 h-6" />
                    <span className="text-xs">{t('reports.title')}</span>
                  </Button>

                  <Button
                    onClick={() => setShowIssueModal(true)}
                    className="h-16 flex-col space-y-1 bg-red-50 text-red-700 hover:bg-red-100"
                    variant="outline"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-xs">{t('issues.reportIssue')}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('collections.title')}</CardTitle>
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
                              Rating:{" "}
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
                          {collection.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Trash2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">{t('app.noData')}</p>
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
                  Monthly Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Collections Completed</span>
                      <span>{monthlyStats.thisMonthCollections}/30</span>
                    </div>
                    <Progress
                      value={(monthlyStats.thisMonthCollections / 30) * 100}
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Segregation Quality</span>
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
                  Collection Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Collections</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {monthlyStats.totalCollections}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Rating</p>
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
                  Weekly Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <PieChart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Chart visualization</p>
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
              <h2 className="text-lg font-bold">Collection History</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search..."
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
                              {collection.status}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-xs text-gray-600">
                            <p>
                              Segregation:{" "}
                              {collection.segregationRating
                                ? `${collection.segregationRating}/5 ⭐`
                                : "Not rated"}
                            </p>
                            <p>
                              Cleanliness:{" "}
                              {collection.plasticRating
                                ? `${collection.plasticRating}/5 ⭐`
                                : "Not rated"}
                            </p>
                            {collection.observations &&
                              collection.observations.length > 0 && (
                                <p>
                                  Notes: {collection.observations.join(", ")}
                                </p>
                              )}
                            {collection.remarks && (
                              <p>Collector Notes: {collection.remarks}</p>
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
                            Feedback
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
                              Photo
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
                        View All Collections ({collectionHistory.length} total)
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
                        Show Recent Only (Last 10)
                      </Button>
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No collection history available</p>
              </div>
            )}
          </div>
        )}
        {/* ANNOUNCEMENTS TAB */}
        {activeTab === "announcements" && (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">All Announcements</h2>
            </div>

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
                          New
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                          <Bell className="w-3 h-3" />
                          <span className="font-medium">
                            Official Announcement
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
                  No Announcements
                </h3>
                <p className="text-gray-500 mb-4">
                  Check back later for important updates and news
                </p>
              </div>
            )}
          </div>
        )}
        {/* VILLAGE ISSUES TAB */}
        {activeTab === "issues" && (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Village Issues</h2>
              <Button
                size="sm"
                onClick={() => setShowIssueModal(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Report
              </Button>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {["All", "Open", "In Progress", "Resolved"].map((filter) => (
                <Button
                  key={filter}
                  variant={issueFilter === filter ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap text-xs"
                  onClick={() => setIssueFilter(filter)}
                >
                  {filter}
                </Button>
              ))}
            </div>

            {issuesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading issues...</p>
              </div>
            ) : issues && issues.length > 0 ? (
              <div className="space-y-3">
                {issues
                  .filter((issue: any) => {
                    if (issueFilter === "All") return true;
                    if (issueFilter === "Open") return issue.status === "open";
                    if (issueFilter === "In Progress")
                      return issue.status === "in_progress";
                    if (issueFilter === "Resolved")
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
                            {issue.status === "open"
                              ? "Open"
                              : issue.status === "in_progress"
                                ? "In Progress"
                                : "Resolved"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3 h-3" />
                            <span className="font-medium">
                              {issue.category}
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
                              alt="Issue photo"
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
                                Manager Response:
                              </p>
                            </div>
                            <p className="text-xs text-green-700 leading-relaxed">
                              {issue.managerReply}
                            </p>
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
                      No Issues Reported
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Help improve your village by reporting issues
                    </p>
                    <Button
                      onClick={() => setShowIssueModal(true)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Report Your First Issue
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No {issueFilter} Issues
                    </h3>
                    <p className="text-gray-500 mb-4">
                      No issues found with {issueFilter.toLowerCase()} status
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
        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="space-y-4 p-4">
            {/* User Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <User className="w-5 h-5 mr-2" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-600">Name</Label>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">User ID</Label>
                  <p className="font-medium">{user?.userId}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Village</Label>
                  <p className="font-medium">{user?.villageId}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Role</Label>
                  <Badge variant="secondary">{user?.role}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Settings className="w-5 h-5 mr-2" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>

                <Separator />

                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700"
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          {[
            { id: "home", label: t('navigation.dashboard'), icon: Home },
            { id: "reports", label: t('navigation.reports'), icon: BarChart3 },
            { id: "collections", label: t('navigation.collections'), icon: FileText },
            { id: "issues", label: t('navigation.issues'), icon: AlertTriangle },
            { id: "announcements", label: t('navigation.announcements'), icon: Bell },
            { id: "profile", label: t('navigation.profile'), icon: User },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "text-green-600 bg-green-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Issue Report Modal - Enhanced Mobile-First Design */}
      <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
        <DialogContent className="w-[96vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 mx-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold text-center text-gray-900">
              🚨 Report Village Issue
            </DialogTitle>
            <p className="text-sm text-gray-600 text-center mt-1">
              Help improve your community by reporting issues
            </p>
          </DialogHeader>

          <div className="space-y-5">
            {/* Title Field */}
            <div className="space-y-2">
              <Label
                htmlFor="title"
                className="text-sm font-semibold text-gray-800 flex items-center"
              >
                📝 Issue Title <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="title"
                value={newIssue.title}
                onChange={(e) =>
                  setNewIssue({ ...newIssue, title: e.target.value })
                }
                placeholder="e.g., Garbage not collected for 3 days"
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
                      Minimum 3 characters required
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
                🏷️ Category <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select
                value={newIssue.category}
                onValueChange={(value) =>
                  setNewIssue({ ...newIssue, category: value })
                }
              >
                <SelectTrigger className="h-12 text-base border-2 focus:border-red-400">
                  <SelectValue placeholder="Choose the most relevant category" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_CATEGORIES.map((category) => (
                    <SelectItem
                      key={category}
                      value={category}
                      className="text-base py-3"
                    >
                      {category}
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
                📄 Description <span className="text-red-500 ml-1">*</span>
              </Label>
              <Textarea
                id="description"
                value={newIssue.description}
                onChange={(e) =>
                  setNewIssue({ ...newIssue, description: e.target.value })
                }
                placeholder="Provide detailed information about the issue, location, and when it started..."
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
                      Minimum 10 characters required
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
                📸 Photo Evidence (Optional)
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
                        Tap to change photo
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        Tap to upload photo
                      </p>
                      <p className="text-xs text-gray-500">
                        Photos help resolve issues faster
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
                    <span>Submitting Issue...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Submit Issue Report</span>
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
                Cancel
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
              ⭐ Rate Collection Service
            </DialogTitle>
            <p className="text-sm text-gray-600 text-center mt-1">
              Help us improve by rating the collection service
            </p>
          </DialogHeader>

          <div className="space-y-5">
            {/* Collection Info */}
            {selectedCollection && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-800">
                  Collection Date:{" "}
                  {new Date(
                    selectedCollection.collectionDate,
                  ).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-600">
                  Status: {selectedCollection.status} | Segregation Rating:{" "}
                  {selectedCollection.segregationRating || "N/A"}/5
                </p>
              </div>
            )}

            {/* Star Rating */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-800 flex items-center">
                ⭐ Service Rating <span className="text-red-500 ml-1">*</span>
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
                    className={`p-2 transition-all duration-200 ${
                      collectorFeedback.rating >= star
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
                  {collectorFeedback.rating === 0 && "Tap a star to rate"}
                  {collectorFeedback.rating === 1 && "😞 Very Poor"}
                  {collectorFeedback.rating === 2 && "😐 Poor"}
                  {collectorFeedback.rating === 3 && "😊 Average"}
                  {collectorFeedback.rating === 4 && "😄 Good"}
                  {collectorFeedback.rating === 5 && "🤩 Excellent"}
                </p>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label
                htmlFor="remarks"
                className="text-sm font-semibold text-gray-800 flex items-center"
              >
                💬 Additional Comments (Optional)
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
                placeholder="Share your experience, suggestions for improvement, or any specific comments about the collection service..."
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
                    <span>Submitting Feedback...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5" />
                    <span>Submit Feedback</span>
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
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowPasswordModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
                className="flex-1"
              >
                {changePasswordMutation.isPending ? "Changing..." : "Change"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
