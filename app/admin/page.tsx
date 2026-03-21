'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download, LogOut, Search, ChevronLeft, ChevronRight,
  User, Plus, Pencil, Trash2, X, Camera, CheckCircle2,
  XCircle, Clock, Users, ShieldAlert, Eye, EyeOff, KeyRound,
} from 'lucide-react';
import SamwayLogo from '@/components/SamwayLogo';
import { t, type Lang } from '@/lib/i18n';
import type { ClockRecordSummary, RecordsResponse, VerificationLog } from '@/types';

// ── Language persistence ──────────────────────────────────────────────────
function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>('en');
  useEffect(() => {
    const stored = localStorage.getItem('sw_lang') as Lang | null;
    if (stored === 'en' || stored === 'fr') setLangState(stored);
  }, []);
  const setLang = (l: Lang) => { localStorage.setItem('sw_lang', l); setLangState(l); };
  return [lang, setLang];
}

type Tab = 'records' | 'employees' | 'verification';

// ── Employee shape from API ────────────────────────────────────────────────
interface EmployeeSummary {
  id: string;
  employee_id: string;
  name: string;
  has_face_photo: boolean;
  created_at: string;
  updated_at: string;
}

// ── Employee Modal ────────────────────────────────────────────────────────
interface EmployeeModalProps {
  lang: Lang;
  initial?: EmployeeSummary | null;
  onClose: () => void;
  onSaved: () => void;
}

