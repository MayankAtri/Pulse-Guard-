"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Filter,
  Flame,
  LayoutDashboard,
  LucideIcon,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Terminal,
  TrendingDown,
  Users,
  Webhook,
  Zap,
  Database,
  BellRing,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  History
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { adminApi, ApiError, dashboardApi, monitorApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Monitor } from "@/lib/types";

type TimeRange = "1h" | "24h" | "7d" | "30d";
type StatusFilter = "ALL" | "OPTIMAL" | "FAULT" | "PAUSED";
type ErrorSlice = { name: string; value: number; color: string };
type DashboardAnalytics = Awaited<ReturnType<typeof dashboardApi.analytics>>;

const errorColors = ["#10b981", "#ef4444", "#f59e0b", "#6366f1", "#22d3ee"];

const statusOfMonitor = (m: Monitor) => {
  if (m.isPaused) return "PAUSED" as const;
  if (m.lastStateUp === false) return "FAULT" as const;
  return "OPTIMAL" as const;
};

export default function Dashboard() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params?.workspaceId || "";

  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [busy, setBusy] = useState(false);
  const [togglingMonitorId, setTogglingMonitorId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const [monitorRes, analyticsRes] = await Promise.all([
        monitorApi.list(workspaceId),
        dashboardApi.analytics(workspaceId, timeRange)
      ]);

      setMonitors(monitorRes.monitors);
      setAnalytics(analyticsRes);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load dashboard telemetry");
    }
  }, [workspaceId, timeRange]);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => {
      void loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const checksInRange = useMemo(() => analytics?.recentChecks ?? [], [analytics]);
  const queueStats = analytics?.queue;

  const openIncidentsCount = analytics?.summary.openIncidents ?? 0;
  const healthyCount = analytics?.monitorCoverage.optimal ?? 0;
  const avgMs = analytics?.summary.avgLatencyMs ?? 0;
  const p50 = analytics?.summary.p50LatencyMs ?? 0;
  const p95 = analytics?.summary.p95LatencyMs ?? 0;
  const p99 = analytics?.summary.p99LatencyMs ?? 0;
  const mttrMinutes = analytics?.summary.mttrMinutes ?? 0;
  const mttdMinutes = analytics?.summary.mttdMinutes ?? 0;
  const burnRatePct = analytics?.summary.burnRatePercent ?? 0;

  const latencySeries = useMemo(
    () =>
      checksInRange
        .slice(0, 40)
        .reverse()
        .map((c) => ({
          time: new Date(c.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          ms: c.responseTimeMs ?? 0,
          err: c.isUp ? 0 : 1
        })),
    [checksInRange]
  );

  const errorBreakdown: ErrorSlice[] = useMemo(() => {
    const slices = analytics?.errorBreakdown ?? [];
    return slices.slice(0, 5).map((entry, idx) => ({
      name: entry.errorType,
      value: entry.percentage,
      color: errorColors[idx % errorColors.length]
    }));
  }, [analytics]);

  const alertDelivery = analytics?.alertDelivery ?? {
    EMAIL: { sent: 0, failed: 0 },
    SLACK: { sent: 0, failed: 0 }
  };

  const flappingIds = analytics?.flappingMonitorIds ?? [];

  const riskyNodes = useMemo(() => {
    const needsAttention = analytics?.needsAttention ?? [];
    const monitorById = new Map(monitors.map((m) => [m.id, m]));
    return needsAttention
      .map((item) => monitorById.get(item.monitorId))
      .filter((m): m is Monitor => Boolean(m));
  }, [analytics, monitors]);

  const uptimeFor = useCallback(
    (monitorId: string, days: 1 | 7 | 30) => {
      const item = analytics?.uptimeByMonitor.find((u) => u.monitorId === monitorId);
      if (!item) return "--";

      const value = days === 1 ? item.uptime24h : days === 7 ? item.uptime7d : item.uptime30d;
      if (value === null) return "--";
      return value.toFixed(1);
    },
    [analytics]
  );

  const filteredMonitors = useMemo(() => {
    return monitors.filter((m) => {
      const matchesQuery = m.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesQuery) return false;
      if (statusFilter === "ALL") return true;
      return statusOfMonitor(m) === statusFilter;
    });
  }, [monitors, searchQuery, statusFilter]);

  const runChecks = async () => {
    setBusy(true);
    try {
      const result = await adminApi.runChecks({ workspaceId });
      toast.success(`Pipeline engaged: ${result.enqueued} checks queued`);
      await loadData();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to engage pipeline");
    } finally {
      setBusy(false);
    }
  };

  const toggleMonitorPause = async (monitor: Monitor) => {
    setTogglingMonitorId(monitor.id);
    try {
      const updated = await monitorApi.update(workspaceId, monitor.id, { isPaused: !monitor.isPaused });
      setMonitors((prev) => prev.map((m) => (m.id === monitor.id ? updated.monitor : m)));
      toast.success(updated.monitor.isPaused ? `${updated.monitor.name} suspended` : `${updated.monitor.name} resumed`);
      await loadData();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update monitor state");
    } finally {
      setTogglingMonitorId(null);
    }
  };

  return (
    <main className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto w-full pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_var(--color-primary)]" />
            <h1 className="text-2xl font-display font-bold tracking-tighter text-foreground uppercase">Pulse_Ops Terminal</h1>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/40">
            Workspace: {workspaceId} | Interval: {timeRange}
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex border border-white/10 bg-white/5 p-1 rounded-none">
            {(["1h", "24h", "7d", "30d"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-widest transition-colors ${
                  timeRange === r ? "bg-primary text-background font-bold" : "text-foreground/40 hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={runChecks}
              disabled={busy}
              variant="outline"
              size="sm"
              className="font-mono text-[9px] uppercase tracking-widest h-9 border-white/10 hover:bg-primary hover:text-background hover:border-primary transition-all"
            >
              <Zap className={`h-3 w-3 mr-2 ${busy ? "animate-spin" : ""}`} /> Engage_Pipeline
            </Button>
            <Button asChild variant="outline" size="sm" className="font-mono text-[9px] uppercase tracking-widest h-9 border-white/10 hover:bg-white/5">
              <Link href={`/w/${workspaceId}/incidents`}>
                <AlertTriangle className="h-3 w-3 mr-2" /> View_Anomalies
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-background font-bold font-mono text-[9px] uppercase tracking-widest h-9 rounded-none">
              <Link href={`/w/${workspaceId}/monitors/new`}>
                <Plus className="h-3 w-3 mr-2" /> Deploy_Node
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="Active_Nodes" value={analytics?.summary.totalMonitors ?? 0} sub={`${healthyCount} Nominal`} Icon={Activity} />
        <StatCard label="Active_Anomalies" value={openIncidentsCount} sub={openIncidentsCount > 0 ? "High Priority" : "Nominal"} Icon={Flame} highlight={openIncidentsCount > 0} />
        <StatCard label="MTTR_Global" value={mttrMinutes ? `${mttrMinutes}m` : "--"} sub="Resolution" Icon={History} />
        <StatCard label="MTTD_Global" value={mttdMinutes ? `${mttdMinutes}m` : "--"} sub="Detection" Icon={Zap} />
        <StatCard label="Avg_Latency" value={`${avgMs}ms`} sub={`p99: ${p99}ms`} Icon={TrendingDown} />
        <StatCard label="SLO_Health" value={`${(analytics?.summary.sloHealthPercent ?? 100).toFixed(1)}%`} sub={`Burn: ${burnRatePct.toFixed(1)}%`} Icon={ShieldCheck} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-8">
          <Card className="bg-black/40 backdrop-blur-xl border-white/10 h-full overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-transparent" />
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
              <div>
                <CardTitle className="text-xs uppercase font-mono tracking-widest flex items-center gap-2">
                  <LayoutDashboard className="h-3 w-3 text-primary" /> Latency_Distribution_Stream
                </CardTitle>
                <CardDescription className="text-[9px] font-mono text-foreground/40 mt-1 uppercase">
                  Aggregated Telemetry | T-Interval: {timeRange}
                </CardDescription>
              </div>
              <div className="flex gap-6 font-mono text-[9px] uppercase tracking-widest text-foreground/40">
                <div className="text-right">
                  <div>p50</div>
                  <div className="text-primary font-bold">{p50}ms</div>
                </div>
                <div className="text-right">
                  <div>p95</div>
                  <div className="text-emerald-400 font-bold">{p95}ms</div>
                </div>
                <div className="text-right">
                  <div>p99</div>
                  <div className="text-indigo-400 font-bold">{p99}ms</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[350px] pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencySeries.length ? latencySeries : [{ time: "--:--", ms: 0, err: 0 }]}>
                  <defs>
                    <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.5} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} fontFamily="monospace" />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}ms`} fontFamily="monospace" />
                  <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #1e293b", borderRadius: "0", fontSize: "10px", fontFamily: "monospace" }} />
                  <Area type="monotone" dataKey="ms" stroke="#10b981" fill="url(#latencyGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-4 space-y-6">
          <Card className="bg-black/40 backdrop-blur-xl border-white/10 overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase font-mono tracking-widest flex items-center gap-2">
                <Database className="h-3 w-3 text-indigo-400" /> Pipeline_Engine
              </CardTitle>
              <div className="text-[10px] font-mono text-primary animate-pulse">LIVE</div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <QueueMetric label="Active" value={queueStats?.active ?? 0} color="text-primary" />
                <QueueMetric label="Waiting" value={queueStats?.waiting ?? 0} color="text-indigo-400" />
                <QueueMetric label="Delayed" value={queueStats?.delayed ?? 0} color="text-amber-400" />
                <QueueMetric label="Failed" value={queueStats?.failed ?? 0} color="text-red-500" />
              </div>

              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/40">Node_Coverage</p>
                  <p className="text-[9px] font-mono text-primary uppercase">
                    {analytics?.summary.totalMonitors ? Math.round(((analytics?.monitorCoverage.optimal ?? 0) / analytics.summary.totalMonitors) * 100) : 0}% Nominal
                  </p>
                </div>
                <div className="h-1.5 w-full bg-white/5 overflow-hidden flex">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${analytics?.summary.totalMonitors ? ((analytics?.monitorCoverage.optimal ?? 0) / analytics.summary.totalMonitors) * 100 : 0}%`
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[8px] font-mono uppercase tracking-widest text-foreground/40">
                  <div>Optimal: {analytics?.monitorCoverage.optimal ?? 0}</div>
                  <div>Paused: {analytics?.monitorCoverage.paused ?? 0}</div>
                  <div>Fault: {analytics?.monitorCoverage.fault ?? 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-xs uppercase font-mono tracking-widest flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-red-500" /> Fault_Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex items-center justify-between">
              <div className="space-y-3">
                {errorBreakdown.map((err) => (
                  <div key={err.name} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: err.color }} />
                    <span className="text-[9px] font-mono text-foreground/60 uppercase">{err.name}</span>
                    <span className="text-[9px] font-mono font-bold text-foreground">{err.value}%</span>
                  </div>
                ))}
                {!errorBreakdown.length ? <div className="text-[9px] font-mono text-foreground/40 uppercase">No faults in range</div> : null}
              </div>
              <div className="h-24 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={errorBreakdown.length ? errorBreakdown : [{ name: "NONE", value: 100, color: "#1f2937" }]} innerRadius={30} outerRadius={45} paddingAngle={5} dataKey="value">
                      {(errorBreakdown.length ? errorBreakdown : [{ name: "NONE", value: 100, color: "#1f2937" }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-7">
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase font-mono tracking-widest flex items-center gap-2">
                <Terminal className="h-3 w-3 text-primary" /> Live_Checks_Stream
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[8px] border-white/10 uppercase tracking-tighter">Real-time Ingest</Badge>
            </CardHeader>
            <CardContent className="pt-0 px-0">
              <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto scrollbar-hide">
                {checksInRange.slice(0, 80).map((check) => (
                  <div key={check.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`h-1.5 w-1.5 rounded-full ${check.isUp ? "bg-primary shadow-[0_0_5px_var(--color-primary)]" : "bg-red-500 animate-pulse"}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-foreground/90 uppercase tracking-tight">
                            {monitors.find((m) => m.id === check.monitorId)?.name || "UNKNOWN_NODE"}
                          </span>
                          <span className="text-[9px] font-mono text-foreground/40">{formatDateTime(check.checkedAt)}</span>
                        </div>
                        <p className="text-[10px] font-mono text-foreground/50 mt-0.5">
                          STAT: <span className={check.isUp ? "text-primary" : "text-red-500"}>{check.statusCode ?? "FAIL"}</span> | LATENCY: <span className="text-foreground/80">{check.responseTimeMs ?? "--"}ms</span>
                        </p>
                      </div>
                    </div>
                    {!check.isUp && (
                      <span className="text-[8px] font-mono text-red-500 uppercase border border-red-500/20 px-1.5 py-0.5 bg-red-500/5">{check.errorType ?? "ERROR"}</span>
                    )}
                  </div>
                ))}
                {!checksInRange.length ? <div className="p-12 text-center text-[10px] font-mono uppercase text-foreground/30">Awaiting stream packets...</div> : null}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-5 space-y-6">
          <Card className="bg-red-500/5 border-red-500/20 backdrop-blur-xl relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 p-4 opacity-10"><AlertTriangle className="h-12 w-12 text-red-500" /></div>
            <CardHeader className="border-b border-red-500/10">
              <CardTitle className="text-xs uppercase font-mono tracking-widest flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-3 w-3" /> Needs_Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {riskyNodes.map((m) => (
                <div key={m.id} className="p-4 border border-white/5 bg-white/5 hover:border-red-500/30 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs font-display font-bold uppercase tracking-widest text-foreground">{m.name}</span>
                    </div>
                    {flappingIds.includes(m.id) ? <Badge variant="destructive" className="text-[8px] uppercase">Flapping</Badge> : null}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono text-foreground/40 truncate max-w-[200px]">{m.url}</p>
                    <Link href={`/w/${workspaceId}/monitors/${m.id}`} className="text-[9px] font-mono text-primary uppercase flex items-center gap-1 hover:underline">
                      Inspect <ArrowUpRight className="h-2 w-2" />
                    </Link>
                  </div>
                </div>
              ))}
              {!riskyNodes.length ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-3 opacity-20" />
                  <p className="text-[10px] font-mono uppercase text-foreground/30">All operational parameters within range</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-xs uppercase font-mono tracking-widest flex items-center gap-2">
                <Webhook className="h-3 w-3 text-indigo-400" /> Dispatch_Health
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-[9px] font-mono uppercase">
                <div className="p-3 border border-white/10 bg-white/5">
                  <div className="text-foreground/40">Email Sent</div>
                  <div className="text-primary text-lg">{alertDelivery.EMAIL.sent}</div>
                </div>
                <div className="p-3 border border-white/10 bg-white/5">
                  <div className="text-foreground/40">Email Failed</div>
                  <div className="text-red-500 text-lg">{alertDelivery.EMAIL.failed}</div>
                </div>
                <div className="p-3 border border-white/10 bg-white/5">
                  <div className="text-foreground/40">Slack Sent</div>
                  <div className="text-primary text-lg">{alertDelivery.SLACK.sent}</div>
                </div>
                <div className="p-3 border border-white/10 bg-white/5">
                  <div className="text-foreground/40">Slack Failed</div>
                  <div className="text-red-500 text-lg">{alertDelivery.SLACK.failed}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-display font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-primary" /> Node_Directory_Inventory
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground/40" />
              <input
                type="text"
                placeholder="EXECUTE_QUERY..."
                className="h-9 w-full bg-white/5 border border-white/10 pl-9 pr-4 text-xs font-mono text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-foreground/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-9 bg-white/5 border border-white/10 px-3 text-[10px] font-mono uppercase tracking-widest text-foreground"
            >
              <option value="ALL">ALL</option>
              <option value="OPTIMAL">OPTIMAL</option>
              <option value="FAULT">FAULT</option>
              <option value="PAUSED">PAUSED</option>
            </select>
            <Button variant="outline" size="icon" className="h-9 w-9 border-white/10 bg-white/5 hover:bg-white/10 rounded-none">
              <Filter className="h-4 w-4 text-foreground/60" />
            </Button>
          </div>
        </div>

        <div className="border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden glass group/table">
          <table className="w-full text-left font-mono">
            <thead className="bg-white/5 text-foreground/50 text-[10px] uppercase tracking-widest border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-normal">UID</th>
                <th className="px-6 py-4 font-normal">Ident_Target</th>
                <th className="px-6 py-4 font-normal">State_Vector</th>
                <th className="px-6 py-4 font-normal text-center">Uptime_Metric (24H/7D/30D)</th>
                <th className="px-6 py-4 font-normal">Latency_ms</th>
                <th className="px-6 py-4 text-right font-normal">Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px]">
              {filteredMonitors.map((m) => (
                <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 text-foreground/30">0x{m.id.slice(0, 4)}</td>
                  <td className="px-6 py-4">
                    <Link href={`/w/${workspaceId}/monitors/${m.id}`} className="group/link">
                      <span className="font-bold text-foreground group-hover/link:text-primary transition-colors uppercase tracking-tight">{m.name}</span>
                      <p className="text-[9px] text-foreground/40 mt-0.5 truncate max-w-[180px]">{m.url}</p>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {statusOfMonitor(m) === "PAUSED" ? (
                      <Badge variant="outline" className="border-white/10 text-foreground/40 rounded-none text-[8px] py-0">SUSPENDED</Badge>
                    ) : statusOfMonitor(m) === "FAULT" ? (
                      <Badge variant="destructive" className="animate-pulse rounded-none text-[8px] py-0">FAULT_DETECT</Badge>
                    ) : (
                      <Badge variant="success" className="rounded-none text-[8px] py-0">OPTIMAL</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <UptimeChip value={uptimeFor(m.id, 1)} />
                      <UptimeChip value={uptimeFor(m.id, 7)} />
                      <UptimeChip value={uptimeFor(m.id, 30)} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-foreground/70 font-bold">{m.timeoutMs}ms</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" asChild className="h-7 w-7 text-foreground/40 hover:text-primary border border-transparent hover:border-primary/20">
                        <Link href={`/w/${workspaceId}/monitors/${m.id}`}>
                          <Settings className="h-3 w-3" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={togglingMonitorId === m.id}
                        className="h-7 w-7 text-foreground/40 hover:text-red-500 border border-transparent hover:border-red-500/20"
                        onClick={() => void toggleMonitorPause(m)}
                      >
                        {m.isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredMonitors.length ? (
                <tr>
                  <td className="px-6 py-12 text-center text-[10px] uppercase tracking-widest text-foreground/30" colSpan={6}>
                    No infrastructure nodes matching query.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </motion.div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 border border-white/10 glass shadow-2xl">
        <QuickDockBtn Icon={Activity} label="Nodes" href={`/w/${workspaceId}/monitors`} />
        <QuickDockBtn Icon={AlertTriangle} label="Incidents" href={`/w/${workspaceId}/incidents`} highlight />
        <QuickDockBtn Icon={BellRing} label="Alerts" href={`/w/${workspaceId}/settings/alerts`} />
        <QuickDockBtn Icon={Users} label="Dispatch" href={`/w/${workspaceId}/notifications`} />
      </div>
    </main>
  );
}

function StatCard({ label, value, sub, Icon, highlight = false }: { label: string; value: string | number; sub: string; Icon: LucideIcon; highlight?: boolean }) {
  return (
    <Card className={`bg-black/40 backdrop-blur-xl border-white/10 relative overflow-hidden group hover:border-primary/30 transition-all ${highlight ? "border-red-500/30" : ""}`}>
      <CardHeader className="p-4 pb-2 border-none flex flex-row items-center justify-between">
        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/40 group-hover:text-foreground/60">{label}</span>
        <div className="h-6 w-6 border border-white/5 flex items-center justify-center text-xs group-hover:border-primary/20 transition-colors">
          <Icon className={`h-3 w-3 ${highlight ? "text-red-500" : "text-primary/50"}`} />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className={`text-2xl font-display font-bold ${highlight ? "text-red-500" : "text-foreground"}`}>{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[8px] font-mono uppercase tracking-widest text-foreground/30">{sub}</span>
        </div>
      </CardContent>
      {highlight ? <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 blur-2xl" /> : null}
    </Card>
  );
}

function QueueMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 bg-white/5 border border-white/5 group hover:border-white/10 transition-colors">
      <p className="text-[8px] font-mono text-foreground/40 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-display font-bold ${color}`}>{value}</p>
    </div>
  );
}

function UptimeChip({ value }: { value: string }) {
  if (value === "--") {
    return <div className="px-1 py-0.5 border text-[8px] font-mono bg-white/[0.02] border-white/10 text-foreground/40">--</div>;
  }

  const num = parseFloat(value);
  const color = num >= 99.9 ? "text-primary border-primary/20" : num >= 99 ? "text-emerald-400 border-emerald-400/20" : "text-amber-400 border-amber-400/20";
  return (
    <div className={`px-1 py-0.5 border text-[8px] font-mono bg-white/[0.02] ${color}`}>
      {value}%
    </div>
  );
}

function QuickDockBtn({ Icon, label, href, highlight = false }: { Icon: LucideIcon; label: string; href: string; highlight?: boolean }) {
  return (
    <Button asChild variant="ghost" className={`h-10 px-4 rounded-none font-mono text-[9px] uppercase tracking-widest gap-2 hover:bg-white/5 ${highlight ? "text-red-400" : "text-foreground/60 hover:text-primary"}`}>
      <Link href={href}>
        <Icon className="h-3 w-3" />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    </Button>
  );
}
