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
  Mail, 
  KeyRound, 
  Building2, 
  Sparkles,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

interface AuthPageProps {
  mode?: 'signin' | 'signup';
}

type AuthViewType = 'providers' | 'email_form' | 'forgot_password';

export const AuthPage: React.FC<AuthPageProps> = ({ mode: initialMode = 'signup' }) => {
  const router = useRouter();
  const { showToast, user } = useApp();
  
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode === 'signin' ? 'signin' : 'signup');
  const [viewType, setViewType] = useState<AuthViewType>('providers');
  
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
            showToast('Welcome Back', 'Signed in successfully!', 'success');
            router.push('/');
          }
        })
        .catch((err) => {
          console.warn('Redirect result check:', err);
        });
    }
  }, [router, showToast]);

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
          router.push('/');
          return;
        } else {
          console.warn('GoogleAuth returned user without idToken:', googleUser);
          throw new Error('Could not retrieve Google authentication token.');
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
      let msg = 'Google Sign-In failed. Please try Email.';
      if (err.message) {
        if (err.message.includes('10:') || err.message.includes('DEVELOPER_ERROR') || err.message.includes('Something went wrong')) {
          msg = 'Google Auth Error (10): Please ensure your Android app SHA-1 is registered in Firebase Console.';
        } else {
          msg = err.message;
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
      let provider;
      if (providerName === 'apple') {
        provider = new OAuthProvider('apple.com');
      } else if (providerName === 'microsoft') {
        provider = new OAuthProvider('microsoft.com');
      } else if (providerName === 'github') {
        provider = new GithubAuthProvider();
      }

      if (provider) {
        await signInWithPopup(auth, provider);
        showToast('Welcome Back', `Signed in with ${providerName}!`, 'success');
        router.push('/');
      }
    } catch (err: any) {
      console.error(`${providerName} login error:`, err);
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        setErrorMsg(`${providerName.toUpperCase()} is not enabled yet in Firebase Console. Go to Authentication > Sign-in method to enable it.`);
      } else {
        setErrorMsg(err.message || `Failed to sign in with ${providerName}.`);
      }
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
        router.push('/');
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        showToast('Welcome Back', 'Signed in successfully!', 'success');
        router.push('/');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
        setAuthMode('signin');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Incorrect email or password. Please check and try again.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email. Please create an account below.';
        setAuthMode('signup');
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
    <div className="min-h-[100dvh] w-full flex flex-col justify-between items-center px-6 py-10 bg-[#FFFFFF] dark:bg-[#121212] text-[#111111] dark:text-[#FFFFFF] transition-colors selection:bg-[#111111] selection:text-white dark:selection:bg-white dark:selection:text-[#111111]">
      
      {/* Top Section */}
      <div className="w-full max-w-[340px] flex flex-col items-center pt-4 sm:pt-8">
        
        {/* Notion-style Monogram Icon */}
        <div className="mb-5 flex items-center justify-center">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111] flex items-center justify-center font-bold font-serif text-[28px] shadow-sm border border-black/10 dark:border-white/10 select-none">
            is
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center flex flex-col gap-1 mb-8">
          <h1 className="text-[23px] sm:text-[25px] font-bold tracking-tight text-[#111111] dark:text-[#FFFFFF] leading-snug">
            {viewType === 'forgot_password'
              ? 'Reset Password'
              : 'Your Academic Workspace.'}
          </h1>
          <p className="text-[14.5px] font-medium text-[#737373] dark:text-[#9E9E9E]">
            {viewType === 'forgot_password'
              ? 'Enter your email to recover your account'
              : authMode === 'signup'
              ? 'Create your Intersemester account'
              : 'Log in to your Intersemester account'}
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="w-full mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 rounded-xl text-red-600 dark:text-red-400 text-[12.5px] font-medium text-center leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* VIEW 1: Main Providers Stack (Exact Notion Stack) */}
        {viewType === 'providers' && (
          <div className="w-full flex flex-col gap-2.5">
            
            {/* 1. Google Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-[48px] px-4 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] hover:bg-[#F9F9F9] dark:hover:bg-[#222222] active:scale-[0.99] transition-all flex items-center justify-between font-semibold text-[14.5px] text-[#111111] dark:text-[#FFFFFF] shadow-sm cursor-pointer disabled:opacity-60"
            >
              <div className="w-6 flex items-center justify-center">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 14.97 1 12 1 7.35 1 3.37 3.68 1.34 7.6l3.96 3.07C6.27 7.37 8.91 5.04 12 5.04z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.63z"/>
                  <path fill="#FBBC05" d="M5.3 14.33l-3.96 3.07C3.37 21.32 7.35 24 12 24c3.24 0 5.95-1.08 7.93-2.91l-3.73-2.89c-1.03.69-2.35 1.1-4.2 1.1-3.09 0-5.73-2.33-6.7-5.54L5.3 14.33z"/>
                  <path fill="#34A853" d="M12 4.49c-1.85 0-3.17.41-4.2 1.1L4.07 2.7C6.05.88 8.76-.2 12-.2c4.65 0 8.63 2.68 10.66 6.6l-3.96 3.07c-.97-3.21-3.61-5.54-6.7-5.54z" transform="translate(0 .2)"/>
                </svg>
              </div>
              <span className="flex-1 text-center font-medium">Google</span>
              <div className="w-6" />
            </button>

            {/* 2. Apple Button */}
            <button
              type="button"
              onClick={() => handleOAuthLogin('apple')}
              disabled={loading}
              className="w-full h-[48px] px-4 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] hover:bg-[#F9F9F9] dark:hover:bg-[#222222] active:scale-[0.99] transition-all flex items-center justify-between font-semibold text-[14.5px] text-[#111111] dark:text-[#FFFFFF] shadow-sm cursor-pointer disabled:opacity-60"
            >
              <div className="w-6 flex items-center justify-center">
                <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.74 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.3-5.54-8.37-9.98-17.76-13.33-28.18-3.34-10.42-5.02-20.57-5.02-30.46 0-14.55 3.8-26.68 11.41-36.38 7.6-9.7 16.99-14.65 28.16-14.86 4.7 0 9.87 1.25 15.52 3.76 5.66 2.5 9.4 3.81 11.23 3.92 1.45 0 5.43-1.42 11.95-4.25 6.52-2.83 12.06-4.14 16.63-3.92 12.82.76 22.84 5.34 30.06 13.73-11.21 6.86-16.71 16.22-16.5 28.08.21 9.47 3.85 17.43 10.92 23.88 7.07 6.45 15.5 10.15 25.3 11.11-2.29 6.86-5.02 13.73-8.2 20.61zM119.22 33.15c0-6.86 2.53-13.34 7.6-19.45 5.07-6.11 11.39-10.02 18.96-11.7-1.04 6.75-3.69 13.13-7.94 19.14-4.25 6.01-10.47 9.86-18.62 12.01z"/>
                </svg>
              </div>
              <span className="flex-1 text-center font-medium">Apple</span>
              <div className="w-6" />
            </button>

            {/* 3. Microsoft Button */}
            <button
              type="button"
              onClick={() => handleOAuthLogin('microsoft')}
              disabled={loading}
              className="w-full h-[48px] px-4 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] hover:bg-[#F9F9F9] dark:hover:bg-[#222222] active:scale-[0.99] transition-all flex items-center justify-between font-semibold text-[14.5px] text-[#111111] dark:text-[#FFFFFF] shadow-sm cursor-pointer disabled:opacity-60"
            >
              <div className="w-6 flex items-center justify-center">
                <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                  <div className="bg-[#F25022] w-full h-full" />
                  <div className="bg-[#7FBA00] w-full h-full" />
                  <div className="bg-[#00A4EF] w-full h-full" />
                  <div className="bg-[#FFB900] w-full h-full" />
                </div>
              </div>
              <span className="flex-1 text-center font-medium">Microsoft</span>
              <div className="w-6" />
            </button>

            {/* 4. GitHub Button */}
            <button
              type="button"
              onClick={() => handleOAuthLogin('github')}
              disabled={loading}
              className="w-full h-[48px] px-4 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] hover:bg-[#F9F9F9] dark:hover:bg-[#222222] active:scale-[0.99] transition-all flex items-center justify-between font-semibold text-[14.5px] text-[#111111] dark:text-[#FFFFFF] shadow-sm cursor-pointer disabled:opacity-60"
            >
              <div className="w-6 flex items-center justify-center">
                <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </div>
              <span className="flex-1 text-center font-medium">GitHub</span>
              <div className="w-6" />
            </button>

            {/* 5. Direct Email Button */}
            <button
              type="button"
              onClick={() => { setViewType('email_form'); setErrorMsg(''); }}
              className="w-full h-[48px] px-4 rounded-xl border border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] hover:bg-[#F9F9F9] dark:hover:bg-[#222222] active:scale-[0.99] transition-all flex items-center justify-between font-semibold text-[14.5px] text-[#111111] dark:text-[#FFFFFF] shadow-sm cursor-pointer"
            >
              <div className="w-6 flex items-center justify-center text-[#666666] dark:text-[#AAAAAA]">
                <Mail className="w-[18px] h-[18px]" />
              </div>
              <span className="flex-1 text-center font-medium">Email</span>
              <div className="w-6" />
            </button>

          </div>
        )}

        {/* VIEW 2: Email Form (Expandable View) */}
        {viewType === 'email_form' && (
          <div className="w-full flex flex-col gap-4">
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
              {authMode === 'signup' && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name (e.g. Rahul Sharma)"
                  required
                  autoFocus
                  disabled={loading}
                  className="w-full h-12 border border-[#E0E0E0] dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] text-[#111111] dark:text-white px-4 text-[14.5px] rounded-xl placeholder-[#888888] focus:outline-none focus:border-[#111111] dark:focus:border-white transition-all shadow-sm"
                />
              )}

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                required
                autoFocus={authMode === 'signin'}
                disabled={loading}
                className="w-full h-12 border border-[#E0E0E0] dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] text-[#111111] dark:text-white px-4 text-[14.5px] rounded-xl placeholder-[#888888] focus:outline-none focus:border-[#111111] dark:focus:border-white transition-all shadow-sm"
              />

              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authMode === 'signup' ? 'Create Password (min 6 chars)' : 'Password'}
                  required
                  disabled={loading}
                  className="w-full h-12 border border-[#E0E0E0] dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] text-[#111111] dark:text-white pl-4 pr-11 text-[14.5px] rounded-xl placeholder-[#888888] focus:outline-none focus:border-[#111111] dark:focus:border-white transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3.5 text-[#888888] hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {authMode === 'signin' && (
                <div className="flex justify-end -mt-0.5">
                  <button
                    type="button"
                    onClick={() => setViewType('forgot_password')}
                    className="text-[12.5px] font-medium text-[#737373] hover:text-[#111111] dark:hover:text-white hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#111111] dark:bg-white hover:bg-[#222222] dark:hover:bg-[#EEEEEE] text-white dark:text-[#111111] font-semibold text-[14.5px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1 shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{authMode === 'signup' ? 'Continue with Email' : 'Log In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => { setViewType('providers'); setErrorMsg(''); }}
              className="w-full py-2 text-[13px] font-medium text-[#737373] hover:text-[#111111] dark:hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>All sign-in options</span>
            </button>
          </div>
        )}

        {/* VIEW 3: Forgot Password Form */}
        {viewType === 'forgot_password' && (
          <div className="w-full flex flex-col gap-4">
            {resetSent ? (
              <div className="flex flex-col items-center gap-3 p-5 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-2xl text-center shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-bold text-[#111111] dark:text-white">Reset Link Sent!</span>
                  <p className="text-[13px] text-[#737373] dark:text-[#9E9E9E] leading-relaxed">
                    We sent password instructions to <span className="font-semibold text-[#111111] dark:text-white">{email}</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setResetSent(false); setViewType('email_form'); setAuthMode('signin'); }}
                  className="mt-2 w-full py-2.5 bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-semibold text-[13.5px] rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
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
                  placeholder="Enter your registered email..."
                  required
                  autoFocus
                  disabled={loading}
                  className="w-full h-12 border border-[#E0E0E0] dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] text-[#111111] dark:text-white px-4 text-[14.5px] rounded-xl placeholder-[#888888] focus:outline-none focus:border-[#111111] dark:focus:border-white transition-all shadow-sm"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#111111] dark:bg-white hover:bg-[#222222] dark:hover:bg-[#EEEEEE] text-white dark:text-[#111111] font-semibold text-[14.5px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1 shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Send Reset Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setViewType('email_form'); setErrorMsg(''); }}
                  className="w-full py-2 text-[13px] font-medium text-[#737373] hover:text-[#111111] dark:hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Log In</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Mode Switcher (New user? Sign up / Already have an account? Log in) */}
        {viewType !== 'forgot_password' && (
          <div className="mt-6 text-center">
            {authMode === 'signin' ? (
              <p className="text-[14px] text-[#737373] dark:text-[#9E9E9E]">
                New user?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
                  className="font-semibold text-[#111111] dark:text-[#FFFFFF] underline underline-offset-4 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-[14px] text-[#737373] dark:text-[#9E9E9E]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setErrorMsg(''); }}
                  className="font-semibold text-[#111111] dark:text-[#FFFFFF] underline underline-offset-4 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  Log in
                </button>
              </p>
            )}
          </div>
        )}

        {/* Terms Disclaimer */}
        <p className="mt-8 text-center text-[11.5px] text-[#8E8E8E] dark:text-[#6C6C6C] leading-relaxed max-w-[280px]">
          By continuing, you acknowledge that you understand and agree to the{' '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-[#111111] dark:hover:text-white">
            Terms & Conditions
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-[#111111] dark:hover:text-white">
            Privacy Policy
          </Link>
          .
        </p>

      </div>

      {/* Bottom Footer (Exact Notion Footer) */}
      <div className="w-full max-w-[340px] flex flex-col items-center gap-2 mt-12 pb-2 text-[12px] text-[#8E8E8E] dark:text-[#6C6C6C]">
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:underline">Privacy & terms</Link>
          <span>•</span>
          <Link href="/contact" className="hover:underline">Need help?</Link>
        </div>
        <span className="text-[11px] opacity-70">© 2026 Intersemester Labs Inc.</span>
      </div>

    </div>
  );
};

