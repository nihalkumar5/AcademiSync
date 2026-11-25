'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  signInWithCredential,
  getRedirectResult,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useApp } from '@/context/AppContext';
import { Capacitor } from '@capacitor/core';
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2,
  KeyRound,
  Mail,
  Building2, 
  Sparkles,
  ChevronLeft
} from '@/components/ui/icons';
import Link from 'next/link';
import { Illustration, IllustrationName } from '@/components/ui/Illustration';

import { getSanitizedErrorMessage, logServerError } from '@/lib/errorUtils';

interface AuthPageProps {
  mode?: 'signin' | 'signup';
}

type AuthViewType = 'providers' | 'email_form' | 'forgot_password';

export const AuthPage: React.FC<AuthPageProps> = ({ mode: initialMode = 'signup' }) => {
  const router = useRouter();
  const { showToast, user, joinBatchTimetable, updateProfile: updateAppProfile } = useApp();
  
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode === 'signin' ? 'signin' : 'signup');
  const [viewType, setViewType] = useState<AuthViewType>('providers');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const isNavigatingRef = React.useRef(false);
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setSlide((i) => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, [slide]);

  const proceedAfterAuth = async () => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    try {
      if (typeof window !== 'undefined') {
        const pending = localStorage.getItem('pending_join_invite');
        if (pending) {
          try {
            localStorage.removeItem('pending_join_invite');
            await joinBatchTimetable(pending, undefined, true);
          } catch (err) {
            logServerError('AuthPage:JoinPendingInvite', err);
          }
        }
      }
      router.replace('/');
    } catch (err) {
      logServerError('AuthPage:ProceedAfterAuth', err);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  useEffect(() => {
    if (user) {
      proceedAfterAuth();
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result?.user) {
            const providerId = result.providerId || result.user.providerData?.[0]?.providerId || '';
            let providerLabel = 'your account';
            if (providerId.includes('apple')) providerLabel = 'Apple';
            else if (providerId.includes('google')) providerLabel = 'Google';
            else if (providerId.includes('github')) providerLabel = 'GitHub';
            else if (providerId.includes('microsoft')) providerLabel = 'Microsoft';
            const name = result.user.displayName?.split(' ')[0] || '';
            showToast('Welcome' + (name ? ` ${name}` : ''), `Signed in with ${providerLabel}!`, 'success');
            await proceedAfterAuth();
          }
        })
        .catch((err) => {
          logServerError('AuthPage:RedirectResult', err);
          if (err?.code && err.code !== 'auth/no-current-user') {
            setErrorMsg(getSanitizedErrorMessage(err, 'Sign-in redirect failed. Please try again.'));
          }
        });
    }
  }, [showToast]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        GoogleAuth.initialize({
          clientId: '941128003754-5oalodujnbtlr19jsf9t4unqq4762hsm.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });

        try {
          await GoogleAuth.signOut();
        } catch (e) {
          // ignore if no active session
        }

        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser?.authentication?.idToken || (googleUser as any)?.idToken;
        
        if (idToken) {
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
          showToast('Welcome Back', 'Signed in successfully with Google!', 'success');
          await proceedAfterAuth();
          return;
        } else {
          logServerError('AuthPage:GoogleAuth', 'Could not retrieve Google authentication token');
          throw new Error('Could not retrieve Google authentication token.');
        }
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      showToast('Google Sign In', 'Authenticated successfully with Google.', 'success');
      await proceedAfterAuth();
    } catch (err: any) {
      logServerError('AuthPage:GoogleSignIn', err);
      let msg = getSanitizedErrorMessage(err, 'Google Sign-In failed. Please try Email.');
      if (err.message) {
        if (err.message.includes('10:') || err.message.includes('DEVELOPER_ERROR') || err.message.includes('Something went wrong')) {
          msg = 'Google Auth Error (10): Please ensure your Android app SHA-1 is registered in Firebase Console.';
        }
      }
      setErrorMsg(msg);
      showToast('Sign In Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (providerName: 'apple' | 'microsoft' | 'github') => {
    setLoading(true);
    setErrorMsg('');
    try {
      let provider: OAuthProvider | GithubAuthProvider;
      if (providerName === 'apple') {
        const appleProvider = new OAuthProvider('apple.com');
        appleProvider.addScope('email');
        appleProvider.addScope('name');
        provider = appleProvider;
      } else if (providerName === 'microsoft') {
        provider = new OAuthProvider('microsoft.com');
      } else {
        provider = new GithubAuthProvider();
      }

      if (Capacitor.isNativePlatform()) {
        const { signInWithRedirect } = await import('firebase/auth');
        await signInWithRedirect(auth, provider);
        return;
      }

      await signInWithPopup(auth, provider);
      showToast('Welcome Back', `Signed in with ${providerName}!`, 'success');
      await proceedAfterAuth();
    } catch (err: any) {
      logServerError(`AuthPage:${providerName}Login`, err);
      const sanitized = getSanitizedErrorMessage(err, `Failed to sign in with ${providerName}.`);
      setErrorMsg(sanitized);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanPass) {
      showToast('Fields Required', 'Please fill in all required fields.', 'error');
      return;
    }

    if (authMode === 'signup' && !cleanName) {
      setErrorMsg('Please enter your full name.');
      showToast('Name Required', 'Please enter your full name.', 'error');
      return;
    }

    if (cleanPass.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'signup') {
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
        await updateProfile(userCred.user, {
          displayName: cleanName
        });
        showToast('Account Created', `Welcome to Intersemester, ${cleanName}!`, 'success');
        await proceedAfterAuth();
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        showToast('Welcome Back', 'Signed in successfully!', 'success');
        await proceedAfterAuth();
      }
    } catch (err: any) {
      logServerError('AuthPage:EmailAuth', err);
      const msg = getSanitizedErrorMessage(err, 'Authentication failed. Please check your credentials.');
      if (err.code === 'auth/email-already-in-use') {
        setAuthMode('signin');
      } else if (err.code === 'auth/user-not-found') {
        setAuthMode('signup');
      }
      setErrorMsg(msg);
      showToast('Auth Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Email Required', 'Please enter your email to reset password.', 'error');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      showToast('Reset Link Sent', 'Password reset email sent! Check your inbox.', 'success');
    } catch (err: any) {
      let msg = 'Failed to send reset link. Please check your email.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email address.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setErrorMsg(msg);
      showToast('Reset Failed', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI ----------
  const isSignup = authMode === 'signup';
  const title =
    viewType === 'forgot_password'
      ? 'Reset your password'
      : viewType === 'email_form'
      ? isSignup
        ? 'Create your account'
        : 'Enter your password'
      : isSignup
      ? 'Create your account'
      : 'Log in to Intersemester';
  const subtitle =
    viewType === 'forgot_password'
      ? "Enter the email you signed up with. We'll send you a link."
      : viewType === 'email_form'
      ? isSignup
        ? 'Just your name and a password. Takes less than a minute.'
        : 'Pick up right where you left off.'
      : 'Your timetable, attendance and exams, all in one place.';

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLooksValid) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setErrorMsg('');
    setPassword('');
    setViewType('email_form');
  };

  const inputCls =
    'w-full h-[52px] rounded-field border border-line bg-surface text-fg px-4 text-[16px] placeholder:text-faint focus:outline-none focus:border-line-strong focus:ring-4 focus:ring-fg/[0.06] transition-[border-color,box-shadow] disabled:opacity-60';
  const labelCls = 'text-[13px] font-semibold text-fg';

  const slideNow = SLIDES[slide];

  return (
    <div className="min-h-[100dvh] w-full bg-canvas text-fg lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:p-3">
      {/* ===== Brand panel (desktop): a floating, rounded showcase ===== */}
      <aside className="hidden lg:flex relative overflow-hidden rounded-[32px] bg-surface-2 flex-col justify-between p-12 xl:p-14">
        <div className="flex items-center gap-3">
          <BrandMark />
          <span className="text-[17px] font-semibold tracking-tight">Intersemester</span>
        </div>

        <div className="max-w-[520px]">
          <div className="rounded-sheet bg-surface shadow-[0_24px_60px_-30px_rgba(17,17,17,0.25)] p-8 flex items-center justify-center h-[320px]">
            <Illustration key={slideNow.art} name={slideNow.art} className="h-full w-auto auth-fade" />
          </div>
          <span className="mt-8 inline-flex h-7 items-center rounded-full bg-surface px-3 text-[12px] font-semibold text-fg-2">
            {slideNow.kicker}
          </span>
          <h2 className="mt-3 text-[34px] xl:text-[40px] leading-[1.08] tracking-tight">{slideNow.title}</h2>
          <p className="mt-3 text-[16px] leading-[24px] text-muted max-w-[440px]">{slideNow.body}</p>
          <SlideDots active={slide} onPick={setSlide} large />
        </div>

        <p className="text-[13px] text-muted">Made for students, faculty and campus teams.</p>
      </aside>

      {/* ===== Form side ===== */}
      <main className="min-h-[100dvh] lg:min-h-0 flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 sm:px-8 pt-[max(env(safe-area-inset-top),16px)] pb-2">
          {viewType === 'providers' ? (
            <div className="flex items-center gap-2.5 lg:invisible">
              <BrandMark small />
              <span className="text-[15px] font-semibold tracking-tight">Intersemester</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setViewType(viewType === 'forgot_password' ? 'email_form' : 'providers');
                setErrorMsg('');
                setResetSent(false);
              }}
              aria-label="Back"
              className="w-10 h-10 -ml-1 rounded-full bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-fg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <Link
            href="/contact"
            className="h-9 px-3.5 inline-flex items-center rounded-full bg-surface-2 hover:bg-surface-3 text-[13px] font-medium text-fg-2 transition-colors"
          >
            Need help?
          </Link>
        </header>

        <div className="flex-1 flex flex-col items-center px-5 sm:px-8 pb-6">
          <div className="w-full max-w-[400px] flex flex-col my-auto">
            {/* ---- Hero (phones and tablets): rotating illustration ---- */}
            {viewType === 'providers' && (
              <section className="lg:hidden mt-2 rounded-sheet bg-surface-2 overflow-hidden">
                <div className="h-[200px] flex items-end justify-center px-6 pt-6">
                  <Illustration key={slideNow.art} name={slideNow.art} className="h-full w-auto auth-fade" />
                </div>
                <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-4">
                  <p key={slideNow.title} className="text-[13px] leading-[18px] font-medium text-fg-2 auth-fade">
                    {slideNow.short}
                  </p>
                  <SlideDots active={slide} onPick={setSlide} />
                </div>
              </section>
            )}

            {/* Hero on the email and reset steps: same card language as the first screen */}
            {viewType !== 'providers' && !resetSent && (
              <section className="mt-2 rounded-sheet bg-surface-2 overflow-hidden h-[184px] flex items-end justify-center px-8 pt-7">
                <Illustration
                  key={`${viewType}-${authMode}`}
                  name={viewType === 'forgot_password' ? 'search' : isSignup ? 'launch' : 'signin'}
                  className="h-full w-auto max-w-full object-contain auth-fade"
                />
              </section>
            )}

            {/* Heading */}
            {!resetSent && (
              <div className={viewType === 'providers' ? 'mt-7 text-center' : 'mt-5'}>
                <h1 className="text-[28px] sm:text-[32px] leading-[1.12] font-semibold tracking-[-0.02em] text-fg">{title}</h1>
                <p className="mt-2 text-[15px] leading-[22px] text-muted">{subtitle}</p>
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-tile bg-danger-soft px-4 py-3 text-[13px] leading-[19px] text-danger">
                <span className="mt-[6px] w-1.5 h-1.5 shrink-0 rounded-full bg-danger" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ---- Providers ---- */}
            {viewType === 'providers' && (
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="btn btn-primary btn-lg w-full relative disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                        <GoogleG />
                      </span>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthLogin('github')}
                  disabled={loading}
                  className="btn btn-secondary btn-lg w-full relative disabled:opacity-60"
                >
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
                    <GitHubMark />
                  </span>
                  <span>Continue with GitHub</span>
                </button>

                <div className="my-2 flex items-center gap-3 text-[13px] text-faint">
                  <span className="h-px flex-1 bg-line-soft" />
                  or use your email
                  <span className="h-px flex-1 bg-line-soft" />
                </div>

                <form onSubmit={handleEmailContinue} className="flex flex-col gap-3" noValidate>
                  <label className="relative flex items-center">
                    <span className="sr-only">Email</span>
                    <Mail className="absolute left-4 w-[18px] h-[18px] text-faint pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="you@college.edu"
                      autoComplete="email"
                      inputMode="email"
                      disabled={loading}
                      className={`${inputCls} pl-11`}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="btn btn-secondary btn-lg w-full disabled:opacity-40"
                  >
                    <span>Continue with email</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <p className="mt-3 text-center text-[14px] text-muted">
                  {isSignup ? 'Already have an account?' : 'New to Intersemester?'}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(isSignup ? 'signin' : 'signup');
                      setErrorMsg('');
                    }}
                    className="font-semibold text-fg underline decoration-line-strong/30 underline-offset-4 cursor-pointer"
                  >
                    {isSignup ? 'Log in' : 'Create an account'}
                  </button>
                </p>
              </div>
            )}

            {/* ---- Email form ---- */}
            {viewType === 'email_form' && (
              <form onSubmit={handleEmailSubmit} className="mt-6 flex flex-col gap-4" noValidate>
                {/* The email picked on the first screen, with a way back to change it */}
                <div className="flex items-center gap-3 rounded-card bg-surface-2 p-2 pr-2">
                  <span className="w-10 h-10 shrink-0 rounded-full bg-ink text-on-ink flex items-center justify-center text-[15px] font-semibold uppercase">
                    {email.trim().charAt(0) || '?'}
                  </span>
                  <p className="min-w-0 flex-1 text-[15px] font-medium text-fg truncate">{email.trim()}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setViewType('providers');
                      setErrorMsg('');
                    }}
                    className="shrink-0 h-9 px-3.5 rounded-full bg-surface hover:bg-surface-3 text-[13px] font-semibold text-fg transition-colors cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* Hidden email field so password managers save the right username */}
                <input type="email" value={email} autoComplete="username" readOnly hidden />

                {isSignup && (
                  <label className="flex flex-col gap-2">
                    <span className={labelCls}>Full name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Rahul Sharma"
                      autoComplete="name"
                      required
                      autoFocus
                      disabled={loading}
                      className={inputCls}
                    />
                  </label>
                )}

                <label className="flex flex-col gap-2">
                  <span className="flex items-center justify-between">
                    <span className={labelCls}>Password</span>
                    {!isSignup && (
                      <button
                        type="button"
                        onClick={() => {
                          setViewType('forgot_password');
                          setErrorMsg('');
                        }}
                        className="text-[13px] font-medium text-muted hover:text-fg cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </span>
                  <span className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      required
                      autoFocus={!isSignup}
                      disabled={loading}
                      className={`${inputCls} pr-14`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1.5 w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </span>
                  {isSignup && password.length > 0 && password.length < 6 && (
                    <span className="text-[12px] text-muted">{6 - password.length} more character{6 - password.length === 1 ? '' : 's'} to go</span>
                  )}
                </label>

                <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full mt-2">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>{isSignup ? 'Create account' : 'Log in'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[14px] text-muted">
                  {isSignup ? 'Already have an account?' : 'New here?'}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(isSignup ? 'signin' : 'signup');
                      setErrorMsg('');
                    }}
                    className="font-semibold text-fg underline decoration-line-strong/30 underline-offset-4 cursor-pointer"
                  >
                    {isSignup ? 'Log in' : 'Create an account'}
                  </button>
                </p>
              </form>
            )}

            {/* ---- Forgot password ---- */}
            {viewType === 'forgot_password' && (
              <div className={resetSent ? 'mt-4' : 'mt-6'}>
                {resetSent ? (
                  <div className="rounded-sheet bg-surface-2 px-6 pt-8 pb-6 flex flex-col items-center text-center">
                    <Illustration name="signin" className="h-[132px] w-auto auth-fade" />
                    <p className="mt-5 text-[20px] font-semibold tracking-tight text-fg">Check your inbox</p>
                    <p className="mt-1.5 text-[14px] leading-[21px] text-muted">
                      We sent a reset link to <span className="font-semibold text-fg break-all">{email}</span>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setResetSent(false);
                        setViewType('email_form');
                        setAuthMode('signin');
                      }}
                      className="btn btn-primary btn-lg w-full mt-6"
                    >
                      Back to log in
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="flex flex-col gap-4" noValidate>
                    <label className="flex flex-col gap-2">
                      <span className={labelCls}>Email</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@college.edu"
                        autoComplete="email"
                        inputMode="email"
                        required
                        autoFocus
                        disabled={loading}
                        className={inputCls}
                      />
                    </label>
                    <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full mt-1">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Send reset link</span>}
                    </button>
                  </form>
                )}
              </div>
            )}

            <p className="mt-8 text-center text-[12px] leading-[18px] text-faint">
              By continuing you agree to our{' '}
              <Link href="/terms" className="text-muted underline underline-offset-2 hover:text-fg">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-muted underline underline-offset-2 hover:text-fg">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      <style>{`
        .auth-fade { animation: authFade .45s ease both; }
        @keyframes authFade { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .auth-fade { animation: none; } }
      `}</style>
    </div>
  );
};

// ---------- Pieces ----------
const SLIDES: { art: IllustrationName; kicker: string; title: string; body: string; short: string }[] = [
  {
    art: 'attendance',
    kicker: 'Attendance',
    title: 'Know exactly how many classes you can skip.',
    body: "Straight from your teacher's register. No maths, no guessing before the 75% line.",
    short: 'Know how many classes you can still skip.',
  },
  {
    art: 'friends',
    kicker: 'Friends',
    title: 'See when your friends are free.',
    body: 'Add classmates with a QR code. Free time shows up on its own, straight from their timetable.',
    short: 'See when your friends are free.',
  },
  {
    art: 'papers',
    kicker: 'Question papers',
    title: 'Past papers from your own branch.',
    body: 'Shared by your seniors, named neatly and easy to search before exams.',
    short: 'Past papers from your own branch.',
  },
  {
    art: 'notes',
    kicker: 'Class notes',
    title: 'Snap the board. Find it later.',
    body: 'Every photo and note is saved to the class it came from, so nothing gets lost in your gallery.',
    short: 'Snap the board, find it by class later.',
  },
];

const SlideDots: React.FC<{ active: number; onPick: (i: number) => void; large?: boolean }> = ({ active, onPick, large }) => (
  <div className={`flex items-center gap-1.5 ${large ? 'mt-8' : 'shrink-0'}`}>
    {SLIDES.map((s, i) => (
      <button
        key={s.art}
        type="button"
        onClick={() => onPick(i)}
        aria-label={`Show: ${s.kicker}`}
        aria-current={i === active}
        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === active ? 'w-6 bg-fg' : 'w-1.5 bg-line-strong/20'}`}
      />
    ))}
  </div>
);

