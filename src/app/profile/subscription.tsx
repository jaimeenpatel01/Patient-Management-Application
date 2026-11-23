import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSubscription } from '@/hooks/useSubscription';
import { useAlert } from '@/contexts/AlertContext';
import { useToast } from '@/contexts/ToastContext';
import {
  getActivePatientCount,
  getPaymentHistory,
  getPlans,
  submitPayment,
} from '@/services/subscriptionService';
import { getReadableError } from '@/lib/errorMessages';
import { validateUpiReference } from '@/lib/validators';
import { FEATURE_LABELS } from '@/lib/subscription';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ChipSelector } from '@/components/ui/ChipSelector';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import type { FeatureKey, SubscriptionPayment, SubscriptionPlan } from '@/types';

type Interval = 'monthly' | 'yearly';

const freeFeatures = (patientCap: number) => [
  `Up to ${patientCap} active patients`,
  'Attendance & consultations',
  'Diagnoses, treatments & exercise plans',
  'Payment tracking',
];

const PRO_FEATURES: FeatureKey[] = [
  'unlimited_patients',
  'business_reports',
  'export_data',
  'waitlist',
  'exercise_media',
  'gst_invoices',
  'calendar_export',
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const formatInr = (amount: number) => `₹${Number(amount).toLocaleString('en-IN')}`;

export default function SubscriptionScreen() {
  const { subscription, billingSettings, refreshSubscription, tier, isPro, isTrialing, daysLeft } = useSubscription();
  const {
    upi_id: upiId,
    upi_payee_name: upiPayeeName,
    verification_sla_text: verificationSlaText,
    free_patient_cap: freePatientCap,
  } = billingSettings;
  const { showAlert } = useAlert();
  const { showToast } = useToast();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [interval, setBillingInterval] = useState<Interval>('yearly');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [referenceError, setReferenceError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [plansRes, historyRes, countRes] = await Promise.all([
      getPlans(),
      getPaymentHistory(),
      getActivePatientCount(),
      refreshSubscription(),
    ]);
    if (plansRes.error) showToast(getReadableError(plansRes.error), 'error');
    setPlans(plansRes.data);
    setPayments(historyRes.data);
    setPatientCount(countRes.data);
    setIsLoading(false);
  }, [refreshSubscription, showToast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const monthlyPlan = plans.find((p) => p.tier === 'pro' && p.billing_interval === 'monthly');
  const yearlyPlan = plans.find((p) => p.tier === 'pro' && p.billing_interval === 'yearly');
  const selectedPlan = interval === 'monthly' ? monthlyPlan : yearlyPlan;
  const pendingPayment = payments.find((p) => p.status === 'pending');

  const yearlySaving = useMemo(() => {
    if (!monthlyPlan || !yearlyPlan) return null;
    const saving = monthlyPlan.price_inr * 12 - yearlyPlan.price_inr;
    return saving > 0 ? saving : null;
  }, [monthlyPlan, yearlyPlan]);

  const planTitle = isTrialing ? 'Pro Trial' : isPro ? 'Pro' : 'Free';
  const badgeStatus = isTrialing ? 'trialing' : isPro ? 'active' : subscription?.plan?.tier === 'pro' ? 'expired' : 'active';

  const statusLine = (() => {
    if (isTrialing && subscription?.trial_ends_at) {
      return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left · trial ends ${formatDate(subscription.trial_ends_at)}`;
    }
    if (isPro && subscription?.current_period_end) {
      return `Valid until ${formatDate(subscription.current_period_end)}`;
    }
    if (!isPro && subscription?.plan?.tier === 'pro') {
      return 'Your Pro access has ended. Renew to unlock Pro features again.';
    }
    return 'Core features, free forever.';
  })();

  const copyUpiId = async () => {
    await Clipboard.setStringAsync(upiId);
    showToast('UPI ID copied', 'success');
  };

  const openUpiApp = async () => {
    if (!selectedPlan) return;
    // Built by hand: React Native's URLSearchParams is only partially implemented.
    const query = Object.entries({
      pa: upiId,
      pn: upiPayeeName,
      am: Number(selectedPlan.price_inr).toFixed(2),
      cu: 'INR',
      tn: `PhysioDesk ${selectedPlan.name}`,
    })
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    try {
      await Linking.openURL(`upi://pay?${query}`);
    } catch {
      showAlert('No UPI app found', `Pay ${formatInr(selectedPlan.price_inr)} to ${upiId} from any UPI app, then enter the transaction ID below.`);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;
    const err = validateUpiReference(reference);
    setReferenceError(err ?? undefined);
    if (err) return;

    setIsSubmitting(true);
    const { error } = await submitPayment({
      planId: selectedPlan.id,
      amountInr: selectedPlan.price_inr,
      paymentReference: reference,
      payerNote: note,
    });
    setIsSubmitting(false);

    if (error) {
      showAlert('Submission Failed', getReadableError(error));
      return;
    }
    setReference('');
    setNote('');
    showAlert('Payment Submitted', `Thanks! We'll verify your payment and activate Pro ${verificationSlaText}.`);
    await load();
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={50}
      extraHeight={150}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Current plan */}
      <View style={[styles.card, Shadows.sm]}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardLabel}>CURRENT PLAN</Text>
          <StatusBadge status={badgeStatus} />
        </View>
        <Text style={styles.planTitle}>{planTitle}</Text>
        <Text style={styles.statusLine}>{statusLine}</Text>
        {tier === 'free' && patientCount !== null && (
          <View style={styles.usageRow}>
            <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.usageText}>
              {patientCount} / {freePatientCap} active patients
            </Text>
          </View>
        )}
      </View>

      {/* Plan comparison */}
      <Text style={styles.sectionTitle}>PLANS</Text>
      <View style={[styles.card, Shadows.sm]}>
        <Text style={styles.tierName}>Free</Text>
        {freeFeatures(freePatientCap).map((f) => (
          <FeatureRow key={f} label={f} />
        ))}
      </View>
      <View style={[styles.card, styles.proCard, Shadows.sm]}>
        <View style={styles.rowBetween}>
          <Text style={styles.tierName}>Pro</Text>
          {selectedPlan && (
            <Text style={styles.price}>
              {formatInr(selectedPlan.price_inr)}
              <Text style={styles.priceSuffix}>/{interval === 'monthly' ? 'month' : 'year'}</Text>
            </Text>
          )}
        </View>
        <Text style={styles.proSubtitle}>Everything in Free, plus:</Text>
        {PRO_FEATURES.map((key) => (
          <FeatureRow key={key} label={FEATURE_LABELS[key]} />
        ))}
        <View style={styles.intervalSelector}>
          <ChipSelector<Interval>
            options={[
              { label: 'Monthly', value: 'monthly' },
              { label: yearlySaving ? `Yearly · save ${formatInr(yearlySaving)}` : 'Yearly', value: 'yearly' },
            ]}
            value={interval}
            onChange={setBillingInterval}
          />
        </View>
      </View>

      {/* Payment */}
      {pendingPayment ? (
        <View style={[styles.card, styles.pendingCard, Shadows.sm]}>
          <View style={styles.usageRow}>
            <Ionicons name="hourglass-outline" size={18} color={Colors.warning} />
            <Text style={styles.pendingTitle}>Payment awaiting verification</Text>
          </View>
          <Text style={styles.statusLine}>
            {formatInr(pendingPayment.amount_inr)} · Ref {pendingPayment.payment_reference} · submitted{' '}
            {formatDate(pendingPayment.created_at)}. We&apos;ll activate your plan {verificationSlaText}.
          </Text>
        </View>
      ) : (
        selectedPlan && (
          <>
            <Text style={styles.sectionTitle}>{isPro && !isTrialing ? 'RENEW PRO' : 'UPGRADE TO PRO'}</Text>
            <View style={[styles.card, Shadows.sm]}>
              <Text style={styles.stepText}>
                1. Pay <Text style={styles.bold}>{formatInr(selectedPlan.price_inr)}</Text> via any UPI app to:
              </Text>
              <TouchableOpacity style={styles.upiBox} onPress={copyUpiId} activeOpacity={0.7}>
                <View>
                  <Text style={styles.upiId}>{upiId}</Text>
                  <Text style={styles.upiName}>{upiPayeeName}</Text>
                </View>
                <Ionicons name="copy-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <Button
                title="Pay with UPI app"
                variant="outline"
                onPress={openUpiApp}
                icon={<Ionicons name="phone-portrait-outline" size={18} color={Colors.primary} />}
              />

              <Text style={[styles.stepText, { marginTop: Spacing.lg }]}>
                2. Enter the transaction ID from your payment app:
              </Text>
              <View style={styles.exampleBox}>
                <Image
                  source={require('@/assets/images/upi.jpeg')}
                  style={styles.exampleImage}
                  contentFit="cover"
                  contentPosition="top"
                  accessibilityLabel="Example UPI receipt with the Transaction ID and UTR highlighted"
                />
                <Text style={styles.exampleCaption}>
                  Find it on the payment receipt. Either the Transaction ID or the UTR works.
                </Text>
              </View>
              <Input
                label="Transaction ID/UTR"
                leftIcon="receipt-outline"
                value={reference}
                onChangeText={(t) => {
                  setReference(t.replace(/[^A-Za-z0-9]/g, ''));
                  if (referenceError) setReferenceError(undefined);
                }}
                placeholder="e.g. 412345678901"
                autoCapitalize="characters"
                maxLength={30}
                error={referenceError}
              />
              <Input
                label="Note (optional)"
                leftIcon="chatbubble-outline"
                value={note}
                onChangeText={setNote}
                placeholder="Anything we should know"
                multiline
                numberOfLines={2}
              />
              <Button title="I've Paid — Submit" onPress={handleSubmit} loading={isSubmitting} />
            </View>
          </>
        )
      )}

      {/* History */}
      {payments.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>PAYMENT HISTORY</Text>
          <View style={[styles.card, Shadows.sm, { paddingVertical: Spacing.xs }]}>
            {payments.map((p, i) => (
              <View key={p.id} style={[styles.historyRow, i > 0 && styles.historyDivider]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyAmount}>
                    {formatInr(p.amount_inr)} · {plans.find((pl) => pl.id === p.plan_id)?.name ?? p.plan_id}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {formatDate(p.created_at)} · Ref {p.payment_reference}
                  </Text>
                  {p.status === 'rejected' && p.rejection_reason && (
                    <Text style={styles.rejection}>{p.rejection_reason}</Text>
                  )}
                </View>
                <StatusBadge status={p.status} />
              </View>
            ))}
          </View>
        </>
      )}
    </KeyboardAwareScrollView>
  );
}

function FeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  exampleBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceSecondary,
  },
  // Crops the receipt screenshot to its top half, where both IDs are highlighted.
  exampleImage: { width: '100%', aspectRatio: 591 / 620 },
  exampleCaption: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    padding: Spacing.sm,
    textAlign: 'center',
  },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  proCard: { borderWidth: 1.5, borderColor: Colors.primary },
  pendingCard: { borderWidth: 1, borderColor: Colors.warning },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textTertiary, letterSpacing: 1.2 },
  planTitle: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.text, marginTop: Spacing.sm },
  statusLine: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: Spacing.xs, lineHeight: Typography.sm * Typography.normal },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  usageText: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary },
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  tierName: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.text, marginBottom: Spacing.sm },
  price: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.primary },
  priceSuffix: { fontSize: Typography.sm, fontWeight: Typography.regular, color: Colors.textSecondary },
  proSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  featureText: { fontSize: Typography.sm, color: Colors.text },
  intervalSelector: { marginTop: Spacing.md },
  pendingTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.text },
  stepText: { fontSize: Typography.sm, color: Colors.text, marginBottom: Spacing.sm },
  bold: { fontWeight: Typography.bold },
  upiBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryFaded,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  upiId: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.primaryDark },
  upiName: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  historyDivider: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  historyAmount: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.text },
  historyMeta: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  rejection: { fontSize: Typography.xs, color: Colors.error, marginTop: Spacing.xs },
});
