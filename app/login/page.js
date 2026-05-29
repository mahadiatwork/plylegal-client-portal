"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { authStore } from "@/stores";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  CircleCheck,
  Eye,
  EyeOff,
  Headphones,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/** Brand primary — matches PlyLegal reference */
const BRAND_GREEN = "#235D42";

const featureItems = [
  {
    icon: ShieldCheck,
    title: "Secure & trusted",
    description: "Your information is protected",
  },
  {
    icon: Users,
    title: "Expert support",
    description: "Our team is here to help",
  },
  {
    icon: CircleCheck,
    title: "Progress saved",
    description: "Pick up where you left off",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  // Redirect to /applications if already logged in
  useEffect(() => {
    const check = async () => {
      const isLoggedIn = await authStore.checkSession();
      if (isLoggedIn) {
        router.replace("/applications");
      }
    };
    check();
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "user@example.com",
      password: "password123",
    },
  });

  const onSubmit = async (data) => {
    const result = await authStore.login(data);

    if (result === true || (typeof result === "object" && result.success)) {
      toast({
        title: "Successfully logged in",
      });
      router.push("/applications");
    } else {
      toast({
        title: "Error",
        description: result?.error || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    }
  };

  const inputClassName =
    "h-14 rounded-xl border border-[#dce1e7] bg-white/72 text-[15px] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] placeholder:text-slate-500 focus-visible:border-[#235D42]/45 focus-visible:ring-2 focus-visible:ring-[#235D42]/18";

  return (
    <div className="relative min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#eef2ff] text-slate-900">
      <div
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(112deg,#eef2ff_0%,#eef2ff_46%,#f8f5ed_100%)]"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-[34rem] top-[-12rem] h-[62rem] w-[62rem] rounded-full border border-white/30" />
        <div className="absolute -left-[27rem] top-[-5rem] h-[52rem] w-[52rem] rounded-full border border-white/24" />
        <div className="absolute -left-[20rem] top-[2rem] h-[42rem] w-[42rem] rounded-full border border-white/20" />
        <div className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,rgba(220,227,255,0.64),rgba(238,242,255,0))]" />
      </div>

      <header className="absolute left-6 top-7 z-20 sm:left-10 lg:left-20 lg:top-12">
        <BrandLogo
          variant="black"
          priority
          className="h-auto max-h-[42px] w-auto max-w-[150px] object-contain sm:max-h-[48px] sm:max-w-[170px]"
        />
      </header>

      <main className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-[1530px] items-center gap-12 px-6 pb-10 pt-28 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(34rem,42rem)] lg:gap-16 lg:px-20 lg:py-20 xl:gap-24">
        <section className="mx-auto w-full max-w-[620px] lg:mx-0 lg:pt-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#235D42]">
            <Sparkles className="h-3.5 w-3.5 fill-[#235D42]/10" aria-hidden />
            <span>Welcome back</span>
          </div>

          <div className="mt-5 max-w-[540px]">
            <h1 className="text-[44px] font-semibold leading-[1.02] text-[#235D42] sm:text-[56px] lg:text-[64px]">
              Welcome back
            </h1>
            <p className="mt-5 max-w-[330px] text-xl leading-[1.35] text-slate-700 sm:max-w-[430px] sm:text-2xl">
              Continue your Australian visa journey with clarity and confidence.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            {featureItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="flex items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center text-[#235D42]">
                    <Icon className="h-7 w-7 stroke-[1.6]" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-bold leading-5 text-slate-950">{item.title}</span>
                    <span className="block text-sm leading-5 text-slate-600">{item.description}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 w-full max-w-[520px] overflow-hidden rounded-md border border-white/55 shadow-[0_22px_60px_rgba(49,60,95,0.16)]">
            <img
              src="/images/login-consultation.jpg"
              alt="Visa advisor meeting with clients"
              width={1536}
              height={864}
              className="aspect-[1.58/1] h-auto w-full object-cover"
            />
          </div>
        </section>

        <section className="login-glass-panel mx-auto w-full max-w-[680px] rounded-[22px] px-6 py-9 sm:px-12 sm:py-12 lg:px-16">
          <div className="mb-10 flex flex-col items-center text-center">
            <BrandLogo
              variant="black"
              priority
              className="mx-auto h-auto max-h-[64px] w-auto max-w-[240px] object-contain"
            />
            <div className="mt-7 space-y-2">
              <h2 className="text-2xl font-semibold leading-tight text-[#235D42] sm:text-[28px]">
                Sign in to your visa portal
              </h2>
              <p className="text-base leading-relaxed text-slate-600">
                Access your application, messages and important updates.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-bold text-slate-800">
                Email Address
              </Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                  aria-hidden
                />
                <Input
                  id="email"
                  type="email"
                  data-testid="input-email"
                  autoComplete="email"
                  {...register("email")}
                  className={`${inputClassName} pl-14 pr-4`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="password" className="text-sm font-bold text-slate-800">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ color: BRAND_GREEN }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                  aria-hidden
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  data-testid="input-password"
                  autoComplete="current-password"
                  {...register("password")}
                  className={`${inputClassName} pl-14 pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/80 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#235D42]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="button-login"
              aria-busy={isSubmitting}
              className="relative mt-1 flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-[#165B3B] px-5 text-base font-bold text-white shadow-[0_12px_26px_rgba(22,91,59,0.25)] transition hover:bg-[#124e33] disabled:cursor-wait disabled:opacity-100"
            >
              {isSubmitting && (
                <span
                  className="inline-block h-5 w-5 shrink-0 rounded-full border-2 border-white/35 border-t-white animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              )}
              <span>{isSubmitting ? "Signing in…" : "Sign In"}</span>
              {!isSubmitting && <ArrowRight className="absolute right-5 h-5 w-5" aria-hidden />}
            </button>

            <div className="flex items-center gap-4 pt-7 text-sm text-slate-500">
              <span className="h-px flex-1 bg-slate-200" aria-hidden />
              <span>Need help?</span>
              <span className="h-px flex-1 bg-slate-200" aria-hidden />
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-slate-200/90 bg-white/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-slate-800">
                <Headphones className="h-7 w-7 stroke-[1.8]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">We're here for you</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Our team is ready to support you every step of the way.
                </p>
              </div>
              <a
                href="mailto:admin@plylegal.com"
                className="hidden shrink-0 items-center gap-3 text-sm font-medium text-[#235D42] underline underline-offset-2 transition-opacity hover:opacity-80 sm:flex"
              >
                Contact support
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>

            <p className="flex items-center justify-center gap-2 pt-2 text-sm text-slate-500">
              <LockKeyhole className="h-4 w-4" aria-hidden />
              <span>Secure portal. Your privacy is our priority.</span>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
