"use client";

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
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";

const passwordChangeSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ChangePasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const snap = useSnapshot(authStore);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Check if user needs to change password
  useEffect(() => {
    const checkPasswordChangeRequired = async () => {
      if (!snap.isAuthenticated) {
        router.push("/login");
        return;
      }

      // Check if user actually needs to change password
      if (snap.profile && !snap.profile.needsPasswordChange) {
        // User doesn't need password change, redirect to applications
        router.push("/applications");
        return;
      }

      setIsLoading(false);
    };

    checkPasswordChangeRequired();
  }, [snap.isAuthenticated, snap.profile, router]);

  const onSubmit = async (data) => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to change your password.",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      // Update password in Firebase Auth
      await updatePassword(user, data.newPassword);

      // Update needsPasswordChange flag in Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        needsPasswordChange: false,
        updatedAt: new Date().toISOString(),
      });

      // Update local store
      if (authStore.profile) {
        authStore.profile.needsPasswordChange = false;
      }

      toast({
        title: "Success",
        description: "Your password has been changed successfully!",
      });

      // Redirect to applications page
      router.push("/applications");
    } catch (error) {
      console.error("Password change error:", error);
      
      let errorMessage = "Failed to change password. Please try again.";
      
      if (error.code === "auth/requires-recent-login") {
        errorMessage = "For security reasons, please log out and log in again before changing your password.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use at least 6 characters.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto">
            <h1 className="font-serif text-3xl font-bold text-primary mb-2">
              PlyLegal
            </h1>
          </div>
          <CardTitle className="font-serif text-2xl">Change Your Password</CardTitle>
          <CardDescription className="text-base">
            For security, please set a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                data-testid="input-new-password"
                {...register("newPassword")}
                className="border-2 focus:ring-2 focus:ring-primary/20 h-11"
                placeholder="Enter new password (min 6 characters)"
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                data-testid="input-confirm-password"
                {...register("confirmPassword")}
                className="border-2 focus:ring-2 focus:ring-primary/20 h-11"
                placeholder="Re-enter your new password"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full min-h-11"
              disabled={isSubmitting}
              data-testid="button-change-password"
            >
              {isSubmitting ? "Changing Password..." : "Change Password"}
            </Button>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                You will be redirected to your applications after changing your password
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
