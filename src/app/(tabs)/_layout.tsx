import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Typography, Shadows, Spacing } from '@/constants/theme';
import { ProfileMenuButton } from '@/components/ui/ProfileMenu';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Material 3 style: a tinted pill behind the active icon.
function PillIcon({ name, focused, color }: { name: IoniconName; focused: boolean; color: string }) {
  return (
    <View style={[styles.pill, focused && styles.pillActive]}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

function TabLabel({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.85}
      allowFontScaling={false}
      style={[styles.label, { color }, focused && styles.labelActive]}
    >
      {label}
    </Text>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The gesture handle only needs part of the system inset; using all of it makes the bar too tall.
  const bottomPadding = Math.max(insets.bottom - Spacing.sm, Spacing.xs);

  const tabOptions = (key: string, icon: IoniconName, activeIcon: IoniconName) => ({
    title: t(`tabs.${key}`),
    tabBarLabel: ({ focused, color }: { focused: boolean; color: string }) => (
      <TabLabel label={t(`tabBar.${key}`)} focused={focused} color={color} />
    ),
    tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
      <PillIcon name={focused ? activeIcon : icon} focused={focused} color={color} />
    ),
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTitleStyle: {
          fontWeight: Typography.semibold,
          fontSize: Typography.lg,
          color: Colors.text,
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: Colors.primaryDark,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 0,
          ...Shadows.lg,
          shadowOffset: { width: 0, height: -4 },
          // Inset the row so the five tabs sit closer together instead of spanning edge to edge.
          paddingHorizontal: Spacing.md,
          paddingTop: Spacing.xs + 2,
          paddingBottom: bottomPadding,
          height: 40 + bottomPadding,
        },
        tabBarIconStyle: styles.iconSlot,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          ...tabOptions('dashboard', 'grid-outline', 'grid'),
          headerRight: () => <ProfileMenuButton />,
        }}
      />
      <Tabs.Screen name="patients" options={tabOptions('patients', 'people-outline', 'people')} />
      <Tabs.Screen
        name="attendance"
        options={tabOptions('attendance', 'checkmark-circle-outline', 'checkmark-circle')}
      />
      <Tabs.Screen
        name="appointments" 
        options={tabOptions('appointments', 'calendar-outline', 'calendar')}
      />
      <Tabs.Screen name="payments" options={tabOptions('payments', 'wallet-outline', 'wallet')} />
      {/* Profile opens from the Dashboard avatar, so it's hidden from the bar. */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          href: null,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={12}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingHorizontal: 0,
  },
  iconSlot: {
    width: 56,
    height: 30,
  },
  pill: {
    width: 56,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: Colors.primaryFaded,
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    marginTop: 2,
  },
  labelActive: {
    fontWeight: Typography.bold,
  },
  backButton: {
    marginLeft: Spacing.md,
  },
});
