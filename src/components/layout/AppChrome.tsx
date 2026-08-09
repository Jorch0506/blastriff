"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

interface AppChromeProps {
  username: string;
  trvePoints: number;
  children: React.ReactNode;
}

export function AppChrome({ username, trvePoints, children }: AppChromeProps) {
  const pathname = usePathname();
  const isOnboarding = pathname?.startsWith("/onboarding") ?? false;

  if (isOnboarding) {
    return <div className="flex-1">{children}</div>;
  }

  return (
    <>
      <Header username={username} trvePoints={trvePoints} />
      <div className="flex-1 pb-16 md:pb-0">{children}</div>
      <BottomNav />
    </>
  );
}
