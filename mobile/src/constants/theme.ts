/**
 * GreenPath Design Tokens
 * Extracted from the existing web application's CSS variables and Tailwind config.
 */

export const Colors = {
  // Primary brand colors (from web login button gradient)
  emerald600: '#059669',
  emerald500: '#10b981',
  emerald700: '#047857',
  emerald50: '#ecfdf5',
  emerald100: '#d1fae5',

  teal600: '#0d9488',
  teal500: '#14b8a6',

  // Accent card palettes (matching web dashboard stats cards)
  blue600: '#2563eb',
  blue500: '#3b82f6',
  blue50: '#eff6ff',
  blue100: '#dbeafe',

  purple600: '#7c3aed',
  purple500: '#8b5cf6',
  purple50: '#f5f3ff',
  purple100: '#ede9fe',

  // Green theme
  greenPrimary: '#0e7c3f',
  greenDark: '#0a5c2f',
  brandGreen: '#0e7c3f',

  // Slate palette
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  slate50: '#f8fafc',

  // Functional colors
  white: '#ffffff',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  destructive: '#ef4444',
  destructiveLight: '#fef2f2',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
  amber600: '#d97706',
  info: '#3b82f6',
  infoLight: '#eff6ff',

  // Border colors
  borderLight: '#f1f5f9',
  borderMedium: '#e2e8f0',

  // Transparent
  transparent: 'transparent',
};

export const Typography = {
  fontFamily: 'Inter_400Regular',
  fontFamilyMedium: 'Inter_500Medium',
  fontFamilySemiBold: 'Inter_600SemiBold',
  fontFamilyBold: 'Inter_700Bold',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  blueGlow: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  emeraldGlow: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  purpleGlow: {
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
};

