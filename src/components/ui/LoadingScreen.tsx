import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = React.memo(function LoadingScreen({ message }: LoadingScreenProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (message) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [message, pulseAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="pulse" size={28} color={Colors.primary} />
      </View>
      <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
      {message && (
        <Animated.Text style={[styles.message, { opacity: pulseAnim }]}>
          {message}
        </Animated.Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  spinner: {
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    letterSpacing: 0.2,
  },
});
