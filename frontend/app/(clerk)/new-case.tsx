import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { cases, auth } from "../api/services";
import { Colors, Typography, Spacing, BorderRadius } from "../constants/design";

/** Normalize FastAPI error detail (string or Pydantic ValidationError array) to a string. */
function errMsg(e: any, fallback: string): string {
  const d = e?.response?.data?.detail;
  if (!d) return fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d.length > 0) {
    return d.map((item: any) => item.msg ?? JSON.stringify(item)).join("; ");
  }
  return fallback;
}

/** Map an extracted address string to a ZONE_OPTIONS entry using keyword heuristics. */
function matchZone(extractedZone: string): string | null {
  const z = extractedZone.toLowerCase();
  // Zone 1 - Center: addresses in Tirana city center, boulevards, squares
  if (/\b(tiran[aeë]|qend[ëe]r|bulevard|shesh|pallat)\b/.test(z)) return ZONE_OPTIONS[0];
  // Zone 2 - Suburb: outskirts, suburban areas
  if (/\b(periferi|jasht[ëe]|unaz[ëe]|kombinat|suburb)\b/.test(z)) return ZONE_OPTIONS[1];
  // Zone 3 - Village: rural areas, villages
  if (/\b(fshat|katund|vil[ëe]|komun[ëe]|rural)\b/.test(z)) return ZONE_OPTIONS[2];
  // Zone 4 - Industrial: industrial zones, factories
  if (/\b(industrial|fabrik[ëe]|zon[ëe] industriale|magazin[ëe])\b/.test(z)) return ZONE_OPTIONS[3];
  return null;
}


const INCOME_OPTIONS = [
  "Category A (0-30,000 ALL)",
  "Category B (30,001-60,000 ALL)",
  "Category C (60,001+ ALL)",
];
const ZONE_OPTIONS = [
  "Zone 1 - Center",
  "Zone 2 - Suburb",
  "Zone 3 - Village",
  "Zone 4 - Industrial",
];
const PHASE_OPTIONS = [
  "Phase 1 — Public Notice",
  "Phase 2 — Document Collection",
  "Phase 3 — Verification",
  "Phase 4 — Field Inspection",
  "Phase 5 — Draft Decision",
  "Phase 6 — Final Decision",
  "Phase 7 — Completed",
];