function EmployeeModal({ lang, initial, onClose, onSaved }: EmployeeModalProps) {
  const [empId, setEmpId] = useState(initial?.employee_id ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [pinInput, setPinInput] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  // facePhoto: null = unchanged/none, string = new photo set by user
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  // currentPhoto: the photo already saved in DB (loaded on open)
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(!!initial);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load existing face photo from API when editing
  useEffect(() => {
    if (!initial) return;
    fetch(`/api/employees/${initial.id}`)
      .then((r) => r.json())
      .then((data) => {
        setCurrentPhoto(data.face_photo ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingPhoto(false));
  }, [initial]);

  // Cleanup camera on unmount
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
  }, []);

  const openCamera = async () => {
    setCameraBlocked(false);
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraBlocked(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setCameraReady(true);
        }
      }, 100);
    } catch {
      setCameraBlocked(true);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraReady(false);
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const photo = canvas.toDataURL('image/jpeg', 0.82);
    setFacePhoto(photo);
    setCurrentPhoto(photo); // show preview immediately
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFacePhoto(result);
      setCurrentPhoto(result); // show preview immediately
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setFacePhoto(''); // empty string = explicitly cleared
    setCurrentPhoto(null);
  };

  const handleSave = async () => {
    if (!empId.trim() || !name.trim()) {
      setError(lang === 'fr' ? 'Tous les champs sont requis.' : 'All fields are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const url = initial ? `/api/employees/${initial.id}` : '/api/employees';
      const method = initial ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        employee_id: empId.trim().toUpperCase(),
        name: name.trim(),
      };
      // Only send face_photo if the user explicitly changed it
      if (facePhoto !== null) body.face_photo = facePhoto || null;
      // Only send pin if provided (blank = leave unchanged on edit)
      if (pinInput.trim()) body.pin = pinInput.trim();

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(lang === 'fr' ? (data.error_fr ?? data.error) : data.error);
        setSaving(false);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError(lang === 'fr' ? 'Erreur réseau.' : 'Network error.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">
            {initial ? t(lang, 'editEmployee') : t(lang, 'addEmployee')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              {t(lang, 'employeeIdLabel')}
            </label>
            <input
              type="text"
              value={empId}
              onChange={(e) => setEmpId(e.target.value.toUpperCase())}
              placeholder="EMP001"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl font-mono text-gray-800 focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              {t(lang, 'employeeName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-800 focus:border-green-500 focus:outline-none"
            />
          </div>

          {/* PIN field */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              {t(lang, 'pinLabel2')}
            </label>
            <div className="relative">
              <input
                type={pinVisible ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t(lang, 'setPinPlaceholder')}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-800 focus:border-green-500 focus:outline-none pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setPinVisible((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {pinVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {initial && (
              <p className="text-xs text-gray-400 mt-1">
                {lang === 'fr' ? 'Laisser vide pour conserver le PIN actuel' : 'Leave blank to keep current PIN'}
              </p>
            )}
            {!pinInput && !initial && (
              <p className="text-xs text-amber-600 mt-1">
                {t(lang, 'noPinRequired')}
              </p>
            )}
          </div>

          {/* Face photo */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              {t(lang, 'facePhotoLabel')}
            </label>

            {loadingPhoto ? (
              <div className="text-xs text-gray-400 py-2">
                {lang === 'fr' ? 'Chargement…' : 'Loading photo…'}
              </div>
            ) : cameraOpen ? (
              <div>
                <div className="rounded-xl overflow-hidden bg-gray-900 mb-2"
                  style={{ aspectRatio: '4/3' }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    className="w-full h-full object-cover" />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={captureFromCamera} disabled={!cameraReady}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: '#1b5e20' }}>
                    <Camera className="w-4 h-4 inline mr-1" />
                    {t(lang, 'capturePhoto')}
                  </button>
                  <button onClick={stopCamera}
                    className="px-4 py-2 rounded-lg text-sm text-gray-600 bg-gray-100">
                    {t(lang, 'cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Current photo preview */}
                {currentPhoto && (
                  <div className="flex items-center gap-3">
                    <img src={currentPhoto} alt="face"
                      className="w-16 h-16 rounded-full object-cover border-2 border-green-200 shadow-sm" />
                    <button onClick={removePhoto}
                      className="text-xs text-red-500 hover:text-red-700 underline">
                      {lang === 'fr' ? 'Supprimer la photo' : 'Remove photo'}
                    </button>
                  </div>
                )}

                {/* Upload / camera buttons */}
                <div className="flex gap-2 flex-wrap">
                  <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    {currentPhoto
                      ? (lang === 'fr' ? 'Changer la photo' : 'Change photo')
                      : t(lang, 'uploadPhoto')}
                  </label>
                  <button onClick={openCamera}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                    <Camera className="w-4 h-4" />
                    {t(lang, 'orUseCameraLabel')}
                  </button>
                </div>

                {/* Camera blocked notice */}
                {cameraBlocked && (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    {lang === 'fr'
                      ? 'Caméra inaccessible — utilisez le bouton Télécharger Photo.'
                      : 'Camera unavailable — use the Upload Photo button instead.'}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-gray-600 bg-gray-100 font-semibold hover:bg-gray-200 transition text-sm">
            {t(lang, 'cancel')}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #2e7d32, #1b5e20)' }}>
            {saving ? t(lang, 'saving2') : t(lang, 'save')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Photo modal ────────────────────────────────────────────────────────────
function PhotoModal({ name, photo, onClose }: { name: string; photo: string | null; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center"
        onClick={(e) => e.stopPropagation()}>
        <p className="font-bold text-gray-800 mb-4">{name}</p>
        {photo ? (
          <img src={photo} alt={name}
            className="w-40 h-40 rounded-full object-cover mx-auto border-4 border-gray-100 shadow" />
        ) : (
          <div className="w-40 h-40 rounded-full bg-gray-100 mx-auto flex items-center justify-center">
            <User className="w-16 h-16 text-gray-300" />
          </div>
        )}
        <button onClick={onClose}
          className="mt-5 text-sm text-gray-500 hover:text-gray-700 underline">Close</button>
      </div>
    </div>
  );
}

// ── Profile & Security Modal ──────────────────────────────────────────────
interface ProfileModalProps {
  lang: Lang;
  onClose: () => void;
}

function ProfileModal({ lang, onClose }: ProfileModalProps) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [profileCurrentPwd, setProfileCurrentPwd] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/profile')
      .then((r) => r.json())
      .then((d) => {
        setRecoveryEmail(d.recovery_email ?? '');
        setRecoveryPhone(d.recovery_phone ?? '');
      })
      .catch(() => {});
  }, []);

  const handleChangePassword = async () => {
    setPwdError('');
    setPwdMsg('');
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError(lang === 'fr' ? 'Tous les champs sont requis.' : 'All fields are required.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError(t(lang, 'passwordMismatch'));
      return;
    }
    if (newPwd.length < 6) {
      setPwdError(t(lang, 'passwordTooShort'));
      return;
    }
    setPwdSaving(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdError(lang === 'fr' ? t(lang, 'incorrectCurrentPwd') : (data.error ?? t(lang, 'incorrectCurrentPwd')));
      } else {
        setPwdMsg(t(lang, 'passwordChanged'));
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
      }
    } catch {
      setPwdError(lang === 'fr' ? 'Erreur réseau.' : 'Network error.');
    } finally {
      setPwdSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileError('');
    setProfileMsg('');
    if (!profileCurrentPwd) {
      setProfileError(lang === 'fr' ? 'Le mot de passe actuel est requis.' : 'Current password is required.');
      return;
    }
    setProfileSaving(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recovery_email: recoveryEmail,
          recovery_phone: recoveryPhone,
          current_password: profileCurrentPwd,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(lang === 'fr' ? (data.error_fr ?? data.error) : data.error);
      } else {
        setProfileMsg(t(lang, 'profileSaved'));
        setProfileCurrentPwd('');
      }
    } catch {
      setProfileError(lang === 'fr' ? 'Erreur réseau.' : 'Network error.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <KeyRound className="w-5 h-5" style={{ color: '#1b5e20' }} />
            {t(lang, 'profileSettings')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Change password section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {t(lang, 'changePassword')}
            </h3>
            <div className="space-y-3">
              <input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder={t(lang, 'currentPassword')}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-800 focus:border-green-500 focus:outline-none text-sm"
              />
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder={t(lang, 'newPassword')}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-800 focus:border-green-500 focus:outline-none text-sm"
              />
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder={t(lang, 'confirmPassword')}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-800 focus:border-green-500 focus:outline-none text-sm"
              />
              {pwdError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{pwdError}</p>}
              {pwdMsg && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{pwdMsg}</p>}
              <button
                onClick={handleChangePassword}
                disabled={pwdSaving}
                className="w-full py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2e7d32, #1b5e20)' }}
              >
                {pwdSaving ? t(lang, 'saving2') : t(lang, 'changePassword')}
              </button>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Profile section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {lang === 'fr' ? 'Informations de récupération' : 'Recovery Information'}
            </h3>
            <div className="space-y-3">
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder={t(lang, 'recoveryEmail')}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-800 focus:border-green-500 focus:outline-none text-sm"
              />
              <input
                type="tel"
                value={recoveryPhone}
                onChange={(e) => setRecoveryPhone(e.target.value)}
                placeholder={t(lang, 'recoveryPhone')}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-800 focus:border-green-500 focus:outline-none text-sm"
              />
              <input
                type="password"
                value={profileCurrentPwd}
                onChange={(e) => setProfileCurrentPwd(e.target.value)}
                placeholder={t(lang, 'currentPassword')}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-800 focus:border-green-500 focus:outline-none text-sm"
              />
              {profileError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{profileError}</p>}
              {profileMsg && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{profileMsg}</p>}
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="w-full py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2e7d32, #1b5e20)' }}
              >
                {profileSaving ? t(lang, 'saving2') : t(lang, 'save')}
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-gray-600 bg-gray-100 font-semibold hover:bg-gray-200 transition text-sm"
          >
            {t(lang, 'cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const [activeTab, setActiveTab] = useState<Tab>('records');

  // Records state
  const [records, setRecords] = useState<ClockRecordSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const [nameFilter, setNameFilter] = useState('');
  const [debouncedName, setDebouncedName] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [recordsLoading, setRecordsLoading] = useState(true);

  // Debounce name/ID filter — 350 ms after last keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(nameFilter), 350);
    return () => clearTimeout(t);
  }, [nameFilter]);

  // Employees state
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [employeeModal, setEmployeeModal] = useState<{ open: boolean; editing: EmployeeSummary | null }>({
    open: false, editing: null,
  });

  // Verification logs state
  const [verifyLogs, setVerifyLogs] = useState<VerificationLog[]>([]);
  const [verifyTotal, setVerifyTotal] = useState(0);
  const [verifyPage, setVerifyPage] = useState(1);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyNameFilter, setVerifyNameFilter] = useState('');
  const [verifyDebouncedName, setVerifyDebouncedName] = useState('');
  const [verifyFromFilter, setVerifyFromFilter] = useState('');
  const [verifyToFilter, setVerifyToFilter] = useState('');

  // Debounce verification name filter
  useEffect(() => {
    const timer = setTimeout(() => setVerifyDebouncedName(verifyNameFilter), 350);
    return () => clearTimeout(timer);
  }, [verifyNameFilter]);

  // Photo modal
  const [photoModal, setPhotoModal] = useState<{ name: string; photo: string | null } | null>(null);

  // Profile modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debouncedName) params.set('name', debouncedName);
    if (fromFilter) params.set('from', fromFilter);
    if (toFilter) params.set('to', toFilter);
    const res = await fetch(`/api/records?${params}`);
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data: RecordsResponse = await res.json();
    setRecords(data.records);
    setTotal(data.total);
    setRecordsLoading(false);
  }, [page, debouncedName, fromFilter, toFilter, router]);

  const fetchEmployees = useCallback(async () => {
    setEmpLoading(true);
    const res = await fetch('/api/employees');
    if (res.status === 401) { router.push('/admin/login'); return; }
    setEmployees(await res.json());
    setEmpLoading(false);
  }, [router]);

  const fetchVerifyLogs = useCallback(async () => {
    setVerifyLoading(true);
    const params = new URLSearchParams({ page: String(verifyPage), pageSize: '50' });
    if (verifyDebouncedName) params.set('name', verifyDebouncedName);
    if (verifyFromFilter) params.set('from', verifyFromFilter);
    if (verifyToFilter) params.set('to', verifyToFilter);
    const res = await fetch(`/api/verify/logs?${params}`);
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    setVerifyLogs(data.logs ?? []);
    setVerifyTotal(data.total ?? 0);
    setVerifyLoading(false);
  }, [verifyPage, verifyDebouncedName, verifyFromFilter, verifyToFilter, router]);

  useEffect(() => { if (activeTab === 'records') fetchRecords(); }, [activeTab, fetchRecords]);
  useEffect(() => { if (activeTab === 'employees') fetchEmployees(); }, [activeTab, fetchEmployees]);
  useEffect(() => { if (activeTab === 'verification') fetchVerifyLogs(); }, [activeTab, fetchVerifyLogs]);

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm(t(lang, 'confirmDelete'))) return;
    await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    fetchEmployees();
  };

  const handleDeleteRecord = async (id: number) => {
    const msg = lang === 'fr'
      ? 'Supprimer ce pointage définitivement ?'
      : 'Permanently delete this record?';
    if (!confirm(msg)) return;
    await fetch(`/api/records/${id}`, { method: 'DELETE' });
    fetchRecords();
  };

  const openPhotoModal = async (id: number, name: string) => {
    setPhotoModal({ name, photo: null });
    const res = await fetch(`/api/records/${id}/photo`);
    if (res.ok) {
      const { photo } = await res.json();
      setPhotoModal({ name, photo: photo ?? null });
    }
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: 'records', icon: <Clock className="w-4 h-4" />, label: t(lang, 'clockRecordsTab') },
    { key: 'employees', icon: <Users className="w-4 h-4" />, label: t(lang, 'employeesTab') },
    { key: 'verification', icon: <ShieldAlert className="w-4 h-4" />, label: t(lang, 'verificationLogsTab') },
  ];

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SamwayLogo height={40} />
            <div className="hidden sm:block h-8 w-px bg-gray-200" />
            <div className="hidden sm:block">
              <p className="font-black text-gray-800 text-sm leading-tight" style={{ letterSpacing: '-0.01em' }}>SamwayPointer</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-1 mr-2">
              {(['en', 'fr'] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className="px-2.5 py-1 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: lang === l ? '#1b5e20' : 'transparent',
                    color: lang === l ? 'white' : '#6b7280',
                  }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            {activeTab === 'records' && (
              <a href="/api/records/export" download
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #2e7d32, #1b5e20)' }}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{t(lang, 'exportCsv')}</span>
              </a>
            )}
            {activeTab === 'employees' && (
              <button onClick={() => setEmployeeModal({ open: true, editing: null })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #2e7d32, #1b5e20)' }}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{t(lang, 'addEmployee')}</span>
              </button>
            )}
            <button
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition"
              title={t(lang, 'profileSettings')}
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">{t(lang, 'profileSettings')}</span>
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t(lang, 'logout')}</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 pb-0">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all"
              style={{
                borderColor: activeTab === tab.key ? '#1b5e20' : 'transparent',
                color: activeTab === tab.key ? '#1b5e20' : '#9ca3af',
              }}>
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* ── RECORDS TAB ─────────────────────────────────────────────── */}
        {activeTab === 'records' && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={nameFilter}
                    onChange={(e) => { setNameFilter(e.target.value); setPage(1); }}
                    placeholder={t(lang, 'filterByName')}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:outline-none" />
                </div>
                <input type="date" value={fromFilter}
                  onChange={(e) => { setFromFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 focus:border-green-500 focus:outline-none" />
                <input type="date" value={toFilter}
                  onChange={(e) => { setToFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 focus:border-green-500 focus:outline-none" />
              </div>
              {(nameFilter || fromFilter || toFilter) && (
                <button
                  onClick={() => { setNameFilter(''); setFromFilter(''); setToFilter(''); setPage(1); }}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 underline">
                  {t(lang, 'clearFilters')}
                </button>
              )}
            </div>

            {/* Stats + pagination */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">
                {recordsLoading ? t(lang, 'loading') : `${total} ${t(lang, 'recordsSuffix')}`}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {recordsLoading ? (
                <div className="py-16 text-center text-gray-400 text-sm">{t(lang, 'loading')}</div>
              ) : records.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm">{t(lang, 'noRecords')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100" style={{ background: '#f8fafc' }}>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">{t(lang, 'photo')}</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">{t(lang, 'idCol')}</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">{t(lang, 'nameCol')}</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">{t(lang, 'actionCol')}</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">{t(lang, 'dateCol')}</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">{t(lang, 'timeCol')}</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id}
                          className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <button onClick={() => openPhotoModal(r.id, r.employee_name)}
                              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition overflow-hidden">
                              <User className="w-4 h-4 text-gray-400" />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
                              {r.employee_id}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{r.employee_name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              r.action === 'in'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {r.action === 'in' ? t(lang, 'clockInBadge') : t(lang, 'clockOutBadge')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(r.timestamp)}</td>
                          <td className="px-4 py-3 font-mono text-gray-600 text-xs">{fmtTime(r.timestamp)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteRecord(r.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                              title={lang === 'fr' ? 'Supprimer' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── EMPLOYEES TAB ────────────────────────────────────────────── */}
        {activeTab === 'employees' && (
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {empLoading ? (
                <div className="py-16 text-center text-gray-400 text-sm">{t(lang, 'loading')}</div>
              ) : employees.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">{t(lang, 'noEmployees')}</p>
                  <button onClick={() => setEmployeeModal({ open: true, editing: null })}
                    className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: '#1b5e20' }}>
                    {t(lang, 'addEmployee')}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100" style={{ background: '#f8fafc' }}>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">{t(lang, 'employeeIdLabel')}</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">{t(lang, 'employeeName')}</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">{t(lang, 'facePhotoLabel')}</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm font-bold px-2 py-1 rounded-lg"
                              style={{ background: '#f0fdf4', color: '#1b5e20' }}>
                              {emp.employee_id}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{emp.name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                              emp.has_face_photo ? 'text-green-600' : 'text-gray-400'
                            }`}>
                              {emp.has_face_photo
                                ? <><CheckCircle2 className="w-3.5 h-3.5" /> {t(lang, 'hasFacePhoto')}</>
                                : <><XCircle className="w-3.5 h-3.5" /> {t(lang, 'noFacePhoto')}</>
                              }
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => setEmployeeModal({ open: true, editing: emp })}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteEmployee(emp.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VERIFICATION LOGS TAB ───────────────────────────────────── */}
        {activeTab === 'verification' && (
          <div>
            {/* Verification log filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={verifyNameFilter}
                    onChange={(e) => { setVerifyNameFilter(e.target.value); setVerifyPage(1); }}
                    placeholder={t(lang, 'filterLogs')}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:outline-none" />
                </div>
                <input type="date" value={verifyFromFilter}
                  onChange={(e) => { setVerifyFromFilter(e.target.value); setVerifyPage(1); }}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 focus:border-green-500 focus:outline-none" />
                <input type="date" value={verifyToFilter}
                  onChange={(e) => { setVerifyToFilter(e.target.value); setVerifyPage(1); }}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 focus:border-green-500 focus:outline-none" />
              </div>
              {(verifyNameFilter || verifyFromFilter || verifyToFilter) && (
                <button
                  onClick={() => { setVerifyNameFilter(''); setVerifyFromFilter(''); setVerifyToFilter(''); setVerifyPage(1); }}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 underline">
                  {t(lang, 'clearFilters')}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">
                {verifyLoading ? t(lang, 'loading') : `${verifyTotal} ${t(lang, 'recordsSuffix')}`}
              </p>
              {Math.ceil(verifyTotal / 50) > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setVerifyPage((p) => Math.max(1, p - 1))} disabled={verifyPage === 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">{verifyPage}</span>
                  <button onClick={() => setVerifyPage((p) => p + 1)} disabled={verifyPage * 50 >= verifyTotal}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {verifyLoading ? (
                <div className="py-16 text-center text-gray-400 text-sm">{t(lang, 'loading')}</div>
              ) : verifyLogs.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm">{t(lang, 'noVerificationLogs')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100" style={{ background: '#f8fafc' }}>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t(lang, 'idCol')}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t(lang, 'nameCol')}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t(lang, 'actionCol')}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'fr' ? 'Statut' : 'Status'}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t(lang, 'reasonCol')}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t(lang, 'timeCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifyLogs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
                              {log.employee_id}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{log.employee_name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              log.action === 'in' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {log.action === 'in' ? t(lang, 'clockInBadge') : t(lang, 'clockOutBadge')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {log.success
                                ? <><CheckCircle2 className="w-3 h-3" /> {t(lang, 'successBadge')}</>
                                : <><XCircle className="w-3 h-3" /> {t(lang, 'failedBadge')}</>
                              }
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{log.reason ?? '—'}</td>
                          <td className="px-4 py-3 font-mono text-gray-500 text-xs">{fmtTime(log.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Photo modal */}
      {photoModal && (
        <PhotoModal name={photoModal.name} photo={photoModal.photo}
          onClose={() => setPhotoModal(null)} />
      )}

      {/* Employee modal */}
      {employeeModal.open && (
        <EmployeeModal
          lang={lang}
          initial={employeeModal.editing}
          onClose={() => setEmployeeModal({ open: false, editing: null })}
          onSaved={fetchEmployees}
        />
      )}

      {/* Profile & Security modal */}
      {profileModalOpen && (
        <ProfileModal
          lang={lang}
          onClose={() => setProfileModalOpen(false)}
        />
      )}
    </div>
  );
}
