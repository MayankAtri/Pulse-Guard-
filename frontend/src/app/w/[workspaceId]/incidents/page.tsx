"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Filter, MoreVertical, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ApiError, incidentApi } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/format";
import { Incident } from "@/lib/types";

export default function IncidentsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params?.workspaceId || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    void incidentApi
      .list(workspaceId)
      .then((data) => setIncidents(data.incidents))
      .catch((error: unknown) => toast.error(error instanceof ApiError ? error.message : "Failed to query incidents"));
  }, [workspaceId]);

  const filtered = useMemo(
    () => incidents.filter((inc) => inc.monitor.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [incidents, searchQuery]
  );

  return (
    <main className="flex-1 space-y-8 p-8 max-w-7xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground uppercase flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
            Anomalies
          </h1>
          <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mt-1">Incident reports & downtime events</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground/40" />
            <input
              type="text"
              placeholder="QUERY LOGS..."
              className="h-9 w-full bg-white/5 border border-white/10 pl-9 pr-4 text-xs font-mono text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-foreground/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2 shrink-0 font-mono text-[10px] uppercase tracking-widest border-white/10 hover:bg-white/5 rounded-none">
            <Filter className="h-3 w-3" /> Filters
          </Button>
        </div>

        <div className="border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden glass">
          <table className="w-full text-left font-mono">
            <thead className="bg-white/5 text-foreground/50 text-[10px] uppercase tracking-widest border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-normal">Target</th>
                <th className="px-6 py-4 font-normal">Status</th>
                <th className="px-6 py-4 font-normal">T-Zero</th>
                <th className="px-6 py-4 font-normal">Delta T</th>
                <th className="px-6 py-4 font-normal">Trace</th>
                <th className="px-6 py-4 text-right font-normal">CMD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filtered.map((incident) => (
                <tr key={incident.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">{incident.monitor.name}</span>
                      <span className="text-[10px] text-foreground/40 mt-1">{incident.monitor.url}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {incident.status === "OPEN" ? (
                      <Badge variant="destructive" className="animate-pulse">
                        <AlertCircle className="w-3 h-3 mr-1" /> CRITICAL
                      </Badge>
                    ) : (
                      <Badge variant="success">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> RESOLVED
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-foreground/70 text-[10px]">{formatDateTime(incident.startedAt)}</td>
                  <td className="px-6 py-4 text-foreground/70 flex items-center gap-2 mt-2">
                    <Clock className="h-3 w-3 text-foreground/40" /> {formatDuration(incident.durationSeconds)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-red-400 font-mono text-[10px] bg-red-500/10 border border-red-500/20 px-2 py-1 inline-block">
                      {incident.failureReason}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-foreground/40 hover:text-primary hover:bg-primary/10 rounded-none">
                      <Link href={`/w/${workspaceId}/incidents/${incident.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td className="px-6 py-8 text-center text-foreground/40 font-mono text-xs uppercase tracking-widest" colSpan={6}>
                    No anomaly records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </motion.div>
    </main>
  );
}
