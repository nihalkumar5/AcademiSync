'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile
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

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-6 bg-white dark:bg-[#111111] text-[#111111] dark:text-white transition-colors selection:bg-[#111111] selection:text-white dark:selection:bg-white dark:selection:text-[#111111]">
      
      {/* Centered Minimal Container */}
      <div className="w-full max-w-[340px] flex flex-col gap-8 py-12">
        
        {/* Minimal Logo & Header */}
        <div className="flex flex-col items-start gap-4">
          <div className="border border-[#111111] dark:border-white w-[54px] h-[54px] flex items-center justify-center bg-white dark:bg-[#111111] rounded-none">
            <span className="text-[18px] font-bold tracking-tighter">is</span>
          </div>
          
          <div className="flex flex-col gap-1.5 mt-2">
            <h2 className="text-[24px] font-bold tracking-tight">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </h2>
            <p className="text-[13px] text-[#6F6F6F] dark:text-[#A0A0A0] font-medium leading-none">
              {mode === 'signin' ? 'Welcome back. Sign in to continue.' : 'Welcome. Sign up to continue.'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-950/20 border-l-2 border-red-500 p-3 text-red-600 dark:text-red-400 text-[12.5px] font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#6F6F6F] dark:text-[#A0A0A0]">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                disabled={loading}
                className="h-11 border-b border-[#D9D9D6] dark:border-[#333333] bg-transparent text-[#111111] dark:text-white text-[14px] focus:outline-none focus:border-[#111111] dark:focus:border-white transition-all w-full"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#6F6F6F] dark:text-[#A0A0A0]">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
              className="h-11 border-b border-[#D9D9D6] dark:border-[#333333] bg-transparent text-[#111111] dark:text-white text-[14px] focus:outline-none focus:border-[#111111] dark:focus:border-white transition-all w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#6F6F6F] dark:text-[#A0A0A0]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              disabled={loading}
              className="h-11 border-b border-[#D9D9D6] dark:border-[#333333] bg-transparent text-[#111111] dark:text-white text-[14px] focus:outline-none focus:border-[#111111] dark:focus:border-white transition-all w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-11 mt-4 bg-[#111111] dark:bg-white hover:bg-[#202020] dark:hover:bg-zinc-200 active:bg-black dark:active:bg-zinc-300 text-white dark:text-[#111111] font-bold text-[14px] rounded-[4px] transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
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
        <div className="text-left mt-2">
          {mode === 'signin' ? (
            <p className="text-[13px] text-[#6F6F6F] dark:text-[#888888] font-medium">
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
            <p className="text-[13px] text-[#6F6F6F] dark:text-[#888888] font-medium">
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
        <div className="text-left border-t border-[#F0F0EE] dark:border-[#262626] pt-6">
          <p className="text-[11px] text-[#A0A0A0] opacity-40 font-semibold uppercase tracking-[1px]">
            Secured by Firebase
          </p>
        </div>

      </div>
    </div>
  );
};
