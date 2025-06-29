import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Alert,
  Vibration,
  Dimensions,
  BackHandler,
} from 'react-native';
import {
  Button,
  Surface,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { apiService } from '@/services/ApiService';
import { theme } from '@/utils/theme';
import { Household } from '@/types';

const { width, height } = Dimensions.get('window');

const QRScannerScreen: React.FC = () => {
  const [scanning, setScanning] = useState(true);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Get households for verification
  const { data: households } = useQuery<Household[]>({
    queryKey: ['/api/households', user?.villageId],
    queryFn: () => apiService.getHouseholds(user?.villageId).then(res => res.data),
    enabled: !!user?.villageId,
  });

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [navigation])
  );

  const onSuccess = async (e: any) => {
    if (!scanning || processing) return;
    
    setScanning(false);
    setProcessing(true);
    Vibration.vibrate(200);

    try {
      console.log('QR Code scanned:', e.data);
      
      // Parse QR code data
      let qrData;
      try {
        qrData = JSON.parse(e.data);
      } catch (parseError) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not valid for waste collection.',
          [{ text: 'OK', onPress: () => resetScanner() }]
        );
        return;
      }

      // Validate QR code structure
      if (!qrData.uid || !qrData.headName || !qrData.houseNumber) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code does not contain valid household information.',
          [{ text: 'OK', onPress: () => resetScanner() }]
        );
        return;
      }

      // Find household in local data
      const household = households?.find(h => 
        h.id === qrData.uid || 
        (h.headName === qrData.headName && h.houseNumber === qrData.houseNumber)
      );

      if (!household) {
        Alert.alert(
          'Household Not Found',
          'This household is not registered in your village or you do not have permission to collect from this household.',
          [{ text: 'OK', onPress: () => resetScanner() }]
        );
        return;
      }

      // Check if already collected today
      const today = new Date().toISOString().split('T')[0];
      const existingCollection = await checkExistingCollection(household.id, today);
      
      if (existingCollection) {
        Alert.alert(
          'Already Collected',
          `This household was already collected today at ${new Date(existingCollection.collectedAt).toLocaleTimeString()}.`,
          [
            { text: 'View Details', onPress: () => viewCollectionDetails(existingCollection) },
            { text: 'Scan Another', onPress: () => resetScanner() },
          ]
        );
        return;
      }

      // Navigate to collection form
      navigation.navigate('CollectionForm' as never, { household } as never);
      
    } catch (error) {
      console.error('QR scanning error:', error);
      Alert.alert(
        'Error',
        'Failed to process QR code. Please try again.',
        [{ text: 'OK', onPress: () => resetScanner() }]
      );
    } finally {
      setProcessing(false);
    }
  };

  const checkExistingCollection = async (householdId: string, date: string) => {
    try {
      const response = await apiService.getCollections({
        householdId,
        collectorId: user?.id,
        date,
      });
      return response.data && response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      console.error('Error checking existing collection:', error);
      return null;
    }
  };

  const viewCollectionDetails = (collection: any) => {
    navigation.navigate('CollectionDetail' as never, { collection } as never);
  };

  const resetScanner = () => {
    setScanning(true);
    setScannedData(null);
    setProcessing(false);
  };

  const renderTopOverlay = () => (
    <Surface style={styles.topOverlay}>
      <View style={styles.headerContainer}>
        <IconButton
          icon="arrow-left"
          iconColor="#FFFFFF"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{t('collection', 'scanQR')}</Text>
        <View style={styles.placeholder} />
      </View>
      <Text style={styles.instructionText}>
        {t('collection', 'scanInstruction')}
      </Text>
    </Surface>
  );

  const renderBottomOverlay = () => (
    <Surface style={styles.bottomOverlay}>
      {processing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.processingText}>Processing QR Code...</Text>
        </View>
      ) : (
        <View style={styles.controlsContainer}>
          <Button
            mode="contained"
            onPress={resetScanner}
            disabled={!scanning}
            style={styles.rescanButton}
          >
            Rescan
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </View>
      )}
    </Surface>
  );

  const renderViewFinder = () => (
    <View style={styles.viewFinder}>
      <View style={styles.viewFinderBorder} />
      <Text style={styles.viewFinderText}>
        Align QR code within the frame
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <QRCodeScanner
        onRead={onSuccess}
        showMarker={false}
        cameraStyle={styles.camera}
        topContent={renderTopOverlay()}
        bottomContent={renderBottomOverlay()}
        reactivate={scanning}
        reactivateTimeout={2000}
        checkAndroid6Permissions={true}
        permissionDialogTitle="Camera Permission"
        permissionDialogMessage="GreenPathOrg needs camera access to scan QR codes"
      />
      {renderViewFinder()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    height: height,
    width: width,
  },
  topOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: theme.spacing.lg,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 48,
  },
  instructionText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  bottomOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 120,
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: theme.spacing.md,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  rescanButton: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  viewFinder: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -125 },
      { translateY: -125 },
    ],
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewFinderBorder: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'transparent',
    position: 'absolute',
  },
  viewFinderText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: 280,
  },
});

export default QRScannerScreen;