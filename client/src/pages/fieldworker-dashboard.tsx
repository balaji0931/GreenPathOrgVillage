import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Village } from "@shared/schema";
import { useIsMobileWithLoading } from "@/hooks/use-mobile";
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
  CheckCircle
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
  const { isMobile, isLoading: isMobileLoading } = useIsMobileWithLoading();
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

  // Fetch household types for the village
  const { data: householdTypeOptions } = useQuery<{ typeCode: string; displayName: string }[]>({
    queryKey: ['household-types', user?.villageId],
    enabled: !!user?.villageId,
    queryFn: () =>
      fetch('/api/household-types', { credentials: 'include' }).then((res) => res.json()),
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
          description: "This QR code is already mapped to a household.",
          variant: "destructive",
        });
      }
    },
    onError: (_error: unknown) => {
      toast({
        title: "QR Code Not Found",
        description: "This QR code does not exist or doesn't belong to your village.",
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
        description: "Failed to map household to QR code. Please try again.",
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
    lookupQRCodeMutation.mutate(trimmedUid);
  };

  const requiredFields: { key: keyof HouseholdForm; label: string }[] = [
    { key: "headName", label: "Head of household name" },
    { key: "phone", label: "Phone number" },
    { key: "houseNumber", label: "House number" },
    { key: "ward", label: "Ward" },
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

  if (isMobileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Phone className="h-6 w-6" />
              Mobile Device Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              The Field Worker app is designed for mobile devices. Please access this application from your smartphone or tablet to scan QR codes and map households.
            </p>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-orange-800">
                Open this page on your mobile device to continue working.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => logout()}
              className="w-full"
              data-testid="button-logout-desktop"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-green-600 text-white p-3 sticky top-0 z-10">
        <div className="flex items-center justify-center">
          <img
            src="/logos/logo-dark.svg"
            alt="GreenPath"
            className="w-auto h-9"
          />
        </div>
      </div>


      <div className="p-4">
        {activeTab === 'map' && (
          <div className="space-y-4">
            {mappingSuccess && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 text-green-700">
                    <CheckCircle className="h-6 w-6" />
                    <div>
                      <p className="font-medium">Household Mapped Successfully!</p>
                      <p className="text-sm text-green-600">The QR code is now linked to the household.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Map Household
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => setShowScanner(true)}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="button-scan-qr"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Scan QR Code
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">or</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Enter QR UID (e.g., GEN-V001-0001)"
                    value={searchUid}
                    onChange={(e) => setSearchUid(e.target.value)}
                    data-testid="input-search-uid"
                  />
                  <Button
                    onClick={handleSearchByUid}
                    variant="outline"
                    disabled={lookupQRCodeMutation.isPending}
                    data-testid="button-search-uid"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {lookupQRCodeMutation.isPending && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Looking up QR code...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <h3 className="font-medium text-blue-900 mb-2">How to Map</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Scan the printed QR code or enter its UID</li>
                  <li>Fill in household details</li>
                  <li>Preview and confirm the mapping</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  Account Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-medium">{user?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Badge variant="secondary" className="h-5 w-5 flex items-center justify-center p-0 text-xs">ID</Badge>
                    <div>
                      <p className="text-xs text-gray-500">User ID</p>
                      <p className="font-medium">{user?.userId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPinned className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Village</p>
                      <p className="font-medium">{user?.villageId || 'Not assigned'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-green-600" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPasswordModal(true)}
                  data-testid="button-change-password"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => logout()}
                  className="w-full"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex justify-around safe-area-bottom">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center py-2 px-6 rounded-lg transition-colors ${activeTab === 'map' ? 'text-green-600 bg-green-50' : 'text-gray-500'
            }`}
          data-testid="tab-map"
        >
          <MapPin className="h-6 w-6" />
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`flex flex-col items-center py-2 px-6 rounded-lg transition-colors ${activeTab === 'account' ? 'text-green-600 bg-green-50' : 'text-gray-500'
            }`}
          data-testid="tab-account"
        >
          <User className="h-6 w-6" />
        </button>
      </nav>

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

      {showForm && scannedQRCode && (
        <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
          <DialogContent className="sm:max-w-md max-h-[100vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Household Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-green-50 p-1 rounded-lg text-center">
                <p className="text-xs text-green-600 font-medium">QR Code UID</p>
                <p className="text-sm font-mono">{scannedQRCode.uid}</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="headName" className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Head of Household <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="headName"
                    value={householdForm.headName}
                    onChange={(e) => setHouseholdForm({ ...householdForm, headName: e.target.value })}
                    placeholder="Full name"
                    data-testid="input-head-name"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone" className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={householdForm.phone}
                    onChange={(e) => setHouseholdForm({ ...householdForm, phone: e.target.value })}
                    placeholder="Mobile number"
                    data-testid="input-phone"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="houseNumber" className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    House Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="houseNumber"
                    value={householdForm.houseNumber}
                    onChange={(e) => setHouseholdForm({ ...householdForm, houseNumber: e.target.value })}
                    placeholder="House/Door number"
                    data-testid="input-house-number"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ward" className="flex items-center gap-1">
                    <MapPinned className="h-4 w-4" />
                    Ward <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={householdForm.ward}
                    onValueChange={(value) => setHouseholdForm({ ...householdForm, ward: value })}
                  >
                    <SelectTrigger data-testid="select-ward">
                      <SelectValue placeholder="Select ward" />
                    </SelectTrigger>
                    <SelectContent>
                      {wardOptions.map((ward) => (
                        <SelectItem key={ward} value={ward}>{ward}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="householdType" className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    Household Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={householdForm.householdType}
                    onValueChange={(value) => setHouseholdForm({ ...householdForm, householdType: value })}
                  >
                    <SelectTrigger data-testid="select-household-type">
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
                      ]).map((type) => (
                        <SelectItem key={type.typeCode} value={type.typeCode}>{type.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="familySize" className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Family Size
                  </Label>
                  <Input
                    id="familySize"
                    type="number"
                    min="0"
                    value={householdForm.familySize}
                    onChange={(e) => setHouseholdForm({ ...householdForm, familySize: parseInt(e.target.value) || 1 })}
                    data-testid="input-family-size"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="address" className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Address
                  </Label>
                  <Input
                    id="address"
                    value={householdForm.address}
                    onChange={(e) => setHouseholdForm({ ...householdForm, address: e.target.value })}
                    placeholder="Full address"
                    data-testid="input-address"
                  />
                </div>

                {village?.locationServicesEnabled && (
                  <div className="space-y-3">

                    <div className="flex flex-col gap-2">

                      {/* Open Fullscreen Map Modal */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowMapModal(true);
                          fetchLocation(); // center to GPS
                        }}
                        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Capture Live Location <span className="text-red-500">*</span>
                      </Button>

                      {/* Show Selected Coordinates */}
                      {householdForm.latitude && householdForm.longitude && (
                        <div className="bg-blue-50 p-2 rounded text-xs text-blue-800 flex flex-col gap-1">
                          <p>Lat: {householdForm.latitude}</p>
                          <p>Long: {householdForm.longitude}</p>
                        </div>
                      )}

                    </div>
                  </div>
                )}

              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={resetForm} data-testid="button-cancel-form">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handlePreview} className="bg-green-600 hover:bg-green-700" data-testid="button-preview">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                  <span className="text-gray-500">Head of Household</span>
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
                    <span className="text-gray-500">House Number</span>
                    <span className="font-medium">{householdForm.houseNumber}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Ward</span>
                  <span className="font-medium">{householdForm.ward}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Household Type</span>
                  <span className="font-medium">
                    {householdTypeOptions?.find(t => t.typeCode === householdForm.householdType)?.displayName || householdForm.householdType}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Family Size</span>
                  <span className="font-medium">{householdForm.familySize}</span>
                </div>
                {householdForm.address && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Address</span>
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
                Household Location
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
  );
}
