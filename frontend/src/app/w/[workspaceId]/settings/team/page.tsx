"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ApiError, authApi, workspaceApi, workspaceMembersApi } from "@/lib/api";
import { User, Workspace, WorkspaceMember, WorkspaceRole } from "@/lib/types";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TeamSettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  const [me, setMe] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("VIEWER");

  const load = useCallback(async () => {
    try {
      const [meRes, workspaceRes, membersRes] = await Promise.all([authApi.me(), workspaceApi.list(), workspaceMembersApi.list(workspaceId)]);
      setMe(meRes.user);
      setWorkspace(workspaceRes.workspaces.find((w) => w.id === workspaceId) ?? null);
      setMembers(membersRes.members);
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load team data");
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const roleLabel = useMemo(() => workspace?.role ?? "UNKNOWN", [workspace]);
  const ownerCount = useMemo(() => members.filter((m) => m.role === "OWNER").length, [members]);
  const canManageMembers = roleLabel === "OWNER" || roleLabel === "ADMIN";
  const canManageOwners = roleLabel === "OWNER";

  const onInvite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canManageMembers) {
      toast.error("Only OWNER or ADMIN can add members");
      return;
    }
    if (inviteRole === "OWNER" && !canManageOwners) {
      toast.error("Only OWNER can assign OWNER role");
      return;
    }
    setLoading(true);
    try {
      await workspaceMembersApi.add(workspaceId, {
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role: inviteRole
      });
      toast.success("Team member added");
      setInviteEmail("");
      setInviteName("");
      setInviteRole("VIEWER");
      await load();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const onRoleChange = async (member: WorkspaceMember, role: WorkspaceRole) => {
    const isSelf = me?.id === member.userId;
    if (!canManageMembers) {
      toast.error("Only OWNER or ADMIN can update roles");
      return;
    }
    if ((member.role === "OWNER" || role === "OWNER") && !canManageOwners) {
      toast.error("Only OWNER can manage OWNER role");
      return;
    }
    if (isSelf && member.role === "OWNER" && role !== "OWNER" && ownerCount <= 1) {
      toast.error("You cannot demote the last OWNER");
      return;
    }
    setBusyMemberId(member.id);
    try {
      await workspaceMembersApi.updateRole(workspaceId, member.id, { role });
      toast.success("Role updated");
      await load();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update role");
    } finally {
      setBusyMemberId(null);
    }
  };

  const onRemove = async (member: WorkspaceMember) => {
    const isSelf = me?.id === member.userId;
    if (!canManageMembers) {
      toast.error("Only OWNER or ADMIN can remove members");
      return;
    }
    if (member.role === "OWNER" && !canManageOwners) {
      toast.error("Only OWNER can remove OWNER membership");
      return;
    }
    if (isSelf && member.role === "OWNER" && ownerCount <= 1) {
      toast.error("You cannot remove the last OWNER");
      return;
    }
    if (!window.confirm(`Remove ${member.user.email} from this workspace?`)) {
      return;
    }
    setBusyMemberId(member.id);
    try {
      await workspaceMembersApi.remove(workspaceId, member.id);
      toast.success("Member removed");
      await load();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : "Failed to remove member");
    } finally {
      setBusyMemberId(null);
    }
  };

  return (
    <main className="flex-1 space-y-8 p-8 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground uppercase flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" /> Team & Roles
        </h1>
        <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mt-1">Invite members and manage workspace permissions</p>
      </div>

      <Card className="bg-black/40 backdrop-blur-md border-white/10">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-sm uppercase tracking-widest font-mono">Workspace Access</CardTitle>
          <CardDescription className="font-mono text-[10px] uppercase tracking-widest text-foreground/40">
            Workspace: {workspace?.name ?? workspaceId} | Your role: {roleLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-4" onSubmit={onInvite}>
            <Input
              type="email"
              placeholder="member@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="font-mono"
            />
            <Input
              type="text"
              placeholder="Display name (optional)"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="font-mono"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
              disabled={!canManageMembers}
              className="h-10 bg-white/5 border border-white/10 px-3 text-[12px] font-mono uppercase tracking-widest text-foreground"
            >
              {canManageOwners ? <option value="OWNER">OWNER</option> : null}
              <option value="ADMIN">ADMIN</option>
              <option value="VIEWER">VIEWER</option>
            </select>
            <Button disabled={loading || !canManageMembers} type="submit" className="rounded-none font-mono text-[10px] uppercase tracking-widest">
              {loading ? "Adding..." : "Add Member"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-black/40 backdrop-blur-md border-white/10">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-sm uppercase tracking-widest font-mono">Members</CardTitle>
          <CardDescription className="font-mono text-[10px] uppercase tracking-widest text-foreground/40">
            Manage roles or remove access
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 px-0">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-white/5 text-foreground/50 text-[10px] uppercase tracking-widest border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-normal">Name</th>
                <th className="px-6 py-4 font-normal">Email</th>
                <th className="px-6 py-4 font-normal">Role</th>
                <th className="px-6 py-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 text-foreground">
                    {member.user.name}
                    {me?.id === member.userId ? <span className="ml-2 text-[10px] text-primary">(You)</span> : null}
                  </td>
                  <td className="px-6 py-4 text-foreground/70">{member.user.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={member.role}
                      disabled={
                        busyMemberId === member.id ||
                        !canManageMembers ||
                        (member.role === "OWNER" && !canManageOwners) ||
                        (me?.id === member.userId && member.role === "OWNER" && ownerCount <= 1)
                      }
                      onChange={(e) => void onRoleChange(member, e.target.value as WorkspaceRole)}
                      className="h-8 bg-white/5 border border-white/10 px-2 text-[11px] font-mono uppercase"
                    >
                      {canManageOwners ? <option value="OWNER">OWNER</option> : null}
                      <option value="ADMIN">ADMIN</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={
                        busyMemberId === member.id ||
                        !canManageMembers ||
                        (member.role === "OWNER" && !canManageOwners) ||
                        (me?.id === member.userId && member.role === "OWNER" && ownerCount <= 1)
                      }
                      onClick={() => void onRemove(member)}
                      className="rounded-none font-mono text-[10px] uppercase tracking-widest"
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
              {!members.length ? (
                <tr>
                  <td className="px-6 py-10 text-center text-foreground/40 uppercase tracking-widest" colSpan={4}>
                    No members found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}
