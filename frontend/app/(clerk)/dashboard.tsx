import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { cases } from "../api/services";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  PHASE_LABELS,
  PHASE_DESCRIPTIONS,
  BOTTLENECK_PHASES,
} from "../constants/design";
import { useAuthStore } from "../hooks/useAuthStore";

// ── Dynamic subtitle ────────────────────────────────────────────────────────
function getDynamicSubtitle(
  blockedCount: number,
  totalActive: number,
  completionRate: number,
  avgCycleDays: number,
): string {
  if (totalActive === 0) {
    const pool = [
      "No active cases yet — ready for the first submission.",
      "The queue is empty. Add a new case to get started.",
      "Nothing in progress right now. Waiting for new cases.",
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  let pool: string[] = [];

  if (blockedCount > 0) {
    pool = [
      `${blockedCount} case${blockedCount !== 1 ? "s" : ""} need attention — the rest of the pipeline is moving.`,
      `Watch out: ${blockedCount} stuck case${blockedCount !== 1 ? "s" : ""} out of ${totalActive} active. Time to follow up.`,
      `The pipeline has a jam — ${blockedCount} case${blockedCount !== 1 ? "s" : ""} haven't moved in too long.`,
      `${blockedCount} red flag${blockedCount !== 1 ? "s" : ""} in the queue. Everything else is on track.`,
    ];
  } else {
    pool = [
      `Clean slate: ${totalActive} case${totalActive !== 1 ? "s" : ""} in progress, none blocked.`,
      `All ${totalActive} active case${totalActive !== 1 ? "s" : ""} are moving — nothing is stuck right now.`,
      `The pipeline looks healthy. ${totalActive} case${totalActive !== 1 ? "s" : ""} in flight, zero delays.`,
      `No bottlenecks today — ${totalActive} active case${totalActive !== 1 ? "s" : ""} all progressing normally.`,
    ];
  }

  if (avgCycleDays > 0 && avgCycleDays <= 30) {
    pool.push(
      `Good velocity: an average cycle of ${avgCycleDays} days across ${totalActive} active cases.`,
    );
    pool.push(
      `Cases are closing in ${avgCycleDays} days on average — ahead of schedule.`,
    );
  } else if (avgCycleDays > 60) {
    pool.push(
      `Cycle times are running long at ${avgCycleDays} days average — worth reviewing phases 3 and 6.`,
    );
    pool.push(
      `Average turnaround is ${avgCycleDays} days. The known bottlenecks may be adding up.`,
    );
  }

  if (completionRate >= 70) {
    pool.push(
      `${Math.round(completionRate)}% of cases have reached registration — strong throughput overall.`,
    );
  } else if (completionRate > 0 && completionRate < 30) {
    pool.push(
      `${Math.round(completionRate)}% completion rate. Most cases are still in progress.`,
    );
    pool.push(
      `Only ${Math.round(completionRate)}% of cases have completed so far — the pipeline still has room to clear.`,
    );
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: cases.stats,
    refetchInterval: 60_000,
  });

  const {
    data: items = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["cases"],
    queryFn: () => cases.list(),
    refetchInterval: 30_000,
  });

  const blocked = items.filter((c) => c.is_blocked);
  const blockedCount = statsLoading
    ? blocked.length
    : (stats?.high_latency_count ?? blocked.length);
  const casesByPhase =
    stats?.cases_by_phase ??
    items.reduce<Record<number, number>>((acc, c) => {
      acc[c.current_phase] = (acc[c.current_phase] || 0) + 1;
      return acc;
    }, {});
  const totalCases = [1, 2, 3, 4, 5, 6, 7].reduce(
    (sum, p) => sum + (casesByPhase[p] || 0),
    0,
  );

  // ── Dynamic subtitle — recalculates when data changes ────────────────────
  const dynamicSubtitle = React.useMemo(
    () =>
      getDynamicSubtitle(
        blockedCount,
        stats?.total_active ?? items.length,
        stats?.completion_rate ?? 0,
        stats?.avg_cycle_days ?? 0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      blockedCount,
      stats?.total_active,
      stats?.completion_rate,
      stats?.avg_cycle_days,
    ],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.secondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <Text style={styles.kicker}>EKB PRIVATIZATION · 7 PHASES</Text>
            <Text style={styles.pageTitle}>Registry Overview</Text>
            {/* ── Dynamic subtitle replaces static string ── */}
            <Text style={styles.pageSub}>{dynamicSubtitle}</Text>
          </View>
          <TouchableOpacity
            style={styles.kanbanBtn}
            onPress={() => router.push("./kanban")}
            activeOpacity={0.85}
          >
            <Text style={styles.kanbanBtnIcon}>▦</Text>
            <Text style={styles.kanbanBtnText}>Open Kanban</Text>
          </TouchableOpacity>
        </View>

        {/* Pipeline ribbon */}
        <View style={styles.ribbonCard}>
          <View style={styles.ribbonHeaderRow}>
            <Text style={styles.ribbonTitle}>Pipeline at a glance</Text>
            <Text style={styles.ribbonTotal}>{totalCases} cases</Text>
          </View>
          <View style={styles.ribbon}>
            {totalCases === 0 ? (
              <View
                style={[
                  styles.ribbonSeg,
                  styles.ribbonSegEmpty,
                  { flexGrow: 1 },
                ]}
              />
            ) : (
              [1, 2, 3, 4, 5, 6, 7].map((phase) => {
                const count = casesByPhase[phase] || 0;
                if (count === 0) return null;
                const isBottleneck = BOTTLENECK_PHASES.includes(phase);
                const isCompleted = phase === 7;
                return (
                  <View
                    key={phase}
                    style={[
                      styles.ribbonSeg,
                      { flexGrow: count, flexBasis: 0 },
                      isBottleneck && styles.ribbonSegWarn,
                      isCompleted && styles.ribbonSegDone,
                    ]}
                  />
                );
              })
            )}
          </View>
          <View style={styles.ribbonLegendRow}>
            <LegendDot color={Colors.secondary} label="On track" />
            <LegendDot color={Colors.statusInReview} label="Bottleneck phase" />
            <LegendDot color={Colors.statusCompleted} label="Registered" />
          </View>
        </View>

        {/* Urgent / all-clear card */}
        {blocked.length > 0 ? (
          <TouchableOpacity
            style={styles.urgentCard}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/(clerk)/cases",
                params: { blocked: "1" },
              })
            }
          >
            <View style={styles.urgentTop}>
              <View style={styles.urgentIconBox}>
                <Text style={styles.urgentIcon}>⚠</Text>
              </View>
              <View style={styles.urgentNumWrap}>
                <Text style={styles.urgentNum}>{blockedCount}</Text>
                <Text style={styles.urgentNumLabel}>
                  {blockedCount === 1
                    ? "case is worth a look today"
                    : "cases are worth a look today"}
                </Text>
              </View>
              <Text style={styles.urgentChevron}>›</Text>
            </View>
            <Text style={styles.urgentDetail}>
              Phases 3 (ASHK Verification) and 6 (Submission to ASHK) are the
              usual slow points — typically 2–8 weeks. Tap to review.
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.allClearCard}>
            <View style={styles.allClearIconBox}>
              <Text style={styles.allClearIcon}>✓</Text>
            </View>
            <Text style={styles.allClearText}>
              Nothing's stuck — every case is moving along normally.
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBlock
            label="TOTAL ACTIVE"
            value={
              statsLoading ? "—" : String(stats?.total_active ?? items.length)
            }
          />
          <View style={styles.statDivider} />
          <StatBlock
            label="AVG. CYCLE"
            value={statsLoading ? "—" : `${stats?.avg_cycle_days ?? "—"}`}
            unit="days"
          />
          <View style={styles.statDivider} />
          <StatBlock
            label="COMPLETION"
            value={statsLoading ? "—" : `${stats?.completion_rate ?? "—"}`}
            unit="%"
            accent
          />
        </View>

        {/* Cases by Phase */}
        <View>
          <Text style={styles.sectionTitle}>Cases by Phase</Text>
          <View style={styles.phaseList}>
            {[1, 2, 3, 4, 5, 6, 7].map((phase) => {
              const count = casesByPhase[phase] || 0;
              const isBottleneck = BOTTLENECK_PHASES.includes(phase);
              const isCompleted = phase === 7;

              return (
                <TouchableOpacity
                  key={phase}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/(clerk)/cases",
                      params: { phase: String(phase) },
                    })
                  }
                  style={[
                    styles.phaseRow,
                    isBottleneck && styles.phaseRowWarn,
                    isCompleted && styles.phaseRowDone,
                  ]}
                >
                  <View
                    style={[
                      styles.fBadge,
                      isBottleneck && styles.fBadgeWarn,
                      isCompleted && styles.fBadgeDone,
                    ]}
                  >
                    <Text style={styles.fBadgeText}>F{phase}</Text>
                  </View>

                  <View style={styles.phaseInfo}>
                    <View style={styles.phaseInfoTop}>
                      <Text style={styles.phaseName}>
                        {PHASE_LABELS[phase]}
                      </Text>
                      {isBottleneck && (
                        <View style={styles.bottleneckChip}>
                          <Text style={styles.bottleneckChipText}>
                            BOTTLENECK {phase === 3 ? "2–4 wks" : "4–8 wks"}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.phaseDesc} numberOfLines={1}>
                      {PHASE_DESCRIPTIONS[phase]}
                    </Text>
                  </View>

                  <View style={styles.phaseCountCol}>
                    <Text
                      style={[
                        styles.phaseCount,
                        isBottleneck && styles.phaseCountWarn,
                        isCompleted && styles.phaseCountDone,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function StatBlock({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statBlockLabel}>{label}</Text>
      <View style={styles.statBlockValueRow}>
        <Text
          style={[styles.statBlockValue, accent && styles.statBlockValueAccent]}
        >
          {value}
        </Text>
        {unit && <Text style={styles.statBlockUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: {
    padding: Spacing.marginPage,
    gap: 20,
    paddingBottom: 32,
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center" as const,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 16,
  },
  topLeft: { gap: 4 },
  kicker: {
    ...Typography.labelCaps,
    color: Colors.secondary,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  pageTitle: { ...Typography.displayLg, color: Colors.primary, fontSize: 30 },
  pageSub: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  kanbanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  kanbanBtnIcon: { fontSize: 16, color: Colors.secondary },
  kanbanBtnText: {
    ...Typography.bodySm,
    color: Colors.onSurface,
    fontFamily: "Inter_500Medium",
  },

  ribbonCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 18,
    gap: 12,
  },
  ribbonHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ribbonTitle: {
    ...Typography.bodySm,
    color: Colors.onSurface,
    fontFamily: "Inter_600SemiBold",
  },
  ribbonTotal: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  ribbon: {
    flexDirection: "row",
    height: 14,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    backgroundColor: Colors.surfaceContainer,
    gap: 2,
  },
  ribbonSeg: { backgroundColor: Colors.secondary, minWidth: 3 },
  ribbonSegWarn: { backgroundColor: Colors.statusInReview },
  ribbonSegDone: { backgroundColor: Colors.statusCompleted },
  ribbonSegEmpty: { backgroundColor: Colors.outlineVariant, opacity: 0.5 },
  ribbonLegendRow: { flexDirection: "row", gap: 18, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendLabel: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },

  urgentCard: {
    backgroundColor: Colors.errorContainer,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.xl,
    padding: 18,
    gap: 10,
  },
  urgentTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  urgentIconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center",
  },
  urgentIcon: { fontSize: 18, color: Colors.error },
  urgentNumWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flexWrap: "wrap",
  },
  urgentNum: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 32,
    lineHeight: 34,
    color: Colors.onErrorContainer,
  },
  urgentNumLabel: {
    ...Typography.bodySm,
    color: Colors.onErrorContainer,
    fontFamily: "Inter_600SemiBold",
  },
  urgentChevron: { fontSize: 24, color: Colors.onErrorContainer, opacity: 0.5 },
  urgentDetail: {
    ...Typography.bodySm,
    color: Colors.onErrorContainer,
    fontSize: 12,
    opacity: 0.85,
  },

  allClearCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  allClearIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.statusCompletedBg,
    alignItems: "center",
    justifyContent: "center",
  },
  allClearIcon: {
    fontSize: 13,
    color: Colors.statusCompleted,
    fontFamily: "HankenGrotesk_700Bold",
  },
  allClearText: { ...Typography.bodySm, color: Colors.onSurface },

  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: 4,
  },
  statBlock: { flex: 1, alignItems: "center", gap: 6, paddingHorizontal: 8 },
  statBlockLabel: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  statBlockValueRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  statBlockValue: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 32,
    lineHeight: 36,
    color: Colors.primary,
  },
  statBlockValueAccent: { color: Colors.statusCompleted },
  statBlockUnit: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    fontSize: 13,
  },

  sectionTitle: {
    ...Typography.headlineSm,
    color: Colors.primary,
    marginBottom: 12,
  },

  phaseList: { gap: 0 },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    marginBottom: 8,
  },
  phaseRowWarn: { borderColor: Colors.statusInReview, borderWidth: 1.5 },
  phaseRowDone: { borderColor: Colors.statusCompleted },

  fBadge: {
    width: 52,
    alignSelf: "stretch",
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  fBadgeWarn: { backgroundColor: Colors.statusInReviewBg },
  fBadgeDone: { backgroundColor: Colors.statusCompletedBg },
  fBadgeText: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },

  phaseInfo: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
    minWidth: 0,
  },
  phaseInfoTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  phaseName: {
    ...Typography.bodySm,
    color: Colors.onSurface,
    fontFamily: "Inter_500Medium",
  },
  bottleneckChip: {
    backgroundColor: Colors.statusInReviewBg,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bottleneckChipText: {
    ...Typography.labelCaps,
    color: Colors.statusInReview,
    fontSize: 8,
  },
  phaseDesc: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
  },

  phaseCountCol: {
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseCount: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 20,
    color: Colors.onSurfaceVariant,
  },
  phaseCountWarn: { color: Colors.statusInReview },
  phaseCountDone: { color: Colors.statusCompleted },
});
