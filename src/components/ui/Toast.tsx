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
import { Colors, Spacing } from '@/constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Toast Configuration
// ─────────────────────────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<
  'error' | 'success' | 'warning',
  {
    background: string;
    iconBackground: string;
    iconColor: string;
    accentColor: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  error: {
    background: '#FFF8F8',
    iconBackground: '#FDEBEC',
    iconColor: '#E5484D',
    accentColor: '#E5484D',
    icon: 'alert-circle',
  },

  success: {
    background: '#F6FCFA',
    iconBackground: '#E5F7F1',
    iconColor: '#109C89',
    accentColor: '#109C89',
    icon: 'checkmark-circle',
  },

  warning: {
    background: '#FFFBF4',
    iconBackground: '#FFF1D6',
    iconColor: '#D88A00',
    accentColor: '#E5A126',
    icon: 'warning',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Toast Component
// ─────────────────────────────────────────────────────────────────────────────

export function Toast() {
  const { toastState, hideToast } = useToast();

  const {
    visible,
    message,
    type,
    duration,
    id,
  } = toastState;

  const insets = useSafeAreaInsets();

  // ───────────────────────────────────────────────────────────────────────────
  // Animation values
  // ───────────────────────────────────────────────────────────────────────────

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.97)).current;
  const progress = useRef(new Animated.Value(0)).current;

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
        toValue: -80,
        duration: 180,
        useNativeDriver: true,
      }),

      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),

      Animated.timing(scale, {
        toValue: 0.97,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        hideToast();
      }
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Swipe to dismiss
  // ───────────────────────────────────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (_, gesture) => {
        return (
          gesture.dy < -8 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx)
        );
      },

      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < 0) {
          translateY.setValue(gesture.dy);
        }
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
    if (!visible || id === lastIdRef.current) {
      return;
    }

    lastIdRef.current = id;

    // Reset
    translateY.setValue(-100);
    opacity.setValue(0);
    scale.setValue(0.97);
    progress.setValue(0);

    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Entrance animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 11,
      }),

      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),

      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 90,
        friction: 10,
      }),
    ]).start();

    // Progress
    Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start();

    // Auto dismiss
    timerRef.current = setTimeout(() => {
      dismissToast();
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, id]);

  // ───────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Don't render when hidden
  // ───────────────────────────────────────────────────────────────────────────

  if (!visible) {
    return null;
  }

  const config = TOAST_CONFIG[type];

  // 100% → 0%
  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '0%'],
  });

  // ───────────────────────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 12,
          opacity,
          transform: [
            { translateY },
            { scale },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: config.background,
          },
        ]}
      >
        {/* ────────────────────────────────────────────────────────────────────
            Colored accent
        ──────────────────────────────────────────────────────────────────── */}

        <View
          style={[
            styles.accent,
            {
              backgroundColor: config.accentColor,
            },
          ]}
        />

        {/* ────────────────────────────────────────────────────────────────────
            Icon
        ──────────────────────────────────────────────────────────────────── */}

        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: config.iconBackground,
            },
          ]}
        >
          <Ionicons
            name={config.icon}
            size={19}
            color={config.iconColor}
          />
        </View>

        {/* ────────────────────────────────────────────────────────────────────
            Message
        ──────────────────────────────────────────────────────────────────── */}

        <Text
          style={styles.message}
          numberOfLines={3}
        >
          {message}
        </Text>

        {/* ────────────────────────────────────────────────────────────────────
            Close
        ──────────────────────────────────────────────────────────────────── */}

        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismissToast}
          activeOpacity={0.6}
          hitSlop={{
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
          }}
        >
          <Ionicons
            name="close"
            size={18}
            color="#94A3B8"
          />
        </TouchableOpacity>

        {/* ────────────────────────────────────────────────────────────────────
            Progress
        ──────────────────────────────────────────────────────────────────── */}

        <Animated.View
          style={[
            styles.progress,
            {
              backgroundColor: config.accentColor,
              width: progressWidth as any,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ───────────────────────────────────────────────────────────────────────────
  // Container
  // ───────────────────────────────────────────────────────────────────────────

  container: {
    position: 'absolute',

    left: 20,
    right: 20,

    zIndex: 9999,
    elevation: 9999,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Toast
  // ───────────────────────────────────────────────────────────────────────────

  toast: {
    minHeight: 62,

    flexDirection: 'row',
    alignItems: 'center',

    paddingLeft: 14,
    paddingRight: 10,

    borderRadius: 18,

    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 23, 42, 0.10)',

    // iOS
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.10,
    shadowRadius: 12,

    // Android
    elevation: 5,

    overflow: 'hidden',
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Left accent
  // ───────────────────────────────────────────────────────────────────────────

  accent: {
    position: 'absolute',

    left: 0,
    top: 0,
    bottom: 0,

    width: 4,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Icon
  // ───────────────────────────────────────────────────────────────────────────

  iconWrapper: {
    width: 38,
    height: 38,

    borderRadius: 19,

    alignItems: 'center',
    justifyContent: 'center',

    marginLeft: 2,
    marginRight: 12,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Message
  // ───────────────────────────────────────────────────────────────────────────

  message: {
    flex: 1,

    fontSize: 15.5,
    lineHeight: 21,

    fontWeight: '500',

    color: '#172033',

    letterSpacing: -0.15,

    paddingVertical: 10,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Close button
  // ───────────────────────────────────────────────────────────────────────────

  closeButton: {
    width: 34,
    height: 34,

    alignItems: 'center',
    justifyContent: 'center',

    marginLeft: 5,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Progress
  // ───────────────────────────────────────────────────────────────────────────

  progress: {
    position: 'absolute',

    left: 0,
    bottom: 0,

    height: 2,
  },
});