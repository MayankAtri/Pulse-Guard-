"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi, ApiError } from "@/lib/api";

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    void authApi
      .logout()
      .then(() => {
        toast.success("Signed out");
      })
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : "Sign out failed");
      })
      .finally(() => {
        router.replace("/login");
      });
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-xs font-mono uppercase tracking-widest text-foreground/50">Signing out...</p>
    </main>
  );
}
