import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Users, Building2, AlertTriangle, TrendingUp, BarChart3, Settings, LogOut, Plus, Eye, CheckCircle, Clock, XCircle, FileText, Megaphone, MapPin, UserCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

// API helper
async function apiRequest(method: string, url: string, data?: any) {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
}

export default function ModeratorDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedVillage, setSelectedVillage] = useState("");

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
    role: "all",
    startDate: "",
    endDate: "",
  });

  // Fetch moderator stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats/moderator"],
  });

  // Fetch assigned villages
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

      const response = await apiRequest("GET", `/api/moderator/reports?${params.toString()}`);
      return response.json();
    },
  });

  // Fetch system analytics
  const { data: systemAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/moderator/analytics/system"],
    enabled: activeTab === "reports",
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/moderator/analytics/system");
      return response.json();
    },
  });

  // Fetch village details for selected village
  const { data: villageDetails, isLoading: villageDetailsLoading } = useQuery({
    queryKey: ["/api/moderator/village", selectedVillage, "details"],
    enabled: !!selectedVillage && activeTab === "villages",
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/moderator/village/${selectedVillage}/details`);
      return response.json();
    },
  });

  // Fetch village issues for selected village
  const { data: villageIssues, isLoading: villageIssuesLoading } = useQuery({
    queryKey: ["/api/moderator/village", selectedVillage, "issues"],
    enabled: !!selectedVillage && activeTab === "villages",
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/moderator/village/${selectedVillage}/issues`);
      return response.json();
    },
  });

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/moderator/announcements", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Announcement sent to all assigned villages successfully",
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

  // Update issue mutation
  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/moderator/issues/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Issue updated successfully",
      });
      // Refresh village issues
      if (selectedVillage) {
        // This will trigger a refetch
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update issue",
        variant: "destructive",
      });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setProfileData({
        ...profileData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleCreateAnnouncement = () => {
    if (!announcement.message.trim()) {
      toast({
        title: "Error",
        description: "Please enter an announcement message",
        variant: "destructive",
      });
      return;
    }

    createAnnouncementMutation.mutate(announcement);
  };

  const handleUpdateProfile = () => {
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = { name: profileData.name };
    if (profileData.newPassword) {
      updateData.currentPassword = profileData.currentPassword;
      updateData.newPassword = profileData.newPassword;
    }

    updateProfileMutation.mutate(updateData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "destructive";
      case "in_progress": return "default";
      case "resolved": return "secondary";
      default: return "outline";
    }
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Moderator Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setActiveTab("profile")}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="villages">Villages</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assigned Villages</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalVillages || 0}</div>
                  <p className="text-xs text-muted-foreground">Villages under supervision</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Households</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalHouseholds || 0}</div>
                  <p className="text-xs text-muted-foreground">Across all villages</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Collectors</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalCollectors || 0}</div>
                  <p className="text-xs text-muted-foreground">Working collectors</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalOpenIssues || 0}</div>
                  <p className="text-xs text-muted-foreground">Require attention</p>
                </CardContent>
              </Card>
            </div>

            {/* Assigned Villages List */}
            <Card>
              <CardHeader>
                <CardTitle>Assigned Villages</CardTitle>
                <CardDescription>Villages under your supervision</CardDescription>
              </CardHeader>
              <CardContent>
                {villagesLoading ? (
                  <div className="text-center py-4">Loading villages...</div>
                ) : villages && villages.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {villages.map((village: any) => (
                      <Card key={village.villageId} className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => {
                              setSelectedVillage(village.villageId);
                              setActiveTab("villages");
                            }}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{village.name}</h3>
                            <Badge variant="outline">{village.villageId}</Badge>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex justify-between">
                              <span>Households:</span>
                              <span>{village.totalHouseholds || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Collectors:</span>
                              <span>{village.totalCollectors || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Open Issues:</span>
                              <span>{village.openIssues || 0}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No villages assigned yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Villages Management Tab */}
          <TabsContent value="villages" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Village Management</h2>
              <Select value={selectedVillage} onValueChange={setSelectedVillage}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a village to manage" />
                </SelectTrigger>
                <SelectContent>
                  {villages?.map((village: any) => (
                    <SelectItem key={village.villageId} value={village.villageId}>
                      {village.name} ({village.villageId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVillage ? (
              <div className="space-y-6">
                {/* Village Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Village Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {villageDetailsLoading ? (
                      <div className="text-center py-4">Loading village details...</div>
                    ) : villageDetails ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Basic Information</Label>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Village ID:</span>
                              <span className="font-medium">{villageDetails.villageId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Name:</span>
                              <span className="font-medium">{villageDetails.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Created:</span>
                              <span className="font-medium">
                                {new Date(villageDetails.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Households</Label>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Total:</span>
                              <span className="font-medium">{villageDetails.totalHouseholds || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Active:</span>
                              <span className="font-medium">{villageDetails.activeHouseholds || 0}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Staff</Label>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Managers:</span>
                              <span className="font-medium">{villageDetails.totalManagers || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Collectors:</span>
                              <span className="font-medium">{villageDetails.totalCollectors || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">No details available</div>
                    )}
                  </CardContent>
                </Card>

                {/* Village Issues */}
                <Card>
                  <CardHeader>
                    <CardTitle>Issues Management</CardTitle>
                    <CardDescription>Track and resolve village issues</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {villageIssuesLoading ? (
                      <div className="text-center py-4">Loading issues...</div>
                    ) : villageIssues && villageIssues.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reported</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {villageIssues.map((issue: any) => (
                            <TableRow key={issue.id}>
                              <TableCell className="font-medium">{issue.title}</TableCell>
                              <TableCell>{issue.category}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusColor(issue.status)}>
                                  {issue.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(issue.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>{issue.title}</DialogTitle>
                                      <DialogDescription>Issue Details</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Description</Label>
                                        <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label>Category</Label>
                                          <p className="text-sm text-gray-600 mt-1">{issue.category}</p>
                                        </div>
                                        <div>
                                          <Label>Status</Label>
                                          <Badge variant={getStatusColor(issue.status)} className="mt-1">
                                            {issue.status}
                                          </Badge>
                                        </div>
                                      </div>
                                      {issue.managerReply && (
                                        <div>
                                          <Label>Manager Reply</Label>
                                          <p className="text-sm text-gray-600 mt-1">{issue.managerReply}</p>
                                        </div>
                                      )}
                                      <div className="flex space-x-2">
                                        <Button
                                          size="sm"
                                          onClick={() => updateIssueMutation.mutate({
                                            id: issue.id,
                                            updates: { status: 'in_progress' }
                                          })}
                                          disabled={issue.status === 'in_progress'}
                                        >
                                          <Clock className="h-3 w-3 mr-1" />
                                          In Progress
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => updateIssueMutation.mutate({
                                            id: issue.id,
                                            updates: { status: 'resolved' }
                                          })}
                                          disabled={issue.status === 'resolved'}
                                        >
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Resolve
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No issues reported for this village
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Village</h3>
                  <p className="text-gray-600">Choose a village from the dropdown to view details and manage issues</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Send Announcement</CardTitle>
                <CardDescription>Send announcements to all users in your assigned villages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="announcement-message">Message</Label>
                  <Textarea
                    id="announcement-message"
                    placeholder="Enter your announcement message..."
                    value={announcement.message}
                    onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="target-audience">Target Audience</Label>
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
                  onClick={handleCreateAnnouncement}
                  disabled={createAnnouncementMutation.isPending}
                  className="w-full"
                >
                  <Megaphone className="h-4 w-4 mr-2" />
                  {createAnnouncementMutation.isPending ? "Sending..." : "Send Announcement"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Role</Label>
                    <Select
                      value={reportFilters.role}
                      onValueChange={(value) => setReportFilters({ ...reportFilters, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="manager">Managers</SelectItem>
                        <SelectItem value="collector">Collectors</SelectItem>
                        <SelectItem value="generator">Generators</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={reportFilters.startDate}
                      onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={reportFilters.endDate}
                      onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {reportLoading ? (
              <div className="text-center py-8">Loading reports...</div>
            ) : reportData ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Users Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Users:</span>
                        <span className="font-medium">{reportData.users?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Managers:</span>
                        <span className="font-medium">
                          {reportData.users?.filter((u: any) => u.role === 'manager').length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Collectors:</span>
                        <span className="font-medium">
                          {reportData.users?.filter((u: any) => u.role === 'collector').length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Generators:</span>
                        <span className="font-medium">
                          {reportData.users?.filter((u: any) => u.role === 'generator').length || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Collections Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Collections:</span>
                        <span className="font-medium">{reportData.collections?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Rating:</span>
                        <span className="font-medium">
                          {reportData.collections?.length > 0
                            ? (reportData.collections.reduce((acc: number, c: any) => acc + (c.segregationRating || 0), 0) / reportData.collections.length).toFixed(1)
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Issues Reported:</span>
                        <span className="font-medium">{reportData.issues?.length || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your personal information and password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="profile-name">Name</Label>
                  <Input
                    id="profile-name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  />
                </div>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Change Password</h3>
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={profileData.currentPassword}
                      onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={profileData.newPassword}
                      onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={profileData.confirmPassword}
                      onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleUpdateProfile}
                  disabled={updateProfileMutation.isPending}
                  className="w-full"
                >
                  {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}