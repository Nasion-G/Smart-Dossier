import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing, PHASE_LABELS, BOTTLENECK_PHASES } from '../constants/design';

// ─── StatusChip ───────────────────────────────────────────────────────────

type StatusType = 'completed' | 'active' | 'blocked' | 'ontrack' | 'review';

const STATUS_CONFIG: Record<StatusType, { label: string; bg: string; fg: string }> = {
  completed: { label: '✓ Completed',  bg: Colors.statusCompletedBg, fg: Colors.statusCompleted },
  active:    { label: '● Active',       bg: Colors.statusOnTrackBg,  fg: Colors.statusOnTrack },
  blocked:   { label: '✕ Blocked',    bg: Colors.statusBlockedBg,  fg: Colors.statusBlocked },
  ontrack:   { label: '● On Track',  bg: Colors.statusOnTrackBg,  fg: Colors.statusOnTrack },
  review:    { label: '⚠ In Review', bg: Colors.statusInReviewBg, fg: Colors.statusInReview },
};

export function StatusChip({ type }: { type: StatusType }) {
  const cfg = STATUS_CONFIG[type];
  return (
    <View style={[s.chip, { backgroundColor: cfg.bg }]}>
      <Text style={[s.chipText, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── PhaseStrip ───────────────────────────────────────────────────────────

export function PhaseStrip({ current }: { current: number }) {
  return (
    <View style={s.phaseStrip}>
      {[1, 2, 3, 4, 5, 6, 7].map(p => {
        const isDone   = p < current;
        const isActive = p === current;
        const isWarn   = BOTTLENECK_PHASES.includes(p) && isActive;
        return (
          <View
            key={p}
            style={[
              s.phaseNode,
              isDone   && s.phaseNodeDone,
              isActive && s.phaseNodeActive,
              isWarn   && s.phaseNodeWarn,
            ]}
          >
            <Text style={[s.phaseNodeText, (isDone || isActive) && s.phaseNodeTextDone]}>
              {isDone ? '✓' : String(p)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export function PageHeader({ title, subtitle, onBack, rightElement }: PageHeaderProps) {
  return (
    <View style={s.pageHeader}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
      )}
      <View style={s.pageHeaderInfo}>
        {subtitle && <Text style={s.pageHeaderSub}>{subtitle}</Text>}
        <Text style={s.pageHeaderTitle}>{title}</Text>
      </View>
      {rightElement}
    </View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────

export function EmptyState({ icon = '📂', title, body }: { icon?: string; title: string; body?: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>{icon}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {body && <Text style={s.emptyBody}>{body}</Text>}
    </View>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────

export function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.infoRow, last && s.infoRowLast]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────

export function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={[s.sectionCard, style]}>
      {children}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  chip: { alignSelf: 'flex-start', borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { ...Typography.labelCaps, fontSize: 9 },

  phaseStrip: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primaryContainer, paddingVertical: 14, paddingHorizontal: Spacing.marginPage, gap: 4 },
  phaseNode: { width: 28, height: 28, borderRadius: BorderRadius.full, backgroundColor: Colors.primary, borderWidth: 1, borderColor: Colors.onPrimaryContainer, alignItems: 'center', justifyContent: 'center' },
  phaseNodeDone: { backgroundColor: Colors.statusCompleted, borderColor: Colors.statusCompleted },
  phaseNodeActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary, width: 32, height: 32 },
  phaseNodeWarn: { backgroundColor: Colors.statusInReview, borderColor: Colors.statusInReview },
  phaseNodeText: { ...Typography.labelCaps, color: Colors.onPrimaryContainer, fontSize: 9 },
  phaseNodeTextDone: { color: Colors.onPrimary },

  pageHeader: { backgroundColor: Colors.primary, paddingTop: Platform.select({ ios: 60, default: 48 }), paddingBottom: 16, paddingHorizontal: Spacing.marginPage, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  backBtn: { paddingBottom: 2 },
  backArrow: { color: Colors.inversePrimary, fontSize: 22 },
  pageHeaderInfo: { flex: 1 },
  pageHeaderSub: { ...Typography.labelCaps, color: Colors.inversePrimary, marginBottom: 3 },
  pageHeaderTitle: { ...Typography.headlineMdMobile, color: Colors.onPrimary },

  empty: { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { ...Typography.headlineSm, color: Colors.onSurface, textAlign: 'center' },
  emptyBody: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 24 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  infoValue: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'Inter_600SemiBold', flex: 1, textAlign: 'right', marginLeft: 12 },

  sectionCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.xl, padding: Spacing.paddingCard, borderWidth: 1, borderColor: Colors.outlineVariant },
});
