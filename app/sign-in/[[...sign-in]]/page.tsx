import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-8 bg-[#FAFAF8] dark:bg-[#121212] selection:bg-[#111111] selection:text-white transition-colors">
      
      {/* Top Tagline */}
      <div className="mb-8 text-center">
        <p className="text-[26px] sm:text-[28px] font-medium tracking-tight text-[#111111] dark:text-white">
          Plan today. Own tomorrow.
        </p>
      </div>

      {/* Clerk Auth Card */}
      <div className="w-full max-w-md flex justify-center">
        <SignIn
          routing="path"
          path="/sign-in"
          localization={{
            signIn: {
              start: {
                title: "Sign in to InterSemester",
                subtitle: "Welcome back. Sign in to continue."
              }
            }
          }}
          appearance={{
            elements: {
              rootBox: "w-full flex justify-center",
              card: "w-full !shadow-none border border-[#E5E5E5] dark:border-[#262626] !rounded-none bg-white dark:bg-[#161616] p-6 sm:p-8",
              header: "w-full flex flex-col items-center text-center",
              logoBox: "mx-auto !rounded-none border border-[#E5E5E5] dark:border-[#262626] w-[72px] h-[72px] flex justify-center items-center p-3 bg-white dark:bg-[#1C1C1C]",
              logoImage: "!rounded-none w-10 h-10 object-contain",
              headerTitle: "text-[20px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-tight text-center w-full mb-1",
              headerSubtitle: "text-[13px] text-[#6F6F6F] dark:text-[#A0A0A0] text-center w-full mb-8",
              socialButtonsBlockButton: "!rounded-[4px] border border-[#D9D9D6] dark:border-[#333333] hover:bg-[#F5F5F5] dark:hover:bg-[#222222] font-semibold text-[13px] text-[#111111] dark:text-white transition-all h-11",
              socialButtonsIconButton: "!rounded-[4px] border border-[#D9D9D6] dark:border-[#333333] hover:bg-[#F5F5F5] dark:hover:bg-[#222222] transition-all h-11 w-full flex justify-center items-center",
              socialButtonsBlockButtonText: "font-semibold text-[13px] text-[#111111] dark:text-white",
              badge: "!rounded-none !border !border-[#EAEAEA] text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-white text-[#6F6F6F]",
              dividerLine: "bg-[#E5E5E5] dark:bg-[#262626]",
              dividerText: "text-[10px] tracking-[1.5px] font-bold text-[#A0A0A0] uppercase",
              formFieldLabel: "text-[11px] font-bold uppercase tracking-[1px] text-[#6F6F6F] dark:text-[#A0A0A0]",
              formFieldInput: "!rounded-[4px] border border-[#D9D9D6] dark:border-[#333333] bg-[#FAFAF8] dark:bg-[#1E1E1E] text-[#111111] dark:text-white focus:border-[#111111] dark:focus:border-white focus:bg-white text-[14px] h-11 transition-all !shadow-none",
              formButtonPrimary: "!rounded-[4px] bg-[#111111] dark:bg-white hover:bg-[#202020] dark:hover:bg-zinc-200 active:bg-[#000000] dark:active:bg-zinc-300 text-white dark:text-[#111111] font-bold text-[14px] h-11 transition-all cursor-pointer",
              footerActionLink: "text-[#111111] dark:text-white font-bold hover:underline",
              footerActionText: "text-[#6F6F6F] dark:text-[#888888] text-[13px]",
            }
          }}
        />
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .cl-card {
          box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.03), 0px 1px 3px rgba(0, 0, 0, 0.02) !important;
          border: 1px solid #E5E5E5 !important;
        }
        .dark .cl-card {
          border-color: #262626 !important;
        }
        .cl-internal-badge {
          display: none !important;
        }
        .cl-footer, .cl-footerAction {
          opacity: 0.4 !important;
          font-size: 11px !important;
        }
        .cl-formButtonPrimary::after {
          content: "  →";
          margin-left: 6px;
          font-weight: bold;
        }
      `}} />
    </div>
  );
}
