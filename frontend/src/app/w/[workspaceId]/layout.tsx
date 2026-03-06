"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { Activity, AlertTriangle, Bell, ChevronDown, LayoutDashboard, LogOut, Settings, ShieldCheck, UserCircle2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, workspaceApi } from "@/lib/api";
import { Workspace } from "@/lib/types";
import { toast } from "sonner";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params?.workspaceId || "";
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [checkedMembership, setCheckedMembership] = useState(false);

  useEffect(() => {
    void workspaceApi
      .list()
      .then((data) => {
        const selected = data.workspaces.find((w) => w.id === workspaceId) ?? null;
        setWorkspace(selected);
        setCheckedMembership(true);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
          return;
        }
        toast.error(error instanceof ApiError ? error.message : "Failed to load workspace context");
        setCheckedMembership(true);
      });
  }, [workspaceId, router]);

  const navLinks = useMemo(
    () => [
      { name: "Telemetry", href: `/w/${workspaceId}/dashboard`, icon: LayoutDashboard },
      { name: "Nodes", href: `/w/${workspaceId}/monitors`, icon: Activity },
      { name: "Anomalies", href: `/w/${workspaceId}/incidents`, icon: AlertTriangle },
      { name: "Dispatch", href: `/w/${workspaceId}/notifications`, icon: Bell },
      { name: "Pipeline", href: `/w/${workspaceId}/settings/alerts`, icon: Settings },
      { name: "Team", href: `/w/${workspaceId}/settings/team`, icon: Users }
    ],
    [workspaceId]
  );

  if (!checkedMembership) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-xs font-mono uppercase tracking-widest text-foreground/50">Loading workspace context...</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md border border-white/10 bg-black/40 p-6 text-center">
          <h1 className="text-lg font-display font-bold uppercase tracking-widest text-foreground">Access Denied</h1>
          <p className="mt-3 text-[11px] font-mono text-foreground/60">
            You do not have access to this workspace or it no longer exists.
          </p>
          <Button asChild className="mt-6 rounded-none font-mono text-[10px] uppercase tracking-widest">
            <Link href="/workspaces">Go To Workspaces</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-primary/30">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-6 border-b border-white/5 glass px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full group-hover:bg-primary/40 transition-colors" />
          </div>
          <span className="text-lg font-display font-bold tracking-tight text-foreground uppercase italic hidden sm:inline-block">PulseGuard</span>
        </Link>

        <div className="h-6 w-px bg-white/10 hidden sm:block" />

        <Link href="/workspaces" className="flex items-center gap-3 border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono uppercase tracking-widest hover:bg-white/10 hover:border-primary/30 transition-all rounded-none group">
          <div className="h-4 w-4 bg-primary/20 text-primary flex items-center justify-center font-bold border border-primary/30">A</div>
          <span className="text-foreground/90 group-hover:text-primary transition-colors">{workspace?.name ?? "Workspace"}</span>
          <ChevronDown className="h-3 w-3 text-foreground/40 ml-1 group-hover:text-primary transition-colors" />
        </Link>

        <nav className="hidden md:flex items-center gap-2 ml-4">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-widest transition-all rounded-none border ${
                  isActive ? "bg-primary/10 text-primary border-primary/30" : "border-transparent text-foreground/60 hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <link.icon className="h-3.5 w-3.5" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="text-foreground/60 hover:text-primary rounded-none border border-transparent hover:border-primary/30 hover:bg-primary/5">
            <Link href={`/w/${workspaceId}/notifications`}>
              <Bell className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="text-foreground/60 hover:text-primary rounded-none border border-transparent hover:border-primary/30 hover:bg-primary/5">
            <Link href={`/w/${workspaceId}/settings`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="text-foreground/60 hover:text-primary rounded-none border border-transparent hover:border-primary/30 hover:bg-primary/5">
            <Link href="/account">
              <UserCircle2 className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="text-foreground/60 hover:text-red-400 rounded-none border border-transparent hover:border-red-500/30 hover:bg-red-500/5">
            <Link href="/signout">
              <LogOut className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="md:hidden border-b border-white/5 bg-black/40 px-4 py-2 flex overflow-x-auto gap-2 hide-scrollbar">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex whitespace-nowrap items-center gap-2 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-all rounded-none border ${
                isActive ? "bg-primary/10 text-primary border-primary/30" : "border-transparent text-foreground/60 hover:bg-white/5"
              }`}
            >
              <link.icon className="h-3.5 w-3.5" />
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="flex-1 bg-background relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.03] via-background to-background pointer-events-none" />
        <div className="relative z-10 h-full">{children}</div>
      </div>
    </div>
  );
}
