"use client";

import { useTransition } from "react";
import Link from "next/link";
import { LogOut, User as UserIcon, CreditCard, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/server/actions/auth";

/**
 * Avatar dropdown in the app topbar. Server-action sign-out keeps the cookie
 * cleared on the server before the client redirects.
 */
export function UserMenu({
  fullName,
  email,
}: {
  fullName: string | null;
  email: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const initials = (fullName ?? email ?? "U")
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 px-2"
          aria-label="Account menu"
        >
          <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials || "U"}
          </span>
          <span className="hidden text-sm font-medium sm:inline">
            {fullName ?? "Account"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="text-sm font-medium">{fullName ?? "Account"}</span>
          {email && (
            <span className="truncate text-xs text-muted-foreground">{email}</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <UserIcon className="size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/billing">
            <CreditCard className="size-4" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => startTransition(() => signOutAction())}
          disabled={isPending}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
