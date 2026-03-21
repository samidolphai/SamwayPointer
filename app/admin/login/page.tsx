'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, KeyRound } from 'lucide-react';
import SamwayLogo from '@/components/SamwayLogo';
import { t, type Lang } from '@/lib/i18n';

export default function AdminLogin() {
  const [lang, setLang] = useState<Lang>('en');
  // Login
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Forgot-password mode
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetContact, setResetContact] = useState('');
  const [resetNewPwd, setResetNewPwd] = useState('');
  const [resetConfirmPwd, setResetConfirmPwd] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('sw_lang') as Lang | null;
    if (stored === 'en' || stored === 'fr') setLang(stored);
  }, []);

  const switchLang = (l: Lang) => {
    localStorage.setItem('sw_lang', l);
    setLang(l);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      setError(t(lang, 'wrongPassword'));
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    if (resetNewPwd !== resetConfirmPwd) {
      setResetError(t(lang, 'passwordMismatch'));
      return;
    }
    if (resetNewPwd.length < 6) {
      setResetError(t(lang, 'passwordTooShort'));
      return;
    }
    setResetLoading(true);
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact: resetContact, new_password: resetNewPwd }),
    });
    setResetLoading(false);
    if (res.ok) {
      setResetSuccess(t(lang, 'resetSuccess'));
      setResetContact('');
      setResetNewPwd('');
      setResetConfirmPwd('');
    } else {
      const data = await res.json().catch(() => ({}));
      setResetError(
        res.status === 401 || res.status === 404
          ? t(lang, 'resetContactNotFound')
          : (data.error ?? 'Error')
      );
    }
  };

  const enterReset = () => {
    setMode('reset');
    setError('');
    setResetError('');
    setResetSuccess('');
  };

  const enterLogin = () => {
    setMode('login');
    setResetError('');
    setResetSuccess('');
  };

  return (
    <div className="min-h-screen bg-brand flex items-center justify-center p-4">
      {/* Ambient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #f9c900, transparent)' }} />
      </div>

      <div className="glass-card rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 flex flex-col items-center"
          style={{ background: 'linear-gradient(135deg, #1a4f1a, #2e7d32)' }}>
          <SamwayLogo height={64} className="mb-2" />
          <p className="font-black text-white text-lg leading-tight mb-1"
            style={{ letterSpacing: '-0.01em', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            SamwayPointer
          </p>

          {/* Language switcher */}
          <div className="flex items-center gap-1 bg-black/20 rounded-full p-1 mt-2">
            {(['en', 'fr'] as Lang[]).map((l) => (
              <button key={l} onClick={() => switchLang(l)}
                className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                style={{
                  background: lang === l ? '#f9c900' : 'transparent',
                  color: lang === l ? '#1a4f1a' : 'rgba(255,255,255,0.7)',
                }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* ── LOGIN MODE ───────────────────────────────────────────────── */}
          {mode === 'login' && (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #1b5e20, #f9c900)' }}>
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-black text-center text-gray-800 mb-1">
                {t(lang, 'adminAccess')}
              </h1>
              <p className="text-center text-gray-400 text-xs mb-6">Samway Sandwich</p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t(lang, 'password')}
                  required
                  autoFocus
                  className="input-sw w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-800 text-base"
                />
                {error && (
                  <p className="text-red-600 text-sm text-center">{error}</p>
                )}
                <button type="submit" disabled={loading}
                  className="btn-press w-full py-3 rounded-xl font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #2e7d32, #f9c900)' }}>
                  {loading ? t(lang, 'checking') : t(lang, 'login')}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between">
                <a href="/" className="text-xs text-gray-400 hover:text-gray-600 underline">
                  {t(lang, 'backToClock')}
                </a>
                <button
                  onClick={enterReset}
                  className="text-xs text-green-700 hover:text-green-900 font-semibold underline"
                >
                  {t(lang, 'forgotPassword')}
                </button>
              </div>
            </>
          )}

          {/* ── RESET MODE ───────────────────────────────────────────────── */}
          {mode === 'reset' && (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #1b5e20, #f9c900)' }}>
                <KeyRound className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-black text-center text-gray-800 mb-1">
                {t(lang, 'forgotPassword')}
              </h1>
              <p className="text-center text-gray-400 text-xs mb-6">Samway Sandwich</p>

              {resetSuccess ? (
                <div className="text-center space-y-4">
                  <p className="text-green-700 font-semibold text-sm">{resetSuccess}</p>
                  <button
                    onClick={enterLogin}
                    className="btn-press w-full py-3 rounded-xl font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #2e7d32, #f9c900)' }}>
                    {t(lang, 'backToLogin')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {t(lang, 'resetContactLabel')}
                    </label>
                    <input
                      type="text"
                      value={resetContact}
                      onChange={(e) => setResetContact(e.target.value)}
                      placeholder={t(lang, 'resetContactPlaceholder')}
                      required
                      autoFocus
                      className="input-sw w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-800 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {t(lang, 'resetNewPassword')}
                    </label>
                    <input
                      type="password"
                      value={resetNewPwd}
                      onChange={(e) => setResetNewPwd(e.target.value)}
                      placeholder="••••••"
                      required
                      className="input-sw w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-800 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {t(lang, 'resetConfirm')}
                    </label>
                    <input
                      type="password"
                      value={resetConfirmPwd}
                      onChange={(e) => setResetConfirmPwd(e.target.value)}
                      placeholder="••••••"
                      required
                      className="input-sw w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-800 text-base"
                    />
                  </div>
                  {resetError && (
                    <p className="text-red-600 text-sm text-center">{resetError}</p>
                  )}
                  <button type="submit" disabled={resetLoading}
                    className="btn-press w-full py-3 rounded-xl font-bold text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #2e7d32, #f9c900)' }}>
                    {resetLoading ? t(lang, 'checking') : t(lang, 'resetSubmit')}
                  </button>
                  <button
                    type="button"
                    onClick={enterLogin}
                    className="w-full py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-700 transition">
                    {t(lang, 'backToLogin')}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
