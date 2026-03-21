'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Clock,
  CheckCircle,
  XCircle,
  IdCard,
  LogIn,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react';
import SamwayLogo from '@/components/SamwayLogo';
import { t, type Lang } from '@/lib/i18n';

// ── Beep (Web Audio API — no file dependency) ─────────────────────────────
function playSuccessBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1108, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* ignore if Audio API unavailable */ }
}

// ── Language persistence ───────────────────────────────────────────────────
function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>('en');
  useEffect(() => {
    const stored = localStorage.getItem('sw_lang') as Lang | null;
    if (stored === 'en' || stored === 'fr') setLangState(stored);
  }, []);
  const setLang = (l: Lang) => {
    localStorage.setItem('sw_lang', l);
    setLangState(l);
  };
  return [lang, setLang];
}

type Screen = 'main' | 'reason' | 'capture' | 'no-camera' | 'verifying' | 'confirmation' | 'error';

export default function SamwayTimeClock() {
  const [lang, setLang] = useLang();
  const [screen, setScreen] = useState<Screen>('main');
  const [employeeInput, setEmployeeInput] = useState('');
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [action, setAction] = useState<'in' | 'out'>('in');
  const [reason, setReason] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [confirmedName, setConfirmedName] = useState('');
  const [confirmedTime, setConfirmedTime] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  // Status check state
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusData, setStatusData] = useState<{
    employee_name: string;
    state: 'in' | 'out' | null;
    since: string | null;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  // ── Live clock ────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }));
      setCurrentDate(now.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lang]);

  // ── Camera ────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    // Check if camera API is available at all
    if (!navigator.mediaDevices?.getUserMedia) {
      setScreen('no-camera');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch {
      // Camera unavailable or permission denied — allow clocking without photo
      setScreen('no-camera');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  // ── Submit clock action ───────────────────────────────────────────────
  const handleSubmit = useCallback(async (capturedPhoto: string | null) => {
    setScreen('verifying');
    setErrorMsg('');
    try {
      const res = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeInput.trim().toUpperCase(),
          action,
          photo: capturedPhoto,
          pin: pin || undefined,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = lang === 'fr'
          ? (data.error_fr ?? data.error ?? t(lang, 'saveFailed'))
          : (data.error ?? t(lang, 'saveFailed'));
        setErrorMsg(msg);
        setScreen('error');
        return;
      }
      setConfirmedName(data.employee_name);
      setConfirmedTime(new Date(data.timestamp).toLocaleTimeString(
        lang === 'fr' ? 'fr-FR' : 'en-US',
        { hour: '2-digit', minute: '2-digit' }
      ));
      setScreen('confirmation');
      playSuccessBeep();
    } catch {
      setErrorMsg(t(lang, 'saveFailed'));
      setScreen('error');
    }
  }, [action, employeeInput, lang, pin, reason]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const data = canvas.toDataURL('image/jpeg', 0.82);
    setPhoto(data);
    stopCamera();
    handleSubmit(data);
  }, [stopCamera, handleSubmit]);

  const handleClockAction = (actionType: 'in' | 'out') => {
    if (!employeeInput.trim()) {
      setErrorMsg(t(lang, 'employeeNotFound'));
      return;
    }
    setErrorMsg('');
    setAction(actionType);
    setPhoto(null);
    setReason(null);
    // Go to reason selection screen first
    setScreen('reason');
  };

  const handleUploadPhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhoto(dataUrl);
      handleSubmit(dataUrl);
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  }, [handleSubmit]);

  const handleCheckStatus = async () => {
    if (!employeeInput.trim()) {
      setErrorMsg(t(lang, 'employeeNotFound'));
      return;
    }
    setErrorMsg('');
    setStatusData(null);
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/status?employee_id=${encodeURIComponent(employeeInput.trim().toUpperCase())}`);
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error === 'not_found'
          ? t(lang, 'employeeNotFound')
          : t(lang, 'saveFailed'));
        return;
      }
      const data = await res.json();
      setStatusData(data);
    } catch {
      setErrorMsg(t(lang, 'saveFailed'));
    } finally {
      setStatusLoading(false);
    }
  };

  const reset = () => {
    setScreen('main');
    setEmployeeInput('');
    setPin('');
    setErrorMsg('');
    setPhoto(null);
    setReason(null);
    setStatusData(null);
    stopCamera();
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-brand flex items-center justify-center p-4 py-8">
      {/* Ambient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #f9c900, transparent)' }} />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #4caf50, transparent)' }} />
      </div>

      <div className="w-full max-w-sm relative">

        {/* ── MAIN SCREEN ─────────────────────────────────────────────── */}
        {screen === 'main' && (
          <div className="glass-card rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            {/* Header bar */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #1a4f1a, #2e7d32)' }}>
              <div className="flex items-center gap-3">
                <SamwayLogo height={56} />
                <span className="font-black text-white leading-tight"
                  style={{ fontSize: '1.05rem', letterSpacing: '-0.01em', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  SamwayPointer
                </span>
              </div>
              {/* Language switcher */}
              <div className="flex items-center gap-1 bg-black/20 rounded-full p-1">
                {(['en', 'fr'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                    style={{
                      background: lang === l ? '#f9c900' : 'transparent',
                      color: lang === l ? '#1a4f1a' : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 pt-4">
              {/* Clock display */}
              <div className="rounded-2xl p-4 mb-5 text-center"
                style={{ background: 'linear-gradient(135deg, #f0fdf4, #fefce8)' }}>
                <div className="flex items-center justify-center gap-2 mb-1" style={{ color: '#1b5e20' }}>
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {t(lang, 'currentTime')}
                  </span>
                </div>
                <div className="tabular-nums font-black text-gray-800"
                  style={{ fontSize: '2rem', lineHeight: 1 }}>
                  {currentTime}
                </div>
                <div className="text-xs text-gray-500 mt-1 capitalize">{currentDate}</div>
              </div>

              {/* Error inline */}
              {errorMsg && (
                <div className="flex items-start gap-2 mb-4 p-3 rounded-xl text-sm"
                  style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Employee ID */}
              <label className="block mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#1b5e20' }}>
                  <IdCard className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
                  {t(lang, 'employeeId')}
                </span>
              </label>
              <input
                type="text"
                value={employeeInput}
                onChange={(e) => {
                  setEmployeeInput(e.target.value.toUpperCase());
                  setErrorMsg('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleClockAction('in')}
                placeholder={t(lang, 'enterEmployeeId')}
                className="input-sw w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-800 font-mono text-lg mb-3"
                style={{ letterSpacing: '0.05em' }}
                autoComplete="off"
                autoCapitalize="characters"
              />

              {/* PIN field */}
              <label className="block mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#1b5e20' }}>
                  {t(lang, 'pinLabel')}
                </span>
              </label>
              <div className="relative mb-4">
                <input
                  type={pinVisible ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t(lang, 'enterPin')}
                  className="input-sw w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-800 font-mono text-lg pr-12"
                  style={{ letterSpacing: '0.1em' }}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setPinVisible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {pinVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => handleClockAction('in')}
                  className="btn-press w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #2e7d32, #1b5e20)',
                    boxShadow: '0 4px 20px rgba(27,94,32,0.35)',
                    fontSize: '1.05rem',
                  }}
                >
                  <LogIn className="w-5 h-5" />
                  {t(lang, 'clockIn')}
                </button>
                <button
                  onClick={() => handleClockAction('out')}
                  className="btn-press w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-gray-800 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #f9c900, #e6b800)',
                    boxShadow: '0 4px 20px rgba(249,201,0,0.35)',
                    fontSize: '1.05rem',
                  }}
                >
                  <LogOut className="w-5 h-5" />
                  {t(lang, 'clockOut')}
                </button>
              </div>

              {/* ── Inline Status Card ─────────────────────────────── */}
              {(statusLoading || statusData) && (
                <div className="mt-4 rounded-2xl overflow-hidden border border-gray-100 animate-slide-up"
                  style={{ background: 'linear-gradient(135deg, #f0fdf4, #fefce8)' }}>
                  {statusLoading ? (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
                      <span className="text-sm text-gray-500">{t(lang, 'loading' as Parameters<typeof t>[1])}</span>
                    </div>
                  ) : statusData ? (
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            {t(lang, 'statusTitle')}
                          </p>
                          <p className="font-bold text-gray-800 text-sm">{statusData.employee_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                            statusData.state === 'in'
                              ? 'bg-green-100 text-green-700'
                              : statusData.state === 'out'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {statusData.state === 'in' && <CheckCircle className="w-3.5 h-3.5" />}
                            {statusData.state === 'out' && <XCircle className="w-3.5 h-3.5" />}
                            {statusData.state === 'in'
                              ? t(lang, 'statusIn')
                              : statusData.state === 'out'
                              ? t(lang, 'statusOut')
                              : t(lang, 'statusNever')}
                          </span>
                          <button onClick={() => setStatusData(null)}
                            className="text-gray-400 hover:text-gray-600 ml-1">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {statusData.since && (
                        <p className="text-xs text-gray-400 mt-1">
                          {t(lang, 'statusSince')} {new Date(statusData.since).toLocaleTimeString(
                            lang === 'fr' ? 'fr-FR' : 'en-US',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="mt-4 flex items-center justify-center gap-4">
                <a href="/admin"
                  className="text-xs font-medium underline-offset-2 hover:underline"
                  style={{ color: '#6b7280' }}>
                  {t(lang, 'admin')}
                </a>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleCheckStatus}
                  disabled={statusLoading}
                  className="text-xs font-medium underline-offset-2 hover:underline disabled:opacity-50"
                  style={{ color: '#6b7280' }}>
                  {t(lang, 'checkStatus')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── REASON SCREEN ───────────────────────────────────────────── */}
        {screen === 'reason' && (
          <div className="glass-card rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #1a4f1a, #2e7d32)' }}>
              <div className="flex items-center gap-3">
                <SamwayLogo height={44} />
                <span className="font-black text-white text-sm" style={{ letterSpacing: '-0.01em' }}>
                  SamwayPointer
                </span>
              </div>
              <span className="text-white/70 text-xs font-medium">
                {action === 'in' ? t(lang, 'clockIn') : t(lang, 'clockOut')}
              </span>
            </div>

            <div className="p-6">
              <h3 className="font-bold text-gray-800 text-center mb-5 text-lg">
                {t(lang, 'selectReason')}
              </h3>

              <div className="space-y-3">
                {action === 'in' ? (
                  <>
                    <button
                      onClick={() => {
                        setReason(t(lang, 'reasonProduction'));
                        setScreen('capture');
                        setTimeout(() => startCamera(), 80);
                      }}
                      className="btn-press w-full flex items-center justify-between px-5 py-5 rounded-2xl font-bold text-white shadow-md"
                      style={{ background: 'linear-gradient(135deg, #2e7d32, #1b5e20)', fontSize: '1rem' }}
                    >
                      <span>{t(lang, 'reasonProduction')}</span>
                      <ChevronRight className="w-5 h-5 opacity-70" />
                    </button>
                    <button
                      onClick={() => {
                        setReason(t(lang, 'reasonReturnBreak'));
                        setScreen('capture');
                        setTimeout(() => startCamera(), 80);
                      }}
                      className="btn-press w-full flex items-center justify-between px-5 py-5 rounded-2xl font-bold text-white shadow-md"
                      style={{ background: 'linear-gradient(135deg, #388e3c, #2e7d32)', fontSize: '1rem' }}
                    >
                      <span>{t(lang, 'reasonReturnBreak')}</span>
                      <ChevronRight className="w-5 h-5 opacity-70" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setReason(t(lang, 'reasonBreak'));
                        setScreen('capture');
                        setTimeout(() => startCamera(), 80);
                      }}
                      className="btn-press w-full flex items-center justify-between px-5 py-5 rounded-2xl font-bold text-gray-800 shadow-md"
                      style={{ background: 'linear-gradient(135deg, #f9c900, #e6b800)', fontSize: '1rem' }}
                    >
                      <span>{t(lang, 'reasonBreak')}</span>
                      <ChevronRight className="w-5 h-5 opacity-70" />
                    </button>
                    <button
                      onClick={() => {
                        setReason(t(lang, 'reasonEndShift'));
                        setScreen('capture');
                        setTimeout(() => startCamera(), 80);
                      }}
                      className="btn-press w-full flex items-center justify-between px-5 py-5 rounded-2xl font-bold text-gray-800 shadow-md"
                      style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', fontSize: '1rem' }}
                    >
                      <span>{t(lang, 'reasonEndShift')}</span>
                      <ChevronRight className="w-5 h-5 opacity-70" />
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setScreen('main')}
                className="btn-press w-full mt-4 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
              >
                {t(lang, 'cancel')}
              </button>
            </div>
          </div>
        )}

        {/* ── CAMERA SCREEN ───────────────────────────────────────────── */}
        {screen === 'capture' && (
          <div className="glass-card rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #1a4f1a, #2e7d32)' }}>
              <SamwayLogo height={44} />
              <div className="text-right">
                <p className="text-white font-bold text-sm">{t(lang, 'takePhoto')}</p>
                <p className="text-white/60 text-xs">{t(lang, 'positionYourself')}</p>
              </div>
            </div>

            <div className="p-6">
              {/* Reason badge */}
              {reason && (
                <div className="mb-3 text-center">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: '#f0fdf4', color: '#1b5e20', border: '1px solid #bbf7d0' }}>
                    {t(lang, 'reasonLabel')}: {reason}
                  </span>
                </div>
              )}

              {/* Video feed */}
              <div className="relative rounded-2xl overflow-hidden bg-gray-900 mb-5"
                style={{ aspectRatio: '4/3' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-44 h-56 rounded-full border-2 border-dashed border-white/40" />
                </div>
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />

              <button
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="btn-press w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white mb-3 disabled:opacity-50"
                style={{
                  background: cameraReady
                    ? 'linear-gradient(135deg, #2e7d32, #1b5e20)'
                    : '#9ca3af',
                  fontSize: '1rem',
                }}
              >
                <Camera className="w-5 h-5" />
                {t(lang, 'capturePhoto')}
              </button>
              <button
                onClick={() => { stopCamera(); setScreen('reason'); }}
                className="btn-press w-full py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
              >
                {t(lang, 'cancel')}
              </button>
            </div>
          </div>
        )}

        {/* ── NO-CAMERA SCREEN ────────────────────────────────────────── */}
        {screen === 'no-camera' && (
          <div className="glass-card rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #1a4f1a, #2e7d32)' }}>
              <div className="flex items-center gap-3">
                <SamwayLogo height={44} />
                <span className="font-black text-white text-sm" style={{ letterSpacing: '-0.01em' }}>
                  SamwayPointer
                </span>
              </div>
              <span className="text-white/70 text-xs font-medium">
                {action === 'in' ? t(lang, 'clockIn') : t(lang, 'clockOut')}
              </span>
            </div>
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 mb-3">
                <Camera className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="font-bold text-gray-800 mb-1">
                {lang === 'fr' ? 'Caméra indisponible' : 'Camera Unavailable'}
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                {lang === 'fr'
                  ? 'Choisissez une option ci-dessous.'
                  : 'Choose an option below.'}
              </p>

              <div className="space-y-3">
                {/* Upload from device */}
                <label className="btn-press w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #2e7d32, #1b5e20)' }}>
                  <Upload className="w-5 h-5" />
                  {lang === 'fr' ? 'Choisir une photo' : 'Upload Photo from Device'}
                  <input
                    ref={uploadRef}
                    type="file"
                    accept="image/*"
                    capture={undefined}
                    className="hidden"
                    onChange={handleUploadPhoto}
                  />
                </label>

                {/* Retry camera */}
                <button
                  onClick={() => { setScreen('capture'); setTimeout(() => startCamera(), 80); }}
                  className="btn-press w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                >
                  <Camera className="w-4 h-4" />
                  {lang === 'fr' ? 'Réessayer la caméra' : 'Retry Camera'}
                </button>

                {/* Continue without photo */}
                <button
                  onClick={() => handleSubmit(null)}
                  className="btn-press w-full py-3 rounded-xl font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition text-sm"
                >
                  {lang === 'fr' ? 'Continuer sans photo' : 'Continue Without Photo'}
                </button>

                <button
                  onClick={() => setScreen('main')}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  {t(lang, 'cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── VERIFYING SCREEN ────────────────────────────────────────── */}
        {screen === 'verifying' && (
          <div className="glass-card rounded-3xl shadow-2xl p-10 flex flex-col items-center animate-slide-up">
            <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-green-600 animate-spin mb-5" />
            <ShieldCheck className="w-8 h-8 mb-3" style={{ color: '#2e7d32' }} />
            <p className="font-bold text-gray-700 text-center">{t(lang, 'verifying')}</p>
          </div>
        )}

        {/* ── CONFIRMATION SCREEN ─────────────────────────────────────── */}
        {screen === 'confirmation' && (
          <div className="glass-card rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 pt-6 pb-4"
              style={{ background: action === 'in'
                ? 'linear-gradient(135deg, #1a4f1a, #2e7d32)'
                : 'linear-gradient(135deg, #b45309, #d97706)' }}>
              <div className="flex items-center justify-between">
                <SamwayLogo height={44} />
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
                  {action === 'in' ? t(lang, 'clockInBadge') : t(lang, 'clockOutBadge')}
                </span>
              </div>
            </div>

            <div className="p-6 text-center">
              {/* Success icon */}
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 animate-success-pulse ${
                action === 'in' ? 'bg-green-100' : 'bg-amber-100'
              }`}>
                {action === 'in'
                  ? <CheckCircle className="w-12 h-12 text-green-600" />
                  : <XCircle className="w-12 h-12 text-amber-600" />
                }
              </div>

              <h2 className="text-2xl font-black text-gray-800 mb-1">
                {action === 'in' ? t(lang, 'clockedIn') : t(lang, 'clockedOut')}
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                {action === 'in' ? t(lang, 'haveAGreatShift') : t(lang, 'thankYouHardWork')}
              </p>

              {/* Info card */}
              <div className="rounded-2xl p-4 mb-5 text-left space-y-3"
                style={{ background: 'linear-gradient(135deg, #f0fdf4, #fefce8)' }}>
                {photo && (
                  <div className="flex justify-center">
                    <img
                      src={photo}
                      alt="captured"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                    />
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">{t(lang, 'employeeLabel')}</span>
                  <span className="font-bold text-gray-800">{confirmedName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">{t(lang, 'timeLabel')}</span>
                  <span className="font-mono font-bold text-gray-800">{confirmedTime}</span>
                </div>
                {reason && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">{t(lang, 'reasonLabel')}</span>
                    <span className="font-medium text-gray-800">{reason}</span>
                  </div>
                )}
              </div>

              <button
                onClick={reset}
                className="btn-press w-full py-4 rounded-xl font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #2e7d32, #f9c900)',
                  fontSize: '1rem',
                }}
              >
                {t(lang, 'done')}
              </button>
            </div>
          </div>
        )}

        {/* ── ERROR SCREEN ────────────────────────────────────────────── */}
        {screen === 'error' && (
          <div className="glass-card rounded-3xl shadow-2xl p-8 text-center animate-slide-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="w-9 h-9 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {lang === 'fr' ? 'Erreur' : 'Error'}
            </h2>
            <p className="text-gray-600 text-sm mb-6">{errorMsg}</p>
            <button
              onClick={reset}
              className="btn-press w-full py-4 rounded-xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1b5e20, #2e7d32)' }}
            >
              {t(lang, 'cancel')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
