import React, { useState } from 'react';
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

// ─── FAQ Data ─────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    question: 'How do I add a new patient?',
    answer:
      'Go to the Patients tab, tap the "+" button at the top right, enter the patient details, and tap "Save".',
  },
  {
    question: 'How do I record a payment?',
    answer:
      'Go to the Payments tab, tap "Add Payment", select the patient, enter the payment amount and details, and tap "Save".',
  },
  {
    question: 'How do I mark attendance?',
    answer:
      'Go to the Attendance tab, select the date, choose the patient, and mark their attendance.',
  },
  {
    question: 'How do I create a consultation?',
    answer:
      'Open a patient profile, go to the Consultations section, tap "New Consultation", and enter the relevant symptoms, diagnosis, treatment, and other details.',
  },
  {
    question: 'Can I upload medical documents?',
    answer:
      'Yes. Open a patient profile, go to the Documents section, and tap "Upload". You can upload documents such as X-rays, MRI reports, prescriptions, and other supported files.',
  },
  {
    question: 'How do I change my password?',
    answer:
      'Go to Profile → Change Password. Enter your new password and confirm it to update your password.',
  },
  {
    question: 'What should I do if I forget my password?',
    answer:
      'On the login screen, tap "Forgot Password", enter your registered email address, and follow the password reset link sent to your email.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'PhysioDesk uses Supabase for authentication and data storage. Access to your data is controlled using authentication and Row Level Security (RLS).',
  },
  {
    question: 'Can I edit patient information?',
    answer:
      'Yes. Open the patient profile, select the relevant information, make the required changes, and save the updates.',
  },
  {
    question: 'Can I delete my account?',
    answer:
      'Yes. You can find the Delete Account option in your Profile settings. Account deletion is permanent, so make sure you have any information you need before proceeding.',
  },
  {
    question: 'How do I sign out?',
    answer:
      'Go to Profile and tap "Sign Out". You will be returned to the login screen.',
  },
  {
    question: 'How can I check the app version?',
    answer:
      'Go to Profile → About PhysioDesk to view the currently installed app version.',
  },
];

const SUPPORT_EMAIL = 'doctor.app.devv@gmail.com';

export default function HelpSupportScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Options */}
        <View style={styles.section}>
          <View style={[styles.menuCard, Shadows.sm]}>
            <MenuItem
              icon="mail-outline"
              label="Contact Support"
              subtitle="Get help via email"
              onPress={() =>
                Linking.openURL(
                  `mailto:${SUPPORT_EMAIL}?subject=PhysioDesk%20Support%20Request`
                )
              }
            />
            <View style={styles.divider} />
            <MenuItem
              icon="bug-outline"
              label="Report a Problem"
              subtitle="Let us know about issues"
              onPress={() =>
                Linking.openURL(
                  `mailto:${SUPPORT_EMAIL}?subject=PhysioDesk%20Bug%20Report&body=Please%20describe%20the%20issue%20below%3A%0A%0A`
                )
              }
            />
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FREQUENTLY ASKED QUESTIONS</Text>
          <View style={[styles.faqCard, Shadows.sm]}>
            {FAQ_ITEMS.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <View style={styles.faqDivider} />}
                <FAQItem question={item.question} answer={item.answer} />
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Menu Item ────────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  onPress: () => void;
}

function MenuItem({ icon, label, subtitle, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIconBg}>
          <Ionicons name={icon} size={20} color={Colors.primary} />
        </View>
        <View>
          <Text style={styles.menuItemLabel}>{label}</Text>
          <Text style={styles.menuItemSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="open-outline" size={16} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => setIsExpanded(!isExpanded)}
      activeOpacity={0.6}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textTertiary}
        />
      </View>
      {isExpanded && <Text style={styles.faqAnswer}>{answer}</Text>}
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
    paddingTop: Spacing.lg,
  },
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
  // Menu Card
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
  menuItemSubtitle: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.base + 36 + Spacing.md,
  },
  // FAQ
  faqCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  faqDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.base,
  },
  faqItem: {
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.base,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  faqAnswer: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.sm * Typography.relaxed,
    marginTop: Spacing.sm,
  },
});
