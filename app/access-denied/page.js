"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { authStore } from "@/stores";

export default function AccessDeniedPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await authStore.logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-semibold">Access Denied</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            You don't have an account in this portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h3 className="font-semibold text-amber-900 text-lg mb-2">
              What does this mean?
            </h3>
            <p className="text-sm text-amber-700 leading-relaxed">
              Your email address was not found in our client database. This portal is only accessible to registered clients.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-semibold text-blue-900 text-lg mb-2">
                Need access?
              </h3>
              <p className="text-sm text-blue-700 leading-relaxed mb-3">
                Please contact the administrator to request access to the client portal. They will verify your information and add you to the system.
              </p>
              <p className="text-sm text-blue-700 leading-relaxed">
                <strong>Administrator Contact:</strong> admin@plylegal.com
              </p>
            </div>

            <Button
              onClick={handleLogout}
              className="w-full min-h-11"
              variant="outline"
              data-testid="button-logout"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
