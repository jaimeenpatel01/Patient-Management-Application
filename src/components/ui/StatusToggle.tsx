import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

const TRACK_WIDTH = 40;
const TRACK_HEIGHT = 24;
const THUMB_SIZE = 20;
const THUMB_INSET = 2;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET * 2;

type StatusToggleProps = {
  value: boolean;
  onToggle: (next: boolean) => void;
  activeLabel: string;
  inactiveLabel: string;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * Compact switch with a status caption underneath ("Active" / "Inactive").
 * Flips its own display immediately so the thumb animates even if the parent
 * removes the row right after `onToggle`.
 */
export function StatusToggle({
  value,
  onToggle,
  activeLabel,
  inactiveLabel,
  disabled = false,
  accessibilityLabel,
}: StatusToggleProps) {
  const [displayOn, setDisplayOn] = useState(value);
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    setDisplayOn(value);
  }, [value]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: displayOn ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [displayOn, progress]);

  const handlePress = () => {
    const next = !displayOn;
    setDisplayOn(next);
    onToggle(next);
  };

  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.disabled, Colors.primary],
  });
  const thumbX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, THUMB_TRAVEL],
  });

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={8}
      style={styles.container}
      accessibilityRole="switch"
      accessibilityState={{ checked: displayOn, disabled }}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX: thumbX }] }]} />
      </Animated.View>
      <View>
        <Text style={[styles.label, { color: displayOn ? Colors.primary : Colors.textTertiary }]}>
          {displayOn ? activeLabel : inactiveLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 60,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: THUMB_INSET,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.surface,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    letterSpacing: 0.2,
  },
});
