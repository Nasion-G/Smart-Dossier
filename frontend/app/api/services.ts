import { apiClient } from './client';
import type {
  AuthTokens, LoginRequest, RegisterRequest,
  Case, DashboardStats, DocumentFile, PhaseLog,
  AdvancePhaseRequest, CreateCaseRequest, ExtractedFields,
} from '../types';

// ─── Auth ──────────────────────────────────────────────────────────────────
export const auth = {
  login: (body: LoginRequest) =>
    apiClient.post<AuthTokens>('/auth/login', body).then(r => r.data),
  register: (body: RegisterRequest) =>
    apiClient.post<AuthTokens>('/auth/register', body).then(r => r.data),
};

// ─── Cases ─────────────────────────────────────────────────────────────────
export const cases = {
  list: (phase?: number) =>
    apiClient.get<Case[]>('/cases', { params: phase ? { phase } : {} }).then(r => r.data),
  mine: () =>
    apiClient.get<Case[]>('/cases/mine').then(r => r.data),
  get: (id: string) =>
    apiClient.get<Case>(`/cases/${id}`).then(r => r.data),
  create: (body: CreateCaseRequest) =>
    apiClient.post<Case>('/cases', body).then(r => r.data),
  update: (id: string, body: Partial<CreateCaseRequest>) =>
    apiClient.patch<Case>(`/cases/${id}`, body).then(r => r.data),
  advancePhase: (id: string, body: AdvancePhaseRequest) =>
    apiClient.patch<Case>(`/cases/${id}/phase`, body).then(r => r.data),
  stats: () =>
    apiClient.get<DashboardStats>('/cases/stats').then(r => r.data),
  phaseHistory: (id: string) =>
    apiClient.get<PhaseLog[]>(`/cases/${id}/history`).then(r => r.data),
};

// ─── Documents ─────────────────────────────────────────────────────────────
export const documents = {
  upload: (caseId: string, file: { uri: string; name: string; type: string }) => {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    return apiClient.post<DocumentFile>(`/cases/${caseId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  list: (caseId: string) =>
    apiClient.get<DocumentFile[]>(`/cases/${caseId}/documents`).then(r => r.data),
  extract: (documentId: string) =>
    apiClient.post<ExtractedFields>(`/documents/${documentId}/re-extract`).then(r => r.data),
  confirmExtraction: (documentId: string) =>
    apiClient.post(`/documents/${documentId}/confirm`).then(r => r.data),
};

// ─── AI ────────────────────────────────────────────────────────────────────
export const ai = {
  summary: (caseId: string) =>
    apiClient.post<{ summary: string }>(`/cases/${caseId}/ai-summary`).then(r => r.data.summary),
  generateLetter: (caseId: string) =>
    apiClient.post<{ letter: string }>(`/cases/${caseId}/generate-letter`).then(r => r.data.letter),
};
