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

  // Background
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',

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
  warning: '#D97706',
  warningLight: 'rgba(217, 119, 6, 0.1)',
  error: '#DC2626',
  errorLight: 'rgba(220, 38, 38, 0.1)',
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
  shadow: 'rgba(0, 0, 0, 0.08)',
  disabled: '#CBD5E1',
  tabInactive: '#94A3B8',
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
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
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
