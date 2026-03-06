"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Siren, Bell, Settings, PlusCircle, UserCircle2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

type ShellProps = {
  title: string;
  workspaceId?: string;
  children: React.ReactNode;
};

export function AppShell({ title, workspaceId, children }: ShellProps) {
  const pathname = usePathname();

  const navItems = workspaceId
    ? [
        { href: `/w/${workspaceId}/dashboard`, label: "Dashboard", icon: Home },
        { href: `/w/${workspaceId}/monitors/new`, label: "Create Monitor", icon: PlusCircle },
        { href: `/w/${workspaceId}/incidents`, label: "Incidents", icon: Siren },
        { href: `/w/${workspaceId}/notifications`, label: "Notifications", icon: Bell },
        { href: `/w/${workspaceId}/settings/alerts`, label: "Alert Settings", icon: Settings }
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/workspaces" className="text-lg font-semibold text-slate-900">
              PulseGuard
            </Link>
            <p className="text-xs text-slate-500">{title}</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link className="text-slate-600 hover:text-slate-900" href="/workspaces">
              Workspaces
            </Link>
            <Link className="text-slate-600 hover:text-slate-900" href="/account">
              <span className="inline-flex items-center gap-1">
                <UserCircle2 className="h-4 w-4" /> Account
              </span>
            </Link>
            <Link className="text-slate-600 hover:text-slate-900" href="/admin">
              <span className="inline-flex items-center gap-1">
                <Wrench className="h-4 w-4" /> Admin
              </span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 md:grid-cols-[220px_1fr]">
        {workspaceId ? (
          <aside className="rounded-xl border border-slate-200 bg-white p-3">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        ) : null}
        <main>{children}</main>
      </div>
    </div>
  );
}
