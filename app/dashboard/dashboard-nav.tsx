"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const linkClass = (href: string) =>
    `text-sm ${pathname.startsWith(href) ? "font-semibold underline" : "text-zinc-600"}`;

  return (
    <nav className="flex items-center gap-4">
      <Link href="/dashboard/event-types" className={linkClass("/dashboard/event-types")}>
        Event types
      </Link>
      <Link href="/dashboard/availability" className={linkClass("/dashboard/availability")}>
        Availability
      </Link>
      <button onClick={handleLogout} className="text-sm text-zinc-600 underline">
        Log out
      </button>
    </nav>
  );
}
