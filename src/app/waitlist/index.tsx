import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getWaitlist, updateWaitlistStatus, deleteWaitlistEntry } from '@/services/waitlistService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchFilter } from '@/components/ui/SearchFilter';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { useAlert } from '@/contexts/AlertContext';
import { getInitials } from '@/lib/formatters';
import type { WaitlistEntry, WaitlistStatus } from '@/types';

type FilterValue = WaitlistStatus | 'all';

const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: 'Waiting', value: 'waiting' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'All', value: 'all' },
];

const STATUS_COLORS: Record<WaitlistStatus, { main: string; faded: string }> = {
  waiting: { main: Colors.warning, faded: Colors.warningLight },
  contacted: { main: Colors.primary, faded: Colors.primaryFaded },
  scheduled: { main: Colors.info, faded: Colors.infoLight },
  cancelled: { main: Colors.textTertiary, faded: Colors.surfaceSecondary },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDate(date: string | null): string | null {
  if (!date) return null;
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return date;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export default function WaitlistScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();

  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterValue>('waiting');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const loadWaitlist = useCallback(async () => {
    setError(null);
    const result = await getWaitlist('all');
    if (result.error) {
      setError(result.error);
    }
    setEntries(result.data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadWaitlist().finally(() => setIsLoading(false));
    }, [loadWaitlist])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadWaitlist();
    setIsRefreshing(false);
  };

  const counts = useMemo(() => {
    const c: Record<FilterValue, number> = { all: entries.length, waiting: 0, contacted: 0, scheduled: 0, cancelled: 0 };
    entries.forEach((e) => { c[e.status] += 1; });
    return c;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => (filterStatus === 'all' ? true : e.status === filterStatus))
      .filter((e) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          e.patient?.full_name?.toLowerCase().includes(q) ||
          e.patient?.phone?.toLowerCase().includes(q)
        );
      });
  }, [entries, filterStatus, searchQuery]);

  const activeEntry = entries.find((e) => e.id === activeActionId) ?? null;

  const handleStatusChange = async (id: string, status: WaitlistStatus) => {
    setActiveActionId(null);
    const { error: updateError } = await updateWaitlistStatus(id, status);
    if (updateError) {
      showAlert('Error', updateError);
    } else {
      loadWaitlist();
    }
  };

  const handleDelete = (id: string) => {
    setActiveActionId(null);
    showAlert('Remove from Waitlist', 'Are you sure you want to remove this entry from the waitlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error: delError } = await deleteWaitlistEntry(id);
          if (delError) {
            showAlert('Error', delError);
          } else {
            loadWaitlist();
          }
        },
      },
    ]);
  };

  const menuOptions = useMemo(() => {
    if (!activeEntry) return [];
    const statusOptions: { status: WaitlistStatus; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
      { status: 'contacted', label: 'Mark Contacted', icon: 'call', color: Colors.primary },
      { status: 'scheduled', label: 'Mark Scheduled', icon: 'checkmark-circle', color: Colors.info },
      { status: 'waiting', label: 'Move Back to Waiting', icon: 'hourglass', color: Colors.warning },
      { status: 'cancelled', label: 'Cancel Entry', icon: 'close-circle', color: Colors.textSecondary },
    ];
    return [
      ...statusOptions
        .filter((o) => o.status !== activeEntry.status)
        .map((o) => ({
          label: o.label,
          icon: o.icon,
          color: o.color,
          onPress: () => handleStatusChange(activeEntry.id, o.status),
        })),
      {
        label: 'Remove',
        icon: 'trash' as const,
        color: Colors.error,
        onPress: () => handleDelete(activeEntry.id),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntry]);

  const renderCard = useCallback(({ item }: { item: WaitlistEntry }) => {
    const statusColor = STATUS_COLORS[item.status] ?? STATUS_COLORS.waiting;
    const isCancelled = item.status === 'cancelled';
    return (
      <TouchableOpacity
        style={[styles.card, Shadows.md, isCancelled && styles.cardMuted]}
        onPress={() => setActiveActionId(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.cardAccent, { backgroundColor: statusColor.main }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: statusColor.faded }]}>
              <Text style={[styles.avatarText, { color: statusColor.main }]}>
                {getInitials(item.patient?.full_name || '?')}
              </Text>
            </View>
            <View style={styles.entryInfo}>
              <Text style={styles.entryName} numberOfLines={1}>
                {item.patient?.full_name || 'Unknown Patient'}
              </Text>
              {item.patient?.phone ? (
                <View style={styles.metaRow}>
                  <Ionicons name="call-outline" size={13} color={Colors.textTertiary} />
                  <Text style={styles.metaText}>{item.patient.phone}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => setActiveActionId(item.id)}
              style={styles.moreBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <StatusBadge status={item.status} />
            <View style={styles.footerMeta}>
              {item.requested_date ? (
                <View style={styles.dateChip}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.primary} />
                  <Text style={styles.dateChipText}>{formatShortDate(item.requested_date)}</Text>
                </View>
              ) : (
                <Text style={styles.addedText}>Added {formatShortDate(item.created_at)}</Text>
              )}
            </View>
          </View>

          {item.notes ? (
            <View style={styles.notesContainer}>
              <Ionicons name="document-text-outline" size={14} color={Colors.textTertiary} style={styles.notesIcon} />
              <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }, []);

  if (isLoading && entries.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const hasSearch = searchQuery.trim().length > 0;
  const activeLabel = FILTER_OPTIONS.find((o) => o.value === filterStatus)?.label.toLowerCase();

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SearchFilter
          placeholder="Search by name or phone"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filterStatus === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setFilterStatus(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{opt.label}</Text>
                <View style={[styles.tabCount, isActive && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>
                    {counts[opt.value]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {filteredEntries.length === 0 && !isLoading ? (
        <EmptyState
          icon={hasSearch ? 'search-outline' : 'hourglass-outline'}
          title={hasSearch ? 'No Matches' : entries.length === 0 ? 'Waitlist is Empty' : `No ${FILTER_OPTIONS.find((o) => o.value === filterStatus)?.label} Entries`}
          subtitle={
            hasSearch
              ? 'No waitlist entries match your search.'
              : entries.length === 0
                ? 'Add a patient to the waitlist when you cannot schedule them right away.'
                : `There are no ${activeLabel} patients right now.`
          }
          actionLabel={!hasSearch && entries.length === 0 ? 'Add to Waitlist' : undefined}
          onAction={!hasSearch && entries.length === 0 ? () => router.push('/waitlist/add' as any) : undefined}
        />
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.countText}>
              {filteredEntries.length} {filteredEntries.length !== 1 ? 'patients' : 'patient'}
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      <ActionMenu
        visible={!!activeActionId}
        onClose={() => setActiveActionId(null)}
        title={activeEntry?.patient?.full_name}
        options={menuOptions}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/waitlist/add' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color={Colors.textInverse} />
        <Text style={styles.fabText}>Add to Waitlist</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  headerContainer: {
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingHorizontal: Spacing.base,
  },
  tabsRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    gap: Spacing.xs + 2,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textInverse,
    fontWeight: Typography.semibold,
  },
  tabCount: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabCountText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
  },
  tabCountTextActive: {
    color: Colors.textInverse,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.sm,
    color: Colors.error,
    flex: 1,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['6xl'],
  },
  countText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardMuted: {
    opacity: 0.7,
  },
  cardAccent: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  entryInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  entryName: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  moreBtn: {
    padding: Spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  footerMeta: {
    flexShrink: 1,
    marginLeft: Spacing.sm,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryFaded,
  },
  dateChipText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  addedText: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
  },
  notesIcon: {
    marginTop: 2,
    marginRight: Spacing.xs + 2,
  },
  notesText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    height: 56,
    borderRadius: 28,
    ...Shadows.xl,
  },
  fabText: {
    color: Colors.textInverse,
    fontWeight: Typography.bold,
    marginLeft: Spacing.xs,
    fontSize: Typography.base,
  },
});
