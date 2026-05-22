import { Card, CardContent } from "@/components/ui/card";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <Card>
      <CardContent className="p-8">
        <SignupForm />
      </CardContent>
    </Card>
  );
}
