"use client";

import { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";

const schema = z
  .object({
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const email = params.get("email") || "";
  const token = params.get("token") || "";
  const hasToken = useMemo(() => Boolean(email && token), [email, token]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values) => {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        token,
        newPassword: values.newPassword,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      toast({
        title: "Unable to reset password",
        description: result.error || "Please request a new reset link.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Password reset successful",
      description: "You can now sign in with your new password.",
    });
    router.push("/login");
  };

  if (!hasToken) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm text-center">
          <BrandLogo className="mx-auto h-12 w-auto" />
          <h1 className="mt-4 text-xl font-semibold">Invalid reset link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please request a new password reset email.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <BrandLogo className="mx-auto h-12 w-auto" />
          <h1 className="mt-4 text-xl font-semibold">Reset your password</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" {...register("newPassword")} />
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-70"
          >
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>
        </form>
      </div>
    </main>
  );
}
