
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

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedVillage, setSelectedVillage] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  const [villageList, setVillageList] = useState([{ villageName: "", managerName: "", managerPhone: "" }]);

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

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats/admin"],
  });

  // Fetch villages
  const { data: villages, isLoading: villagesLoading } = useQuery({
    queryKey: ["/api/villages"],
  });

  // Fetch managers
  const { data: managers, isLoading: managersLoading } = useQuery({
    queryKey: ["/api/managers"],
  });

  // Fetch reports
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ["/api/reports", reportFilters],
    enabled: activeTab === "reports",
  });

  // Fetch system analytics
  const { data: systemAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/analytics/system"],
    enabled: activeTab === "reports",
  });

  // Fetch daily analytics
  const { data: dailyAnalytics, isLoading: dailyLoading } = useQuery({
    queryKey: ["/api/analytics/daily", reportFilters.village, reportFilters.startDate],
    enabled: activeTab === "reports",
  });

  // Village details query
  const { data: villageDetails } = useQuery({
    queryKey: ["/api/villages", selectedVillage, "details"],
    enabled: !!selectedVillage,
  });

  // Create village mutation
  const createVillageMutation = useMutation({
    mutationFn: async (data: typeof newVillage) => {
      const response = await apiRequest("POST", "/api/villages", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Village and manager created successfully",
      });
      setCreatedCredentials(data.manager.credentials);
      setNewVillage({ villageName: "", managerName: "", managerPhone: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create village",
        variant: "destructive",
      });
    },
  });

  // Create multiple villages mutation
  const createMultipleVillagesMutation = useMutation({
    mutationFn: async (villages: typeof villageList) => {
      const results = [];
      for (const village of villages) {
        if (village.villageName && village.managerName) {
          const response = await apiRequest("POST", "/api/villages", village);
          const data = await response.json();
          results.push(data);
        }
      }
      return results;
    },
    onSuccess: (results) => {
      toast({
        title: "Success",
        description: `${results.length} villages created successfully`,
      });
      setVillageList([{ villageName: "", managerName: "", managerPhone: "" }]);
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create villages",
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

  // Delete village mutation
  const deleteVillageMutation = useMutation({
    mutationFn: async (villageId: string) => {
      const response = await apiRequest("DELETE", `/api/villages/${villageId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Village deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete village",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (managerId: string) => {
      const response = await apiRequest("PUT", `/api/managers/${managerId}/reset-password`);
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

  // Delete manager mutation
  const deleteManagerMutation = useMutation({
    mutationFn: async (managerId: string) => {
      const response = await apiRequest("DELETE", `/api/managers/${managerId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Manager deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/admin"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete manager",
        variant: "destructive",
      });
    },
  });

  // Add manager to village mutation
  const addManagerMutation = useMutation({
    mutationFn: async ({ villageId, managerName, managerPhone }: { villageId: string; managerName: string; managerPhone: string }) => {
      const response = await apiRequest("POST", `/api/villages/${villageId}/managers`, { managerName, managerPhone });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Manager added successfully",
      });
      setCreatedCredentials(data.manager.credentials);
      queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add manager",
        variant: "destructive",
      });
    },
  });

  const addVillageToList = () => {
    setVillageList([...villageList, { villageName: "", managerName: "", managerPhone: "" }]);
  };

  const removeVillageFromList = (index: number) => {
    if (villageList.length > 1) {
      setVillageList(villageList.filter((_, i) => i !== index));
    }
  };

  const updateVillageInList = (index: number, field: string, value: string) => {
    const updated = [...villageList];
    updated[index] = { ...updated[index], [field]: value };
    setVillageList(updated);
  };

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
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credentials-${credentials.userId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const navigationItems = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "villages", label: "Villages", icon: Building2 },
    { id: "managers", label: "Managers", icon: Users },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "profile", label: "Profile", icon: User },
  ];

  const renderOverview = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage your waste management system</p>
      </div>

      {/* Stats Cards - Mobile Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Total Villages</CardTitle>
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats?.totalVillages || 0}</div>
            <p className="text-xs text-muted-foreground">Active communities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Total Managers</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats?.totalManagers || 0}</div>
            <p className="text-xs text-muted-foreground">Village managers</p>
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

      {/* Quick Actions - Mobile Responsive */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <Button onClick={() => setActiveTab("villages")} className="h-16 sm:h-24 flex flex-col text-xs sm:text-sm">
              <Plus className="h-4 w-4 sm:h-8 sm:w-8 mb-1 sm:mb-2" />
              <span>Add Village</span>
            </Button>
            <Button onClick={() => setActiveTab("managers")} variant="outline" className="h-16 sm:h-24 flex flex-col text-xs sm:text-sm">
              <UserPlus className="h-4 w-4 sm:h-8 sm:w-8 mb-1 sm:mb-2" />
              <span>Manage Users</span>
            </Button>
            <Button onClick={() => setActiveTab("announcements")} variant="outline" className="h-16 sm:h-24 flex flex-col text-xs sm:text-sm">
              <Megaphone className="h-4 w-4 sm:h-8 sm:w-8 mb-1 sm:mb-2" />
              <span>Send Message</span>
            </Button>
            <Button onClick={() => setActiveTab("reports")} variant="outline" className="h-16 sm:h-24 flex flex-col text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4 sm:h-8 sm:w-8 mb-1 sm:mb-2" />
              <span>View Reports</span>
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
                <p className="text-sm font-medium">System running smoothly</p>
                <p className="text-xs text-muted-foreground">All villages operational</p>
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
          <h2 className="text-2xl sm:text-3xl font-bold">Village Management</h2>
          <p className="text-muted-foreground">Create and manage villages</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Village
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Village</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="villageName">Village Name</Label>
                  <Input
                    id="villageName"
                    value={newVillage.villageName}
                    onChange={(e) => setNewVillage({ ...newVillage, villageName: e.target.value })}
                    placeholder="Enter village name"
                  />
                </div>
                <div>
                  <Label htmlFor="managerName">Manager Name</Label>
                  <Input
                    id="managerName"
                    value={newVillage.managerName}
                    onChange={(e) => setNewVillage({ ...newVillage, managerName: e.target.value })}
                    placeholder="Enter manager name"
                  />
                </div>
                <div>
                  <Label htmlFor="managerPhone">Manager Phone</Label>
                  <Input
                    id="managerPhone"
                    value={newVillage.managerPhone}
                    onChange={(e) => setNewVillage({ ...newVillage, managerPhone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <Button 
                  onClick={() => createVillageMutation.mutate(newVillage)}
                  disabled={createVillageMutation.isPending}
                  className="w-full"
                >
                  {createVillageMutation.isPending ? "Creating..." : "Create Village"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Bulk Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Multiple Villages</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {villageList.map((village, index) => (
                  <div key={index} className="border p-3 sm:p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-sm sm:text-base">Village {index + 1}</h4>
                      {villageList.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVillageFromList(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <Input
                        placeholder="Village Name"
                        value={village.villageName}
                        onChange={(e) => updateVillageInList(index, 'villageName', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Manager Name"
                        value={village.managerName}
                        onChange={(e) => updateVillageInList(index, 'managerName', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Manager Phone"
                        value={village.managerPhone}
                        onChange={(e) => updateVillageInList(index, 'managerPhone', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={addVillageToList} variant="outline" className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Village
                  </Button>
                  <Button 
                    onClick={() => createMultipleVillagesMutation.mutate(villageList)}
                    disabled={createMultipleVillagesMutation.isPending}
                    className="flex-1"
                  >
                    {createMultipleVillagesMutation.isPending ? "Creating..." : "Create All Villages"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteVillageMutation.mutate(village.villageId)}
                          className="p-1 sm:p-2"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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
        <Dialog open={!!selectedVillage} onOpenChange={() => setSelectedVillage("")}>
          <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Village Details - {villageDetails.village?.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-lg sm:text-2xl font-bold">{villageDetails.stats?.totalHouseholds || 0}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Households</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-lg sm:text-2xl font-bold">{villageDetails.stats?.totalCollectors || 0}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Collectors</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-lg sm:text-2xl font-bold">{villageDetails.stats?.openIssues || 0}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Open Issues</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-lg sm:text-2xl font-bold">{villageDetails.stats?.collectionsToday || 0}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Collections Today</div>
                  </CardContent>
                </Card>
              </div>

              {/* Village Performance Charts */}
              {villageDetails.recentCollections && villageDetails.recentCollections.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <Card>
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-sm sm:text-base">Recent Collection Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={villageDetails.recentCollections.slice(0, 7)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="collectionDate" 
                            tickFormatter={(date) => new Date(date).toLocaleDateString()}
                            fontSize={12}
                          />
                          <YAxis domain={[0, 5]} fontSize={12} />
                          <Tooltip 
                            labelFormatter={(date) => new Date(date).toLocaleDateString()}
                          />
                          <Bar dataKey="segregationRating" fill="#00C49F" name="Segregation Rating" />
                          <Bar dataKey="plasticRating" fill="#FFBB28" name="Plastic Rating" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-sm sm:text-base">Collection Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0">
                      <ResponsiveContainer width="100%" height={200}>
                        <RechartsPieChart>
                          <Pie
                            data={[
                              { name: 'Completed', value: villageDetails.recentCollections.filter((c: any) => c.status === 'collected').length },
                              { name: 'Pending', value: villageDetails.recentCollections.filter((c: any) => c.status === 'pending').length },
                              { name: 'Missed', value: villageDetails.recentCollections.filter((c: any) => c.status === 'missed').length },
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
                        <DialogTitle>Add Manager to {villageDetails.village?.name}</DialogTitle>
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
                            const nameInput = document.getElementById('newManagerName') as HTMLInputElement;
                            const phoneInput = document.getElementById('newManagerPhone') as HTMLInputElement;
                            if (nameInput.value && phoneInput.value) {
                              addManagerMutation.mutate({
                                villageId: selectedVillage,
                                managerName: nameInput.value,
                                managerPhone: phoneInput.value
                              });
                              nameInput.value = '';
                              phoneInput.value = '';
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
                          <TableHead className="text-xs sm:text-sm">Manager ID</TableHead>
                          <TableHead className="text-xs sm:text-sm">Name</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Phone</TableHead>
                          <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {villageDetails.managers?.map((manager: any) => (
                          <TableRow key={manager.id}>
                            <TableCell className="text-xs sm:text-sm">{manager.userId}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{manager.name}</TableCell>
                            <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{manager.phone}</TableCell>
                            <TableCell>
                              <div className="flex space-x-1 sm:space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resetPasswordMutation.mutate(manager.userId)}
                                  className="p-1 sm:p-2"
                                >
                                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteManagerMutation.mutate(manager.userId)}
                                  className="p-1 sm:p-2"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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
                    <CardTitle className="text-lg sm:text-xl">Recent Households</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">UID</TableHead>
                            <TableHead className="text-xs sm:text-sm">Head Name</TableHead>
                            <TableHead className="text-xs sm:text-sm">House Number</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {villageDetails.households?.slice(0, 5).map((household: any) => (
                            <TableRow key={household.id}>
                              <TableCell className="text-xs sm:text-sm">{household.uid}</TableCell>
                              <TableCell className="text-xs sm:text-sm">{household.headName}</TableCell>
                              <TableCell className="text-xs sm:text-sm">{household.houseNumber}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">Recent Issues</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Title</TableHead>
                            <TableHead className="text-xs sm:text-sm">Status</TableHead>
                            <TableHead className="text-xs sm:text-sm">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {villageDetails.issues?.slice(0, 5).map((issue: any) => (
                            <TableRow key={issue.id}>
                              <TableCell className="text-xs sm:text-sm">{issue.title}</TableCell>
                              <TableCell>
                                <Badge variant={issue.status === 'open' ? 'destructive' : 'default'} className="text-xs">
                                  {issue.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">{new Date(issue.createdAt).toLocaleDateString()}</TableCell>
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
        <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manager Credentials Created</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted p-3 sm:p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="text-sm sm:text-base"><strong>User ID:</strong> {createdCredentials.userId}</div>
                  <div className="text-sm sm:text-base"><strong>Password:</strong> {createdCredentials.password}</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button onClick={() => copyCredentials(createdCredentials)} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button onClick={() => downloadCredentials(createdCredentials)} variant="outline" className="flex-1">
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Manager ID</TableHead>
                  <TableHead className="text-xs sm:text-sm">Name</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden md:table-cell">Village</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers?.map((manager: any) => (
                  <TableRow key={manager.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">{manager.userId}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{manager.name}</TableCell>
                    <TableCell className="text-xs sm:text-sm hidden md:table-cell">{manager.villageId}</TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{manager.phone}</TableCell>
                    <TableCell>
                      <Badge variant="default" className="text-xs">Active</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1 sm:space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetPasswordMutation.mutate(manager.userId)}
                          className="p-1 sm:p-2"
                        >
                          <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteManagerMutation.mutate(manager.userId)}
                          className="p-1 sm:p-2"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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
        <p className="text-muted-foreground">Comprehensive performance insights and trends across all villages</p>
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
                  <Select value={reportFilters.village} onValueChange={(value) => setReportFilters({ ...reportFilters, village: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Village" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Villages</SelectItem>
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
              <p className="text-xs text-muted-foreground mt-2">
                {reportFilters.village === "all" ? "Showing overall analytics for all villages" : `Showing analytics for ${villages?.find(v => v.villageId === reportFilters.village)?.name || "selected village"}`}
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
                    if (!reportData?.collections) return systemAnalytics?.totalCollectionsThisWeek || 0;
                    const filteredCollections = reportFilters.village === "all" 
                      ? reportData.collections 
                      : reportData.collections.filter((c: any) => c.villageId === reportFilters.village);
                    const totalCollections = filteredCollections.reduce((sum: number, item: any) => sum + parseInt(item.collections || 0), 0);
                    return totalCollections;
                  })()}
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Total collections completed
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
                    if (!reportData?.collections) return systemAnalytics?.averageSegregationRating?.toFixed(1) || "0.0";
                    const filteredCollections = reportFilters.village === "all" 
                      ? reportData.collections 
                      : reportData.collections.filter((c: any) => c.villageId === reportFilters.village);
                    return filteredCollections.length > 0
                      ? (filteredCollections.reduce((sum: number, item: any) => sum + (parseFloat(item.avgSegregationRating) || 0), 0) / filteredCollections.length).toFixed(1)
                      : "0.0";
                  })()}
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Out of 5.0 stars
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
                    const dateStr = date.toISOString().split('T')[0];
                    
                    // Find real data for this date
                    const dayData = systemAnalytics?.collectionTrends?.find((trend: any) => 
                      trend.date === dateStr
                    );
                    const collectionsForDay = dayData?.collections || 0;
                    const maxCollections = Math.max(
                      ...(systemAnalytics?.collectionTrends?.map((t: any) => t.collections) || [50]), 
                      50
                    );
                    const percentage = maxCollections > 0 ? (collectionsForDay / maxCollections) * 100 : 0;
                    
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
                          {collectionsForDay > 0 && (
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                              {collectionsForDay}
                            </span>
                          )}
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
                    const dateStr = date.toISOString().split('T')[0];
                    
                    // Find real data for this date
                    const dayData = systemAnalytics?.collectionTrends?.find((trend: any) => 
                      trend.date === dateStr
                    );
                    const avgRating = dayData?.avgRating || 0;
                    
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-16 text-xs text-muted-foreground">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                          <div 
                            className={`h-4 rounded-full transition-all ${
                              avgRating >= 4 ? 'bg-green-500' : 
                              avgRating >= 3 ? 'bg-yellow-500' : 
                              avgRating > 0 ? 'bg-red-500' : 'bg-gray-300'
                            }`}
                            style={{ width: `${avgRating > 0 ? (avgRating / 5) * 100 : 0}%` }}
                          />
                        </div>
                        <div className="w-12 text-xs text-right font-medium">
                          {avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}
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
                    // Calculate segregation rates from real data
                    const distribution = systemAnalytics?.segregationRateDistribution || [];
                    const excellent = distribution.filter((d: any) => d.rating >= 4).reduce((sum: number, d: any) => sum + d.count, 0);
                    const good = distribution.filter((d: any) => d.rating >= 3 && d.rating < 4).reduce((sum: number, d: any) => sum + d.count, 0);
                    const poor = distribution.filter((d: any) => d.rating < 3 && d.rating > 0).reduce((sum: number, d: any) => sum + d.count, 0);
                    const total = excellent + good + poor || 1;
                    
                    return (
                      <div className="w-48 h-48 relative">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="20"/>
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
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {Math.round((excellent / total) * 100)}%
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

            {/* 4. Village Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  Village Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(systemAnalytics?.topPerformingVillages || reportData?.collections || []).slice(0, 6).map((village: any, index: number) => {
                    const avgRating = parseFloat(village.avgRating || village.avgSegregationRating) || 0;
                    const collections = parseInt(village.collections) || 0;
                    
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium truncate">{village.villageName || village.name}</span>
                          <span>{collections} collections</span>
                        </div>
                        <div className="flex h-6 bg-gray-200 rounded overflow-hidden">
                          <div 
                            className={`transition-all ${
                              avgRating >= 4 ? 'bg-green-500' : 
                              avgRating >= 3 ? 'bg-yellow-500' : 
                              avgRating > 0 ? 'bg-red-500' : 'bg-gray-300'
                            }`}
                            style={{ width: `${avgRating > 0 ? (avgRating / 5) * 100 : 0}%` }}
                            title={`Rating: ${avgRating.toFixed(1)}`}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          {avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}/5.0
                        </div>
                      </div>
                    );
                  })}
                  {(!systemAnalytics?.topPerformingVillages && !reportData?.collections) && (
                    <p className="text-center text-muted-foreground py-4">No village data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 5. Home Composting Rate */}
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
                    // Mock data for composting
                    const composting = 78;
                    const notComposting = 22;
                    
                    return (
                      <div className="w-40 h-40 relative">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          <circle cx="50" cy="50" r="35" fill="none" stroke="#f3f4f6" strokeWidth="25"/>
                          <circle 
                            cx="50" cy="50" r="35" fill="none" 
                            stroke="#22c55e" strokeWidth="25"
                            strokeDasharray={`${(composting/100) * 219.9} 219.9`}
                            strokeDashoffset="0"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-xl font-bold text-green-600">
                              {composting}%
                            </div>
                            <div className="text-xs text-muted-foreground">Composting</div>
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
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 bg-gray-300 rounded mx-auto mb-1"></div>
                    <div className="text-xs">Not Composting</div>
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
                      <p className="text-xs text-muted-foreground">Active communities</p>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {systemAnalytics?.totalVillages || villages?.length || 0}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Total Households</p>
                      <p className="text-xs text-muted-foreground">Registered users</p>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {systemAnalytics?.totalHouseholds || 0}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Total Collectors</p>
                      <p className="text-xs text-muted-foreground">Active staff</p>
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
                  <Select value={reportFilters.village} onValueChange={(value) => setReportFilters({ ...reportFilters, village: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Village" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Villages</SelectItem>
                      {villages?.map((village: any) => (
                        <SelectItem key={village.villageId} value={village.villageId}>
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
                    value={reportFilters.startDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setReportFilters({ ...reportFilters, startDate: new Date().toISOString().split('T')[0] })}>
                  Today
                </Button>
                <Button variant="outline" onClick={() => setReportFilters({ ...reportFilters, village: "all" })}>
                  All Villages
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Showing daily report for {reportFilters.village === "all" ? "all villages" : villages?.find(v => v.villageId === reportFilters.village)?.name || "selected village"} on {new Date(reportFilters.startDate || new Date()).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          {/* Daily KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-800">Avg Segregation Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-900">
                  {(() => {
                    const rating = dailyAnalytics?.avgSegregationRating;
                    if (rating == null) return "0.0";
                    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
                    return isNaN(numRating) ? "0.0" : numRating.toFixed(1);
                  })()}
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
                  {dailyAnalytics?.totalHouses || 0}
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
                  {dailyAnalytics?.collected || 0}
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
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="20"/>
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
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {Math.round((collected / total) * 100)}%
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
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  Segregation Rating Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map(stars => {
                    // Use real data for star distribution
                    const ratingData = dailyAnalytics?.ratingDistribution || [];
                    const starCount = ratingData.find((r: any) => r.rating === stars)?.count || 0;
                    const total = ratingData.reduce((sum: number, r: any) => sum + r.count, 0) || 1;
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

            {/* 3. Village Performance for the Day */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  {reportFilters.village === "all" ? "Village Performance Today" : "Collector Performance Today"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dailyAnalytics?.villagePerformance?.length > 0 ? (
                    dailyAnalytics.villagePerformance.slice(0, 5).map((performer: any, index: number) => {
                      const collections = performer.collections || 0;
                      const avgRating = performer.avgRating || 0;
                      
                      return (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{performer.name}</h4>
                            <Badge variant="outline">{collections} collections</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  avgRating >= 4 ? 'bg-green-500' : 
                                  avgRating >= 3 ? 'bg-yellow-500' : 
                                  avgRating > 0 ? 'bg-red-500' : 'bg-gray-300'
                                }`}
                                style={{ width: `${avgRating > 0 ? (avgRating / 5) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No performance data available for selected date</p>
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
                    const hour = i + 8; // Start from 8 AM
                    const timelineData = dailyAnalytics?.collectionTimeline || [];
                    const hourData = timelineData.find((t: any) => t.hour === hour);
                    const hourCollections = hourData?.collections || 0;
                    const maxCollections = Math.max(
                      ...timelineData.map((t: any) => t.collections), 
                      25
                    );
                    const percentage = maxCollections > 0 ? (hourCollections / maxCollections) * 100 : 0;
                    
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
        <p className="text-muted-foreground">Send messages to users across villages</p>
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
        <p className="text-muted-foreground">Manage your admin account</p>
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
      case "managers": return renderManagers();
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
              <p className="text-xs text-muted-foreground">Admin Panel</p>
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
                  <p className="text-sm text-muted-foreground">Admin Panel</p>
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
                  <p className="text-xs text-muted-foreground">Administrator</p>
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
