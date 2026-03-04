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

import {
  Users,
  AlertTriangle,
  Megaphone,
  LogOut,
  Settings,
  Copy,
  Download,
  Eye,
  RotateCcw,
  Building2,
  UserPlus,
  User,
  Bell,
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

  const [activeTab, setActiveTab] = useState("villages");
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

  const navigationItems = [
    { id: "villages", label: "Villages", icon: Building2 },
    { id: "managers", label: "Managers", icon: Users },
    { id: "announcements", label: "Announcements", icon: Bell },
    { id: "profile", label: "Profile", icon: User },
  ];





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
      case "villages":
        return renderVillages();
      case "managers":
        return renderManagers();
      case "announcements":
        return renderAnnouncements();
      case "profile":
        return renderProfile();
      default:
        return renderVillages();
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
          <div className="grid grid-cols-4 gap-1">
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