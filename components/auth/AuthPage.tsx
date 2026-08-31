'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useApp } from '@/context/AppContext';
import { Loader2, Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';

interface AuthPageProps {
  mode: 'signin' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode: initialMode }) => {
  const router = useRouter();
  const { showToast, user } = useApp();
  
  const [currentMode, setCurrentMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSent, setResetSent] = useState(false);

  React.useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  React.useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Forgot Password Flow
    if (currentMode === 'forgot') {
      if (!email.trim()) {
        showToast('Email Required', 'Please enter your email address to reset password.', 'error');
        return;
      }

      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email.trim());
        setResetSent(true);
        showToast('Reset Link Sent', 'Password reset email sent! Please check your inbox.', 'success');
      } catch (err: any) {
        console.error('Password reset error:', err);
        let msg = 'Failed to send reset link. Please check your email.';
        if (err.code === 'auth/user-not-found') {
          msg = 'No account found with this email.';
        } else if (err.code === 'auth/invalid-email') {
          msg = 'Please enter a valid email address.';
        }
        setErrorMsg(msg);
        showToast('Reset Failed', msg, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Normal Sign In & Sign Up Flow
    if (!email.trim() || !password.trim()) {
      showToast('Fields Required', 'Please enter email and password.', 'error');
      return;
    }

    if (currentMode === 'signup' && !name.trim()) {
      showToast('Name Required', 'Please enter your full name.', 'error');
      return;
    }

    setLoading(true);

    try {
      if (currentMode === 'signin') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        showToast('Welcome Back', 'Signed in successfully.', 'success');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(userCredential.user, {
          displayName: name.trim()
        });
        showToast('Account Created', 'Successfully registered.', 'success');
      }
      router.push('/');
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Incorrect password or email. Please check and try again.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email. Please sign up first.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setErrorMsg(msg);
      showToast('Auth Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
      showToast('Google Sign In', 'Authenticated successfully with Google.', 'success');
      router.push('/');
    } catch (err: any) {
      console.error('Google auth error:', err);
      let msg = 'Google authentication failed.';
      if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Login popup was closed before completion.';
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'Popup was blocked by your browser. Please sign in with Email & Password below.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network connection blocked by campus firewall/proxy. Please sign in with Email & Password.';
      } else if (err.code === 'auth/unauthorized-domain') {
        msg = 'Domain not authorized for Google Sign-In.';
      } else if (err.code === 'auth/missing-initial-state' || err.message?.includes('missing initial state')) {
        msg = 'Browser privacy shield blocked session storage. Please sign in with Email & Password below.';
      } else {
        msg = `Google Auth Error: ${err.message || err.code || err}`;
      }
      setErrorMsg(msg);
      showToast('Auth Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-between px-6 py-12 bg-white dark:bg-[#111111] text-[#111111] dark:text-white transition-colors selection:bg-[#111111] selection:text-white dark:selection:bg-white dark:selection:text-[#111111]">
      
      {/* Spacer to push content down */}
      <div />

      {/* Main Container (Notion Style) */}
      <div className="w-full max-w-[360px] flex flex-col items-center gap-7">
        
        {/* Notion Logo Style */}
        <div className="flex flex-col items-center gap-3">
          <div className="border-[1.5px] border-[#E3E3E3] dark:border-[#2C2C2C] w-[76px] h-[76px] flex items-center justify-center bg-white dark:bg-[#111111] rounded-[12px] shadow-sm overflow-hidden p-1.5">
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
        
        {/* Header Strings */}
        <div className="text-center flex flex-col gap-1 mt-1">
          <h1 className="text-[24px] font-bold tracking-tight text-[#111111] dark:text-white">
            {currentMode === 'forgot'
              ? 'Reset your password'
              : currentMode === 'signin'
              ? 'Your academic workspace.'
              : 'Join your workspace.'}
          </h1>
          <p className="text-[14.5px] text-[#6F6F6F] dark:text-[#9A9A9A]">
            {currentMode === 'forgot'
              ? 'Enter your email to receive a password reset link'
              : currentMode === 'signin'
              ? 'Log in to your InterSemester account'
              : 'Sign up for a new account'}
          </p>
        </div>

        {errorMsg && (
          <div className="w-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-3 rounded-lg text-red-600 dark:text-red-400 text-[12.5px] font-medium text-center">
            {errorMsg}
          </div>
        )}

        {/* Stack Buttons / Form fields */}
        <div className="w-full flex flex-col gap-4">
          
          {currentMode === 'forgot' ? (
            /* Forgot Password Screen */
            <div className="flex flex-col gap-3">
              {resetSent ? (
                <div className="flex flex-col items-center gap-3 p-4 bg-[#FAFAF8] dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#2C2C2C] text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[14px] font-bold text-[#111111] dark:text-white">Email Sent!</span>
                    <p className="text-[12.5px] text-[#6F6F6F] dark:text-[#9A9A9A]">
                      We sent a password reset link to <span className="font-semibold text-[#111111] dark:text-white">{email}</span>. Please check your inbox and spam folder.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setResetSent(false); setCurrentMode('signin'); }}
                    className="mt-2 w-full py-2.5 bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-bold text-[13px] rounded-[8px] hover:opacity-90 transition-opacity"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email..."
                      required
                      autoFocus
                      disabled={loading}
                      className="w-full h-11 border border-[#E3E3E3] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#181818] text-[#111111] dark:text-white px-3.5 text-[14px] rounded-[8px] placeholder-[#8C8C8C] focus:outline-none focus:border-[#8C8C8C] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-[#111111] dark:bg-white hover:bg-[#222222] dark:hover:bg-[#EEEEEE] text-white dark:text-[#111111] font-bold text-[14px] rounded-[8px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1 shadow-sm"
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
                    className="w-full py-2 text-[13px] font-medium text-[#6F6F6F] hover:text-[#111111] dark:hover:text-white transition-colors flex items-center justify-center gap-1.5 mt-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              {/* Google Auth Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-11 border border-[#E3E3E3] dark:border-[#2C2C2C] hover:bg-[#F9F9F9] dark:hover:bg-[#1A1A1A] text-[#111111] dark:text-white font-medium text-[14px] rounded-[8px] transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 14.97 1 12 1 7.35 1 3.37 3.68 1.34 7.6l3.96 3.07C6.27 7.37 8.91 5.04 12 5.04z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.63z"/>
                  <path fill="#FBBC05" d="M5.3 14.33l-3.96 3.07C3.37 21.32 7.35 24 12 24c3.24 0 5.95-1.08 7.93-2.91l-3.73-2.89c-1.03.69-2.35 1.1-4.2 1.1-3.09 0-5.73-2.33-6.7-5.54L5.3 14.33z"/>
                  <path fill="#34A853" d="M12 4.49c-1.85 0-3.17.41-4.2 1.1L4.07 2.7C6.05.88 8.76-.2 12-.2c4.65 0 8.63 2.68 10.66 6.6l-3.96 3.07c-.97-3.21-3.61-5.54-6.7-5.54z" transform="translate(0 .2)"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-[1px] bg-[#EBEBEB] dark:bg-[#252525]" />
                <span className="text-[10px] tracking-[1.5px] font-bold text-[#A0A0A0] uppercase">OR EMAIL</span>
                <div className="flex-1 h-[1px] bg-[#EBEBEB] dark:bg-[#252525]" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {currentMode === 'signup' && (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name..."
                    required
                    disabled={loading}
                    className="w-full h-11 border border-[#E3E3E3] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#181818] text-[#111111] dark:text-white px-3.5 text-[14px] rounded-[8px] placeholder-[#8C8C8C] focus:outline-none focus:border-[#8C8C8C] dark:focus:border-[#8C8C8C] transition-all"
                  />
                )}

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  required
                  disabled={loading}
                  className="w-full h-11 border border-[#E3E3E3] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#181818] text-[#111111] dark:text-white px-3.5 text-[14px] rounded-[8px] placeholder-[#8C8C8C] focus:outline-none focus:border-[#8C8C8C] dark:focus:border-[#8C8C8C] transition-all"
                />

                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password..."
                    required
                    disabled={loading}
                    className="w-full h-11 border border-[#E3E3E3] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#181818] text-[#111111] dark:text-white pl-3.5 pr-10 text-[14px] rounded-[8px] placeholder-[#8C8C8C] focus:outline-none focus:border-[#8C8C8C] dark:focus:border-[#8C8C8C] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 text-[#888888] hover:text-[#111111] dark:hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Forgot Password Link on Signin Mode */}
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
                  className="w-full h-11 bg-[#111111] dark:bg-white hover:bg-[#222222] dark:hover:bg-[#EEEEEE] text-white dark:text-[#111111] font-bold text-[14px] rounded-[8px] transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 mt-1 shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {currentMode === 'signin' ? 'Sign In with Email' : 'Create Account with Email'}
                    </>
                  )}
                </button>
              </form>

              {/* Toggle Screen Actions */}
              <div className="text-center mt-2">
                {currentMode === 'signin' ? (
                  <p className="text-[14px] text-[#5C5C5C] dark:text-[#A0A0A0]">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setCurrentMode('signup')}
                      className="text-[#111111] dark:text-white font-bold hover:underline cursor-pointer"
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p className="text-[14px] text-[#5C5C5C] dark:text-[#A0A0A0]">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setCurrentMode('signin')}
                      className="text-[#111111] dark:text-white font-bold hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </>
          )}

        </div>

      </div>

      {/* Notion-Style Terms and Layout Footer */}
      <div className="w-full max-w-[360px] text-center flex flex-col gap-5 mt-12">
        <p className="text-[11px] text-[#8C8C8C] dark:text-[#6A6A6A] leading-relaxed font-medium">
          By continuing, you acknowledge that you understand and agree to the{' '}
          <a href="/terms" className="underline hover:text-[#111111] dark:hover:text-white">Terms & Conditions</a>{' '}
          and{' '}
          <a href="/privacy" className="underline hover:text-[#111111] dark:hover:text-white">Privacy Policy</a>.
        </p>

        <div className="border-t border-[#F0F0F0] dark:border-[#252525] pt-4 flex justify-center items-center gap-5 text-[12px] font-medium text-[#8C8C8C] dark:text-[#6A6A6A]">
          <a href="/terms" className="hover:underline">Terms & Conditions</a>
          <span>•</span>
          <a href="/privacy" className="hover:underline">Privacy Policy</a>
          <span>•</span>
          <span className="font-mono text-[10px] uppercase opacity-60">Firebase Secure</span>
        </div>
      </div>

    </div>
  );
};
