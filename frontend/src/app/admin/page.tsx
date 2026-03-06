"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApi, ApiError } from "@/lib/api";
import { QueueStats } from "@/lib/types";
import { PulseBackground } from "@/components/ui/pulse-background";
import { motion } from "framer-motion";
import { Activity, Play, ShieldCheck, Terminal, Database } from "lucide-react";

export default function AdminPage() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [workspaceId, setWorkspaceId] = useState("");
  const [monitorId, setMonitorId] = useState("");
  const [result, setResult] = useState<string>("");

  const loadStats = async () => {
    try {
      const data = await adminApi.queueStats();
      setStats(data);
      toast.success("Telemetry synchronized");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to synchronize metrics");
    }
  };

  const runChecks = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const data = await adminApi.runChecks({ workspaceId: workspaceId || undefined, monitorId: monitorId || undefined });
      setResult(`Tasks queued: ${data.enqueued}`);
      toast.success("Execution pipeline engaged");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to engage execution pipeline");
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
        <div className="ml-4 pl-4 border-l border-white/10 hidden sm:block">
          <span className="text-xs font-mono uppercase tracking-widest text-red-500 font-bold">Admin Console</span>
        </div>
      </header>

      <main className="flex-1 space-y-8 p-8 max-w-4xl mx-auto w-full relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground uppercase flex items-center gap-3">
            <Terminal className="h-6 w-6 text-primary" />
            System Operations
          </h1>
          <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mt-1">Global queue metrics and manual execution controls</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <Card className="bg-black/40 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="border-b border-white/5 relative z-10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm uppercase tracking-widest font-mono flex items-center gap-2">
                  <Database className="h-4 w-4" /> Global Queue State
                </CardTitle>
                <CardDescription className="text-[10px] font-mono mt-1">Current Redis job allocations</CardDescription>
              </div>
              <Button onClick={loadStats} variant="outline" className="font-mono text-[10px] uppercase tracking-widest border-white/10 hover:bg-white/5 rounded-none gap-2">
                <Activity className="h-3 w-3" /> Sync State
              </Button>
            </CardHeader>
            <CardContent className="pt-6 relative z-10">
              {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 bg-white/5 border border-white/5">
                    <p className="text-[10px] font-mono text-foreground/40 uppercase tracking-widest mb-1">Waiting</p>
                    <p className="text-2xl font-display font-bold text-foreground">{stats.waiting}</p>
                  </div>
                  <div className="p-4 bg-primary/10 border border-primary/20">
                    <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-1">Active</p>
                    <p className="text-2xl font-display font-bold text-primary">{stats.active}</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/5">
                    <p className="text-[10px] font-mono text-foreground/40 uppercase tracking-widest mb-1">Delayed</p>
                    <p className="text-2xl font-display font-bold text-foreground">{stats.delayed}</p>
                  </div>
                  <div className="p-4 bg-red-500/10 border border-red-500/20">
                    <p className="text-[10px] font-mono text-red-500 uppercase tracking-widest mb-1">Failed</p>
                    <p className="text-2xl font-display font-bold text-red-500">{stats.failed}</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/5">
                    <p className="text-[10px] font-mono text-foreground/40 uppercase tracking-widest mb-1">Completed</p>
                    <p className="text-2xl font-display font-bold text-foreground">{stats.completed}</p>
                  </div>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center text-foreground/40 font-mono text-xs uppercase tracking-widest border border-dashed border-white/10">
                  State Unsynchronized. Execute Sync.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-md">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-sm uppercase tracking-widest font-mono flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Manual Pipeline Trigger
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form className="flex flex-col md:flex-row gap-4 items-end" onSubmit={runChecks}>
                <div className="flex-1 w-full space-y-2">
                  <label className="text-[10px] font-mono text-foreground/60 uppercase tracking-widest">Workspace ID (Opt)</label>
                  <Input placeholder="wksp_..." value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="flex-1 w-full space-y-2">
                  <label className="text-[10px] font-mono text-foreground/60 uppercase tracking-widest">Monitor ID (Opt)</label>
                  <Input placeholder="mon_..." value={monitorId} onChange={(e) => setMonitorId(e.target.value)} className="font-mono text-xs" />
                </div>
                <Button type="submit" className="w-full md:w-auto bg-primary text-background hover:bg-primary/90 rounded-none font-mono text-xs uppercase tracking-widest gap-2 h-10">
                  <Play className="h-4 w-4" /> Engage
                </Button>
              </form>
              {result && (
                <div className="mt-4 p-3 bg-white/5 border border-white/10 font-mono text-xs text-primary flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary animate-pulse" /> {result}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
