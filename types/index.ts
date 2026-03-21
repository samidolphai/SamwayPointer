export type ClockAction = 'in' | 'out';

// ── Employee Registry ──────────────────────────────────────────────────────
export interface Employee {
  id: string;           // internal unique key (nanoid-style)
  employee_id: string;  // human-readable unique ID (e.g. "EMP001")
  name: string;
  face_photo: string | null; // base64 data URI of reference face
  pin_hash: string | null;   // bcrypt hash of 4-6 digit PIN, null = no PIN required
  created_at: string;
  updated_at: string;
}

// ── Attendance State (per employee) ────────────────────────────────────────
export interface AttendanceState {
  employee_id: string;
  state: 'in' | 'out' | null; // null = never clocked in
  last_record_id: number | null;
  updated_at: string;
}

// ── Clock Records ──────────────────────────────────────────────────────────
export interface ClockRecord {
  id: number;
  employee_id: string;
  employee_name: string;
  action: ClockAction;
  timestamp: string; // ISO 8601
  photo: string | null; // base64 data URI captured at clock time
  reason: string | null; // e.g. "Production", "Return from Break", etc.
  notified: boolean;
  created_at: string;
}

export interface ClockRecordSummary {
  id: number;
  employee_id: string;
  employee_name: string;
  action: ClockAction;
  timestamp: string;
  reason: string | null;
}

// ── Verification Logs ──────────────────────────────────────────────────────
export interface VerificationLog {
  id: number;
  employee_id: string;
  employee_name: string;
  action: ClockAction;
  success: boolean;
  reason: string | null;
  timestamp: string;
}

// ── API Payloads ───────────────────────────────────────────────────────────
export interface ClockPayload {
  employee_id: string;
  action: ClockAction;
  photo?: string;
}

export interface RecordsQuery {
  name?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface RecordsResponse {
  records: ClockRecordSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VerifyFacePayload {
  employee_id: string;
  action: ClockAction;
  captured_photo?: string;
}

export interface VerifyFaceResponse {
  success: boolean;
  employee_name?: string;
  reason?: string;
  reason_fr?: string;
}
