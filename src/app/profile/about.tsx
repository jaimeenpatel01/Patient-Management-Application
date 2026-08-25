import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { APP_VERSION } from '@/constants/options';

const PRIVACY_POLICY_URL = 'https://physiodesk.app/privacy';
const TERMS_OF_SERVICE_URL = 'https://physiodesk.app/terms';

export default function AboutScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* App Branding */}
        <View style={styles.brandingSection}>
          <View style={styles.appIconContainer}>
            <View style={styles.appIcon}>
              <Ionicons name="fitness" size={40} color={Colors.textInverse} />
            </View>
          </View>
          <Text style={styles.appName}>PhysioDesk</Text>
          <Text style={styles.appTagline}>Physio Clinic Management</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version {APP_VERSION}</Text>
          </View>
        </View>

        {/* Legal Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEGAL</Text>
          <View style={[styles.menuCard, Shadows.sm]}>
            <LinkItem
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            />
            <View style={styles.divider} />
            <LinkItem
              icon="document-text-outline"
              label="Terms of Service"
              onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ for physiotherapists</Text>
          <Text style={styles.copyright}>© {new Date().getFullYear()} PhysioDesk</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Link Item ────────────────────────────────────────────────────────────────

interface LinkItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

function LinkItem({ icon, label, onPress }: LinkItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIconBg}>
          <Ionicons name={icon} size={20} color={Colors.primary} />
        </View>
        <Text style={styles.menuItemLabel}>{label}</Text>
      </View>
      <Ionicons name="open-outline" size={16} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  // Branding
  brandingSection: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  appIconContainer: {
    marginBottom: Spacing.lg,
    ...Shadows.lg,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  appTagline: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  versionBadge: {
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  versionText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  // Section
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  // Menu
  menuCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.base,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemLabel: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.base + 36 + Spacing.md,
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  footerText: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  copyright: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
  },
});
