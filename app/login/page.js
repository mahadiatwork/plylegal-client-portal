"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { authStore } from "@/stores";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const snap = useSnapshot(authStore);
  const [showPassword, setShowPassword] = useState(false);

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
    
    if (result === true || (typeof result === 'object' && result.success)) {
      toast({
        title: "Success",
        description: "Logged in successfully!",
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto flex justify-center">
            <BrandLogo className="h-12" priority />
          </div>
          <CardTitle className="font-serif text-2xl">Welcome Back</CardTitle>
          <CardDescription className="text-base">
            Sign in to continue your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                data-testid="input-email"
                {...register("email")}
                className="border-2 focus:ring-2 focus:ring-primary/20 h-11"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  data-testid="input-password"
                  {...register("password")}
                  className="border-2 focus:ring-2 focus:ring-primary/20 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full min-h-11"
              disabled={isSubmitting}
              data-testid="button-login"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                Demo credentials are pre-filled
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
