"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BellRing, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SettingsHomePage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  return (
    <main className="flex-1 space-y-8 p-8 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground uppercase">Settings</h1>
        <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mt-1">Workspace configuration modules</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`/w/${workspaceId}/settings/alerts`}>
          <Card className="bg-black/40 backdrop-blur-md border-white/10 hover:border-primary/30 transition-colors h-full">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest font-mono flex items-center gap-2">
                <BellRing className="h-4 w-4 text-primary" /> Alert Routing
              </CardTitle>
              <CardDescription className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">Slack integration and dispatch rules</CardDescription>
            </CardHeader>
            <CardContent className="text-[11px] text-foreground/60">Configure outbound incident notifications.</CardContent>
          </Card>
        </Link>

        <Link href={`/w/${workspaceId}/settings/team`}>
          <Card className="bg-black/40 backdrop-blur-md border-white/10 hover:border-primary/30 transition-colors h-full">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest font-mono flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Team & Roles
              </CardTitle>
              <CardDescription className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">Membership visibility for this workspace</CardDescription>
            </CardHeader>
            <CardContent className="text-[11px] text-foreground/60">Manage workspace members, roles, and access control.</CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}
