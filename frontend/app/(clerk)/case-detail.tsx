import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cases, ai, documents } from "../api/services";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Elevation,
  PHASE_LABELS,
  PHASE_DESCRIPTIONS,
  BOTTLENECK_PHASES,
} from "../constants/design";
import * as DocumentPicker from "expo-document-picker";

<<<<<<< HEAD
type Tab = "summary" | "extracted" | "ai" | "advance";
=======
type Tab = 'summary' | 'extracted' | 'ai' | 'advance';
const DOC_CHECK_LABELS: Record<string, string> = {
  has_owner_name: 'Owner name',
  has_property_id: 'Property ID',
  has_signature: 'Signature',
  has_official_stamp: 'Official stamp',
  is_dated: 'Dated',
};
>>>>>>> cf4369d97b263c3016b56fa97229d71ac6a72924

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("summary");
  const [advanceNotes, setAdvanceNotes] = useState("");
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isTablet = width >= 480 && width < 768;
  const sideWidth = isDesktop ? 320 : undefined;
  const pagePad = isDesktop ? Spacing.marginPage + 8 : Spacing.marginPage;

  const { data: caseItem, isLoading } = useQuery({
    queryKey: ["case", id],
    queryFn: () => cases.get(id),
  });
  const { data: history = [] } = useQuery({
    queryKey: ["history", id],
    queryFn: () => cases.phaseHistory(id),
  });
  const { data: docs = [] } = useQuery({
    queryKey: ["docs", id],
    queryFn: () => documents.list(id),
  });
  const {
    data: summary,
    isFetching: summaryLoading,
    refetch: fetchSummary,
  } = useQuery({
    queryKey: ["summary", id],
    queryFn: () => ai.summary(id),
    enabled: false,
  });

  const advanceMutation = useMutation({
    mutationFn: (newPhase: number) =>
      cases.advancePhase(id, { new_phase: newPhase, notes: advanceNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case", id] });
      qc.invalidateQueries({ queryKey: ["history", id] });
      qc.invalidateQueries({ queryKey: ["cases"] });
      setAdvanceNotes("");
    },
  });

  if (isLoading || !caseItem) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.secondary} size="large" />
      </View>
    );
  }

  const isBlocked = caseItem.is_blocked;
  const canAdvance = caseItem.current_phase < 7;

  return (
    <View style={styles.root}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backArrow}>← Back to cases</Text>
      </TouchableOpacity>

      <View style={[styles.body, isDesktop && styles.bodyDesktop]}>
        {/* ── LEFT PANEL ── */}
        <View
          style={[
            styles.leftPanel,
            sideWidth ? { width: sideWidth } : styles.leftPanelMobile,
          ]}
        >
          <ScrollView
            style={styles.leftScroll}
            contentContainerStyle={styles.leftContent}
            nestedScrollEnabled
          >
            {/* Case header */}
            <View style={[styles.caseHeader, { padding: pagePad }]}>
              <Text style={styles.caseCode}>{caseItem.code}</Text>
              <Text style={styles.caseTitle}>{caseItem.title}</Text>
              {isBlocked && (
                <View style={styles.blockedRow}>
                  <View style={styles.blockedChip}>
                    <Text style={styles.blockedChipText}>
                      BLOCKED · F{caseItem.current_phase}
                    </Text>
                  </View>
                  <Text style={styles.blockedDays}>
                    {caseItem.days_in_phase} days
                  </Text>
                </View>
              )}
            </View>

            {/* Phase tracker — all 7 phases always shown individually */}
            <View style={[styles.phaseTracker, { padding: pagePad }]}>
              <Text style={styles.trackerTitle}>
                WORKFLOW STATUS · {caseItem.current_phase}/7
              </Text>
              <View style={styles.timeline}>
                {[1, 2, 3, 4, 5, 6, 7].map((phase) => {
                  const done = phase < caseItem.current_phase;
                  const active = phase === caseItem.current_phase;
                  const pending = phase > caseItem.current_phase;

                  return (
                    <View key={phase} style={styles.timelineRow}>
                      {phase < 7 && (
                        <View
                          style={[
                            styles.phaseLine,
                            done
                              ? styles.phaseLineDone
                              : styles.phaseLinePending,
                          ]}
                        />
                      )}
                      <View
                        style={[
                          styles.phaseDot,
                          done && styles.phaseDotDone,
                          active &&
                            (isBlocked
                              ? styles.phaseDotBlocked
                              : styles.phaseDotActive),
                          pending && styles.phaseDotPending,
                        ]}
                      >
                        {done ? (
                          <Text style={styles.phaseDotCheck}>✓</Text>
                        ) : (
                          <Text
                            style={[
                              styles.phaseDotNum,
                              active && styles.phaseDotNumActive,
                              pending && styles.phaseDotNumPending,
                            ]}
                          >
                            {phase}
                          </Text>
                        )}
                      </View>
                      <View style={styles.phaseContent}>
                        <Text
                          style={[
                            styles.phaseName,
                            done && styles.phaseNameDone,
                            active &&
                              (isBlocked
                                ? styles.phaseNameBlocked
                                : styles.phaseNameActive),
                            pending && styles.phaseNamePending,
                          ]}
                        >
                          {PHASE_LABELS[phase]}
                        </Text>
                        {done && (
                          <Text style={styles.phaseMeta}>
                            {history.find(
                              (h) => h.phase === phase && h.exited_at,
                            )?.exited_at
                              ? `Completed ${new Date(history.find((h) => h.phase === phase && h.exited_at)!.exited_at!).toLocaleDateString("en-GB")}`
                              : "Completed"}
                          </Text>
                        )}
                        {active && (
                          <Text
                            style={[
                              styles.phaseMeta,
                              isBlocked && styles.phaseMetaBlocked,
                            ]}
                          >
                            {caseItem.days_in_phase} days —{" "}
                            {isBlocked ? "awaiting response" : "in progress"}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Documents */}
            <View style={[styles.docSection, { padding: pagePad }]}>
              <View style={styles.docHeader}>
                <Text style={styles.docTitle}>DOCUMENTS</Text>
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={async () => {
                    const result = await DocumentPicker.getDocumentAsync({
                      type: ["application/pdf", "image/*"],
                    });
                    if (!result.canceled && result.assets[0]) {
                      const file = result.assets[0];
<<<<<<< HEAD
                      await documents.upload(id, {
                        uri: file.uri,
                        name: file.name,
                        type: file.mimeType ?? "application/pdf",
                      });
                      qc.invalidateQueries({ queryKey: ["docs", id] });
=======
                      await documents.upload(id, { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/pdf' });
                      qc.invalidateQueries({ queryKey: ['docs', id] });
                      qc.invalidateQueries({ queryKey: ['case', id] });
>>>>>>> cf4369d97b263c3016b56fa97229d71ac6a72924
                    }
                  }}
                >
                  <Text style={styles.docUploadLink}>+ Upload</Text>
                </TouchableOpacity>
              {docs.map((doc) => (
                <View
                  key={doc.id}
                  style={[
                    styles.docCard,
                    doc.confirmed && styles.docCardActive,
                  ]}
                >
                  <Text style={styles.docIcon}>{"\u25A1"}</Text>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={1}>
                      {doc.filename}
                    </Text>
                    <Text style={styles.docMeta}>
                      {doc.confirmed ? "Verified" : "In Review"}
                    </Text>
                    {doc.checklist && (
                      <View style={styles.docChecklist}>
                        {Object.entries(doc.checklist).map(([key, val]) => (
                          <Text key={key} style={val ? styles.docCheckOk : styles.docCheckFail}>
                            {val ? '\u2713' : '\u2717'} {DOC_CHECK_LABELS[key] ?? key}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                  <View
                    style={[
                      styles.docDot,
                      doc.confirmed ? styles.docDotDone : styles.docDotActive,
                    ]}
                  />
                </View>
              ))}
              {docs.length === 0 && (
                <Text style={styles.docEmpty}>No documents uploaded</Text>
              )}
            </View>
          </ScrollView>
        </View>

        {/* ── CENTER / MAIN CONTENT ── */}
        <View style={styles.mainPanel}>
          {/* Tabs — horizontally scrollable so they never clip on narrow screens */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            contentContainerStyle={[
              styles.tabBarContent,
              { paddingHorizontal: pagePad, gap: isDesktop ? 24 : 16 },
            ]}
          >
            {(
              [
                ["summary", "Summary"],
                ["extracted", "Extracted Data"],
                ["ai", "AI Analysis"],
                ["advance", "Advance Phase"],
              ] as [Tab, string][]
            ).map(([t, label]) => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
              >
                <Text
                  style={[styles.tabText, tab === t && styles.tabTextActive]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            style={styles.tabBody}
            contentContainerStyle={[
              styles.tabBodyContent,
              { padding: pagePad },
            ]}
          >
            {/* ── Summary ── */}
            {tab === "summary" && (
              <>
                {isBlocked && (
                  <View style={styles.delayAlert}>
                    <Text style={styles.delayAlertIcon}>⚠</Text>
                    <View style={styles.delayAlertBody}>
                      <Text style={styles.delayAlertTitle}>
                        Critical Delay — Phase {caseItem.current_phase}{" "}
                        Bottleneck
                      </Text>
                      <Text style={styles.delayAlertText}>
                        This case has been in{" "}
                        {PHASE_LABELS[caseItem.current_phase]} for{" "}
                        {caseItem.days_in_phase} days. Expected duration is 14
                        days. Escalation recommended.
                      </Text>
                    </View>
                  </View>
                )}
                <View style={styles.infoGrid}>
                  <InfoField
                    label="Applicant"
                    value={caseItem.owner_name ?? "—"}
                    isDesktop={isDesktop}
                  />
                  <InfoField
                    label="Property ID"
                    value={caseItem.property_id ?? "—"}
                    mono
                    isDesktop={isDesktop}
                  />
                  <InfoField
                    label="Zone"
                    value={caseItem.zone ?? "—"}
                    isDesktop={isDesktop}
                  />
                  <InfoField
                    label="Income Bracket"
                    value={caseItem.income_bracket ?? "—"}
                    isDesktop={isDesktop}
                  />
                  <InfoField
                    label="Created"
                    value={new Date(caseItem.created_at).toLocaleDateString(
                      "en-GB",
                    )}
                    isDesktop={isDesktop}
                  />
                  <InfoField
                    label="Assigned To"
                    value={caseItem.assigned_to ?? "Unassigned"}
                    isDesktop={isDesktop}
                  />
                </View>
              </>
            )}

            {/* ── Extracted Data ── */}
            {tab === "extracted" && (
              <View style={styles.extractedCard}>
                <View style={styles.extractedHeader}>
                  <Text style={styles.extractedTitle}>AI EXTRACTED FIELDS</Text>
                </View>
                {docs.some((d) => d.extracted_data) ? (
                  docs
                    .filter((d) => d.extracted_data)
                    .map((doc) => (
                      <View key={doc.id}>
                        {Object.entries(doc.extracted_data!).map(
                          ([key, val]) =>
                            val != null ? (
                              <View key={key} style={styles.extractedRow}>
                                <Text
                                  style={styles.extractedKey}
                                  numberOfLines={1}
                                >
                                  "{key}"
                                </Text>
                                <Text
                                  style={styles.extractedVal}
                                  numberOfLines={1}
                                >
                                  {typeof val === "string"
                                    ? `"${val}"`
                                    : String(val)}
                                </Text>
                              </View>
                            ) : null,
                        )}
                        {!doc.confirmed && (
                          <TouchableOpacity
                            style={styles.confirmBtn}
                            onPress={() => documents.confirmExtraction(doc.id)}
                          >
                            <Text style={styles.confirmBtnText}>
                              Confirm extraction → Apply to case
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                ) : (
                  <Text style={styles.extractedEmpty}>
                    Upload and process documents to see extracted fields.
                  </Text>
                )}
              </View>
            )}

            {/* ── AI Analysis ── */}
            {tab === "ai" && (
              <View style={styles.aiSection}>
                <TouchableOpacity
                  style={styles.aiBtn}
                  onPress={() => fetchSummary()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.aiBtnIcon}>✦</Text>
                  <Text style={styles.aiBtnText}>Analyse case with AI</Text>
                </TouchableOpacity>
                {summaryLoading && (
                  <View style={styles.aiLoading}>
                    <ActivityIndicator color={Colors.secondary} />
                    <Text style={styles.aiLoadingText}>Analysing…</Text>
                  </View>
                )}
                {summary && !summaryLoading && (
                  <View style={styles.aiResult}>
                    <Text style={styles.aiResultLabel}>AI ANALYSIS</Text>
                    <Text style={styles.aiResultText}>{summary}</Text>
                  </View>
                )}
                {BOTTLENECK_PHASES.includes(caseItem.current_phase) && (
                  <View style={styles.bottleneckNote}>
                    <Text style={styles.bottleneckNoteTitle}>
                      ⚠ Phase {caseItem.current_phase} — Known Bottleneck
                    </Text>
                    <Text style={styles.bottleneckNoteText}>
                      {caseItem.current_phase === 3
                        ? "ASHK Verification historically causes 2–4 week delays due to manual cross-reference with the regional property registry. Consider proactive follow-up after day 10."
                        : "Submission to ASHK involves physical file transfer with 4–8 week delays and risk of loss. Consider digital submission alternatives."}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Advance Phase ── */}
            {tab === "advance" && (
              <View style={styles.advanceCard}>
                <View>
                  <Text style={styles.advanceTitle}>
                    Advance to Phase {caseItem.current_phase + 1}
                  </Text>
                  <Text style={styles.advanceSub}>
                    {PHASE_DESCRIPTIONS[caseItem.current_phase + 1]}
                  </Text>
                </View>
                <View style={styles.checklistCard}>
<<<<<<< HEAD
                  <Text style={styles.checklistTitle}>
                    CURRENT CHECKLIST BEFORE ADVANCING
                  </Text>
                  {canAdvance ? (
                    <>
                      <View style={styles.checkItem}>
                        <Text style={styles.checkOk}>✓</Text>
                        <Text style={styles.checkOkText}>
                          Documents uploaded and verified
                        </Text>
                      </View>
                      <View style={styles.checkItem}>
                        <Text style={styles.checkFail}>✕</Text>
                        <Text style={styles.checkFailText}>
                          {caseItem.current_phase === 3
                            ? "ASHK verification response pending"
                            : "Phase requirements not fully met"}
                        </Text>
                      </View>
                      <View style={styles.checkItem}>
                        <Text style={styles.checkFail}>✕</Text>
                        <Text style={styles.checkFailText}>
                          Conflict check not cleared
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.checkNone}>
                      Case is in final phase — no further advancement needed.
=======
                  <Text style={styles.checklistTitle}>DOCUMENT & PHASE CHECKLIST</Text>
                  {caseItem.phase_checklist ? (
                    <>
                      {[1, 2, 3, 4, 5, 6, 7].map((phase) => {
                        const key = String(phase);
                        const passed = caseItem.phase_checklist![key];
                        return (
                          <View key={key} style={styles.checkItem}>
                            <Text style={passed ? styles.checkOk : styles.checkFail}>
                              {passed ? '\u2713' : '\u2717'}
                            </Text>
                            <Text style={passed ? styles.checkOkText : styles.checkFailText}>
                              Phase {phase}: {PHASE_LABELS[phase]}
                            </Text>
                          </View>
                        );
                      })}
                    </>
                  ) : (
                    <Text style={styles.checkNone}>
                      Upload documents to generate a phase checklist. Ollama must be running.
>>>>>>> cf4369d97b263c3016b56fa97229d71ac6a72924
                    </Text>
                  )}
                </View>
                {canAdvance && (
                  <>
                    <View>
                      <Text style={styles.notesLabel}>
                        NOTES FOR THIS TRANSITION
                      </Text>
                      <TextInput
                        style={styles.notesInput}
                        value={advanceNotes}
                        onChangeText={setAdvanceNotes}
                        placeholder="Optional: Add transition notes..."
                        placeholderTextColor={Colors.outline}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.advanceBtn,
                        advanceMutation.isPending && styles.advanceBtnDisabled,
                      ]}
                      onPress={() => {
                        Alert.alert(
                          "Confirm phase change",
                          `Move from phase ${caseItem.current_phase} to phase ${caseItem.current_phase + 1}?`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Confirm",
                              onPress: () =>
                                advanceMutation.mutate(
                                  caseItem.current_phase + 1,
                                ),
                            },
                          ],
                        );
                      }}
                      disabled={advanceMutation.isPending}
                      activeOpacity={0.85}
                    >
                      {advanceMutation.isPending ? (
                        <ActivityIndicator
                          color={Colors.onSecondary}
                          size="small"
                        />
                      ) : (
                        <Text style={styles.advanceBtnText}>
                          Confirm advance to Phase {caseItem.current_phase + 1}{" "}
                          →
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function InfoField({
  label,
  value,
  mono,
  isDesktop,
}: {
  label: string;
  value: string;
  mono?: boolean;
  isDesktop?: boolean;
}) {
  return (
    <View style={[styles.infoField, isDesktop && styles.infoFieldDesktop]}>
      <Text style={styles.infoFieldLabel}>{label}</Text>
      <Text
        style={[styles.infoFieldValue, mono && styles.infoFieldMono]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },

  backBtn: {
    paddingHorizontal: Spacing.marginPage,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  backArrow: {
    ...Typography.bodySm,
    color: Colors.secondary,
    fontFamily: "Inter_600SemiBold",
  },

  // Body
  body: { flex: 1, overflow: "hidden" },
  bodyDesktop: { flexDirection: "row" },

  // Left panel
  leftPanel: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRightWidth: 1,
    borderRightColor: Colors.outlineVariant,
    flexShrink: 0,
  },
  leftPanelMobile: {
    maxHeight: 420,
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  leftScroll: { flex: 1 },
  leftContent: { gap: 0 },

  // Case header
  caseHeader: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    gap: 6,
  },
  caseCode: { ...Typography.labelCaps, color: Colors.secondary },
  caseTitle: {
    ...Typography.headlineSm,
    color: Colors.primary,
    lineHeight: 22,
  },
  blockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  blockedChip: {
    backgroundColor: Colors.statusBlockedBg,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  blockedChipText: {
    ...Typography.labelCaps,
    color: Colors.statusBlocked,
    fontSize: 9,
  },
  blockedDays: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },

  // Phase tracker
  phaseTracker: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  trackerTitle: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    marginBottom: 20,
    fontSize: 10,
  },
  timeline: { gap: 0 },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
    minHeight: 40,
    position: "relative",
  },
  phaseLine: {
    position: "absolute",
    left: 10,
    top: 26,
    bottom: -4,
    width: 2,
    backgroundColor: Colors.outlineVariant,
  },
  phaseLineDone: { backgroundColor: Colors.secondary },
  phaseLinePending: { backgroundColor: Colors.outlineVariant },
  phaseDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    flexShrink: 0,
  },
  phaseDotDone: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  phaseDotActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
    width: 24,
    height: 24,
    marginTop: -1,
    marginLeft: -1,
  },
  phaseDotBlocked: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderColor: Colors.error,
    borderWidth: 2,
    width: 24,
    height: 24,
    marginTop: -1,
    marginLeft: -1,
  },
  // Pending dots use an explicit lighter color set rather than opacity, so the
  // border and number stay legible instead of washing out to near-invisible.
  phaseDotPending: {
    backgroundColor: Colors.surfaceContainerLow,
    borderColor: Colors.outlineVariant,
  },
  phaseDotCheck: {
    color: Colors.onSecondary,
    fontSize: 12,
    fontFamily: "HankenGrotesk_700Bold",
  },
  phaseDotNum: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  phaseDotNumActive: { color: Colors.onPrimary },
  phaseDotNumPending: { color: Colors.outline },
  phaseContent: {
    flex: 1,
    paddingTop: 1,
    paddingBottom: 12,
    minWidth: 0,
    justifyContent: "center",
  },
  phaseName: {
    ...Typography.bodySm,
    color: Colors.onSurface,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  phaseNameDone: { color: Colors.statusCompleted },
  phaseNameActive: { color: Colors.secondary },
  phaseNameBlocked: { color: Colors.error },
  phaseNamePending: { color: Colors.onSurfaceVariant },
  phaseMeta: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    fontSize: 10,
  },
  phaseMetaBlocked: { color: Colors.error },

  // Documents
  docSection: { flex: 1 },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  docTitle: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  docUploadLink: {
    ...Typography.labelCaps,
    color: Colors.secondary,
    fontSize: 10,
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    marginBottom: 8,
  },
  docCardActive: { borderColor: Colors.secondary, borderWidth: 2 },
  docIcon: { fontSize: 20 },
  docInfo: { flex: 1, minWidth: 0 },
  docName: {
    ...Typography.bodySm,
    color: Colors.onSurface,
    fontFamily: "Inter_500Medium",
  },
  docMeta: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    marginTop: 2,
  },
  docDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  docDotDone: { backgroundColor: Colors.statusCompleted },
  docDotActive: { backgroundColor: Colors.secondary },
<<<<<<< HEAD
  docEmpty: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    padding: 20,
  },
=======
  docEmpty: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center', padding: 20 },
  docChecklist: { marginTop: 6, gap: 2 },
  docCheckOk: { ...Typography.labelCaps, color: Colors.statusCompleted, fontSize: 9 },
  docCheckFail: { ...Typography.labelCaps, color: Colors.error, fontSize: 9 },
>>>>>>> cf4369d97b263c3016b56fa97229d71ac6a72924

  // Main panel
  mainPanel: { flex: 1, overflow: "hidden" },

  // Tabs
  tabBar: {
    flexGrow: 0,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  tabBarContent: { alignItems: "center" },
  tab: { paddingVertical: 14, paddingHorizontal: 2 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.secondary },
  tabText: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  tabTextActive: { color: Colors.secondary },
  tabBody: { flex: 1 },
  tabBodyContent: { gap: 16, paddingBottom: 32 },

  // Summary
  delayAlert: {
    backgroundColor: Colors.errorContainer,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.xl,
    padding: 16,
    flexDirection: "row",
    gap: 12,
  },
  delayAlertIcon: {
    fontSize: 18,
    color: Colors.onErrorContainer,
    marginTop: 1,
  },
  delayAlertBody: { flex: 1, gap: 4 },
  delayAlertTitle: {
    ...Typography.bodySm,
    color: Colors.onErrorContainer,
    fontFamily: "Inter_600SemiBold",
  },
  delayAlertText: {
    ...Typography.bodySm,
    color: Colors.onErrorContainer,
    fontSize: 12,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoField: {
    flexGrow: 1,
    flexBasis: "100%",
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 4,
  },
  infoFieldDesktop: { flexBasis: "31%" },
  infoFieldLabel: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  infoFieldValue: {
    ...Typography.bodySm,
    color: Colors.onSurface,
    fontFamily: "Inter_600SemiBold",
  },
  infoFieldMono: { fontFamily: "Inter_500Medium" },

  // Extracted
  extractedCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: "hidden",
  },
  extractedHeader: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  extractedTitle: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  extractedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  extractedKey: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    flexShrink: 1,
  },
  extractedVal: {
    ...Typography.labelCaps,
    color: Colors.secondary,
    fontSize: 10,
    backgroundColor: Colors.statusOnTrackBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    flexShrink: 1,
    textAlign: "right",
  },
  extractedEmpty: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    padding: 20,
    textAlign: "center",
  },
  confirmBtn: {
    backgroundColor: Colors.secondary,
    padding: 14,
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: BorderRadius.lg,
  },
  confirmBtnText: {
    ...Typography.bodySm,
    color: Colors.onSecondary,
    fontFamily: "Inter_500Medium",
  },

  // AI
  aiSection: { gap: 16 },
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  aiBtnIcon: { fontSize: 18, color: Colors.inversePrimary },
  aiBtnText: {
    ...Typography.bodySm,
    color: Colors.onPrimary,
    fontFamily: "Inter_500Medium",
  },
  aiLoading: { alignItems: "center", padding: 32, gap: 12 },
  aiLoadingText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  aiResult: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
    padding: 20,
    gap: 10,
    ...Elevation.activeCard,
  },
  aiResultLabel: {
    ...Typography.labelCaps,
    color: Colors.secondary,
    fontSize: 10,
  },
  aiResultText: {
    ...Typography.bodyLg,
    color: Colors.onSurface,
    lineHeight: 26,
  },
  bottleneckNote: {
    backgroundColor: Colors.statusInReviewBg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.statusInReview,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.statusInReview,
    padding: 16,
    gap: 6,
  },
  bottleneckNoteTitle: {
    ...Typography.bodySm,
    color: Colors.statusInReview,
    fontFamily: "Inter_600SemiBold",
  },
  bottleneckNoteText: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
  },

  // Advance
  advanceCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.secondary,
    padding: 20,
    gap: 20,
  },
  advanceTitle: {
    ...Typography.headlineSm,
    color: Colors.primary,
  },
  advanceSub: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  checklistCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: 16,
    gap: 10,
  },
  checklistTitle: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    marginBottom: 4,
  },
  checkItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  checkOk: { fontSize: 16, color: Colors.statusCompleted },
  checkOkText: { ...Typography.bodySm, color: Colors.onSurface, flex: 1 },
  checkFail: { fontSize: 16, color: Colors.error },
  checkFailText: { ...Typography.bodySm, color: Colors.error, flex: 1 },
  checkNone: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  notesLabel: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    padding: 12,
    ...Typography.bodySm,
    color: Colors.onSurface,
    minHeight: 80,
    textAlignVertical: "top",
  },
  advanceBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  advanceBtnDisabled: { opacity: 0.6 },
  advanceBtnText: {
    ...Typography.bodySm,
    color: Colors.onSecondary,
    fontFamily: "Inter_500Medium",
  },
});
