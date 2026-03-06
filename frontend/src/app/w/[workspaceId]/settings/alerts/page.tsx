"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { alertsApi, ApiError } from "@/lib/api";
import { motion } from "framer-motion";
import { BellRing, Save, Webhook } from "lucide-react";

export default function AlertsSettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void alertsApi
      .get(workspaceId)
      .then(({ alerts }) => {
        setSlackEnabled(alerts.slackEnabled);
        setSlackWebhookUrl(alerts.slackWebhookUrl ?? "");
      })
      .catch((error: unknown) => toast.error(error instanceof ApiError ? error.message : "Failed to synchronize configuration"));
  }, [workspaceId]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await alertsApi.update(workspaceId, {
        slackEnabled,
        slackWebhookUrl: slackWebhookUrl.trim() ? slackWebhookUrl.trim() : null
      });
      toast.success("Notification pipeline configured");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Configuration sync failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 space-y-8 p-8 max-w-4xl mx-auto w-full">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground uppercase flex items-center gap-3">
          <BellRing className="h-6 w-6 text-primary" />
          Notification Pipeline
        </h1>
        <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mt-1">Configure external alert routing</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-black/40 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="border-b border-white/5 relative z-10">
            <CardTitle className="text-sm uppercase tracking-widest font-mono flex items-center gap-2">
              <Webhook className="h-4 w-4 text-indigo-400" /> Slack Integration
            </CardTitle>
            <CardDescription className="font-mono text-[10px] uppercase tracking-widest text-foreground/40">
              Route critical anomalies to Slack channels via Incoming Webhooks
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 relative z-10">
            <form className="space-y-6" onSubmit={onSubmit}>
              
              <div className="flex items-center gap-3 p-4 border border-white/10 bg-white/5">
                <input 
                  checked={slackEnabled} 
                  onChange={(e) => setSlackEnabled(e.target.checked)} 
                  type="checkbox" 
                  className="w-4 h-4 bg-black/50 border-white/20 text-primary focus:ring-primary focus:ring-offset-0 rounded-none cursor-pointer"
                  id="slack-toggle"
                />
                <label htmlFor="slack-toggle" className="text-xs font-mono uppercase tracking-widest text-foreground/90 cursor-pointer">
                  Enable Slack Routing
                </label>
              </div>

              <div className={`space-y-3 transition-opacity ${!slackEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/70">Webhook URI</label>
                <Input
                  placeholder="https://example.com/your-slack-webhook"
                  type="url"
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  className="font-mono text-xs"
                  disabled={!slackEnabled}
                />
              </div>
              
              <div className="pt-4 border-t border-white/5">
                <Button disabled={loading} type="submit" className="bg-primary text-background hover:bg-primary/90 rounded-none font-mono text-[10px] uppercase tracking-widest gap-2">
                  <Save className="h-4 w-4" /> {loading ? "Synchronizing..." : "Apply Configuration"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
