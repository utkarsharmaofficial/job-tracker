// Shared enums and types. Safe to import from both server and client code.

export const STATUSES = [
  "applied",
  "screening",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
  "ghosted",
] as const;
export type Status = (typeof STATUSES)[number];

// Pipeline stages in order; an email can move an application forward but never back.
export const ACTIVE_STATUSES: Status[] = ["applied", "screening", "assessment", "interview"];
export const TERMINAL_STATUSES: Status[] = ["offer", "rejected", "withdrawn"];

export const STATUS_LABEL: Record<Status, string> = {
  applied: "Applied",
  screening: "Screening",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  ghosted: "Ghosted",
};

export const TECH_AREAS = ["frontend", "backend", "fullstack", "mobile", "cloud_devops", "other"] as const;
export type TechArea = (typeof TECH_AREAS)[number];
export const TECH_AREA_LABEL: Record<TechArea, string> = {
  frontend: "Frontend",
  backend: "Backend",
  fullstack: "Full Stack",
  mobile: "Mobile",
  cloud_devops: "Cloud / DevOps",
  other: "Other",
};

export const EMPLOYMENT_MODELS = ["fte", "contractor", "freelance", "agency"] as const;
export type EmploymentModel = (typeof EMPLOYMENT_MODELS)[number];
export const EMPLOYMENT_MODEL_LABEL: Record<EmploymentModel, string> = {
  fte: "Permanent / FTE",
  contractor: "Contractor",
  freelance: "Freelancer / Consultant",
  agency: "Agency / Consultancy",
};

export const WORKPLACE_MODELS = ["onsite", "hybrid", "remote", "nomad"] as const;
export type WorkplaceModel = (typeof WORKPLACE_MODELS)[number];
export const WORKPLACE_MODEL_LABEL: Record<WorkplaceModel, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
  nomad: "Digital Nomad",
};

// How far back the very first sync reads, chosen when Gmail is connected for the first time.
export const FIRST_SYNC_RANGES = ["all", "1y", "6m", "3m", "1m"] as const;
export type FirstSyncRange = (typeof FIRST_SYNC_RANGES)[number];
export const FIRST_SYNC_RANGE_LABEL: Record<FirstSyncRange, string> = {
  all: "All emails",
  "1y": "Last 1 year",
  "6m": "Last 6 months",
  "3m": "Last 3 months",
  "1m": "Last 1 month",
};
export const DEFAULT_FIRST_SYNC_RANGE: FirstSyncRange = "1m";

export type Application = {
  id: number;
  company: string;
  role: string | null;
  platform: string | null;
  status: Status;
  statusLocked: boolean; // true once the user sets the status by hand
  appliedOn: string; // YYYY-MM-DD
  lastActivityAt: string; // ISO timestamp
  techArea: TechArea | null;
  employmentModel: EmploymentModel | null;
  workplaceModel: WorkplaceModel | null;
  location: string | null;
  jobUrl: string | null;
  notes: string | null;
  emailCount: number;
};

export type TimelineEvent = {
  id: number;
  applicationId: number;
  kind: "email" | "status_change" | "created";
  status: Status | null;
  title: string;
  detail: string | null;
  occurredAt: string;
  gmailId: string | null;
};

export type SyncState = {
  running: boolean;
  phase: string;
  processed: number;
  total: number;
  added: number;
  updated: number;
  error: string | null;
  lastSyncAt: string | null;
};
