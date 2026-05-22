import { Suspense } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Card>
      <CardContent className="p-8">
        {/* Suspense is required: useSearchParams() in LoginForm is read async. */}
        <Suspense fallback={<div className="h-[400px]" />}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
