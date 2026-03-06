"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { 
  Activity, 
  ArrowRight, 
  BarChart3, 
  BellRing, 
  ShieldCheck, 
  Terminal,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PulseBackground } from "@/components/ui/pulse-background"

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
}

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen selection:bg-primary/30">
      <PulseBackground />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 h-16">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full group-hover:bg-primary/40 transition-colors" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight text-foreground uppercase italic">PulseGuard</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest text-foreground/60">
            <Link href="#features" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="text-primary/40">01.</span> Features
            </Link>
            <Link href="#infrastructure" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="text-primary/40">02.</span> Infrastructure
            </Link>
            <Link href="/login" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="text-primary/40">03.</span> Admin
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild className="text-xs uppercase tracking-widest font-mono hidden sm:flex">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-background font-bold px-6 rounded-none relative group overflow-hidden">
              <Link href="/signup">
                <span className="relative z-10 flex items-center gap-2">
                  Initialize <ArrowRight className="h-4 w-4" />
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial="initial"
              animate="animate"
              variants={stagger}
              className="flex flex-col items-center text-center"
            >
              <motion.div variants={fadeIn}>
                <Badge variant="outline" className="mb-8 rounded-none border-primary/30 text-primary font-mono bg-primary/5 px-4 py-1 uppercase tracking-[0.2em] text-[10px]">
                  System Status: Fully Operational
                </Badge>
              </motion.div>

              <motion.h1 
                variants={fadeIn}
                className="text-6xl md:text-8xl lg:text-9xl font-display font-bold tracking-tighter text-foreground leading-[0.9] mb-8"
              >
                MONITOR <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-primary/50 text-glow">RELIABILITY.</span>
              </motion.h1>

              <motion.p 
                variants={fadeIn}
                className="max-w-2xl text-lg md:text-xl text-foreground/50 font-sans leading-relaxed mb-12"
              >
                PulseGuard is a mission-critical monitoring layer for distributed systems. 
                Get sub-second latency alerts and deep infrastructure telemetry.
              </motion.p>

              <motion.div variants={fadeIn} className="flex flex-wrap justify-center gap-4">
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-background font-bold px-10 h-14 text-lg rounded-none">
                  <Link href="/signup">DEPLOY NOW</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-white/10 hover:bg-white/5 font-mono text-xs uppercase tracking-widest px-8 h-14 rounded-none">
                  <Link href="/docs">View Protocol_v1.0</Link>
                </Button>
              </motion.div>

              {/* Terminal/Dashboard Preview */}
              <motion.div 
                variants={fadeIn}
                className="mt-24 w-full max-w-5xl relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-b from-primary/20 to-transparent blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
                <div className="relative border border-white/10 glass rounded-t-lg overflow-hidden">
                  <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-white/5">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-white/10" />
                      <div className="w-3 h-3 rounded-full bg-white/10" />
                      <div className="w-3 h-3 rounded-full bg-white/10" />
                    </div>
                    <div className="text-[10px] font-mono text-foreground/40 uppercase tracking-[0.2em]">pulse_guard_terminal.sh</div>
                    <div className="w-12" />
                  </div>
                  <div className="p-8 aspect-video bg-black/40 flex flex-col font-mono text-sm overflow-hidden">
                    <div className="flex gap-4 text-primary/80 mb-4">
                      <span>[OK]</span>
                      <span>GET https://api.pulseguard.io/v1/health</span>
                      <span className="ml-auto">24ms</span>
                    </div>
                    <div className="flex gap-4 text-primary/80 mb-4 opacity-70">
                      <span>[OK]</span>
                      <span>POST https://ingest.telemetry.internal</span>
                      <span className="ml-auto">12ms</span>
                    </div>
                    <div className="flex gap-4 text-emerald-500 mb-4 animate-pulse">
                      <span>[ACTIVE]</span>
                      <span>Monitoring 42 endpoints across 8 regions</span>
                    </div>
                    <div className="mt-auto pt-8 border-t border-white/5 flex gap-8 justify-between items-end">
                      <div className="flex gap-2 h-16 items-end">
                        {[40, 70, 45, 90, 65, 80, 50, 85, 95, 75].map((h, i) => (
                          <motion.div 
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ delay: 1 + i * 0.1, duration: 1 }}
                            className="w-2 bg-primary/40 rounded-t-sm"
                          />
                        ))}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-foreground/40 uppercase mb-1">Uptime Score</div>
                        <div className="text-3xl font-display font-bold text-primary">99.998%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-32 relative border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-16 items-start">
              <div className="md:col-span-4 sticky top-32">
                <h2 className="text-4xl md:text-5xl font-display font-bold leading-none mb-6">
                  ENGINEERED <br />
                  <span className="text-primary italic">FOR SPEED.</span>
                </h2>
                <p className="text-foreground/50 mb-8 leading-relaxed">
                  Our core engine is built for high-throughput monitoring with global reach and zero false positives.
                </p>
                <div className="flex flex-col gap-4">
                  {[
                    "Global Edge Network",
                    "Custom Payload Validation",
                    "Webhook Orchestration",
                    "Historical Telemetry"
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                      <div className="w-1.5 h-1.5 bg-primary" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-8 grid sm:grid-cols-2 gap-px bg-white/5 border border-white/5">
                <FeatureCard 
                  icon={<Activity className="h-5 w-5" />}
                  title="Pulse Monitoring"
                  description="High-frequency uptime checks from 12 global regions with sub-second precision."
                />
                <FeatureCard 
                  icon={<BellRing className="h-5 w-5" />}
                  title="Neural Alerts"
                  description="Intelligent notification routing via Slack, Telegram, and PagerDuty with deduplication."
                />
                <FeatureCard 
                  icon={<Terminal className="h-5 w-5" />}
                  title="API Validation"
                  description="Complex response assertions, header verification, and JSON schema validation."
                />
                <FeatureCard 
                  icon={<BarChart3 className="h-5 w-5" />}
                  title="Deep Analytics"
                  description="Visualize performance trends and percentile-based latency distributions."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Technical Detail Section */}
        <section id="infrastructure" className="py-32 bg-primary/5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,transparent_70%)]" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="max-w-xl">
                <Badge className="mb-4 rounded-none bg-primary text-background font-mono uppercase tracking-widest text-[10px]">Infrastructure</Badge>
                <h2 className="text-4xl md:text-6xl font-display font-bold leading-none mb-8">
                  TRUSTED BY THE <br />NEXT GENERATION.
                </h2>
                <p className="text-lg text-foreground/60 mb-10">
                  Join thousands of engineering teams who rely on PulseGuard to keep their services performing at peak capacity.
                </p>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-3xl font-display font-bold text-primary mb-1">45M+</div>
                    <div className="text-[10px] uppercase tracking-widest text-foreground/40 font-mono">Checks/Month</div>
                  </div>
                  <div>
                    <div className="text-3xl font-display font-bold text-primary mb-1">&lt; 50ms</div>
                    <div className="text-[10px] uppercase tracking-widest text-foreground/40 font-mono">Alert Latency</div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="w-80 h-80 relative flex items-center justify-center">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border border-primary/20 rounded-full"
                  />
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 border border-dashed border-primary/40 rounded-full"
                  />
                  <ShieldCheck className="h-24 w-24 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto glass border border-primary/20 p-12 md:p-24 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-colors" />
            
            <div className="relative z-10 text-center">
              <h2 className="text-5xl md:text-7xl font-display font-bold tracking-tighter mb-8 leading-none">
                READY TO <br />OPTIMIZE?
              </h2>
              <p className="text-xl text-foreground/50 mb-12 max-w-xl mx-auto">
                Stop flying blind. Deploy the PulseGuard monitoring layer today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-background font-bold px-12 h-16 text-xl rounded-none w-full sm:w-auto">
                  <Link href="/signup">GET STARTED</Link>
                </Button>
                <Button size="lg" variant="ghost" className="font-mono text-xs uppercase tracking-widest flex items-center gap-2 group/btn">
                  Talk to an expert <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-lg font-display font-bold tracking-tight text-foreground italic uppercase">PulseGuard</span>
          </div>
          <div className="flex gap-12 text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/40">
            <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="#" className="hover:text-primary transition-colors">Status</Link>
          </div>
          <div className="text-[10px] font-mono text-foreground/30">
            &copy; 2026 PULSEGUARD.SYSTEM_INTL
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-background/40 p-10 hover:bg-primary/[0.02] transition-colors group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <div className="h-10 w-10 border border-white/10 flex items-center justify-center text-primary mb-6 group-hover:border-primary/50 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-display font-bold mb-4 uppercase tracking-tight">{title}</h3>
      <p className="text-foreground/50 text-sm leading-relaxed">{description}</p>
      <div className="mt-8 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Explore Module <ArrowRight className="h-3 w-3" />
      </div>
    </div>
  )
}
