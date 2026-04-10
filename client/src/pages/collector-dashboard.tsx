import { useState } from "react";
import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { translateEnum } from '../i18n/enumTranslations';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient, fetchWithCsrf } from "@/lib/queryClient";
import { QRScanner } from "@/components/qr-scanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useOfflineStorage, offlineStorage } from "@/lib/offline-storage";
import { TourButton } from "@/components/tours/TourButton";
import CollectorWasteLog from "@/components/collector/CollectorWasteLog";
import {
  Home,
  QrCode,
  User,
  Camera,
  ScanLine,
  AlertTriangle,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  Search,
  Plus,
  Settings,
  Bell,
  MapPin,
  Upload,
  Leaf,
  Globe,
  Trash2,
} from "lucide-react";

interface CollectionForm {
  wasteSegregated: boolean | null;
  wasteAccepted: boolean | null;
  segregationRating: number;
  remarks: string;
  photoFile: File | null;
  voiceRecording: File | null;
  notCollectedReason: string;
  wasteTypes: string[];
  weightKg: string;
}


const NOT_COLLECTED_REASONS = [
  'Waste Not segregated',
  'House locked',
  'No one home',
  'No waste to collect',
  'House not accessible',
  'Resident refused',
  'Other'
];

const ISSUE_CATEGORIES = [
  'Illegal Dumping',
  'Collection Delay',
  'Missed Pickup',
  'Road Cleanliness',
  'Plastic Usage',
  'Collector Behavior',
  'Infrastructure',
  'Other'
];


