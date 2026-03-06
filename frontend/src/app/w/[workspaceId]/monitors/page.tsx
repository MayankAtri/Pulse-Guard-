"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Pause, Play, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ApiError, monitorApi } from "@/lib/api";
import { Monitor } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export default function MonitorsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  const [query, setQuery] = useState("");
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadMonitors = useCallback(async () => {
    try {
      const data = await monitorApi.list(workspaceId);
      setMonitors(data.monitors);
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load nodes");
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadMonitors();
  }, [loadMonitors]);

  const toggleMonitor = async (monitor: Monitor) => {
    setTogglingId(monitor.id);
    try {
      const updated = await monitorApi.update(workspaceId, monitor.id, { isPaused: !monitor.isPaused });
      setMonitors((prev) => prev.map((m) => (m.id === monitor.id ? updated.monitor : m)));
      toast.success(updated.monitor.isPaused ? "Node halted" : "Node resumed");
      await loadMonitors();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : "Failed to change node state");
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = useMemo(() => monitors.filter((m) => m.name.toLowerCase().includes(query.toLowerCase())), [monitors, query]);

  return (
    <main className="flex-1 space-y-8 p-8 max-w-7xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground uppercase">Nodes</h1>
          <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mt-1">All monitoring targets in this workspace</p>
        </div>
        <Button asChild className="font-mono text-[10px] uppercase tracking-widest rounded-none">
          <Link href={`/w/${workspaceId}/monitors/new`}>
            <Plus className="h-4 w-4 mr-2" /> Deploy Node
          </Link>
        </Button>
      </motion.div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="QUERY NODES..."
          className="h-9 w-full bg-white/5 border border-white/10 pl-9 pr-4 text-xs font-mono text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-foreground/30"
        />
      </div>

      <div className="border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden glass">
        <table className="w-full text-left font-mono">
          <thead className="bg-white/5 text-foreground/50 text-[10px] uppercase tracking-widest border-b border-white/10">
            <tr>
              <th className="px-6 py-4 font-normal">Name</th>
              <th className="px-6 py-4 font-normal">Endpoint</th>
              <th className="px-6 py-4 font-normal">Status</th>
              <th className="px-6 py-4 font-normal">Last Sync</th>
              <th className="px-6 py-4 font-normal text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {filtered.map((monitor) => (
              <tr key={monitor.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <Link href={`/w/${workspaceId}/monitors/${monitor.id}`} className="font-bold text-foreground hover:text-primary uppercase tracking-tight">
                    {monitor.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-foreground/70">{monitor.url}</td>
                <td className="px-6 py-4">
                  {monitor.isPaused ? <Badge variant="outline">HALTED</Badge> : monitor.lastStateUp === false ? <Badge variant="destructive">FAULT</Badge> : <Badge variant="success">OPTIMAL</Badge>}
                </td>
                <td className="px-6 py-4 text-foreground/50">{formatDateTime(monitor.updatedAt)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm" className="font-mono text-[10px] uppercase tracking-widest rounded-none border border-white/10">
                      <Link href={`/w/${workspaceId}/monitors/${monitor.id}`}>Details</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={togglingId === monitor.id}
                      onClick={() => void toggleMonitor(monitor)}
                      className="font-mono text-[10px] uppercase tracking-widest rounded-none"
                    >
                      {monitor.isPaused ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                      {monitor.isPaused ? "Start" : "Stop"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td className="px-6 py-8 text-center text-foreground/40 font-mono text-xs uppercase tracking-widest" colSpan={5}>
                  No nodes found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
