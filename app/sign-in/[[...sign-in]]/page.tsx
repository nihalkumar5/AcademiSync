import { SignIn } from "@clerk/nextjs";
import { IntersemesterLogo } from "@/components/ui/IntersemesterLogo";

export default function Page() {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F5F7FA] dark:bg-[#0B0F19] selection:bg-indigo-600 selection:text-white">
      
      {/* Left side: Premium Branding (hidden on small screens) */}
      <div className="hidden md:flex flex-1 flex-col justify-between p-12 bg-white dark:bg-[#111827] relative overflow-hidden border-r border-slate-200/80 dark:border-zinc-800">
        
        {/* Decorative background orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <IntersemesterLogo size="lg" showTagline={false} />
        </div>

        <div className="relative z-10 max-w-md mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#0F172A] dark:text-white leading-tight">
            Your academic life, <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              organized.
            </span>
          </h1>
          <p className="mt-6 text-[#64748B] dark:text-slate-400 font-medium text-base leading-relaxed">
            Timetable, tasks, deadlines and more – everything you need, in one place.
          </p>
        </div>
      </div>

      {/* Right side: Clerk Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(at_0%_0%,_rgba(99,102,241,0.06)_0px,_transparent_50%),radial-gradient(at_100%_100%,_rgba(167,139,250,0.06)_0px,_transparent_50%)] pointer-events-none" />
        
        {/* Mobile Logo */}
        <div className="md:hidden flex flex-col items-center gap-3 mb-8 relative z-10">
          <IntersemesterLogo size="lg" showTagline={true} />
        </div>

        <div className="relative z-10 w-full max-w-md flex justify-center">
          <SignIn routing="path" path="/sign-in" />
        </div>
      </div>
    </div>
  );
}
