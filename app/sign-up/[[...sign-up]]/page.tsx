import { SignUp } from "@clerk/nextjs";
import { GraduationCap } from "lucide-react";

export default function Page() {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F2F2F7] dark:bg-black selection:bg-blue-500 selection:text-white">
      
      {/* Left side: Premium Branding (hidden on small screens) */}
      <div className="hidden md:flex flex-1 flex-col justify-between p-12 bg-white dark:bg-zinc-950 relative overflow-hidden border-r border-slate-200 dark:border-zinc-800">
        
        {/* Decorative background orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            AcademiSync
          </span>
        </div>

        <div className="relative z-10 max-w-sm mb-20">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
            Join your <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">academic hub.</span>
          </h1>
          <p className="mt-6 text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed">
            Create an account to supercharge your college experience. Completely free for college students across India.
          </p>
        </div>
      </div>

      {/* Right side: Clerk Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(at_0%_0%,_rgba(59,130,246,0.08)_0px,_transparent_50%),radial-gradient(at_100%_100%,_rgba(139,92,246,0.08)_0px,_transparent_50%)] pointer-events-none" />
        
        {/* Mobile Logo */}
        <div className="md:hidden flex flex-col items-center gap-3 mb-8 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            AcademiSync
          </span>
        </div>

        <div className="relative z-10 w-full max-w-md flex justify-center">
          <SignUp routing="path" path="/sign-up" />
        </div>
      </div>
    </div>
  );
}
