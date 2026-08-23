import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ════════════════════════════════════════════════════════════════════════════════
//  SplashScreen
//  ─────────────
//  Animated JS splash that sits on top of the app after the native splash hides.
//  Plays entrance animations, holds briefly, then fades out via `onFinished`.
// ════════════════════════════════════════════════════════════════════════════════

interface SplashScreenProps {
  /** Called when all animations finish and the splash has faded out. */
  onFinished: () => void;
  /** How long (ms) to hold the completed splash before fading out. Default 800. */
  holdDuration?: number;
}

export default function SplashScreen({
  onFinished,
  holdDuration = 800,
}: SplashScreenProps) {
  // ── Animations ──────────────────────────────────────────────────────────────
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(15)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(15)).current;
  const bottomWaveOpacity = useRef(new Animated.Value(0)).current;

  // Decorative cross animations
  const cross1Opacity = useRef(new Animated.Value(0)).current;
  const cross2Opacity = useRef(new Animated.Value(0)).current;
  const cross3Opacity = useRef(new Animated.Value(0)).current;
  const cross4Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance sequence
    Animated.sequence([
      // 1. Logo bounces in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // 2. Title slides up
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // 3. Subtitle slides up
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // 4. Bottom tagline + wave
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(bottomWaveOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),

      // 5. Hold the completed splash for a moment
      Animated.delay(holdDuration),

      // 6. Fade out the entire splash
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinished();
    });

    // Decorative crosses fade in with stagger
    Animated.stagger(150, [
      Animated.timing(cross1Opacity, { toValue: 0.25, duration: 600, useNativeDriver: true }),
      Animated.timing(cross2Opacity, { toValue: 0.18, duration: 600, useNativeDriver: true }),
      Animated.timing(cross3Opacity, { toValue: 0.22, duration: 600, useNativeDriver: true }),
      Animated.timing(cross4Opacity, { toValue: 0.15, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: containerOpacity, zIndex: 999 }]}>
      <View style={styles.container}>
        {/* ── Background gradient (simulated with layered views) ─────────── */}
        <View style={styles.bgTop} />
        <View style={styles.bgBottom} />

        {/* ── Decorative dot grid (top-left) ─────────────────────────────── */}
        <View style={styles.dotGridTopLeft}>
          {Array.from({ length: 4 }).map((_, row) => (
            <View key={row} style={styles.dotRow}>
              {Array.from({ length: 4 }).map((_, col) => (
                <View key={col} style={styles.dot} />
              ))}
            </View>
          ))}
        </View>

        {/* ── Decorative dot grid (bottom-left) ────────────────────────────── */}
        <View style={styles.dotGridBottomRight}>
          {Array.from({ length: 5 }).map((_, row) => (
            <View key={row} style={styles.dotRow}>
              {Array.from({ length: 5 }).map((_, col) => (
                <View key={col} style={styles.dot} />
              ))}
            </View>
          ))}
        </View>

        {/* ── Decorative crosses ─────────────────────────────────────────── */}
        <Animated.Text style={[styles.cross, styles.cross1, { opacity: cross1Opacity }]}>+</Animated.Text>
        <Animated.Text style={[styles.cross, styles.cross2, { opacity: cross2Opacity }]}>+</Animated.Text>
        <Animated.Text style={[styles.cross, styles.cross3, { opacity: cross3Opacity }]}>+</Animated.Text>
        <Animated.Text style={[styles.cross, styles.cross4, { opacity: cross4Opacity }]}>+</Animated.Text>
        <Animated.Text style={[styles.cross, styles.cross5, { opacity: cross2Opacity }]}>+</Animated.Text>
        <Animated.Text style={[styles.cross, styles.cross6, { opacity: cross3Opacity }]}>+</Animated.Text>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* App Icon / Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* App Name */}
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }}
          >
            <Text style={styles.title}>
              <Text style={styles.titlePhysio}>Physio</Text>
              <Text style={styles.titleDesk}>Desk</Text>
            </Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.View
            style={{
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            }}
          >
            <View style={styles.subtitleRow}>
              <View style={styles.subtitleLine} />
              <Text style={styles.subtitle}>PHYSIO CLINIC MANAGEMENT</Text>
              <View style={styles.subtitleLine} />
            </View>
          </Animated.View>
        </View>

        {/* ── Bottom section ─────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.bottomSection,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          <Text style={styles.tagline}>Manage Clinic. Better Care.</Text>
        </Animated.View>

        {/* ── Bottom wave decoration ─────────────────────────────────────── */}
        <Animated.View style={[styles.waveContainer, { opacity: bottomWaveOpacity }]}>
          <View style={styles.wave1} />
          <View style={styles.wave2} />
          <View style={styles.wave3} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FFFE',
    overflow: 'hidden',
  },

  // ── Background layers ────────────────────────────────────────────────────
  bgTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FFFE',
  },
  bgBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.35,
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
    borderTopLeftRadius: SCREEN_WIDTH * 0.6,
    borderTopRightRadius: SCREEN_WIDTH * 0.2,
  },

  // ── Dot grids ────────────────────────────────────────────────────────────
  dotGridTopLeft: {
    position: 'absolute',
    top: 60,
    left: 20,
    opacity: 0.15,
  },
  dotGridBottomRight: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    opacity: 0.15,
  },
  dotRow: {
    flexDirection: 'row',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0D9488',
    margin: 4,
  },

  // ── Decorative crosses ───────────────────────────────────────────────────
  cross: {
    position: 'absolute',
    fontSize: 28,
    fontWeight: '300',
    color: '#0D9488',
  },
  cross1: { top: '8%', left: '10%' },
  cross2: { top: '14%', right: '15%' },
  cross3: { top: '22%', left: '22%' },
  cross4: { top: '35%', right: '8%' },
  cross5: { bottom: '25%', right: '10%' },
  cross6: { bottom: '35%', left: '8%' },

  // ── Main content ─────────────────────────────────────────────────────────
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },

  // ── Logo ──────────────────────────────────────────────────────────────────
  logoContainer: {
    width: 180,
    height: 180,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  logoImage: {
    width: 160,
    height: 160,
    borderRadius: 30,
  },

  // ── Title ─────────────────────────────────────────────────────────────────
  title: {
    fontSize: 42,
    marginBottom: 8,
  },
  titlePhysio: {
    fontWeight: '700',
    color: '#0F172A',
  },
  titleDesk: {
    fontWeight: '700',
    color: '#0D9488',
  },

  // ── Subtitle row with lines ───────────────────────────────────────────────
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subtitleLine: {
    width: 24,
    height: 2,
    backgroundColor: '#0D9488',
    borderRadius: 1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
    color: '#0D9488',
  },

  // ── Bottom section ────────────────────────────────────────────────────────
  bottomSection: {
    alignItems: 'center',
    marginBottom: 100,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    color: '#475569',
    letterSpacing: 0.5,
  },

  // ── Wave decoration ───────────────────────────────────────────────────────
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  wave1: {
    position: 'absolute',
    bottom: 0,
    left: -20,
    right: -20,
    height: 100,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderTopLeftRadius: SCREEN_WIDTH * 0.8,
    borderTopRightRadius: SCREEN_WIDTH * 0.3,
  },
  wave2: {
    position: 'absolute',
    bottom: 0,
    left: -20,
    right: -20,
    height: 70,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    borderTopLeftRadius: SCREEN_WIDTH * 0.3,
    borderTopRightRadius: SCREEN_WIDTH * 0.7,
  },
  wave3: {
    position: 'absolute',
    bottom: 0,
    left: -20,
    right: -20,
    height: 40,
    backgroundColor: 'rgba(13, 148, 136, 0.18)',
    borderTopLeftRadius: SCREEN_WIDTH * 0.5,
    borderTopRightRadius: SCREEN_WIDTH * 0.5,
  },
});
