import type { CaseFileData } from "../types";

export const MOCK_CASE_FILE: CaseFileData = {
  caseType: "Building Permit Application",
  title: "Single-family residential addition — 14 Rruga Don Bosko",
  caseNumber: "CV-2026-04217",
  filedBy: "A. Krasniqi",
  dateFiled: "14 Apr 2026",
  department: "Urban Planning",
  statusLabel: "Under Review",
  phasesCompleted: 2,
  phasesTotal: 5,
  estimatedCompletion: "6 May 2026",
  nextStepHeading: "What happens next",
  nextStepBody:
    "The Zoning Officer is reviewing your application for setback and height compliance. No action is needed from you right now — you'll be notified here and by email as soon as a decision is made.",
  actionPrimary: { label: "Contact case officer" },
  actionSecondary: { label: "Download case summary" },
  phases: [
    {
      id: 0,
      title: "Submitted",
      subtitle: "Received through the citizen portal.",
      date: "14 Apr 2026",
      status: "done",
      detail:
        "Application and initial documents received. A case number was issued and a confirmation was sent to the citizen's registered email.",
      officer: "Logged by — System",
    },
    {
      id: 1,
      title: "Document Verification",
      subtitle: "All required documents confirmed complete.",
      date: "16 Apr 2026",
      status: "done",
      detail:
        "Site plan, proof of ownership, and contractor license were checked against the submission checklist. No documents were missing or rejected.",
      officer: "Verified by — M. Hoxha, Records Clerk",
    },
    {
      id: 2,
      title: "Under Review",
      subtitle: "Assigned to the Zoning Review team.",
      date: "In progress",
      status: "active",
      detail:
        "The case is being checked for compliance with setback and height regulations for the residential zone. Estimated 5 business days remaining.",
      officer: "Assigned to — E. Berisha, Zoning Officer",
    },
    {
      id: 3,
      title: "Decision",
      subtitle: "Approval, rejection, or request for changes.",
      date: "Not started",
      status: "pending",
      detail:
        "This phase begins once the zoning review is complete. The citizen will be notified directly of the outcome.",
      officer: "",
    },
    {
      id: 4,
      title: "Completed",
      subtitle: "Permit issued and case closed.",
      date: "Not started",
      status: "pending",
      detail:
        "The final permit document will be available for download from this page once issued.",
      officer: "",
    },
  ],
};
