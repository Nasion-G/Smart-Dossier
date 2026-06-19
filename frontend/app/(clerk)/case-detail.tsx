import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cases, ai, documents } from '../api/services';
import {
  Colors, Typography, Spacing, BorderRadius, Elevation,
  PHASE_LABELS, PHASE_DESCRIPTIONS, BOTTLENECK_PHASES,
} from '../constants/design';
import * as DocumentPicker from 'expo-document-picker';

type Tab = 'summary' | 'documents' | 'workflow' | 'ai';

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('summary');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const qc = useQueryClient();

  const { data: caseItem, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => cases.get(id),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['history', id],
    queryFn: () => cases.phaseHistory(id),
    enabled: tab === 'workflow',
  });

  const { data: docs = [] } = useQuery({
    queryKey: ['docs', id],
    queryFn: () => documents.list(id),
    enabled: tab === 'documents',
  });

  const { data: summary, isFetching: summaryLoading, refetch: fetchSummary } = useQuery({
    queryKey: ['summary', id],
    queryFn: () => ai.summary(id),
    enabled: false,
  });

  const advanceMutation = useMutation({
    mutationFn: (newPhase: number) =>
      cases.advancePhase(id, { new_phase: newPhase, notes: advanceNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case', id] });
      qc.invalidateQueries({ queryKey: ['history', id] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      setAdvanceNotes('');
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.caseCode}>{caseItem.code}</Text>
          <Text style={styles.caseTitle} numberOfLines={1}>{caseItem.title}</Text>
        </View>
        {isBlocked && <View style={styles.blockedBadge}><Text style={styles.blockedBadgeText}>BLLOKUAR</Text></View>}
      </View>

      {/* Phase progress strip */}
      <View style={styles.phaseStrip}>
        {[1,2,3,4,5,6,7].map((p) => (
          <View
            key={p}
            style={[
              styles.phaseNode,
              p < caseItem.current_phase && styles.phaseNodeDone,
              p === caseItem.current_phase && styles.phaseNodeActive,
              BOTTLENECK_PHASES.includes(p) && p === caseItem.current_phase && styles.phaseNodeBottleneck,
            ]}
          >
            <Text style={[
              styles.phaseNodeText,
              p <= caseItem.current_phase && styles.phaseNodeTextDone,
            ]}>
              {p < caseItem.current_phase ? '✓' : String(p)}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.phaseCurrentLabel}>
        Phase {caseItem.current_phase}: {PHASE_LABELS[caseItem.current_phase]} · {caseItem.days_in_phase}d
      </Text>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['summary', 'documents', 'workflow', 'ai'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'summary' ? 'Summary' :
               t === 'documents' ? 'Documents' :
               t === 'workflow' ? 'Workflow' : 'AI ✦'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: Spacing.marginPage, gap: 14 }}>
        {/* ── Summary ── */}
        {tab === 'summary' && (
          <>
            <InfoCard label="Applicant" value={caseItem.owner_name ?? '—'} />
            <InfoCard label="Property ID" value={caseItem.property_id ?? '—'} />
            <InfoCard label="Zone" value={caseItem.zone ?? '—'} />
            <InfoCard label="Income bracket" value={caseItem.income_bracket ?? '—'} />
            <InfoCard label="Status" value={caseItem.status.toUpperCase()} highlight />
            <InfoCard label="Created" value={new Date(caseItem.created_at).toLocaleDateString('en-GB')} />
          </>
        )}

        {/* ── Documents ── */}
        {tab === 'documents' && (
          <>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={async () => {
                const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
                if (!result.canceled && result.assets[0]) {
                  const file = result.assets[0];
                  await documents.upload(id, { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/pdf' });
                  qc.invalidateQueries({ queryKey: ['docs', id] });
                }
              }}
            >
              <Text style={styles.uploadBtnText}>+ Upload document</Text>
            </TouchableOpacity>
            {docs.map((doc) => (
              <View key={doc.id} style={styles.docCard}>
                <Text style={styles.docName}>{doc.filename}</Text>
                {doc.extracted_data && (
                  <View style={styles.extractedFields}>
                    <Text style={styles.extractedLabel}>Extracted data</Text>
                    {Object.entries(doc.extracted_data).map(([k, v]) =>
                      v != null ? (
                        <Text key={k} style={styles.extractedRow}>
                          <Text style={styles.extractedKey}>{k}: </Text>{String(v)}
                        </Text>
                      ) : null
                    )}
                    {!doc.confirmed && (
                      <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={() => documents.confirmExtraction(doc.id)}
                      >
                        <Text style={styles.confirmBtnText}>Confirm extraction</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* ── Workflow ── */}
        {tab === 'workflow' && (
          <>
            {history.map((log, i) => (
              <View key={log.id} style={styles.logRow}>
                <View style={[styles.logDot, !log.exited_at && styles.logDotActive]} />
                {i < history.length - 1 && <View style={styles.logLine} />}
                <View style={styles.logContent}>
                  <Text style={styles.logPhase}>F{log.phase} — {PHASE_LABELS[log.phase]}</Text>
                  <Text style={styles.logDate}>{new Date(log.entered_at).toLocaleDateString('en-GB')}</Text>
                  {log.notes && <Text style={styles.logNotes}>{log.notes}</Text>}
                </View>
              </View>
            ))}

            {canAdvance && (
              <View style={styles.advanceCard}>
                <Text style={styles.advanceTitle}>Advance to phase {caseItem.current_phase + 1}</Text>
                <Text style={styles.advanceSub}>{PHASE_DESCRIPTIONS[caseItem.current_phase + 1]}</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Notes (optional)..."
                  placeholderTextColor={Colors.outline}
                  value={advanceNotes}
                  onChangeText={setAdvanceNotes}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={styles.advanceBtn}
                  onPress={() => {
                    Alert.alert(
                      'Confirm phase change',
                      `Move from phase ${caseItem.current_phase} to phase ${caseItem.current_phase + 1}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Confirm', onPress: () => advanceMutation.mutate(caseItem.current_phase + 1) },
                      ]
                    );
                  }}
                  disabled={advanceMutation.isPending}
                >
                  {advanceMutation.isPending
                    ? <ActivityIndicator color={Colors.onSecondary} size="small" />
                    : <Text style={styles.advanceBtnText}>Advance to phase {caseItem.current_phase + 1} →</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ── AI ── */}
        {tab === 'ai' && (
          <>
            <TouchableOpacity style={styles.aiBtn} onPress={() => fetchSummary()}>
              <Text style={styles.aiBtnText}>✦  Analyse case with AI</Text>
            </TouchableOpacity>
            {summaryLoading && (
              <View style={styles.skeletonBox}>
                <ActivityIndicator color={Colors.secondary} />
                <Text style={styles.skeletonText}>Analysing…</Text>
              </View>
            )}
            {summary && !summaryLoading && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>AI ANALYSIS</Text>
                <Text style={styles.summaryText}>{summary}</Text>
              </View>
            )}
            {BOTTLENECK_PHASES.includes(caseItem.current_phase) && (
              <View style={styles.bottleneckWarning}>
                <Text style={styles.bottleneckTitle}>⚠  High-risk delay phase</Text>
                <Text style={styles.bottleneckBody}>
                  Phase {caseItem.current_phase} historically experiences delays of{' '}
                  {caseItem.current_phase === 3 ? '2–4 weeks' : '4–8 weeks'} due to manual processing.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: Spacing.marginPage,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  backBtn: { paddingBottom: 2 },
  backArrow: { color: Colors.inversePrimary, fontSize: 22 },
  headerInfo: { flex: 1 },
  caseCode: { ...Typography.labelCaps, color: Colors.inversePrimary, marginBottom: 2 },
  caseTitle: { ...Typography.headlineSm, color: Colors.onPrimary },
  blockedBadge: { backgroundColor: Colors.error, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  blockedBadgeText: { ...Typography.labelCaps, color: Colors.onError, fontSize: 9 },
  phaseStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryContainer,
    paddingVertical: 14,
    paddingHorizontal: Spacing.marginPage,
    gap: 4,
  },
  phaseNode: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.onPrimaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseNodeDone: { backgroundColor: Colors.statusCompleted, borderColor: Colors.statusCompleted },
  phaseNodeActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary, width: 32, height: 32 },
  phaseNodeBottleneck: { backgroundColor: Colors.statusInReview, borderColor: Colors.statusInReview },
  phaseNodeText: { ...Typography.labelCaps, color: Colors.onPrimaryContainer, fontSize: 9 },
  phaseNodeTextDone: { color: Colors.onPrimary },
  phaseCurrentLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 8, backgroundColor: Colors.surfaceContainerLow },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.secondary },
  tabText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 9 },
  tabTextActive: { color: Colors.secondary },
  tabContent: { flex: 1 },
  infoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  infoValue: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'Inter_600SemiBold', textAlign: 'right', flex: 1, marginLeft: 12 },
  infoValueHighlight: { color: Colors.secondary },
  uploadBtn: {
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    padding: 16,
    alignItems: 'center',
  },
  uploadBtnText: { ...Typography.bodySm, color: Colors.secondary, fontFamily: 'Inter_600SemiBold' },
  docCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 10,
  },
  docName: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'Inter_600SemiBold' },
  extractedFields: { gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.outlineVariant },
  extractedLabel: { ...Typography.labelCaps, color: Colors.secondary, marginBottom: 4 },
  extractedRow: { ...Typography.bodySm, color: Colors.onSurface },
  extractedKey: { color: Colors.onSurfaceVariant },
  confirmBtn: { marginTop: 8, backgroundColor: Colors.secondary, borderRadius: BorderRadius.md, padding: 10, alignItems: 'center' },
  confirmBtnText: { ...Typography.bodySm, color: Colors.onSecondary, fontFamily: 'Inter_600SemiBold' },
  logRow: { flexDirection: 'row', gap: 12, minHeight: 48 },
  logDot: { width: 12, height: 12, borderRadius: BorderRadius.full, backgroundColor: Colors.statusCompleted, marginTop: 3, flexShrink: 0 },
  logDotActive: { backgroundColor: Colors.secondary, width: 14, height: 14 },
  logLine: { position: 'absolute', left: 5, top: 16, bottom: -14, width: 2, backgroundColor: Colors.outlineVariant },
  logContent: { flex: 1, paddingBottom: 16, gap: 2 },
  logPhase: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'Inter_600SemiBold' },
  logDate: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  logNotes: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },
  advanceCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.paddingCard,
    borderWidth: 1,
    borderColor: Colors.secondary,
    gap: 12,
    marginTop: 8,
  },
  advanceTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  advanceSub: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.md,
    padding: 12,
    ...Typography.bodySm,
    color: Colors.onSurface,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  advanceBtn: { backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg, padding: 14, alignItems: 'center' },
  advanceBtnText: { ...Typography.bodySm, color: Colors.onSecondary, fontFamily: 'Inter_600SemiBold' },
  aiBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.lg,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inversePrimary,
  },
  aiBtnText: { ...Typography.bodySm, color: Colors.inversePrimary, fontFamily: 'Inter_600SemiBold' },
  skeletonBox: { alignItems: 'center', padding: 32, gap: 12 },
  skeletonText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  summaryCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.paddingCard,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: Colors.outlineVariant,
    borderLeftColor: Colors.secondary,
    gap: 10,
    ...Elevation.activeCard,
  },
  summaryLabel: { ...Typography.labelCaps, color: Colors.secondary },
  summaryText: { ...Typography.bodyLg, color: Colors.onSurface, lineHeight: 26 },
  bottleneckWarning: {
    backgroundColor: Colors.statusInReviewBg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.statusInReview,
    borderRadius: BorderRadius.md,
    padding: 14,
    gap: 6,
  },
  bottleneckTitle: { ...Typography.bodySm, color: Colors.statusInReview, fontFamily: 'Inter_600SemiBold' },
  bottleneckBody: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
});
