import Image from 'next/image';
import { Icons } from '@/components/ui/icons';
import { LoginFormFields } from '@/components/auth/LoginFormFields';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src="/background_login.jpg"
          alt="Login background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.18),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.82),rgba(255,255,255,0.72)_45%,rgba(248,250,252,0.82))] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.25),transparent_35%),linear-gradient(135deg,rgba(3,7,18,0.82),rgba(2,6,23,0.72)_45%,rgba(15,23,42,0.82))]" />
      </div>

      <div className="relative w-full max-w-md mx-4 animate-fade-in">
        <div className="pointer-events-none absolute -inset-6 rounded-[28px] bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.18),transparent_48%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.14),transparent_52%),radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.14),transparent_58%)] blur-2xl" />
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-card/90 shadow-elevated shadow-[0_14px_45px_rgba(2,6,23,0.16),0_0_0_1px_rgba(148,163,184,0.08),0_0_24px_rgba(245,158,11,0.12)] backdrop-blur-xl dark:border-white/15 dark:shadow-[0_14px_45px_rgba(2,6,23,0.45),0_0_0_1px_rgba(255,255,255,0.03),0_0_28px_rgba(30,64,175,0.12)]">
          <div className="p-8 pb-0 text-center">
            <div className="mb-5 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl shadow-soft">
              <Icons.logo className="h-full w-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Guidora Onboarding</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Connectez-vous pour accéder au tableau de bord
            </p>
          </div>

          <div className="p-8">
            <LoginFormFields />
          </div>
        </div>
      </div>
    </div>
  );
}
