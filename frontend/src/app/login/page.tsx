'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/utils/api';
import {
  Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle2,
  ArrowLeft, RefreshCw, ShieldCheck, Loader2
} from 'lucide-react';

/* ─── types ─────────────────────────────────── */
type Step = 'login' | 'forgot-email' | 'forgot-otp' | 'forgot-reset' | 'forgot-success';

/* ─── tiny helpers ───────────────────────────── */
function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function validatePassword(v: string) {
  const errors: string[] = [];
  if (v.length < 8)               errors.push('At least 8 characters');
  if (!/[A-Z]/.test(v))           errors.push('One uppercase letter');
  if (!/[0-9]/.test(v))           errors.push('One number');
  return errors;
}

/* ─── reusable input ─────────────────────────── */
interface InputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  icon?: React.ReactNode;
  rightEl?: React.ReactNode;
  disabled?: boolean;
  autoComplete?: string;
}
function FormInput({
  id, label, type = 'text', value, onChange,
  placeholder, error, icon, rightEl, disabled, autoComplete
}: InputProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`w-full bg-slate-950/80 border rounded-xl px-4 py-3 text-sm text-slate-100
            placeholder-slate-600 outline-none transition-all duration-200 disabled:opacity-50
            ${icon ? 'pl-10' : ''}
            ${rightEl ? 'pr-12' : ''}
            ${error
              ? 'border-rose-500/70 focus:border-rose-400 focus:ring-1 focus:ring-rose-500/30'
              : 'border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
            }`}
        />
        {rightEl && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightEl}
          </span>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

