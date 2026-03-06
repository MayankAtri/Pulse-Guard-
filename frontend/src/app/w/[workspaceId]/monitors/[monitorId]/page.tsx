"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiError, monitorApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
import { Monitor, MonitorCheck } from "@/lib/types";
import { motion } from "framer-motion";
import { Activity, ArrowLeft, Terminal, Play, Pause, Trash2, Save } from "lucide-react";
import Link from "next/link";

export default function MonitorDetailPage() {
  const params = useParams<{ workspaceId: string; monitorId: string }>();
  const workspaceId = params.workspaceId;
  const monitorId = params.monitorId;
  const router = useRouter();

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<MonitorCheck[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [monitorsRes, checksRes] = await Promise.all([
        monitorApi.list(workspaceId),
        monitorApi.checks(workspaceId, monitorId, 20)
      ]);
      const selected = monitorsRes.monitors.find((m) => m.id === monitorId) ?? null;
      setMonitor(selected);
      setChecks(checksRes.checks);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load node data");
    }
  }, [workspaceId, monitorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!monitor) return;
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const updated = await monitorApi.update(workspaceId, monitorId, {
        name: String(form.get("name") ?? ""),
        expectedStatus: Number(form.get("expectedStatus")),
        expectedKeyword: String(form.get("expectedKeyword") ?? "").trim() || null,
        timeoutMs: Number(form.get("timeoutMs")),
        intervalSeconds: Number(form.get("intervalSeconds"))
      });
      setMonitor(updated.monitor);
      toast.success("Node configuration updated");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const runCheck = async () => {
    setLoading(true);
    try {
      await monitorApi.runCheck(workspaceId, monitorId);
      toast.success("Check execution queued");
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Execution failed");
    } finally {
      setLoading(false);
    }
  };

  const togglePause = async () => {
    if (!monitor) return;
    setLoading(true);
    try {
      const updated = await monitorApi.update(workspaceId, monitorId, { isPaused: !monitor.isPaused });
      setMonitor(updated.monitor);
      toast.success(updated.monitor.isPaused ? "Node suspended" : "Node resumed");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "State change failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteMonitor = async () => {
    setLoading(true);
    try {
      await monitorApi.remove(workspaceId, monitorId);
      toast.success("Node terminated");
      router.push(`/w/${workspaceId}/dashboard`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Termination failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 space-y-8 p-8 max-w-7xl mx-auto w-full">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="text-foreground/50 hover:text-primary rounded-none border border-transparent hover:border-primary/30 hover:bg-primary/5">
            <Link href={`/w/${workspaceId}/dashboard`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground uppercase flex items-center gap-3">
              <Terminal className="h-6 w-6 text-primary" />
              Node Details
            </h1>
            <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mt-1">
              {monitor ? monitor.url : "Fetching telemetry..."}
            </p>
          </div>
        </div>
        
        {monitor && (
          <div className="flex items-center gap-3">
            {monitor.isPaused ? (
              <Badge variant="outline" className="border-foreground/20 text-foreground/50"><Pause className="w-3 h-3 mr-1" /> SUSPENDED</Badge>
            ) : (
              <Badge variant="success" className="bg-primary/10 text-primary border-primary/30"><Activity className="w-3 h-3 mr-1" /> ACTIVE</Badge>
            )}
          </div>
        )}
      </motion.div>

      <div className="grid gap-6 md:grid-cols-12">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-7"
        >
          <Card className="bg-black/40 backdrop-blur-md h-full">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-sm uppercase tracking-widest font-mono">Configuration Parameters</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {monitor ? (
                <form className="space-y-6" onSubmit={onUpdate}>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3 md:col-span-2">
                      <Label>Node Designation</Label>
                      <Input defaultValue={monitor.name} name="name" required className="font-mono" />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <Label>Endpoint URI</Label>
                      <Input defaultValue={monitor.url} disabled className="font-mono opacity-50 bg-white/2" />
                    </div>
                    <div className="space-y-3">
                      <Label>Expected Status</Label>
                      <Input defaultValue={monitor.expectedStatus} name="expectedStatus" type="number" min={100} max={599} required className="font-mono" />
                    </div>
                    <div className="space-y-3">
                      <Label>Timeout (ms)</Label>
                      <Input defaultValue={monitor.timeoutMs} name="timeoutMs" type="number" min={100} max={30000} required className="font-mono" />
                    </div>
                    <div className="space-y-3">
                      <Label>Check Interval (seconds)</Label>
                      <Input defaultValue={monitor.intervalSeconds} name="intervalSeconds" type="number" min={10} max={86400} required className="font-mono" />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <Label>Payload Assertion</Label>
                      <Input defaultValue={monitor.expectedKeyword ?? ""} name="expectedKeyword" placeholder="Expected keyword" className="font-mono" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                    <Button disabled={loading} type="submit" className="bg-primary text-background hover:bg-primary/90 rounded-none font-mono text-[10px] uppercase tracking-widest gap-2">
                      <Save className="h-4 w-4" /> Commit Changes
                    </Button>
                    <Button disabled={loading} onClick={runCheck} type="button" variant="outline" className="rounded-none font-mono text-[10px] uppercase tracking-widest gap-2">
                      <Play className="h-4 w-4" /> Execute
                    </Button>
                    <Button disabled={loading} onClick={togglePause} type="button" variant="secondary" className="rounded-none font-mono text-[10px] uppercase tracking-widest gap-2">
                      <Pause className="h-4 w-4" /> {monitor.isPaused ? "Resume" : "Suspend"}
                    </Button>
                    <Button disabled={loading} onClick={deleteMonitor} type="button" variant="destructive" className="ml-auto rounded-none font-mono text-[10px] uppercase tracking-widest gap-2">
                      <Trash2 className="h-4 w-4" /> Terminate
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-center h-40 text-foreground/40 font-mono text-xs uppercase animate-pulse">
                  Querying Node Data...
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-5"
        >
          <Card className="bg-black/40 backdrop-blur-md h-full">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-sm uppercase tracking-widest font-mono">Execution Logs</CardTitle>
              <CardDescription className="text-[10px] font-mono">Recent telemetry results</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 px-0">
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto hide-scrollbar">
                {checks.map((check) => (
                  <div className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group" key={check.id}>
                    <div className="flex items-center gap-4">
                      {check.isUp ? (
                        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                      )}
                      <div>
                        <p className="text-xs font-mono text-foreground/80">{formatDateTime(check.checkedAt)}</p>
                        <p className="text-[10px] font-mono text-foreground/40 mt-1">
                          STAT: <span className={check.statusCode === 200 ? "text-primary" : "text-red-400"}>{check.statusCode ?? "ERR"}</span> | LAT: {check.responseTimeMs ?? "---"}ms
                        </p>
                      </div>
                    </div>
                    {check.isUp ? (
                      <Badge variant="success" className="opacity-50 group-hover:opacity-100 transition-opacity">OK</Badge>
                    ) : (
                      <Badge variant="destructive">FAULT</Badge>
                    )}
                  </div>
                ))}
                {!checks.length && (
                  <div className="p-8 text-center text-foreground/40 font-mono text-xs uppercase">
                    No telemetry records found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
