import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient, fetchWithCsrf } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, User, Building2, Bell, Settings, LogOut, Plus,
  MessageSquare, Eye, Trash2, ClipboardList, RotateCcw,
  UserPlus, X, FileText, FileDown, Copy, Download,
  AlertTriangle, Megaphone, Star, Award, Package, Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ActivityLog from "@/components/ActivityLog";
import { UNIT_TYPES } from '@/constants/unitTypes';
import { DataExportWizard } from "@/components/DataExportWizard";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("villages");

  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  const [villageList, setVillageList] = useState([{ villageName: "", managerName: "", managerPhone: "", unitType: "gram_panchayat" }]);

  const [newVillage, setNewVillage] = useState({
    villageName: "",
    managerName: "",
    managerPhone: "",
    unitType: "gram_panchayat",
    maxHouseholds: 0,
  });

  const [newModerator, setNewModerator] = useState({
    name: "",
    phone: "",
    email: "",
    villageIds: [] as string[],
  });

  const [bulkAssignVillages, setBulkAssignVillages] = useState<string[]>([]);

  const [announcement, setAnnouncement] = useState<any>({
    message: "",
    targetAudience: "all",
    photoFile: null,
  });

  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [deleteAnnouncementId, setDeleteAnnouncementId] = useState<string | null>(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });



  // Fetch villages
  const { data: villages, isLoading: villagesLoading } = useQuery<any[]>({
    queryKey: ["/api/villages"],
  });

  // Fetch managers
  const { data: managers, isLoading: managersLoading } = useQuery<any[]>({
    queryKey: ["/api/managers"],
  });

  // Fetch moderators
  const { data: moderators, isLoading: moderatorsLoading } = useQuery<any[]>({
    queryKey: ["/api/moderators"],
  });



  // Fetch existing announcements
  const { data: existingAnnouncements, isLoading: announcementsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/announcements"],
    enabled: activeTab === "announcements",
  });

  // Fetch website feedback submissions
  const { data: websiteFeedback, isLoading: feedbackLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/website-feedback"],
    enabled: activeTab === "website-feedback",
  });

  // Fetch contact submissions
  const { data: contactSubmissions, isLoading: contactLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/contact-submissions"],
    enabled: activeTab === "contact-submissions",
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
        description: "Organization and manager created successfully",
      });
      setCreatedCredentials(data.manager.credentials);
      setNewVillage({ villageName: "", managerName: "", managerPhone: "", unitType: "gram_panchayat", maxHouseholds: 0 });
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create organization",
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
        description: `${results.length} organizations created successfully`,
      });
      setVillageList([{ villageName: "", managerName: "", managerPhone: "", unitType: "gram_panchayat" }]);
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create organizations",
        variant: "destructive",
      });
    },
  });

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: any) => {
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
      const response = await apiRequest("POST", "/api/announcements", {
        message: data.message,
        targetAudience: data.targetAudience,
        photoUrl: photoUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Announcement sent successfully",
      });
      setAnnouncement({ message: "", targetAudience: "all", photoFile: null });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send announcement",
        variant: "destructive",
      });
    },
  });

  // Edit announcement mutation
  const editAnnouncementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      let photoUrl = data.photoUrl;

      // Upload new photo if provided
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
        }
      }

      const response = await apiRequest("PUT", `/api/announcements/${id}`, {
        message: data.message,
        targetAudience: data.targetAudience,
        photoUrl: photoUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Announcement updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update announcement",
        variant: "destructive",
      });
    },
  });

  // Delete announcement mutation
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const response = await apiRequest("DELETE", `/api/announcements/${announcementId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Announcement deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete announcement",
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
    onError: (_error: unknown) => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
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
        description: "Organization deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete organization",
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
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete manager",
        variant: "destructive",
      });
    },
  });

  // Create moderator mutation
  const createModeratorMutation = useMutation({
    mutationFn: async (data: typeof newModerator) => {
      const response = await apiRequest("POST", "/api/moderators", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Moderator created successfully",
      });
      setCreatedCredentials(data.credentials);
      setNewModerator({ name: "", phone: "", email: "", villageIds: [] });
      queryClient.invalidateQueries({ queryKey: ["/api/moderators"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create moderator",
        variant: "destructive",
      });
    },
  });

  // Delete moderator mutation
  const deleteModeratorMutation = useMutation({
    mutationFn: async (moderatorId: string) => {
      const response = await apiRequest("DELETE", `/api/moderators/${moderatorId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Moderator deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/moderators"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete moderator",
        variant: "destructive",
      });
    },
  });

  // Reset moderator password mutation
  const resetModeratorPasswordMutation = useMutation({
    mutationFn: async (moderatorId: string) => {
      const response = await apiRequest("PUT", `/api/moderators/${moderatorId}/reset-password`);
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

  const toggleLocationServicesMutation = useMutation({
    mutationFn: async ({ villageId, locationServicesEnabled }: { villageId: string; locationServicesEnabled: boolean }) => {
      const response = await apiRequest("PUT", `/api/villages/${villageId}`, { locationServicesEnabled });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Location services settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update location services settings",
        variant: "destructive",
      });
    },
  });

  const toggleImageUploadRequiredMutation = useMutation({
    mutationFn: async ({ villageId, imageUploadRequired }: { villageId: string; imageUploadRequired: boolean }) => {
      const response = await apiRequest("PUT", `/api/villages/${villageId}`, { imageUploadRequired });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Image upload settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update image upload settings",
        variant: "destructive",
      });
    },
  });

  const toggleProximityAlertsMutation = useMutation({
    mutationFn: async ({ villageId, proximityAlertsEnabled }: { villageId: string; proximityAlertsEnabled: boolean }) => {
      const response = await apiRequest("PUT", `/api/villages/${villageId}`, { proximityAlertsEnabled });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proximity alerts settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update proximity alerts settings",
        variant: "destructive",
      });
    },
  });

  const togglePaymentsEnabledMutation = useMutation({
    mutationFn: async ({ villageId, paymentsEnabled }: { villageId: string; paymentsEnabled: boolean }) => {
      const response = await apiRequest("PUT", `/api/villages/${villageId}`, { paymentsEnabled });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payments settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update payments settings",
        variant: "destructive",
      });
    },
  });

  const toggleAttendanceEnabledMutation = useMutation({
    mutationFn: async ({ villageId, attendanceEnabled }: { villageId: string; attendanceEnabled: boolean }) => {
      const response = await apiRequest("PUT", `/api/villages/${villageId}`, { attendanceEnabled });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update attendance settings",
        variant: "destructive",
      });
    },
  });

  // Assign village to moderator mutation
  const assignVillageToModeratorMutation = useMutation({
    mutationFn: async ({ moderatorId, villageId }: { moderatorId: string; villageId: string }) => {
      const response = await apiRequest("POST", `/api/moderators/${moderatorId}/villages`, { villageId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization assigned to moderator successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/moderators"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign organization to moderator",
        variant: "destructive",
      });
    },
  });

  // Remove village from moderator mutation
  const removeVillageFromModeratorMutation = useMutation({
    mutationFn: async ({ moderatorId, villageId }: { moderatorId: string; villageId: string }) => {
      const response = await apiRequest("DELETE", `/api/moderators/${moderatorId}/villages/${villageId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organization removed from moderator successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/moderators"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove organization from moderator",
        variant: "destructive",
      });
    },
  });

  // Bulk assign villages to moderator mutation
  const bulkAssignVillagesToModeratorMutation = useMutation({
    mutationFn: async ({ moderatorId, villageIds }: { moderatorId: string; villageIds: string[] }) => {
      const results = [];
      for (const villageId of villageIds) {
        const response = await apiRequest("POST", `/api/moderators/${moderatorId}/villages`, { villageId });
        const result = await response.json();
        results.push(result);
      }
      return results;
    },
    onSuccess: (results) => {
      toast({
        title: "Success",
        description: `${results.length} organizations assigned successfully`,
      });
      setBulkAssignVillages([]);
      queryClient.invalidateQueries({ queryKey: ["/api/moderators"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign organizations",
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
    setVillageList([...villageList, { villageName: "", managerName: "", managerPhone: "", unitType: "gram_panchayat" }]);
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


  const navigationItems = [
    { id: "villages", label: "Organizations", icon: Building2 },
    { id: "managers", label: "Managers", icon: Users },
    { id: "moderators", label: "Moderators", icon: UserPlus },
    { id: "announcements", label: "Announcements", icon: Bell },
    { id: "website-feedback", label: "Website Feedback", icon: MessageSquare },
    { id: "contact-submissions", label: "Contact Us", icon: FileText },
    { id: "profile", label: "Profile", icon: User },
    { id: "activity-log", label: "Activity Log", icon: ClipboardList },
    { id: "data-export", label: "Data Export", icon: FileDown },
  ];



  const renderVillages = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Organization Management</h2>
          <p className="text-muted-foreground">Create and manage organizations</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Organization</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="villageName">Organization Name</Label>
                  <Input
                    id="villageName"
                    value={newVillage.villageName}
                    onChange={(e) => setNewVillage({ ...newVillage, villageName: e.target.value })}
                    placeholder="Enter organization name"
                  />
                </div>
                <div>
                  <Label htmlFor="unitType">Organization Type</Label>
                  <Select
                    value={newVillage.unitType}
                    onValueChange={(value) => setNewVillage({ ...newVillage, unitType: value })}
                  >
                    <SelectTrigger id="unitType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPES.map((ut) => (
                        <SelectItem key={ut.code} value={ut.code}>
                          <div className="flex flex-col">
                            <span>{ut.name}</span>
                            <span className="text-xs text-muted-foreground">{ut.helper}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="maxHouseholds">Max Households Allowed</Label>
                  <Input
                    id="maxHouseholds"
                    type="number"
                    min="0"
                    value={newVillage.maxHouseholds}
                    onChange={(e) => setNewVillage({ ...newVillage, maxHouseholds: parseInt(e.target.value) || 0 })}
                    placeholder="e.g. 500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Maximum QR codes (households) this org can create. Set 0 to block.</p>
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
                  {createVillageMutation.isPending ? "Creating..." : "Create Organization"}
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
                <DialogTitle>Add Multiple Organizations</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {villageList.map((village, index) => (
                  <div key={index} className="border p-3 sm:p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-sm sm:text-base">Organization {index + 1}</h4>
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
                        placeholder="Organization Name"
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
                    Add Another Organization
                  </Button>
                  <Button
                    onClick={() => createMultipleVillagesMutation.mutate(villageList)}
                    disabled={createMultipleVillagesMutation.isPending}
                    className="flex-1"
                  >
                    {createMultipleVillagesMutation.isPending ? "Creating..." : "Create All Organizations"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">All Organizations</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Org ID</TableHead>
                  <TableHead className="text-xs sm:text-sm">Name</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Type</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Max Limit</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Households</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Collectors</TableHead>
                  <TableHead className="text-xs sm:text-sm">Image Upload</TableHead>
                  <TableHead className="text-xs sm:text-sm">Location Services</TableHead>
                  <TableHead className="text-xs sm:text-sm">Proximity Alerts</TableHead>
                  <TableHead className="text-xs sm:text-sm">Payments</TableHead>
                  <TableHead className="text-xs sm:text-sm">Attendance</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {villages?.map((village: any) => (
                  <TableRow key={village.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">{village.villageId}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{village.name}</TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {UNIT_TYPES.find(ut => ut.code === village.unitType)?.name || 'Gram Panchayat'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                      <Input
                        type="number"
                        min="0"
                        className="w-20 h-7 text-xs"
                        defaultValue={village.maxHouseholds ?? 0}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (val !== (village.maxHouseholds ?? 0)) {
                            apiRequest('PUT', `/api/villages/${village.villageId}`, { maxHouseholds: val }).then(() => {
                              queryClient.invalidateQueries({ queryKey: ['/api/villages'] });
                              toast({ title: 'Updated', description: `Household limit set to ${val}` });
                            });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{village.totalHouseholds || 0}</TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{village.totalCollectors || 0}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <Button
                        size="sm"
                        variant={village.imageUploadRequired ? "default" : "outline"}
                        onClick={() => toggleImageUploadRequiredMutation.mutate({
                          villageId: village.villageId,
                          imageUploadRequired: !village.imageUploadRequired
                        })}
                        className="text-xs"
                      >
                        {village.imageUploadRequired ? "Required" : "Optional"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <Button
                        size="sm"
                        variant={village.locationServicesEnabled ? "default" : "outline"}
                        onClick={() => toggleLocationServicesMutation.mutate({
                          villageId: village.villageId,
                          locationServicesEnabled: !village.locationServicesEnabled
                        })}
                        className="text-xs"
                      >
                        {village.locationServicesEnabled ? "Enabled" : "Disabled"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <Button
                        size="sm"
                        variant={village.proximityAlertsEnabled ? "default" : "outline"}
                        onClick={() => toggleProximityAlertsMutation.mutate({
                          villageId: village.villageId,
                          proximityAlertsEnabled: !village.proximityAlertsEnabled
                        })}
                        className="text-xs"
                      >
                        {village.proximityAlertsEnabled ? "Enabled" : "Disabled"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <Button
                        size="sm"
                        variant={village.paymentsEnabled ? "default" : "outline"}
                        onClick={() => togglePaymentsEnabledMutation.mutate({
                          villageId: village.villageId,
                          paymentsEnabled: !village.paymentsEnabled
                        })}
                        className="text-xs"
                      >
                        {village.paymentsEnabled ? "Enabled" : "Disabled"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <Button
                        size="sm"
                        variant={village.attendanceEnabled ? "default" : "outline"}
                        onClick={() => toggleAttendanceEnabledMutation.mutate({
                          villageId: village.villageId,
                          attendanceEnabled: !village.attendanceEnabled
                        })}
                        className="text-xs"
                      >
                        {village.attendanceEnabled ? "Enabled" : "Disabled"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-3 sm:space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="p-1 sm:p-2"
                              title="Add Manager"
                            >
                              <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Add Manager to {village.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor={`mgr-name-${village.villageId}`}>Manager Name</Label>
                                <Input
                                  id={`mgr-name-${village.villageId}`}
                                  placeholder="Enter manager name"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`mgr-phone-${village.villageId}`}>Manager Phone</Label>
                                <Input
                                  id={`mgr-phone-${village.villageId}`}
                                  placeholder="Enter phone number"
                                />
                              </div>
                              <Button
                                onClick={() => {
                                  const nameInput = document.getElementById(`mgr-name-${village.villageId}`) as HTMLInputElement;
                                  const phoneInput = document.getElementById(`mgr-phone-${village.villageId}`) as HTMLInputElement;
                                  if (nameInput.value && phoneInput.value) {
                                    addManagerMutation.mutate({
                                      villageId: village.villageId,
                                      managerName: nameInput.value,
                                      managerPhone: phoneInput.value
                                    });
                                    nameInput.value = '';
                                    phoneInput.value = '';
                                  }
                                }}
                                className="w-full"
                                disabled={addManagerMutation.isPending}
                              >
                                {addManagerMutation.isPending ? "Adding..." : "Add Manager"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
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
                      <div className="flex space-x-3 sm:space-x-3">
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

  const renderModerators = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Moderator Management</h2>
          <p className="text-muted-foreground">Create and manage moderators with organization assignments</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Moderator
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Moderator</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="moderatorName">Name</Label>
                <Input
                  id="moderatorName"
                  value={newModerator.name}
                  onChange={(e) => setNewModerator({ ...newModerator, name: e.target.value })}
                  placeholder="Enter moderator name"
                />
              </div>
              <div>
                <Label htmlFor="moderatorPhone">Phone</Label>
                <Input
                  id="moderatorPhone"
                  value={newModerator.phone}
                  onChange={(e) => setNewModerator({ ...newModerator, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="moderatorEmail">Email (Optional)</Label>
                <Input
                  id="moderatorEmail"
                  value={newModerator.email}
                  onChange={(e) => setNewModerator({ ...newModerator, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label>Assign Villages (Optional)</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {villages?.map((village: any) => (
                    <div key={village.villageId} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`village-${village.villageId}`}
                        checked={newModerator.villageIds.includes(village.villageId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewModerator({
                              ...newModerator,
                              villageIds: [...newModerator.villageIds, village.villageId]
                            });
                          } else {
                            setNewModerator({
                              ...newModerator,
                              villageIds: newModerator.villageIds.filter(id => id !== village.villageId)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor={`village-${village.villageId}`} className="text-sm">
                        {village.name} ({village.villageId})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => createModeratorMutation.mutate(newModerator)}
                disabled={createModeratorMutation.isPending}
                className="w-full"
              >
                {createModeratorMutation.isPending ? "Creating..." : "Create Moderator"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">All Moderators</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Moderator ID</TableHead>
                  <TableHead className="text-xs sm:text-sm">Name</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="text-xs sm:text-sm">Assigned Villages</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moderators?.map((moderator: any) => (
                  <TableRow key={moderator.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">{moderator.moderatorId}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{moderator.name}</TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{moderator.phone}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <div className="flex flex-wrap gap-1">
                        {moderator.villages?.map((village: any) => (
                          <Badge key={village.villageId} variant="secondary" className="text-xs">
                            {village.villageId}
                          </Badge>
                        ))}
                        {(!moderator.villages || moderator.villages.length === 0) && (
                          <span className="text-muted-foreground text-xs">No organizations assigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1 sm:space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="p-1 sm:p-2">
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Manage Villages for {moderator.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Currently Assigned Villages</Label>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                  {moderator.villages?.map((village: any) => (
                                    <div key={village.villageId} className="flex items-center justify-between p-2 border rounded">
                                      <span className="text-sm">{village.name} ({village.villageId})</span>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => removeVillageFromModeratorMutation.mutate({
                                          moderatorId: moderator.moderatorId,
                                          villageId: village.villageId
                                        })}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  {(!moderator.villages || moderator.villages.length === 0) && (
                                    <p className="text-muted-foreground text-sm">No organizations assigned</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <Label>Assign New Organizations</Label>
                                <div className="space-y-3">
                                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                                    {villages?.filter((village: any) =>
                                      !moderator.villages?.some((mv: any) => mv.villageId === village.villageId)
                                    ).map((village: any) => (
                                      <div key={village.villageId} className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`bulk-assign-village-${village.villageId}-${moderator.moderatorId}`}
                                          checked={bulkAssignVillages.includes(village.villageId)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setBulkAssignVillages(prev => [...prev, village.villageId]);
                                            } else {
                                              setBulkAssignVillages(prev => prev.filter(id => id !== village.villageId));
                                            }
                                          }}
                                          className="rounded"
                                        />
                                        <label htmlFor={`bulk-assign-village-${village.villageId}-${moderator.moderatorId}`} className="text-sm">
                                          {village.name} ({village.villageId})
                                        </label>
                                      </div>
                                    ))}
                                    {villages?.filter((village: any) =>
                                      !moderator.villages?.some((mv: any) => mv.villageId === village.villageId)
                                    ).length === 0 && (
                                        <p className="text-muted-foreground text-sm">All villages are already assigned</p>
                                      )}
                                  </div>

                                  {bulkAssignVillages.length > 0 && (
                                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                                      <span className="text-sm text-blue-700">
                                        {bulkAssignVillages.length} village{bulkAssignVillages.length > 1 ? 's' : ''} selected
                                      </span>
                                      <div className="space-x-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setBulkAssignVillages([])}
                                        >
                                          Clear
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            bulkAssignVillagesToModeratorMutation.mutate({
                                              moderatorId: moderator.moderatorId,
                                              villageIds: bulkAssignVillages
                                            });
                                          }}
                                          disabled={bulkAssignVillagesToModeratorMutation.isPending}
                                        >
                                          {bulkAssignVillagesToModeratorMutation.isPending ? 'Assigning...' : 'Assign Selected'}
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex space-x-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const availableVillages = villages?.filter((village: any) =>
                                          !moderator.villages?.some((mv: any) => mv.villageId === village.villageId)
                                        ) || [];
                                        setBulkAssignVillages(availableVillages.map(v => v.villageId));
                                      }}
                                      className="flex-1"
                                    >
                                      Select All
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setBulkAssignVillages([])}
                                      className="flex-1"
                                    >
                                      Clear All
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetModeratorPasswordMutation.mutate(moderator.moderatorId)}
                          className="p-1 sm:p-2"
                        >
                          <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteModeratorMutation.mutate(moderator.moderatorId)}
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



  const renderAnnouncements = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Announcements Management</h2>
        <p className="text-muted-foreground">Create, edit, and manage announcements for all users</p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="manage">Manage Existing</TabsTrigger>
        </TabsList>

        {/* Create Announcement Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Send New Announcement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
              <div>
                <Label htmlFor="announcement-message">Message</Label>
                <Textarea
                  id="announcement-message"
                  value={announcement.message}
                  onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                  placeholder="Type your announcement..."
                  rows={4}
                  className="text-sm sm:text-base"
                />
              </div>
              <div>
                <Label htmlFor="announcement-audience">Target Audience</Label>
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
                {createAnnouncementMutation.isPending ? "Sending..." : "Send Announcement"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Announcements Tab */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">All Announcements</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {announcementsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <span className="ml-2 text-sm">Loading announcements...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Message</TableHead>
                        <TableHead className="text-xs sm:text-sm">Audience</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Date</TableHead>
                        <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {existingAnnouncements?.map((announcement: any) => (
                        <TableRow key={announcement.id}>
                          <TableCell className="text-xs sm:text-sm max-w-xs">
                            <div className="space-y-1">
                              <p className="truncate">{announcement.message}</p>
                              {announcement.photoUrl && (
                                <Badge variant="outline" className="text-xs">Has Image</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <Badge variant="secondary" className="text-xs">
                              {announcement.targetAudience}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                            {new Date(announcement.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1 sm:space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingAnnouncement(announcement)}
                                    className="p-1 sm:p-2"
                                  >
                                    <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-[95vw] sm:max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>View/Edit Announcement</DialogTitle>
                                  </DialogHeader>
                                  {editingAnnouncement && (
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Message</Label>
                                        <Textarea
                                          value={editingAnnouncement.message}
                                          onChange={(e) => setEditingAnnouncement({
                                            ...editingAnnouncement,
                                            message: e.target.value
                                          })}
                                          rows={4}
                                        />
                                      </div>
                                      <div>
                                        <Label>Target Audience</Label>
                                        <Select
                                          value={editingAnnouncement.targetAudience}
                                          onValueChange={(value) => setEditingAnnouncement({
                                            ...editingAnnouncement,
                                            targetAudience: value
                                          })}
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
                                      {editingAnnouncement.photoUrl && (
                                        <div>
                                          <Label>Current Image</Label>
                                          <div className="mt-2">
                                            <img
                                              src={editingAnnouncement.photoUrl}
                                              alt="Current announcement"
                                              className="max-w-full h-32 object-cover rounded border"
                                            />
                                          </div>
                                        </div>
                                      )}
                                      <div>
                                        <Label>Replace Image (Optional)</Label>
                                        <Input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setEditingAnnouncement({
                                              ...editingAnnouncement,
                                              photoFile: file
                                            });
                                          }}
                                          className="cursor-pointer"
                                        />
                                      </div>
                                      <div className="flex space-x-2">
                                        <Button
                                          onClick={() => {
                                            editAnnouncementMutation.mutate({
                                              id: editingAnnouncement.id,
                                              data: editingAnnouncement
                                            });
                                            setEditingAnnouncement(null);
                                          }}
                                          disabled={editAnnouncementMutation.isPending}
                                          className="flex-1"
                                        >
                                          {editAnnouncementMutation.isPending ? "Updating..." : "Update"}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => setEditingAnnouncement(null)}
                                          className="flex-1"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setDeleteAnnouncementId(announcement.id);
                                }}
                                className="p-1 sm:p-2"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!existingAnnouncements || existingAnnouncements.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No announcements found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

  const renderWebsiteFeedback = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Website Feedback</h2>
        <p className="text-muted-foreground">Review feedback submissions from website visitors</p>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">All Feedback Submissions</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {feedbackLoading ? (
            <div className="text-center py-8">Loading feedback submissions...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Name</TableHead>
                    <TableHead className="text-xs sm:text-sm">Email</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">Type</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Message</TableHead>
                    <TableHead className="text-xs sm:text-sm">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {websiteFeedback?.map((feedback: any) => (
                    <TableRow key={feedback.id}>
                      <TableCell className="text-xs sm:text-sm">{feedback.name}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{feedback.email}</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                        <Badge variant="outline">{feedback.feedbackType}</Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell max-w-xs truncate">
                        {feedback.message}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {new Date(feedback.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!websiteFeedback || websiteFeedback.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No feedback submissions yet
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

  const renderContactSubmissions = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Contact Us Submissions</h2>
        <p className="text-muted-foreground">Review contact form submissions from website visitors</p>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">All Contact Submissions</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {contactLoading ? (
            <div className="text-center py-8">Loading contact submissions...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Name</TableHead>
                    <TableHead className="text-xs sm:text-sm">Email</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">Phone</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Subject</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Message</TableHead>
                    <TableHead className="text-xs sm:text-sm">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactSubmissions?.map((contact: any) => (
                    <TableRow key={contact.id}>
                      <TableCell className="text-xs sm:text-sm">{contact.name}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{contact.email}</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                        {contact.phone || "N/A"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden lg:table-cell max-w-xs truncate">
                        {contact.subject}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell max-w-xs truncate">
                        {contact.message}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {new Date(contact.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!contactSubmissions || contactSubmissions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No contact submissions yet
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

  const renderContent = () => {
    switch (activeTab) {
      case "villages": return renderVillages();
      case "managers": return renderManagers();
      case "moderators": return renderModerators();
      case "announcements": return renderAnnouncements();
      case "website-feedback": return renderWebsiteFeedback();
      case "contact-submissions": return renderContactSubmissions();
      case "profile": return renderProfile();
      case "activity-log": return (
        <ActivityLog
          onBack={() => setActiveTab("villages")}
          apiUrl="/api/admin/audit-logs"
          showVillageFilter={true}
        />
      );
      case "data-export": return (
        <DataExportWizard
          role="admin"
          userId={user?.userId}
          onBack={() => setActiveTab("villages")}
        />
      );
      default: return renderVillages();
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
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => logout()}
              variant="ghost"
              size="default"
              className="p-2"
            >
              <LogOut className="h-6 w-6 text-white" strokeWidth={3} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex fixed top-0 h-screen w-64 bg-white border-r flex-col z-50">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src="/logos/logo-full.svg" alt="GreenPath" className="h-10 w-auto" />
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
              {navigationItems.filter(item => item.id !== 'profile').map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${activeTab === item.id
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
        <div className="fixed bottom-0 left-0 right-0 bg-green-100 border-t z-50 md:hidden px-3 py-1">
          <div className="grid grid-cols-8 gap-1">
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
                  <Icon className="h-6 w-6 mb-1" strokeWidth={2.5} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto pb-20 md:pb-6 md:ml-64">
          <div className="p-3 sm:p-6">
            {renderContent()}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteAnnouncementId !== null}
        onOpenChange={(open) => { if (!open) setDeleteAnnouncementId(null); }}
        title="Delete Announcement?"
        description="This announcement will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteAnnouncementId !== null) deleteAnnouncementMutation.mutate(deleteAnnouncementId);
          setDeleteAnnouncementId(null);
        }}
      />
    </div>
  );
}