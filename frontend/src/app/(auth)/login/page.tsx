"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PulseBackground } from "@/components/ui/pulse-background";
import { motion } from "framer-motion";
import { ApiError, authApi } from "@/lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const canUseGoogle = useMemo(() => Boolean(googleClientId), [googleClientId]);

  useEffect(() => {
    const hasCookie =
      typeof document !== "undefined" &&
      (document.cookie.includes("access_token=") || document.cookie.includes("refresh_token="));
    if (!hasCookie) return;
    void authApi
      .me()
      .then(() => router.replace("/workspaces"))
      .catch(() => undefined);
  }, [router]);

  const onLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.login({ email: email.trim(), password });
      toast.success("Session initialized");
      router.push("/workspaces");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = async (idToken?: string) => {
    if (!idToken) return;
    try {
      await authApi.google({ idToken });
      toast.success("Google authentication successful");
      router.push("/workspaces");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Google authentication failed");
    }
  };

  const initGoogleButton = () => {
    if (!canUseGoogle || !window.google) return;
    const target = document.getElementById("google-login-button");
    if (!target) return;

    target.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: ({ credential }) => {
        void onGoogleCredential(credential);
      }
    });

    window.google.accounts.id.renderButton(target, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: "360"
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-primary/30">
      {canUseGoogle ? <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={initGoogleButton} /> : null}
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Card className="border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />

          <CardHeader className="space-y-1 pb-8 border-b border-white/5 relative z-10">
            <CardTitle className="text-3xl text-center font-display font-bold uppercase tracking-tight">System Access</CardTitle>
            <CardDescription className="text-center font-mono text-[10px] uppercase tracking-widest text-foreground/40">Authenticate to terminal</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 relative z-10">
            <form className="space-y-6" onSubmit={onLogin}>
              <div className="space-y-3">
                <Label htmlFor="email">Identity (Email)</Label>
                <Input id="email" type="email" placeholder="admin@system.internal" className="font-mono text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Passkey</Label>
                  <Link href="/forgot-password" className="text-[10px] font-mono uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">
                    Reset Protocol
                  </Link>
                </div>
                <Input id="password" type="password" className="font-mono text-sm tracking-widest" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-background font-bold h-12 relative overflow-hidden group/btn">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? "AUTHENTICATING..." : "INITIALIZE SESSION"} <ArrowRight className="h-4 w-4" />
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
              </Button>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-widest">
                  <span className="bg-black/40 px-4 text-foreground/40">Or use external identity</span>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                {canUseGoogle ? (
                  <div id="google-login-button" className="min-h-10" />
                ) : (
                  <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <p className="mt-8 text-center text-xs font-mono uppercase tracking-widest text-foreground/40">
          Unregistered node?{" "}
          <Link href="/signup" className="text-primary hover:text-primary/80 transition-colors">
            Request Access
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
