"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function SignOutButton() {
  const router = useRouter();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex items-center justify-center gap-2 rounded-lg border border-border px-6 py-2 text-sm font-semibold text-text-muted transition-colors hover:border-error hover:text-error md:hidden"
    >
      <LogOut size={16} />
      SIGN OUT
    </button>
  );
}
