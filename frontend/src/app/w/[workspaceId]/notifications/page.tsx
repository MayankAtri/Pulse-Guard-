"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, notificationApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Notification } from "@/lib/types";
import { motion } from "framer-motion";
import { BellRing, ExternalLink } from "lucide-react";

export default function NotificationsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    void notificationApi
      .list(workspaceId)
      .then((data) => setNotifications(data.notifications))
      .catch((error: unknown) => toast.error(error instanceof ApiError ? error.message : "Failed to load notification log"));
  }, [workspaceId]);

  return (
    <main className="flex-1 space-y-8 p-8 max-w-4xl mx-auto w-full">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground uppercase flex items-center gap-3">
          <BellRing className="h-6 w-6 text-primary" />
          Event Dispatch Log
        </h1>
        <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mt-1">Audit trail for automated communications</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-black/40 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="border-b border-white/5 relative z-10">
            <CardTitle className="text-sm uppercase tracking-widest font-mono">Transmission History</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0 relative z-10">
            <div className="divide-y divide-white/5">
              {notifications.map((n) => (
                <div className="p-6 hover:bg-white/5 transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-4" key={n.id}>
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Badge variant={n.status === "SENT" ? "success" : "destructive"}>{n.status}</Badge>
                      <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">{n.channel}</Badge>
                      <Badge variant="secondary" className="bg-white/5">{n.type}</Badge>
                    </div>
                    <div className="flex gap-4 text-[10px] font-mono uppercase tracking-widest text-foreground/40">
                      <span>INIT: {formatDateTime(n.createdAt)}</span>
                      {n.sentAt && <span>TX: {formatDateTime(n.sentAt)}</span>}
                    </div>
                    {n.error && (
                      <div className="mt-2 text-red-400 font-mono text-[10px] bg-red-500/10 border border-red-500/20 px-2 py-1 inline-block">
                        ERR: {n.error}
                      </div>
                    )}
                  </div>
                  
                  <Link href={`/w/${workspaceId}/incidents/${n.incidentId}`} className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-primary hover:text-primary/80 transition-colors shrink-0 p-2 border border-white/5 rounded-none glass group-hover:border-primary/30">
                    Trace Anomaly <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              ))}
              {!notifications.length && (
                <div className="p-8 text-center text-foreground/40 font-mono text-xs uppercase tracking-widest">
                  No transmission records found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
