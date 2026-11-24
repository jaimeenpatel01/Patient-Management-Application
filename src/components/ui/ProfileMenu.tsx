import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const HEADER_HEIGHT = 56;
const TRIGGER_ICON_SIZE = 22;
const ARROW_SIZE = 10;
const MENU_RIGHT = Spacing.md;
// Centre of the trigger icon, measured from the screen's right edge.
const TRIGGER_CENTER_FROM_RIGHT = Spacing.base + Spacing.xs + TRIGGER_ICON_SIZE / 2;

/** Header kebab button that opens a small pop-out (with a pointer) linking to Profile. */
export function ProfileMenuButton() {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const close = () => setVisible(false);
  const openProfile = () => {
    close();
    router.push('/profile');
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        hitSlop={8}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={t('profileMenu.open')}
      >
        <Ionicons name="ellipsis-vertical" size={TRIGGER_ICON_SIZE} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={close}>
        <TouchableWithoutFeedback onPress={close}>
          <View style={styles.overlay}>
            <View style={[styles.menu, { top: insets.top + HEADER_HEIGHT - Spacing.xs }]}>
              <View style={styles.arrow} />
              <TouchableOpacity style={styles.row} onPress={openProfile} activeOpacity={0.6}>
                <Ionicons name="person-outline" size={18} color={Colors.primary} />
                <Text style={styles.rowLabel}>{t('tabs.profile')}</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    marginRight: Spacing.base,
    padding: Spacing.xs,
  },
  overlay: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    right: MENU_RIGHT,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.lg,
  },
  // Rotated square peeking out of the top edge, pointing at the kebab icon.
  arrow: {
    position: 'absolute',
    top: -ARROW_SIZE / 2,
    right: TRIGGER_CENTER_FROM_RIGHT - MENU_RIGHT - ARROW_SIZE / 2,
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    backgroundColor: Colors.surface,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: Colors.borderLight,
    transform: [{ rotate: '45deg' }],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingVertical: Spacing.md - 1,
    paddingHorizontal: Spacing.base,
  },
  rowLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.text,
  },
});