/* ─── password strength bar ──────────────────── */
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
    password.length >= 12,
  ].filter(Boolean).length;

  const label = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][score - 1] ?? 'Very Weak';
  const colors = ['bg-rose-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-teal-400'];
  const color  = colors[score - 1] ?? 'bg-rose-500';

  return (
    <div className="space-y-1 mt-1">
      <div className="flex gap-1">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
            ${i <= score ? color : 'bg-slate-700'}`} />
        ))}
      </div>
      <p className={`text-xs font-semibold ${color.replace('bg-','text-')}`}>{label}</p>
    </div>
  );
}

/* ─── alert banner ───────────────────────────── */
function Alert({ type, message }: { type: 'error' | 'success'; message: string }) {
  const isError = type === 'error';
  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm border
      ${isError
        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      }`}>
      {isError
        ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
      <span>{message}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page Component
───────────────────────────────────────────── */
export default function LoginPage() {
  const { login, user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  /* shared */
  const [step,       setStep]       = useState<Step>('login');
  const [globalMsg,  setGlobalMsg]  = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [loading,    setLoading]    = useState(false);

  /* ── LOGIN fields ── */
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  /* ── FORGOT PASS fields ── */
  const [fpEmail,      setFpEmail]      = useState('');
  const [fpEmailErr,   setFpEmailErr]   = useState('');
  const [fpOtp,        setFpOtp]        = useState('');
  const [fpOtpErr,     setFpOtpErr]     = useState('');
  const [resetToken,   setResetToken]   = useState<number | null>(null);
  const [newPwd,       setNewPwd]       = useState('');
  const [confirmPwd,   setConfirmPwd]   = useState('');
  const [showNewPwd,   setShowNewPwd]   = useState(false);
  const [showCfmPwd,   setShowCfmPwd]   = useState(false);
  const [resetErrors,  setResetErrors]  = useState<{ new?: string; confirm?: string }>({});
  const [resendCooldown, setResendCooldown] = useState(0);

  /* ── Redirect already-authenticated users away from this page ── */
  useEffect(() => {
    if (authLoading) return;          // still resolving session — wait
    if (!user) return;                // not logged in — show the page normally

    // User is logged in: send them to their dashboard
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') router.replace('/admin');
    else if (role === 'TRAVELER')                   router.replace('/traveler');
    else                                            router.replace('/manager');
  }, [authLoading, user, role, router]);

  /* ── helpers ── */
  const clearGlobal = () => setGlobalMsg(null);

  const startResendTimer = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  };

  /* ═══════════════════════════════════════════
     LOGIN — submit
  ═══════════════════════════════════════════ */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearGlobal();

    // client-side validation
    const errors: { email?: string; password?: string } = {};
    if (!email.trim())                    errors.email    = 'Email is required.';
    else if (!validateEmail(email))       errors.email    = 'Enter a valid email address.';
    if (!password)                        errors.password = 'Password is required.';
    else if (password.length < 8)         errors.password = 'Password must be at least 8 characters.';

    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      if (user.status === 'PENDING')                                           router.push('/pending');
      else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')           router.push('/admin');
      else if (user.role === 'TRAVELER')                                       router.push('/traveler');
      else                                                                     router.push('/manager');
    } catch (err: any) {
      const detail = err?.detail || err?.error || err?.non_field_errors?.[0] || '';
      // Map common backend errors to friendly messages
      const msg =
        typeof detail === 'string' && detail.toLowerCase().includes('no active account')
          ? 'No account found with this email and password. Please check your credentials.'
          : typeof detail === 'string' && detail.toLowerCase().includes('rejected')
          ? 'Your account registration was rejected. Please contact support.'
          : typeof detail === 'string' && detail
          ? detail
          : 'Login failed. Please verify your credentials and try again.';
      setGlobalMsg({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  /* ═══════════════════════════════════════════
     FORGOT — Step 1: request OTP
  ═══════════════════════════════════════════ */
  const handleFpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    clearGlobal();
    if (!fpEmail.trim()) { setFpEmailErr('Email is required.'); return; }
    if (!validateEmail(fpEmail)) { setFpEmailErr('Enter a valid email address.'); return; }
    setFpEmailErr('');
    setLoading(true);
    try {
      await api.post('auth/forgot-password/request/', { email: fpEmail.trim().toLowerCase() });
      setGlobalMsg({ type: 'success', text: 'OTP sent! Check your inbox (and spam folder).' });
      startResendTimer();
      setStep('forgot-otp');
    } catch (err: any) {
      setGlobalMsg({ type: 'error', text: err?.response?.data?.error || 'Failed to send OTP. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    clearGlobal();
    setLoading(true);
    try {
      await api.post('auth/forgot-password/request/', { email: fpEmail.trim().toLowerCase() });
      setGlobalMsg({ type: 'success', text: 'A new OTP has been sent to your email.' });
      startResendTimer();
      setFpOtp('');
    } catch {
      setGlobalMsg({ type: 'error', text: 'Failed to resend OTP. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  /* ═══════════════════════════════════════════
     FORGOT — Step 2: verify OTP
  ═══════════════════════════════════════════ */
  const handleFpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    clearGlobal();
    if (!fpOtp.trim() || fpOtp.length !== 6 || !/^\d+$/.test(fpOtp)) {
      setFpOtpErr('Enter the 6-digit OTP from your email.');
      return;
    }
    setFpOtpErr('');
    setLoading(true);
    try {
      const res = await api.post('auth/forgot-password/verify-otp/', {
        email: fpEmail.trim().toLowerCase(),
        otp: fpOtp.trim(),
      });
      setResetToken(res.data.reset_token);
      setGlobalMsg({ type: 'success', text: 'OTP verified! Set your new password below.' });
      setStep('forgot-reset');
    } catch (err: any) {
      setFpOtpErr(err?.response?.data?.error || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  /* ═══════════════════════════════════════════
     FORGOT — Step 3: reset password
  ═══════════════════════════════════════════ */
  const handleFpReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearGlobal();
    const errors: { new?: string; confirm?: string } = {};
    const pwdErrors = validatePassword(newPwd);
    if (!newPwd)            errors.new     = 'New password is required.';
    else if (pwdErrors.length) errors.new  = `Needs: ${pwdErrors.join(', ')}.`;
    if (!confirmPwd)        errors.confirm = 'Please confirm your password.';
    else if (newPwd !== confirmPwd) errors.confirm = 'Passwords do not match.';
    setResetErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      await api.post('auth/forgot-password/reset/', {
        email: fpEmail.trim().toLowerCase(),
        reset_token: resetToken,
        new_password: newPwd,
        confirm_password: confirmPwd,
      });
      setStep('forgot-success');
    } catch (err: any) {
      setGlobalMsg({ type: 'error', text: err?.response?.data?.error || 'Reset failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  /* ─── OTP digit input handler ── */
  const handleOtpChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 6);
    setFpOtp(digits);
    if (fpOtpErr) setFpOtpErr('');
  };

  /* ─── back to login ── */
  const backToLogin = () => {
    setStep('login');
    setFpEmail(''); setFpOtp(''); setNewPwd(''); setConfirmPwd('');
    setFpEmailErr(''); setFpOtpErr('');
    setResetToken(null); setResetErrors({});
    clearGlobal();
  };

  /* While we're verifying the session OR performing the redirect, show a
     full-screen spinner so the login form never flickers into view */
  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4">
      {/* Decorative blobs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/40 relative z-10">

        {/* ══════════════════════════════════════
            STEP: LOGIN
        ══════════════════════════════════════ */}
        {step === 'login' && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 mb-4">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Welcome Back
              </h1>
              <p className="text-slate-400 mt-2 text-sm">Sign in to access your travel planner dashboard</p>
            </div>

            {globalMsg && <div className="mb-5"><Alert type={globalMsg.type} message={globalMsg.text} /></div>}

            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              <FormInput
                id="login-email"
                label="Email Address"
                type="email"
                value={email}
                onChange={(v) => { setEmail(v); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' })); }}
                placeholder="traveler@smarttravel.com"
                error={fieldErrors.email}
                icon={<Mail className="w-4 h-4" />}
                autoComplete="email"
                disabled={loading}
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-pwd" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setStep('forgot-email'); setFpEmail(email); clearGlobal(); }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="login-pwd"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' })); }}
                    placeholder="••••••••"
                    disabled={loading}
                    autoComplete="current-password"
                    className={`w-full bg-slate-950/80 border rounded-xl pl-10 pr-12 py-3 text-sm text-slate-100
                      placeholder-slate-600 outline-none transition-all disabled:opacity-50
                      ${fieldErrors.password
                        ? 'border-rose-500/70 focus:border-rose-400 focus:ring-1 focus:ring-rose-500/30'
                        : 'border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{fieldErrors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400
                  text-slate-950 font-bold py-3.5 px-4 rounded-xl transition-all duration-200
                  active:scale-95 disabled:opacity-50 disabled:pointer-events-none
                  flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 mt-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-500">
              New to our platform?{' '}
              <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Create an Account
              </Link>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            STEP: FORGOT — enter email
        ══════════════════════════════════════ */}
        {step === 'forgot-email' && (
          <>
            <button onClick={backToLogin} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-semibold mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </button>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 mb-4">
                <Mail className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">Forgot Password?</h2>
              <p className="text-slate-400 mt-2 text-sm">
                Enter your registered email address and we'll send you a 6-digit OTP to reset your password.
              </p>
            </div>

            {globalMsg && <div className="mb-5"><Alert type={globalMsg.type} message={globalMsg.text} /></div>}

            <form onSubmit={handleFpRequest} className="space-y-5" noValidate>
              <FormInput
                id="fp-email"
                label="Email Address"
                type="email"
                value={fpEmail}
                onChange={(v) => { setFpEmail(v); if (fpEmailErr) setFpEmailErr(''); }}
                placeholder="your@email.com"
                error={fpEmailErr}
                icon={<Mail className="w-4 h-4" />}
                autoComplete="email"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400
                  text-black font-bold py-3.5 rounded-xl transition-all duration-200
                  active:scale-95 disabled:opacity-50 disabled:pointer-events-none
                  flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP…</> : 'Send OTP to Email'}
              </button>
            </form>
          </>
        )}

        {/* ══════════════════════════════════════
            STEP: FORGOT — enter OTP
        ══════════════════════════════════════ */}
        {step === 'forgot-otp' && (
          <>
            <button onClick={() => { setStep('forgot-email'); clearGlobal(); }} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-semibold mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Change Email
            </button>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 mb-4">
                <ShieldCheck className="w-7 h-7 text-violet-400" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">Check Your Email</h2>
              <p className="text-slate-400 mt-2 text-sm">
                We sent a 6-digit OTP to <span className="text-white font-semibold">{fpEmail}</span>.<br />
                It expires in <span className="text-violet-400 font-semibold">10 minutes</span>.
              </p>
            </div>

            {globalMsg && <div className="mb-5"><Alert type={globalMsg.type} message={globalMsg.text} /></div>}

            <form onSubmit={handleFpVerify} className="space-y-5" noValidate>
              {/* OTP digits display */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  One-Time Password
                </label>
                {/* Single hidden input + visual boxes */}
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    value={fpOtp}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-text z-10"
                    aria-label="OTP"
                    disabled={loading}
                  />
                  <div className="flex gap-2 pointer-events-none select-none">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-14 flex items-center justify-center rounded-xl border-2 text-xl font-black transition-all duration-150
                          ${fpOtp[i] ? 'border-violet-500 bg-violet-500/10 text-violet-200' : 'border-slate-700 bg-slate-950/60 text-slate-600'}
                          ${i === fpOtp.length ? 'border-violet-400 shadow-[0_0_0_3px_rgba(139,92,246,0.2)]' : ''}
                          ${fpOtpErr ? 'border-rose-500/70' : ''}`}
                      >
                        {fpOtp[i] ?? ''}
                      </div>
                    ))}
                  </div>
                </div>
                {fpOtpErr && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{fpOtpErr}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || fpOtp.length !== 6}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500
                  text-white font-bold py-3.5 rounded-xl transition-all duration-200
                  active:scale-95 disabled:opacity-50 disabled:pointer-events-none
                  flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify OTP'}
              </button>

              {/* Resend */}
              <div className="text-center text-sm text-slate-500">
                Didn&apos;t receive it?{' '}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <RefreshCw className="w-3 h-3" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ══════════════════════════════════════
            STEP: FORGOT — set new password
        ══════════════════════════════════════ */}
        {step === 'forgot-reset' && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 mb-4">
                <Lock className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">Set New Password</h2>
              <p className="text-slate-400 mt-2 text-sm">
                Choose a strong password for your account.
              </p>
            </div>

            {globalMsg && <div className="mb-5"><Alert type={globalMsg.type} message={globalMsg.text} /></div>}

            <form onSubmit={handleFpReset} className="space-y-5" noValidate>
              {/* New password */}
              <div className="space-y-1.5">
                <label htmlFor="new-pwd" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="new-pwd"
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => { setNewPwd(e.target.value); if (resetErrors.new) setResetErrors((p) => ({ ...p, new: '' })); }}
                    placeholder="Min. 8 chars, 1 uppercase, 1 number"
                    disabled={loading}
                    autoComplete="new-password"
                    className={`w-full bg-slate-950/80 border rounded-xl pl-10 pr-12 py-3 text-sm text-slate-100
                      placeholder-slate-600 outline-none transition-all disabled:opacity-50
                      ${resetErrors.new
                        ? 'border-rose-500/70 focus:border-rose-400 focus:ring-1 focus:ring-rose-500/30'
                        : 'border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrength password={newPwd} />
                {resetErrors.new && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{resetErrors.new}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label htmlFor="confirm-pwd" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="confirm-pwd"
                    type={showCfmPwd ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={(e) => { setConfirmPwd(e.target.value); if (resetErrors.confirm) setResetErrors((p) => ({ ...p, confirm: '' })); }}
                    placeholder="Repeat your new password"
                    disabled={loading}
                    autoComplete="new-password"
                    className={`w-full bg-slate-950/80 border rounded-xl pl-10 pr-12 py-3 text-sm text-slate-100
                      placeholder-slate-600 outline-none transition-all disabled:opacity-50
                      ${resetErrors.confirm
                        ? 'border-rose-500/70 focus:border-rose-400 focus:ring-1 focus:ring-rose-500/30'
                        : confirmPwd && confirmPwd === newPwd
                        ? 'border-emerald-500/50'
                        : 'border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCfmPwd(!showCfmPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showCfmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPwd && confirmPwd === newPwd && !resetErrors.confirm && (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                  </p>
                )}
                {resetErrors.confirm && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{resetErrors.confirm}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400
                  text-slate-950 font-bold py-3.5 rounded-xl transition-all duration-200
                  active:scale-95 disabled:opacity-50 disabled:pointer-events-none
                  flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</> : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        {/* ══════════════════════════════════════
            STEP: FORGOT — success
        ══════════════════════════════════════ */}
        {step === 'forgot-success' && (
          <div className="text-center space-y-6 py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 mb-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">Password Reset!</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your password has been updated successfully.<br />
                You can now sign in with your new password.
              </p>
            </div>
            <button
              onClick={backToLogin}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400
                text-slate-950 font-bold py-3.5 rounded-xl transition-all duration-200 active:scale-95
                flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              Sign In Now
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
