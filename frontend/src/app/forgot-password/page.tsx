"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PulseBackground } from "@/components/ui/pulse-background";
import { ApiError, authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const requestReset = async (e: FormEvent) => {
    e.preventDefault();
    setRequesting(true);
    try {
      const result = await authApi.requestReset({ email: email.trim() });
      toast.success("Reset token generated if account exists");
      if (result.resetTokenForLocalDev) {
        setResetToken(result.resetTokenForLocalDev);
        toast.info("Local debug token auto-filled");
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Reset request failed");
    } finally {
      setRequesting(false);
    }
  };

  const confirmReset = async (e: FormEvent) => {
    e.preventDefault();
    setConfirming(true);
    try {
      await authApi.confirmReset({ token: resetToken.trim(), newPassword });
      toast.success("Password updated. You can log in now.");
      setNewPassword("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Password reset failed");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-primary/30">
      <PulseBackground />

      <div className="absolute top-8 left-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full group-hover:bg-primary/40 transition-colors" />
          </div>
          <span className="text-xl font-display font-bold tracking-tight text-foreground uppercase italic">PulseGuard</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10 space-y-6">
        <Card className="border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-2xl font-display font-bold uppercase tracking-tight flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Forgot Password
            </CardTitle>
            <CardDescription className="font-mono text-[10px] uppercase tracking-widest text-foreground/40">
              Request token and set a new password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <form className="space-y-4" onSubmit={requestReset}>
              <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Step 1: Request Reset Token</p>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="font-mono"
              />
              <Button type="submit" disabled={requesting} className="rounded-none font-mono text-[10px] uppercase tracking-widest">
                {requesting ? "Generating..." : "Generate Token"}
              </Button>
            </form>

            <form className="space-y-4" onSubmit={confirmReset}>
              <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Step 2: Confirm New Password</p>
              <Input
                placeholder="Reset token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
                className="font-mono"
              />
              <Input
                type="password"
                placeholder="New password (min 8 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                className="font-mono"
              />
              <Button type="submit" disabled={confirming} className="rounded-none font-mono text-[10px] uppercase tracking-widest">
                {confirming ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center">
          <Link href="/login" className="text-[11px] font-mono uppercase tracking-widest text-primary hover:text-primary/80 inline-flex items-center gap-2">
            <ArrowLeft className="h-3 w-3" /> Back To Login
          </Link>
        </div>
      </div>
    </div>
  );
}
