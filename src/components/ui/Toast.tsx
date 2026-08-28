import React, { useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@/contexts/ToastContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

// ── Appearance per toast type ──────────────────────────────────────────────────

const TOAST_CONFIG: Record<
  'error' | 'success' | 'warning',
  { bg: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string; accentColor: string }
> = {
  error: {
    bg: '#1F2937',
    icon: 'alert-circle',
    iconColor: '#EF4444',
    accentColor: '#EF4444',
  },
  success: {
    bg: '#1F2937',
    icon: 'checkmark-circle',
    iconColor: '#10B981',
    accentColor: '#10B981',
  },
  warning: {
    bg: '#1F2937',
    icon: 'warning',
    iconColor: '#F59E0B',
    accentColor: '#F59E0B',
  },
};

// ── Component ──────────────────────────────────────────────────────────────────

export function Toast() {
  const { toastState, hideToast } = useToast();
  const { visible, message, type, duration, id } = toastState;
  const insets = useSafeAreaInsets();

  // Animated values
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIdRef = useRef(-1);

  // ── Pan responder for swipe-to-dismiss ──────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy < -5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -40 || gesture.vy < -0.5) {
          // Swipe up far enough → dismiss
          dismissToast();
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    }),
  ).current;

  // ── Show animation ──────────────────────────────────────────
  useEffect(() => {
    if (visible && id !== lastIdRef.current) {
      lastIdRef.current = id;

      // Reset
      translateY.setValue(-120);
      opacity.setValue(0);
      progress.setValue(0);

      // Clear any pending timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Slide in with spring
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Progress bar animation
      Animated.timing(progress, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }).start();

      // Auto-dismiss
      timerRef.current = setTimeout(() => {
        dismissToast();
      }, duration);
    }
  }, [visible, id]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dismissToast = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideToast();
    });
  };

  if (!visible) return null;

  const config = TOAST_CONFIG[type];

  const progressBarWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '0%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + Spacing.sm,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.toast, { backgroundColor: config.bg }]}>
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: config.accentColor }]} />

        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name={config.icon} size={22} color={config.iconColor} />
        </View>

        {/* Message */}
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>

        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismissToast}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        {/* Progress bar */}
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: config.accentColor,
              width: progressBarWidth as any,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    overflow: 'hidden',
    ...Shadows.lg,
    // Extra shadow for prominence
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
  },
  iconContainer: {
    marginRight: Spacing.md,
    marginLeft: Spacing.xs,
  },
  message: {
    flex: 1,
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: '#F9FAFB',
    lineHeight: Typography.sm * Typography.normal,
  },
  closeButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderBottomLeftRadius: BorderRadius.md,
  },
});
