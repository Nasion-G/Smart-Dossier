import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Paper, BorderRadius } from "../constants/design";
import type { CaseFileData, CaseFilePhase, PhaseStatus } from "../types";

// ── Stamp icon ───────────────────────────────────────────────────────────────
function PhaseStamp({ status }: { status: PhaseStatus }) {
  return (
    <View style={[stampStyles.base, stampStyles[status]]}>
      {status === "done" && <Text style={stampStyles.checkmark}>✓</Text>}
      {status === "active" && <View style={stampStyles.dot} />}
    </View>
  );
}

const stampStyles = StyleSheet.create({
  base: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  done: {
    backgroundColor: Paper.green,
    borderWidth: 2,
    borderColor: Paper.green,
    transform: [{ rotate: "-6deg" }],
  },
  checkmark: {
    color: Paper.white,
    fontSize: 14,
    fontWeight: "700",
    transform: [{ rotate: "6deg" }],
  },
  active: {
    backgroundColor: Paper.white,
    borderWidth: 2,
    borderColor: Paper.seal,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Paper.seal,
  },
  pending: {
    backgroundColor: Paper.white,
    borderWidth: 2,
    borderColor: Paper.line,
    borderStyle: "dashed",
  },
});

// ── Connecting thread ────────────────────────────────────────────────────────
function Thread({ status, isLast }: { status: PhaseStatus; isLast: boolean }) {
  if (isLast) return null;
  return (
    <View style={[threadStyles.base, status === "done" ? threadStyles.solid : threadStyles.dashed]} />
  );
}

const threadStyles = StyleSheet.create({
  base: {
    width: 2,
    flex: 1,
    minHeight: 18,
  },
  solid: {
    backgroundColor: Paper.green,
  },
  dashed: {
    // React Native doesn't support dashed borders natively on all platforms.
    // Use alternating colored/transparent segments as a close approximation.
    backgroundColor: Paper.line,
    opacity: 0.6,
  },
});

// ── Chevron ──────────────────────────────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <Text style={[chevronStyles.base, open && chevronStyles.open]}>▾</Text>
  );
}

const chevronStyles = StyleSheet.create({
  base: {
    width: 16,
    height: 16,
    fontSize: 12,
    color: Paper.slate,
    textAlign: "center",
    lineHeight: 16,
  },
  open: {
    transform: [{ rotate: "180deg" }],
  },
});

