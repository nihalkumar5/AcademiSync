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
        
        {/* Notion Logo Style (Larger Square Border with inside symbol) */}
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
          <h1 className="text-[25px] font-bold tracking-tight text-[#111111] dark:text-white">
            {mode === 'signin' ? 'Your academic workspace.' : 'Join your workspace.'}
          </h1>
          <p className="text-[15px] text-[#6F6F6F] dark:text-[#9A9A9A]">
            {mode === 'signin' ? 'Log in to your InterSemester account' : 'Sign up for a new account'}
          </p>
        </div>

        {errorMsg && (
          <div className="w-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-3 rounded-lg text-red-600 dark:text-red-400 text-[12.5px] font-medium text-center">
            {errorMsg}
          </div>
        )}

        {/* Stack Buttons / Form fields */}
        <div className="w-full flex flex-col gap-4">
          
          {/* Google Auth Button (Notion styled) */}
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
            <span className="text-[10px] tracking-[1.5px] font-bold text-[#A0A0A0] uppercase">OR</span>
            <div className="flex-1 h-[1px] bg-[#EBEBEB] dark:bg-[#252525]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'signup' && (
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

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password..."
              required
              disabled={loading}
              className="w-full h-11 border border-[#E3E3E3] dark:border-[#2C2C2C] bg-[#FAFAFA] dark:bg-[#181818] text-[#111111] dark:text-white px-3.5 text-[14px] rounded-[8px] placeholder-[#8C8C8C] focus:outline-none focus:border-[#8C8C8C] dark:focus:border-[#8C8C8C] transition-all"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#111111] dark:bg-white hover:bg-[#222222] dark:hover:bg-[#EEEEEE] text-white dark:text-[#111111] font-bold text-[14px] rounded-[8px] transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 mt-1 shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Continue with email
                </>
              )}
            </button>
          </form>

          {/* Toggle Screen Actions */}
          <div className="text-center mt-2">
            {mode === 'signin' ? (
              <p className="text-[14px] text-[#5C5C5C] dark:text-[#A0A0A0]">
                New user?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/sign-up')}
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
                  onClick={() => router.push('/sign-in')}
                  className="text-[#111111] dark:text-white font-bold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

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