export default function NewCaseScreen() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [zone, setZone] = useState("");
  const [incomeBracket, setIncomeBracket] = useState("");
  const [startingPhase, setStartingPhase] = useState(1);
  // ── PDF upload + autofill state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedFileName, setExtractedFileName] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  const handlePickAndExtract = async () => {
    setExtractError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/png", "image/jpeg"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      setExtractedFileName(file.name);
      setIsExtracting(true);
      const fields = await cases.extractFields({
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? "application/pdf",
      });
      // Auto-fill form fields from extracted data
      if (fields.owner_name && !ownerName.trim()) setOwnerName(fields.owner_name);
      if (fields.property_id && !propertyId.trim()) setPropertyId(fields.property_id);
      if (fields.zone && !zone) {
        const match = matchZone(fields.zone);
        if (match) setZone(match);
      }
      if (fields.income_bracket && !incomeBracket) {
        // Match on category letter (A/B/C) — handles "Kategoria B" vs "Category B"
        const letter = fields.income_bracket.match(/\b([A-C])\b/i)?.[1]?.toUpperCase();
        const match = letter
          ? INCOME_OPTIONS.find((o) => o.toUpperCase().includes(`CATEGORY ${letter}`))
          : INCOME_OPTIONS.find((o) =>
              o.toLowerCase().includes(fields.income_bracket!.toLowerCase())
            );
        if (match) setIncomeBracket(match);
      }
      if (!title.trim() && fields.owner_name && fields.zone) {
        setTitle(`${fields.owner_name} — ${fields.zone}`);
      } else if (!title.trim() && fields.owner_name) {
        setTitle(fields.owner_name);
      }
      if (fields.phase && fields.phase >= 1 && fields.phase <= 7) {
        setStartingPhase(fields.phase);
      }
    } catch (e: any) {
      setExtractError(errMsg(e, "Extraction failed. Try typing fields manually."));
    } finally {
      setIsExtracting(false);
    }
  };

  // Citizen account linking
  const [citizenEmail, setCitizenEmail] = useState("");
  const [linkedCitizenId, setLinkedCitizenId] = useState<string | null>(null);
  const [linkedCitizenName, setLinkedCitizenName] = useState<string | null>(
    null,
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const handleLookup = async () => {
    const email = citizenEmail.trim();
    if (!email) return;
    setLookupError(null);
    setIsLookingUp(true);
    try {
      const user = await auth.lookupUser(email);
      setLinkedCitizenId(user.id);
      setLinkedCitizenName(user.full_name);
      if (!ownerName.trim()) {
        setOwnerName(user.full_name);
      }
    } catch (e: any) {
      setLookupError(errMsg(e, "No user found with that email"));
      setLinkedCitizenId(null);
      setLinkedCitizenName(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleClearLink = () => {
    setCitizenEmail("");
    setLinkedCitizenId(null);
    setLinkedCitizenName(null);
    setLookupError(null);
  };

  const mutation = useMutation({
    mutationFn: () =>
      cases.create({
        title,
        owner_name: ownerName,
        property_id: propertyId,
        zone,
        income_bracket: incomeBracket,
        citizen_id: linkedCitizenId ?? undefined,
        starting_phase: startingPhase,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      Alert.alert("Case created", `Code: ${data.code}`, [
        {
          text: "View case",
          onPress: () =>
            router.push({
              pathname: "/(clerk)/case-detail",
              params: { id: data.id },
            }),
        },
        { text: "Back", onPress: () => router.replace("/(clerk)/dashboard") },
      ]);
    },
    onError: (e: any) => {
      Alert.alert("Error", errMsg(e, "Could not create case. Please try again."));
    },
  });

  const canSubmit = title.trim().length >= 3 && ownerName.trim().length >= 2;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Case</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            The case will be automatically created in Phase 1 (Public Notice)
            and assigned a unique EKB code.
          </Text>
        </View>

        {/* PDF Upload + Autofill */}
        <View style={styles.extractCard}>
          <View style={styles.extractHeader}>
            <Text style={styles.extractIcon}>{"📄"}</Text>
            <View style={styles.extractInfo}>
              <Text style={styles.extractTitle}>Auto-fill from PDF</Text>
              <Text style={styles.extractHint}>
                Upload a property document — fields are extracted automatically.
              </Text>
            </View>
          </View>
          {extractedFileName && !extractError ? (
            <View style={styles.extractSuccess}>
              <Text style={styles.extractSuccessIcon}>{"✓"}</Text>
              <Text style={styles.extractSuccessText}>
                {extractedFileName} — fields populated below
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setExtractedFileName(null);
                  setExtractError(null);
                }}
                style={styles.extractClear}
              >
                <Text style={styles.extractClearText}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : extractError ? (
            <View style={styles.extractErrorRow}>
              <Text style={styles.extractErrorText}>{extractError}</Text>
              <TouchableOpacity onPress={() => setExtractError(null)} style={styles.extractRetry}>
                <Text style={styles.extractRetryText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.extractBtn, isExtracting && styles.extractBtnDisabled]}
            onPress={handlePickAndExtract}
            disabled={isExtracting}
            activeOpacity={0.85}
          >
            {isExtracting ? (
              <>
                <ActivityIndicator size="small" color={Colors.onSecondary} />
                <Text style={styles.extractBtnText}>Extracting…</Text>
              </>
            ) : (
              <Text style={styles.extractBtnText}>
                {extractedFileName ? "↻ Pick another PDF" : "Choose PDF"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Citizen Account Link */}
        <View style={styles.citizenLinkCard}>
          <Text style={styles.citizenLinkLabel}>Link to Citizen Account</Text>
          <Text style={styles.citizenLinkHint}>
            Optional — ties the case to a citizen's account so they can track
            it.
          </Text>
          {!linkedCitizenId ? (
            <View style={styles.citizenLookupRow}>
              <TextInput
                style={styles.citizenEmailInput}
                value={citizenEmail}
                onChangeText={(t) => {
                  setCitizenEmail(t);
                  setLookupError(null);
                }}
                placeholder="citizen@email.com"
                placeholderTextColor={Colors.outline}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLookingUp}
              />
              <TouchableOpacity
                style={[
                  styles.findBtn,
                  (!citizenEmail.trim() || isLookingUp) &&
                    styles.findBtnDisabled,
                ]}
                onPress={handleLookup}
                disabled={!citizenEmail.trim() || isLookingUp}
                activeOpacity={0.7}
              >
                {isLookingUp ? (
                  <ActivityIndicator size="small" color={Colors.onSecondary} />
                ) : (
                  <Text style={styles.findBtnText}>Find</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.linkedRow}>
              <View style={styles.linkedInfo}>
                <Text style={styles.linkedIcon}>{"✓"}</Text>
                <Text style={styles.linkedName}>{linkedCitizenName}</Text>
              </View>
              <TouchableOpacity
                onPress={handleClearLink}
                style={styles.clearLinkBtn}
              >
                <Text style={styles.clearLinkText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
          {lookupError && <Text style={styles.lookupError}>{lookupError}</Text>}
        </View>

        <Field label="Case Title *" hint="e.g. Hoxha Family - Apt 4B, Block">
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Case title"
            placeholderTextColor={Colors.outline}
          />
        </Field>

        <Field label="Applicant Name *" hint="Full legal name of the owner">
          <TextInput
            style={styles.input}
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="Full Name"
            placeholderTextColor={Colors.outline}
          />
        </Field>

        <Field
          label="Property ID"
          hint="Cadastral number or Property ID from ASHK"
        >
          <TextInput
            style={styles.input}
            value={propertyId}
            onChangeText={setPropertyId}
            placeholder="e.g. TI-2024-00123"
            placeholderTextColor={Colors.outline}
            autoCapitalize="characters"
          />
        </Field>

        <Field label="Zone">
          <View style={styles.optionGrid}>
            {ZONE_OPTIONS.map((z) => (
              <TouchableOpacity
                key={z}
                style={[styles.optionBtn, zone === z && styles.optionBtnActive]}
                onPress={() => setZone(zone === z ? "" : z)}
              >
                <Text
                  style={[
                    styles.optionText,
                    zone === z && styles.optionTextActive,
                  ]}
                  numberOfLines={2}
                >
                  {z}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Income Category">
          {INCOME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.radioRow,
                incomeBracket === opt && styles.radioRowActive,
              ]}
              onPress={() => setIncomeBracket(incomeBracket === opt ? "" : opt)}
            >
              <View
                style={[
                  styles.radioCircle,
                  incomeBracket === opt && styles.radioCircleActive,
                ]}
              >
                {incomeBracket === opt && <View style={styles.radioDot} />}
              </View>
              <Text
                style={[
                  styles.radioText,
                  incomeBracket === opt && styles.radioTextActive,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </Field>

        <Field label="Starting Phase" hint="AI-detected from PDF or manual override">
          <View style={styles.phaseGrid}>
            {PHASE_OPTIONS.map((label, i) => {
              const phaseNum = i + 1;
              const active = startingPhase === phaseNum;
              return (
                <TouchableOpacity
                  key={phaseNum}
                  style={[styles.phaseBtn, active && styles.phaseBtnActive]}
                  onPress={() => setStartingPhase(phaseNum)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.phaseBtnText, active && styles.phaseBtnTextActive]}>
                    {phaseNum}
                  </Text>
                  <Text
                    style={[styles.phaseBtnLabel, active && styles.phaseBtnLabelActive]}
                    numberOfLines={2}
                  >
                    {label.replace(/^Phase \d+ — /, "")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!canSubmit || mutation.isPending) && styles.submitBtnDisabled,
          ]}
          onPress={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          activeOpacity={0.85}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={Colors.onSecondary} />
          ) : (
            <Text style={styles.submitBtnText}>Create Case →</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.requiredNote}>* Required fields</Text>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
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
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
  },
  backBtn: { paddingBottom: 2 },
  backArrow: { color: Colors.inversePrimary, fontSize: 22 },
  headerTitle: { ...Typography.headlineMdMobile, color: Colors.onPrimary },
  content: {
    padding: Spacing.marginPage,
    gap: Spacing.stackMd,
    paddingBottom: 48,
  },
  infoBox: {
    backgroundColor: Colors.statusOnTrackBg,
    borderRadius: BorderRadius.md,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  infoText: { ...Typography.bodySm, color: Colors.secondary, lineHeight: 20 },
  // Citizen link card
  citizenLinkCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 14,
    gap: 8,
  },
  citizenLinkLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  citizenLinkHint: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
  },
  citizenLookupRow: { flexDirection: "row", gap: 8 },
  citizenEmailInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    ...Typography.bodyLg,
    color: Colors.onSurface,
    backgroundColor: Colors.background,
  },
  findBtn: {
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  findBtnDisabled: { opacity: 0.5 },
  findBtnText: {
    ...Typography.labelCaps,
    color: Colors.onSecondary,
    fontSize: 13,
  },
  linkedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.statusOnTrackBg,
    borderRadius: BorderRadius.md,
    padding: 10,
  },
  linkedInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  linkedIcon: { color: Colors.statusCompleted, fontSize: 16 },
  linkedName: { ...Typography.bodyLg, color: Colors.onSurface },
  clearLinkBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  clearLinkText: { ...Typography.bodySm, color: Colors.error, fontSize: 13 },
  lookupError: { ...Typography.bodySm, color: Colors.error, fontSize: 12 },
  // Form fields
  field: { gap: 6 },
  fieldLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  fieldHint: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: -2,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    ...Typography.bodyLg,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    flex: 1,
    minWidth: "45%",
  },
  optionBtnActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.statusOnTrackBg,
  },
  optionText: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    textAlign: "center",
  },
  optionTextActive: {
    color: Colors.secondary,
    fontFamily: "Inter_600SemiBold",
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  radioRowActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.statusOnTrackBg,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: { borderColor: Colors.secondary },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  radioText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, flex: 1 },
  radioTextActive: { color: Colors.secondary, fontFamily: "Inter_600SemiBold" },
  submitBtn: {
    height: 54,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: {
    ...Typography.headlineSm,
    color: Colors.onSecondary,
    fontSize: 16,
  },
  requiredNote: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    textAlign: "center",
  },
  // ── PDF Extract card
  extractCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 14,
    gap: 10,
  },
  extractHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  extractIcon: { fontSize: 22 },
  extractInfo: { flex: 1, gap: 2 },
  extractTitle: { ...Typography.bodyLg, color: Colors.onSurface, fontFamily: "Inter_600SemiBold" },
  extractHint: { ...Typography.bodySm, color: Colors.onSurfaceVariant, fontSize: 12 },
  extractSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.statusCompletedBg,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  extractSuccessIcon: { color: Colors.statusCompleted, fontSize: 14 },
  extractSuccessText: {
    flex: 1,
    ...Typography.bodySm,
    color: Colors.statusCompleted,
    fontSize: 12,
  },
  extractClear: { paddingHorizontal: 8, paddingVertical: 4 },
  extractClearText: { ...Typography.bodySm, color: Colors.statusCompleted, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  extractErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.errorContainer,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  extractErrorText: { flex: 1, ...Typography.bodySm, color: Colors.error, fontSize: 12 },
  extractRetry: { paddingHorizontal: 8, paddingVertical: 4 },
  extractRetryText: { ...Typography.bodySm, color: Colors.onErrorContainer, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  extractBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 40,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
  },
  extractBtnDisabled: { opacity: 0.6 },
  extractBtnText: {
    ...Typography.labelCaps,
    color: Colors.onSecondary,
    fontSize: 13,
  },
  // ── Phase picker
  phaseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  phaseBtn: {
    width: "30%",
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: "center",
    gap: 2,
  },
  phaseBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.statusOnTrackBg,
  },
  phaseBtnText: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    fontSize: 14,
  },
  phaseBtnTextActive: { color: Colors.primary },
  phaseBtnLabel: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 12,
  },
  phaseBtnLabelActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
});
