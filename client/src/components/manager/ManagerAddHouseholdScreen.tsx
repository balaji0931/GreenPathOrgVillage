/**
 * ManagerAddHouseholdScreen
 *
 * Embeds the complete field-worker household-mapping workflow inside the
 * manager dashboard's "Add Household" sub-screen.
 *
 * Functionality is identical to the field-worker mapping flow:
 *   1. Scan QR code (camera) OR search by UID
 *   2. Fill household details form
 *   3. Preview & confirm
 *
 * Differences vs fieldworker-dashboard:
 *   - No top navbar (manager's header already visible)
 *   - No account/logout tab
 *   - Uses onBack() prop instead of internal tab switching
 *   - Bottom scan button is sticky within the panel (not fixed viewport)
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Village } from "@shared/schema";
import { useTerminology } from "@/hooks/useTerminology";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QRScanner } from "@/components/qr-scanner";
import MapPicker from "@/components/MapPicker";
import {
  MapPin,
  User,
  Camera,
  Search,
  Check,
  X,
  Eye,
  Home,
  Phone,
  Users,
  MapPinned,
  CheckCircle,
  ScanLine,
  ChevronLeft,
} from "lucide-react";
import RoadSelectionMap from "@/components/RoadSelectionMap";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  accessRoadId?: number;
  preferredCollectionTime?: string;
}

interface QRCodeData {
  id: number;
  uid: string;
  status: "notMapped" | "mapped";
  villageId: string;
  batchId: string;
}

interface Props {
  /** Called when the manager clicks the back / cancel button to return to the Households menu */
  onBack: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ManagerAddHouseholdScreen({ onBack }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [showScanner, setShowScanner] = useState(false);
  const [searchUid, setSearchUid] = useState("");
  const [scannedQRCode, setScannedQRCode] = useState<QRCodeData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [mappingSuccess, setMappingSuccess] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showRoadMapModal, setShowRoadMapModal] = useState(false);
  const [tempLocation, setTempLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [householdForm, setHouseholdForm] = useState<HouseholdForm>({
    headName: "",
    phone: "",
    houseNumber: "",
    ward: "",
    householdType: "residential_small",
    familySize: 0,
    address: "",
    accessRoadId: undefined,
    preferredCollectionTime: undefined,
  });

  // ── Server data ────────────────────────────────────────────────────────────
  const { data: village } = useQuery<Village>({
    queryKey: ["village", user?.villageId],
    enabled: !!user?.villageId,
    queryFn: () =>
      fetch(`/api/villages/${user?.villageId}`).then((r) => r.json()),
  });

  const { label } = useTerminology((village as any)?.unitType);

  const { data: householdTypeOptions } = useQuery<
    { typeCode: string; displayName: string }[]
  >({
    queryKey: ["household-types", user?.villageId],
    enabled: !!user?.villageId,
    queryFn: () =>
      fetch("/api/household-types", { credentials: "include" }).then((r) => {
        if (!r.ok) return [];
        return r.json();
      }),
  });

  const { data: villageRoads } = useQuery<{ id: number; name: string; coordinates: [number, number][] }[]>({
    queryKey: ["/api/village-roads"],
    enabled: !!user?.villageId,
  });

  const { data: wardOptions = [] } = useQuery<string[]>({
    queryKey: ["wards", user?.villageId],
    enabled: !!user?.villageId,
    queryFn: () => fetch(`/api/villages/${user?.villageId}/wards`).then(r => r.json()),
  });

  // Default ward once wards are loaded
  useEffect(() => {
    if (!householdForm.ward && wardOptions.length > 0) {
      setHouseholdForm((prev) => ({ ...prev, ward: wardOptions[0] }));
    }
  }, [wardOptions, householdForm.ward]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const lookupQRCodeMutation = useMutation({
    mutationFn: async (uid: string) => {
      const response = await apiRequest("GET", `/api/qr-codes/${uid}`);
      return response.json();
    },
    onSuccess: (data: QRCodeData) => {
      setScannedQRCode(data);
      if (data.status === "notMapped") {
        setShowForm(true);
      } else {
        toast({
          title: "Already Mapped",
          description: "This QR code is already mapped to a household.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "QR Code Not Found",
        description:
          "This QR code does not exist or doesn't belong to your organisation.",
        variant: "destructive",
      });
    },
  });

  const mapHouseholdMutation = useMutation({
    mutationFn: async (data: {
      uid: string;
      householdData: HouseholdForm;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/qr-codes/${data.uid}/map`,
        data.householdData
      );
      return response.json();
    },
    onSuccess: () => {
      setMappingSuccess(true);
      setShowPreview(false);
      resetForm();
      // Invalidate so household-details list refreshes immediately
      queryClient.invalidateQueries({ queryKey: ["/api/qr-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      setTimeout(() => setMappingSuccess(false), 4000);
    },
    onError: () => {
      toast({
        title: "Mapping Failed",
        description: "Failed to map household. Please try again.",
        variant: "destructive",
      });
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setScannedQRCode(null);
    setShowForm(false);
    setShowPreview(false);
    setHouseholdForm({
      headName: "",
      phone: "",
      houseNumber: "",
      ward: wardOptions[0] ?? "",
      householdType: "residential_small",
      familySize: 0,
      address: "",
      latitude: undefined,
      longitude: undefined,
      accessRoadId: undefined,
      preferredCollectionTime: undefined,
    });
    setSearchUid("");
    setTempLocation(null);
  };

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser.",
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
      () => {
        toast({
          title: "Error",
          description:
            "Could not get your location. Please enable GPS and try again.",
          variant: "destructive",
        });
      }
    );
  };

  const handleQRScan = (qrData: string) => {
    setShowScanner(false);
    try {
      const parsed = JSON.parse(qrData);
      if (parsed?.uid) {
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

  const validateUidFormat = (uid: string) =>
    /^GEN-[A-Z0-9]+-H\d{4}$/.test(uid) || /^[A-Z0-9]+-H\d{4}$/.test(uid);

  const handleSearchByUid = () => {
    const trimmed = searchUid.trim().toUpperCase();
    if (!trimmed) {
      toast({
        title: "Invalid Input",
        description: "Please enter a QR code UID.",
        variant: "destructive",
      });
      return;
    }
    if (!validateUidFormat(trimmed)) {
      toast({
        title: "Invalid Format",
        description: "UID must be in format V001-H0001 or GEN-V001-H0001",
        variant: "destructive",
      });
      return;
    }
    lookupQRCodeMutation.mutate(trimmed);
  };

  const requiredFields: { key: keyof HouseholdForm; label: string }[] = [
    { key: "headName", label: label.headName },
    { key: "phone", label: "Phone number" },
    { key: "houseNumber", label: label.houseNumber },
    { key: "ward", label: label.ward },
  ];

  const handlePreview = () => {
    for (const { key, label: lbl } of requiredFields) {
      const value = householdForm[key];
      if (!value || value.toString().trim() === "") {
        toast({
          title: "Missing Information",
          description: `${lbl} is required.`,
          variant: "destructive",
        });
        return;
      }
    }
    if (
      !householdForm.preferredCollectionTime ||
      householdForm.preferredCollectionTime.trim() === ""
    ) {
      toast({
        title: "Missing Information",
        description: "Preferred Collection Time is required.",
        variant: "destructive",
      });
      return;
    }

    if (village?.locationServicesEnabled) {
      if (!householdForm.latitude || !householdForm.longitude) {
        toast({
          title: "Location Required",
          description: "Please capture the live location before continuing.",
          variant: "destructive",
        });
        return;
      }
      if (!householdForm.accessRoadId) {
        toast({
          title: "Missing Information",
          description: "Access Road is required when location services are enabled.",
          variant: "destructive",
        });
        return;
      }
    }
    setShowForm(false);
    setShowPreview(true);
  };

  const handleConfirmMapping = () => {
    if (
      !scannedQRCode ||
      lookupQRCodeMutation.isPending ||
      mapHouseholdMutation.isPending
    )
      return;
    mapHouseholdMutation.mutate({
      uid: scannedQRCode.uid,
      householdData: householdForm,
    });
  };

  // ── Render: Form full-screen overlay ──────────────────────────────────────
  if ((showForm || showPreview) && scannedQRCode) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {/* Sub-header: back + QR UID */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={resetForm}
            className="bg-white/20 p-1.5 rounded-lg active:scale-90 transition-transform text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-white/70 text-xs font-bold uppercase tracking-widest">
              QR UID :
            </span>
            <span className="text-white text-sm font-mono font-bold">
              {scannedQRCode.uid}
            </span>
          </div>
        </div>

        {/* Scrollable form body — only visible while filling the form */}
        {showForm && (<>
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 bg-gray-50">
          {/* Head Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-green-500" />
              {label.headName} <span className="text-red-400">*</span>
            </label>
            <Input
              value={householdForm.headName}
              onChange={(e) =>
                setHouseholdForm({ ...householdForm, headName: e.target.value })
              }
              placeholder="Enter full name"
              className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-green-500" />
              Phone Number <span className="text-red-400">*</span>
            </label>
            <Input
              type="tel"
              value={householdForm.phone}
              onChange={(e) =>
                setHouseholdForm({ ...householdForm, phone: e.target.value })
              }
              placeholder="Enter mobile number"
              className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm"
            />
          </div>

          {/* House Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5 text-green-500" />
              {label.houseNumber} <span className="text-red-400">*</span>
            </label>
            <Input
              value={householdForm.houseNumber}
              onChange={(e) =>
                setHouseholdForm({
                  ...householdForm,
                  houseNumber: e.target.value,
                })
              }
              placeholder="Enter house / door number"
              className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm"
            />
          </div>

          {/* Ward */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <MapPinned className="h-3.5 w-3.5 text-green-500" />
              {label.ward} <span className="text-red-400">*</span>
            </label>
            <Select
              value={householdForm.ward}
              onValueChange={(v) =>
                setHouseholdForm({ ...householdForm, ward: v })
              }
            >
              <SelectTrigger className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm">
                <SelectValue
                  placeholder={`Select ${label.ward.toLowerCase()}`}
                />
              </SelectTrigger>
              <SelectContent>
                {wardOptions.map((ward) => (
                  <SelectItem key={ward} value={ward}>
                    {ward}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Household Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5 text-green-500" />
              {`${label.household} Type`} <span className="text-red-400">*</span>
            </label>
            <Select
              value={householdForm.householdType}
              onValueChange={(v) =>
                setHouseholdForm({ ...householdForm, householdType: v })
              }
            >
              <SelectTrigger className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {(
                  householdTypeOptions ?? [
                    {
                      typeCode: "residential_small",
                      displayName: "Residential (Small)",
                    },
                    {
                      typeCode: "residential_large",
                      displayName: "Residential (Large)",
                    },
                    {
                      typeCode: "commercial_shop",
                      displayName: "Commercial (Shop)",
                    },
                    {
                      typeCode: "bulk_generator",
                      displayName: "Bulk Generator",
                    },
                    {
                      typeCode: "institutional",
                      displayName: "Institutional",
                    },
                    {
                      typeCode: "slum_supported",
                      displayName: "Subsidized",
                    },
                  ]
                ).map((t) => (
                  <SelectItem key={t.typeCode} value={t.typeCode}>
                    {t.displayName}
                  </SelectItem>
                ))}
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
              type="number"
              min="0"
              value={householdForm.familySize}
              onChange={(e) =>
                setHouseholdForm({
                  ...householdForm,
                  familySize: parseInt(e.target.value) || 0,
                })
              }
              placeholder="Number of family members"
              className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm"
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-green-500" />
              Address
            </label>
            <Input
              value={householdForm.address}
              onChange={(e) =>
                setHouseholdForm({ ...householdForm, address: e.target.value })
              }
              placeholder="Enter full address"
              className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm"
            />
          </div>

          {/* Location — only if village requires it */}
          {village?.locationServicesEnabled && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-500" />
                Location <span className="text-red-400">*</span>
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowMapModal(true);
                  fetchLocation();
                }}
                className="w-full rounded-xl bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 h-12 text-sm font-semibold"
              >
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

          <div className="h-2" />
          
          {village?.locationServicesEnabled && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-orange-500" />
                Access Road <span className="text-red-400">*</span>
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!householdForm.latitude) {
                    toast({
                      title: "Location Required",
                      description: "Please capture live location first before selecting an access road.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!villageRoads || villageRoads.length === 0) {
                    toast({
                      title: "No Roads Found",
                      description: "No roads have been recorded for this village yet.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setShowRoadMapModal(true);
                }}
                className="w-full rounded-xl bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 h-12 text-sm font-semibold"
              >
                {householdForm.accessRoadId
                  ? `Road Selected (${villageRoads?.find(r => r.id === householdForm.accessRoadId)?.name || 'Road'})`
                  : "Select Access Road"}
              </Button>
            </div>
          )}

          {/* Preferred Collection Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Preferred Collection Time <span className="text-red-400">*</span></label>
            <Select
              value={householdForm.preferredCollectionTime || ""}
              onValueChange={(val) => setHouseholdForm({ ...householdForm, preferredCollectionTime: val })}
            >
              <SelectTrigger className="rounded-xl border-gray-200 bg-white h-12 text-sm shadow-sm">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5 - 7">5:00 AM - 7:00 AM</SelectItem>
                <SelectItem value="7 - 9">7:00 AM - 9:00 AM</SelectItem>
                <SelectItem value="9 - noon">9:00 AM - 12:00 PM</SelectItem>
                <SelectItem value="Anytime in the day">Anytime in the day</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>


        {/* Sticky bottom action bar */}
        <div
          className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={resetForm}
            className="flex-1 py-3.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 active:scale-[0.98] transition-transform"
          >
            Cancel
          </button>
          <button
            onClick={handlePreview}
            className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-green-200/50"
          >
            Preview &amp; Submit
          </button>
        </div>
        </>)}

        {/* Map picker modal */}
        {showMapModal && (
          <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
            <DialogContent className="max-w-none w-[100vw] h-[100vh] px-1 py-1 flex flex-col">
              <div className="flex justify-between items-center px-3">
                <h2 className="text-lg font-semibold">
                  {label.household} Location
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowMapModal(false)}
                />
              </div>
              <div className="flex-1">
                <MapPicker
                  initialLocation={tempLocation || undefined}
                  onLocationSelect={(lat, lng) => {
                    setTempLocation({ lat, lng });
                  }}
                />
              </div>
              <p className="text-xs text-red-500 text-center">
                * Note: Select and pin the exact location of the household
              </p>
              <div className="flex items-center justify-between p-1 space-x-2 bg-white">
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
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    if (tempLocation) {
                      setHouseholdForm((prev) => ({
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

        {/* Road Map modal */}
        {showRoadMapModal && (
          <Dialog open={showRoadMapModal} onOpenChange={setShowRoadMapModal}>
            <DialogContent className="max-w-none w-[100vw] h-[100vh] px-1 py-1 flex flex-col">
              <div className="flex justify-between items-center px-3">
                <h2 className="text-lg font-semibold">Select Access Road</h2>
                <Button variant="ghost" onClick={() => setShowRoadMapModal(false)}><X className="w-5 h-5"/></Button>
              </div>
              <div className="flex-1">
                <RoadSelectionMap
                  initialLocation={tempLocation || { lat: parseFloat(householdForm.latitude || "0"), lng: parseFloat(householdForm.longitude || "0") }}
                  roads={villageRoads || []}
                  selectedRoadId={householdForm.accessRoadId}
                  onSelectRoad={(id) => setHouseholdForm(prev => ({ ...prev, accessRoadId: id }))}
                />
              </div>
              <p className="text-xs text-orange-500 text-center">
                * Note: Tap on a blue road line to select it as the access road.
              </p>
              <div className="flex items-center justify-center p-2 bg-white">
                <Button
                  disabled={!householdForm.accessRoadId}
                  className="bg-green-600 hover:bg-green-700 w-full"
                  onClick={() => setShowRoadMapModal(false)}
                >
                  Confirm Selected Road
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Preview dialog */}
        {showPreview && scannedQRCode && (
          <Dialog
            open={showPreview}
            onOpenChange={(open) => {
              if (!open) {
                setShowPreview(false);
                setShowForm(true);
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Confirm Mapping
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-green-600 font-medium">
                    QR Code UID
                  </p>
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
                      <span className="font-medium">
                        {householdForm.houseNumber}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">{label.ward}</span>
                    <span className="font-medium">{householdForm.ward}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">
                      {label.household} Type
                    </span>
                    <span className="font-medium">
                      {householdTypeOptions?.find(
                        (t) => t.typeCode === householdForm.householdType
                      )?.displayName ?? householdForm.householdType}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">{label.familySize}</span>
                    <span className="font-medium">{householdForm.familySize}</span>
                  </div>
                  {householdForm.address && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">{label.address}</span>
                      <span className="font-medium">
                        {householdForm.address}
                      </span>
                    </div>
                  )}
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">
                  Please verify all details before confirming. This action
                  cannot be undone.
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPreview(false);
                    setShowForm(true);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={handleConfirmMapping}
                  disabled={mapHouseholdMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {mapHouseholdMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
      </div>
    );
  }

  // ── Render: Main search / landing screen ──────────────────────────────────
  return (
    <div className="flex flex-col min-h-0">
      {/* Inner header — back button + title */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button
          onClick={onBack}
          className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors active:scale-90"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h2 className="text-base font-black text-gray-900">
            Map New {label.household}
          </h2>
          <p className="text-[10px] text-gray-400 font-medium">
            Scan QR or search by UID
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {/* Success banner */}
        {mappingSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-3 animate-in slide-in-from-top-2">
            <div className="bg-green-500 rounded-full p-1.5">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-800">
                Mapped Successfully!
              </p>
              <p className="text-[10px] text-green-600">
                QR code linked to {label.household.toLowerCase()}
              </p>
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
              <h3 className="text-base font-bold text-gray-900">
                Search by UID
              </h3>
              <p className="text-xs text-gray-400">
                Type the QR code UID manually
              </p>
            </div>
          </div>

          <Input
            placeholder="Enter UID (e.g., V001-H0001)"
            value={searchUid}
            onChange={(e) => setSearchUid(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchByUid()}
            className="rounded-xl border-gray-200 bg-gray-50 text-sm h-12"
          />

          <button
            onClick={handleSearchByUid}
            disabled={lookupQRCodeMutation.isPending || !searchUid.trim()}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-green-200/50 disabled:opacity-40"
          >
            <Search className="h-4 w-4" />
            Map {label.household.toLowerCase()}
          </button>

          {lookupQRCodeMutation.isPending && (
            <div className="flex items-center justify-center gap-2 py-1">
              <div className="w-4 h-4 border-2 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Looking up…
              </span>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 border-l-4 border-l-green-400">
          <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-3">
            How it works
          </h3>
          <div className="space-y-3">
            {[
              {
                step: "1",
                text: "Scan QR or type UID above",
                icon: Camera,
              },
              {
                step: "2",
                text: `Fill ${label.household.toLowerCase()} details`,
                icon: Home,
              },
              {
                step: "3",
                text: "Preview & confirm mapping",
                icon: Check,
              },
            ].map(({ step, text, icon: StepIcon }) => (
              <div key={step} className="flex items-center gap-3">
                <span className="bg-green-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                  {step}
                </span>
                <StepIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <p className="text-sm text-gray-700 font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="h-24" />
      </div>

      {/* Sticky bottom scan button */}
      <div
        className="bg-white/90 backdrop-blur-xl border-t border-gray-200/50 px-6 pt-8 pb-6 flex justify-center relative"
        style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
      >
        <p className="text-[9px] font-bold text-gray-800 uppercase tracking-[0.2em]">
          Tap to scan
        </p>

        {/* Elevated scan button */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-7">
          <button
            onClick={() => setShowScanner(true)}
            className="group relative active:scale-95 transition-transform duration-150"
          >
            <div className="absolute inset-0 rounded-[22px] bg-green-400/40 blur-xl scale-110 group-active:bg-green-500/50 transition-colors" />
            <div className="relative flex items-center gap-2.5 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white px-7 py-3.5 rounded-[22px] shadow-xl shadow-green-600/30">
              <ScanLine className="h-6 w-6" strokeWidth={2.5} />
              <span className="text-sm font-bold tracking-wide">Scan QR</span>
            </div>
          </button>
        </div>
      </div>

      {/* QR Scanner dialog */}
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
    </div>
  );
}
