import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { cases } from '../api/services';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/design';

const INCOME_OPTIONS = ['Category A (0–30,000 ALL)', 'Category B (30,001–60,000 ALL)', 'Category C (60,001+ ALL)'];
const ZONE_OPTIONS = ['Zone 1 – Center', 'Zone 2 – Suburb', 'Zone 3 – Village', 'Zone 4 – Industrial'];

export default function NewCaseScreen() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [zone, setZone] = useState('');
  const [incomeBracket, setIncomeBracket] = useState('');

  const mutation = useMutation({
    mutationFn: () => cases.create({ title, owner_name: ownerName, property_id: propertyId, zone, income_bracket: incomeBracket }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['cases'] });
      Alert.alert('Case created', `Code: ${data.code}`, [
        { text: 'View case', onPress: () => router.push({ pathname: '/(clerk)/case-detail', params: { id: data.id } }) },
        { text: 'Back', onPress: () => router.replace('/(clerk)/dashboard') },
      ]);
    },
    onError: (e: any) => {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Could not create case. Please try again.');
    },
  });

  const canSubmit = title.trim().length >= 3 && ownerName.trim().length >= 2;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Case</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.infoBox}>
            The case will be automatically created in Phase 1 (Public Notice) and assigned a unique EKB code.
        </View>

        <Field label="Case Title *" hint="e.g. Hoxha Family – Apt 4B, Block">
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Case title" placeholderTextColor={Colors.outline} />
        </Field>

        <Field label="Applicant Name *" hint="Full legal name of the owner">
          <TextInput style={styles.input} value={ownerName} onChangeText={setOwnerName} placeholder="Full Name" placeholderTextColor={Colors.outline} />
        </Field>

        <Field label="Property ID" hint="Cadastral number or Property ID from ASHK">
          <TextInput style={styles.input} value={propertyId} onChangeText={setPropertyId} placeholder="e.g. TI-2024-00123" placeholderTextColor={Colors.outline} autoCapitalize="characters" />
        </Field>

        <Field label="Zone">
          <View style={styles.optionGrid}>
            {ZONE_OPTIONS.map(z => (
              <TouchableOpacity
                key={z}
                style={[styles.optionBtn, zone === z && styles.optionBtnActive]}
                onPress={() => setZone(zone === z ? '' : z)}
              >
                <Text style={[styles.optionText, zone === z && styles.optionTextActive]} numberOfLines={2}>
                  {z}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Income Category">
          {INCOME_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.radioRow, incomeBracket === opt && styles.radioRowActive]}
              onPress={() => setIncomeBracket(incomeBracket === opt ? '' : opt)}
            >
              <View style={[styles.radioCircle, incomeBracket === opt && styles.radioCircleActive]}>
                {incomeBracket === opt && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.radioText, incomeBracket === opt && styles.radioTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </Field>

        <TouchableOpacity
          style={[styles.submitBtn, (!canSubmit || mutation.isPending) && styles.submitBtnDisabled]}
          onPress={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          activeOpacity={0.85}
        >
          {mutation.isPending
            ? <ActivityIndicator color={Colors.onSecondary} />
            : <Text style={styles.submitBtnText}>Create Case →</Text>
          }
        </TouchableOpacity>

        <Text style={styles.requiredNote}>* Required fields</Text>
      </ScrollView>
    </View>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.select({ ios: 60, default: 48 }),
    paddingBottom: 18,
    paddingHorizontal: Spacing.marginPage,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  backBtn: { paddingBottom: 2 },
  backArrow: { color: Colors.inversePrimary, fontSize: 22 },
  headerTitle: { ...Typography.headlineMdMobile, color: Colors.onPrimary },
  content: { padding: Spacing.marginPage, gap: Spacing.stackMd, paddingBottom: 48 },
  infoBox: { backgroundColor: Colors.statusOnTrackBg, borderRadius: BorderRadius.md, padding: 14, borderLeftWidth: 4, borderLeftColor: Colors.secondary },
  infoText: { ...Typography.bodySm, color: Colors.secondary, lineHeight: 20 },
  field: { gap: 6 },
  fieldLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  fieldHint: { ...Typography.bodySm, color: Colors.onSurfaceVariant, fontSize: 12, marginTop: -2 },
  input: { height: 48, borderWidth: 1, borderColor: Colors.outlineVariant, borderRadius: BorderRadius.lg, paddingHorizontal: 14, ...Typography.bodyLg, color: Colors.onSurface, backgroundColor: Colors.surfaceContainerLowest },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest, flex: 1, minWidth: '45%' },
  optionBtnActive: { borderColor: Colors.secondary, backgroundColor: Colors.statusOnTrackBg },
  optionText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, fontSize: 12, textAlign: 'center' },
  optionTextActive: { color: Colors.secondary, fontFamily: 'Inter_600SemiBold' },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest },
  radioRowActive: { borderColor: Colors.secondary, backgroundColor: Colors.statusOnTrackBg },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.outlineVariant, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: Colors.secondary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.secondary },
  radioText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, flex: 1 },
  radioTextActive: { color: Colors.secondary, fontFamily: 'Inter_600SemiBold' },
  submitBtn: { height: 54, backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { ...Typography.headlineSm, color: Colors.onSecondary, fontSize: 16 },
  requiredNote: { ...Typography.bodySm, color: Colors.onSurfaceVariant, fontSize: 12, textAlign: 'center' },
});

import { Platform } from 'react-native';
