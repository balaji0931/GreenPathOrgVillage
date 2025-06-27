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

  const [newVillage, setNewVillage] = useState({
    villageName: "",
    managerName: "",
    managerPhone: "",
  });

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
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["/api/moderator/stats"],
    retry: 1,
  });

  // Fetch moderator assigned villages
  const { data: villages, isLoading: villagesLoading, error: villagesError } = useQuery({
    queryKey: ["/api/moderator/villages"],
    retry: 1,
  });

  // Fetch managers in assigned villages
  const { data: managers, isLoading: managersLoading, error: managersError } = useQuery({
    queryKey: ["/api/managers"],
    retry: 1,
  });

  // Fetch moderator reports
  const { data: reportData, isLoading: reportLoading, error: reportError } = useQuery({
    queryKey: ["/api/moderator/reports", reportFilters],
    enabled: activeTab === "reports",
    retry: 1,
  });

  // Village details query
  const { data: villageDetails } = useQuery({
    queryKey: ["/api/villages", selectedVillage, "details"],
    enabled: !!selectedVillage,
  });

  // Add manager to village mutation
  const addManagerMutation = useMutation({
    mutationFn: async (data: typeof newVillage) => {
      const response = await apiRequest("POST", "/api/managers", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Manager added successfully",
      });
      setNewVillage({ villageName: "", managerName: "", managerPhone: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/moderator/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add manager",
        variant: "destructive",
      });
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
        description: "Announcement created successfully",
      });
      setAnnouncement({ message: "", targetAudience: "all" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive",
      });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const response = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setProfileData({
        name: user?.name || "",
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

  const handleAddManager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVillage.villageName || !newVillage.managerName || !newVillage.managerPhone) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    addManagerMutation.mutate(newVillage);
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.message) {
      toast({
        title: "Error",
        description: "Please enter announcement message",
        variant: "destructive",
      });
      return;
    }
    createAnnouncementMutation.mutate(announcement);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (profileData.newPassword !== profileData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate(profileData);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-600 p-2 rounded-lg">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Moderator Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-blue-700 border-blue-200">
                MOD
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("profile")}
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Home className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="villages" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Villages & Managers</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Reports</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Villages</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="text-2xl font-bold">Loading...</div>
                  ) : statsError ? (
                    <div className="text-2xl font-bold text-red-500">Error</div>
                  ) : (
                    <div className="text-2xl font-bold">{stats?.totalVillages || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground">Assigned to you</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Managers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="text-2xl font-bold">Loading...</div>
                  ) : statsError ? (
                    <div className="text-2xl font-bold text-red-500">Error</div>
                  ) : (
                    <div className="text-2xl font-bold">{stats?.totalManagers || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground">In your villages</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="text-2xl font-bold">Loading...</div>
                  ) : statsError ? (
                    <div className="text-2xl font-bold text-red-500">Error</div>
                  ) : (
                    <div className="text-2xl font-bold">{stats?.totalOpenIssues || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground">Needs attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Collections</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="text-2xl font-bold">Loading...</div>
                  ) : statsError ? (
                    <div className="text-2xl font-bold text-red-500">Error</div>
                  ) : (
                    <div className="text-2xl font-bold">{stats?.totalCollectionsToday || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground">Completed today</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => setActiveTab("villages")}
                    className="flex items-center space-x-2 h-16 bg-blue-600 hover:bg-blue-700"
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Add Manager</span>
                  </Button>
                  <Button
                    onClick={() => setActiveTab("reports")}
                    variant="outline"
                    className="flex items-center space-x-2 h-16"
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span>View Reports</span>
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex items-center space-x-2 h-16"
                      >
                        <Megaphone className="h-5 w-5" />
                        <span>Send Announcement</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Announcement</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                        <div>
                          <Label htmlFor="message">Message</Label>
                          <Textarea
                            id="message"
                            value={announcement.message}
                            onChange={(e) => setAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                            placeholder="Enter announcement message..."
                            rows={4}
                          />
                        </div>
                        <div>
                          <Label htmlFor="targetAudience">Target Audience</Label>
                          <Select
                            value={announcement.targetAudience}
                            onValueChange={(value) => setAnnouncement(prev => ({ ...prev, targetAudience: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Users</SelectItem>
                              <SelectItem value="managers">Managers Only</SelectItem>
                              <SelectItem value="generators">Households Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="submit"
                            disabled={createAnnouncementMutation.isPending}
                          >
                            {createAnnouncementMutation.isPending ? "Creating..." : "Create Announcement"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Debug Information */}
            {(statsError || villagesError || managersError) && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-700">Debug Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {statsError && (
                      <div className="text-red-600">
                        <strong>Stats Error:</strong> {JSON.stringify(statsError)}
                      </div>
                    )}
                    {villagesError && (
                      <div className="text-red-600">
                        <strong>Villages Error:</strong> {JSON.stringify(villagesError)}
                      </div>
                    )}
                    {managersError && (
                      <div className="text-red-600">
                        <strong>Managers Error:</strong> {JSON.stringify(managersError)}
                      </div>
                    )}
                    <div className="text-gray-600">
                      <strong>User Info:</strong> {JSON.stringify(user)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Villages & Managers Tab */}
          <TabsContent value="villages" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assigned Villages */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Assigned Villages</CardTitle>
                </CardHeader>
                <CardContent>
                  {villagesLoading ? (
                    <div className="text-center py-4">Loading villages...</div>
                  ) : villages && villages.length > 0 ? (
                    <div className="space-y-2">
                      {villages.map((village: any) => (
                        <div
                          key={village.villageId}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{village.name}</div>
                            <div className="text-sm text-gray-500">{village.villageId}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedVillage(village.villageId)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No villages assigned yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Manager */}
              <Card>
                <CardHeader>
                  <CardTitle>Add Manager to Village</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddManager} className="space-y-4">
                    <div>
                      <Label htmlFor="villageName">Select Village</Label>
                      <Select
                        value={newVillage.villageName}
                        onValueChange={(value) => setNewVillage(prev => ({ ...prev, villageName: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a village" />
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
                      <Label htmlFor="managerName">Manager Name</Label>
                      <Input
                        id="managerName"
                        value={newVillage.managerName}
                        onChange={(e) => setNewVillage(prev => ({ ...prev, managerName: e.target.value }))}
                        placeholder="Enter manager name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="managerPhone">Manager Phone</Label>
                      <Input
                        id="managerPhone"
                        value={newVillage.managerPhone}
                        onChange={(e) => setNewVillage(prev => ({ ...prev, managerPhone: e.target.value }))}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={addManagerMutation.isPending}
                      className="w-full"
                    >
                      {addManagerMutation.isPending ? "Adding..." : "Add Manager"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Managers List */}
            <Card>
              <CardHeader>
                <CardTitle>Managers in Your Villages</CardTitle>
              </CardHeader>
              <CardContent>
                {managersLoading ? (
                  <div className="text-center py-4">Loading managers...</div>
                ) : managers && managers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Village</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {managers
                          .filter((manager: any) => villages?.some((v: any) => v.villageId === manager.villageId))
                          .map((manager: any) => (
                          <TableRow key={manager.id}>
                            <TableCell className="font-medium">{manager.name}</TableCell>
                            <TableCell>{manager.userId}</TableCell>
                            <TableCell>{manager.villageId}</TableCell>
                            <TableCell>{manager.phone || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">Active</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No managers found in your assigned villages
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reports & Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <div className="text-center py-8">Loading reports...</div>
                ) : reportData ? (
                  <div className="space-y-6">
                    {/* Village Performance Summary */}
                    {reportData.villages && reportData.villages.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Village Performance Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {reportData.villages.map((village: any) => (
                            <Card key={village.villageId}>
                              <CardContent className="p-4">
                                <div className="font-medium">{village.name}</div>
                                <div className="text-sm text-gray-500">{village.villageId}</div>
                                <div className="mt-2">
                                  <div className="text-2xl font-bold text-green-600">
                                    {reportData.collections.find((c: any) => c.villageId === village.villageId)?.collectionsCount || 0}
                                  </div>
                                  <div className="text-xs text-gray-500">Total Collections</div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Collections Data */}
                    {reportData.collections && reportData.collections.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Collection Statistics</h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Village</TableHead>
                                <TableHead>Collections</TableHead>
                                <TableHead>Avg Segregation Rating</TableHead>
                                <TableHead>Avg Plastic Rating</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reportData.collections.map((collection: any) => (
                                <TableRow key={collection.villageId}>
                                  <TableCell>{collection.villageName}</TableCell>
                                  <TableCell>{collection.collectionsCount}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {collection.avgSegregationRating?.toFixed(1) || 'N/A'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {collection.avgPlasticRating?.toFixed(1) || 'N/A'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Issues Data */}
                    {reportData.issues && reportData.issues.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Issues Summary</h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Village</TableHead>
                                <TableHead>Open Issues</TableHead>
                                <TableHead>Resolved Issues</TableHead>
                                <TableHead>Total Issues</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reportData.issues.map((issue: any) => (
                                <TableRow key={issue.villageId}>
                                  <TableCell>{issue.villageName}</TableCell>
                                  <TableCell>
                                    <Badge variant="destructive">{issue.openIssues}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{issue.resolvedIssues}</Badge>
                                  </TableCell>
                                  <TableCell>{issue.totalIssues}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No report data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={profileData.currentPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={profileData.newPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={profileData.confirmPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}