export type UserRole = 'clerk' | 'citizen';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: 'bearer';
  user: User;
}

export type CaseStatus = 'active' | 'blocked' | 'completed';

export interface Case {
  id: string;
  code: string;
  title: string;
  process_type: string;
  owner_name: string | null;
  property_id: string | null;
  zone: string | null;
  income_bracket: string | null;
  current_phase: number;
  status: CaseStatus;
  phase_entered_at: string;
  assigned_to: string | null;
  citizen_id: string | null;
  created_at: string;
  updated_at: string;
  days_in_phase: number;
  is_blocked: boolean;
  phase_checklist: Record<string, boolean> | null;
}

export interface PhaseLog {
  id: string;
  case_id: string;
  phase: number;
  entered_at: string;
  exited_at: string | null;
  notes: string | null;
  changed_by: string | null;
}

export interface DocumentFile {
  id: string;
  case_id: string;
  filename: string;
  file_path: string;
  mime_type: string | null;
  docling_markdown: string | null;
  extracted_data: ExtractedFields | null;
  checklist: Record<string, boolean> | null;
  confirmed: boolean;
  uploaded_at: string;
}

export interface ExtractedFields {
  owner_name: string | null;
  property_id: string | null;
  zone: string | null;
  income_bracket: string | null;
  family_size: number | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface CreateCaseRequest {
  title: string;
  owner_name?: string;
  property_id?: string;
  zone?: string;
  income_bracket?: string;
}

export interface AdvancePhaseRequest {
  new_phase: number;
  notes?: string;
}

export interface DashboardStats {
  total_active: number;
  avg_cycle_days: number;
  high_latency_count: number;
  completion_rate: number;
  cases_by_phase: Record<number, number>;
}
