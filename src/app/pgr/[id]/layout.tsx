"use client";

import { Work_Sans } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import type { ReactNode } from "react";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const mockUser = {
  name: "User Admin",
  initials: "UA",
};

export default function PgrLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`min-h-screen bg-background ${workSans.className}`}>
      <div className="mx-auto w-full max-w-[1480px] px-0 pb-16 pt-8 sm:px-0 lg:px-1">
        <AppHeader user={mockUser} />
        {children}
      </div>
    </div>
  );
}
