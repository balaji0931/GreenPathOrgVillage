import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Leaf,
  Users,
  AlertTriangle,
  TrendingUp,
  Plus,
  Megaphone,
  BarChart3,
  LogOut,
  Settings,
  Copy,
  Download,
  Eye,
  Trash2,
  RotateCcw,
  Filter,
  PieChart,
  LineChart,
  Building2,
  UserPlus,
  X,
  Home,
  MessageSquare,
  User,
  MapPin,
  Calendar,
  Activity,
  FileText,
  Bell,
  Star,
  Award,
  Package,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
} from "recharts";
import { cn } from "@/lib/utils";

export default function ModeratorDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedVillage, setSelectedVillage] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);

  const [announcement, setAnnouncement] = useState({
    message: "",
    targetAudience: "all",
    villageId: "",
  });

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [reportFilters, setReportFilters] = useState({
    village: "all",
    role: "all",
    startDate: "",
    endDate: "",
  });

  // Fetch moderator stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats/moderator"],
  });

  // Fetch moderator villages
  const { data: villages, isLoading: villagesLoading } = useQuery({
    queryKey: ["/api/moderator/villages"],
  });

  // Fetch moderator reports
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ["/api/moderator/reports", reportFilters],
    enabled: activeTab === "reports",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reportFilters.role !== "all") params.set("role", reportFilters.role);
      if (reportFilters.startDate) params.set("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.set("endDate", reportFilters.endDate);

      const response = await apiRequest(
        "GET",
        `/api/moderator/reports?${params.toString()}`,
      );
      return response.json();
    },
  });

  // Fetch moderator system analytics
  const { data: systemAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/moderator/analytics/system"],
    enabled: activeTab === "reports",
  });

  // Fetch moderator daily analytics
  const { data: dailyAnalytics, isLoading: dailyLoading } = useQuery({
    queryKey: [
      "/api/moderator/analytics/daily",
      reportFilters.startDate || new Date().toISOString().split("T")[0],
    ],
    enabled: activeTab === "reports",
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set(
        "date",
        reportFilters.startDate || new Date().toISOString().split("T")[0],
      );

      const response = await apiRequest(
        "GET",
        `/api/moderator/analytics/daily?${params.toString()}`,
      );
      return response.json();
    },
  });

  // Village details query
  const { data: villageDetails } = useQuery({
    queryKey: ["/api/moderator/village", selectedVillage, "details"],
    enabled: !!selectedVillage,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/moderator/village/${selectedVillage}/details`);
      return response.json();
    },
  });

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: typeof announcement) => {
      const response = await apiRequest("POST", "/api/moderator/announcements", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Announcement sent successfully",
      });
      setAnnouncement({ message: "", targetAudience: "all", villageId: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send announcement",
        variant: "destructive",
      });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const response = await apiRequest("PUT", "/api/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setProfileData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  const navigationItems = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "villages", label: "Villages", icon: Building2 },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "profile", label: "Profile", icon: User },
  ];

  const renderOverview = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Moderator Dashboard</h2>
        <p className="text-muted-foreground">
          Manage your assigned villages and waste management operations
        </p>
      </div>

      {/* Stats Cards - Mobile Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
              Assigned Villages
            </CardTitle>
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">
              {stats?.totalVillages || 0}
            </div>
            <p className="text-xs text-muted-foreground">Under management</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
              Total Households
            </CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">
              {stats?.totalHouseholds || 0}
            </div>
            <p className="text-xs text-muted-foreground">Registered households</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
              Open Issues
            </CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">
              {stats?.totalOpenIssues || 0}
            </div>
            <p className="text-xs text-muted-foreground">Pending resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
              Today's Collections
            </CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">
              {stats?.totalCollectionsToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">Waste collections</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Mobile Responsive */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <Button
              onClick={() => setActiveTab("villages")}
              variant="outline"
              className="h-16 sm:h-24 flex flex-col text-xs sm:text-sm"
            >
              <Building2 className="h-4 w-4 sm:h-8 sm:w-8 mb-1 sm:mb-2" />
              <span>Manage Villages</span>
            </Button>
            <Button
              onClick={() => setActiveTab("announcements")}
              variant="outline"
              className="h-16 sm:h-24 flex flex-col text-xs sm:text-sm"
            >
              <Megaphone className="h-4 w-4 sm:h-8 sm:w-8 mb-1 sm:mb-2" />
              <span>Send Message</span>
            </Button>
            <Button
              onClick={() => setActiveTab("reports")}
              variant="outline"
              className="h-16 sm:h-24 flex flex-col text-xs sm:text-sm"
            >
              <BarChart3 className="h-4 w-4 sm:h-8 sm:w-8 mb-1 sm:mb-2" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Villages operational</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalVillages || 0} villages under management
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {stats?.totalCollectionsToday || 0} collections today
                </p>
                <p className="text-xs text-muted-foreground">
                  Waste management active
                </p>
              </div>
            </div>
            {stats?.totalOpenIssues > 0 && (
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {stats.totalOpenIssues} open issues
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Require attention
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderVillages = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Village Management</h2>
          <p className="text-muted-foreground">Manage your assigned villages</p>
        </div>
      </div>

      {/* Villages Table */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Assigned Villages</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {villagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm">Loading villages...</span>
            </div>
          ) : villages && villages.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Village ID</TableHead>
                    <TableHead className="text-xs sm:text-sm">Name</TableHead>
                    <TableHead className="text-xs sm:text-sm">Assigned Date</TableHead>
                    <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {villages.map((village: any) => (
                    <TableRow key={village.villageId}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        {village.villageId}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {village.name}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {new Date(village.assignedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedVillage(village.villageId)}
                          className="p-1 sm:p-2"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No villages assigned yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Village Details Modal */}
      {selectedVillage && villageDetails && (
        <Dialog
          open={!!selectedVillage}
          onOpenChange={() => setSelectedVillage("")}
        >
          <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Village Details - {villageDetails.village?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-lg sm:text-2xl font-bold">
                      {villageDetails.stats?.totalHouseholds || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Households
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-lg sm:text-2xl font-bold">
                      {villageDetails.stats?.totalCollectors || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Collectors
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-lg sm:text-2xl font-bold">
                      {villageDetails.stats?.openIssues || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Open Issues
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-lg sm:text-2xl font-bold">
                      {villageDetails.stats?.collectionsToday || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Collections Today
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  const renderReports = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Reports & Analytics</h2>
        <p className="text-muted-foreground">
          Performance insights for your assigned villages
        </p>
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
                  Total Collections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">
                  {systemAnalytics?.totalCollections || 0}
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  All time collections
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Average Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-900">
                  {systemAnalytics?.avgRating?.toFixed(1) || "0.0"}
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Overall rating
                </p>
              </CardContent>
            </Card>
          </div>

          {reportLoading && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm">Loading reports...</span>
                </div>
              </CardContent>
            </Card>
          )}
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
                    value={
                      reportFilters.startDate ||
                      new Date().toISOString().split("T")[0]
                    }
                    onChange={(e) =>
                      setReportFilters({
                        ...reportFilters,
                        startDate: e.target.value,
                      })
                    }
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setReportFilters({
                      ...reportFilters,
                      startDate: new Date().toISOString().split("T")[0],
                    })
                  }
                >
                  Today
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Daily KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-lg sm:text-2xl font-bold">
                  {dailyAnalytics?.totalHouses || 0}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Total Houses
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-lg sm:text-2xl font-bold">
                  {dailyAnalytics?.collected || 0}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Collected
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-lg sm:text-2xl font-bold">
                  {dailyAnalytics?.remaining || 0}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Remaining
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-lg sm:text-2xl font-bold">
                  {dailyAnalytics?.avgSegregationRating?.toFixed(1) || "0.0"}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Avg Rating
                </div>
              </CardContent>
            </Card>
          </div>

          {dailyLoading && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm">Loading daily analytics...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderAnnouncements = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Announcements</h2>
        <p className="text-muted-foreground">
          Send messages to users in your assigned villages
        </p>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">
            Send Announcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
          <div>
            <Label htmlFor="village">Select Village</Label>
            <Select
              value={announcement.villageId}
              onValueChange={(value) =>
                setAnnouncement({ ...announcement, villageId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Village" />
              </SelectTrigger>
              <SelectContent>
                {villages?.map((village: any) => (
                  <SelectItem key={village.villageId} value={village.villageId}>
                    {village.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={announcement.message}
              onChange={(e) =>
                setAnnouncement({ ...announcement, message: e.target.value })
              }
              placeholder="Type your announcement..."
              rows={4}
              className="text-sm sm:text-base"
            />
          </div>
          <div>
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Select
              value={announcement.targetAudience}
              onValueChange={(value) =>
                setAnnouncement({ ...announcement, targetAudience: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="managers">Managers Only</SelectItem>
                <SelectItem value="generators">Generators Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => createAnnouncementMutation.mutate(announcement)}
            disabled={createAnnouncementMutation.isPending || !announcement.villageId || !announcement.message}
            className="w-full"
          >
            {createAnnouncementMutation.isPending
              ? "Sending..."
              : "Send Announcement"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Profile Settings</h2>
        <p className="text-muted-foreground">Manage your moderator account</p>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
          <div>
            <Label htmlFor="profileName">Name</Label>
            <Input
              id="profileName"
              value={profileData.name}
              onChange={(e) =>
                setProfileData({ ...profileData, name: e.target.value })
              }
              placeholder="Enter your name"
              className="text-sm sm:text-base"
            />
          </div>
          <div>
            <Label htmlFor="userId">User ID (Cannot be changed)</Label>
            <Input
              id="userId"
              value={user?.userId || ""}
              disabled
              className="bg-muted text-sm sm:text-base"
            />
          </div>
          <div className="border-t pt-4">
            <h3 className="text-base sm:text-lg font-medium mb-4">
              Change Password
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={profileData.currentPassword}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      currentPassword: e.target.value,
                    })
                  }
                  placeholder="Enter current password"
                  className="text-sm sm:text-base"
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={profileData.newPassword}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder="Enter new password"
                  className="text-sm sm:text-base"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={profileData.confirmPassword}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Confirm new password"
                  className="text-sm sm:text-base"
                />
              </div>
            </div>
          </div>
          <Button
            onClick={() => {
              if (
                profileData.newPassword &&
                profileData.newPassword !== profileData.confirmPassword
              ) {
                toast({
                  title: "Error",
                  description: "Passwords do not match",
                  variant: "destructive",
                });
                return;
              }
              updateProfileMutation.mutate(profileData);
            }}
            disabled={updateProfileMutation.isPending}
            className="w-full"
          >
            {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverview();
      case "villages":
        return renderVillages();
      case "reports":
        return renderReports();
      case "announcements":
        return renderAnnouncements();
      case "profile":
        return renderProfile();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-white border-b px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Leaf className="h-6 w-6 text-green-600" />
            <div>
              <h1 className="text-lg font-bold">GreenPath</h1>
              <p className="text-xs text-muted-foreground">Moderator Panel</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setActiveTab("profile")}
                  variant="ghost"
                  size="sm"
                  className="p-2"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button onClick={logout} variant="ghost" size="sm" className="p-2">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-64 bg-white border-r flex-col">
              {/* Header */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Leaf className="h-8 w-8 text-green-600" />
                    <div>
                      <h1 className="text-xl font-bold">GreenPath</h1>
                      <p className="text-sm text-muted-foreground">Moderator Panel</p>
                    </div>
                  </div>
                </div>

                {/* User Profile Section */}
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">Moderator</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setActiveTab("profile")}
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Profile
                    </Button>
                    <Button
                      onClick={logout}
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                    >
                      <LogOut className="h-3 w-3 mr-1" />
                      Logout
                    </Button>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4">
                <div className="space-y-1">
                  {navigationItems
                    .filter((item) => item.id !== "profile")
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            activeTab === item.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                </div>
              </nav>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 md:hidden">
              <div className="grid grid-cols-5 gap-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "flex flex-col items-center py-2 px-1 transition-colors text-xs",
                        activeTab === item.id
                          ? "text-blue-600 bg-blue-50"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                      )}
                    >
                      <Icon className="h-5 w-5 mb-1" strokeWidth={2.5} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto pb-20 md:pb-6">
              <div className="p-3 sm:p-6">{renderContent()}</div>
            </div>
          </div>
        </div>
      );
    }