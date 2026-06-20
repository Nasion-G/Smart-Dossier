import { Platform } from "react-native";

export const Colors = {
  primary: "#1B2A4A",
  primaryContainer: "#2C3E63",
  onPrimary: "#ffffff",
  onPrimaryContainer: "#A9B4CC",
  inversePrimary: "#E9D9B8",
  secondary: "#B8863B",
  secondaryContainer: "#E9D9B8",
  onSecondary: "#ffffff",
  onSecondaryContainer: "#7A5A22",
  background: "#FBFAF7",
  surface: "#FBFAF7",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#F1EDE3",
  surfaceContainer: "#EDE8DC",
  surfaceContainerHigh: "#E8E3D6",
  surfaceContainerHighest: "#E3DED1",
  onSurface: "#1B2A4A",
  onSurfaceVariant: "#5B6478",
  outline: "#8B8A82",
  outlineVariant: "#DAD5C8",
  error: "#B0492F",
  onError: "#ffffff",
  errorContainer: "#F1EDE3",
  onErrorContainer: "#7A2A1A",
  statusCompleted: "#2F6E5C",
  statusCompletedBg: "#DCE9E2",
  statusInReview: "#B8863B",
  statusInReviewBg: "#E9D9B8",
  statusBlocked: "#B0492F",
  statusBlockedBg: "#F5E2DC",
  statusOnTrack: "#2F6E5C",
  statusOnTrackBg: "#DCE9E2",
};

export const Typography = {
  displayLg: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 36,
  },

  headlineMd: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 24,
  },

  headlineSm: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 18,
  },

  headlineMdMobile: {
    fontFamily: "HankenGrotesk_600SemiBold",
    fontSize: 20,
  },

  bodyLg: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },

  bodySm: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },

  labelCaps: {
    fontFamily: "JetBrainsMono_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
};

export const Spacing = {
  marginPage: 20,
  gutterGrid: 12,
  paddingCard: 16,
  stackSm: 8,
  stackMd: 16,
  stackLg: 24,
};

export const BorderRadius = {
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  full: 9999,
};

export const Elevation = {
  card: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    default: {},
  }),
  activeCard: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
    default: {},
  }),
};

export const PHASE_LABELS: Record<number, string> = {
  1: "Public Notice",
  2: "Application",
  3: "ASHK Verification",
  4: "Valuation",
  5: "Contract Signing",
  6: "Submission to ASHK",
  7: "Property Registration",
};

export const PHASE_DESCRIPTIONS: Record<number, string> = {
  1: "EKB publishes the public notice",
  2: "Citizen submits physical documents",
  3: "Manual verification with ASHK (2–4 weeks)",
  4: "Manual value calculation with Excel",
  5: "Physical contract signing",
  6: "Physical file sent to ASHK (4–8 weeks)",
  7: "ASHK registers ownership",
};

// Known slow phases — this is workflow domain knowledge (used e.g. to label
// the phase filter chips and dashboard copy), NOT a per-case status. Don't
// use this to color an individual case/card — use getCaseStatusVisual below,
// which reflects what's actually happening with that specific case.
export const BOTTLENECK_PHASES = [3, 6];

// ─── Dynamic status → color mapping ────────────────────────────────────────
// A single source of truth for "what color should this case's status badge
// be", driven entirely by the case's own computed fields (status / is_blocked)
// rather than a static lookup keyed off the phase number. Use this anywhere
// you're rendering a status indicator for a specific case (list rows, kanban
// cards, badges) so the color always matches reality instead of just "this
// phase is usually slow".
export type CaseStatusKey = "completed" | "blocked" | "active";

export interface CaseStatusVisual {
  key: CaseStatusKey;
  fg: string;
  bg: string;
  label: string;
}

export function getCaseStatusVisual(caseItem: {
  status: string;
  is_blocked: boolean;
}): CaseStatusVisual {
  if (caseItem.status === "completed") {
    return {
      key: "completed",
      fg: Colors.statusCompleted,
      bg: Colors.statusCompletedBg,
      label: "Completed",
    };
  }
  if (caseItem.is_blocked) {
    return {
      key: "blocked",
      fg: Colors.statusBlocked,
      bg: Colors.statusBlockedBg,
      label: "Blocked",
    };
  }
  return {
    key: "active",
    fg: Colors.statusOnTrack,
    bg: Colors.statusOnTrackBg,
    label: "On Track",
  };
}

// ── Citizen / Case File palette (warm, paper-based aesthetic) ─────────────
// Used by CaseFileView and gradually adopted across all clerk UIs.
export const Paper = {
  ink: "#1B2A4A",
  inkSoft: "#2C3E63",
  paper: "#FBFAF7",
  paperDim: "#F1EDE3",
  slate: "#5B6478",
  seal: "#B8863B",
  sealSoft: "#E9D9B8",
  green: "#2F6E5C",
  greenSoft: "#DCE9E2",
  rust: "#B0492F",
  line: "#DAD5C8",
  white: "#FFFFFF",
} as const;
