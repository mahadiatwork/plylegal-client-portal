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
import { Eye, EyeOff } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const BRAND_GREEN = "#022C22";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

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
    "h-11 rounded-lg border border-slate-200/90 bg-slate-100/90 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-[#022C22]/25 sm:h-10 sm:text-sm";

  return (
    <div className="relative min-h-[100dvh] w-full max-w-full overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 bg-[#f4f6f3]" aria-hidden />

      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -bottom-[18%] -right-[8%] h-[min(75vh,36rem)] w-[min(110vw,44rem)] rounded-[52%_48%_48%_52%] bg-gradient-to-br from-emerald-100/85 via-emerald-50/50 to-white/25 opacity-95"
          style={{ filter: "blur(0.5px)" }}
        />
        <div className="absolute -bottom-24 right-0 h-[min(55vh,26rem)] w-[min(95vw,34rem)] rounded-tl-[55%] rounded-tr-[40%] bg-gradient-to-tl from-emerald-200/45 via-emerald-100/25 to-transparent" />
      </div>

      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        <div className="login-glass-panel w-full max-w-md rounded-2xl px-6 py-9 sm:px-9 sm:py-10">
          <div className="mb-8 flex flex-col items-center space-y-5 text-center">
            <BrandLogo
              variant="black"
              priority
              className="mx-auto h-auto max-h-[52px] w-auto max-w-[200px] object-contain sm:max-h-[56px] sm:max-w-[220px]"
            />
            <div className="space-y-1.5">
              <h1 className="font-sans text-xl !font-bold tracking-normal text-slate-800 sm:text-2xl">
                Sign In to Your Visa Portal
              </h1>
              <p className="text-sm leading-relaxed text-slate-500">
                Continue accessing your visa application below
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-800">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                data-testid="input-email"
                autoComplete="email"
                {...register("email")}
                className={inputClassName}
              />
              {errors.email && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-800">
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
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  data-testid="input-password"
                  autoComplete="current-password"
                  {...register("password")}
                  className={`${inputClassName} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#022C22]"
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
              className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-[1.03] disabled:cursor-wait disabled:opacity-100"
              style={{ backgroundColor: BRAND_GREEN }}
            >
              {isSubmitting && (
                <span
                  className="inline-block h-5 w-5 shrink-0 rounded-full border-2 border-white/35 border-t-white animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              )}
              <span>{isSubmitting ? "Signing in..." : "Sign In"}</span>
            </button>

            <p className="pt-1 text-center text-xs text-slate-400">
              Portal pre-filled with test data.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
