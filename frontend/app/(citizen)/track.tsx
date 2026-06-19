import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { cases } from '../api/services';
import { Colors, Typography, Spacing, BorderRadius, PHASE_LABELS, PHASE_DESCRIPTIONS, BOTTLENECK_PHASES } from '../constants/design';
import { useAuthStore } from '../hooks/useAuthStore';
import type { Case } from '../types';

export default function CitizenTrackScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['mine'],
    queryFn: () => cases.mine(),
  });

  const activeCase = items[0]; // Citizens typically have one case

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>YOUR CASE STATUS</Text>
          <Text style={styles.headerName}>{user?.full_name}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.logoutBtn} onPress={logout}>Logout</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={Colors.secondary} size="large" />
      ) : !activeCase ? (
        <EmptyState />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <CaseHeader dosja={activeCase} />
          <Timeline dosja={activeCase} />
          <InfoSection dosja={activeCase} />
        </ScrollView>
      )}
    </View>
  );
}

function CaseHeader({ dosja }: { dosja: Case }) {
  const isCompleted = dosja.status === 'completed';
  const isBlocked = dosja.is_blocked;

  return (
    <View style={styles.caseHeader}>
      <Text style={styles.caseCode}>{dosja.code}</Text>
      <Text style={styles.caseTitle}>{dosja.title}</Text>
      <View style={[
        styles.statusChip,
        isCompleted && styles.statusChipDone,
        isBlocked && styles.statusChipBlocked,
      ]}>
        <Text style={[
          styles.statusChipText,
          isCompleted && styles.statusChipTextDone,
          isBlocked && styles.statusChipTextBlocked,
        ]}>
          {isCompleted ? '✓ Completed' : isBlocked ? '⚠ Awaiting Action' : '● In Progress'}
        </Text>
      </View>
    </View>
  );
}

function Timeline({ dosja }: { dosja: Case }) {
  const currentPhase = dosja.current_phase;

  return (
    <View style={styles.timelineSection}>
      <Text style={styles.sectionTitle}>Process Steps</Text>
      {[1,2,3,4,5,6,7].map((phase) => {
        const isDone = phase < currentPhase;
        const isActive = phase === currentPhase;
        const isPending = phase > currentPhase;
        const isBottleneck = BOTTLENECK_PHASES.includes(phase) && isActive;

        return (
          <View key={phase} style={styles.timelineRow}>
            {/* Connector line (not on last item) */}
            {phase < 7 && (
              <View style={[styles.connector, isDone && styles.connectorDone]} />
            )}

            {/* Node */}
            <View style={[
              styles.node,
              isDone && styles.nodeDone,
              isActive && styles.nodeActive,
              isBottleneck && styles.nodeBottleneck,
            ]}>
              {isDone
                ? <Text style={styles.nodeCheck}>✓</Text>
                : <Text style={[styles.nodeNum, isActive && styles.nodeNumActive]}>{phase}</Text>
              }
            </View>

            {/* Content */}
            <View style={[styles.stepContent, isPending && styles.stepContentPending]}>
              <Text style={[
                styles.stepLabel,
                isDone && styles.stepLabelDone,
                isActive && styles.stepLabelActive,
                isPending && styles.stepLabelPending,
              ]}>
                {PHASE_LABELS[phase]}
              </Text>
              {isActive && (
                <>
                  <Text style={styles.stepDesc}>{PHASE_DESCRIPTIONS[phase]}</Text>
                  <Text style={styles.stepDays}>{dosja.days_in_phase} days in this phase</Text>
                  {isBottleneck && (
                    <Text style={styles.stepBottleneck}>
                      This phase typically takes {phase === 3 ? '2–4 weeks' : '4–8 weeks'} for verification.
                    </Text>
                  )}
                </>
              )}
              {isDone && (
                <Text style={styles.stepDone}>Completed</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function InfoSection({ dosja }: { dosja: Case }) {
  return (
    <View style={styles.infoSection}>
      <Text style={styles.sectionTitle}>Case Details</Text>
      {dosja.property_id && <InfoRow label="Property ID" value={dosja.property_id} />}
      {dosja.zone && <InfoRow label="Zone" value={dosja.zone} />}
      <InfoRow
        label="Application Date"
        value={new Date(dosja.created_at).toLocaleDateString('en-GB')}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📂</Text>
      <Text style={styles.emptyTitle}>No Active Case</Text>
      <Text style={styles.emptyBody}>
        Your case has not been registered yet. Contact the EKB office to start the application.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: Spacing.marginPage,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLabel: { ...Typography.labelCaps, color: Colors.onPrimaryContainer, marginBottom: 4 },
  headerName: { ...Typography.headlineMdMobile, color: Colors.onPrimary },
  headerRight: { justifyContent: 'flex-end', paddingBottom: 2 },
  logoutBtn: { ...Typography.bodySm, color: Colors.inversePrimary },
  content: { padding: Spacing.marginPage, gap: Spacing.stackLg, paddingBottom: 48 },
  caseHeader: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.paddingCard,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  caseCode: { ...Typography.labelCaps, color: Colors.secondary },
  caseTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  statusChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.statusOnTrackBg,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusChipDone: { backgroundColor: Colors.statusCompletedBg },
  statusChipBlocked: { backgroundColor: Colors.statusInReviewBg },
  statusChipText: { ...Typography.labelCaps, color: Colors.statusOnTrack },
  statusChipTextDone: { color: Colors.statusCompleted },
  statusChipTextBlocked: { color: Colors.statusInReview },
  timelineSection: { gap: 0 },
  sectionTitle: { ...Typography.headlineSm, color: Colors.onSurface, marginBottom: 16 },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
    minHeight: 56,
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    left: 17,
    top: 38,
    bottom: -10,
    width: 2,
    backgroundColor: Colors.outlineVariant,
    zIndex: 0,
  },
  connectorDone: { backgroundColor: Colors.statusCompleted },
  node: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    flexShrink: 0,
    marginTop: 2,
  },
  nodeDone: { backgroundColor: Colors.statusCompleted, borderColor: Colors.statusCompleted },
  nodeActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary, width: 38, height: 38 },
  nodeBottleneck: { backgroundColor: Colors.statusInReview, borderColor: Colors.statusInReview },
  nodeCheck: { color: Colors.onPrimary, fontSize: 16, fontWeight: '700' },
  nodeNum: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 13 },
  nodeNumActive: { color: Colors.onPrimary },
  stepContent: { flex: 1, paddingBottom: 20, paddingTop: 4 },
  stepContentPending: { opacity: 0.4 },
  stepLabel: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'Inter_600SemiBold' },
  stepLabelDone: { color: Colors.statusCompleted },
  stepLabelActive: { color: Colors.secondary, fontSize: 15 },
  stepLabelPending: { color: Colors.onSurfaceVariant },
  stepDesc: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },
  stepDays: { ...Typography.labelCaps, color: Colors.secondary, marginTop: 4 },
  stepBottleneck: { ...Typography.bodySm, color: Colors.statusInReview, marginTop: 4, fontStyle: 'italic' },
  stepDone: { ...Typography.labelCaps, color: Colors.statusCompleted, marginTop: 2 },
  infoSection: { gap: 0 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  infoLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  infoValue: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'Inter_600SemiBold' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, gap: 16 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...Typography.headlineSm, color: Colors.onSurface, textAlign: 'center' },
  emptyBody: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 24 },
});
