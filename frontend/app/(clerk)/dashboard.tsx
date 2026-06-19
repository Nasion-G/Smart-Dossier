import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { cases } from '../api/services';
import {
  Colors, Typography, Spacing, BorderRadius,
  PHASE_LABELS, BOTTLENECK_PHASES,
} from '../constants/design';
import { useAuthStore } from '../hooks/useAuthStore';
import type { Case } from '../types';

export default function DashboardScreen() {
  const user = useAuthStore(s => s.user);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: cases.stats,
    refetchInterval: 60_000,
  });

  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['cases'],
    queryFn: () => cases.list(),
    refetchInterval: 30_000,
  });

  const blocked = items.filter(c => c.is_blocked);

  return (
    <View style={styles.root}>
      {/* Navy header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Dashboard</Text>
          <Text style={styles.headerName}>
            Welcome, {user?.full_name.split(' ')[0]}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>CLERK</Text>
      </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.secondary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard label="TOTAL ACTIVE CASES" value={statsLoading ? '—' : String(stats?.total_active ?? items.length)} />
          <StatCard label="AVERAGE CYCLE TIME" value={statsLoading ? '—' : `${stats?.avg_cycle_days ?? '—'}d`} />
          <StatCard label="HIGH LATENCY 14d+" value={statsLoading ? '—' : String(stats?.high_latency_count ?? blocked.length)} urgent />
          <StatCard label="COMPLETION RATE" value={statsLoading ? '—' : `${stats?.completion_rate ?? '—'}%`} />
        </View>

        {/* Alert */}
        {blocked.length > 0 && (
          <View style={styles.alert}>
            <Text style={styles.alertTitle}>⚠  {blocked.length} cases with critical delays</Text>
            <Text style={styles.alertSub}>Phases 3 and 6 are the main bottlenecks.</Text>
          </View>
        )}

        {/* Cases by phase */}
        <Text style={styles.sectionTitle}>Cases by Phase</Text>

        {isLoading ? (
          <ActivityIndicator color={Colors.secondary} style={{ marginTop: 32 }} />
        ) : (
          [1, 2, 3, 4, 5, 6, 7].map(phase => {
            const phaseCases = items.filter(c => c.current_phase === phase);
            const isBottleneck = BOTTLENECK_PHASES.includes(phase);
            return (
              <View key={phase} style={styles.phaseGroup}>
                <View style={styles.phaseHeader}>
                  <Text style={[styles.phaseLabel, isBottleneck && styles.phaseLabelWarn]}>
                    F{phase} — {PHASE_LABELS[phase]}
                  </Text>
                  <View style={[styles.phaseCount, isBottleneck && styles.phaseCountWarn]}>
                    <Text style={[styles.phaseCountText, isBottleneck && styles.phaseCountTextWarn]}>
                      {phaseCases.length}
                    </Text>
                  </View>
                </View>
                {phaseCases.slice(0, 3).map(c => (
                  <CaseRow key={c.id} dosja={c} />
                ))}
                {phaseCases.length > 3 && (
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => router.push({ pathname: '/(clerk)/cases', params: { phase: String(phase) } })}
                  >
                    <Text style={styles.moreBtnText}>+{phaseCases.length - 3} more →</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, urgent }: { label: string; value: string; urgent?: boolean }) {
  const icon = label.startsWith('TOTAL') ? '⊞' : label.startsWith('AVERAGE') ? '◎' : label.startsWith('HIGH') ? '⚠' : '✓';
  return (
    <View style={[styles.statCard, urgent && styles.statCardUrgent]}>
      <View style={[styles.statIconBox, urgent && styles.statIconBoxUrgent]}>
        <Text style={[styles.statIcon, urgent && styles.statIconUrgent]}>{icon}</Text>
      </View>
      <View style={styles.statInfo}>
        <Text style={[styles.statLabel, urgent && styles.statLabelUrgent]}>{label}</Text>
        <Text style={[styles.statValue, urgent && styles.statValueUrgent]}>{value}</Text>
      </View>
    </View>
  );
}
function CaseRow({ dosja }: { dosja: Case }) {
  return (
    <TouchableOpacity
      style={[styles.caseRow, dosja.is_blocked && styles.caseRowBlocked]}
      onPress={() => router.push({ pathname: '/(clerk)/case-detail', params: { id: dosja.id } })}
      activeOpacity={0.75}
    >
      <View style={styles.caseLeft}>
        <Text style={styles.caseCode}>{dosja.code}</Text>
        <Text style={styles.caseTitle} numberOfLines={1}>{dosja.title}</Text>
      </View>
      <View style={styles.caseRight}>
        {dosja.is_blocked && (
          <View style={styles.blockedChip}>
            <Text style={styles.blockedChipText}>BLOCKED</Text>
          </View>
        )}
        <Text style={[styles.days, dosja.is_blocked && styles.daysUrgent]}>
          {dosja.days_in_phase}d
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.select({ ios: 60, default: 48 }),
    paddingBottom: 20,
    paddingHorizontal: Spacing.marginPage,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLabel: { ...Typography.labelCaps, color: Colors.onPrimaryContainer, marginBottom: 4 },
  headerName: { ...Typography.headlineMdMobile, color: Colors.onPrimary },
  badge: { backgroundColor: Colors.primaryContainer, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
  badgeText: { ...Typography.labelCaps, color: Colors.inversePrimary },
  scroll: { flex: 1 },
  content: { padding: Spacing.marginPage, gap: Spacing.stackMd, paddingBottom: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.lg, padding: 12, borderWidth: 1, borderColor: Colors.outlineVariant, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statCardUrgent: { borderColor: Colors.error, borderWidth: 1.5 },
  statIconBox: { width: 40, height: 40, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  statIconBoxUrgent: { backgroundColor: Colors.errorContainer },
  statIcon: { fontSize: 18, color: Colors.onSurfaceVariant },
  statIconUrgent: { color: Colors.error },
  statInfo: { flex: 1 },
  statLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, marginBottom: 2, fontSize: 9 },
  statLabelUrgent: { color: Colors.error },
  statValue: { ...Typography.headlineMd, color: Colors.onSurface, fontSize: 20 },
  statValueUrgent: { color: Colors.error },
  alert: { backgroundColor: Colors.statusInReviewBg, borderLeftWidth: 4, borderLeftColor: Colors.statusInReview, borderRadius: BorderRadius.md, padding: 14, gap: 4 },
  alertTitle: { ...Typography.bodySm, color: Colors.statusInReview, fontFamily: 'Inter_600SemiBold' },
  alertSub: { ...Typography.bodySm, color: Colors.onSurfaceVariant, fontSize: 12 },
  sectionTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  phaseGroup: { gap: 6 },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  phaseLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, flex: 1 },
  phaseLabelWarn: { color: Colors.statusInReview },
  phaseCount: { backgroundColor: Colors.surfaceContainerHigh, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  phaseCountWarn: { backgroundColor: Colors.statusInReviewBg },
  phaseCountText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 9 },
  phaseCountTextWarn: { color: Colors.statusInReview },
  caseRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.lg, padding: 14, borderWidth: 1, borderColor: Colors.outlineVariant },
  caseRowBlocked: { borderColor: Colors.error, borderWidth: 1.5 },
  caseLeft: { flex: 1, gap: 3 },
  caseCode: { ...Typography.labelCaps, color: Colors.secondary, fontSize: 9 },
  caseTitle: { ...Typography.bodySm, color: Colors.onSurface },
  caseRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blockedChip: { backgroundColor: Colors.statusBlockedBg, borderRadius: BorderRadius.sm, paddingHorizontal: 6, paddingVertical: 3 },
  blockedChipText: { ...Typography.labelCaps, color: Colors.statusBlocked, fontSize: 8 },
  days: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  daysUrgent: { color: Colors.error },
  moreBtn: { alignItems: 'center', paddingVertical: 8 },
  moreBtnText: { ...Typography.bodySm, color: Colors.secondary, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});

import { Platform } from 'react-native';
