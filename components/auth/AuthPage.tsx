'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useApp } from '@/context/AppContext';
import { Loader2 } from 'lucide-react';

interface AuthPageProps {
  mode: 'signin' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const router = useRouter();
  const { showToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Fields Required', 'Please enter email and password.', 'error');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      showToast('Name Required', 'Please enter your full name.', 'error');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        showToast('Welcome Back', 'Signed in successfully.', 'success');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(userCredential.user, {
          displayName: name.trim()
        });
        showToast('Account Created', 'Successfully registered.', 'success');
      }
      
      // Let AppContext pick up auth state change and sync profile.
      // Redirect home
      router.push('/');
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/wrong-password') {
        msg = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered.';
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
    try {
      await signInWithPopup(auth, provider);
      showToast('Google Sign In', 'Authenticated successfully with Google.', 'success');
      router.push('/');
    } catch (err: any) {
      console.error('Google auth error:', err);
      let msg = 'Google authentication failed.';
      if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Login popup was closed before completion.';
      } else if (err.code === 'auth/unauthorized-domain') {
        msg = 'Domain not authorized for Google Sign-In.';
      }
      setErrorMsg(msg);
      showToast('Auth Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-8 bg-[#FAFAF8] dark:bg-[#121212] selection:bg-[#111111] selection:text-white transition-colors">
      
      {/* Top Tagline */}
      <div className="mb-8 text-center">
        <p className="text-[26px] sm:text-[28px] font-medium tracking-tight text-[#111111] dark:text-white">
          Plan today. Own tomorrow.
        </p>
      </div>

      {/* Auth Card wrapper matching premium overview specs */}
      <div className="w-full max-w-md bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] p-6 sm:p-8 flex flex-col gap-6"
           style={{
             boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.03), 0px 1px 3px rgba(0, 0, 0, 0.02)'
           }}>
        
        {/* Optically centered logo box (72x72) */}
        <div className="flex flex-col items-center text-center">
          <div className="border border-[#E5E5E5] dark:border-[#262626] w-[72px] h-[72px] flex items-center justify-center p-3 bg-white dark:bg-[#1C1C1C] rounded-none mb-4">
            <span className="text-[24px] font-bold text-[#111111] dark:text-white tracking-tighter">is</span>
          </div>
          
          <h2 className="text-[20px] font-bold text-[#111111] dark:text-white tracking-tight mb-1">
            {mode === 'signin' ? 'Sign in to InterSemester' : 'Create your account'}
          </h2>
          <p className="text-[13px] text-[#6F6F6F] dark:text-[#A0A0A0] font-medium">
            {mode === 'signin' ? 'Welcome back. Sign in to continue.' : 'Welcome. Sign up to continue.'}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 text-red-600 dark:text-red-400 text-[12.5px] font-medium">
            {errorMsg}
          </div>
        )}

        {/* Google Authentication (Optional for web/native compatibility) */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-11 border border-[#D9D9D6] dark:border-[#333333] hover:bg-[#F5F5F5] dark:hover:bg-[#222222] text-[#111111] dark:text-white font-semibold text-[13px] rounded-[4px] transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 14.97 1 12 1 7.35 1 3.37 3.68 1.34 7.6l3.96 3.07C6.27 7.37 8.91 5.04 12 5.04z"/>
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.63z"/>
              <path fill="#FBBC05" d="M5.3 14.33l-3.96 3.07C3.37 21.32 7.35 24 12 24c3.24 0 5.95-1.08 7.93-2.91l-3.73-2.89c-1.03.69-2.35 1.1-4.2 1.1-3.09 0-5.73-2.33-6.7-5.54L5.3 14.33z"/>
              <path fill="#34A853" d="M12 4.49c-1.85 0-3.17.41-4.2 1.1L4.07 2.7C6.05.88 8.76-.2 12-.2c4.65 0 8.63 2.68 10.66 6.6l-3.96 3.07c-.97-3.21-3.61-5.54-6.7-5.54z" transform="translate(0 .2)"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* OR Divider (Subtle) */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-[#E5E5E5] dark:bg-[#262626]" />
          <span className="text-[10px] tracking-[1.5px] font-bold text-[#A0A0A0] uppercase">OR</span>
          <div className="flex-1 h-[1px] bg-[#E5E5E5] dark:bg-[#262626]" />
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[1px] text-[#6F6F6F] dark:text-[#A0A0A0]">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                disabled={loading}
                className="h-11 border border-[#D9D9D6] dark:border-[#333333] bg-[#FAFAF8] dark:bg-[#1E1E1E] text-[#111111] dark:text-white px-3.5 text-[14px] rounded-[4px] focus:outline-none focus:border-[#111111] dark:focus:border-white focus:bg-white transition-all shadow-none w-full"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-[1px] text-[#6F6F6F] dark:text-[#A0A0A0]">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              disabled={loading}
              className="h-11 border border-[#D9D9D6] dark:border-[#333333] bg-[#FAFAF8] dark:bg-[#1E1E1E] text-[#111111] dark:text-white px-3.5 text-[14px] rounded-[4px] focus:outline-none focus:border-[#111111] dark:focus:border-white focus:bg-white transition-all shadow-none w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-[1px] text-[#6F6F6F] dark:text-[#A0A0A0]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              disabled={loading}
              className="h-11 border border-[#D9D9D6] dark:border-[#333333] bg-[#FAFAF8] dark:bg-[#1E1E1E] text-[#111111] dark:text-white px-3.5 text-[14px] rounded-[4px] focus:outline-none focus:border-[#111111] dark:focus:border-white focus:bg-white transition-all shadow-none w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-11 mt-2 bg-[#111111] dark:bg-white hover:bg-[#202020] dark:hover:bg-zinc-200 active:bg-black dark:active:bg-zinc-300 text-white dark:text-[#111111] font-bold text-[14px] rounded-[4px] transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {mode === 'signin' ? 'Continue' : 'Sign Up'}
                <span className="ml-1.5 font-bold">→</span>
              </>
            )}
          </button>
        </form>

        {/* Footer actions */}
        <div className="text-center mt-2">
          {mode === 'signin' ? (
            <p className="text-[13px] text-[#6F6F6F] dark:text-[#888888]">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/sign-up')}
                className="text-[#111111] dark:text-white font-bold hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-[13px] text-[#6F6F6F] dark:text-[#888888]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/sign-in')}
                className="text-[#111111] dark:text-white font-bold hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        {/* Premium footer */}
        <div className="text-center border-t border-[#F0F0EE] dark:border-[#262626] pt-4 flex flex-col gap-1">
          <p className="text-[11px] text-[#A0A0A0] opacity-40 font-medium">
            Secured by Firebase
          </p>
        </div>

      </div>
    </div>
  );
};
