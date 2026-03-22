/**
 * Data store — Netlify Blobs in production, JSON file locally.
 *
 * ALL exported functions are async so they work in both environments.
 *
 * Schema v2:
 *   records[]           — clock-in/out events
 *   employees[]         — registered employees
 *   attendance_states[] — current in/out state per employee
 *   verification_logs[] — face/PIN verification attempts
 *   admin_settings      — password hash + recovery contact
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

// ── Admin settings type ───────────────────────────────────────────────────
export interface AdminSettings {
  password_hash: string | null;
  recovery_email: string | null;
  recovery_phone: string | null;
}

interface DBData {
  records: ClockRecord[];
  employees: Employee[];
  attendance_states: AttendanceState[];
  verification_logs: VerificationLog[];
  admin_settings: AdminSettings | null;
}

// ── Environment detection ─────────────────────────────────────────────────
// NETLIFY=true is automatically set in all Netlify environments
const IS_NETLIFY = process.env.NETLIFY === 'true';

// ── Local file path (dev only) ────────────────────────────────────────────
const DB_PATH =
  process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'records.json');

const BLOB_STORE = 'samwaypointer';
const BLOB_KEY = 'db';

// ── In-memory cache (lives for duration of one serverless invocation) ─────
let memCache: DBData | null = null;

function defaultData(): DBData {
  return {
    records: [],
    employees: [],
    attendance_states: [],
    verification_logs: [],
    admin_settings: null,
  };
}

// ── Load ──────────────────────────────────────────────────────────────────
async function load(): Promise<DBData> {
  if (memCache) return memCache;

  if (IS_NETLIFY) {
    try {
      const { getStore } = await import('@netlify/blobs');
      const store = getStore(BLOB_STORE);
      const raw = await store.get(BLOB_KEY, { type: 'text' });
      if (raw) {
        const parsed = JSON.parse(raw);
        memCache = {
          records: parsed.records ?? [],
          employees: parsed.employees ?? [],
          attendance_states: parsed.attendance_states ?? [],
          verification_logs: parsed.verification_logs ?? [],
          admin_settings: parsed.admin_settings ?? null,
        };
      } else {
        memCache = defaultData();
      }
    } catch {
      memCache = defaultData();
    }
  } else {
    // Local development — read from JSON file
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Migrate from v1 flat records array
        memCache = { ...defaultData(), records: parsed };
        await _save(memCache);
      } else {
        memCache = {
          records: parsed.records ?? [],
          employees: parsed.employees ?? [],
          attendance_states: parsed.attendance_states ?? [],
          verification_logs: parsed.verification_logs ?? [],
          admin_settings: parsed.admin_settings ?? null,
        };
      }
    } catch {
      memCache = defaultData();
    }
  }

  return memCache!;
}

// ── Save ──────────────────────────────────────────────────────────────────
async function _save(data: DBData): Promise<void> {
  memCache = data;

  if (IS_NETLIFY) {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore(BLOB_STORE);
    await store.set(BLOB_KEY, JSON.stringify(data));
  } else {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }
}

// ── Tiny ID generator ─────────────────────────────────────────────────────
function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ── Employee functions ────────────────────────────────────────────────────

export async function listEmployees(): Promise<
  (Omit<Employee, 'face_photo'> & { has_face_photo: boolean })[]
> {
  const db = await load();
  return db.employees.map(({ face_photo, ...rest }) => ({
    ...rest,
    has_face_photo: !!face_photo,
  }));
}

export async function getEmployeeById(employee_id: string): Promise<Employee | undefined> {
  const db = await load();
  return db.employees.find((e) => e.employee_id === employee_id);
}

export async function getEmployeeByInternalId(id: string): Promise<Employee | undefined> {
  const db = await load();
  return db.employees.find((e) => e.id === id);
}

export async function getEmployeeFacePhoto(employee_id: string): Promise<string | null> {
  const db = await load();
  return db.employees.find((e) => e.employee_id === employee_id)?.face_photo ?? null;
}

export async function employeeIdExists(employee_id: string, excludeId?: string): Promise<boolean> {
  const db = await load();
  return db.employees.some(
    (e) => e.employee_id === employee_id && e.id !== excludeId
  );
}

export async function createEmployee(payload: {
  employee_id: string;
  name: string;
  face_photo?: string | null;
  pin_hash?: string | null;
}): Promise<Employee> {
  const db = await load();
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
  await _save(db);
  return emp;
}

export async function updateEmployee(
  id: string,
  payload: Partial<Pick<Employee, 'employee_id' | 'name' | 'face_photo' | 'pin_hash'>>
): Promise<Employee | null> {
  const db = await load();
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
  await _save(db);
  return db.employees[idx];
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const db = await load();
  const before = db.employees.length;
  db.employees = db.employees.filter((e) => e.id !== id);
  if (db.employees.length < before) {
    await _save(db);
    return true;
  }
  return false;
}

// ── Attendance state functions ────────────────────────────────────────────

export async function getAttendanceState(employee_id: string): Promise<AttendanceState | null> {
  const db = await load();
  return db.attendance_states.find((s) => s.employee_id === employee_id) ?? null;
}

export async function setAttendanceState(
  employee_id: string,
  state: 'in' | 'out',
  last_record_id: number
): Promise<void> {
  const db = await load();
  const now = new Date().toISOString();
  const idx = db.attendance_states.findIndex((s) => s.employee_id === employee_id);
  const entry: AttendanceState = { employee_id, state, last_record_id, updated_at: now };
  if (idx === -1) {
    db.attendance_states.push(entry);
  } else {
    db.attendance_states[idx] = entry;
  }
  await _save(db);
}

// ── Clock record functions ────────────────────────────────────────────────

export async function insertRecord(payload: {
  employee_id: string;
  employee_name: string;
  action: ClockAction;
  photo?: string;
  reason?: string | null;
}): Promise<ClockRecord> {
  const db = await load();
  const now = new Date().toISOString();
  const id = db.records.length > 0 ? db.records[db.records.length - 1].id + 1 : 1;

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
  await _save(db);
  return record;
}

export async function markNotified(id: number): Promise<void> {
  const db = await load();
  const rec = db.records.find((r) => r.id === id);
  if (rec) {
    rec.notified = true;
    await _save(db);
  }
}

export interface QueryOptions {
  name?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function queryRecords(opts: QueryOptions = {}): Promise<{
  records: ClockRecordSummary[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const db = await load();
  let records = db.records.slice().reverse();

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

export async function getRecordPhoto(id: number): Promise<string | null> {
  const db = await load();
  return db.records.find((r) => r.id === id)?.photo ?? null;
}

export async function deleteRecord(id: number): Promise<boolean> {
  const db = await load();
  const before = db.records.length;
  db.records = db.records.filter((r) => r.id !== id);
  if (db.records.length < before) {
    await _save(db);
    return true;
  }
  return false;
}

export async function getAllForExport(): Promise<Omit<ClockRecord, 'photo'>[]> {
  const db = await load();
  return db.records
    .slice()
    .reverse()
    .map(({ photo: _p, ...rest }) => rest);
}

// ── Verification log functions ────────────────────────────────────────────

export async function insertVerificationLog(payload: {
  employee_id: string;
  employee_name: string;
  action: ClockAction;
  success: boolean;
  reason?: string | null;
}): Promise<void> {
  const db = await load();
  const id =
    db.verification_logs.length > 0
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
  await _save(db);
}

export async function listVerificationLogs(
  opts: {
    page?: number;
    pageSize?: number;
    name?: string;
    from?: string;
    to?: string;
  } = {}
): Promise<{ logs: VerificationLog[]; total: number }> {
  const db = await load();
  let logs = db.verification_logs.slice().reverse();

  if (opts.name) {
    const q = opts.name.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.employee_name.toLowerCase().includes(q) ||
        l.employee_id.toLowerCase().includes(q)
    );
  }
  if (opts.from) logs = logs.filter((l) => l.timestamp >= opts.from!);
  if (opts.to) {
    const toEnd = opts.to + 'T23:59:59.999Z';
    logs = logs.filter((l) => l.timestamp <= toEnd);
  }

  const total = logs.length;
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  return { logs: logs.slice((page - 1) * pageSize, page * pageSize), total };
}

// ── PIN helpers ───────────────────────────────────────────────────────────

export async function hashPin(pin: string): Promise<string> {
  return bcryptjs.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(pin, hash);
}

// ── Admin settings ────────────────────────────────────────────────────────

export async function getAdminSettings(): Promise<AdminSettings | null> {
  const db = await load();
  return db.admin_settings ?? null;
}

export async function setAdminSettings(s: AdminSettings): Promise<void> {
  const db = await load();
  db.admin_settings = s;
  await _save(db);
}
