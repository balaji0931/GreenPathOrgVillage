import { useState, useEffect } from "react";
import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QRScanner } from "@/components/qr-scanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useOfflineStorage } from "@/lib/offline-storage";
import { 
  Home, 
  QrCode, 
  User, 
  Star, 
  Camera, 
  Check, 
  X, 
  LogOut, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Lock,
  AlertCircle,
  Trash2,
  Search,
  Plus,
  Settings,
  Bell,
  MapPin,
  Upload
} from "lucide-react";

interface CollectionForm {
  wasteSegregated: boolean | null;
  wasteAccepted: boolean | null;
  segregationRating: number;
  plasticReduced: boolean | null;
  wetWasteComposting: boolean | null;
  cleanlinessRating: number;
  observations: string[];
  remarks: string;
  photoFile: File | null;
  voiceRecording: File | null;
  notCollectedReason: string;
}

const OBSERVATION_OPTIONS = [
  "Good segregation",
  "Mixed waste",
  "Excessive plastic", 
  "Clean and organized",
  "Poor hygiene",
  "No waste present"
];

const NOT_COLLECTED_REASONS = [
  "House locked",
  "No one home",
  "No waste to collect",
  "House not accessible",
  "Resident refused",
  "Other"
];

const ISSUE_CATEGORIES = [
  "Illegal Dumping",
  "Collection Delay", 
  "Missed Pickup",
  "Road Cleanliness",
  "Plastic Usage",
  "Collector Behavior",
  "Infrastructure",
  "Other"
];

