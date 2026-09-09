/**
 * API Configuration for GreenPath Mobile
 *
 * For Android emulator: 10.0.2.2 maps to host machine's localhost.
 * For physical device: use the Mac's local network IP.
 */
import { Platform } from 'react-native';

// Default: emulator-friendly URL. Override for physical device testing.
const EMULATOR_API_URL = 'http://10.0.2.2:5001';
const DEVICE_API_URL = 'http://192.168.1.11:5001'; // Update to your Mac's local IP
// Production domain
const PRODUCTION_API_URL = 'https://greenpathindia.in';
const NGROK_API_URL = 'https://nelly-lignocellulosic-nataly.ngrok-free.dev';

export const API_BASE_URL = PRODUCTION_API_URL;

export const API_ENDPOINTS = {
  // Mobile auth
  login: '/api/mobile/auth/login',
  refresh: '/api/mobile/auth/refresh',
  logout: '/api/mobile/auth/logout',
  user: '/api/mobile/auth/user',

  // Collector data
  households: '/api/households',
  wasteCollections: '/api/waste-collections',
  collectorCollections: '/api/waste-collections/collector',
  villageTodayCount: '/api/village/today-count',

  // Announcements
  announcements: '/api/announcements',

  // Issues
  issues: '/api/issues',

  // Uploads
  uploadPhoto: '/api/upload/photo',
  uploadVoice: '/api/upload/voice',

  // Attendance / Shift
  myShift: '/api/attendance/my-shift',
  myAttendanceStatus: '/api/attendance/my-status',
  scanShift: '/api/attendance/scan-shift',

  // Waste Log
  wasteLog: '/api/collector-waste-log',

  // Profile
  changePassword: '/api/auth/change-password',
} as const;
