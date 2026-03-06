"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError, authApi } from "@/lib/api";
import { User } from "@/lib/types";
import { PulseBackground } from "@/components/ui/pulse-background";
import { motion } from "framer-motion";
import { User as UserIcon, ShieldCheck, KeyRound, LogOut } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [emailForReset, setEmailForReset] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    void authApi
      .me()
      .then(({ user }) => {
        setMe(user);
        setEmailForReset(user.email);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
          return;
        }
        toast.error(error instanceof ApiError ? error.message : "Identity verification failed");
      });
  }, [router]);

  const requestReset = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const result = await authApi.requestReset({ email: emailForReset });
      toast.success("Reset sequence initiated");
      if (result.resetTokenForLocalDev) {
        setResetToken(result.resetTokenForLocalDev);
        toast.info("Local debug token extracted");
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Sequence failed");
    }
  };

  const confirmReset = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await authApi.confirmReset({ token: resetToken, newPassword });
      toast.success("Security credentials updated");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Update rejected");
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      toast.success("Session terminated");
      router.push("/login");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Termination failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-primary/30">
      <PulseBackground />
      
      <header className="flex h-16 items-center px-6 border-b border-white/5 glass relative z-10">
        <Link href="/workspaces" className="flex items-center gap-2 group">
          <div className="relative">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full group-hover:bg-primary/40 transition-colors" />
          </div>
          <span className="text-xl font-display font-bold tracking-tight text-foreground uppercase italic">PulseGuard</span>
        </Link>
        <div className="ml-auto">
          <Button variant="ghost" onClick={logout} className="font-mono text-[10px] uppercase tracking-widest text-foreground/60 hover:text-primary hover:bg-white/5 rounded-none gap-2">
            <LogOut className="h-3 w-3" /> End Session
          </Button>
        </div>
      </header>

      <main className="flex-1 space-y-8 p-8 max-w-3xl mx-auto w-full relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground uppercase flex items-center gap-3">
            <UserIcon className="h-6 w-6 text-primary" />
            Operator Identity
          </h1>
          <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mt-1">Manage system access credentials</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <Card className="bg-black/40 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="border-b border-white/5 relative z-10">
              <CardTitle className="text-sm uppercase tracking-widest font-mono">Current Profile</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 relative z-10">
              {me ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 bg-white/5 border border-white/10">
                    <p className="text-[10px] font-mono text-foreground/40 uppercase tracking-widest mb-1">Designation</p>
                    <p className="font-display font-bold text-lg text-foreground uppercase tracking-tight">{me.name}</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10">
                    <p className="text-[10px] font-mono text-foreground/40 uppercase tracking-widest mb-1">Alias (Email)</p>
                    <p className="font-mono text-sm text-primary">{me.email}</p>
                  </div>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center text-foreground/40 font-mono text-xs uppercase animate-pulse">
                  Verifying Identity...
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-md">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-sm uppercase tracking-widest font-mono flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Security Overrides
              </CardTitle>
              <CardDescription className="text-[10px] font-mono">Modify access credentials</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">1. Initiate Reset Protocol</h3>
                <form className="flex gap-2" onSubmit={requestReset}>
                  <Input type="email" value={emailForReset} onChange={(e) => setEmailForReset(e.target.value)} required className="font-mono text-sm" placeholder="target@internal.sys" />
                  <Button type="submit" variant="outline" className="shrink-0 rounded-none font-mono text-[10px] uppercase tracking-widest border-white/10 hover:bg-white/5">
                    Generate Auth Token
                  </Button>
                </form>
              </div>

              <div className="w-full h-px bg-white/5" />

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">2. Commit New Credentials</h3>
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={confirmReset}>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-foreground/60 uppercase tracking-widest">Auth Token</label>
                    <Input placeholder="XYZ-..." value={resetToken} onChange={(e) => setResetToken(e.target.value)} required className="font-mono text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-foreground/60 uppercase tracking-widest">New Passkey</label>
                    <Input
                      placeholder="••••••••"
                      type="password"
                      value={newPassword}
                      minLength={8}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="font-mono text-sm tracking-widest"
                    />
                  </div>
                  <div className="sm:col-span-2 pt-2">
                    <Button type="submit" className="w-full bg-primary text-background hover:bg-primary/90 rounded-none font-mono text-[10px] uppercase tracking-widest">
                      Finalize Override
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