const BrandMark: React.FC<{ small?: boolean }> = ({ small }) => (
  <span className={`${small ? 'w-8 h-8 rounded-[10px]' : 'w-10 h-10 rounded-xl'} overflow-hidden bg-white border border-line-soft flex items-center justify-center shrink-0`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/logo51.png" alt="" className="w-full h-full object-cover scale-[1.75] select-none" draggable={false} />
  </span>
);

const GoogleG = () => (
  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 14.97 1 12 1 7.35 1 3.37 3.68 1.34 7.6l3.96 3.07C6.27 7.37 8.91 5.04 12 5.04z" />
    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.63z" />
    <path fill="#FBBC05" d="M5.3 14.33l-3.96 3.07C3.37 21.32 7.35 24 12 24c3.24 0 5.95-1.08 7.93-2.91l-3.73-2.89c-1.03.69-2.35 1.1-4.2 1.1-3.09 0-5.73-2.33-6.7-5.54L5.3 14.33z" />
    <path fill="#34A853" d="M12 4.49c-1.85 0-3.17.41-4.2 1.1L4.07 2.7C6.05.88 8.76-.2 12-.2c4.65 0 8.63 2.68 10.66 6.6l-3.96 3.07c-.97-3.21-3.61-5.54-6.7-5.54z" transform="translate(0 .2)" />
  </svg>
);

const GitHubMark = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);
