/**
 * JSON-file based data store.
 *
 * Schema v2 — supports:
 *   records[]          — clock-in/out events
 *   employees[]        — registered employees with unique employee_id
 *   attendance_states[]— current in/out state per employee
 *   verification_logs[]— face-verification attempts (pass & fail)
 *
 * Migrates automatically from v1 (flat records array) on first load.
 */

import fs from 'fs';
import path from 'path';
import bcryptjs from 'bcryptjs';
import type {
  ClockRecord,
  ClockAction,
  Employee,
  AttendanceState,
  VerificationLog,
  ClockRecordSummary,
} from '@/types';

// ── Admin settings ────────────────────────────────────────────────────────
export interface AdminSettings {
  password_hash: string | null;
  recovery_email: string | null;
  recovery_phone: string | null;
}

const DB_PATH =
  process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'records.json');

// ── In-process singleton ──────────────────────────────────────────────────

interface DBData {
  records: ClockRecord[];
  employees: Employee[];
  attendance_states: AttendanceState[];
  verification_logs: VerificationLog[];
  admin_settings: AdminSettings | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __db: DBData | undefined;
}

function load(): DBData {
  if (global.__db) return global.__db;

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      // Migration from v1 (flat records array)
      global.__db = {
        records: parsed,
        employees: [],
        attendance_states: [],
        verification_logs: [],
        admin_settings: null,
      };
      _save(global.__db);
    } else {
      global.__db = {
        records: parsed.records ?? [],
        employees: parsed.employees ?? [],
        attendance_states: parsed.attendance_states ?? [],
        verification_logs: parsed.verification_logs ?? [],
        admin_settings: parsed.admin_settings ?? null,
      };
    }
  } catch {
    global.__db = {
      records: [],
      employees: [],
      attendance_states: [],
      verification_logs: [],
      admin_settings: null,
    };
  }

  return global.__db!;
}

function _save(data: DBData): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  global.__db = data;
}

// ── Employee functions ────────────────────────────────────────────────────

export function listEmployees(): (Omit<Employee, 'face_photo'> & { has_face_photo: boolean })[] {
  return load().employees.map(({ face_photo, ...rest }) => ({
    ...rest,
    has_face_photo: !!face_photo,
  }));
}

export function getEmployeeById(employee_id: string): Employee | undefined {
  return load().employees.find((e) => e.employee_id === employee_id);
}

export function getEmployeeByInternalId(id: string): Employee | undefined {
  return load().employees.find((e) => e.id === id);
}

export function getEmployeeFacePhoto(employee_id: string): string | null {
  return load().employees.find((e) => e.employee_id === employee_id)?.face_photo ?? null;
}

export function employeeIdExists(employee_id: string, excludeId?: string): boolean {
  return load().employees.some(
    (e) => e.employee_id === employee_id && e.id !== excludeId
  );
}

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function createEmployee(payload: {
  employee_id: string;
  name: string;
  face_photo?: string | null;
  pin_hash?: string | null;
}): Employee {
  const db = load();
  if (db.employees.some((e) => e.employee_id === payload.employee_id)) {
    throw new Error('DUPLICATE_EMPLOYEE_ID');
  }
  const now = new Date().toISOString();
  const emp: Employee = {
    id: nanoid(),
    employee_id: payload.employee_id,
    name: payload.name,
    face_photo: payload.face_photo ?? null,
    pin_hash: payload.pin_hash ?? null,
    created_at: now,
    updated_at: now,
  };
  db.employees.push(emp);
  _save(db);
  return emp;
}

export function updateEmployee(
  id: string,
  payload: Partial<Pick<Employee, 'employee_id' | 'name' | 'face_photo' | 'pin_hash'>>
): Employee | null {
  const db = load();
  const idx = db.employees.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  if (payload.employee_id && payload.employee_id !== db.employees[idx].employee_id) {
    if (db.employees.some((e) => e.employee_id === payload.employee_id && e.id !== id)) {
      throw new Error('DUPLICATE_EMPLOYEE_ID');
    }
  }

  db.employees[idx] = {
    ...db.employees[idx],
    ...payload,
    updated_at: new Date().toISOString(),
  };
  _save(db);
  return db.employees[idx];
}

export function deleteEmployee(id: string): boolean {
  const db = load();
  const before = db.employees.length;
  db.employees = db.employees.filter((e) => e.id !== id);
  if (db.employees.length < before) {
    _save(db);
    return true;
  }
  return false;
}

// ── Attendance state functions ────────────────────────────────────────────

export function getAttendanceState(employee_id: string): AttendanceState | null {
  return load().attendance_states.find((s) => s.employee_id === employee_id) ?? null;
}

