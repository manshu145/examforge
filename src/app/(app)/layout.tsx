import { requireOnboardedUser } from "@/lib/auth";
import { AppTopbar } from "@/components/app/app-topbar";

/**
 * Protected app shell.
 *
 *  - `requireOnboardedUser()` redirects to /login if not signed in, or to
 *    /onboarding if the profile hasn't been completed yet. So by the time
 *    children render, both gates have passed.
 *  - The full sidebar / nav lands in Step 4. For now: a clean topbar.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireOnboardedUser();

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <AppTopbar user={user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