export default function CollectorDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isOnline, pendingCount, storeCollectionOffline, storeFileOffline, syncPendingData } = useOfflineStorage();
  
  const [showScanner, setShowScanner] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [scannedHousehold, setScannedHousehold] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [collectionForm, setCollectionForm] = useState<CollectionForm>({
    wasteSegregated: null,
    wasteAccepted: null,
    segregationRating: 0,
    plasticReduced: null,
    wetWasteComposting: null,
    cleanlinessRating: 0,
    observations: [],
    remarks: "",
    photoFile: null,
    voiceRecording: null,
    notCollectedReason: ""
  });

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCollectionDetails, setShowCollectionDetails] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueFilter, setIssueFilter] = useState('All');
  const [issueSearchQuery, setIssueSearchQuery] = useState('');
  
  const [newIssue, setNewIssue] = useState({
    title: "",
    category: "",
    description: "",
    photoFile: null as File | null,
  });

  // Fetch today's route (households)
  const householdsQuery = useQuery({
    queryKey: ["/api/households"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/households");
      return response.json();
    },
  });

  // Fetch collections for today
  const collectionsQuery = useQuery({
    queryKey: ["/api/waste-collections/collector"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/waste-collections/collector");
      return response.json();
    },
  });

  // Fetch announcements
  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ["/api/announcements"],
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch village issues
  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ["/api/issues"],
    refetchInterval: 60000, // Refetch every minute
  });

  const households = householdsQuery.data;
  const collections = collectionsQuery.data;
  const householdsLoading = householdsQuery.isLoading;

  // Filter collections for today first - include refreshTrigger to force recalculation
  const collectionsToday = React.useMemo(() => {
    if (!collections) return [];
    const today = new Date();
    const todayStr = today.toDateString();
    
    const filtered = collections.filter((collection: any) => {
      // Use collectionDate instead of createdAt for proper filtering
      const collectionDate = new Date(collection.collectionDate || collection.createdAt);
      return collectionDate.toDateString() === todayStr;
    });
    
    return filtered;
  }, [collections, refreshTrigger]);

  // Calculate daily stats - recalculate when data changes
  const dailyStats = React.useMemo(() => {
    const completedToday = collectionsToday.length;
    const totalHouseholds = households?.length || 0;
    const pendingToday = totalHouseholds - completedToday;
    
    return {
      completed: completedToday,
      pending: pendingToday,
      missed: 0, // Will be calculated based on business rules
    };
  }, [collectionsToday, households]);

  // Create waste collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/waste-collections", data);
      return response.json();
    },
    onSuccess: async (newCollection) => {
      toast({
        title: "Success",
        description: "Collection recorded successfully",
      });
      setShowCollectionModal(false);
      resetForm();
      
      // Invalidate all related queries
      await queryClient.invalidateQueries({ queryKey: ["/api/waste-collections/collector"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      
      // Refetch data to ensure UI updates immediately
      await Promise.all([
        collectionsQuery.refetch(),
        householdsQuery.refetch()
      ]);
      
      // Force component re-render with updated data
      setRefreshTrigger(prev => prev + 1);
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to record collection",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Submit new issue mutation
  const createIssueMutation = useMutation({
    mutationFn: async (issueData: any) => {
      let photoUrl = null;
      
      // Upload photo first if provided
      if (newIssue.photoFile) {
        try {
          const formData = new FormData();
          formData.append('file', newIssue.photoFile);
          
          const uploadResponse = await fetch('/api/upload/photo', {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.text();
            throw new Error(`Photo upload failed: ${uploadResponse.status} ${errorData}`);
          }
          
          const uploadResult = await uploadResponse.json();
          photoUrl = uploadResult.url;
        } catch (uploadError) {
          toast({
            title: "Warning",
            description: "Photo upload failed, continuing without photo",
            variant: "destructive",
          });
          photoUrl = null;
        }
      }

      // Create the issue with photo URL
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...issueData,
          photoUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create issue: ${response.status} ${errorData}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      setShowIssueModal(false);
      setNewIssue({ title: "", category: "", description: "", photoFile: null });
      toast({
        title: "Success! 🎉",
        description: "Your issue has been reported successfully. The manager will review it soon.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to report issue. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-slide announcements every 5 seconds
  useEffect(() => {
    if (announcements && announcements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAnnouncementIndex(prev => (prev + 1) % Math.min(announcements.length, 3));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [announcements]);

  const resetForm = () => {
    setCollectionForm({
      wasteSegregated: null,
      wasteAccepted: null,
      segregationRating: 0,
      plasticReduced: null,
      wetWasteComposting: null,
      cleanlinessRating: 0,
      observations: [],
      remarks: "",
      photoFile: null,
      voiceRecording: null,
      notCollectedReason: ""
    });
    setScannedHousehold(null);
    setShowConfirmSubmit(false);
  };

  const handleQRScan = async (qrData: string) => {
    console.log('Scanned QR:', qrData);
    setShowScanner(false);
    
    try {
      let householdData;
      
      // Try to parse as JSON first (for QR codes with household data)
      try {
        const parsedData = JSON.parse(qrData);
        if (parsedData.uid && parsedData.type === 'household') {
          // Find the full household data from our local households
          const household = households?.find((h: any) => h.uid === parsedData.uid);
          if (household) {
            householdData = household;
          } else {
            throw new Error("Household not found in your route");
          }
        } else {
          throw new Error("Invalid QR format");
        }
      } catch (parseError) {
        // If not JSON, treat as household UID and find in our local data
        const household = households?.find((h: any) => h.uid === qrData);
        if (household) {
          householdData = household;
        } else {
          throw new Error("Household not found in your route");
        }
      }
      
      setScannedHousehold(householdData);
      checkDailySubmission(householdData);
    } catch (error) {
      toast({
        title: "QR Code Error",
        description: "Invalid QR code or household not found in your assigned route",
        variant: "destructive",
      });
    }
  };

  const checkDailySubmission = (household: any) => {
    const today = new Date().toDateString();
    const todaysCollection = collections?.find((collection: any) => 
      collection.householdId === household.id && 
      new Date(collection.collectionDate || collection.createdAt).toDateString() === today
    );

    if (todaysCollection) {
      setSelectedCollection(todaysCollection);
      setShowCollectionDetails(true);
      toast({
        title: "Already Collected",
        description: "This household was already collected today. Showing previous details.",
      });
    } else {
      setShowCollectionModal(true);
    }
  };

  const handleHouseholdSelect = (household: any) => {
    setScannedHousehold(household);
    checkDailySubmission(household);
  };





  const handleStarClick = (type: 'segregation' | 'cleanliness', rating: number) => {
    if (type === 'segregation') {
      setCollectionForm({ ...collectionForm, segregationRating: rating });
    } else {
      setCollectionForm({ ...collectionForm, cleanlinessRating: rating });
    }
  };

  const handleObservationChange = (observation: string, checked: boolean) => {
    const updatedObservations = checked
      ? [...collectionForm.observations, observation]
      : collectionForm.observations.filter(obs => obs !== observation);
    
    setCollectionForm({ ...collectionForm, observations: updatedObservations });
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const file = new File([blob], `voice-${Date.now()}.wav`, { type: 'audio/wav' });
        setCollectionForm({ ...collectionForm, voiceRecording: file });
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
    }
  };

  const handleSubmitCollection = async () => {
    if (!scannedHousehold) return;

    try {
      const collectionData = {
        householdUid: scannedHousehold.uid,
        status: collectionForm.wasteAccepted ? 'collected' : 'missed',
        segregationRating: collectionForm.segregationRating,
        plasticRating: collectionForm.cleanlinessRating,
        observations: collectionForm.observations,
        remarks: collectionForm.remarks,
        missedReason: collectionForm.wasteAccepted ? null : collectionForm.notCollectedReason,
        collectionDate: new Date().toISOString(),
        collectionTime: new Date().toLocaleTimeString(),
      };

      if (isOnline) {
        // Online mode - try to upload files and submit immediately
        try {
          let photoUrl = null;
          let voiceUrl = null;

          // Upload photo to Cloudinary if present
          if (collectionForm.photoFile) {
            const photoFormData = new FormData();
            photoFormData.append('file', collectionForm.photoFile);
            
            const photoResponse = await fetch('/api/upload/photo', {
              method: 'POST',
              body: photoFormData,
              credentials: 'include'
            });
            
            if (!photoResponse.ok) {
              throw new Error('Photo upload failed');
            }
            
            const photoResult = await photoResponse.json();
            photoUrl = photoResult.url;
          }

          // Upload voice recording to Cloudinary if present
          if (collectionForm.voiceRecording) {
            const voiceFormData = new FormData();
            voiceFormData.append('file', collectionForm.voiceRecording);
            
            const voiceResponse = await fetch('/api/upload/voice', {
              method: 'POST',
              body: voiceFormData,
              credentials: 'include'
            });
            
            if (!voiceResponse.ok) {
              throw new Error('Voice upload failed');
            }
            
            const voiceResult = await voiceResponse.json();
            voiceUrl = voiceResult.url;
          }

          const finalCollectionData = {
            ...collectionData,
            photoUrl,
            voiceUrl,
          };

          createCollectionMutation.mutate(finalCollectionData);
        } catch (uploadError) {
          // If upload fails but we're online, store offline as fallback
          toast({
            title: "Upload Failed",
            description: "Storing data offline for later sync.",
            variant: "default",
          });
          await handleOfflineSubmission(collectionData);
        }
      } else {
        // Offline mode - store data locally
        await handleOfflineSubmission(collectionData);
      }

      setShowConfirmSubmit(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit collection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOfflineSubmission = async (collectionData: any) => {
    try {
      let photoFileId = null;
      let voiceFileId = null;

      // Store files offline if present
      if (collectionForm.photoFile) {
        const photoResult = await storeFileOffline(collectionForm.photoFile, 'photo');
        if (photoResult.success) {
          photoFileId = photoResult.fileId;
        }
      }

      if (collectionForm.voiceRecording) {
        const voiceResult = await storeFileOffline(collectionForm.voiceRecording, 'voice');
        if (voiceResult.success) {
          voiceFileId = voiceResult.fileId;
        }
      }

      // Store collection data offline
      const offlineCollectionData = {
        ...collectionData,
        photoFileId,
        voiceFileId,
      };

      const result = await storeCollectionOffline(offlineCollectionData);

      if (result.success) {
        toast({
          title: "✅ Saved Offline",
          description: "Collection saved offline. Will sync when online.",
          variant: "default",
        });
        resetForm();
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(result.error || 'Failed to store offline');
      }
    } catch (error) {
      toast({
        title: "Offline Storage Failed",
        description: "Could not save data offline. Please try again.",
        variant: "destructive",
      });
    }
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

  const handleSubmitIssue = async () => {
    // Trim whitespace for validation
    const trimmedTitle = newIssue.title.trim();
    const trimmedDescription = newIssue.description.trim();

    // Validation
    if (!trimmedTitle || !newIssue.category || !trimmedDescription) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Title, Category, Description)",
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

    createIssueMutation.mutate({
      title: trimmedTitle,
      category: newIssue.category,
      description: trimmedDescription,
    });
  };

  // Other status functions

  const collectedHouseholds = React.useMemo(() => {
    return new Set(collectionsToday.map((c: any) => c.householdId));
  }, [collectionsToday, refreshTrigger]);

  const pendingHouseholds = React.useMemo(() => {
    if (!households) return [];
    return households.filter((household: any) => !collectedHouseholds.has(household.id));
  }, [households, collectedHouseholds, refreshTrigger]);

  const filteredHouseholds = React.useMemo(() => {
    if (!households) return [];
    return households.filter((household: any) =>
      household.headName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      household.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      household.houseNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [households, searchQuery]);

  const getHouseholdStatus = React.useCallback((household: any) => {
    const hasCollectionToday = collectionsToday.some((c: any) => c.householdId === household.id);
    return hasCollectionToday ? 'completed' : 'pending';
  }, [collectionsToday]);

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {/* Mobile Header */}
      <div className="bg-green-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="mr-3" size={24} />
            <div>
              <h1 className="font-bold text-lg">{t('app.title')}</h1>
              <div className="flex items-center space-x-2">
                <p className="text-xs opacity-90">{t('roles.collector')}</p>
                <div className={`flex items-center text-xs px-2 py-1 rounded-full ${
                  isOnline ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {isOnline ? '🟢 Online' : '🔴 Offline'}
                </div>
                {pendingCount > 0 && (
                  <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                    {pendingCount} pending
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs opacity-90">{user?.userId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-20"> {/* Bottom padding for nav */}
        
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-3 p-4">
            {/* Stats Cards - Compact */}
            <div className="grid grid-cols-2 gap-3" key={`stats-${collectionsToday.length}`}>
              <div className="bg-green-50 p-3 rounded-lg border">
                <div className="text-xl font-bold text-green-600">{collectionsToday.length}</div>
                <div className="text-xs text-green-700">{t('collections.todayCollections')}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg border">
                <div className="text-xl font-bold text-orange-600">{pendingHouseholds.length}</div>
                <div className="text-xs text-orange-700">{t('app.pending')}</div>
              </div>
            </div>

            {/* Offline Status and Sync */}
            {!isOnline && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-red-700">Working Offline</span>
                  </div>
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {pendingCount} pending sync
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Your collections are being saved offline and will sync when you're back online.
                </p>
              </div>
            )}

            {isOnline && pendingCount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-blue-700">Pending Sync</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {pendingCount} collections waiting to sync
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      const result = await syncPendingData();
                      if (result.success) {
                        toast({
                          title: "Sync Complete",
                          description: "All offline data has been synced.",
                        });
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-xs"
                  >
                    Sync Now
                  </Button>
                </div>
              </div>
            )}

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
                      onClick={() => setActiveTab('announcements')}
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
                        width: `${Math.min(announcements.length, 3) * 100}%`
                      }}
                    >
                      {announcements.slice(0, 3).map((announcement: any, index: number) => (
                        <div 
                          key={announcement.id} 
                          className="w-full flex-shrink-0 px-1"
                        >
                          <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                            <p className="text-sm text-gray-800 font-medium line-clamp-2">{announcement.message}</p>
                            {announcement.photoUrl && (
                              <div className="mt-2">
                                <img 
                                  src={announcement.photoUrl} 
                                  alt="Announcement" 
                                  className="max-w-full h-24 object-cover rounded border"
                                />
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(announcement.createdAt).toLocaleDateString()}
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
                              index === (currentAnnouncementIndex % Math.min(announcements.length, 3)) 
                                ? 'bg-blue-600' 
                                : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No announcements</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Search household by name, ID, or house number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>

            {/* Household List */}
            <div key={`household-list-${refreshTrigger}-${collectionsToday.length}`}>
              <h3 className="text-base font-semibold mb-2">
                {searchQuery ? `Search Results (${filteredHouseholds.length})` : 'All Households'}
              </h3>
              {(searchQuery ? filteredHouseholds : households || []).length > 0 ? (
                <div className="space-y-2">
                  {(searchQuery ? filteredHouseholds : households || []).map((household: any) => {
                    const status = getHouseholdStatus(household);
                    const todaysCollection = collectionsToday.find((c: any) => c.householdId === household.id);
                    
                    return (
                      <div 
                        key={`household-${household.id}-${status}-${collectionsToday.length}-${refreshTrigger}`} 
                        className="bg-white p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleHouseholdSelect(household)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{household.headName}</div>
                            <div className="text-xs text-gray-600">{household.uid} • House: {household.houseNumber}</div>
                            {todaysCollection && (
                              <div className="text-xs text-gray-500 mt-1">
                                Collected at {new Date(todaysCollection.collectionDate || todaysCollection.createdAt).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`px-2 py-1 rounded-full text-xs ${
                              status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {status === 'completed' ? '✅ Done' : '⏳ Pending'}
                            </div>
                            {status === 'completed' ? (
                              <Eye size={16} className="text-blue-600" />
                            ) : (
                              <Plus size={16} className="text-green-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Home className="mx-auto mb-2" size={24} />
                  <p className="text-sm">
                    {searchQuery ? 'No households found' : 'No households assigned'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCAN TAB */}
        {activeTab === 'scan' && (
          <div className="p-4 space-y-4">
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                <QrCode size={64} className="text-gray-400" />
              </div>
              <div>
                <p className="text-gray-600 mb-4">Point your camera at the household QR code</p>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 py-4"
                  onClick={() => setShowScanner(true)}
                >
                  <QrCode className="mr-2" size={20} />
                  Start Scanning
                </Button>
              </div>
            </div>

            {/* Recent Collections */}
            <div className="space-y-2">
              <h3 className="font-semibold">Recent Collections</h3>
              {collections?.slice(0, 5).map((collection: any) => (
                <div key={collection.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                  <div>
                    <div className="font-medium">{collection.householdUid}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(collection.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <Badge variant={collection.status === 'collected' ? 'default' : 'destructive'}>
                    {collection.status}
                  </Badge>
                </div>
              )) || <p className="text-gray-500 text-center py-4">{t('app.noData')}</p>}
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{t('announcements.title')}</h2>
            </div>

            {announcementsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">{t('app.loading')}...</p>
              </div>
            ) : announcements && announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.map((announcement: any) => (
                  <Card key={announcement.id} className="p-4 shadow-sm border-l-4 border-l-blue-400">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-gray-900 flex-1 pr-2">{announcement.message}</p>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                          {t('app.new')}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                          <Bell className="w-3 h-3" />
                          <span className="font-medium">{t('announcements.title')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('app.noData')}</h3>
                <p className="text-gray-500 mb-4">{t('announcements.checkLater')}</p>
              </div>
            )}
          </div>
        )}

        {/* VILLAGE ISSUES TAB */}
        {activeTab === 'issues' && (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{t('issues.title')}</h2>
              <Button 
                size="sm"
                onClick={() => setShowIssueModal(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('issues.reportIssue')}
              </Button>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {[
                { key: 'All', label: t('app.all') },
                { key: 'Open', label: t('issues.open') },
                { key: 'In Progress', label: t('issues.inProgress') },
                { key: 'Resolved', label: t('issues.resolved') }
              ].map((filter) => (
                <Button 
                  key={filter.key}
                  variant={issueFilter === filter.key ? "default" : "outline"} 
                  size="sm"
                  className="whitespace-nowrap text-xs"
                  onClick={() => setIssueFilter(filter.key)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Search issues..."
                value={issueSearchQuery}
                onChange={(e) => setIssueSearchQuery(e.target.value)}
                className="pl-10 text-sm"
              />
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
                    // Filter by status
                    let statusMatch = true;
                    if (issueFilter === 'Open') statusMatch = issue.status === 'open';
                    else if (issueFilter === 'In Progress') statusMatch = issue.status === 'in_progress';
                    else if (issueFilter === 'Resolved') statusMatch = issue.status === 'resolved';
                    
                    // Filter by search query
                    let searchMatch = true;
                    if (issueSearchQuery) {
                      const searchTerm = issueSearchQuery.toLowerCase();
                      searchMatch = issue.title.toLowerCase().includes(searchTerm) ||
                                   issue.description.toLowerCase().includes(searchTerm) ||
                                   issue.category.toLowerCase().includes(searchTerm);
                    }
                    
                    return statusMatch && searchMatch;
                  })
                  .map((issue: any) => (
                  <Card key={issue.id} className="p-4 shadow-sm border-l-4 border-l-red-400">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-2">
                          <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">{issue.title}</h3>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-3">{issue.description}</p>
                        </div>
                        <Badge 
                          variant={
                            issue.status === 'open' ? 'destructive' : 
                            issue.status === 'in_progress' ? 'secondary' : 'default'
                          }
                          className="text-xs whitespace-nowrap"
                        >
                          {issue.status === 'open' ? 'Open' : 
                           issue.status === 'in_progress' ? 'In Progress' : 'Resolved'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3 h-3" />
                          <span className="font-medium">{issue.category}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {issue.photoUrl && (
                        <div className="mt-2">
                          <img 
                            src={issue.photoUrl} 
                            alt="Issue photo" 
                            className="w-full h-32 object-cover rounded-lg cursor-pointer"
                            onClick={() => window.open(issue.photoUrl, '_blank')}
                          />
                        </div>
                      )}

                      {issue.managerReply && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                          <div className="flex items-center space-x-2 mb-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <p className="text-xs font-semibold text-green-800">Manager Response:</p>
                          </div>
                          <p className="text-xs text-green-700 leading-relaxed">{issue.managerReply}</p>
                          {issue.updatedAt && (
                            <p className="text-xs text-green-600 mt-1">
                              Updated: {new Date(issue.updatedAt).toLocaleDateString()}
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
                <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                {issueFilter === 'All' ? (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Issues Reported</h3>
                    <p className="text-gray-500 mb-4">Help improve your village by reporting issues</p>
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No {issueFilter} Issues</h3>
                    <p className="text-gray-500 mb-4">No issues found with {issueFilter.toLowerCase()} status</p>
                    <Button 
                      onClick={() => setIssueFilter('All')}
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
        {activeTab === 'profile' && (
          <div className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <User size={32} className="text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg">{user?.name}</h3>
                  <p className="text-gray-500">{user?.userId}</p>
                  <Badge className="mt-2">{user?.role}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('navigation.settings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <Settings className="mr-3" size={20} />
{t('auth.changePassword')}
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                  onClick={logout}
                >
                  <LogOut className="mr-3" size={20} />
{t('auth.logout')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('dashboard.todaySummary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{dailyStats.completed}</div>
                    <div className="text-sm text-gray-600">{t('collections.title')}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-500">{dailyStats.missed}</div>
                    <div className="text-sm text-gray-600">{t('dashboard.missed')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('collections.scanQR')}</DialogTitle>
          </DialogHeader>
          <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
        </DialogContent>
      </Dialog>

      {/* Collection Form Modal */}
      <Dialog open={showCollectionModal} onOpenChange={setShowCollectionModal}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">📋 {t('collections.collectionForm')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Household Info */}
            <div className="text-center p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <div className="text-2xl mb-2">🏠</div>
              <p className="font-bold text-lg">{scannedHousehold?.headName}</p>
              <p className="text-sm text-gray-600">{scannedHousehold?.uid}</p>
              <p className="text-xs text-gray-500">{scannedHousehold?.houseNumber}</p>
            </div>

            {/* Waste Segregated? - REQUIRED */}
            <div className="p-4 border-2 border-orange-200 bg-orange-50 rounded-xl">
              <Label className="text-lg font-bold text-center block mb-3">
                🗂️ {t('collections.wasteProperlySegregated')} *
              </Label>
              <div className="flex space-x-3">
                <Button
                  variant={collectionForm.wasteSegregated === true ? "default" : "outline"}
                  onClick={() => setCollectionForm({...collectionForm, wasteSegregated: true})}
                  className={`flex-1 py-4 text-lg font-bold ${
                    collectionForm.wasteSegregated === true 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-white border-2 border-green-300 text-green-700 hover:bg-green-50'
                  }`}
                >
                  ✅ {t('app.yes')}
                </Button>
                <Button
                  variant={collectionForm.wasteSegregated === false ? "destructive" : "outline"}
                  onClick={() => setCollectionForm({...collectionForm, wasteSegregated: false})}
                  className={`flex-1 py-4 text-lg font-bold ${
                    collectionForm.wasteSegregated === false 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-white border-2 border-red-300 text-red-700 hover:bg-red-50'
                  }`}
                >
                  ❌ {t('app.no')}
                </Button>
              </div>
            </div>

            {/* Segregation Rating - REQUIRED */}
            <div className="p-4 border-2 border-yellow-200 bg-yellow-50 rounded-xl">
              <Label className="text-lg font-bold text-center block mb-3">
                ⭐ {t('collections.howGoodSegregation')} *
              </Label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={`w-12 h-12 rounded-full border-2 transition-all hover:scale-110 ${
                      rating <= collectionForm.segregationRating 
                        ? 'bg-yellow-400 border-yellow-500 shadow-lg' 
                        : 'bg-white border-gray-300'
                    }`}
                    onClick={() => handleStarClick('segregation', rating)}
                  >
                    <div className="text-2xl">
                      {rating <= collectionForm.segregationRating ? '⭐' : '☆'}
                    </div>
                  </button>
                ))}
              </div>
              <div className="text-center mt-2 text-sm text-gray-600">
                {collectionForm.segregationRating === 0 && t('collections.selectRating')}
                {collectionForm.segregationRating === 1 && `😞 ${t('collections.veryPoor')}`}
                {collectionForm.segregationRating === 2 && `😐 ${t('collections.poor')}`}
                {collectionForm.segregationRating === 3 && `🙂 ${t('collections.good')}`}
                {collectionForm.segregationRating === 4 && `😊 ${t('collections.veryGood')}`}
                {collectionForm.segregationRating === 5 && `🤩 ${t('collections.excellent')}`}
              </div>
            </div>

            {/* Plastic Reduced? */}
            <div className="p-3 border border-gray-200 bg-gray-50 rounded-xl">
              <Label className="text-base font-bold text-center block mb-3">
                ♻️ {t('collections.isPlasticReduced')}
              </Label>
              <div className="flex space-x-3">
                <Button
                  variant={collectionForm.plasticReduced === true ? "default" : "outline"}
                  onClick={() => setCollectionForm({...collectionForm, plasticReduced: true})}
                  className={`flex-1 py-3 text-base font-bold ${
                    collectionForm.plasticReduced === true 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'border-green-300 text-green-700 hover:bg-green-50'
                  }`}
                >
                  ✅ {t('app.yes')}
                </Button>
                <Button
                  variant={collectionForm.plasticReduced === false ? "destructive" : "outline"}
                  onClick={() => setCollectionForm({...collectionForm, plasticReduced: false})}
                  className={`flex-1 py-3 text-base font-bold ${
                    collectionForm.plasticReduced === false 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'border-red-300 text-red-700 hover:bg-red-50'
                  }`}
                >
                  ❌ {t('app.no')}
                </Button>
              </div>
            </div>

            {/* Wet Waste Composting */}
            <div className="p-3 border border-gray-200 bg-gray-50 rounded-xl">
              <Label className="text-base font-bold text-center block mb-3">
                🌱 {t('collections.isWetWasteComposting')}
              </Label>
              <div className="flex space-x-3">
                <Button
                  variant={collectionForm.wetWasteComposting === true ? "default" : "outline"}
                  onClick={() => setCollectionForm({...collectionForm, wetWasteComposting: true})}
                  className={`flex-1 py-3 text-base font-bold ${
                    collectionForm.wetWasteComposting === true 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'border-green-300 text-green-700 hover:bg-green-50'
                  }`}
                >
                  ✅ {t('app.yes')}
                </Button>
                <Button
                  variant={collectionForm.wetWasteComposting === false ? "destructive" : "outline"}
                  onClick={() => setCollectionForm({...collectionForm, wetWasteComposting: false})}
                  className={`flex-1 py-3 text-base font-bold ${
                    collectionForm.wetWasteComposting === false 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'border-red-300 text-red-700 hover:bg-red-50'
                  }`}
                >
                  ❌ {t('app.no')}
                </Button>
              </div>
            </div>

            {/* Cleanliness Rating */}
            <div className="p-3 border border-gray-200 bg-gray-50 rounded-xl">
              <Label className="text-base font-bold text-center block mb-3">
                🧹 {t('collections.howCleanArea')}
              </Label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={`w-10 h-10 rounded-full border transition-all hover:scale-110 ${
                      rating <= collectionForm.cleanlinessRating 
                        ? 'bg-blue-400 border-blue-500' 
                        : 'bg-white border-gray-300'
                    }`}
                    onClick={() => handleStarClick('cleanliness', rating)}
                  >
                    <div className="text-lg">
                      {rating <= collectionForm.cleanlinessRating ? '🧹' : '☐'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Observations */}
            <div className="p-3 border border-gray-200 bg-gray-50 rounded-xl">
              <Label className="text-base font-bold text-center block mb-3">
                👀 {t('collections.whatDidYouSee')}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {OBSERVATION_OPTIONS.map((observation) => {
                  const observationKeys = {
                    "Good segregation": "observationGoodSegregation",
                    "Mixed waste": "observationMixedWaste", 
                    "Excessive plastic": "observationExcessivePlastic",
                    "Clean and organized": "observationCleanOrganized",
                    "Poor hygiene": "observationPoorHygiene",
                    "No waste present": "observationNoWaste"
                  };
                  
                  const emoji = {
                    "Good segregation": "✅",
                    "Mixed waste": "🔄", 
                    "Excessive plastic": "🛍️",
                    "Clean and organized": "✨",
                    "Poor hygiene": "🚫",
                    "No waste present": "🗑️"
                  }[observation] || "📝";
                  
                  return (
                    <Button
                      key={observation}
                      variant={collectionForm.observations.includes(observation) ? "default" : "outline"}
                      onClick={() => handleObservationChange(observation, !collectionForm.observations.includes(observation))}
                      className={`p-3 h-auto text-left ${
                        collectionForm.observations.includes(observation)
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-white border-2 hover:bg-blue-50'
                      }`}
                    >
                      <div className="text-lg">{emoji}</div>
                      <div className="text-xs mt-1">{t(`app.${observationKeys[observation]}`)}</div>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Photo Upload - REQUIRED */}
            <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-xl">
              <Label className="text-lg font-bold text-center block mb-3">
                📸 Take Photo of Waste *
              </Label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setCollectionForm({ ...collectionForm, photoFile: file });
                  }}
                />
                <div className={`border-4 border-dashed rounded-xl p-6 text-center transition-all ${
                  collectionForm.photoFile 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-blue-300 bg-white hover:bg-blue-50'
                }`}>
                  {collectionForm.photoFile ? (
                    <>
                      <div className="text-4xl mb-2">✅</div>
                      <p className="text-lg font-bold text-green-700">Photo Taken!</p>
                      <p className="text-sm text-gray-600">{collectionForm.photoFile.name}</p>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-2">📸</div>
                      <p className="text-lg font-bold text-blue-700">Tap to Take Photo</p>
                      <p className="text-sm text-gray-600">Required for collection</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Waste Accepted? */}
            <div>
              <Label className="text-sm font-medium">{t('collections.wasteCollectionStatus')}</Label>
              <div className="flex space-x-4 mt-2">
                <Button
                  variant={collectionForm.wasteAccepted === true ? "default" : "outline"}
                  onClick={() => setCollectionForm({...collectionForm, wasteAccepted: true})}
                  className="flex-1"
                >
                  <CheckCircle className="mr-2" size={16} />
                  {t('collections.collected')}
                </Button>
                <Button
                  variant={collectionForm.wasteAccepted === false ? "destructive" : "outline"}
                  onClick={() => setCollectionForm({...collectionForm, wasteAccepted: false})}
                  className="flex-1"
                >
                  <XCircle className="mr-2" size={16} />
{t('collections.notCollected')}
                </Button>
              </div>
            </div>

            {/* If not collected, show reason */}
            {collectionForm.wasteAccepted === false && (
              <div>
                <Label className="text-sm font-medium">{t('collections.reasonNotCollecting')}</Label>
                <Select
                  value={collectionForm.notCollectedReason}
                  onValueChange={(value) => setCollectionForm({...collectionForm, notCollectedReason: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={t('collections.selectReason')} />
                  </SelectTrigger>
                  <SelectContent>
                    {NOT_COLLECTED_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Voice Recording or Text Comments */}
            <div className="p-3 border border-gray-200 bg-gray-50 rounded-xl">
              <Label className="text-base font-bold text-center block mb-3">
                💬 {t('collections.remarks')} ({t('app.optional')})
              </Label>
              
              {/* Voice Recording */}
              <div className="mb-3">
                <Button
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  className={`w-full py-4 text-lg font-bold ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : collectionForm.voiceRecording
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  disabled={createCollectionMutation.isPending}
                >
                  {isRecording ? (
                    <>🔴 {t('collections.stopRecording')}</>
                  ) : collectionForm.voiceRecording ? (
                    <>✅ {t('collections.voiceRecorded')}</>
                  ) : (
                    <>🎤 {t('collections.recordVoice')}</>
                  )}
                </Button>
              </div>

              {/* Text Input */}
              <div className="text-center text-sm text-gray-600 mb-2">{t('app.or')}</div>
              <Textarea
                placeholder={t('collections.typeComments')}
                rows={2}
                value={collectionForm.remarks}
                onChange={(e) => setCollectionForm({ ...collectionForm, remarks: e.target.value })}
                className="text-base"
              />
            </div>

            {/* Submit Button */}
            <Button
              className={`w-full py-6 text-xl font-bold ${
                // Check if required fields are filled
                collectionForm.wasteSegregated !== null && 
                collectionForm.segregationRating > 0 && 
                collectionForm.photoFile && 
                collectionForm.wasteAccepted !== null &&
                (collectionForm.wasteAccepted || collectionForm.notCollectedReason)
                  ? isOnline 
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
              onClick={() => setShowConfirmSubmit(true)}
              disabled={
                createCollectionMutation.isPending || 
                collectionForm.wasteSegregated === null ||
                collectionForm.segregationRating === 0 ||
                !collectionForm.photoFile ||
                collectionForm.wasteAccepted === null ||
                (collectionForm.wasteAccepted === false && !collectionForm.notCollectedReason)
              }
            >
              {createCollectionMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3" />
                  {isOnline ? 'Submitting...' : 'Saving Offline...'}
                </>
              ) : (
                <>
                  {isOnline ? '✅ SUBMIT COLLECTION' : '💾 SAVE OFFLINE'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Issue Report Modal */}
      <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
        <DialogContent className="w-[96vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 mx-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold text-center text-gray-900">
              🚨 {t('issues.reportIssue')}
            </DialogTitle>
            <p className="text-sm text-gray-600 text-center mt-1">
              {t('issues.helpCommunity')}
            </p>
          </DialogHeader>
          
          <div className="space-y-5">
            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold text-gray-800 flex items-center">
                📝 {t('issues.issueTitle')} <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="title"
                value={newIssue.title}
                onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                placeholder={t('issues.exampleTitle')}
                className="h-12 text-base border-2 focus:border-red-400"
                maxLength={100}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">{newIssue.title.length}/100 characters</p>
                {newIssue.title.trim().length < 3 && newIssue.title.length > 0 && (
                  <p className="text-xs text-red-500">{t('app.minimumChars')}</p>
                )}
              </div>
            </div>
            
            {/* Category Field */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-semibold text-gray-800 flex items-center">
                🏷️ {t('issues.category')} <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select value={newIssue.category} onValueChange={(value) => setNewIssue({ ...newIssue, category: value })}>
                <SelectTrigger className="h-12 text-base border-2 focus:border-red-400">
                  <SelectValue placeholder="Choose the most relevant category" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category} className="text-base py-3">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-gray-800 flex items-center">
                📄 Description <span className="text-red-500 ml-1">*</span>
              </Label>
              <Textarea
                id="description"
                value={newIssue.description}
                onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                placeholder={t('issues.descriptionPlaceholder')}
                rows={5}
                className="text-base border-2 focus:border-red-400 resize-none"
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">{newIssue.description.length}/500 characters</p>
                {newIssue.description.trim().length < 10 && newIssue.description.length > 0 && (
                  <p className="text-xs text-red-500">Minimum 10 characters required</p>
                )}
              </div>
            </div>
            
            {/* Photo Upload Field */}
            <div className="space-y-2">
              <Label htmlFor="photo" className="text-sm font-semibold text-gray-800 flex items-center">
                📸 Photo Evidence (Optional)
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Input
                  id="photo"
                  type="file"
                  accept="image/*,image/heic,image/heif"
                  onChange={(e) => setNewIssue({ ...newIssue, photoFile: e.target.files?.[0] || null })}
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
                      <p className="text-xs text-gray-500">Tap to change photo</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        {t('app.tapToUpload')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('app.photosHelp')}
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
                disabled={createIssueMutation.isPending || !newIssue.title.trim() || !newIssue.category || !newIssue.description.trim() || newIssue.title.trim().length < 3 || newIssue.description.trim().length < 10}
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-base font-semibold"
              >
                {createIssueMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Submitting Issue...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>Submit Issue Report</span>
                  </div>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowIssueModal(false);
                  setNewIssue({ title: "", category: "", description: "", photoFile: null });
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

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending || !newPassword || !confirmPassword}
            >
              {changePasswordMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">✅ Submit Collection?</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <div className="text-lg">
              📋 Are you sure you want to submit this collection for:
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-bold text-lg">{scannedHousehold?.headName}</div>
              <div className="text-sm text-gray-600">{scannedHousehold?.uid}</div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 py-3 text-lg bg-red-100 border-red-300 text-red-700 hover:bg-red-200"
              >
                ❌ Cancel
              </Button>
              <Button
                onClick={handleSubmitCollection}
                className="flex-1 py-3 text-lg bg-green-600 hover:bg-green-700 text-white"
                disabled={createCollectionMutation.isPending}
              >
                {createCollectionMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>✅ OK, SUBMIT</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Collection Details Dialog */}
      <Dialog open={showCollectionDetails} onOpenChange={setShowCollectionDetails}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">📋 Collection Details</DialogTitle>
          </DialogHeader>

          {selectedCollection && (
            <div className="space-y-4">
              {/* Household Info */}
              <div className="text-center p-4 bg-green-50 rounded-xl border-2 border-green-200">
                <div className="text-2xl mb-2">✅</div>
                <p className="font-bold text-lg">{scannedHousehold?.headName}</p>
                <p className="text-sm text-gray-600">{scannedHousehold?.uid}</p>
                <p className="text-xs text-green-600 font-medium">Already collected today!</p>
              </div>

              {/* Collection Info */}
              <div className="bg-white border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-600">Status:</div>
                    <div className="font-medium">{selectedCollection.status}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Time:</div>
                    <div className="font-medium">{new Date(selectedCollection.collectionDate || selectedCollection.createdAt).toLocaleTimeString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Segregation:</div>
                    <div className="font-medium">{selectedCollection.segregationRating}/5 ⭐</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Cleanliness:</div>
                    <div className="font-medium">{selectedCollection.plasticRating}/5 🧹</div>
                  </div>
                </div>

                {selectedCollection.observations?.length > 0 && (
                  <div>
                    <div className="text-gray-600 text-sm mb-1">Observations:</div>
                    <div className="text-sm">{selectedCollection.observations.join(', ')}</div>
                  </div>
                )}

                {selectedCollection.remarks && (
                  <div>
                    <div className="text-gray-600 text-sm mb-1">Comments:</div>
                    <div className="text-sm bg-gray-50 p-2 rounded">{selectedCollection.remarks}</div>
                  </div>
                )}

                {selectedCollection.photoUrl && (
                  <div>
                    <div className="text-gray-600 text-sm mb-1">Photo:</div>
                    <img src={selectedCollection.photoUrl} alt="Collection photo" className="w-full rounded-lg" />
                  </div>
                )}

                {selectedCollection.voiceUrl && (
                  <div>
                    <div className="text-gray-600 text-sm mb-1">Voice Recording:</div>
                    <audio controls className="w-full">
                      <source src={selectedCollection.voiceUrl} type="audio/wav" />
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}
              </div>

              <Button
                onClick={() => setShowCollectionDetails(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 z-20">
        <div className="grid grid-cols-5 gap-1 p-2">
          <button
            className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
              activeTab === 'home' 
                ? 'bg-green-100 text-green-600' 
                : 'text-gray-500 hover:text-green-600 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('home')}
          >
            <Home size={18} />
            <span className="text-xs mt-1">{t('navigation.dashboard')}</span>
          </button>
          <button
            className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
              activeTab === 'scan' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
            }`}
            onClick={() => {
              setActiveTab('scan');
              setShowScanner(true);
            }}
          >
            <QrCode size={18} />
            <span className="text-xs mt-1">{t('collections.scanQR')}</span>
          </button>
          <button
            className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
              activeTab === 'announcements' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('announcements')}
          >
            <Bell size={18} />
            <span className="text-xs mt-1">{t('navigation.announcements')}</span>
          </button>
          <button
            className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
              activeTab === 'issues' 
                ? 'bg-red-100 text-red-600' 
                : 'text-gray-500 hover:text-red-600 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('issues')}
          >
            <AlertCircle size={18} />
            <span className="text-xs mt-1">{t('navigation.issues')}</span>
          </button>
          <button
            className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
              activeTab === 'profile' 
                ? 'bg-gray-100 text-gray-600' 
                : 'text-gray-500 hover:text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            <span className="text-xs mt-1">{t('navigation.profile')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}