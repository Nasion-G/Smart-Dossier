import { format } from "date-fns";
import type { Case, PhaseLog, CaseFileData, CaseFilePhase } from "../types";
import { PHASE_LABELS, PHASE_DESCRIPTIONS } from "./design";

function statusLabel(c: Case): string {
  if (c.status === "completed") return "Completed";
  if (c.is_blocked) return "Blocked";
  return "Under Review";
}

function formatDate(iso: string): string {
  return format(new Date(iso), "d MMM yyyy");
}

const OFFICER_DEFAULT: Record<number, string> = {
  1: "Logged by — System",
  2: "Verified by — Records Clerk",
  3: "Assigned to — Zoning Officer",
  4: "Assigned to — Valuation Officer",
  5: "Assigned to — Contract Officer",
  6: "Assigned to — Submission Officer",
  7: "Assigned to — Registration Officer",
};

function buildPhases(c: Case, logs: PhaseLog[]): CaseFilePhase[] {
  const logByPhase = new Map<number, PhaseLog>();
  for (const l of logs) logByPhase.set(l.phase, l);

  const phases: CaseFilePhase[] = [];
  for (let i = 1; i <= 7; i++) {
    const log = logByPhase.get(i);
    let status: "done" | "active" | "pending";
    if (c.status === "completed" && i <= c.current_phase) status = "done";
    else if (i < c.current_phase) status = "done";
    else if (i === c.current_phase) status = "active";
    else status = "pending";

    const dateStr = log?.entered_at
      ? formatDate(log.entered_at)
      : status === "pending"
        ? "Not started"
        : status === "active"
          ? "In progress"
          : "";

    const subtitle =
      status === "done"
        ? `Phase completed${log?.exited_at ? ` on ${formatDate(log.exited_at)}` : ""}.`
        : status === "active"
          ? `Currently in progress — ${c.days_in_phase} day${c.days_in_phase !== 1 ? "s" : ""} elapsed.`
          : "Not yet started.";

    const officer = log?.notes || OFFICER_DEFAULT[i] || "";

    phases.push({
      id: i - 1, // 0-based for UI indexing
      title: PHASE_LABELS[i] ?? `Phase ${i}`,
      subtitle,
      date: dateStr,
      status,
      detail: PHASE_DESCRIPTIONS[i] ?? "",
      officer,
    });
  }
  return phases;
}

function nextStep(c: Case): { heading: string; body: string } {
  if (c.status === "completed") {
    return {
      heading: "Case complete",
      body: "All phases have been completed. Your property registration is finalised. No further action is needed.",
    };
  }
  if (c.is_blocked) {
    return {
      heading: "Action needed",
      body: `Your case is currently blocked at phase ${c.current_phase} (${PHASE_LABELS[c.current_phase] ?? ""}). A case officer will contact you with next steps. You may also reach out to the EKB office for assistance.`,
    };
  }
  const label = PHASE_LABELS[c.current_phase] ?? `Phase ${c.current_phase}`;
  return {
    heading: "What happens next",
    body: `Your case is in the "${label}" phase. The assigned officer is processing your file. You'll be notified here and by email when there is an update.`,
  };
}

export function buildCaseFileData(c: Case, logs: PhaseLog[]): CaseFileData {
  const phases = buildPhases(c, logs);
  const step = nextStep(c);

  return {
    caseType: "Privatization Application",
    title: c.title,
    caseNumber: c.code,
    filedBy: c.owner_name ?? "Citizen",
    dateFiled: formatDate(c.created_at),
    department: c.zone ?? "EKB",
    statusLabel: statusLabel(c),
    phases,
    phasesCompleted: c.status === "completed" ? 7 : c.current_phase - 1,
    phasesTotal: 7,
    estimatedCompletion: c.status === "completed"
      ? "Completed"
      : "Pending",
    nextStepHeading: step.heading,
    nextStepBody: step.body,
  };
}
