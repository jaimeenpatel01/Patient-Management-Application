import React, { useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@/contexts/ToastContext';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Toast Configuration
// ─────────────────────────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<
  'error' | 'success' | 'warning',
  {
    iconColor: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  success: {
    iconColor: Colors.success,
    icon: 'checkmark-circle',
  },
  error: {
    iconColor: Colors.error,
    icon: 'close-circle',
  },
  warning: {
    iconColor: Colors.warning,
    icon: 'warning',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Toast Component
// ─────────────────────────────────────────────────────────────────────────────

export function Toast() {
  const { toastState, hideToast } = useToast();
  const { visible, message, type, duration, id } = toastState;
  const insets = useSafeAreaInsets();

  // ───────────────────────────────────────────────────────────────────────────
  // Animation values
  // ───────────────────────────────────────────────────────────────────────────

  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIdRef = useRef(-1);

  // ───────────────────────────────────────────────────────────────────────────
  // Dismiss
  // ───────────────────────────────────────────────────────────────────────────

  const dismissToast = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) hideToast();
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Swipe up to dismiss
  // ───────────────────────────────────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy < -8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -40 || gesture.vy < -0.5) {
          dismissToast();
        } else {
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

  // ───────────────────────────────────────────────────────────────────────────
  // Show toast
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!visible || id === lastIdRef.current) return;
    lastIdRef.current = id;

    translateY.setValue(-80);
    opacity.setValue(0);
    scale.setValue(0.9);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 9,
      }),
    ]).start();

    timerRef.current = setTimeout(dismissToast, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Don't render when hidden
  // ───────────────────────────────────────────────────────────────────────────

  if (!visible) return null;

  const config = TOAST_CONFIG[type];

  // ───────────────────────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + Spacing.md,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.pill}
        onPress={dismissToast}
        activeOpacity={0.85}
      >
        <Ionicons
          name={config.icon}
          size={18}
          color={config.iconColor}
          style={styles.icon}
        />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    maxWidth: 320,
    // iOS
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    // Android
    elevation: 6,
  },

  icon: {
    marginRight: Spacing.sm,
  },

  message: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.text,
    flexShrink: 1,
  },
});
