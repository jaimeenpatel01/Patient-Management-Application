/**
 * Design tokens for PhysioDesk.
 * Healthcare-professional palette with teal primary.
 */

export const Colors = {
  // Primary palette
  primary: '#0D9488',
  primaryLight: '#14B8A6',
  primaryDark: '#0F766E',
  primaryFaded: 'rgba(13, 148, 136, 0.1)',
  primaryGradientEnd: '#06B6D4',

  // Background
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceElevated: '#FFFFFF',

  // Text
  text: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderFocused: '#0D9488',

  // Semantic
  success: '#16A34A',
  successLight: 'rgba(22, 163, 74, 0.1)',
  warning: '#ff8800ff',
  warningLight: 'rgba(217, 119, 6, 0.1)',
  error: '#DC2626',
  errorLight: 'rgba(240, 50, 50, 0.17)',
  info: '#2563EB',
  infoLight: 'rgba(37, 99, 235, 0.1)',

  // Status colors
  scheduled: '#2563EB',
  completed: '#16A34A',
  cancelled: '#DC2626',
  noShow: '#D97706',
  pending: '#D97706',
  paid: '#16A34A',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(13, 148, 136, 0.10)',
  shadowDark: 'rgba(15, 23, 42, 0.08)',
  disabled: '#CBD5E1',
  tabInactive: '#6d85a5ff',
} as const;

export const Typography = {
  // Font sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,

  // Line heights
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 56,
  '6xl': 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

/** Shared header options for Stack navigators across route groups */
export const STACK_HEADER_OPTIONS = {
  headerStyle: { backgroundColor: Colors.surface },
  headerTitleStyle: {
    fontWeight: Typography.semibold,
    fontSize: Typography.lg,
    color: Colors.text,
  },
  headerShadowVisible: false,
  headerTintColor: Colors.primary,
} as const;
