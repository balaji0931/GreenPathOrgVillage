/**
 * Household Mapping Modal — Field Worker
 *
 * Full digitization form:
 * - Scanned QR code UID badge
 * - Head of Household name, Phone, House Number, Ward, Household Type, Family Size, Address
 * - Native Satellite GPS Capture (expo-location) with live Accuracy meter & Re-calibrate button
 * - OpenStreetMap (OSM) static preview when online; sleek satellite coordinate card when offline
 * - 100% offline-first: writes directly to SQLite queue first (~50ms)
 * - Subscription blocking if village subscription is expired
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { enqueueHouseholdMapping } from '../../services/fieldworker-queue';
import { triggerFieldWorkerSync } from '../../services/fieldworker-sync';
import { useSubscription } from '../../hooks/useSubscription';
import { InteractiveMapPickerModal } from './InteractiveMapPickerModal';
import type {
  HouseholdMappingPayload,
  MappedHousehold,
  HouseholdTypeOption,
  FieldWorkerVillageData,
  VillageRoad,
} from '../../types/fieldworker';

const COLLECTION_TIME_OPTIONS = [
  { value: '5 - 7', label: '5:00 AM - 7:00 AM' },
  { value: '7 - 9', label: '7:00 AM - 9:00 AM' },
  { value: '9 - noon', label: '9:00 AM - 12:00 PM' },
  { value: 'Anytime in the day', label: 'Anytime in the day' },
];

interface HouseholdMappingModalProps {
  visible: boolean;
  qrUid: string;
  villageData: FieldWorkerVillageData | null;
  villageRoads?: VillageRoad[];
  householdTypes: HouseholdTypeOption[];
  isOnline: boolean;
  onClose: () => void;
  onSuccess: (household: MappedHousehold) => void;
}

export function HouseholdMappingModal({
  visible,
  qrUid,
  villageData,
  villageRoads = [],
  householdTypes,
  isOnline,
  onClose,
  onSuccess,
}: HouseholdMappingModalProps) {
  const insets = useSafeAreaInsets();
  const { isWriteBlocked } = useSubscription();

  // Form state
  const [headName, setHeadName] = useState('');
  const [phone, setPhone] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [ward, setWard] = useState('Ward-1');
  const [householdType, setHouseholdType] = useState('residential_small');
  const [familySize, setFamilySize] = useState(1);
  const [familySizeText, setFamilySizeText] = useState('1');
  const [address, setAddress] = useState('');
  const [preferredCollectionTime, setPreferredCollectionTime] = useState('7 - 9');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  // Road state
  const [accessRoadId, setAccessRoadId] = useState<number | null>(null);
  const [isRoadDropdownOpen, setIsRoadDropdownOpen] = useState(false);

  // Village settings
  const isLocationEnabled = Boolean(villageData?.locationServicesEnabled);

  // GPS state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsTimestamp, setGpsTimestamp] = useState<string | null>(null);
  const [manualAdjustmentDistance, setManualAdjustmentDistance] = useState<number | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // In-place dropdown states
  const [isWardDropdownOpen, setIsWardDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wards list from village data or fallback
  const wards = villageData?.wards && villageData.wards.length > 0
    ? villageData.wards
    : ['Ward-1'];

  useEffect(() => {
    if (wards.length > 0 && !wards.includes(ward)) {
      setWard(wards[0]);
    }
  }, [wards]);

  // Household type list or fallback
  const types = householdTypes && householdTypes.length > 0
    ? householdTypes
    : [
        { typeCode: 'residential_small', displayName: 'Residential (Small)' },
        { typeCode: 'residential_large', displayName: 'Residential (Large)' },
        { typeCode: 'commercial_shop', displayName: 'Commercial / Shop' },
        { typeCode: 'bulk_generator', displayName: 'Bulk Generator' },
        { typeCode: 'institutional', displayName: 'Institutional' },
      ];

  const resetForm = useCallback(() => {
    setHeadName('');
    setPhone('');
    setHouseNumber('');
    setWard(wards.length > 0 ? wards[0] : 'Ward-1');
    setHouseholdType(types.length > 0 ? types[0].typeCode : 'residential_small');
    setFamilySize(1);
    setFamilySizeText('1');
    setAddress('');
    setPreferredCollectionTime('7 - 9');
    setAccessRoadId(null);
    setLatitude(null);
    setLongitude(null);
    setGpsAccuracy(null);
    setGpsError(null);
    setGpsTimestamp(null);
    setManualAdjustmentDistance(null);
    setShowMapPicker(false);
    setIsWardDropdownOpen(false);
    setIsTypeDropdownOpen(false);
    setIsTimeDropdownOpen(false);
    setIsRoadDropdownOpen(false);
    setIsSubmitting(false);
  }, [wards, types]);

  const lastOpenedUidRef = useRef<string | null>(null);

  const handleClose = () => {
    lastOpenedUidRef.current = null;
    resetForm();
    onClose();
  };

  const handleIncrement = () => {
    const current = parseInt(familySizeText, 10) || 0;
    const next = current + 1;
    setFamilySize(next);
    setFamilySizeText(String(next));
  };

  const handleDecrement = () => {
    const current = parseInt(familySizeText, 10) || 1;
    const next = Math.max(1, current - 1);
    setFamilySize(next);
    setFamilySizeText(String(next));
  };

  const handleFamilySizeTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setFamilySizeText(cleaned);
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num > 0) {
      setFamilySize(num);
    }
  };

  const handleFamilySizeBlur = () => {
    const num = parseInt(familySizeText, 10);
    if (isNaN(num) || num < 1) {
      setFamilySize(1);
      setFamilySizeText('1');
    }
  };

  const handleCaptureLocation = async () => {
    setIsCapturingGps(true);
    setGpsError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('Location permission denied. Coordinates will be empty.');
        setIsCapturingGps(false);
        return;
      }

      // High accuracy locks onto hardware satellite signals completely offline
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
      setGpsAccuracy(Math.round(pos.coords.accuracy || 0));
      setGpsTimestamp(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setManualAdjustmentDistance(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setGpsError(err?.message || 'Failed to acquire satellite GPS signal.');
    } finally {
      setIsCapturingGps(false);
    }
  };

  // Whenever modal opens or a new QR UID is chosen, reset all previous data.
  // Location is NOT captured automatically — the worker must explicitly press "Capture Live Location" at the doorstep.
  useEffect(() => {
    if (visible) {
      if (lastOpenedUidRef.current !== qrUid) {
        lastOpenedUidRef.current = qrUid;
        resetForm();
      }
    } else {
      lastOpenedUidRef.current = null;
    }
  }, [visible, qrUid, resetForm]);

  const handleSubmit = () => {
    if (isWriteBlocked) {
      Alert.alert(
        'Subscription Required',
        'Your village subscription has expired or is in read-only mode. New household registrations cannot be submitted. Please contact your supervisor.'
      );
      return;
    }

    if (!headName.trim()) {
      Alert.alert('Validation', 'Please enter the Head of Household name.');
      return;
    }

    if (!houseNumber.trim()) {
      Alert.alert('Validation', 'Please enter the House Number.');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Validation', 'Please enter the Phone Number.');
      return;
    }

    if (!ward.trim()) {
      Alert.alert('Validation', 'Please select a Ward / Area.');
      return;
    }

    if (!householdType) {
      Alert.alert('Validation', 'Please select a Household Category.');
      return;
    }

    const parsedSize = parseInt(familySizeText, 10);
    if (isNaN(parsedSize) || parsedSize < 1) {
      Alert.alert('Validation', 'Family members count must be at least 1.');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Validation', 'Please enter Address or Landmark details.');
      return;
    }

    if (!preferredCollectionTime.trim()) {
      Alert.alert('Validation', 'Please select a Preferred Collection Time.');
      return;
    }

    if (isLocationEnabled) {
      if (latitude == null || longitude == null) {
        Alert.alert('Validation', 'Please capture the GPS coordinates before registering.');
        return;
      }

      if (!accessRoadId && villageRoads && villageRoads.length > 0) {
        Alert.alert('Validation', 'Please select an Access Road for this household.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload: HouseholdMappingPayload = {
        uid: qrUid.trim(),
        headName: headName.trim(),
        phone: phone.trim(),
        houseNumber: houseNumber.trim(),
        ward: ward.trim(),
        householdType,
        familySize: parsedSize,
        address: address.trim(),
        preferredCollectionTime,
        ...(isLocationEnabled && latitude != null && longitude != null
          ? {
              latitude,
              longitude,
              accessRoadId: accessRoadId ?? undefined,
            }
          : {}),
      };

      // 1. Write immediately to SQLite offline queue (~50ms)
      enqueueHouseholdMapping(payload);

      // 2. If online, trigger background sync immediately
      if (isOnline) {
        triggerFieldWorkerSync();
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 3. Callback to parent with the mapped household record
      const mappedRecord: MappedHousehold = {
        id: Date.now(),
        uid: payload.uid,
        headName: payload.headName,
        phone: payload.phone,
        houseNumber: payload.houseNumber,
        ward: payload.ward,
        householdType: payload.householdType,
        familySize: payload.familySize,
        address: payload.address,
        latitude: latitude != null ? String(latitude) : undefined,
        longitude: longitude != null ? String(longitude) : undefined,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      onSuccess(mappedRecord);
      resetForm();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to record household mapping.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTypeLabel = types.find((t) => t.typeCode === householdType)?.displayName || householdType;

  // Handles Location button press: if online, directly opens interactive map picker; if offline, fetches satellite GPS
  const handleLocationAction = () => {
    if (isOnline) {
      setShowMapPicker(true);
    } else {
      handleCaptureLocation();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Consistent Mobile Status Bar & Top Safe Area */}
        <StatusBar barStyle="light-content" backgroundColor={Colors.greenPrimary} />
        <View style={{ height: insets.top, backgroundColor: Colors.greenPrimary }} />

        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Map Household</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >

        {/* QR Code Banner */}
        <View style={styles.qrBanner}>
          <View style={styles.qrIconBadge}>
            <Ionicons name="qr-code" size={20} color={Colors.emerald600} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.qrLabel}>SCANNED QR CODE</Text>
            <Text style={styles.qrUid} numberOfLines={1}>{qrUid}</Text>
          </View>
          <View style={styles.qrVerifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.emerald600} />
            <Text style={styles.qrVerifiedText}>Ready</Text>
          </View>
        </View>

        {/* Form Body */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Head Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Head of Household Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={Colors.slate400} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={headName}
                onChangeText={setHeadName}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor={Colors.slate400}
                autoFocus
              />
            </View>
          </View>

          {/* House Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              House Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="home-outline" size={18} color={Colors.slate400} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={houseNumber}
                onChangeText={setHouseNumber}
                placeholder="e.g. 42 / 3B"
                placeholderTextColor={Colors.slate400}
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color={Colors.slate400} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile"
                placeholderTextColor={Colors.slate400}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* Ward Selector (In-Place Dropdown) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Ward / Area <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.selectTrigger, isWardDropdownOpen && styles.selectTriggerOpen]}
              onPress={() => {
                setIsWardDropdownOpen(!isWardDropdownOpen);
                setIsTypeDropdownOpen(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.selectText} numberOfLines={1}>{ward}</Text>
              <Ionicons
                name={isWardDropdownOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={Colors.slate500}
              />
            </TouchableOpacity>

            {isWardDropdownOpen && (
              <View style={styles.dropdownContainer}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                  {wards.map((w) => {
                    const isSelected = ward === w;
                    return (
                      <TouchableOpacity
                        key={w}
                        style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                        onPress={() => {
                          setWard(w);
                          setIsWardDropdownOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                          {w}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={16} color={Colors.emerald600} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Household Type Selector (In-Place Dropdown) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Household Category <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.selectTrigger, isTypeDropdownOpen && styles.selectTriggerOpen]}
              onPress={() => {
                setIsTypeDropdownOpen(!isTypeDropdownOpen);
                setIsWardDropdownOpen(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.selectText} numberOfLines={1}>{selectedTypeLabel}</Text>
              <Ionicons
                name={isTypeDropdownOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={Colors.slate500}
              />
            </TouchableOpacity>

            {isTypeDropdownOpen && (
              <View style={styles.dropdownContainer}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                  {types.map((t) => {
                    const isSelected = householdType === t.typeCode;
                    return (
                      <TouchableOpacity
                        key={t.typeCode}
                        style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                        onPress={() => {
                          setHouseholdType(t.typeCode);
                          setIsTypeDropdownOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                          {t.displayName}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={16} color={Colors.emerald600} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Family Size Stepper & Direct Typing Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Family Members <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={handleDecrement}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={18} color={Colors.slate700} />
              </TouchableOpacity>
              <View style={styles.stepperValueContainer}>
                <TextInput
                  style={styles.stepperInput}
                  value={familySizeText}
                  onChangeText={handleFamilySizeTextChange}
                  onBlur={handleFamilySizeBlur}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                  textAlign="center"
                />
              </View>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={handleIncrement}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color={Colors.slate700} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Address */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Address / Landmark Details <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputWrapper, { height: 72, alignItems: 'flex-start', paddingTop: 8 }]}>
              <Ionicons name="location-outline" size={18} color={Colors.slate400} style={[styles.inputIcon, { marginTop: 2 }]} />
              <TextInput
                style={[styles.textInput, { height: 56, textAlignVertical: 'top' }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Near Temple, Cross Road, etc."
                placeholderTextColor={Colors.slate400}
                multiline
              />
            </View>
          </View>

          {/* Preferred Collection Time */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Preferred Collection Time <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.selectTrigger, isTimeDropdownOpen && styles.selectTriggerOpen]}
              onPress={() => {
                setIsTimeDropdownOpen(!isTimeDropdownOpen);
                setIsWardDropdownOpen(false);
                setIsTypeDropdownOpen(false);
                setIsRoadDropdownOpen(false);
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                <Ionicons name="time-outline" size={18} color={Colors.slate500} />
                <Text style={styles.selectText} numberOfLines={1}>
                  {COLLECTION_TIME_OPTIONS.find((t) => t.value === preferredCollectionTime)?.label ||
                    preferredCollectionTime ||
                    'Select time slot'}
                </Text>
              </View>
              <Ionicons
                name={isTimeDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.slate500}
              />
            </TouchableOpacity>

            {isTimeDropdownOpen && (
              <View style={styles.dropdownContainer}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                  {COLLECTION_TIME_OPTIONS.map((slot) => {
                    const isSelected = preferredCollectionTime === slot.value;
                    return (
                      <TouchableOpacity
                        key={slot.value}
                        style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                        onPress={() => {
                          setPreferredCollectionTime(slot.value);
                          setIsTimeDropdownOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                          {slot.label}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={16} color={Colors.emerald600} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Satellite GPS Location Card (Shown ONLY when location services are enabled for village) */}
          {isLocationEnabled && (
            <View style={styles.fieldGroup}>
              <View style={styles.locationHeaderRow}>
                <Text style={styles.fieldLabel}>
                  Satellite GPS Location <Text style={styles.required}>*</Text>
                </Text>
                {latitude && longitude && (
                  <TouchableOpacity
                    style={styles.calibrateButton}
                    onPress={handleCaptureLocation}
                    disabled={isCapturingGps}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={14} color={Colors.emerald600} />
                    <Text style={styles.calibrateText}>Re-capture</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.locationCard}>
                {isCapturingGps ? (
                  <View style={styles.gpsLoadingState}>
                    <ActivityIndicator size="small" color={Colors.emerald600} />
                    <Text style={styles.gpsLoadingText}>Capturing satellite GPS location...</Text>
                  </View>
                ) : latitude && longitude ? (
                  <View style={styles.gpsContent}>
                    {/* Satellite Status Header */}
                    <View style={styles.gpsStatusRow}>
                      <View style={styles.satellitePill}>
                        <View style={styles.satelliteDot} />
                        <Text style={styles.satelliteText}>GPS Signal Locked</Text>
                      </View>
                      {gpsAccuracy != null && (
                        <View style={styles.accuracyPill}>
                          <Text style={styles.accuracyText}>Accuracy: ±{gpsAccuracy}m</Text>
                        </View>
                      )}
                      {manualAdjustmentDistance != null && manualAdjustmentDistance > 0 && (
                        <View style={styles.adjustedPill}>
                          <Ionicons name="pin" size={11} color="#b45309" />
                          <Text style={styles.adjustedPillText}>Shifted {manualAdjustmentDistance}m</Text>
                        </View>
                      )}
                    </View>

                    {/* Coordinates readout */}
                    <View style={styles.coordsRow}>
                      <View style={styles.coordBox}>
                        <Text style={styles.coordLabel}>LATITUDE</Text>
                        <Text style={styles.coordValue}>{latitude.toFixed(6)}° N</Text>
                      </View>
                      <View style={styles.coordDivider} />
                      <View style={styles.coordBox}>
                        <Text style={styles.coordLabel}>LONGITUDE</Text>
                        <Text style={styles.coordValue}>{longitude.toFixed(6)}° E</Text>
                      </View>
                    </View>

                    {gpsTimestamp && (
                      <Text style={styles.gpsTimestampText}>
                        Captured at {gpsTimestamp}
                        {manualAdjustmentDistance != null && manualAdjustmentDistance > 0
                          ? ` • Pinned on map`
                          : ''}
                      </Text>
                    )}

                    {/* Online: Button to adjust location on map | Offline: Re-capture & notice (No map button) */}
                    {isOnline ? (
                      <TouchableOpacity
                        style={styles.adjustMapButton}
                        onPress={() => setShowMapPicker(true)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.adjustMapButtonLeft}>
                          <View style={styles.mapIconCircle}>
                            <Ionicons name="map" size={16} color={Colors.emerald600} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.adjustMapButtonTitle}>Adjust Location on Map</Text>
                            <Text style={styles.adjustMapButtonSub}>
                              Tap rooftop or fine-tune pin on satellite view
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={Colors.slate400} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.offlineActionRow}>
                        <View style={styles.offlineGpsNotice}>
                          <Ionicons name="cloud-offline" size={16} color={Colors.slate500} />
                          <Text style={styles.offlineGpsNoticeText}>
                            Offline Mode: High-precision satellite coordinates recorded.
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.reacquireOfflineButton}
                          onPress={handleCaptureLocation}
                          disabled={isCapturingGps}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="refresh" size={14} color={Colors.emerald600} style={{ marginRight: 4 }} />
                          <Text style={styles.reacquireOfflineButtonText}>Re-capture Live GPS</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  /* Empty state: Only show Capture Live Location */
                  <View style={styles.gpsEmptyState}>
                    <Ionicons name="navigate-circle-outline" size={32} color={Colors.slate400} />
                    <Text style={styles.gpsEmptyText}>
                      {gpsError || 'No GPS coordinates acquired yet.'}
                    </Text>
                    <TouchableOpacity
                      style={styles.acquireGpsButton}
                      onPress={handleLocationAction}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="locate" size={16} color={Colors.white} style={{ marginRight: 6 }} />
                      <Text style={styles.acquireGpsButtonText}>Capture Live Location</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Access Road Selection (Shown ONLY when location services are enabled for village) */}
          {isLocationEnabled && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Access Road <Text style={styles.required}>*</Text>
              </Text>

              {villageRoads && villageRoads.length > 0 ? (
                <>
                  <TouchableOpacity
                    style={[styles.selectTrigger, isRoadDropdownOpen && styles.selectTriggerOpen]}
                    onPress={() => {
                      setIsRoadDropdownOpen(!isRoadDropdownOpen);
                      setIsWardDropdownOpen(false);
                      setIsTypeDropdownOpen(false);
                      setIsTimeDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                      <Ionicons name="trail-sign-outline" size={18} color={Colors.slate500} />
                      <Text
                        style={[
                          styles.selectText,
                          !accessRoadId && { color: Colors.slate400, fontFamily: Typography.fontFamily },
                        ]}
                        numberOfLines={1}
                      >
                        {accessRoadId
                          ? villageRoads.find((r) => r.id === accessRoadId)?.name || `Road #${accessRoadId}`
                          : 'Select access road'}
                      </Text>
                    </View>
                    <Ionicons
                      name={isRoadDropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={Colors.slate500}
                    />
                  </TouchableOpacity>

                  {isRoadDropdownOpen && (
                    <View style={styles.dropdownContainer}>
                      <ScrollView style={styles.dropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                        {villageRoads.map((road) => {
                          const isSelected = accessRoadId === road.id;
                          return (
                            <TouchableOpacity
                              key={road.id}
                              style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                              onPress={() => {
                                setAccessRoadId(road.id);
                                setIsRoadDropdownOpen(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <Ionicons
                                  name="git-commit-outline"
                                  size={16}
                                  color={isSelected ? Colors.emerald600 : Colors.slate400}
                                />
                                <Text
                                  style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}
                                  numberOfLines={1}
                                >
                                  {road.name || `Road #${road.id}`}
                                </Text>
                              </View>
                              {isSelected && <Ionicons name="checkmark" size={16} color={Colors.emerald600} />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.noRoadsNotice}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.slate400} />
                  <Text style={styles.noRoadsText}>No roads recorded for this village yet.</Text>
                </View>
              )}
            </View>
          )}

          {/* Offline Mode Info Notice */}
          {!isOnline && (
            <View style={styles.offlineNoticeBubble}>
              <Ionicons name="cloud-offline" size={18} color={Colors.emerald700} />
              <Text style={styles.offlineNoticeText}>
                No internet connection. Household will be saved locally to SQLite and synced automatically when connected.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Bottom Submission Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Save & Register Household</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>

        {/* Interactive Map Picker Modal (Live GPS + Satellite/Street with Micro-Nudge D-Pad) */}
        <InteractiveMapPickerModal
          visible={showMapPicker}
          initialLocation={latitude && longitude ? { latitude, longitude } : null}
          onConfirm={(loc) => {
            setLatitude(loc.latitude);
            setLongitude(loc.longitude);
            setManualAdjustmentDistance(loc.distanceShiftMeters);
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.greenPrimary,
    ...Shadows.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Typography.fontFamilyBold,
    color: '#ffffff',
  },
  qrBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.emerald50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.emerald100,
    gap: Spacing.sm,
  },
  qrIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  qrLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
    letterSpacing: 0.5,
  },
  qrUid: {
    fontSize: 14,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate900,
  },
  qrVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  qrVerifiedText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.emerald700,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.sm + 4,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate700,
  },
  required: {
    color: Colors.destructive,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    paddingHorizontal: Spacing.sm + 2,
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    color: Colors.slate900,
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    paddingHorizontal: Spacing.sm + 2,
    height: 46,
  },
  selectText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate900,
    flex: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    padding: 4,
  },
  stepperButton: {
    width: 44,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueContainer: {
    flex: 1,
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  stepperSubtext: {
    fontSize: 10,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calibrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  calibrateText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.emerald600,
  },
  locationCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  gpsLoadingState: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gpsLoadingText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  gpsContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  gpsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  satellitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.emerald50,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  satelliteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.emerald500,
  },
  satelliteText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
  },
  accuracyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.full,
  },
  accuracyText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  adjustedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#fef3c7',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  adjustedPillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: '#b45309',
  },
  coordsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  coordBox: {
    flex: 1,
    alignItems: 'center',
  },
  coordLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  coordValue: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
  },
  coordDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.slate200,
  },
  gpsTimestampText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    textAlign: 'center',
  },
  adjustMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.emerald50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  adjustMapButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mapIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  adjustMapButtonTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.greenDark,
  },
  adjustMapButtonSub: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.emerald600,
    marginTop: 1,
  },
  offlineGpsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  offlineGpsNoticeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
    flex: 1,
  },
  offlineActionRow: {
    gap: 8,
  },
  reacquireOfflineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.emerald50,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  reacquireOfflineButtonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.greenDark,
  },
  gpsEmptyState: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gpsEmptyText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    textAlign: 'center',
  },
  acquireGpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.emerald600,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    marginTop: 4,
  },
  acquireGpsButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.white,
  },
  offlineNoticeBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.emerald50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  offlineNoticeText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.emerald700,
    flex: 1,
    lineHeight: 16,
  },
  actionBar: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    ...Shadows.md,
  },
  submitButton: {
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.emerald600,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.white,
  },
  selectTriggerOpen: {
    borderColor: Colors.emerald600,
  },
  dropdownContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginTop: 4,
    overflow: 'hidden',
    ...Shadows.md,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  dropdownItemActive: {
    backgroundColor: Colors.emerald50,
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  dropdownItemTextActive: {
    color: Colors.emerald700,
    fontFamily: Typography.fontFamilyBold,
  },
  stepperInput: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 0,
  },
  noRoadsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  noRoadsText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
  },
});
