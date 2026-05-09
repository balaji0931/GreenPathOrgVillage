import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Village } from "@shared/schema";
import { useTerminology } from '@/hooks/useTerminology';
import { useDemo } from "@/demo/DemoContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QRScanner } from "@/components/qr-scanner";
import MapPicker from "@/components/MapPicker";
import {
  LogOut,
  MapPin,
  User,
  Camera,
  Search,
  Check,
  X,
  Lock,
  Eye,
  Home,
  Phone,
  Users,
  MapPinned,
  CheckCircle,
  ScanLine,
  ChevronLeft,
  Target,
  ScanBarcode,
  ScanBarcodeIcon
} from "lucide-react";

interface HouseholdForm {
  headName: string;
  phone: string;
  houseNumber: string;
  ward: string;
  householdType: string;
  familySize: number;
  address: string;
  latitude?: string;
  longitude?: string;
}

interface QRCodeData {
  id: number;
  uid: string;
  status: 'notMapped' | 'mapped';
  villageId: string;
  batchId: string;
}

export default function FieldWorkerDashboard() {
  const { user, logout, changePassword, isChangePasswordPending } = useAuth();
  const { toast } = useToast();
  const demo = useDemo();
  const [activeTab, setActiveTab] = useState<'map' | 'account'>('map');

  const [showScanner, setShowScanner] = useState(false);
  const [searchUid, setSearchUid] = useState("");
  const [scannedQRCode, setScannedQRCode] = useState<QRCodeData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mappingSuccess, setMappingSuccess] = useState(false);

  const { data: village } = useQuery<Village>({
    queryKey: ['village', user?.villageId],
    enabled: !!user?.villageId,
    queryFn: () =>
      fetch(`/api/villages/${user?.villageId}`).then((res) => res.json()),
  });

  // Derive terminology labels based on organization type + language
  const { label } = useTerminology((village as any)?.unitType);

  // Fetch household types for the village
  const { data: householdTypeOptions } = useQuery<{ typeCode: string; displayName: string }[]>({
    queryKey: ['household-types', user?.villageId],
    enabled: !!user?.villageId,
    queryFn: () =>
      fetch('/api/household-types', { credentials: 'include' }).then((res) => {
        if (!res.ok) return [];
        return res.json();
      }),
  });


  const wardOptions = village?.wards && village.wards.length > 0
    ? village.wards
    : ["ward-1"];

  const [householdForm, setHouseholdForm] = useState<HouseholdForm>({
    headName: "",
    phone: "",
    houseNumber: "",
    ward: "",
    householdType: "residential_small",
    familySize: 0,
    address: ""
  });

  useEffect(() => {
    if (!householdForm.ward && wardOptions.length > 0) {
      setHouseholdForm(prev => ({ ...prev, ward: wardOptions[0] }));
    }
  }, [wardOptions, householdForm.ward]);

  const [showMapModal, setShowMapModal] = useState(false);
  const [tempLocation, setTempLocation] = useState<{ lat: number; lng: number } | null>(null);



  const lookupQRCodeMutation = useMutation({
    mutationFn: async (uid: string) => {
      const response = await apiRequest("GET", `/api/qr-codes/${uid}`);
      return response.json();
    },
    onSuccess: (data: QRCodeData) => {
      setScannedQRCode(data);
      if (data.status === 'notMapped') {
        setShowForm(true);
      } else {
        toast({
          title: "Already Mapped",
          description: `This QR code is already mapped.`,
          variant: "destructive",
        });
      }
    },
    onError: (_error: unknown) => {
      toast({
        title: "QR Code Not Found",
        description: "This QR code does not exist or doesn't belong to your organization.",
        variant: "destructive",
      });
    }
  });

  const mapHouseholdMutation = useMutation({
    mutationFn: async (data: { uid: string; householdData: HouseholdForm }) => {
      const response = await apiRequest("POST", `/api/qr-codes/${data.uid}/map`, data.householdData);
      return response.json();
    },
    onSuccess: () => {
      setMappingSuccess(true);
      setShowPreview(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/qr-codes"] });
      setTimeout(() => setMappingSuccess(false), 3000);
    },
    onError: (_error: unknown) => {
      toast({
        title: "Mapping Failed",
        description: "Failed to map. Please try again.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setScannedQRCode(null);
    setShowForm(false);
    setShowPreview(false);
    setHouseholdForm({
      headName: "",
      phone: "",
      houseNumber: "",
      ward: "",
      householdType: "residential_small",
      familySize: 0,
      address: "",
      latitude: undefined,
      longitude: undefined
    });
    setSearchUid("");
  };

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTempLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (_error) => {
        toast({
          title: "Error",
          description: "Could not get your location. Please enable GPS and try again.",
          variant: "destructive",
        });
      }
    );
  };


  const handleQRScan = (qrData: string) => {
    setShowScanner(false);
    try {
      const parsed = JSON.parse(qrData);
      if (parsed && parsed.uid && parsed.type === 'premapped') {
        lookupQRCodeMutation.mutate(parsed.uid);
      } else if (parsed && parsed.uid) {
        lookupQRCodeMutation.mutate(parsed.uid);
      } else {
        toast({
          title: "Invalid QR Code",
          description: "This QR code is not a valid GreenPath QR code.",
          variant: "destructive",
        });
      }
    } catch {
      lookupQRCodeMutation.mutate(qrData);
    }
  };

  const validateUidFormat = (uid: string): boolean => {
    const uidPatternWithPrefix = /^GEN-[A-Z0-9]+-H\d{4}$/;
    const uidPatternWithoutPrefix = /^[A-Z0-9]+-H\d{4}$/;
    return uidPatternWithPrefix.test(uid) || uidPatternWithoutPrefix.test(uid);
  };

  const handleSearchByUid = () => {
    const trimmedUid = searchUid.trim().toUpperCase();
    if (!trimmedUid) {
      toast({
        title: "Invalid Input",
        description: "Please enter a QR code UID.",
        variant: "destructive",
      });
      return;
    }
    if (!validateUidFormat(trimmedUid)) {
      toast({
        title: "Invalid Format",
        description: "UID must be in format V001-H0001 or GEN-V001-H0001",
        variant: "destructive",
      });
      return;
    }
    // In demo mode, skip the mutation (DemoProvider overrides mutationFn)
    // and directly simulate a notMapped QR code
    if (demo?.isDemo) {
      const demoQR: QRCodeData = {
        id: 1,
        uid: `${user?.villageId || "DEMO-V001"}-H0001`,
        status: "notMapped",
        villageId: user?.villageId || "DEMO-V001",
        batchId: "BATCH-DEMO-001",
      };
      setScannedQRCode(demoQR);
      setShowForm(true);
      return;
    }
    lookupQRCodeMutation.mutate(trimmedUid);
  };

  const requiredFields: { key: keyof HouseholdForm; label: string }[] = [
    { key: "headName", label: label.headName },
    { key: "phone", label: "Phone number" },
    { key: "houseNumber", label: label.houseNumber },
    { key: "ward", label: label.ward },
  ];

  const handlePreview = () => {
    for (const { key, label } of requiredFields) {
      const value = householdForm[key];

      if (!value || value.toString().trim() === "") {
        toast({
          title: "Missing  Information",
          description: `${label} is required.`,
          variant: "destructive",
        });
        return;
      }
    }

    if (village?.locationServicesEnabled && (!householdForm.latitude || !householdForm.longitude)) {
      toast({
        title: "Location Required",
        description: "Please fetch the live location before continuing.",
        variant: "destructive",
      });
      return;
    }

    setShowForm(false);
    setShowPreview(true);
  };



  const handleConfirmMapping = () => {
    if (!scannedQRCode || lookupQRCodeMutation.isPending || mapHouseholdMutation.isPending) return;
    mapHouseholdMutation.mutate({
      uid: scannedQRCode.uid,
      householdData: householdForm
    });
  };

  const handlePasswordModalClose = (open: boolean) => {
    if (!open) {
      setNewPassword("");
      setConfirmPassword("");
    }
    setShowPasswordModal(open);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    try {
      await changePassword({ newPassword });
      toast({
        title: "Success",
        description: "Password changed successfully.",
      });
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (_error: unknown) {
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-gradient-to-br from-green-50/50 via-white to-blue-50/30 pb-28 relative shadow-xl">


        {/* ── Top Bar (always visible, same on both tabs) ── */}
        <div className="sticky top-0 z-20">
          <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
            <div className="flex items-center justify-between px-3 py-2.5">
              <img src="/logos/logo-full.svg" alt="GreenPath" className="h-12 w-auto" />
              <button
                onClick={() => setActiveTab(activeTab === 'account' ? 'map' : 'account')}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xs font-black active:scale-90 transition-transform shadow-md"
              >
                {(user?.name || "F").charAt(0).toUpperCase()}
              </button>
            </div>
          </div>

          {/* Account sub-header */}
          {activeTab === 'account' && (
            <div className="bg-white/60 backdrop-blur-md border-b border-gray-100/60 px-3 py-2 flex items-center gap-2">
              <button onClick={() => setActiveTab('map')} className="flex items-center gap-0.5 text-green-600 active:scale-95 transition-transform">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm font-bold">Back</span>
              </button>
              <span className="flex-1 text-center text-base font-black text-gray-900 pr-14">Account</span>
            </div>
          )}
        </div>

        {/* ── Main Content ── */}
        <div className="p-3">
          {activeTab === 'map' && (
            <div className="space-y-4">

              {/* Hero header matching reference */}
              <div className="pt-1 pb-1 relative text-center">
                <div>
                  <h1 className="text-xl font-black text-gray-900">{`Map ${label.household}`}</h1>
                  <p className="text-xs text-gray-400 font-medium">Scan QR or search by UID to map {label.household.toLowerCase()}</p>
                </div>
              </div>
              {demo?.isDemo && (
                <div className="bg-emerald-50 rounded-2xl border border-emerald-100 px-4 py-3 flex items-start gap-3">
                  <div>
                    <p className="text-sm text-emerald-700 font-semibold">ENTER UID <span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded-md text-xs">V001-H0001</span> below to explore</p>
                  </div>
                </div>
              )}

              {/* Success banner */}
              {mappingSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-3 animate-in slide-in-from-top-2">
                  <div className="bg-green-500 rounded-full p-1.5"><CheckCircle className="h-4 w-4 text-white" /></div>
                  <div>
                    <p className="text-sm font-bold text-green-800">Mapped Successfully!</p>
                    <p className="text-[10px] text-green-600">QR code linked to {label.household.toLowerCase()}</p>
                  </div>
                </div>
              )}

              {/* Search by UID card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3.5 border-l-4 border-l-blue-400">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2.5 rounded-full">
                    <Search className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Search by UID</h2>
                  </div>
                </div>

                <Input
                  placeholder="Enter UID (e.g., V001-H0001)"
                  value={searchUid}
                  onChange={(e) => setSearchUid(e.target.value)}
                  className="rounded-xl border-gray-200 bg-gray-50 text-sm h-12"
                  data-testid="input-search-uid"
                />

                <button
                  onClick={handleSearchByUid}
                  disabled={lookupQRCodeMutation.isPending || !searchUid.trim()}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-green-200/50 disabled:opacity-40"
                  data-testid="button-search-uid"
                >
                  <Search className="h-4 w-4" />
                  Map {label.household.toLowerCase()}
                </button>

                {lookupQRCodeMutation.isPending && (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <div className="w-4 h-4 border-2 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Looking up...</span>
                  </div>
                )}
              </div>

              {/* How it works */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 border-l-4 border-l-green-400">
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-3">How it works</h3>
                <div className="space-y-3">
                  {[
                    { step: "1", text: "Scan QR or type UID above", icon: Camera },
                    { step: "2", text: `Fill ${label.household.toLowerCase()} details`, icon: Home },
                    { step: "3", text: "Preview & confirm mapping", icon: Check },
                  ].map(({ step, text, icon: StepIcon }) => (
                    <div key={step} className="flex items-center gap-3">
                      <span className="bg-green-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">{step}</span>
                      <StepIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <p className="text-sm text-gray-700 font-medium">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spacer for bottom wave */}
              <div className="h-16" />
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
                    {(user?.name || "F").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base">{user?.name}</p>
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Field Worker</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { icon: User, lbl: "User ID", value: user?.userId },
                    { icon: MapPinned, lbl: label.org, value: user?.villageId || "Not assigned" },
                  ].map(({ icon: Icon, lbl, value }) => (
                    <div key={lbl} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                      <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{lbl}</p>
                        <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Settings</h3>
                <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all" data-testid="button-change-password">
                  <Lock className="h-4 w-4 text-gray-500" /><span className="text-sm font-semibold text-gray-700">Change Password</span>
                </button>
                <button onClick={() => logout()} className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-50 hover:bg-red-100 active:scale-[0.98] transition-all" data-testid="button-logout">
                  <LogOut className="h-4 w-4 text-red-500" /><span className="text-sm font-semibold text-red-600">Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom Scanner Bar ── */}
        {activeTab === 'map' && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30">
            {/* Frosted glass bottom bar */}
            <div className="bg-white/90 backdrop-blur-xl border-t border-gray-200/50 px-6 pt-8 pb-6 flex justify-center" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
              <p className="text-[9px] font-bold text-gray-800 uppercase tracking-[0.2em]">Tap to scan</p>
            </div>

            {/* Elevated scan button */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-7">
              <button
                onClick={() => setShowScanner(true)}
                data-testid="button-scan-qr"
                className="group relative active:scale-95 transition-transform duration-150"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-[22px] bg-green-400/40 blur-xl scale-110 group-active:bg-green-500/50 transition-colors" />

                {/* Main pill button */}
                <div className="relative flex items-center gap-2.5 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white px-7 py-3.5 rounded-[22px] shadow-xl shadow-green-600/30">
                  <ScanLine className="h-6 w-6" strokeWidth={2.5} />
                  <span className="text-sm font-bold tracking-wide">Scan QR</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {showScanner && (
          <Dialog open={showScanner} onOpenChange={setShowScanner}>
            <DialogContent className="sm:max-w-md p-0">
              <DialogHeader className="p-4 pb-0">
                <DialogTitle>Scan QR Code</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <QRScanner
                  onScan={handleQRScan}
                  onClose={() => setShowScanner(false)}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ── Form Page View (inline, not dialog) ── */}
        {showForm && scannedQRCode && (
          <div className="fixed inset-0 z-40 bg-white flex flex-col">
            {/* Same top nav bar as other tabs */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100/80 flex-shrink-0">
              <div className="flex items-center justify-between px-3 py-2.5">
                <img src="/logos/logo-full.svg" alt="GreenPath" className="h-12 w-auto" />
                <button
                  onClick={() => setActiveTab(activeTab === 'account' ? 'map' : 'account')}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xs font-black active:scale-90 transition-transform shadow-md"
                >
                  {(user?.name || "F").charAt(0).toUpperCase()}
                </button>
              </div>
            </div>

            {/* Sub-header: back + QR UID */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
              <button onClick={resetForm} className="bg-white/20 p-1.5 rounded-lg active:scale-90 transition-transform text-white">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-white/70 text-xs font-bold uppercase tracking-widest">QR UID :</span>
                <span className="text-white text-sm font-mono font-bold">{scannedQRCode.uid}</span>
              </div>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 bg-gray-50">

              {/* Head Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-green-500" />
                  {label.headName} <span className="text-red-400">*</span>
                </label>
                <Input
                  id="headName"
                  value={householdForm.headName}
                  onChange={(e) => setHouseholdForm({ ...householdForm, headName: e.target.value })}
                  placeholder="Enter full name"
                  className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm"
                  data-testid="input-head-name"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-green-500" />
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={householdForm.phone}
                  onChange={(e) => setHouseholdForm({ ...householdForm, phone: e.target.value })}
                  placeholder="Enter mobile number"
                  className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm"
                  data-testid="input-phone"
                />
              </div>

              {/* House Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Home className="h-3.5 w-3.5 text-green-500" />
                  {label.houseNumber} <span className="text-red-400">*</span>
                </label>
                <Input
                  id="houseNumber"
                  value={householdForm.houseNumber}
                  onChange={(e) => setHouseholdForm({ ...householdForm, houseNumber: e.target.value })}
                  placeholder="Enter house / door number"
                  className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm"
                  data-testid="input-house-number"
                />
              </div>

              {/* Ward */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <MapPinned className="h-3.5 w-3.5 text-green-500" />
                  {label.ward} <span className="text-red-400">*</span>
                </label>
                <Select value={householdForm.ward} onValueChange={(value) => setHouseholdForm({ ...householdForm, ward: value })}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm" data-testid="select-ward">
                    <SelectValue placeholder={`Select ${label.ward.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {wardOptions.map((ward) => (<SelectItem key={ward} value={ward}>{ward}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Household Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Home className="h-3.5 w-3.5 text-green-500" />
                  {`${label.household} Type`} <span className="text-red-400">*</span>
                </label>
                <Select value={householdForm.householdType} onValueChange={(value) => setHouseholdForm({ ...householdForm, householdType: value })}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm" data-testid="select-household-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(householdTypeOptions || [
                      { typeCode: 'residential_small', displayName: 'Residential (Small)' },
                      { typeCode: 'residential_large', displayName: 'Residential (Large)' },
                      { typeCode: 'commercial_shop', displayName: 'Commercial (Shop)' },
                      { typeCode: 'bulk_generator', displayName: 'Bulk Generator' },
                      { typeCode: 'institutional', displayName: 'Institutional' },
                      { typeCode: 'slum_supported', displayName: 'Subsidized' },
                    ]).map((type) => (<SelectItem key={type.typeCode} value={type.typeCode}>{type.displayName}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Family Size */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-green-500" />
                  {label.familySize}
                </label>
                <Input
                  id="familySize"
                  type="number"
                  min="0"
                  value={householdForm.familySize}
                  onChange={(e) => setHouseholdForm({ ...householdForm, familySize: parseInt(e.target.value) || 1 })}
                  placeholder="Number of family members"
                  className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm"
                  data-testid="input-family-size"
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-green-500" />
                  Address
                </label>
                <Input
                  id="address"
                  value={householdForm.address}
                  onChange={(e) => setHouseholdForm({ ...householdForm, address: e.target.value })}
                  placeholder="Enter full address"
                  className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm"
                  data-testid="input-address"
                />
              </div>

              {/* Location */}
              {village?.locationServicesEnabled && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-500" />
                    Location <span className="text-red-400">*</span>
                  </label>
                  <Button type="button" variant="outline" onClick={() => { setShowMapModal(true); fetchLocation(); }} className="w-full rounded-xl bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 h-12 text-sm font-semibold">
                    <MapPin className="h-4 w-4 mr-2" />
                    Capture Live Location
                  </Button>
                  {householdForm.latitude && householdForm.longitude && (
                    <div className="bg-blue-50 p-2.5 rounded-xl text-xs text-blue-700 font-semibold flex gap-4 justify-center">
                      <span>Lat: {householdForm.latitude}</span>
                      <span>Lng: {householdForm.longitude}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom spacer */}
              <div className="h-2" />
            </div>

            {/* Sticky bottom actions */}
            <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
              <button
                onClick={resetForm}
                className="flex-1 py-3.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 active:scale-[0.98] transition-transform"
                data-testid="button-cancel-form"
              >
                Cancel
              </button>
              <button
                onClick={handlePreview}
                className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white text-md font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-green-200/50"
                data-testid="button-preview"
              >
                Preview & Submit
              </button>
            </div>
          </div>
        )}

        {showPreview && scannedQRCode && (
          <Dialog open={showPreview} onOpenChange={(open) => { if (!open) { setShowPreview(false); setShowForm(true); } }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Confirm Mapping
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-green-600 font-medium">QR Code UID</p>
                  <p className="text-sm font-mono">{scannedQRCode.uid}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">{label.headName}</span>
                    <span className="font-medium">{householdForm.headName}</span>
                  </div>
                  {householdForm.phone && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-medium">{householdForm.phone}</span>
                    </div>
                  )}
                  {householdForm.houseNumber && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">{label.houseNumber}</span>
                      <span className="font-medium">{householdForm.houseNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">{label.ward}</span>
                    <span className="font-medium">{householdForm.ward}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">{label.household} Type</span>
                    <span className="font-medium">
                      {householdTypeOptions?.find(t => t.typeCode === householdForm.householdType)?.displayName || householdForm.householdType}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">{label.familySize}</span>
                    <span className="font-medium">{householdForm.familySize}</span>
                  </div>
                  {householdForm.address && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">{label.address}</span>
                      <span className="font-medium">{householdForm.address}</span>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">
                  Please verify all details before confirming. This action cannot be undone.
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => { setShowPreview(false); setShowForm(true); }}
                  data-testid="button-edit"
                >
                  <X className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={handleConfirmMapping}
                  disabled={mapHouseholdMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-confirm-mapping"
                >
                  {mapHouseholdMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Mapping...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirm
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {showPasswordModal && (
          <Dialog open={showPasswordModal} onOpenChange={handlePasswordModalClose}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    data-testid="input-new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => handlePasswordModalClose(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangePasswordPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-save-password"
                >
                  {isChangePasswordPending ? "Saving..." : "Save Password"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {showMapModal && (
          <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
            <DialogContent className="max-w-none w-[100vw] h-[100vh] px-1 py-1 flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center px-3">
                <h2 className="text-lg font-semibold">
                  {label.household} Location
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowMapModal(false)}
                >
                </Button>
              </div>

              {/* Map */}
              <div className="flex-1">
                <MapPicker
                  initialLocation={tempLocation || undefined}
                  onLocationSelect={(lat, lng) => {
                    setTempLocation({ lat, lng });
                  }}
                />
              </div>
              <p className="text-xs text-red-500 text-center">* Note: Select and Pin exact location of household</p>

              {/* Footer */}
              <div className="flex items-center justify-between p-1 space-x-2  bg-white">

                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchLocation}
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 p-1"
                >
                  <MapPin className="h-4 w-4" />
                  Live Location
                </Button>

                <Button
                  disabled={!tempLocation}
                  className="bg-green-600 hover:bg-green-700 "
                  onClick={() => {
                    if (tempLocation) {
                      setHouseholdForm(prev => ({
                        ...prev,
                        latitude: tempLocation.lat.toString(),
                        longitude: tempLocation.lng.toString(),
                      }));
                    }
                    setShowMapModal(false);
                  }}
                >
                  Confirm Location
                </Button>

              </div>


            </DialogContent>
          </Dialog>
        )}

      </div>
    </div>
  );
}