export function setAttendanceState(
  employee_id: string,
  state: 'in' | 'out',
  last_record_id: number
): void {
  const db = load();
  const now = new Date().toISOString();
  const idx = db.attendance_states.findIndex((s) => s.employee_id === employee_id);
  const entry: AttendanceState = { employee_id, state, last_record_id, updated_at: now };

  if (idx === -1) {
    db.attendance_states.push(entry);
  } else {
    db.attendance_states[idx] = entry;
  }
  _save(db);
}

// ── Clock record functions ────────────────────────────────────────────────

export function insertRecord(payload: {
  employee_id: string;
  employee_name: string;
  action: ClockAction;
  photo?: string;
  reason?: string | null;
}): ClockRecord {
  const db = load();
  const now = new Date().toISOString();
  const id =
    db.records.length > 0 ? db.records[db.records.length - 1].id + 1 : 1;

  const record: ClockRecord = {
    id,
    employee_id: payload.employee_id,
    employee_name: payload.employee_name,
    action: payload.action,
    timestamp: now,
    photo: payload.photo ?? null,
    reason: payload.reason ?? null,
    notified: false,
    created_at: now,
  };

  db.records.push(record);
  _save(db);
  return record;
}

export function markNotified(id: number): void {
  const db = load();
  const rec = db.records.find((r) => r.id === id);
  if (rec) {
    rec.notified = true;
    _save(db);
  }
}

export interface QueryOptions {
  name?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function queryRecords(opts: QueryOptions = {}): {
  records: ClockRecordSummary[];
  total: number;
  page: number;
  pageSize: number;
} {
  let records = load().records.slice().reverse();

  if (opts.name) {
    const q = opts.name.toLowerCase();
    records = records.filter(
      (r) =>
        r.employee_name.toLowerCase().includes(q) ||
        (r.employee_id ?? '').toLowerCase().includes(q)
    );
  }
  if (opts.from) {
    records = records.filter((r) => r.timestamp >= opts.from!);
  }
  if (opts.to) {
    const toEnd = opts.to + 'T23:59:59.999Z';
    records = records.filter((r) => r.timestamp <= toEnd);
  }

  const total = records.length;
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const paginated = records.slice((page - 1) * pageSize, page * pageSize);

  const stripped: ClockRecordSummary[] = paginated.map(
    ({ photo: _p, notified: _n, created_at: _c, ...rest }) => rest
  );
  return { records: stripped, total, page, pageSize };
}

export function getRecordPhoto(id: number): string | null {
  return load().records.find((r) => r.id === id)?.photo ?? null;
}

export function deleteRecord(id: number): boolean {
  const db = load();
  const before = db.records.length;
  db.records = db.records.filter((r) => r.id !== id);
  if (db.records.length < before) {
    _save(db);
    return true;
  }
  return false;
}

export function getAllForExport(): Omit<ClockRecord, 'photo'>[] {
  return load()
    .records.slice()
    .reverse()
    .map(({ photo: _p, ...rest }) => rest);
}

// ── Verification log functions ────────────────────────────────────────────

export function insertVerificationLog(payload: {
  employee_id: string;
  employee_name: string;
  action: ClockAction;
  success: boolean;
  reason?: string | null;
}): void {
  const db = load();
  const id = db.verification_logs.length > 0
    ? db.verification_logs[db.verification_logs.length - 1].id + 1
    : 1;
  db.verification_logs.push({
    id,
    employee_id: payload.employee_id,
    employee_name: payload.employee_name,
    action: payload.action,
    success: payload.success,
    reason: payload.reason ?? null,
    timestamp: new Date().toISOString(),
  });
  _save(db);
}

export function listVerificationLogs(opts: {
  page?: number;
  pageSize?: number;
  name?: string;
  from?: string;
  to?: string;
} = {}): {
  logs: VerificationLog[];
  total: number;
} {
  let logs = load().verification_logs.slice().reverse();

  if (opts.name) {
    const q = opts.name.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.employee_name.toLowerCase().includes(q) ||
        l.employee_id.toLowerCase().includes(q)
    );
  }
  if (opts.from) {
    logs = logs.filter((l) => l.timestamp >= opts.from!);
  }
  if (opts.to) {
    const toEnd = opts.to + 'T23:59:59.999Z';
    logs = logs.filter((l) => l.timestamp <= toEnd);
  }

  const total = logs.length;
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  return {
    logs: logs.slice((page - 1) * pageSize, page * pageSize),
    total,
  };
}

// ── PIN helpers ───────────────────────────────────────────────────────────

export async function hashPin(pin: string): Promise<string> {
  return bcryptjs.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(pin, hash);
}

// ── Admin settings ────────────────────────────────────────────────────────

export function getAdminSettings(): AdminSettings | null {
  return load().admin_settings ?? null;
}

export function setAdminSettings(s: AdminSettings): void {
  const db = load();
  db.admin_settings = s;
  _save(db);
}
