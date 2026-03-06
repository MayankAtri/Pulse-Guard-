"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, LogOut, Plus, ShieldCheck, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PulseBackground } from "@/components/ui/pulse-background";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ApiError, workspaceApi } from "@/lib/api";
import { Workspace } from "@/lib/types";

export default function WorkspaceSelectorPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    try {
      const data = await workspaceApi.list();
      setWorkspaces(data.workspaces);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login");
        return;
      }
      toast.error(error instanceof ApiError ? error.message : "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const createWorkspace = async () => {
    const name = window.prompt("Enter workspace name");
    if (!name?.trim()) return;

    setCreating(true);
    try {
      await workspaceApi.create({ name: name.trim() });
      toast.success("Workspace deployed");
      await loadWorkspaces();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Workspace deploy failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-primary/30">
      <PulseBackground />

      <header className="flex h-16 items-center px-6 border-b border-white/5 glass relative z-10">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full group-hover:bg-primary/40 transition-colors" />
          </div>
          <span className="text-xl font-display font-bold tracking-tight text-foreground uppercase italic">PulseGuard</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
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

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-3xl space-y-12">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono uppercase tracking-widest mb-6 rounded-none">
              <span className="w-1.5 h-1.5 bg-primary animate-pulse" />
              Environment Initialization
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground uppercase mb-4">Select Node</h1>
            <p className="text-foreground/50 font-mono text-xs uppercase tracking-widest">Connect to an existing workspace or deploy a new instance.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {workspaces.map((workspace, index) => (
              <motion.div key={workspace.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }}>
                <Link href={`/w/${workspace.id}/dashboard`} className="block h-full group">
                  <Card className="h-full bg-black/40 backdrop-blur-xl border-white/10 group-hover:border-primary/50 group-hover:bg-primary/[0.02] transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-6 h-full relative z-10">
                      <div className="h-12 w-12 border border-white/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg uppercase tracking-tight text-foreground mb-1">{workspace.name}</h3>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">{workspace.role} ACCESS</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: workspaces.length * 0.1 }}>
              <Card onClick={createWorkspace} className="h-full bg-transparent border-dashed border-2 border-white/10 hover:border-primary/50 hover:bg-primary/[0.02] transition-all cursor-pointer group">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-6 h-full">
                  <div className="h-12 w-12 border border-dashed border-white/20 flex items-center justify-center text-foreground/50 group-hover:text-primary group-hover:border-primary/50 group-hover:scale-110 transition-all">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg uppercase tracking-tight text-foreground mb-1">Deploy Node</h3>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">{creating ? "DEPLOYING..." : "Initialize new environment"}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {!loading && !workspaces.length ? (
            <div className="text-center text-[10px] font-mono uppercase tracking-widest text-foreground/40">No workspaces available yet.</div>
          ) : null}

          <div className="flex justify-center">
            <Link href="/account">
              <Button variant="outline" className="font-mono text-[10px] uppercase tracking-widest">Account</Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
