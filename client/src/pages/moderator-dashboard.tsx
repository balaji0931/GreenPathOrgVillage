
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Leaf, Users, AlertTriangle, TrendingUp, Plus, Megaphone, BarChart3, 
  LogOut, Settings, Copy, Download, Eye, Trash2, RotateCcw, Filter, 
  PieChart, LineChart, Building2, UserPlus, X, Home, MessageSquare,
  User, MapPin, Calendar, Activity, FileText, Bell, Star, Award, Package
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
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

  // Fetch managers for assigned villages
  const { data: managers, isLoading: managersLoading } = useQuery({
    queryKey: ["/api/managers"],
    enabled: false, // We'll fetch this conditionally based on village access
  });

  // Fetch reports for assigned villages
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ["/api/reports", reportFilters],
    enabled: activeTab === "reports" && villages && villages.length > 0,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reportFilters.village !== "all") {
        // Check if moderator has access to this village
        const hasAccess = villages?.some((v: any) => v.villageId === reportFilters.village);
        if (!hasAccess) {
          throw new Error("Access denied to this village");
        }
        params.set("village", reportFilters.village);
      }
      if (reportFilters.role !== "all") params.set("role", reportFilters.role);
      if (reportFilters.startDate) params.set("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.set("endDate", reportFilters.endDate);

      const response = await apiRequest("GET", `/api/reports?${params.toString()}`);
      return response.json();
    },
  });

  // Fetch system analytics with village filter (limited to assigned villages)
  const { data: systemAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/analytics/system", reportFilters.village],
    enabled: activeTab === "reports" && villages && villages.length > 0,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reportFilters.village !== "all") {
        // Check if moderator has access to this village
        const hasAccess = villages?.some((v: any) => v.villageId === reportFilters.village);
        if (!hasAccess) {
          throw new Error("Access denied to this village");
        }
        params.set("village", reportFilters.village);
      }

      const response = await apiRequest("GET", `/api/analytics/system?${params.toString()}`);
      return response.json();
    },
  });

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: typeof announcement) => {
      const response = await apiRequest("POST", "/api/announcements", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Announcement sent successfully",
      });
      setAnnouncement({ message: "", targetAudience: "all" });
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
      setProfileData(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const navigationItems = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "villages", label: "My Villages", icon: Building2 },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "profile", label: "Profile", icon: User },
  ];

  const renderOverview = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Moderator Dashboard</h2>
        <p className="text-muted-foreground">Manage your assigned villages</p>
      </div>

      {/* Stats Cards - Mobile Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Assigned Villages</CardTitle>
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats?.totalVillages || 0}</div>
            <p className="text-xs text-muted-foreground">Villages under management</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Total Households</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats?.totalHouseholds || 0}</div>
            <p className="text-xs text-muted-foreground">Registered households</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Open Issues</CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats?.totalOpenIssues || 0}</div>
            <p className="text-xs text-muted-foreground">Pending resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Today's Collections</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats?.totalCollectionsToday || 0}</div>
            <p className="text-xs text-muted-foreground">Waste collections</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <Button onClick={() => setActiveTab("villages")} className="h-16 sm:h-24 flex flex-col text-xs sm:text-sm">
              <Building2 className="h-4 w-4 sm:h-8 sm:w-8 mb-1 sm:mb-2" />
              <span>View Villages</span>
            </Button>
            <Button onClick={() => setActiveTab("reports")} variant="outline" className="h-16 sm:h-24 flex flex-col text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4 sm:h-8 sm:w-8 mb-1 sm:mb-2" />
              <span>View Reports</span>
            </Button>
            <Button onClick={() => setActiveTab("announcements")} variant="outline" className="h-16 sm:h-24 flex flex-col text-xs sm:text-sm">
              <Megaphone className="h-4 w-4 sm:h-8 sm:w-8 mb-1 sm:mb-2" />
              <span>Send Message</span>
            </Button>
            <Button onClick={() => setActiveTab("profile")} variant="outline" className="h-16 sm:h-24 flex flex-col text-xs sm:text-sm">
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
                <p className="text-sm font-medium">Villages running smoothly</p>
                <p className="text-xs text-muted-foreground">All assigned villages operational</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{stats?.totalCollectionsToday || 0} collections today</p>
                <p className="text-xs text-muted-foreground">Waste management active</p>
              </div>
            </div>
            {stats?.totalOpenIssues > 0 && (
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{stats.totalOpenIssues} open issues</p>
                  <p className="text-xs text-muted-foreground">Require attention</p>
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
          <h2 className="text-2xl sm:text-3xl font-bold">My Villages</h2>
          <p className="text-muted-foreground">Villages assigned to you for management</p>
        </div>
      </div>

      {/* Villages Table */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Assigned Villages</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Village ID</TableHead>
                  <TableHead className="text-xs sm:text-sm">Name</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Households</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Collectors</TableHead>
                  <TableHead className="text-xs sm:text-sm">Issues</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {villages?.map((village: any) => (
                  <TableRow key={village.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">{village.villageId}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{village.name}</TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{village.totalHouseholds || 0}</TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{village.totalCollectors || 0}</TableCell>
                    <TableCell>
                      <Badge variant={village.openIssues > 0 ? "destructive" : "secondary"} className="text-xs">
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
    </div>
  );

  const renderReports = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Reports & Analytics</h2>
        <p className="text-muted-foreground">Performance insights for your assigned villages</p>
      </div>

      {/* Village Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Label htmlFor="village">Filter by Village</Label>
              <Select value={reportFilters.village} onValueChange={(value) => setReportFilters({ ...reportFilters, village: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Village" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All My Villages</SelectItem>
                  {villages?.map((village: any) => (
                    <SelectItem key={village.villageId} value={village.villageId}>
                      {village.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => setReportFilters({ ...reportFilters, village: "all" })}>
              Clear Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Analytics would go here - similar to admin dashboard but filtered to assigned villages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Collection Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold">{stats?.totalCollectionsToday || 0}</div>
              <p className="text-muted-foreground">Collections Today</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issues Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold">{stats?.totalOpenIssues || 0}</div>
              <p className="text-muted-foreground">Open Issues</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAnnouncements = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Announcements</h2>
        <p className="text-muted-foreground">Send messages to users in your assigned villages</p>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Send Announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={announcement.message}
              onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
              placeholder="Type your announcement..."
              rows={4}
              className="text-sm sm:text-base"
            />
          </div>
          <div>
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Select 
              value={announcement.targetAudience} 
              onValueChange={(value) => setAnnouncement({ ...announcement, targetAudience: value })}
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
            disabled={createAnnouncementMutation.isPending}
            className="w-full"
          >
            {createAnnouncementMutation.isPending ? "Sending..." : "Send Announcement"}
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
          <CardTitle className="text-lg sm:text-xl">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
          <div>
            <Label htmlFor="profileName">Name</Label>
            <Input
              id="profileName"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
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
            <h3 className="text-base sm:text-lg font-medium mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={profileData.currentPassword}
                  onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
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
                  onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
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
                  onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="text-sm sm:text-base"
                />
              </div>
            </div>
          </div>
          <Button 
            onClick={() => {
              if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
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
      case "overview": return renderOverview();
      case "villages": return renderVillages();
      case "reports": return renderReports();
      case "announcements": return renderAnnouncements();
      case "profile": return renderProfile();
      default: return renderOverview();
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
            <Button 
              onClick={logout} 
              variant="ghost" 
              size="sm"
              className="p-2"
            >
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
              {navigationItems.filter(item => item.id !== 'profile').map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
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
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
          <div className="p-3 sm:p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
