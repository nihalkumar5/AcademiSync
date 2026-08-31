'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useApp } from '@/context/AppContext';
import { Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, Mail, Zap, ShieldCheck } from 'lucide-react';

interface AuthPageProps {
  mode?: 'signin' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = () => {
  const router = useRouter();
  const { showToast, user } = useApp();
  
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSent, setResetSent] = useState(false);

  React.useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleUnifiedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      showToast('Fields Required', 'Please enter your email and password.', 'error');
      return;
    }

    if (cleanPass.length < 6) {
      setErrorMsg('Password should be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      // 1. Attempt to sign in with existing credentials
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      showToast('Welcome Back', 'Signed in successfully!', 'success');
      router.push('/');
    } catch (err: any) {
      // 2. If user does not exist or credentials not matched, seamlessly attempt registration
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential'
      ) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
          const derivedName = cleanEmail.split('@')[0];
          const formattedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);
          await updateProfile(userCred.user, {
            displayName: formattedName
          });
          showToast('Account Created', `Welcome to Intersemester, ${formattedName}!`, 'success');
          router.push('/');
          return;
        } catch (createErr: any) {
          // If creation reports email is already in use, it means the user exists and the password was wrong!
          if (createErr.code === 'auth/email-already-in-use') {
            setErrorMsg('Incorrect password for this email. If you forgot your password, click Reset below.');
            showToast('Incorrect Password', 'Please check your password.', 'error');
          } else if (createErr.code === 'auth/weak-password') {
            setErrorMsg('Password should be at least 6 characters.');
          } else {
            setErrorMsg(createErr.message || 'Authentication error. Please try again.');
          }
        }
      } else if (err.code === 'auth/wrong-password') {
        setErrorMsg('Incorrect password. Click "Forgot password?" below to reset.');
        showToast('Incorrect Password', 'Please check your password.', 'error');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMsg('Please enter a valid email address.');
      } else {
        setErrorMsg(err.message || 'Authentication failed. Please check your connection.');
      }
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
      
      {/* Spacer to balance header */}
      <div />

      {/* Main Card Container */}
      <div className="w-full max-w-[360px] flex flex-col items-center gap-7">
        
        {/* Logo & Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="border-[1.5px] border-[#E3E3E3] dark:border-[#2C2C2C] w-[76px] h-[76px] flex items-center justify-center bg-white dark:bg-[#161616] rounded-[14px] shadow-sm overflow-hidden p-2">
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
        
        {/* Title & Subtitle */}
        <div className="text-center flex flex-col gap-1.5 mt-1">
          <h1 className="text-[23px] font-bold tracking-tight text-[#111111] dark:text-white">
            {isForgotMode ? 'Reset password' : 'Your academic workspace.'}
          </h1>
          <p className="text-[13.5px] text-[#6F6F6F] dark:text-[#9A9A9A] leading-normal">
            {isForgotMode 
              ? 'Enter your email to receive a password reset link.'
              : 'Enter your email & password to sign in or instantly register.'}
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="w-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 rounded-lg text-red-600 dark:text-red-400 text-[12.5px] font-medium text-center leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Forms */}
        <div className="w-full flex flex-col gap-4">
          {isForgotMode ? (
            /* Forgot Password Flow */
            resetSent ? (
              <div className="flex flex-col items-center gap-3 p-5 bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-[10px] text-center shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-bold text-[#111111] dark:text-white">Email Sent!</span>
                  <p className="text-[12.5px] text-[#6F6F6F] dark:text-[#9A9A9A] leading-relaxed">
                    We sent a password reset link to <span className="font-semibold text-[#111111] dark:text-white">{email}</span>. Please check your inbox or spam folder.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setResetSent(false); setIsForgotMode(false); }}
                  className="mt-3 w-full py-2.5 bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-bold text-[13px] rounded-[8px] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
                <div className="relative">
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
                </div>

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
                  onClick={() => setIsForgotMode(false)}
                  className="w-full py-2 text-[13px] font-medium text-[#6F6F6F] hover:text-[#111111] dark:hover:text-white transition-colors flex items-center justify-center gap-1.5 mt-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Login
                </button>
              </form>
            )
          ) : (
            /* Smart Unified Login & Register Form */
            <form onSubmit={handleUnifiedSubmit} className="flex flex-col gap-3">
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

              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password (min 6 chars)..."
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

              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => setIsForgotMode(true)}
                  className="text-[12px] font-medium text-[#6F6F6F] hover:text-[#111111] dark:hover:text-white hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#111111] dark:bg-white hover:bg-[#222222] dark:hover:bg-[#EEEEEE] text-white dark:text-[#111111] font-bold text-[13.5px] rounded-[8px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1 shadow-sm uppercase tracking-wider"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Continue with Email</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Guest / Offline Access */}
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-[1px] bg-[#EBEBEB] dark:bg-[#252525]" />
                <span className="text-[10px] tracking-[1.5px] font-bold text-[#A0A0A0] uppercase">OR</span>
                <div className="flex-1 h-[1px] bg-[#EBEBEB] dark:bg-[#252525]" />
              </div>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full h-11 border border-[#E3E3E3] dark:border-[#2C2C2C] bg-white dark:bg-[#161616] hover:bg-[#F9F9F9] dark:hover:bg-[#202020] text-[#111111] dark:text-white font-medium text-[13px] rounded-[8px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Continue without Login (Offline Mode)</span>
              </button>
            </form>
          )}
        </div>

      </div>

      {/* Clean Footer */}
      <div className="w-full max-w-[360px] text-center flex flex-col gap-4 mt-12">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8C8C8C] dark:text-[#6A6A6A]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Proxy & Privacy Shield Immune · Direct First-Party Auth</span>
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
