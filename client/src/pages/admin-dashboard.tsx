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
import { 
  Leaf, Users, AlertTriangle, TrendingUp, Plus, Megaphone, BarChart3, 
  LogOut, Settings, Copy, Download, Eye, Trash2, RotateCcw, Filter, 
  PieChart, LineChart, Building2, UserPlus, X, Home, MessageSquare,
  User, MapPin, Calendar, Activity, FileText, Bell
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';

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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage your waste management system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Villages</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVillages || 0}</div>
            <p className="text-xs text-muted-foreground">Active communities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Managers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalManagers || 0}</div>
            <p className="text-xs text-muted-foreground">Village managers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOpenIssues || 0}</div>
            <p className="text-xs text-muted-foreground">Pending resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Collections</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCollectionsToday || 0}</div>
            <p className="text-xs text-muted-foreground">Waste collections</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={() => setActiveTab("villages")} className="h-24 flex flex-col">
              <Plus className="h-8 w-8 mb-2" />
              <span className="text-sm">Add Village</span>
            </Button>
            <Button onClick={() => setActiveTab("managers")} variant="outline" className="h-24 flex flex-col">
              <UserPlus className="h-8 w-8 mb-2" />
              <span className="text-sm">Manage Users</span>
            </Button>
            <Button onClick={() => setActiveTab("announcements")} variant="outline" className="h-24 flex flex-col">
              <Megaphone className="h-8 w-8 mb-2" />
              <span className="text-sm">Send Message</span>
            </Button>
            <Button onClick={() => setActiveTab("reports")} variant="outline" className="h-24 flex flex-col">
              <BarChart3 className="h-8 w-8 mb-2" />
              <span className="text-sm">View Reports</span>
            </Button>
            <Button onClick={() => setActiveTab("profile")} variant="outline" className="h-24 flex flex-col">
              <Settings className="h-8 w-8 mb-2" />
              <span className="text-sm">Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">System running smoothly</p>
                <p className="text-xs text-muted-foreground">All villages operational</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{stats?.totalCollectionsToday || 0} collections today</p>
                <p className="text-xs text-muted-foreground">Waste management active</p>
              </div>
            </div>
            {stats?.totalOpenIssues > 0 && (
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div className="flex-1">
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Village Management</h2>
          <p className="text-muted-foreground">Create and manage villages</p>
        </div>
        <div className="space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Village
              </Button>
            </DialogTrigger>
            <DialogContent>
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
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Bulk Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Multiple Villages</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {villageList.map((village, index) => (
                  <div key={index} className="border p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Village {index + 1}</h4>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input
                        placeholder="Village Name"
                        value={village.villageName}
                        onChange={(e) => updateVillageInList(index, 'villageName', e.target.value)}
                      />
                      <Input
                        placeholder="Manager Name"
                        value={village.managerName}
                        onChange={(e) => updateVillageInList(index, 'managerName', e.target.value)}
                      />
                      <Input
                        placeholder="Manager Phone"
                        value={village.managerPhone}
                        onChange={(e) => updateVillageInList(index, 'managerPhone', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
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
        <CardHeader>
          <CardTitle>All Villages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Village ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Households</TableHead>
                  <TableHead>Collectors</TableHead>
                  <TableHead>Open Issues</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {villages?.map((village: any) => (
                  <TableRow key={village.id}>
                    <TableCell className="font-medium">{village.villageId}</TableCell>
                    <TableCell>{village.name}</TableCell>
                    <TableCell>{village.totalHouseholds || 0}</TableCell>
                    <TableCell>{village.totalCollectors || 0}</TableCell>
                    <TableCell>
                      <Badge variant={village.openIssues > 0 ? "destructive" : "secondary"}>
                        {village.openIssues || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedVillage(village.villageId)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteVillageMutation.mutate(village.villageId)}
                        >
                          <Trash2 className="h-4 w-4" />
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
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Village Details - {villageDetails.village?.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{villageDetails.stats?.totalHouseholds || 0}</div>
                    <div className="text-sm text-muted-foreground">Households</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{villageDetails.stats?.totalCollectors || 0}</div>
                    <div className="text-sm text-muted-foreground">Collectors</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{villageDetails.stats?.openIssues || 0}</div>
                    <div className="text-sm text-muted-foreground">Open Issues</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{villageDetails.stats?.collectionsToday || 0}</div>
                    <div className="text-sm text-muted-foreground">Collections Today</div>
                  </CardContent>
                </Card>
              </div>

              {/* Village Performance Charts */}
              {villageDetails.recentCollections && villageDetails.recentCollections.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Collection Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={villageDetails.recentCollections.slice(0, 7)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="collectionDate" 
                            tickFormatter={(date) => new Date(date).toLocaleDateString()}
                          />
                          <YAxis domain={[0, 5]} />
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
                    <CardHeader>
                      <CardTitle>Collection Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <RechartsPieChart>
                          <Pie
                            data={[
                              { name: 'Completed', value: villageDetails.recentCollections.filter((c: any) => c.status === 'collected').length },
                              { name: 'Pending', value: villageDetails.recentCollections.filter((c: any) => c.status === 'pending').length },
                              { name: 'Missed', value: villageDetails.recentCollections.filter((c: any) => c.status === 'missed').length },
                            ]}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Managers</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Manager
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
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
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Manager ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {villageDetails.managers?.map((manager: any) => (
                          <TableRow key={manager.id}>
                            <TableCell>{manager.userId}</TableCell>
                            <TableCell>{manager.name}</TableCell>
                            <TableCell>{manager.phone}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resetPasswordMutation.mutate(manager.userId)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteManagerMutation.mutate(manager.userId)}
                                >
                                  <Trash2 className="h-4 w-4" />
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Households</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>UID</TableHead>
                            <TableHead>Head Name</TableHead>
                            <TableHead>House Number</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {villageDetails.households?.slice(0, 5).map((household: any) => (
                            <TableRow key={household.id}>
                              <TableCell>{household.uid}</TableCell>
                              <TableCell>{household.headName}</TableCell>
                              <TableCell>{household.houseNumber}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Issues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {villageDetails.issues?.slice(0, 5).map((issue: any) => (
                            <TableRow key={issue.id}>
                              <TableCell>{issue.title}</TableCell>
                              <TableCell>
                                <Badge variant={issue.status === 'open' ? 'destructive' : 'default'}>
                                  {issue.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{new Date(issue.createdAt).toLocaleDateString()}</TableCell>
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

      {/*       Credentials Display Modal */}
      {createdCredentials && (
        <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manager Credentials Created</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="space-y-2">
                  <div><strong>User ID:</strong> {createdCredentials.userId}</div>
                  <div><strong>Password:</strong> {createdCredentials.password}</div>
                </div>
              </div>
              <div className="flex space-x-2">
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Manager Management</h2>
        <p className="text-muted-foreground">Manage all village managers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Managers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manager ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Village</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers?.map((manager: any) => (
                  <TableRow key={manager.id}>
                    <TableCell className="font-medium">{manager.userId}</TableCell>
                    <TableCell>{manager.name}</TableCell>
                    <TableCell>{manager.villageId}</TableCell>
                    <TableCell>{manager.phone}</TableCell>
                    <TableCell>
                      <Badge variant="default">Active</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetPasswordMutation.mutate(manager.userId)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteManagerMutation.mutate(manager.userId)}
                        >
                          <Trash2 className="h-4 w-4" />
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Reports & Analytics</h2>
        <p className="text-muted-foreground">Comprehensive system reports with charts and insights</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <Input
              type="date"
              placeholder="Start Date"
              value={reportFilters.startDate}
              onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })}
            />
            <Input
              type="date"
              placeholder="End Date"
              value={reportFilters.endDate}
              onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })}
            />
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/reports"] })}>
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportData.collections?.reduce((sum: number, item: any) => sum + parseInt(item.collections || 0), 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">Waste collections made</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportData.issues?.reduce((sum: number, item: any) => sum + parseInt(item.totalIssues || 0), 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">Reported issues</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Segregation</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportData.collections?.length > 0 
                    ? (reportData.collections.reduce((sum: number, item: any) => sum + (parseFloat(item.avgSegregationRating) || 0), 0) / reportData.collections.length).toFixed(1)
                    : '0.0'
                  }
                </div>
                <p className="text-xs text-muted-foreground">Out of 5.0</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Plastic Rating</CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportData.collections?.length > 0 
                    ? (reportData.collections.reduce((sum: number, item: any) => sum + (parseFloat(item.avgPlasticRating) || 0), 0) / reportData.collections.length).toFixed(1)
                    : '0.0'
                  }
                </div>
                <p className="text-xs text-muted-foreground">Out of 5.0</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Collections by Village</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.collections && reportData.collections.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.collections}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="villageName" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [value, name === 'collections' ? 'Collections' : name]} />
                      <Bar dataKey="collections" fill="#0088FE" name="Collections" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No collection data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Issues Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.issues && reportData.issues.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={reportData.issues}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ villageName, totalIssues }) => `${villageName}: ${totalIssues}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="totalIssues"
                        nameKey="villageName"
                      >
                        {reportData.issues.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No issue data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Ratings</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.collections && reportData.collections.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.collections}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="villageName" angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Bar dataKey="avgSegregationRating" fill="#00C49F" name="Segregation Rating" />
                      <Bar dataKey="avgPlasticRating" fill="#FFBB28" name="Plastic Rating" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No performance data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Issue Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.issues && reportData.issues.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.issues}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="villageName" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="openIssues" stackId="a" fill="#FF8042" name="Open Issues" />
                      <Bar dataKey="resolvedIssues" stackId="a" fill="#0088FE" name="Resolved Issues" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No issue status data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Collection Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Village</TableHead>
                        <TableHead>Collections</TableHead>
                        <TableHead>Avg Segregation</TableHead>
                        <TableHead>Avg Plastic</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.collections?.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.villageName}</TableCell>
                          <TableCell>{item.collections}</TableCell>
                          <TableCell>
                            <Badge variant={parseFloat(item.avgSegregationRating || 0) >= 4 ? "default" : "secondary"}>
                              {item.avgSegregationRating ? parseFloat(item.avgSegregationRating).toFixed(1) : 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={parseFloat(item.avgPlasticRating || 0) >= 4 ? "default" : "secondary"}>
                              {item.avgPlasticRating ? parseFloat(item.avgPlasticRating).toFixed(1) : 'N/A'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Issues by Village</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Village</TableHead>
                        <TableHead>Total Issues</TableHead>
                        <TableHead>Open</TableHead>
                        <TableHead>Resolved</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.issues?.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.villageName}</TableCell>
                          <TableCell>{item.totalIssues}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{item.openIssues}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">{item.resolvedIssues}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {reportLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading reports...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAnnouncements = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Announcements</h2>
        <p className="text-muted-foreground">Send messages to users across villages</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send Announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={announcement.message}
              onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
              placeholder="Type your announcement..."
              rows={4}
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Profile Settings</h2>
        <p className="text-muted-foreground">Manage your admin account</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="profileName">Name</Label>
            <Input
              id="profileName"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              placeholder="Enter your name"
            />
          </div>
          <div>
            <Label htmlFor="userId">User ID (Cannot be changed)</Label>
            <Input
              id="userId"
              value={user?.userId || ""}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={profileData.currentPassword}
                  onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
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
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
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

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}