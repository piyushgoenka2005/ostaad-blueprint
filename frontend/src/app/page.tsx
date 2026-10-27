"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const { token, user } = getAuthSession();
    if (token && user) {
      switch (user.role?.toUpperCase()) {
        case "OPERATIONS":
          router.replace("/dashboard/operations");
          break;
        case "FINANCE":
          router.replace("/dashboard/finance");
          break;
        case "SITE_STORE":
          router.replace("/dashboard/site-store");
          break;
        case "ADMIN":
        case "SUPERADMIN":
          router.replace("/dashboard/admin");
          break;
        default:
          router.replace("/login");
          break;
      }
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#060913] text-slate-400 flex items-center justify-center font-mono text-xs">
      Redirecting to BuildBharat ERP Authentication Gateway...
    </div>
  );
}