export default function CollectorDashboard() {
  const [isSubmitLocked, setIsSubmitLocked] = useState(false);

  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isOnline, pendingCount, isSyncing, storeCollectionOffline, storeFileOffline, syncPendingData } = useOfflineStorage();

  const [showScanner, setShowScanner] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [scannedHousehold, setScannedHousehold] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Shift tab state
  const [showShiftScanner, setShowShiftScanner] = useState(false);
  const [shiftScanResult, setShiftScanResult] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [collectionForm, setCollectionForm] = useState<CollectionForm>({
    wasteSegregated: null,
    wasteAccepted: null,
    segregationRating: 0,
    remarks: "",
    photoFile: null,
    voiceRecording: null,
    notCollectedReason: "",
    wasteTypes: [],
    weightKg: ""
  });

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCollectionDetails, setShowCollectionDetails] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueFilter, setIssueFilter] = useState('All');

  const [newIssue, setNewIssue] = useState({
    title: "",
    category: "",
    description: "",
    photoFile: null as File | null,
  });

  // Fetch today's route (households)
  const householdsQuery = useQuery<any[]>({
    queryKey: ["/api/households"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/households");
      return response.json();
    },
  });

  // Fetch collections for today
  const collectionsQuery = useQuery<any[]>({
    queryKey: ["/api/waste-collections/collector"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/waste-collections/collector");
      return response.json();
    },
  });

  // Fetch announcements
  const { data: announcements, isLoading: announcementsLoading } = useQuery<any[]>({
    queryKey: ["/api/announcements"],
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch village issues
  const { data: issues, isLoading: issuesLoading } = useQuery<any[]>({
    queryKey: ["/api/issues"],
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch village-wide today collection count
  const { data: villageTodayData } = useQuery<{ collectedToday: number }>({
    queryKey: ["/api/village/today-count"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/village/today-count");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch current village data to get image upload requirements
  const { data: villageData } = useQuery<any>({
    queryKey: ["/api/villages", user?.villageId, "details"],
    queryFn: async () => {
      if (!user?.villageId) return null;
      const response = await apiRequest("GET", `/api/villages/${user.villageId}`);
      return response.json();
    },
    enabled: !!user?.villageId,
  });

  // Fetch current shift state (for Shift tab)
  const { data: shiftState, refetch: refetchShiftState } = useQuery<any>({
    queryKey: ["/api/attendance/my-shift"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/attendance/my-shift");
      return response.json();
    },
    enabled: !!user?.villageId && !!villageData?.attendanceEnabled,

  });

  // Shift scan mutation
  const shiftScanMutation = useMutation({
    mutationFn: async (data: { qrToken: string; latitude: number; longitude: number }) => {
      const response = await apiRequest("POST", "/api/attendance/scan-shift", data);
      if (!response.ok) {
        const err = await response.json();
        throw err;
      }
      return response.json();
    },
    onSuccess: (result) => {
      setShiftScanResult(result);
      refetchShiftState();
      toast({
        title: result.eventType === 'shift_start' ? t('collector.shiftStarted') : t('collector.shiftEnded'),
        description: `Shift #${result.shiftNumber} ${result.eventType === 'shift_start' ? 'started' : 'ended'} at ${result.centerName} (${result.distance}m away)`,
      });
    },
    onError: (error: any) => {
      if (error.error === 'too_far') {
        setShiftScanResult({
          error: 'too_far',
          distance: error.distance,
          maxDistance: error.maxDistance,
          message: t('collector.tooFarFromCenter'),
        });
      } else {
        toast({
          title: t('app.error'),
          description: t('app.error'),
          variant: "destructive",
        });
      }
    },
  });

  // Handle shift QR scan
  const handleShiftQRScan = async (qrData: string) => {
    setShowShiftScanner(false);
    setShiftScanResult(null);

    try {
      let qrToken: string | null = null;
      try {
        const parsed = JSON.parse(qrData);
        if (parsed.type === 'attendance' && parsed.token) {
          qrToken = parsed.token;
        }
      } catch {
        // Not JSON
      }

      if (!qrToken) {
        toast({
          title: t('app.error'),
          description: t('app.error'),
          variant: "destructive",
        });
        return;
      }

      // Get GPS
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      shiftScanMutation.mutate({
        qrToken,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error: any) {
      toast({
        title: t('app.error'),
        description: t('app.error'),
        variant: "destructive",
      });
    }
  };

  const households = householdsQuery.data;
  const collections = collectionsQuery.data;
  const householdsLoading = householdsQuery.isLoading;

  // Helper function to determine if photo is required
  const isPhotoRequired = React.useMemo(() => {
    const village = villageData;
    if (!village) return true; // Default to required if village data not loaded

    // If village requires images for all collections
    if (village.imageUploadRequired) {
      return true;
    }

    // If village doesn't require images, only require for ratings <= 3
    const hasLowRating = collectionForm.segregationRating <= 3 && collectionForm.segregationRating > 0;
    return hasLowRating;
  }, [villageData, collectionForm.segregationRating]);

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
    onSuccess: (newCollection) => {
      // Play success sound — 3-note ascending chime
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playTone = (freq: number, start: number, dur: number, vol = 0.25) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(vol, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + dur);
        };
        playTone(659, 0, 0.18);     // E5
        playTone(880, 0.15, 0.18);  // A5
        playTone(1318, 0.30, 0.35); // E6 — held slightly longer
      } catch (_) { }

      toast({ title: '✅', description: t('collector.collectionRecorded') });

      // Invalidate queries (triggers automatic refetch)
      queryClient.invalidateQueries({ queryKey: ["/api/waste-collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      setRefreshTrigger(prev => prev + 1);
    },
    onError: (error: any) => {
      const errorMsg = error?.message || '';
      // Handle duplicate collection error (apiRequest throws Error with "409: ..." message)
      if (errorMsg.startsWith('409')) {
        toast({
          title: t('app.error'),
          description: t('collector.alreadyCollected'),
          variant: "destructive",
        });
      } else {
        console.error('[Collection Submit Error]', errorMsg);
        toast({
          title: t('app.error'),
          description: t('collector.collectionFailed'),
          variant: "destructive",
        });
      }
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
        title: t('app.success'),
        description: t('app.changePassword'),
      });
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (_error: unknown) => {
      toast({
        title: t('app.error'),
        description: t('collector.changePasswordError'),
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
          formData.append("file", newIssue.photoFile);

          const uploadResponse = await fetchWithCsrf("/api/upload/photo", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.text();
            throw new Error(
              `Photo upload failed: ${uploadResponse.status} ${errorData}`,
            );
          }

          const uploadResult = await uploadResponse.json();
          photoUrl = uploadResult.url;
        } catch (uploadError) {
          toast({
            title: t('app.error'),
            description: t('app.error'),
            variant: "destructive",
          });
          photoUrl = null;
        }
      }

      const response = await fetchWithCsrf("/api/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...issueData,
          photoUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Failed to create issue: ${response.status} ${errorData}`,
        );
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      setShowIssueModal(false);
      setNewIssue({
        title: "",
        category: "",
        description: "",
        photoFile: null,
      });
      toast({
        title: t('app.success'),
        description: t('collector.issueReportedSuccess'),
      });
    },
    onError: (_error: unknown) => {
      toast({
        title: t('app.error'),
        description: t('collector.issueReportedError'),
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setCollectionForm({
      wasteSegregated: null,
      wasteAccepted: null,
      segregationRating: 0,
      remarks: "",
      photoFile: null,
      voiceRecording: null,
      notCollectedReason: "",
      wasteTypes: [],
      weightKg: ""
    });
    setScannedHousehold(null);
    setShowConfirmSubmit(false);
    setIsSubmitLocked(false);
  };

  const handleQRScan = async (qrData: string) => {
    setShowScanner(false);

    try {
      let householdData;
      let uidToSearch: string | null = null;

      // Try to parse as JSON first (for QR codes with household data)
      try {
        const parsedData = JSON.parse(qrData);
        // Accept both 'household' type (from households created with data) 
        // and 'premapped' type (from batch-generated QR codes later filled by field workers)
        if (parsedData.uid && (parsedData.type === 'household' || parsedData.type === 'premapped')) {
          uidToSearch = parsedData.uid;
        } else if (parsedData.uid) {
          // Accept any QR with a uid field
          uidToSearch = parsedData.uid;
        } else {
          throw new Error("Invalid QR format");
        }
      } catch (parseError) {
        // If not JSON, treat as household UID directly
        uidToSearch = qrData;
      }

      if (uidToSearch) {
        // Find the full household data from our local households
        const household = households?.find((h: any) => h.uid === uidToSearch);
        if (household) {
          householdData = household;
        } else {
          throw new Error("Household not found in your route");
        }
      }

      if (householdData) {
        setScannedHousehold(householdData);
        checkDailySubmission(householdData);
      } else {
        throw new Error("Household not found");
      }
    } catch (error) {
      toast({
        title: t('app.error'),
        description: t('app.error'),
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
        title: t('app.error'),
        description: t('collector.alreadyCollected'),
      });
    } else {
      setShowCollectionModal(true);
    }
  };

  const handleHouseholdSelect = (household: any) => {
    setScannedHousehold(household);
    checkDailySubmission(household);
  };





  // Smart waste type preselection based on segregation answer
  React.useEffect(() => {
    if (collectionForm.wasteSegregated === true) {
      // Segregated = yes → preselect wet + dry
      setCollectionForm(prev => ({ ...prev, wasteTypes: ['wet', 'dry'] }));
    } else if (collectionForm.wasteSegregated === false) {
      // Segregated = no → preselect mixed
      setCollectionForm(prev => ({ ...prev, wasteTypes: ['mixed'] }));
    } else if (collectionForm.wasteAccepted === false) {
      // Not collected → no types
      setCollectionForm(prev => ({ ...prev, wasteTypes: [] }));
    }
  }, [collectionForm.wasteSegregated, collectionForm.wasteAccepted]);

  const toggleWasteType = (type: string) => {
    setCollectionForm(prev => {
      const types = prev.wasteTypes.includes(type)
        ? prev.wasteTypes.filter(t => t !== type)
        : [...prev.wasteTypes, type];
      return { ...prev, wasteTypes: types };
    });
  };

  const handleStarClick = (_type: 'segregation', rating: number) => {
    const maxRating = collectionForm.wasteSegregated === false ? 3 : 5;
    setCollectionForm({ ...collectionForm, segregationRating: Math.min(rating, maxRating) });
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
        title: t('app.error'),
        description: t('app.error'),
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

  // Check if collection already exists for this household today (online + offline)
  const checkDuplicateCollection = async (householdUid: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check online collections
    if (collections) {
      const hasOnlineDuplicate = collections.some((collection: any) => {
        if (!collection.household || collection.household.uid !== householdUid) return false;

        const collectionDate = new Date(collection.collectionDate);
        return collectionDate >= today && collectionDate < tomorrow;
      });

      if (hasOnlineDuplicate) return true;
    }

    // Check pending offline collections
    try {
      const pendingResult = await offlineStorage.getPendingCollections();
      if (pendingResult.success && pendingResult.data) {
        const hasOfflineDuplicate = pendingResult.data.some((collection: any) => {
          if (collection.householdUid !== householdUid) return false;

          const collectionDate = new Date(collection.collectionDate);
          return collectionDate >= today && collectionDate < tomorrow;
        });

        if (hasOfflineDuplicate) return true;
      }
    } catch (error) {
    }

    return false;
  };

  const handleSubmitCollection = async () => {
    if (!scannedHousehold) return;

    // Prevent double submissions
    if (isSubmitLocked || createCollectionMutation.isPending) {
      return;
    }

    // Check for duplicate collection (both online and offline)
    if (await checkDuplicateCollection(scannedHousehold.uid)) {
      toast({
        title: t('app.error'),
        description: t('collector.alreadyCollected'),
        variant: "destructive",
      });
      setIsSubmitLocked(false); // Unlock since we're not proceeding
      return;
    }

    // Lock submissions
    setIsSubmitLocked(true);

    try {
      // Snapshot form data before resetting
      const collectionData = {
        householdUid: scannedHousehold.uid,
        status: collectionForm.wasteAccepted ? 'collected' : 'missed',
        segregationRating: collectionForm.segregationRating,
        remarks: collectionForm.remarks,
        missedReason: collectionForm.wasteAccepted ? null : collectionForm.notCollectedReason,
        collectionDate: new Date().toISOString(),
        latitude: null,
        longitude: null,
        wasteTypes: collectionForm.wasteAccepted ? collectionForm.wasteTypes : [],
        weightKg: collectionForm.wasteAccepted && collectionForm.weightKg ? collectionForm.weightKg : null,
      };
      const snapshotPhotoFile = collectionForm.photoFile;
      const snapshotVoiceFile = collectionForm.voiceRecording;

      // Reset form immediately so collector can scan next household
      resetForm();

      if (isOnline) {
        // Online mode - try to upload files and submit immediately
        try {
          let photoUrl = null;
          let voiceUrl = null;

          // Upload photo to Cloudinary if present
          if (snapshotPhotoFile) {
            const photoFormData = new FormData();
            photoFormData.append('file', snapshotPhotoFile);

            const photoResponse = await fetchWithCsrf('/api/upload/photo', {
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
          if (snapshotVoiceFile) {
            const voiceFormData = new FormData();
            voiceFormData.append('file', snapshotVoiceFile);

            const voiceResponse = await fetchWithCsrf('/api/upload/voice', {
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
            title: t('app.error'),
            description: t('collector.collectionSavedOffline'),
            variant: "default",
          });
          await handleOfflineSubmission(collectionData, snapshotPhotoFile, snapshotVoiceFile);
        }
      } else {
        // Offline mode - store data locally
        await handleOfflineSubmission(collectionData, snapshotPhotoFile, snapshotVoiceFile);
      }

      setShowConfirmSubmit(false);
      setIsSubmitLocked(false);
    } catch (error) {
      toast({
        title: t('app.error'),
        description: t('app.error'),
        variant: "destructive",
      });
      setIsSubmitLocked(false);
    }
  };

  const handleOfflineSubmission = async (collectionData: any, photoFile?: File | null, voiceFile?: File | null) => {
    try {
      let photoFileId = null;
      let voiceFileId = null;

      // Store files offline if present
      if (photoFile) {
        const photoResult = await storeFileOffline(photoFile, 'photo');
        if (photoResult.success) {
          photoFileId = photoResult.fileId;
        }
      }

      if (voiceFile) {
        const voiceResult = await storeFileOffline(voiceFile, 'voice');
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
        // Play success sound
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const playTone = (freq: number, start: number, dur: number, vol = 0.25) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(vol, ctx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur);
          };
          playTone(659, 0, 0.18);
          playTone(880, 0.15, 0.18);
          playTone(1318, 0.30, 0.35);
        } catch (_) { }

        toast({ title: '✅', description: t('collector.collectionSavedOffline') });
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(result.error || 'Failed to store offline');
      }
    } catch (error) {
      toast({
        title: t('app.error'),
        description: t('app.error'),
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: t('app.error'),
        description: t('collector.passwordsMismatch'),
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t('app.error'),
        description: t('collector.passwordTooShort'),
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
        title: t('app.error'),
        description:
          "Please fill in all required fields (Title, Category, Description)",
        variant: "destructive",
      });
      return;
    }

    if (trimmedTitle.length < 3) {
      toast({
        title: t('app.error'),
        description: t('app.minimumChars'),
        variant: "destructive",
      });
      return;
    }

    if (trimmedDescription.length < 10) {
      toast({
        title: t('app.error'),
        description: t('app.minimum10Chars'),
        variant: "destructive",
      });
      return;
    }

    // Check file size if photo is provided
    if (newIssue.photoFile) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (newIssue.photoFile.size > maxSize) {
        toast({
          title: t('app.error'),
          description: t('app.error'),
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
      {/* Dashboard Tour Component
      <DashboardTour 
        userRole="collector" 
        shouldShowWelcome={user?.isFirstLogin}
      /> */}

      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-3 sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="flex items-center justify-between">
          <img src="/logos/logo-full.svg" alt="GreenPath" className="w-auto h-10" />
          <div className="flex items-center gap-2">
            {/* Show Me in header when odd nav tabs for even distribution */}
            {((villageData?.attendanceEnabled ? 1 : 0) + 1 + (villageData?.collectorWasteLogEnabled ? 1 : 0) + 1) % 2 !== 0 && (
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${activeTab === 'profile'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
                  }`}
              >
                <User size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-28">

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-4 p-4">
            {/* Stats Cards - Premium Glassmorphic */}
            <div className="collector-daily-stats grid grid-cols-3 gap-2.5" key={`stats-${collectionsToday.length}`}>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-2xl shadow-md shadow-blue-200/50">
                <div className="text-2xl font-black text-white">{households?.length || 0}</div>
                <div className="text-[9px] text-blue-100 font-semibold uppercase tracking-wider mt-0.5">{t("collector.totalAssigned")}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-green-700 p-3 rounded-2xl shadow-md shadow-green-200/50">
                <div className="text-2xl font-black text-white">{collectionsToday.length}</div>
                <div className="text-[9px] text-green-100 font-semibold uppercase tracking-wider mt-0.5">{t("collector.collected")}</div>
              </div>
              <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-3 rounded-2xl shadow-md shadow-purple-200/50">
                <div className="text-2xl font-black text-white">{villageTodayData?.collectedToday ?? '—'}</div>
                <div className="text-[9px] text-purple-100 font-semibold uppercase tracking-wider mt-0.5">{t("collector.villageTotal")}</div>
              </div>
            </div>

            {/* Offline Status and Sync */}
            {!isOnline && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-red-700">{t("collector.offlineMode")}</span>
                  </div>
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {pendingCount} {t("collector.pendingSyncCount")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-red-600 mt-1">
                  {t('collector.offlineModeDesc')}
                </p>
              </div>
            )}

            {isOnline && pendingCount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-blue-700">{t("collector.pendingSyncCount")}</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {pendingCount} {t('collector.collectionsToday')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={isSyncing}
                    onClick={async () => {
                      const result = await syncPendingData();
                      if (result.success) {
                        toast({
                          title: t('app.success'),
                          description: t('collector.syncSuccess'),
                        });
                      } else if (result.error === t('app.loading')) {
                        toast({
                          title: t('app.loading'),
                          description: t('app.loading'),
                          variant: "default",
                        });
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-xs"
                  >
                    {isSyncing ? t("collector.syncing") : t("collector.syncNow")}
                  </Button>
                </div>
              </div>
            )}

            {/* Search Bar - Premium */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-300" size={18} />
              <Input
                placeholder={t("collector.enterHouseholdId") || "Search by name, ID, or house no..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 text-sm rounded-2xl border-gray-200 bg-white shadow-sm h-11 focus:ring-2 focus:ring-green-200 focus:border-green-400"
              />
            </div>

            {/* Household List */}
            <div className="collector-recent-collections" key={`household-list-${refreshTrigger}-${collectionsToday.length}`}>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                {searchQuery ? `${t('app.search')} (${filteredHouseholds.length})` : t('navigation.households')}
              </h3>
              {(searchQuery ? filteredHouseholds : households || []).length > 0 ? (
                <div className="space-y-2">
                  {(searchQuery ? filteredHouseholds : households || []).map((household: any) => {
                    const status = getHouseholdStatus(household);
                    const todaysCollection = collectionsToday.find((c: any) => c.householdId === household.id);

                    return (
                      <div
                        key={`household-${household.id}-${status}-${collectionsToday.length}-${refreshTrigger}`}
                        className={`bg-white p-3.5 rounded-2xl border transition-all active:scale-[0.98] ${status === 'completed'
                          ? 'border-green-200 shadow-sm'
                          : 'border-gray-100 shadow-sm'
                          }`}
                        onClick={() => handleHouseholdSelect(household)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Status indicator */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${status === 'completed'
                            ? 'bg-green-100'
                            : 'bg-orange-50'
                            }`}>
                            {status === 'completed' ? (
                              <CheckCircle size={20} className="text-green-500" />
                            ) : (
                              <Plus size={18} className="text-orange-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-900 truncate">{household.headName}</div>
                            <div className="text-[10px] text-gray-400 font-medium">#{household.houseNumber} · {household.uid}</div>
                            {todaysCollection && (
                              <div className="text-[9px] text-green-500 font-semibold mt-0.5">
                                ✓ {new Date(todaysCollection.collectionDate || todaysCollection.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </div>
                            )}
                          </div>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'completed' ? 'bg-green-400' : 'bg-orange-300'
                            }`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Home className="text-gray-300" size={28} />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {searchQuery ? t('collector.noHouseholdFound') : t('collector.noHouseholdFound')}
                  </p>
                </div>
              )}
            </div>
            {/* spacer so list doesn't hide behind floating button */}
            <div className="h-16" />
          </div>
        )}

        {/* SCAN TAB */}
        {/* SHIFT TAB */}
        {activeTab === 'shift' && villageData?.attendanceEnabled && (
          <div className="p-4 space-y-4">
            {/* Today header */}
            <div className="text-center">
              <p className="text-sm text-gray-500 font-medium">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>

            {/* Attendance status (marked by manager) */}
            {shiftState?.attendanceStatus && (
              <div className={`rounded-xl p-3 flex items-center gap-3 ${shiftState.attendanceStatus === 'present' ? 'bg-green-50 border border-green-200' :
                shiftState.attendanceStatus === 'half_day' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${shiftState.attendanceStatus === 'present' ? 'bg-green-500' :
                  shiftState.attendanceStatus === 'half_day' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}>
                  {shiftState.attendanceStatus === 'present' ? '✓' :
                    shiftState.attendanceStatus === 'half_day' ? '½' : '✗'}
                </div>
                <div>
                  <p className={`text-sm font-bold ${shiftState.attendanceStatus === 'present' ? 'text-green-700' :
                    shiftState.attendanceStatus === 'half_day' ? 'text-yellow-700' :
                      'text-red-700'
                    }`}>
                    {shiftState.attendanceStatus === 'present' ? t('attendance.present') :
                      shiftState.attendanceStatus === 'half_day' ? t('attendance.halfDay') : t('attendance.absent')}
                  </p>
                  <p className="text-[10px] text-gray-400">{t("roles.manager")}</p>
                </div>
              </div>
            )}

            {/* Shift status */}
            {!shiftState || shiftState.shifts?.length === 0 ? (
              // No shift started
              <div className="text-center space-y-6 pt-8">
                <div className="bg-gray-50 rounded-2xl p-6">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-lg font-bold text-gray-700">{t("collector.noActiveShift")}</p>
                  <p className="text-sm text-gray-400 mt-1">{t("collector.scanToStartShift")}</p>
                </div>

                <button
                  onClick={() => { setShiftScanResult(null); setShowShiftScanner(true); }}
                  disabled={shiftScanMutation.isPending}
                  className="w-full py-5 bg-green-500 hover:bg-green-700 active:bg-green-700 text-white rounded-2xl text-lg font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-200"
                >
                  <Camera className="h-7 w-7" />
                  {shiftScanMutation.isPending ? t('collector.syncing') : t('collector.startShift')}
                </button>
              </div>
            ) : shiftState.isShiftActive ? (
              // Shift active — show status + end button
              <div className="space-y-4">
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 text-center">
                  <div className="text-xs font-bold text-green-700 uppercase tracking-widest mb-1">{t("collector.onDuty")}</div>
                  <p className="text-lg font-bold text-green-700">
                    Shift #{shiftState.currentShiftNumber} · Started at{' '}
                    {new Date(shiftState.shifts[shiftState.shifts.length - 1]?.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                </div>

                <button
                  onClick={() => { setShiftScanResult(null); setShowShiftScanner(true); }}
                  disabled={shiftScanMutation.isPending}
                  className="w-full py-5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-2xl text-lg font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-200"
                >
                  <Camera className="h-7 w-7" />
                  {shiftScanMutation.isPending ? t('collector.syncing') : t('collector.endShift')}
                </button>

                {/* Can also start another shift */}
              </div>
            ) : (
              // All shifts completed
              <div className="space-y-4">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 text-center">
                  <CheckCircle className="h-10 w-10 text-blue-500 mx-auto mb-2" />
                  <p className="text-lg font-bold text-blue-700">
                    {shiftState.shifts.length} Shift{shiftState.shifts.length > 1 ? 's' : ''} Completed
                  </p>
                </div>

                {/* Start another shift */}
                <button
                  onClick={() => { setShiftScanResult(null); setShowShiftScanner(true); }}
                  disabled={shiftScanMutation.isPending}
                  className="w-full py-4 bg-green-100 hover:bg-green-200 text-green-700 rounded-2xl text-base font-bold flex items-center justify-center gap-3 transition-all border-2 border-green-300"
                >
                  <Camera className="h-6 w-6" />
                  {t("collector.startShift")}
                </button>
              </div>
            )}

            {/* GPS error */}
            {shiftScanResult?.error === 'too_far' && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center">
                <XCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                <p className="text-base font-bold text-red-700">{t("collector.shiftScanFailed")}</p>
                <p className="text-sm text-red-600 mt-1">
                  You are <span className="font-bold">{shiftScanResult.distance}m</span> away
                </p>
                <p className="text-xs text-red-400 mt-0.5">
                  Must be within {shiftScanResult.maxDistance}m
                </p>
                <button
                  onClick={() => { setShiftScanResult(null); setShowShiftScanner(true); }}
                  className="mt-3 px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Shift Timeline */}
            {shiftState?.shifts?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{t('collector.shiftStatus')}</p>
                <div className="space-y-2">
                  {shiftState.shifts.map((shift: any) => (
                    <div key={shift.shiftNumber} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800">Shift #{shift.shiftNumber}</p>
                        <p className="text-xs text-gray-500">
                          {shift.startedAt
                            ? new Date(shift.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                            : '—'}
                          {' → '}
                          {shift.endedAt
                            ? new Date(shift.endedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                            : t('collector.active')}
                        </p>
                      </div>
                      <div className="text-right">
                        {shift.endedAt ? (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            {Math.round((new Date(shift.endedAt).getTime() - new Date(shift.startedAt).getTime()) / 60000)}m
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 text-xs animate-pulse">Active</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shift QR Scanner */}
        {showShiftScanner && (
          <div className="fixed inset-0 z-50 bg-black">
            <QRScanner
              onScan={handleShiftQRScan}
              onClose={() => setShowShiftScanner(false)}
            />
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto"></div>
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
                onClick={() => setShowIssueModal(true)}
                className="h-10 flex space-y-1 bg-red-50 text-red-700 hover:bg-red-100"
                variant="outline"
              >
                <Plus className="w-6 h-6" />
                <span className="text-xs">{t('issues.reportIssue')}</span>
              </Button>
            </div>

            {/* Filter Tabs */}
            <div className="flex justify-evenly space-x-2 overflow-x-auto pb-2">
              {[
                { key: 'All', label: t('app.all') },
                { key: 'Open', label: t('issues.open') },
                { key: t('issues.inProgress'), label: t('issues.inProgress') },
                { key: t('issues.resolved'), label: t('issues.resolved') }
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

            {issuesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">{t("app.loading")}...</p>
              </div>
            ) : issues && issues.length > 0 ? (
              <div className="space-y-3">
                {issues
                  .filter((issue: any) => {
                    // Filter by status
                    let statusMatch = true;
                    if (issueFilter === 'Open') statusMatch = issue.status === 'open';
                    else if (issueFilter === t('issues.inProgress')) statusMatch = issue.status === 'in_progress';
                    else if (issueFilter === t('issues.resolved')) statusMatch = issue.status === 'resolved';


                    return statusMatch;
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
                            {issue.status === 'open' ? t('issues.open') :
                              issue.status === 'in_progress' ? t('issues.inProgress') : t('issues.resolved')}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3 h-3" />
                            <span className="font-medium">{translateEnum('issueCategory', issue.category)}</span>
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
                              alt={t('collector.issuePhoto')}
                              className="w-full h-32 object-cover rounded-lg cursor-pointer"
                              onClick={() => window.open(issue.photoUrl, '_blank')}
                            />
                          </div>
                        )}

                        {issue.managerReply && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                            <div className="flex items-center space-x-2 mb-1">
                              <CheckCircle className="w-4 h-4 text-green-700" />
                              <p className="text-xs font-semibold text-green-800">{t("collector.managerResponse")}:</p>
                            </div>
                            <p className="text-xs text-green-700 leading-relaxed">{issue.managerReply}</p>
                            {/* Show manager's proof photo if available */}
                            {issue.managerProofPhotoUrl && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-green-800 mb-1">{t("collector.managerResponseProof")}:</p>
                                <img
                                  src={issue.managerProofPhotoUrl}
                                  alt={t('collector.managerProofPhoto')}
                                  className="w-16 h-16 object-cover rounded cursor-pointer"
                                  onClick={() => window.open(issue.managerProofPhotoUrl, "_blank")}
                                />
                              </div>
                            )}
                            {issue.updatedAt && (
                              <p className="text-xs text-green-700 mt-1">
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t("collector.noIssuesFound")}</h3>
                    <p className="text-gray-500 mb-4">{t("collector.noIssuesFoundDesc")}</p>
                    <Button
                      onClick={() => setShowIssueModal(true)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("collector.reportIssue")}
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('collector.noIssuesFound')}</h3>
                    <p className="text-gray-500 mb-4">{t('collector.noIssuesFoundDesc')}</p>
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

        {/* WASTE LOG TAB — only if enabled */}
        {activeTab === 'wastelog' && villageData?.collectorWasteLogEnabled && (
          <CollectorWasteLog />
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("collector.profile")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <User size={32} className="text-green-700" />
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

                <div className="flex items-center justify-between w-full px-1">
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                    <Globe size={20} className="text-gray-500" />
                    {t('generator.language')}
                  </div>
                  <LanguageSwitcher />
                </div>

                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => logout()}
                >
                  <LogOut className="mr-3" size={20} />
                  {t('auth.logout')}
                </Button>
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


      {/* Collection Form — Full Screen Premium Overlay */}
      {showCollectionModal && (
        <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col max-w-md mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white px-4 pt-4 pb-5 flex items-center gap-3 shadow-lg flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{scannedHousehold?.headName || ""}</h2>
              <p className="text-xs text-white/70 font-medium">#{scannedHousehold?.houseNumber} · {scannedHousehold?.uid}</p>
            </div>
            <button
              onClick={() => { setShowCollectionModal(false); resetForm(); }}
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all"
            >
              <XCircle className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* 1. Collection Status — FIRST QUESTION */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 text-center">
                {t('collections.wasteCollectionStatus')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setCollectionForm({ ...collectionForm, wasteAccepted: true, notCollectedReason: '' })}
                  className={`flex-1 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${collectionForm.wasteAccepted === true
                    ? 'bg-green-500 text-white shadow-md shadow-green-200'
                    : 'bg-green-50 text-green-700 border-2 border-green-200'
                    }`}
                >
                  <CheckCircle size={18} /> {t('collections.collected')}
                </button>
                <button
                  onClick={() => setCollectionForm({ ...collectionForm, wasteAccepted: false })}
                  className={`flex-1 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${collectionForm.wasteAccepted === false
                    ? 'bg-red-500 text-white shadow-md shadow-red-200'
                    : 'bg-red-50 text-red-700 border-2 border-red-200'
                    }`}
                >
                  <XCircle size={18} /> {t('collections.notCollected')}
                </button>
              </div>
            </div>

            {/* 1b. Reason if not collected */}
            {collectionForm.wasteAccepted === false && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 text-center">
                  {t('collections.reasonNotCollecting')}
                </p>
                <Select
                  value={collectionForm.notCollectedReason}
                  onValueChange={(value) => {
                    const updates: any = { notCollectedReason: value };
                    if (value === t('enums.notCollectedReasons.wasteNotSegregated')) {
                      updates.wasteSegregated = false;
                      updates.segregationRating = 2;
                    }
                    setCollectionForm({ ...collectionForm, ...updates });
                  }}
                >
                  <SelectTrigger className="rounded-2xl h-12 text-sm font-semibold">
                    <SelectValue placeholder={t('collections.selectReason')} />
                  </SelectTrigger>
                  <SelectContent>
                    {NOT_COLLECTED_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>{translateEnum('notCollectedReason', reason)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Show segregation sections: when collected OR when not-collected reason is t('enums.notCollectedReasons.wasteNotSegregated') */}
            {(collectionForm.wasteAccepted === true || (collectionForm.wasteAccepted === false && collectionForm.notCollectedReason === 'Waste Not segregated')) && (
              <>
                {/* Waste Segregated? */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 text-center">
                    {t('collections.wasteProperlySegregated')}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCollectionForm({ ...collectionForm, wasteSegregated: true })}
                      className={`flex-1 py-4 rounded-2xl text-base font-bold transition-all active:scale-95 ${collectionForm.wasteSegregated === true
                        ? 'bg-green-500 text-white shadow-md shadow-green-200'
                        : 'bg-green-50 text-green-700 border-2 border-green-200'
                        }`}
                    >
                      ✅ {t('app.yes')}
                    </button>
                    <button
                      onClick={() => setCollectionForm({ ...collectionForm, wasteSegregated: false, segregationRating: 2 })}
                      className={`flex-1 py-4 rounded-2xl text-base font-bold transition-all active:scale-95 ${collectionForm.wasteSegregated === false
                        ? 'bg-red-500 text-white shadow-md shadow-red-200'
                        : 'bg-red-50 text-red-700 border-2 border-red-200'
                        }`}
                    >
                      ❌ {t('app.no')}
                    </button>
                  </div>
                </div>

                {/* Star Rating */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 text-center">
                    {t('collections.howGoodSegregation')}
                  </p>
                  <div className="flex justify-center gap-2.5">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        className={`w-12 h-12 rounded-full transition-all active:scale-90 ${rating <= collectionForm.segregationRating
                          ? 'bg-amber-400 shadow-lg shadow-amber-200 scale-110'
                          : 'bg-gray-100'
                          }`}
                        onClick={() => handleStarClick('segregation', rating)}
                      >
                        <span className="text-xl">{rating <= collectionForm.segregationRating ? '⭐' : '☆'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Sections only when collected */}
            {collectionForm.wasteAccepted === true && (
              <>
                {/* Waste Types */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 text-center">
                    {t('collections.typeOfWasteRecieved')}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      { key: 'wet', label: t('enums.wet'), emoji: '🟢', bg: '#22c55e' },
                      { key: 'dry', label: t('enums.dry'), emoji: '🔵', bg: '#3b82f6' },
                      { key: 'sanitary', label: t('enums.sanitary'), emoji: '🟣', bg: '#a855f7' },
                      { key: 'special_care', label: t('enums.specialCare'), emoji: '🟡', bg: '#eab308' },
                      { key: 'mixed', label: t('enums.mixed'), emoji: '⚫', bg: '#6b7280' },
                    ].map(({ key, label, emoji, bg }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleWasteType(key)}
                        className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95 ${collectionForm.wasteTypes.includes(key)
                          ? 'text-white shadow-md'
                          : 'bg-gray-50 text-gray-600 border-2 border-gray-200'
                          }`}
                        style={collectionForm.wasteTypes.includes(key) ? { backgroundColor: bg } : {}}
                      >
                        {emoji} {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weight */}
                {villageData?.weightRequired && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 text-center">
                      {t('collector.collectionForm')}
                    </p>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={collectionForm.weightKg}
                      onChange={(e) => setCollectionForm({ ...collectionForm, weightKg: e.target.value })}
                      placeholder="0.0"
                      className="text-center text-2xl font-black h-14 rounded-2xl border-2 border-gray-200 bg-gray-50"
                    />
                  </div>
                )}
              </>
            )}

            {/* 6. Photo */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 text-center">
                📸 Photo {isPhotoRequired ? t('collector.photoRequired') : t('app.optional')}
              </p>
              {isPhotoRequired && collectionForm.segregationRating <= 3 && collectionForm.segregationRating > 0 && (
                <p className="text-[10px] text-red-500 text-center mb-2 font-semibold">{t("collector.photoRequired")}</p>
              )}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setCollectionForm({ ...collectionForm, photoFile: file });
                  }}
                />
                <div className={`rounded-2xl py-6 text-center transition-all border-2 border-dashed ${collectionForm.photoFile
                  ? 'border-green-400 bg-green-50'
                  : isPhotoRequired
                    ? 'border-red-300 bg-red-50/30'
                    : 'border-gray-200 bg-gray-50'
                  }`}>
                  {collectionForm.photoFile ? (
                    <>
                      <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-1" />
                      <p className="text-sm font-bold text-green-700">{t("collector.photoTaken")} ✓</p>
                    </>
                  ) : (
                    <>
                      <Camera className="h-10 w-10 text-gray-300 mx-auto mb-1" />
                      <p className="text-sm font-bold text-gray-500">{t("collector.takePhoto")}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 7. Voice / Remarks */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 text-center">
                💬 {t('collections.remarks')} ({t('app.optional')})
              </p>
              <button
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                disabled={isRecording}
                className={`w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 mb-3 transition-all active:scale-95 ${isRecording
                  ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-200'
                  : collectionForm.voiceRecording
                    ? 'bg-green-500 text-white shadow-md shadow-green-200'
                    : 'bg-blue-50 text-blue-600 border-2 border-blue-200'
                  }`}
              >
                {isRecording ? '🔴 ' + t('collections.stopRecording')
                  : collectionForm.voiceRecording ? '✅ ' + t('collections.voiceRecorded')
                    : '🎤 ' + t('collections.recordVoice')}
              </button>
              <Textarea
                placeholder={t('collections.typeComments')}
                rows={2}
                value={collectionForm.remarks}
                onChange={(e) => setCollectionForm({ ...collectionForm, remarks: e.target.value })}
                className="rounded-2xl border-gray-200 text-sm"
              />
            </div>

            {/* Bottom spacer */}
            <div className="h-20" />
          </div>

          {/* Sticky Bottom Submit */}
          <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <button
              onClick={() => setShowConfirmSubmit(true)}
              disabled={
                collectionForm.wasteSegregated === null ||
                collectionForm.segregationRating === 0 ||
                (isPhotoRequired && !collectionForm.photoFile) ||
                collectionForm.wasteAccepted === null ||
                (collectionForm.wasteAccepted === false && !collectionForm.notCollectedReason)
              }
              className={`w-full py-4 rounded-2xl text-base font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${collectionForm.wasteSegregated !== null &&
                collectionForm.segregationRating > 0 &&
                (isPhotoRequired ? collectionForm.photoFile : true) &&
                collectionForm.wasteAccepted !== null &&
                (collectionForm.wasteAccepted || collectionForm.notCollectedReason)
                ? isOnline
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-200'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
              {false ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  {isOnline ? t('collector.submittingForm') : t('app.saving')}
                </>
              ) : (
                isOnline ? '✅ ' + t('collector.submitCollection') : '💾 ' + t('collector.collectionSavedOffline')
              )}
            </button>
          </div>
        </div>
      )}

      {/* Issue Report Modal - Enhanced Mobile-First Design */}
      <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
        <DialogContent className="w-[96vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 mx-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold text-center text-gray-900">
              🚨 {t('collector.reportIssue')}
            </DialogTitle>
            <p className="text-sm text-gray-600 text-center mt-1">
              Help improve your community by reporting issues
            </p>
          </DialogHeader>

          <div className="space-y-5">
            {/* Title Field */}
            <div className="space-y-2">
              <Label
                htmlFor="title"
                className="text-sm font-semibold text-gray-800 flex items-center"
              >
                📝 {t('collector.issueTitle')} <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="title"
                value={newIssue.title}
                onChange={(e) =>
                  setNewIssue({ ...newIssue, title: e.target.value })
                }
                placeholder={t("collector.issueTitlePlaceholder")}
                className="h-12 text-base border-2 focus:border-red-400"
                maxLength={100}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {newIssue.title.length}/100 characters
                </p>
                {newIssue.title.trim().length < 3 &&
                  newIssue.title.length > 0 && (
                    <p className="text-xs text-red-500">
                      Minimum 3 characters required
                    </p>
                  )}
              </div>
            </div>

            {/* Category Field */}
            <div className="space-y-2">
              <Label
                htmlFor="category"
                className="text-sm font-semibold text-gray-800 flex items-center"
              >
                🏷️ {t('collector.category')} <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select
                value={newIssue.category}
                onValueChange={(value) =>
                  setNewIssue({ ...newIssue, category: value })
                }
              >
                <SelectTrigger className="h-12 text-base border-2 focus:border-red-400">
                  <SelectValue placeholder={t("collector.category")} />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_CATEGORIES.map((category) => (
                    <SelectItem
                      key={category}
                      value={category}
                      className="text-base py-3"
                    >
                      {translateEnum('issueCategory', category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-sm font-semibold text-gray-800 flex items-center"
              >
                📄 {t('collector.description')} <span className="text-red-500 ml-1">*</span>
              </Label>
              <Textarea
                id="description"
                value={newIssue.description}
                onChange={(e) =>
                  setNewIssue({ ...newIssue, description: e.target.value })
                }
                placeholder={t("collector.descriptionPlaceholder")}
                rows={5}
                className="text-base border-2 focus:border-red-400 resize-none"
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {newIssue.description.length}/500 characters
                </p>
                {newIssue.description.trim().length < 10 &&
                  newIssue.description.length > 0 && (
                    <p className="text-xs text-red-500">
                      Minimum 10 characters required
                    </p>
                  )}
              </div>
            </div>

            {/* Photo Upload Field */}
            <div className="space-y-2">
              <Label
                htmlFor="photo"
                className="text-sm font-semibold text-gray-800 flex items-center"
              >
                📸 {t('collector.photoEvidence')} ({t('app.optional')})
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Input
                  id="photo"
                  type="file"
                  accept="image/*,image/heic,image/heif"
                  onChange={(e) =>
                    setNewIssue({
                      ...newIssue,
                      photoFile: e.target.files?.[0] || null,
                    })
                  }
                  className="hidden"
                />
                <label
                  htmlFor="photo"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  {newIssue.photoFile ? (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Camera className="w-8 h-8 text-green-700" />
                      </div>
                      <p className="text-sm font-medium text-green-700">
                        📷 {newIssue.photoFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Tap to change photo
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        Tap to upload photo
                      </p>
                      <p className="text-xs text-gray-500">
                        Photos help resolve issues faster
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
                disabled={
                  createIssueMutation.isPending ||
                  !newIssue.title.trim() ||
                  !newIssue.category ||
                  !newIssue.description.trim() ||
                  newIssue.title.trim().length < 3 ||
                  newIssue.description.trim().length < 10
                }
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-base font-semibold"
              >
                {createIssueMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t("collector.submittingIssue")}...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{t("collector.submitIssue")}</span>
                  </div>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowIssueModal(false);
                  setNewIssue({
                    title: "",
                    category: "",
                    description: "",
                    photoFile: null,
                  });
                }}
                className="w-full h-12 border-2 text-base font-medium"
                disabled={createIssueMutation.isPending}
              >
                {t('app.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('app.changePassword')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('app.newPassword')}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("app.newPassword")}
              />
            </div>
            <div>
              <Label>{t('app.confirmPassword')}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("app.confirmPassword")}
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
                  {t('app.changing')}...
                </>
              ) : (
                t("app.changePassword")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">{t('collector.confirmSubmission')}</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <div className="text-lg">
              📋 {t('collector.confirmSubmissionText')}
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-bold text-lg">{scannedHousehold?.headName || ""}</div>
              <div className="text-sm text-gray-600">{scannedHousehold?.uid}</div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 py-3 text-lg bg-red-100 border-red-300 text-red-700 hover:bg-red-200"
              >
                ❌ {t('app.cancel')}
              </Button>
              <Button
                onClick={() => {
                  if (isSubmitLocked || createCollectionMutation.isPending) return;
                  setIsSubmitLocked(true);
                  setShowConfirmSubmit(false);
                  setShowCollectionModal(false);
                  handleSubmitCollection();
                }}
                className="flex-1 py-3 text-lg bg-green-700 hover:bg-green-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSubmitLocked}
              >
                ✅ {t('collector.okSubmit')}
              </Button>


            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Collection Details Dialog */}
      <Dialog open={showCollectionDetails} onOpenChange={setShowCollectionDetails}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">{t('collector.collectionDetails')}</DialogTitle>
          </DialogHeader>

          {selectedCollection && (
            <div className="space-y-4">
              {/* Household Info */}
              <div className="text-center p-4 bg-green-50 rounded-xl border-2 border-green-200">
                <div className="text-2xl mb-2">✅</div>
                <p className="font-bold text-lg">{scannedHousehold?.headName || ""}</p>
                <p className="text-sm text-gray-600">{scannedHousehold?.uid}</p>
                <p className="text-xs text-green-700 font-medium">{t('collector.alreadyCollectedToday')}</p>
              </div>

              {/* Collection Info */}
              <div className="bg-white border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-600">{t('collector.status')}:</div>
                    <div className="font-medium">{translateEnum('collectionStatus', selectedCollection.status)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">{t('collector.time')}:</div>
                    <div className="font-medium">{new Date(selectedCollection.collectionDate || selectedCollection.createdAt).toLocaleTimeString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">{t('collector.segregationRating')}:</div>
                    <div className="font-medium">{selectedCollection.segregationRating}/5 ⭐</div>
                  </div>
                </div>



                {selectedCollection.remarks && (
                  <div>
                    <div className="text-gray-600 text-sm mb-1">{t('collector.remarks')}:</div>
                    <div className="text-sm bg-gray-50 p-2 rounded">{selectedCollection.remarks}</div>
                  </div>
                )}

                {selectedCollection.photoUrl && (
                  <div>
                    <div className="text-gray-600 text-sm mb-1">{t('collector.collectionPhoto')}:</div>
                    <img src={selectedCollection.photoUrl} alt="Collection photo" className="w-full rounded-lg" />
                  </div>
                )}

                {selectedCollection.voiceUrl && (
                  <div>
                    <div className="text-gray-600 text-sm mb-1">{t('collector.voiceRecording')}:</div>
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

      {/* Premium Bottom Navigation with Elliptical Notch */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md z-30">
        {/* Center FAB — raised circle */}
        <div className="absolute left-1/2 transform -translate-x-1/2 -top-6 z-10">
          <button
            onClick={() => {
              if (activeTab === 'home') {
                setShowScanner(true);
              } else {
                setActiveTab('home');
              }
            }}
            className={`w-[58px] h-[58px] rounded-full bg-gradient-to-br ${activeTab === 'home'
              ? 'from-blue-500 via-blue-600 to-blue-700 shadow-blue-500/40'
              : 'from-green-500 via-emerald-500 to-green-700 shadow-green-500/40'
              } shadow-xl flex items-center justify-center active:scale-90 transition-all ring-[5px] ring-white`}
          >
            {activeTab === 'home' ? (
              <ScanLine className="h-7 w-7 text-white" strokeWidth={2.5} />
            ) : (
              <Home className="h-7 w-7 text-white" strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* Nav bar with SVG elliptical notch background */}
        <div className="relative pt-3">
          {/* SVG background — draws the nav shape with curved notch */}
          <svg
            className="absolute top-0 left-0 w-full h-full"
            viewBox="0 0 400 68"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id="navShadow">
                <feDropShadow dx="0" dy="-3" stdDeviation="5" floodColor="rgba(0,0,0,0.07)" />
              </filter>
            </defs>
            <path
              d="M 0 68 L 0 18 Q 0 2, 16 2 L 148 2 C 162 2, 170 32, 200 32 C 230 32, 238 2, 252 2 L 384 2 Q 400 2, 400 18 L 400 68 Z"
              fill="white"
              filter="url(#navShadow)"
            />
          </svg>

          {/* Tab buttons — 2 left + spacer + 2 right */}
          <div className="relative flex items-end justify-around px-3 pt-1 pb-3">
            {/* Left group */}
            {villageData?.attendanceEnabled && (
              <button
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${activeTab === 'shift'
                  ? 'text-orange-500'
                  : 'text-gray-400'
                  }`}
                onClick={() => setActiveTab('shift')}
              >
                <Clock size={25} strokeWidth={activeTab === 'shift' ? 2.5 : 2} />
              </button>
            )}

            <button
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${activeTab === 'announcements'
                ? 'text-blue-600'
                : 'text-gray-400'
                }`}
              onClick={() => setActiveTab('announcements')}
            >
              <Bell size={25} strokeWidth={activeTab === 'announcements' ? 2.5 : 2} />
            </button>

            {/* Center spacer for FAB notch */}
            <div className="w-20 flex-shrink-0" />

            {/* Right group */}
            {villageData?.collectorWasteLogEnabled && (
              <button
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${activeTab === 'wastelog'
                  ? 'text-emerald-600'
                  : 'text-gray-400'
                  }`}
                onClick={() => setActiveTab('wastelog')}
              >
                <Trash2 size={25} strokeWidth={activeTab === 'wastelog' ? 2.5 : 2} />
              </button>
            )}

            {/* Me button — only in nav when even total tabs */}
            {((villageData?.attendanceEnabled ? 1 : 0) + 1 + (villageData?.collectorWasteLogEnabled ? 1 : 0) + 1) % 2 === 0 && (
              <button
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${activeTab === 'profile'
                  ? 'text-gray-700'
                  : 'text-gray-400'
                  }`}
                onClick={() => setActiveTab('profile')}
              >
                <User size={25} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}