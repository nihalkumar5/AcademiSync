import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-8 bg-[#FFFFFF] dark:bg-[#111111] selection:bg-[#111111] selection:text-white transition-colors">
      
      {/* Top Branding */}
      <div className="flex flex-col items-center mb-6 text-center">
        <h1 className="text-[28px] font-bold tracking-tighter text-[#111111] dark:text-[#FFFFFF]">
          inter<span className="font-normal opacity-70">semester</span>
        </h1>
        <p className="text-[13px] text-[#6F6F6F] dark:text-[#A0A0A0] mt-1 font-medium">
          Sign in to access your synced timetable, exams & tasks
        </p>
      </div>

      {/* Clerk Auth Card */}
      <div className="w-full max-w-md flex justify-center">
        <SignIn
          routing="path"
          path="/sign-in"
          appearance={{
            elements: {
              rootBox: "w-full flex justify-center",
              card: "w-full shadow-none border border-[#E5E5E5] dark:border-[#262626] rounded-none bg-white dark:bg-[#161616] p-6 sm:p-8",
              headerTitle: "text-[20px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-tight",
              headerSubtitle: "text-[13px] text-[#6F6F6F] dark:text-[#A0A0A0]",
              socialButtonsBlockButton: "rounded-none border border-[#D9D9D6] dark:border-[#333333] hover:bg-[#F5F5F5] dark:hover:bg-[#222222] font-semibold text-[13px] text-[#111111] dark:text-white transition-all h-11",
              socialButtonsBlockButtonText: "font-semibold text-[13px] text-[#111111] dark:text-white",
              dividerLine: "bg-[#E5E5E5] dark:bg-[#262626]",
              dividerText: "text-[11px] font-semibold text-[#888888] uppercase tracking-wider",
              formFieldLabel: "text-[12px] font-bold text-[#444444] dark:text-[#CCCCCC] uppercase tracking-wider",
              formFieldInput: "rounded-none border border-[#D9D9D6] dark:border-[#333333] bg-[#FAFAF8] dark:bg-[#1E1E1E] text-[#111111] dark:text-white focus:border-[#111111] dark:focus:border-white focus:bg-white text-[14px] h-11 transition-all",
              formButtonPrimary: "rounded-none bg-[#111111] dark:bg-white hover:bg-black dark:hover:bg-zinc-200 text-white dark:text-[#111111] font-bold text-[14px] h-11 shadow-sm transition-all cursor-pointer",
              footerActionLink: "text-[#111111] dark:text-white font-bold hover:underline",
              footerActionText: "text-[#6F6F6F] dark:text-[#888888] text-[13px]",
            }
          }}
        />
      </div>

    </div>
  );
}
