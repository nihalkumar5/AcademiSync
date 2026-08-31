'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useApp } from '@/context/AppContext';
import { Capacitor } from '@capacitor/core';
import { Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, Mail, ShieldCheck, UserPlus, LogIn } from 'lucide-react';

interface AuthPageProps {
  mode?: 'signin' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode: initialMode = 'signup' }) => {
  const router = useRouter();
  const { showToast, user } = useApp();
  
  const [currentMode, setCurrentMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      getRedirectResult(auth)
        .then((result) => {
          if (result?.user) {
            showToast('Welcome Back', 'Signed in successfully with Google!', 'success');
            router.push('/');
          }
        })
        .catch((err) => {
          console.warn('Redirect result check:', err);
        });
    }
  }, [router, showToast]);

  useEffect(() => {
    if (initialMode) {
      setCurrentMode(initialMode);
    }
  }, [initialMode]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Native Android Google Play Services Flow (Exact Notion Native Bottom Sheet)
      if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        GoogleAuth.initialize({
          clientId: '941128003754-5oalodujnbtlr19jsf9t4unqq4762hsm.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });

        const googleUser = await GoogleAuth.signIn();
        if (googleUser && googleUser.authentication?.idToken) {
          const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
          await signInWithCredential(auth, credential);
          showToast('Welcome Back', 'Signed in successfully with Google!', 'success');
          router.push('/');
          return;
        }
      }

      // 2. Web / Desktop Browser Flow
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      showToast('Google Sign In', 'Authenticated successfully with Google.', 'success');
      router.push('/');
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      let msg = 'Google Sign-In failed.';
      if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
      showToast('Sign In Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanPass) {
      showToast('Fields Required', 'Please fill in all required fields.', 'error');
      return;
    }

    if (currentMode === 'signup' && !cleanName) {
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
      if (currentMode === 'signup') {
        // Direct Sign Up
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
        await updateProfile(userCred.user, {
          displayName: cleanName
        });
        showToast('Account Created', `Welcome to Intersemester, ${cleanName}!`, 'success');
        router.push('/');
      } else {
        // Direct Sign In
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        showToast('Welcome Back', 'Signed in successfully!', 'success');
        router.push('/');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
        setCurrentMode('signin');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Incorrect email or password. Please check and try again.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email. Please create an account below.';
        setCurrentMode('signup');
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else {
        msg = err.message || 'Authentication error. Please try again.';
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

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-between px-6 py-12 bg-[#FAFAF8] dark:bg-[#111110] text-[#111111] dark:text-white transition-colors selection:bg-[#111111] selection:text-white dark:selection:bg-white dark:selection:text-[#111111]">
      
      {/* Top Spacer */}
      <div />

      {/* Main Container */}
      <div className="w-full max-w-[360px] flex flex-col items-center gap-6">
        
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="border-[1.5px] border-[#E3E3E3] dark:border-[#2C2C2C] w-[74px] h-[74px] flex items-center justify-center bg-white dark:bg-[#161616] rounded-[14px] shadow-sm overflow-hidden p-2">
            <img 
              src="/logo51.png" 
              alt="Logo" 
              className="w-full h-full object-contain select-none"
            />
          </div>
          <div className="flex items-center text-[26px] tracking-tight font-sans mt-0.5 select-none">
            <span className="font-bold text-[#111111] dark:text-white">inter</span>
            <span className="font-normal text-[#757575] dark:text-[#A0A0A0]">semester</span>
          </div>
        </div>

        {/* Segmented Switcher (Sign Up / Sign In) */}
        {currentMode !== 'forgot' && (
          <div className="w-full grid grid-cols-2 p-1 bg-[#EAEAEA] dark:bg-[#202020] rounded-[10px] border border-[#E0E0E0] dark:border-[#2C2C2C]">
            <button
              type="button"
              onClick={() => { setCurrentMode('signup'); setErrorMsg(''); }}
              className={`py-2 text-[13px] font-bold rounded-[8px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                currentMode === 'signup'
                  ? 'bg-white dark:bg-[#111110] text-[#111111] dark:text-white shadow-sm'
                  : 'text-[#6F6F6F] dark:text-[#888888] hover:text-[#111111] dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>

            <button
              type="button"
              onClick={() => { setCurrentMode('signin'); setErrorMsg(''); }}
              className={`py-2 text-[13px] font-bold rounded-[8px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                currentMode === 'signin'
                  ? 'bg-white dark:bg-[#111110] text-[#111111] dark:text-white shadow-sm'
                  : 'text-[#6F6F6F] dark:text-[#888888] hover:text-[#111111] dark:hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          </div>
        )}

        {/* Title Header */}
        <div className="text-center flex flex-col gap-1">
          <h1 className="text-[22px] font-bold tracking-tight text-[#111111] dark:text-white">
            {currentMode === 'forgot'
              ? 'Reset your password'
              : currentMode === 'signup'
              ? 'Create your account'
              : 'Welcome back'}
          </h1>
          <p className="text-[13px] text-[#6F6F6F] dark:text-[#9A9A9A]">
            {currentMode === 'forgot'
              ? 'Enter your email to receive a password reset link'
              : currentMode === 'signup'
              ? 'Set up your student profile in 30 seconds'
              : 'Log in to access your synced schedule'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="w-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 rounded-lg text-red-600 dark:text-red-400 text-[12.5px] font-medium text-center leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Forms & Auth Options */}
        <div className="w-full flex flex-col gap-4">
          {currentMode === 'forgot' ? (
            /* Forgot Password Flow */
            resetSent ? (
              <div className="flex flex-col items-center gap-3 p-5 bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-[10px] text-center shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-bold text-[#111111] dark:text-white">Reset Link Sent!</span>
                  <p className="text-[12.5px] text-[#6F6F6F] dark:text-[#9A9A9A] leading-relaxed">
                    We sent a password reset link to <span className="font-semibold text-[#111111] dark:text-white">{email}</span>. Please check your inbox.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setResetSent(false); setCurrentMode('signin'); }}
                  className="mt-3 w-full py-2.5 bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-bold text-[13px] rounded-[8px] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  required
                  autoFocus
                  disabled={loading}
                  className="w-full h-11 border border-[#E3E3E3] dark:border-[#2C2C2C] bg-white dark:bg-[#161616] text-[#111111] dark:text-white px-3.5 text-[14px] rounded-[8px] placeholder-[#8C8C8C] focus:outline-none focus:border-[#111111] dark:focus:border-white transition-all"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#111111] dark:bg-white hover:bg-[#222222] dark:hover:bg-[#EEEEEE] text-white dark:text-[#111111] font-bold text-[13.5px] rounded-[8px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1 shadow-sm uppercase tracking-wider"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Reset Link
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentMode('signin')}
                  className="w-full py-2 text-[13px] font-medium text-[#6F6F6F] hover:text-[#111111] dark:hover:text-white transition-colors flex items-center justify-center gap-1.5 mt-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </button>
              </form>
            )
          ) : (
            <div className="flex flex-col gap-4">
              {/* In-App Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-11 border border-[#E3E3E3] dark:border-[#2C2C2C] bg-white dark:bg-[#161616] hover:bg-[#F9F9F9] dark:hover:bg-[#202020] text-[#111111] dark:text-white font-medium text-[13.5px] rounded-[8px] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 14.97 1 12 1 7.35 1 3.37 3.68 1.34 7.6l3.96 3.07C6.27 7.37 8.91 5.04 12 5.04z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.63z"/>
                  <path fill="#FBBC05" d="M5.3 14.33l-3.96 3.07C3.37 21.32 7.35 24 12 24c3.24 0 5.95-1.08 7.93-2.91l-3.73-2.89c-1.03.69-2.35 1.1-4.2 1.1-3.09 0-5.73-2.33-6.7-5.54L5.3 14.33z"/>
                  <path fill="#34A853" d="M12 4.49c-1.85 0-3.17.41-4.2 1.1L4.07 2.7C6.05.88 8.76-.2 12-.2c4.65 0 8.63 2.68 10.66 6.6l-3.96 3.07c-.97-3.21-3.61-5.54-6.7-5.54z" transform="translate(0 .2)"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-3 my-0.5">
                <div className="flex-1 h-[1px] bg-[#EBEBEB] dark:bg-[#252525]" />
                <span className="text-[10px] tracking-[1.5px] font-bold text-[#A0A0A0] uppercase">OR WITH EMAIL</span>
                <div className="flex-1 h-[1px] bg-[#EBEBEB] dark:bg-[#252525]" />
              </div>

              {/* Direct Sign Up / Sign In Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {currentMode === 'signup' && (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name (e.g. Rahul Sharma)"
                    required
                    disabled={loading}
                    className="w-full h-11 border border-[#E3E3E3] dark:border-[#2C2C2C] bg-white dark:bg-[#161616] text-[#111111] dark:text-white px-3.5 text-[14px] rounded-[8px] placeholder-[#8C8C8C] focus:outline-none focus:border-[#111111] dark:focus:border-white transition-all"
                  />
                )}

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address (e.g. name@gmail.com)"
                  required
                  disabled={loading}
                  className="w-full h-11 border border-[#E3E3E3] dark:border-[#2C2C2C] bg-white dark:bg-[#161616] text-[#111111] dark:text-white px-3.5 text-[14px] rounded-[8px] placeholder-[#8C8C8C] focus:outline-none focus:border-[#111111] dark:focus:border-white transition-all"
                />

                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={currentMode === 'signup' ? 'Create Password (min 6 chars)' : 'Enter Password'}
                    required
                    disabled={loading}
                    className="w-full h-11 border border-[#E3E3E3] dark:border-[#2C2C2C] bg-white dark:bg-[#161616] text-[#111111] dark:text-white pl-3.5 pr-10 text-[14px] rounded-[8px] placeholder-[#8C8C8C] focus:outline-none focus:border-[#111111] dark:focus:border-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 text-[#888888] hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {currentMode === 'signin' && (
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => setCurrentMode('forgot')}
                      className="text-[12px] font-medium text-[#6F6F6F] hover:text-[#111111] dark:hover:text-white hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#111111] dark:bg-white hover:bg-[#222222] dark:hover:bg-[#EEEEEE] text-white dark:text-[#111111] font-bold text-[13.5px] rounded-[8px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1 shadow-sm uppercase tracking-wider"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{currentMode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <div className="w-full max-w-[360px] text-center flex flex-col gap-4 mt-12">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8C8C8C] dark:text-[#6A6A6A]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Proxy & Privacy Shield Immune · Direct In-App Auth</span>
        </div>

        <div className="border-t border-[#EBEBEB] dark:border-[#252525] pt-3 flex justify-center items-center gap-4 text-[12px] font-medium text-[#8C8C8C] dark:text-[#6A6A6A]">
          <a href="/terms" className="hover:underline">Terms</a>
          <span>•</span>
          <a href="/privacy" className="hover:underline">Privacy</a>
          <span>•</span>
          <a href="/contact" className="hover:underline">Contact</a>
        </div>
      </div>

    </div>
  );
};
