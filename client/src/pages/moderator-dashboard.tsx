import { useState } from "react";
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
import { apiRequest, queryClient, fetchWithCsrf } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  AlertTriangle,
  TrendingUp,
  Megaphone,
  BarChart3,
  LogOut,
  Settings,
  Copy,
  Download,
  Eye,
  RotateCcw,
  Building2,
  UserPlus,
  Home,
  User,
  Bell,
  Star,
  Award,
  Package,
  Leaf,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
    photoFile: null as File | null,
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
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/stats/moderator"],
  });

  // Fetch moderator villages
  const { data: villages, isLoading: villagesLoading } = useQuery<any[]>({
    queryKey: ["/api/moderator/villages"],
  });

  // Fetch moderator managers
  const { data: managers, isLoading: managersLoading } = useQuery<any[]>({
    queryKey: ["/api/moderator/managers"],
    queryFn: async () => {
      // Get all managers for moderator's villages
      const moderatorVillages = await apiRequest("GET", "/api/moderator/villages");
      const villagesData = await moderatorVillages.json();

      const allManagers = [];
      for (const village of villagesData) {
        try {
          const managersResponse = await apiRequest("GET", `/api/moderator/village/${village.villageId}/managers`);
          const villageManagers = await managersResponse.json();
          allManagers.push(...villageManagers.map((manager: any) => ({
            ...manager,
            villageName: village.name
          })));
        } catch (error) {
        }
      }
      return allManagers;
    },
    enabled: !!villages && villages.length > 0,
  });


  // Fetch moderator reports
  const { data: reportData, isLoading: reportLoading } = useQuery<any>({
    queryKey: ["/api/moderator/reports", reportFilters],
    enabled: activeTab === "reports",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reportFilters.role !== "all") params.set("role", reportFilters.role);
      if (reportFilters.startDate)
        params.set("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.set("endDate", reportFilters.endDate);

      const response = await apiRequest(
        "GET",
        `/api/moderator/reports?${params.toString()}`,
      );
      return response.json();
    },
  });

  // Fetch moderator system analytics
  const { data: systemAnalytics, isLoading: analyticsLoading } = useQuery<any>({
    queryKey: ["/api/moderator/analytics/system", reportFilters.village],
    enabled: activeTab === "reports",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reportFilters.village && reportFilters.village !== 'all') {
        params.set('village', reportFilters.village);
      }

      const response = await apiRequest(
        "GET",
        `/api/moderator/analytics/system${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response.json();
    },
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
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/moderator/village/${selectedVillage}/details`);
      return response.json();
    },
    enabled: !!selectedVillage,
  });



  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: typeof announcement) => {
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
      const response = await apiRequest("POST", "/api/moderator/announcements", {
        message: data.message,
        targetAudience: data.targetAudience,
        photoUrl: photoUrl,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || `Announcement sent to ${data.villageCount || 'all assigned'} villages successfully`,
      });
      setAnnouncement({ message: "", targetAudience: "all", photoFile: null });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send announcement",
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


  // Add manager to village mutation
  const addManagerMutation = useMutation({
    mutationFn: async ({
      villageId,
      managerName,
      managerPhone,
    }: {
      villageId: string;
      managerName: string;
      managerPhone: string;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/moderator/village/${villageId}/managers`,
        { managerName, managerPhone },
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Manager added successfully",
      });
      setCreatedCredentials(data.manager.credentials);
      queryClient.invalidateQueries({ queryKey: ["/api/moderator/villages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/moderator/village", selectedVillage, "details"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add manager",
        variant: "destructive",
      });
    },
  });

  // Reset manager password mutation
  const resetManagerPasswordMutation = useMutation({
    mutationFn: async (managerId: string) => {
      const response = await apiRequest(
        "PUT",
        `/api/moderator/managers/${managerId}/reset-password`,
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Password reset to: ${data.newPassword}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const copyCredentials = (credentials: any) => {
    const text = `User ID: ${credentials.userId}\nPassword: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Credentials copied to clipboard",
    });
  };

  const downloadCredentials = (credentials: any) => {
    const text = `Login Credentials\n\nUser ID: ${credentials.userId}\nPassword: ${credentials.password}\n\nPlease keep these credentials safe.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credentials-${credentials.userId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  const navigationItems = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "villages", label: "Villages", icon: Building2 },
    { id: "managers", label: "Managers", icon: Users },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "announcements", label: "Announcements", icon: Bell },
    { id: "profile", label: "Profile", icon: User },
  ];

  const renderOverview = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Moderator Dashboard</h2>
        <p className="text-muted-foreground">
          Manage your waste management system
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
            <p className="text-xs text-muted-foreground">Your assigned villages</p>
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
              onClick={() => setActiveTab("managers")}
              variant="outline"
              className="h-16 sm:h-24 flex flex-col text-xs sm:text-sm"
            >
              <UserPlus className="h-4 w-4 sm:h-8 sm:w-8 mb-1 sm:mb-2" />
              <span>Manage Users</span>
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
            <Button
              onClick={() => setActiveTab("profile")}
              variant="outline"
              className="h-16 sm:h-24 flex flex-col text-xs sm:text-sm"
            >
              <Settings className="h-4 w-4 sm:h-8 sm:w-8 mb-1 sm:mb-2" />
              <span>Settings</span>
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
                <p className="text-sm font-medium">System running smoothly</p>
                <p className="text-xs text-muted-foreground">
                  All villages operational
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
        </div>
      </div>
      {/* Villages Table */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">All Villages</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">
                    Village ID
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm">Name</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">
                    Households
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">
                    Collectors
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm">Issues</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {villages?.map((village: any) => (
                  <TableRow key={village.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">
                      {village.villageId}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {village.name}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                      {village.totalHouseholds || 0}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                      {village.totalCollectors || 0}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          village.openIssues > 0 ? "destructive" : "secondary"
                        }
                        className="text-xs"
                      >
                        {village.openIssues || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1 sm:space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedVillage(village.villageId)}
                          className="p-1 sm:p-2"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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

              {/* Village Performance Charts */}
              {villageDetails.recentCollections &&
                villageDetails.recentCollections.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <Card>
                      <CardHeader className="p-3 sm:p-6">
                        <CardTitle className="text-sm sm:text-base">
                          Recent Collection Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6 pt-0">
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={villageDetails.recentCollections.slice(0, 7)}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="collectionDate"
                              tickFormatter={(date) =>
                                new Date(date).toLocaleDateString()
                              }
                              fontSize={12}
                            />
                            <YAxis domain={[0, 5]} fontSize={12} />
                            <Tooltip
                              labelFormatter={(date) =>
                                new Date(date).toLocaleDateString()
                              }
                            />
                            <Bar
                              dataKey="segregationRating"
                              fill="#00C49F"
                              name="Segregation Rating"
                            />
                            <Bar
                              dataKey="plasticRating"
                              fill="#FFBB28"
                              name="Plastic Rating"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-3 sm:p-6">
                        <CardTitle className="text-sm sm:text-base">
                          Collection Status Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6 pt-0">
                        <ResponsiveContainer width="100%" height={200}>
                          <RechartsPieChart>
                            <Pie
                              data={[
                                {
                                  name: "Completed",
                                  value:
                                    villageDetails.recentCollections.filter(
                                      (c: any) => c.status === "collected",
                                    ).length,
                                },
                                {
                                  name: "Pending",
                                  value:
                                    villageDetails.recentCollections.filter(
                                      (c: any) => c.status === "pending",
                                    ).length,
                                },
                                {
                                  name: "Missed",
                                  value:
                                    villageDetails.recentCollections.filter(
                                      (c: any) => c.status === "missed",
                                    ).length,
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              outerRadius={60}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                              fontSize={10}
                            >
                              <Cell fill="#00C49F" />
                              <Cell fill="#FFBB28" />
                              <Cell fill="#FF8042" />
                            </Pie>
                            <Tooltip />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}

              {/* Managers Section */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl">Managers</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="w-full sm:w-auto">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Manager
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          Add Manager to {villageDetails.village?.name}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Manager Name</Label>
                          <Input
                            id="newManagerName"
                            placeholder="Enter manager name"
                          />
                        </div>
                        <div>
                          <Label>Manager Phone</Label>
                          <Input
                            id="newManagerPhone"
                            placeholder="Enter phone number"
                          />
                        </div>
                        <Button
                          onClick={() => {
                            const nameInput = document.getElementById(
                              "newManagerName",
                            ) as HTMLInputElement;
                            const phoneInput = document.getElementById(
                              "newManagerPhone",
                            ) as HTMLInputElement;
                            if (nameInput.value && phoneInput.value) {
                              addManagerMutation.mutate({
                                villageId: selectedVillage,
                                managerName: nameInput.value,
                                managerPhone: phoneInput.value,
                              });
                              nameInput.value = "";
                              phoneInput.value = "";
                            }
                          }}
                          className="w-full"
                        >
                          Add Manager
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">
                            Manager ID
                          </TableHead>
                          <TableHead className="text-xs sm:text-sm">
                            Name
                          </TableHead>
                          <TableHead className="text-xs sm:text-sm hidden sm:table-cell">
                            Phone
                          </TableHead>
                          <TableHead className="text-xs sm:text-sm">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {villageDetails.managers?.map((manager: any) => (
                          <TableRow key={manager.id}>
                            <TableCell className="text-xs sm:text-sm">
                              {manager.userId}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              {manager.name}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                              {manager.phone}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1 sm:space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    resetManagerPasswordMutation.mutate(manager.userId)
                                  }
                                  className="p-1 sm:p-2"
                                >
                                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Additional sections for households and issues */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">
                      Recent Households
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">
                              UID
                            </TableHead>
                            <TableHead className="text-xs sm:text-sm">
                              Head Name
                            </TableHead>
                            <TableHead className="text-xs sm:text-sm">
                              House Number
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {villageDetails.households
                            ?.slice(0, 5)
                            .map((household: any) => (
                              <TableRow key={household.id}>
                                <TableCell className="text-xs sm:text-sm">
                                  {household.uid}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">
                                  {household.headName}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">
                                  {household.houseNumber}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </                Card>

                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">
                      Recent Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">
                              Title
                            </TableHead>
                            <TableHead className="text-xs sm:text-sm">
                              Status
                            </TableHead>
                            <TableHead className="text-xs sm:text-sm">
                              Date
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {villageDetails.issues
                            ?.slice(0, 5)
                            .map((issue: any) => (
                              <TableRow key={issue.id}>
                                <TableCell className="text-xs sm:text-sm">
                                  {issue.title}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      issue.status === "open"
                                        ? "destructive"
                                        : "default"
                                    }
                                    className="text-xs"
                                  >
                                    {issue.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">
                                  {new Date(
                                    issue.createdAt,
                                  ).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Credentials Display Modal */}
      {createdCredentials && (
        <Dialog
          open={!!createdCredentials}
          onOpenChange={() => setCreatedCredentials(null)}
        >
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manager Credentials Created</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted p-3 sm:p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="text-sm sm:text-base">
                    <strong>User ID:</strong> {createdCredentials.userId}
                  </div>
                  <div className="text-sm sm:text-base">
                    <strong>Password:</strong> {createdCredentials.password}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button
                  onClick={() => copyCredentials(createdCredentials)}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  onClick={() => downloadCredentials(createdCredentials)}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  const renderManagers = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Manager Management</h2>
        <p className="text-muted-foreground">Manage all village managers</p>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">All Managers</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {managersLoading ? (
            <div className="flex items-center justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm">Loading managers...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">
                      Manager ID
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm">Name</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">
                      Village
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">
                      Phone
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm">Status</TableHead>
                    <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(managers) && managers.length > 0 ? (
                    managers.map((manager: any) => (
                      <TableRow key={manager.id || manager.userId}>
                        <TableCell className="font-medium text-xs sm:text-sm">
                          {manager.userId}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {manager.name}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                          {manager.villageName || manager.villageId}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                          {manager.phone}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">
                            Active
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1 sm:space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                resetManagerPasswordMutation.mutate(manager.userId)
                              }
                              className="p-1 sm:p-2"
                            >
                              <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No managers found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Reports & Analytics</h2>
        <p className="text-muted-foreground">
          Comprehensive performance insights and trends across all villages
        </p>
      </div>

      <Tabs defaultValue="overall" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overall">Overall Reports</TabsTrigger>
          <TabsTrigger value="daily">Daily Reports</TabsTrigger>
        </TabsList>

        {/* Overall Reports Tab */}
        <TabsContent value="overall" className="space-y-6">
          {/* Village Filter for Overall Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Overall Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <Label htmlFor="overall-village">Filter by Village</Label>
                  <Select
                    value={reportFilters.village}
                    onValueChange={(value) =>
                      setReportFilters({ ...reportFilters, village: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Village" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Villages</SelectItem>
                      {villages?.map((village: any) => (
                        <SelectItem
                          key={village.villageId}
                          value={village.villageId}
                        >
                          {village.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setReportFilters({ ...reportFilters, village: "all" })
                  }
                >
                  Clear Filter
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {reportFilters.village === "all"
                  ? "Showing overall analytics for all villages"
                  : `Showing analytics for ${villages?.find((v) => v.villageId === reportFilters.village)?.name || "selected village"}`}
              </p>
            </CardContent>
          </Card>

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
                    if (reportFilters.village === "all") {
                      return systemAnalytics?.totalCollectionsThisWeek || 0;
                    } else {
                      // Show collections for selected village
                      const villageCollections = reportData?.collections?.find(
                        (c: any) => c.villageId === reportFilters.village,
                      );
                      return villageCollections?.collections || 0;
                    }
                  })()}
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  {reportFilters.village === "all"
                    ? "Total collections this week"
                    : `Collections for ${villages?.find((v) => v.villageId === reportFilters.village)?.name || "selected village"}`}
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
                    if (reportFilters.village === "all") {
                      return (
                        systemAnalytics?.averageSegregationRating?.toFixed(1) ||
                        "0.0"
                      );
                    } else {
                      // Show rating for selected village
                      const villageData = reportData?.collections?.find(
                        (c: any) => c.villageId === reportFilters.village,
                      );
                      const rating = villageData?.avgSegregationRating;
                      return rating
                        ? (typeof rating === "number"
                          ? rating
                          : parseFloat(rating)
                        ).toFixed(1)
                        : "0.0";
                    }
                  })()}
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  {reportFilters.village === "all"
                    ? "Overall rating"
                    : `Rating for ${villages?.find((v) => v.villageId === reportFilters.village)?.name || "selected village"}`}
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
                  {(() => {
                    // Get collection trends from analytics (already filtered by village)
                    const trends = systemAnalytics?.collectionTrends || [];
                    const totalHouseholds = systemAnalytics?.totalHouseholds || 0;

                    // If no trends available, generate last 7 days with zero data
                    if (trends.length === 0) {
                      const emptyTrends = Array.from({ length: 7 }).map((_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (6 - i));
                        return {
                          date: date.toISOString().split("T")[0],
                          collections: 0,
                          totalHouseholds: totalHouseholds,
                          avgRating: 0
                        };
                      });

                      return emptyTrends.map((dayData, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {new Date(dayData.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="font-medium">
                              0 / {totalHouseholds} houses
                            </span>
                          </div>
                          <div className="flex h-4 bg-gray-200 rounded overflow-hidden">
                            <div className="w-full bg-gray-300" />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="text-gray-600">No collections</span>
                            <span className="text-gray-600">Rating: 0.0/5</span>
                          </div>
                        </div>
                      ));
                    }

                    return trends.map((dayData: any, i: number) => {
                      const date = new Date(dayData.date);
                      const collectionsForDay = Number(dayData.collections) || 0;
                      const householdsForDay = Number(dayData.totalHouseholds) || totalHouseholds;
                      const avgRating = Number(dayData.avgRating) || 0;

                      // Calculate collection percentage out of total households
                      const collectionPercentage = householdsForDay > 0
                        ? (collectionsForDay / householdsForDay) * 100
                        : 0;
                      const remaining = Math.max(0, householdsForDay - collectionsForDay);

                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {date.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="font-medium">
                              {collectionsForDay} / {householdsForDay} houses
                            </span>
                          </div>
                          <div className="flex h-4 bg-gray-200 rounded overflow-hidden">
                            <div
                              className="bg-green-500 transition-all"
                              style={{
                                width: `${Math.max(collectionPercentage, 0)}%`,
                              }}
                              title={`Collected: ${collectionsForDay} out of ${householdsForDay} houses`}
                            />
                            <div
                              className="bg-gray-300 transition-all"
                              style={{
                                width: `${Math.max(100 - collectionPercentage, 0)}%`,
                              }}
                              title={`Remaining: ${remaining} houses`}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="text-green-600">
                              Collected: {collectionsForDay} ({Math.round(collectionPercentage)}%)
                            </span>
                            <span className="text-blue-600">
                              Avg Rating: {avgRating.toFixed(1)}/5
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                {analyticsLoading && (
                  <p className="text-center text-muted-foreground py-4 text-xs">
                    Loading collection trend data...
                  </p>
                )}
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
                  {(() => {
                    // Get collection trends from analytics (already filtered by village)
                    const trends = systemAnalytics?.collectionTrends || [];

                    // If no trends available, generate last 7 days with zero data
                    if (trends.length === 0) {
                      const emptyTrends = Array.from({ length: 7 }).map((_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (6 - i));
                        return {
                          date: date.toISOString().split("T")[0],
                          avgRating: 0,
                          collections: 0
                        };
                      });

                      return emptyTrends.map((dayData, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-16 text-xs text-muted-foreground">
                            {new Date(dayData.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                            <div className="h-4 rounded-full bg-gray-300 w-full" />
                          </div>
                          <div className="w-16 text-xs text-right">
                            <div className="font-medium">0.0/5</div>
                            <div className="text-muted-foreground">0 items</div>
                          </div>
                        </div>
                      ));
                    }

                    return trends.map((dayData: any, i: number) => {
                      const date = new Date(dayData.date);
                      const avgRating = Number(dayData.avgRating) || 0;
                      const collections = Number(dayData.collections) || 0;

                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-16 text-xs text-muted-foreground">
                            {date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                            <div
                              className={`h-4 rounded-full transition-all ${avgRating >= 4
                                ? "bg-green-500"
                                : avgRating >= 3
                                  ? "bg-yellow-500"
                                  : avgRating > 0
                                    ? "bg-red-500"
                                    : "bg-gray-300"
                                }`}
                              style={{
                                width: `${avgRating > 0 ? Math.max((avgRating / 5) * 100, 5) : 5}%`,
                              }}
                            />
                            {avgRating > 0 && (
                              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                {avgRating.toFixed(1)}
                              </div>
                            )}
                          </div>
                          <div className="w-16 text-xs text-right">
                            <div className="font-medium">
                              {avgRating > 0 ? avgRating.toFixed(1) : "0.0"}/5
                            </div>
                            <div className="text-muted-foreground">
                              {collections} items
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                {analyticsLoading && (
                  <p className="text-center text-muted-foreground py-4 text-xs">
                    Loading segregation trend data...
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 3. Overall Segregation Rate Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  {reportFilters.village === "all"
                    ? "Overall Segregation Rate"
                    : `Segregation Rate - ${villages?.find((v) => v.villageId === reportFilters.village)?.name || "Village"}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  {(() => {
                    // Get appropriate distribution data based on filter
                    let distribution = [];
                    if (reportFilters.village === "all") {
                      distribution = systemAnalytics?.segregationRateDistribution || [];
                    } else {
                      distribution = dailyAnalytics?.ratingDistribution || systemAnalytics?.segregationRateDistribution || [];
                    }

                    // Calculate rating categories
                    const excellent = distribution
                      .filter((d: any) => Number(d.rating) >= 4)
                      .reduce((sum: number, d: any) => sum + Number(d.count), 0);
                    const good = distribution
                      .filter((d: any) => Number(d.rating) >= 3 && Number(d.rating) < 4)
                      .reduce((sum: number, d: any) => sum + Number(d.count), 0);
                    const poor = distribution
                      .filter((d: any) => Number(d.rating) < 3 && Number(d.rating) > 0)
                      .reduce((sum: number, d: any) => sum + Number(d.count), 0);
                    const total = excellent + good + poor;

                    // If no data, show placeholder
                    if (total === 0) {
                      return (
                        <div className="w-48 h-48 relative flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <div className="text-lg font-medium">No Data</div>
                            <div className="text-xs">No segregation ratings available</div>
                          </div>
                        </div>
                      );
                    }

                    const excellentPercent = (excellent / total) * 100;
                    const goodPercent = (good / total) * 100;
                    const poorPercent = (poor / total) * 100;

                    // Calculate stroke-dasharray for pie chart
                    const circumference = 2 * Math.PI * 40; // radius = 40
                    const excellentStroke = (excellentPercent / 100) * circumference;
                    const goodStroke = (goodPercent / 100) * circumference;
                    const poorStroke = (poorPercent / 100) * circumference;

                    return (
                      <div className="w-48 h-48 relative">
                        <svg
                          viewBox="0 0 100 100"
                          className="w-full h-full transform -rotate-90"
                        >
                          {/* Background circle */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#f3f4f6"
                            strokeWidth="20"
                          />

                          {/* Poor (red) */}
                          {poor > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="20"
                              strokeDasharray={`${poorStroke} ${circumference}`}
                              strokeDashoffset="0"
                            />
                          )}

                          {/* Good (yellow) */}
                          {good > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="#eab308"
                              strokeWidth="20"
                              strokeDasharray={`${goodStroke} ${circumference}`}
                              strokeDashoffset={`-${poorStroke}`}
                            />
                          )}

                          {/* Excellent (green) */}
                          {excellent > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="#22c55e"
                              strokeWidth="20"
                              strokeDasharray={`${excellentStroke} ${circumference}`}
                              strokeDashoffset={`-${poorStroke + goodStroke}`}
                            />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {Math.round(excellentPercent)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Excellent
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {total} total
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {(() => {
                    const distribution = reportFilters.village === "all"
                      ? systemAnalytics?.segregationRateDistribution || []
                      : dailyAnalytics?.ratingDistribution || systemAnalytics?.segregationRateDistribution || [];

                    const excellent = distribution
                      .filter((d: any) => Number(d.rating) >= 4)
                      .reduce((sum: number, d: any) => sum + Number(d.count), 0);
                    const good = distribution
                      .filter((d: any) => Number(d.rating) >= 3 && Number(d.rating) < 4)
                      .reduce((sum: number, d: any) => sum + Number(d.count), 0);
                    const poor = distribution
                      .filter((d: any) => Number(d.rating) < 3 && Number(d.rating) > 0)
                      .reduce((sum: number, d: any) => sum + Number(d.count), 0);

                    return (
                      <>
                        <div className="text-center">
                          <div className="w-4 h-4 bg-green-500 rounded mx-auto mb-1"></div>
                          <div className="text-xs">Excellent (4-5★)</div>
                          <div className="text-xs font-medium">{excellent}</div>
                        </div>
                        <div className="text-center">
                          <div className="w-4 h-4 bg-yellow-500 rounded mx-auto mb-1"></div>
                          <div className="text-xs">Good (3-4★)</div>
                          <div className="text-xs font-medium">{good}</div>
                        </div>
                        <div className="text-center">
                          <div className="w-4 h-4 bg-red-500 rounded mx-auto mb-1"></div>
                          <div className="text-xs">Poor (0-3★)</div>
                          <div className="text-xs font-medium">{poor}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* 4. Village Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  {reportFilters.village === "all"
                    ? "Village Performance Comparison"
                    : `Performance Details - ${villages?.find((v) => v.villageId === reportFilters.village)?.name || "Village"}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    let performanceData = [];

                    if (reportFilters.village === "all") {
                      performanceData =
                        systemAnalytics?.topPerformingVillages ||
                        reportData?.collections ||
                        [];
                    } else {
                      // Show single village performance or collectors within that village
                      const villageData = reportData?.collections?.find(
                        (c: any) => c.villageId === reportFilters.village,
                      );
                      if (villageData) {
                        performanceData = [villageData];
                      } else {
                        // Show from village performance in daily analytics
                        performanceData =
                          dailyAnalytics?.villagePerformance || [];
                      }
                    }

                    return performanceData
                      .slice(0, 6)
                      .map((item: any, index: number) => {
                        const avgRating =
                          parseFloat(
                            item.avgRating || item.avgSegregationRating,
                          ) || 0;
                        const collections = parseInt(item.collections) || 0;
                        const name =
                          item.villageName ||
                          item.name ||
                          `Performer ${index + 1}`;

                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium truncate">
                                {name}
                              </span>
                              <span>{collections} collections</span>
                            </div>
                            <div className="flex h-6 bg-gray-200 rounded overflow-hidden">
                              <div
                                className={`transition-all ${avgRating >= 4
                                  ? "bg-green-500"
                                  : avgRating >= 3
                                    ? "bg-yellow-500"
                                    : avgRating > 0
                                      ? "bg-red-500"
                                      : "bg-gray-300"
                                  }`}
                                style={{
                                  width: `${avgRating > 0 ? (avgRating / 5) * 100 : 0}%`,
                                }}
                                title={`Rating: ${avgRating.toFixed(1)}`}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground text-right">
                              {avgRating > 0 ? avgRating.toFixed(1) : "N/A"}/5.0
                            </div>
                          </div>
                        );
                      });
                  })()}
                  {!systemAnalytics?.topPerformingVillages &&
                    !reportData?.collections &&
                    !dailyAnalytics?.villagePerformance && (
                      <p className="text-center text-muted-foreground py-4">
                        No performance data available
                      </p>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* 5. Household Collection Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Household Collection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  {(() => {
                    // Calculate real household collection status
                    const totalHouseholds =
                      reportFilters.village === "all"
                        ? systemAnalytics?.totalHouseholds || 0
                        : villages?.find(
                          (v) => v.villageId === reportFilters.village,
                        )?.totalHouseholds || 0;

                    const collectedToday =
                      reportFilters.village === "all"
                        ? systemAnalytics?.totalCollectionsToday || 0
                        : dailyAnalytics?.collected || 0;

                    const collectionRate =
                      totalHouseholds > 0
                        ? (collectedToday / totalHouseholds) * 100
                        : 0;
                    const notCollectedRate = 100 - collectionRate;

                    return (
                      <div className="w-40 h-40 relative">
                        <svg
                          viewBox="0 0 100 100"
                          className="w-full h-full transform -rotate-90"
                        >
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#f3f4f6"
                            strokeWidth="25"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="25"
                            strokeDasharray={`${(collectionRate / 100) * 219.9} 219.9`}
                            strokeDashoffset="0"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-xl font-bold text-green-600">
                              {Math.round(collectionRate)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Collected Today
                            </div>
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
                    <div className="text-xs font-medium">
                      {reportFilters.village === "all"
                        ? systemAnalytics?.totalCollectionsToday || 0
                        : dailyAnalytics?.collected || 0}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 bg-gray-300 rounded mx-auto mb-1"></div>
                    <div className="text-xs">Remaining</div>
                    <div className="text-xs font-medium">
                      {reportFilters.village === "all"
                        ? (systemAnalytics?.totalHouseholds || 0) -
                        (systemAnalytics?.totalCollectionsToday || 0)
                        : dailyAnalytics?.remaining || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 6. System Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  System Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Total Villages</p>
                      <p className="text-xs text-muted-foreground">
                        Active communities
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {systemAnalytics?.totalVillages || villages?.length || 0}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Total Households</p>
                      <p className="text-xs text-muted-foreground">
                        Registered users
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {systemAnalytics?.totalHouseholds || 0}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Total Collectors</p>
                      <p className="text-xs text-muted-foreground">
                        Active staff
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {systemAnalytics?.totalCollectors || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Daily Reports Tab */}
        <TabsContent value="daily" className="space-y-6">
          {/* Village and Date Filter for Daily Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Select Village and Date for Daily Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="daily-village">Filter by Village</Label>
                  <Select
                    value={reportFilters.village}
                    onValueChange={(value) =>
                      setReportFilters({ ...reportFilters, village: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Village" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Villages</SelectItem>
                      {villages?.map((village: any) => (
                        <SelectItem
                          key={village.villageId}
                          value={village.villageId}
                        >
                          {village.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
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
              </div>
              <div className="flex gap-2 mt-4">
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
                <Button
                  variant="outline"
                  onClick={() =>
                    setReportFilters({ ...reportFilters, village: "all" })
                  }
                >
                  All Villages
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Showing daily report for{" "}
                {reportFilters.village === "all"
                  ? "all villages"
                  : villages?.find((v) => v.villageId === reportFilters.village)
                    ?.name || "selected village"}{" "}
                on{" "}
                {new Date(
                  reportFilters.startDate || new Date(),
                ).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          {/* Daily KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-800">
                  Avg Segregation Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-900">
                  {(() => {
                    const rating = dailyAnalytics?.avgSegregationRating;
                    if (rating == null || rating === undefined) return "0.0";
                    const numRating =
                      typeof rating === "string"
                        ? parseFloat(rating)
                        : Number(rating);
                    return isNaN(numRating) ? "0.0" : numRating.toFixed(1);
                  })()}
                </div>
                <p className="text-xs text-yellow-700">Out of 5.0 stars</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">
                  Total Houses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">
                  {dailyAnalytics?.totalHouses || 0}
                </div>
                <p className="text-xs text-blue-700">Registered households</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-800">
                  Collected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">
                  {dailyAnalytics?.collected || 0}
                </div>
                <p className="text-xs text-green-700">Collections completed</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-800">
                  Remaining
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900">
                  {dailyAnalytics?.remaining || 0}
                </div>
                <p className="text-xs text-red-700">Yet to collect</p>
              </CardContent>
            </Card>
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
                    const collected = dailyAnalytics?.collected || 0;
                    const total = dailyAnalytics?.totalHouses || 1;
                    const notCollected = total - collected;

                    return (
                      <div className="w-48 h-48 relative">
                        <svg
                          viewBox="0 0 100 100"
                          className="w-full h-full transform -rotate-90"
                        >
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#f3f4f6"
                            strokeWidth="20"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="20"
                            strokeDasharray={`${(collected / total) * 251.3} 251.3`}
                            strokeDashoffset="0"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="20"
                            strokeDasharray={`${(notCollected / total) * 251.3} 251.3`}
                            strokeDashoffset={`-${(collected / total) * 251.3}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {Math.round((collected / total) * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Collected
                            </div>
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
                  {[5, 4, 3, 2, 1].map((stars) => {
                    // Use real data for star distribution
                    const ratingData = dailyAnalytics?.ratingDistribution || [];
                    const starCount =
                      ratingData.find((r: any) => r.rating === stars)?.count ||
                      0;
                    const total =
                      ratingData.reduce(
                        (sum: number, r: any) => sum + r.count,
                        0,
                      ) || 1;
                    const percentage =
                      total > 0 ? (starCount / total) * 100 : 0;

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

            {/* 3. Village Performance for the Day */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  {reportFilters.village === "all"
                    ? "Village Performance Today"
                    : "Collector Performance Today"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dailyAnalytics?.villagePerformance?.length > 0 ? (
                    dailyAnalytics.villagePerformance
                      .slice(0, 5)
                      .map((performer: any, index: number) => {
                        const collections = performer.collections || 0;
                        const avgRating = performer.avgRating || 0;

                        return (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{performer.name}</h4>
                              <Badge variant="outline">
                                {collections} collections
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${avgRating >= 4
                                    ? "bg-green-500"
                                    : avgRating >= 3
                                      ? "bg-yellow-500"
                                      : avgRating > 0
                                        ? "bg-red-500"
                                        : "bg-gray-300"
                                    }`}
                                  style={{
                                    width: `${avgRating > 0 ? (avgRating / 5) * 100 : 0}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {avgRating > 0 ? avgRating.toFixed(1) : "N/A"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No performance data available for selected date
                    </p>
                  )}
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
                    const hour = i + 6; // Start from 8 AM
                    const timelineData =
                      dailyAnalytics?.collectionTimeline || [];
                    const hourData = timelineData.find(
                      (t: any) => Number(t.hour) === hour,
                    );
                    const hourCollections = hourData?.collections || 0;
                    const maxCollections = Math.max(
                      ...timelineData.map(
                        (t: any) => Number(t.collections) || 0,
                      ),
                      1,
                    );
                    const percentage =
                      maxCollections > 0
                        ? (hourCollections / maxCollections) * 100
                        : 0;

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
                {(!dailyAnalytics?.collectionTimeline ||
                  dailyAnalytics.collectionTimeline.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      No collection data available for selected date
                    </p>
                  )}
              </CardContent>
            </Card>

            {/* 5. Home Composting Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5" />
                  Home Composting Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  {(() => {
                    const compostingData = dailyAnalytics?.compostingData || {
                      composting: 0,
                      notComposting: 0,
                      total: 0,
                    };
                    const composting = Number(compostingData.composting) || 0;
                    const notComposting =
                      Number(compostingData.notComposting) || 0;
                    const total = composting + notComposting || 1;
                    const compostingPercentage = (composting / total) * 100;

                    return (
                      <div className="w-48 h-48 relative">
                        <svg
                          viewBox="0 0 100 100"
                          className="w-full h-full transform -rotate-90"
                        >
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#f3f4f6"
                            strokeWidth="20"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="20"
                            strokeDasharray={`${(composting / total) * 251.3} 251.3`}
                            strokeDashoffset="0"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="20"
                            strokeDasharray={`${(notComposting / total) * 251.3} 251.3`}
                            strokeDashoffset={`-${(composting / total) * 251.3}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {Math.round(compostingPercentage)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Composting
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="text-center">
                    <div className="w-4 h-4 bg-green-500 rounded mx-auto mb-1"></div>
                    <div className="text-xs">Composting</div>
                    <div className="text-xs font-medium">
                      {dailyAnalytics?.compostingData?.composting || 0}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 bg-red-500 rounded mx-auto mb-1"></div>
                    <div className="text-xs">Not Composting</div>
                    <div className="text-xs font-medium">
                      {dailyAnalytics?.compostingData?.notComposting || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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
    </div>
  );

  const renderAnnouncements = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Announcements</h2>
        <p className="text-muted-foreground">Send announcements to villages</p>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">
            Send New Announcement
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="space-y-4">
            <div>
              <Label htmlFor="announcement-message">Message</Label>
              <Textarea
                id="announcement-message"
                value={announcement.message}
                onChange={(e) =>
                  setAnnouncement({ ...announcement, message: e.target.value })
                }
                placeholder="Enter announcement message"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="announcement-audience">Target Audience</Label>
              <Select
                value={announcement.targetAudience}
                onValueChange={(value) =>
                  setAnnouncement({ ...announcement, targetAudience: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="managers">Managers Only</SelectItem>
                  <SelectItem value="generators">Generators Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="announcement-photo">Image (Optional)</Label>
              <Input
                id="announcement-photo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setAnnouncement({ ...announcement, photoFile: file });
                }}
                className="cursor-pointer"
              />
              {announcement.photoFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {announcement.photoFile.name}
                </p>
              )}
            </div>
            <Button
              onClick={() => createAnnouncementMutation.mutate(announcement)}
              disabled={createAnnouncementMutation.isPending}
              className="w-full"
            >
              {createAnnouncementMutation.isPending
                ? "Sending..."
                : "Send Announcement"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Profile Settings</h2>
        <p className="text-muted-foreground">Manage your moderater account</p>
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
      case "managers":
        return renderManagers();
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
      <div className="md:hidden bg-green-600 border-b px-3 py-3 sticky top-0 left-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logos/logo-dark.svg" alt="GreenPath" className="h-9 w-auto" />
          </div>
          <div className="">
            <Button onClick={() => logout()} variant="ghost" size="default" className="p-2">
              <LogOut className="h-7 w-7 text-white" strokeWidth={3} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white border-r flex-col z-10">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src="/logos/logo-full.svg" alt="GreenPath" className="h-10 w-auto" />
                <div>
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
                  onClick={() => logout()}
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
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${activeTab === item.id
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
        <div className="fixed bottom-0 left-0 right-0 bg-green-100 border-t z-50 md:hidden px-2 py-1">
          <div className="grid grid-cols-6 gap-1">
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
                  <Icon className="h-6 w-6 mb-1" strokeWidth={2.5} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto pb-20 md:pb-6 md:ml-64">
          <div className="p-3 sm:p-6">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}