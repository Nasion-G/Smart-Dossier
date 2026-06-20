import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
  getCaseStatusVisual,
} from "../constants/design";
import type { Case } from "../types";

export default function KanbanScreen() {
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

  const blockedCount = items.filter((c) => c.is_blocked).length;

  return (
    <View style={styles.root}>
      {/* Kanban header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Kanban Board</Text>
          <Text style={styles.headerSub}>Click a card to open case detail</Text>
        </View>
        {blockedCount > 0 && (
          <View style={styles.blockedBadge}>
            <Text style={styles.blockedBadgeText}>
              ⚑ {blockedCount} BLOCKED
            </Text>
          </View>
        )}
      </View>

      {/* Kanban columns */}
      {isLoading ? (
        <ActivityIndicator
          color={Colors.secondary}
          style={{ marginTop: 48 }}
          size="large"
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          style={styles.trackScroll}
          contentContainerStyle={styles.trackContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.secondary}
            />
          }
        >
          {[1, 2, 3, 4, 5, 6, 7].map((phase) => {
            const phaseCases = items.filter((c) => c.current_phase === phase);
            // Column color now reflects whether any case actually sitting in
            // this phase right now is blocked — not whether the phase number
            // is on a static "usually slow" list. An empty or healthy phase
            // 3/6 column stays neutral; it only goes amber when a real case
            // in it has tripped the blocked threshold.
            const hasBlockedCases = phaseCases.some((c) => c.is_blocked);
            const isCompleted = phase === 7;

            return (
              <View key={phase} style={styles.column}>
                {/* Column header */}
                <View style={styles.columnHeader}>
                  <Text
                    style={[
                      styles.columnLabel,
                      hasBlockedCases && styles.columnLabelWarn,
                      isCompleted && styles.columnLabelDone,
                    ]}
                  >
                    F{phase} · {PHASE_LABELS[phase]}
                  </Text>
                  <View
                    style={[
                      styles.countBadge,
                      hasBlockedCases && styles.countBadgeWarn,
                      isCompleted && styles.countBadgeDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.countText,
                        hasBlockedCases && styles.countTextWarn,
                        isCompleted && styles.countTextDone,
                      ]}
                    >
                      {phaseCases.length}
                    </Text>
                  </View>
                  {hasBlockedCases && (
                    <Text style={styles.bottleneckIcon}>⚠</Text>
                  )}
                </View>

                {/* Column cards */}
                {isCompleted ? (
                  <View style={styles.completedCard}>
                    <Text style={styles.completedIcon}>✓</Text>
                    <Text style={styles.completedTitle}>
                      {phaseCases.length} cases completed
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/(clerk)/cases",
                          params: { phase: "7" },
                        })
                      }
                    >
                      <Text style={styles.completedLink}>View archive →</Text>
                    </TouchableOpacity>
                  </View>
                ) : phaseCases.length === 0 ? (
                  <View style={styles.emptyCol}>
                    <Text style={styles.emptyColText}>No cases</Text>
                  </View>
                ) : (
                  phaseCases.map((c) => <KanbanCard key={c.id} caseItem={c} />)
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function KanbanCard({ caseItem }: { caseItem: Case }) {
  // Single source of truth for status color — same helper used in the case
  // list, so a card's color always tracks the case's real state instead of
  // a per-component hardcoded check.
  const statusVisual = getCaseStatusVisual(caseItem);

  const initials = (caseItem.owner_name ?? "??")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 1);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        caseItem.is_blocked && { borderColor: statusVisual.fg, borderWidth: 2 },
      ]}
      onPress={() =>
        router.push({
          pathname: "/(clerk)/case-detail",
          params: { id: caseItem.id },
        })
      }
      activeOpacity={0.75}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardCode}>{caseItem.code}</Text>
        {caseItem.is_blocked && (
          <View
            style={[styles.blockedChip, { backgroundColor: statusVisual.bg }]}
          >
            <Text style={[styles.blockedChipText, { color: statusVisual.fg }]}>
              {statusVisual.label.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {caseItem.title}
      </Text>
      <View style={styles.cardBottom}>
        <View style={styles.cardDays}>
          <Text style={styles.clockIcon}>{"\u25F7"}</Text>
          <Text
            style={[
              styles.daysText,
              caseItem.is_blocked && { color: statusVisual.fg },
            ]}
          >
            {caseItem.days_in_phase}{" "}
            {caseItem.days_in_phase === 1 ? "day" : "days"}
          </Text>
        </View>
        <View style={styles.cardAvatar}>
          <Text style={styles.cardAvatarText}>{initials}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.marginPage,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { ...Typography.headlineSm, color: Colors.primary },
  headerSub: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    fontSize: 12,
  },
  blockedBadge: {
    backgroundColor: Colors.errorContainer,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  blockedBadgeText: {
    ...Typography.labelCaps,
    color: Colors.onErrorContainer,
    fontSize: 10,
  },
  trackScroll: { flex: 1 },
  trackContent: {
    padding: Spacing.marginPage,
    gap: 24,
    paddingBottom: 24,
  },
  column: {
    width: 300,
    gap: 12,
    flexShrink: 0,
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  columnLabel: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    flex: 1,
  },
  columnLabelWarn: { color: Colors.statusInReview },
  columnLabelDone: { color: Colors.statusCompleted },
  countBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countBadgeWarn: { backgroundColor: Colors.statusInReviewBg },
  countBadgeDone: { backgroundColor: Colors.statusCompletedBg },
  countText: { ...Typography.labelCaps, color: Colors.onSurface, fontSize: 10 },
  countTextWarn: { color: Colors.statusInReview },
  countTextDone: { color: Colors.statusCompleted },
  bottleneckIcon: { fontSize: 14, color: Colors.statusInReview },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardCode: { ...Typography.labelCaps, color: Colors.secondary, fontSize: 10 },
  blockedChip: {
    backgroundColor: Colors.statusBlockedBg,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  blockedChipText: {
    ...Typography.labelCaps,
    color: Colors.statusBlocked,
    fontSize: 8,
  },
  cardTitle: {
    ...Typography.bodySm,
    color: Colors.onSurface,
    fontFamily: "Inter_600SemiBold",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardDays: { flexDirection: "row", alignItems: "center", gap: 6 },
  clockIcon: { fontSize: 14, color: Colors.onSurfaceVariant },
  daysText: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  cardAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  cardAvatarText: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  completedCard: {
    backgroundColor: Colors.statusCompletedBg,
    borderRadius: BorderRadius.xl,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.statusCompleted,
  },
  completedIcon: { fontSize: 28, color: Colors.statusCompleted },
  completedTitle: {
    ...Typography.bodySm,
    color: Colors.statusCompleted,
    fontFamily: "Inter_600SemiBold",
  },
  completedLink: {
    ...Typography.bodySm,
    color: Colors.statusCompleted,
    fontSize: 12,
  },
  emptyCol: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderStyle: "dashed",
  },
  emptyColText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
});
