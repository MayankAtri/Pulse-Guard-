"use client"

import React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Server, Activity } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { motion } from "framer-motion"
import { ApiError, monitorApi } from "@/lib/api"

export default function CreateMonitorPage() {
  const params = useParams<{ workspaceId: string }>()
  const workspaceId = params?.workspaceId || ""
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [url, setUrl] = React.useState("")
  const [expectedStatus, setExpectedStatus] = React.useState(200)
  const [timeoutMs, setTimeoutMs] = React.useState(5000)
  const [intervalSeconds, setIntervalSeconds] = React.useState(60)
  const [expectedKeyword, setExpectedKeyword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await monitorApi.create(workspaceId, {
        name,
        url,
        expectedStatus,
        timeoutMs,
        intervalSeconds,
        expectedKeyword: expectedKeyword.trim() || undefined
      })
      toast.success("Node initialized successfully")
      router.push(`/w/${workspaceId}/monitors/${res.monitor.id}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to initialize node")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 space-y-8 p-8 max-w-4xl mx-auto w-full">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" asChild className="text-foreground/50 hover:text-primary rounded-none border border-transparent hover:border-primary/30 hover:bg-primary/5">
          <Link href={`/w/${workspaceId}/dashboard`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground uppercase flex items-center gap-3">
            <Server className="h-6 w-6 text-primary" />
            Deploy Node
          </h1>
          <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mt-1">Configure target endpoint</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <form onSubmit={onSubmit}>
          <Card className="bg-black/40 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="border-b border-white/5 relative z-10">
              <CardTitle className="font-display uppercase tracking-widest text-lg">Target Configuration</CardTitle>
              <CardDescription className="font-mono text-[10px] uppercase tracking-widest text-foreground/40">Provide node coordinates and polling interval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 relative z-10">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3 sm:col-span-2">
                  <Label htmlFor="name">Node Designation</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CORE_API_PROD" className="font-mono" required />
                </div>
                
                <div className="space-y-3 sm:col-span-2">
                  <Label htmlFor="url">Endpoint URI</Label>
                  <Input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.system.internal/health" className="font-mono" required />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="expectedStatus">Expected Status Code</Label>
                  <Input id="expectedStatus" type="number" value={expectedStatus} onChange={(e) => setExpectedStatus(Number(e.target.value))} min={100} max={599} className="font-mono" required />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="timeoutMs">Timeout Threshold (ms)</Label>
                  <Input id="timeoutMs" type="number" value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} min={100} max={30000} className="font-mono" required />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="intervalSeconds">Check Interval (seconds)</Label>
                  <Input
                    id="intervalSeconds"
                    type="number"
                    value={intervalSeconds}
                    onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                    min={10}
                    max={86400}
                    className="font-mono"
                    required
                  />
                </div>

                <div className="space-y-3 sm:col-span-2">
                  <Label htmlFor="expectedKeyword">Payload Assertion (Optional)</Label>
                  <Input id="expectedKeyword" value={expectedKeyword} onChange={(e) => setExpectedKeyword(e.target.value)} placeholder="e.g. 'operational' or 'active'" className="font-mono" />
                  <p className="text-[10px] font-mono text-foreground/40 uppercase tracking-widest">Execute regex validation on response body.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-4 border-t border-white/5 bg-white/[0.02] p-6 relative z-10">
              <Button variant="ghost" asChild className="font-mono text-xs uppercase tracking-widest border border-white/10 hover:bg-white/5 rounded-none">
                <Link href={`/w/${workspaceId}/dashboard`}>Abort</Link>
              </Button>
              <Button disabled={loading} type="submit" className="bg-primary hover:bg-primary/90 text-background font-bold font-mono text-xs uppercase tracking-widest gap-2 rounded-none relative group overflow-hidden border-transparent">
                <span className="relative z-10 flex items-center gap-2"><Activity className="h-4 w-4" /> {loading ? "Initializing..." : "Initialize"}</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Button>
            </CardFooter>
          </Card>
        </form>
      </motion.div>
    </main>
  )
}
