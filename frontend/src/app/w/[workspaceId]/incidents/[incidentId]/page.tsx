"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApiError, incidentApi } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/format";
import { IncidentDetail } from "@/lib/types";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Terminal, Clock, Activity, Settings2 } from "lucide-react";

export default function IncidentDetailPage() {
  const params = useParams<{ workspaceId: string; incidentId: string }>();
  const workspaceId = params.workspaceId;
  const incidentId = params.incidentId;

  const [incident, setIncident] = useState<IncidentDetail | null>(null);

  useEffect(() => {
    void incidentApi
      .get(workspaceId, incidentId)
      .then((data) => setIncident(data.incident))
      .catch((error: unknown) => toast.error(error instanceof ApiError ? error.message : "Failed to query anomaly data"));
  }, [workspaceId, incidentId]);

  return (
    <main className="flex-1 space-y-8 p-8 max-w-7xl mx-auto w-full">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="text-foreground/50 hover:text-primary rounded-none border border-transparent hover:border-primary/30 hover:bg-primary/5">
            <Link href={`/w/${workspaceId}/incidents`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground uppercase flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              Anomaly Report
            </h1>
            <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mt-1">
              ID: {incidentId}
            </p>
          </div>
        </div>
      </motion.div>

      {incident ? (
        <div className="grid gap-6 md:grid-cols-12">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-5"
          >
            <Card className="bg-black/40 backdrop-blur-md h-full relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-64 h-64 blur-[80px] -translate-y-1/2 -translate-x-1/2 ${incident.status === 'OPEN' ? 'bg-red-500/10' : 'bg-primary/5'}`} />
              <CardHeader className="border-b border-white/5 relative z-10">
                <CardTitle className="text-sm uppercase tracking-widest font-mono flex items-center gap-2">
                  <Terminal className="h-4 w-4" /> Diagnostic Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 relative z-10 space-y-6">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 mb-1">Target Node</p>
                  <p className="font-display font-bold text-lg text-foreground uppercase tracking-tight">{incident.monitor.name}</p>
                </div>
                
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 mb-1">Fault Signature</p>
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs px-3 py-2 inline-block">
                    {incident.failureReason}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> T-Zero
                    </p>
                    <p className="font-mono text-xs text-foreground/80">{formatDateTime(incident.startedAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 mb-1 flex items-center gap-1">
                      <Activity className="h-3 w-3" /> Delta T
                    </p>
                    <p className="font-mono text-xs text-foreground/80">{formatDuration(incident.durationSeconds)}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <Badge variant={incident.status === "OPEN" ? "destructive" : "success"} className={incident.status === "OPEN" ? "animate-pulse" : ""}>
                    {incident.status === "OPEN" ? "CRITICAL" : "RESOLVED"}
                  </Badge>
                  <Button variant="ghost" asChild className="font-mono text-[10px] uppercase tracking-widest border border-white/10 hover:bg-white/5 rounded-none">
                    <Link href={`/w/${workspaceId}/monitors/${incident.monitorId}`}>
                      Inspect Node
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-7"
          >
            <Card className="bg-black/40 backdrop-blur-md h-full">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-sm uppercase tracking-widest font-mono flex items-center gap-2">
                  <Settings2 className="h-4 w-4" /> Event Trace
                </CardTitle>
                <CardDescription className="text-[10px] font-mono">Chronological fault progression</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 px-0">
                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto hide-scrollbar">
                  {incident.events.map((event, i) => (
                    <div className="p-6 hover:bg-white/5 transition-colors group flex gap-4" key={event.id}>
                      <div className="flex flex-col items-center">
                        <div className={`h-2 w-2 rounded-full mt-1.5 ${i === 0 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : i === incident.events.length - 1 && incident.status !== 'OPEN' ? 'bg-primary shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-foreground/40'}`} />
                        {i !== incident.events.length - 1 && <div className="w-px h-full bg-white/10 mt-2" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-xs font-bold uppercase tracking-wider leading-none ${i === 0 ? 'text-red-500' : 'text-foreground'}`}>
                            {event.type}
                          </p>
                          <p className="text-[10px] font-mono text-foreground/40">{formatDateTime(event.createdAt)}</p>
                        </div>
                        <p className="text-[11px] font-mono text-foreground/60 leading-relaxed bg-white/5 p-2 border border-white/5 inline-block mt-2">
                          {event.details ?? "NO_TRACE_DATA"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : (
        <Card className="bg-black/40 backdrop-blur-md border border-white/10">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="h-8 w-8 border border-white/20 rounded-full border-t-primary animate-spin mb-4" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">Querying Anomaly Data...</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
