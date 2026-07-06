import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import DashboardNav from "./dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">Logged in as {user.email}</p>
          <a
            href={`/${user.slug}`}
            className="text-sm underline"
            target="_blank"
          >
            View public page
          </a>
        </div>
        <DashboardNav />
      </header>
      {children}
    </div>
  );
}
