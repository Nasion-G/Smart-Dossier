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
          <Text style={styles.headerSub}>Tap a card to open case detail</Text>
        </View>
        {blockedCount > 0 && (
          <View style={styles.blockedBadge}>
            <Text style={styles.blockedBadgeText}>
              ⚑ {blockedCount} BLOCKED
            </Text>
          </View>
        )}
      </View>

      {/* Kanban columns — horizontal scroll track */}
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
          // FIX: the track must NOT be flex:1 in a nested context — give it a fixed height
          // by letting the parent (root flex:1) drive the height, and keeping the scroll
          // view itself as flex:1 so it fills the remaining space below the header.
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
            const hasBlockedCases = phaseCases.some((c) => c.is_blocked);
            const allCompleted =
              phaseCases.length > 0 &&
              phaseCases.every((c) => c.status === "completed");

            return (
              <View key={phase} style={styles.column}>
                {/* Column header */}
                <View style={styles.columnHeader}>
                  <Text
                    style={[
                      styles.columnLabel,
                      hasBlockedCases && styles.columnLabelBlocked,
                      allCompleted && styles.columnLabelDone,
                    ]}
                    numberOfLines={1}
                  >
                    F{phase} · {PHASE_LABELS[phase]}
                  </Text>
                  <View
                    style={[
                      styles.countBadge,
                      hasBlockedCases && styles.countBadgeBlocked,
                      allCompleted && styles.countBadgeDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.countText,
                        hasBlockedCases && styles.countTextBlocked,
                        allCompleted && styles.countTextDone,
                      ]}
                    >
                      {phaseCases.length}
                    </Text>
                  </View>
                  {hasBlockedCases && (
                    <Text style={styles.blockedIcon}>⚠</Text>
                  )}
                </View>

                {/* FIX: wrap cards in a vertical ScrollView so columns with many cards
                    scroll independently. nestedScrollEnabled allows this inside the
                    horizontal parent ScrollView on Android. */}
                <ScrollView
                  style={styles.columnScroll}
                  contentContainerStyle={styles.columnContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {allCompleted ? (
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
                    phaseCases.map((c) => (
                      <KanbanCard key={c.id} caseItem={c} />
                    ))
                  )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function KanbanCard({ caseItem }: { caseItem: Case }) {
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
  },
  blockedBadgeText: {
    ...Typography.labelCaps,
    color: Colors.onErrorContainer,
    fontSize: 10,
  },

  // FIX: flex:1 here so the horizontal scroll fills available height (below header)
  trackScroll: { flex: 1 },
  trackContent: {
    padding: Spacing.marginPage,
    gap: 16,
    paddingBottom: 24,
    // alignItems: "flex-start" is critical — without this, columns stretch to the
    // ScrollView's content height and you can never scroll down inside them.
    alignItems: "flex-start",
  },

  // FIX: column must have a fixed height (not flex:1) so vertical scroll works
  column: {
    width: 280,
    // maxHeight constrains the column so cards overflow into a vertical scroll
    maxHeight: 600,
    flexShrink: 0,
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  columnLabel: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    flex: 1,
  },
  columnLabelBlocked: { color: Colors.statusBlocked },
  columnLabelDone: { color: Colors.statusCompleted },
  countBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countBadgeBlocked: { backgroundColor: Colors.statusBlockedBg },
  countBadgeDone: { backgroundColor: Colors.statusCompletedBg },
  countText: { ...Typography.labelCaps, color: Colors.onSurface, fontSize: 10 },
  countTextBlocked: { color: Colors.statusBlocked },
  countTextDone: { color: Colors.statusCompleted },
  blockedIcon: { fontSize: 14, color: Colors.statusBlocked },

  // FIX: the vertical scroll wrapper for column cards
  columnScroll: { flex: 1 },
  columnContent: { gap: 10, paddingBottom: 8 },

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