// ── PhaseRow ─────────────────────────────────────────────────────────────────
function PhaseRow({
  phase,
  isLast,
  defaultOpen,
}: {
  phase: CaseFilePhase;
  isLast: boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  const isPending = phase.status === "pending";

  return (
    <View style={phaseStyles.row}>
      {/* Left rail: stamp + thread */}
      <View style={phaseStyles.rail}>
        <PhaseStamp status={phase.status} />
        <Thread status={phase.status} isLast={isLast} />
      </View>

      {/* Content */}
      <View style={[phaseStyles.content, !isLast && phaseStyles.contentBorder]}>
        <TouchableOpacity
          onPress={toggle}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${phase.title} — ${phase.date}`}
          style={phaseStyles.head}
        >
          <View style={phaseStyles.headLeft}>
            <Text style={[phaseStyles.title, isPending && phaseStyles.titlePending]}>
              {phase.title}
            </Text>
            <Text style={phaseStyles.date}>{phase.date}</Text>
          </View>
          <Chevron open={open} />
        </TouchableOpacity>

        <Text style={phaseStyles.sub}>{phase.subtitle}</Text>

        {/* Expandable detail */}
        {open && (
          <View style={phaseStyles.detail}>
            <Text style={phaseStyles.detailText}>{phase.detail}</Text>
            {phase.officer !== "" && (
              <Text style={phaseStyles.officer}>{phase.officer}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const phaseStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  rail: {
    width: 36,
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingVertical: 22,
  },
  contentBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Paper.paperDim,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 32,
  },
  headLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 17,
    color: Paper.ink,
  },
  titlePending: {
    color: Paper.slate,
  },
  date: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 12,
    color: Paper.slate,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Paper.slate,
    marginTop: 4,
  },
  detail: {
    marginTop: 14,
    padding: 14,
    backgroundColor: Paper.paperDim,
    borderRadius: BorderRadius.lg,
  },
  detailText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    lineHeight: 21,
    color: Paper.inkSoft,
  },
  officer: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 11.5,
    color: Paper.slate,
    marginTop: 8,
  },
});

// ── PhaseTimeline ────────────────────────────────────────────────────────────
function PhaseTimeline({ phases }: { phases: CaseFilePhase[] }) {
  // First "active" phase opens by default
  const activeIdx = phases.findIndex((p) => p.status === "active");

  return (
    <View style={timelineStyles.root}>
      {phases.map((phase, i) => (
        <PhaseRow
          key={phase.id}
          phase={phase}
          isLast={i === phases.length - 1}
          defaultOpen={i === activeIdx}
        />
      ))}
    </View>
  );
}

const timelineStyles = StyleSheet.create({
  root: {
    backgroundColor: Paper.white,
    borderWidth: 1,
    borderColor: Paper.line,
    borderRadius: 10,
    marginTop: 18,
    paddingHorizontal: 26,
    paddingVertical: 6,
  },
});

// ── ProgressBar ──────────────────────────────────────────────────────────────
function ProgressBar({
  completed,
  total,
  estimated,
}: {
  completed: number;
  total: number;
  estimated: string;
}) {
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <View style={progressStyles.root}>
      <View style={progressStyles.track}>
        <View style={[progressStyles.fill, { width: `${pct}%` as `${number}%` }]} />
      </View>
      <View style={progressStyles.caption}>
        <Text style={progressStyles.captionText}>
          {completed} of {total} phases complete
        </Text>
        <Text style={progressStyles.captionText}>
          Est. completion: {estimated}
        </Text>
      </View>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  root: {
    marginTop: 22,
    marginBottom: 4,
  },
  track: {
    height: 4,
    backgroundColor: Paper.paperDim,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: Paper.green,
    borderRadius: 2,
  },
  caption: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
  },
  captionText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 11.5,
    color: Paper.slate,
  },
});

// ── StatusPill ───────────────────────────────────────────────────────────────
function StatusPill({ label }: { label: string }) {
  return (
    <View style={pillStyles.root}>
      <View style={pillStyles.dot} />
      <Text style={pillStyles.label}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Paper.sealSoft,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Paper.seal,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#7A5A22",
  },
});

// ── CaseHeader ───────────────────────────────────────────────────────────────
function CaseHeader({ data }: { data: CaseFileData }) {
  return (
    <View style={headerStyles.folder}>
      {/* Folder tab */}
      <View style={headerStyles.tab}>
        <Text style={headerStyles.tabLeft}>Case File</Text>
        <Text style={headerStyles.tabRight}>Republic Citizen Portal</Text>
      </View>

      <View style={headerStyles.body}>
        <Text style={headerStyles.caseType}>{data.caseType}</Text>
        <Text style={headerStyles.title}>{data.title}</Text>
        <StatusPill label={data.statusLabel} />

        <View style={headerStyles.metaRow}>
          <MetaItem label="Case Number" value={data.caseNumber} />
          <MetaItem label="Filed By" value={data.filedBy} />
          <MetaItem label="Date Filed" value={data.dateFiled} />
          <MetaItem label="Department" value={data.department} />
        </View>

        <ProgressBar
          completed={data.phasesCompleted}
          total={data.phasesTotal}
          estimated={data.estimatedCompletion}
        />
      </View>
    </View>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={headerStyles.metaItem}>
      <Text style={headerStyles.metaLabel}>{label}</Text>
      <Text style={headerStyles.metaValue}>{value}</Text>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  folder: {
    backgroundColor: Paper.white,
    borderWidth: 1,
    borderColor: Paper.line,
    borderRadius: 10,
    overflow: "hidden",
  },
  tab: {
    backgroundColor: Paper.ink,
    paddingHorizontal: 22,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabLeft: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: Paper.paper,
  },
  tabRight: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: "#A9B4CC",
  },
  body: {
    padding: 24,
  },
  caseType: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: Paper.seal,
    marginBottom: 6,
  },
  title: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 26,
    lineHeight: 32,
    color: Paper.ink,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Paper.line,
    borderStyle: "dashed",
  },
  metaItem: {
    minWidth: 120,
  },
  metaLabel: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: Paper.slate,
    marginBottom: 3,
  },
  metaValue: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 13.5,
    color: Paper.ink,
  },
});

// ── NextStepBanner ───────────────────────────────────────────────────────────
function NextStepBanner({
  heading,
  body,
  actionPrimary,
  actionSecondary,
}: {
  heading: string;
  body: string;
  actionPrimary?: { label: string; onPress?: () => void };
  actionSecondary?: { label: string; onPress?: () => void };
}) {
  return (
    <>
      <View style={nextStyles.box}>
        <Text style={nextStyles.eyebrow}>{heading}</Text>
        <Text style={nextStyles.body}>{body}</Text>
      </View>

      {(actionPrimary || actionSecondary) && (
        <View style={nextStyles.actions}>
          {actionSecondary && (
            <TouchableOpacity
              style={nextStyles.btn}
              activeOpacity={0.7}
              onPress={actionSecondary.onPress}
              accessibilityRole="button"
              accessibilityLabel={actionSecondary.label}
            >
              <Text style={nextStyles.btnText}>{actionSecondary.label}</Text>
            </TouchableOpacity>
          )}
          {actionPrimary && (
            <TouchableOpacity
              style={[nextStyles.btn, nextStyles.btnPrimary]}
              activeOpacity={0.7}
              onPress={actionPrimary.onPress}
              accessibilityRole="button"
              accessibilityLabel={actionPrimary.label}
            >
              <Text style={[nextStyles.btnText, nextStyles.btnPrimaryText]}>
                {actionPrimary.label}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
}

const nextStyles = StyleSheet.create({
  box: {
    marginTop: 18,
    backgroundColor: Paper.ink,
    borderRadius: 10,
    padding: 20,
  },
  eyebrow: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: Paper.sealSoft,
    marginBottom: 8,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: "#E7E5DC",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    flexWrap: "wrap",
  },
  btn: {
    flex: 1,
    minWidth: 150,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Paper.line,
    backgroundColor: Paper.white,
    alignItems: "center",
  },
  btnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13.5,
    color: Paper.ink,
  },
  btnPrimary: {
    backgroundColor: Paper.ink,
    borderColor: Paper.ink,
  },
  btnPrimaryText: {
    color: Paper.paper,
  },
});

// ── Main component ───────────────────────────────────────────────────────────
export default function CaseFileView({
  caseData,
}: {
  caseData: CaseFileData;
}) {
  return (
    <ScrollView
      style={rootStyles.scroll}
      contentContainerStyle={rootStyles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={rootStyles.wrap}>
        <CaseHeader data={caseData} />
        <PhaseTimeline phases={caseData.phases} />
        <NextStepBanner
          heading={caseData.nextStepHeading}
          body={caseData.nextStepBody}
          actionPrimary={caseData.actionPrimary}
          actionSecondary={caseData.actionSecondary}
        />
      </View>
    </ScrollView>
  );
}

const rootStyles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Paper.paper,
  },
  content: {
    paddingBottom: 60,
  },
  wrap: {
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 28,
  },
});
