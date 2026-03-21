export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  getEmployeeById,
  getAttendanceState,
  setAttendanceState,
  insertRecord,
  insertVerificationLog,
  verifyPin,
} from '@/db';
import { fireNotifications } from '@/lib/notifications';
import type { ClockAction } from '@/types';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { employee_id, action, photo, pin, reason } = body as Record<string, unknown>;

  // ── Input validation ───────────────────────────────────────────────────
  if (typeof employee_id !== 'string' || !employee_id.trim()) {
    return NextResponse.json({ error: 'employee_id is required' }, { status: 400 });
  }
  if (action !== 'in' && action !== 'out') {
    return NextResponse.json({ error: 'action must be "in" or "out"' }, { status: 400 });
  }

  const empId = employee_id.trim().toUpperCase();

  // ── Employee lookup ────────────────────────────────────────────────────
  const employee = getEmployeeById(empId);
  if (!employee) {
    return NextResponse.json(
      {
        error: 'Employee ID not found. Please see your manager.',
        error_fr: 'Identifiant introuvable. Contactez votre responsable.',
        code: 'EMPLOYEE_NOT_FOUND',
      },
      { status: 404 }
    );
  }

  // ── PIN verification ───────────────────────────────────────────────────
  if (employee.pin_hash) {
    const pinStr = typeof pin === 'string' ? pin.trim() : '';
    if (!pinStr) {
      return NextResponse.json(
        {
          error: 'A PIN is required for this employee.',
          error_fr: 'Un PIN est requis pour cet employé.',
          code: 'PIN_REQUIRED',
        },
        { status: 401 }
      );
    }
    const pinOk = await verifyPin(pinStr, employee.pin_hash);
    if (!pinOk) {
      return NextResponse.json(
        {
          error: 'Incorrect PIN. Please try again.',
          error_fr: 'PIN incorrect. Veuillez réessayer.',
          code: 'WRONG_PIN',
        },
        { status: 401 }
      );
    }
  }

  // ── Attendance state validation (backend is source of truth) ──────────
  const state = getAttendanceState(empId);
  const currentState = state?.state ?? null;

  if (action === 'in' && currentState === 'in') {
    return NextResponse.json(
      {
        error: 'You are already clocked in.',
        error_fr: 'Vous êtes déjà pointé à l\'entrée.',
        code: 'ALREADY_CLOCKED_IN',
      },
      { status: 409 }
    );
  }

  if (action === 'out' && currentState !== 'in') {
    return NextResponse.json(
      {
        error: 'You are not clocked in yet.',
        error_fr: 'Vous n\'avez pas encore pointé à l\'entrée.',
        code: 'NOT_CLOCKED_IN',
      },
      { status: 409 }
    );
  }

  // ── Face verification scaffold ─────────────────────────────────────────
  // TODO (production): Replace this scaffold with a real face-matching
  // library (e.g. AWS Rekognition, face-api.js, or Azure Face API).
  // Currently: always passes if employee exists; logs every attempt.
  const verificationPassed = true;

  // Store the clock reason (Production / Break / etc.) in the verification log
  // so admins can see WHY each employee clocked in or out.
  const clockReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

  insertVerificationLog({
    employee_id: empId,
    employee_name: employee.name,
    action: action as ClockAction,
    success: verificationPassed,
    reason: clockReason,
  });

  if (!verificationPassed) {
    return NextResponse.json(
      {
        error: 'Face verification failed. Please try again.',
        error_fr: 'Échec de la vérification faciale. Veuillez réessayer.',
        code: 'VERIFICATION_FAILED',
      },
      { status: 403 }
    );
  }

  // ── Insert record ──────────────────────────────────────────────────────
  const record = insertRecord({
    employee_id: empId,
    employee_name: employee.name,
    action: action as ClockAction,
    photo: typeof photo === 'string' ? photo : undefined,
    reason: typeof reason === 'string' ? reason : null,
  });

  // ── Update attendance state ────────────────────────────────────────────
  setAttendanceState(empId, action as 'in' | 'out', record.id);

  // ── Notifications (fire-and-forget) ───────────────────────────────────
  fireNotifications({
    id: record.id,
    employeeName: employee.name,
    action: record.action,
    timestamp: record.timestamp,
  });

  return NextResponse.json(
    {
      id: record.id,
      timestamp: record.timestamp,
      employee_name: employee.name,
    },
    { status: 201 }
  );
}
