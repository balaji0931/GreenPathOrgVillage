import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, fetchWithCsrf } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useTerminology } from "@/hooks/useTerminology";
import { useToast } from "@/hooks/use-toast";
import ActivityLog from "@/components/ActivityLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Users, UserPlus, Bell, User, ClipboardList, Settings,
  Copy, Download, RotateCcw, LogOut, ArrowLeft, Phone
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MoreMenuProps {
  activeScreen: string | null;
  setActiveScreen: (s: string | null) => void;
  villages: any[];
}

export default function MoreMenu({ activeScreen, setActiveScreen, villages }: MoreMenuProps) {
  const { label } = useTerminology(villages?.[0]?.unitType);
  const { logout } = useAuth();

  if (activeScreen === "managers") return <ManagersScreen villages={villages} onBack={() => setActiveScreen(null)} />;
  if (activeScreen === "announcements") return <AnnouncementsScreen villages={villages} onBack={() => setActiveScreen(null)} />;
  if (activeScreen === "profile") return <ProfileScreen onBack={() => setActiveScreen(null)} />;
  if (activeScreen === "activity-log") return <ActivityLog onBack={() => setActiveScreen(null)} apiUrl="/api/moderator/audit-logs" />;

  const managementItems = [
    { id: "managers", icon: Users, label: "Managers", description: "View and manage all managers" },
    { id: "announcements", icon: Bell, label: "Announcements", description: "Send announcements to users" },
  ];

  const settingsItems = [
    { id: "profile", icon: User, label: "Profile", description: "Update your profile & password" },
    { id: "activity-log", icon: ClipboardList, label: "Activity Log", description: "View recent activity" },
  ];

  return (
    <div className="space-y-4 pb-4">
      {/* Management */}
      <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-2 pb-1">Management</p>
      <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
        {managementItems.map(({ id, icon: Icon, label, description }, idx, arr) => (
          <button
            key={id}
            onClick={() => setActiveScreen(id)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors active:bg-gray-50 active:scale-[0.99]",
              idx < arr.length - 1 ? "border-b border-gray-100" : ""
            )}
          >
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-400 truncate">{description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Settings */}
      <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1 pt-2 pb-1">Settings</p>
      <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
        {settingsItems.map(({ id, icon: Icon, label }, idx, arr) => (
          <button
            key={id}
            onClick={() => setActiveScreen(id)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors active:bg-gray-50",
              idx < arr.length - 1 ? "border-b border-gray-100" : ""
            )}
          >
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4 text-gray-500" />
            </div>
            <p className="flex-1 font-semibold text-gray-900 text-sm">{label}</p>
          </button>
        ))}
        {/* Logout */}
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-4 px-4 py-3 text-left border-t border-gray-100 transition-colors active:bg-red-50"
        >
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <LogOut className="h-4 w-4 text-red-500" />
          </div>
          <p className="flex-1 font-semibold text-red-600 text-sm">Logout</p>
        </button>
      </div>
    </div>
  );
}

/* ─── Managers Screen ─── */
function ManagersScreen({ villages, onBack }: { villages: any[]; onBack: () => void }) {
  const { toast } = useToast();
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  const [confirmReset, setConfirmReset] = useState<any>(null);
  const [resetResult, setResetResult] = useState<any>(null);
  const { label } = useTerminology(villages?.[0]?.unitType);

  const { data: managers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/moderator/managers"],
  });

  const addManagerMutation = useMutation({
    mutationFn: async ({ villageId, managerName, managerPhone }: any) => {
      const res = await apiRequest("POST", `/api/moderator/village/${villageId}/managers`, { managerName, managerPhone });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Manager added" });
      setCreatedCredentials(data.manager?.credentials);
      queryClient.invalidateQueries({ queryKey: ["/api/moderator/managers"] });
    },
    onError: () => toast({ title: "Failed to add manager", variant: "destructive" }),
  });

  const resetPwMutation = useMutation({
    mutationFn: async (managerId: string) => {
      const res = await apiRequest("PUT", `/api/moderator/managers/${managerId}/reset-password`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Password reset successfully" });
      setResetResult({ name: confirmReset?.name, userId: confirmReset?.userId, password: confirmReset?.userId });
      setConfirmReset(null);
    },
    onError: () => { toast({ title: "Failed to reset", variant: "destructive" }); setConfirmReset(null); },
  });

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 active:scale-90"><ArrowLeft className="h-5 w-5 text-gray-600" /></button>
        <h3 className="text-sm font-black text-gray-900 flex-1">Manager Management</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs"><UserPlus className="h-3.5 w-3.5 mr-1" />Add</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader><DialogTitle>Add New Manager</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>{label.org}</Label>
                <select id="mod-add-mgr-vid" className="w-full p-2 border rounded-md text-sm">
                  <option value="">Select {label.org.toLowerCase()}</option>
                  {villages.map((v: any) => <option key={v.villageId} value={v.villageId}>{v.name}</option>)}
                </select>
              </div>
              <div><Label>Name</Label><Input id="mod-add-mgr-name" placeholder="Manager name" /></div>
              <div><Label>Phone</Label><Input id="mod-add-mgr-phone" placeholder="Phone number" /></div>
              <Button className="w-full" onClick={() => {
                const vid = (document.getElementById("mod-add-mgr-vid") as HTMLSelectElement).value;
                const name = (document.getElementById("mod-add-mgr-name") as HTMLInputElement).value;
                const phone = (document.getElementById("mod-add-mgr-phone") as HTMLInputElement).value;
                if (vid && name && phone) addManagerMutation.mutate({ villageId: vid, managerName: name, managerPhone: phone });
              }}>Add Manager</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {managers.map((m: any) => (
            <div key={m.userId} className="bg-white/70 backdrop-blur-md border border-white/20 shadow-sm rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-gray-900">{m.name}</div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase">{m.userId} · {m.villageName || m.villageId}</div>
                  {m.phone && <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-0.5"><Phone className="h-3 w-3" />{m.phone}</div>}
                </div>
                <div className="flex items-center gap-1.5">
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 active:scale-90 transition-all" title="Call">
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => setConfirmReset(m)}
                    className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 active:scale-90 transition-all"
                    title="Reset Password"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {managers.length === 0 && (
            <div className="text-center py-12 text-[10px] font-black text-gray-400 uppercase">No managers found</div>
          )}
        </div>
      )}

      {/* Reset Password Confirmation Dialog */}
      {confirmReset && (
        <Dialog open={!!confirmReset} onOpenChange={() => setConfirmReset(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">Reset Password?</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Are you sure you want to reset the password for <strong>{confirmReset.name}</strong>?
              </p>
              <p className="text-xs text-gray-400">
                This will generate a new password. The manager will need to use the new credentials to log in.
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmReset(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={resetPwMutation.isPending}
                  onClick={() => resetPwMutation.mutate(confirmReset.userId)}
                >
                  {resetPwMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* New Password Result Dialog */}
      {resetResult && (
        <Dialog open={!!resetResult} onOpenChange={() => setResetResult(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">New Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Password for <strong>{resetResult.name}</strong> has been reset.
              </p>
              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase">User ID</div>
                  <div className="text-sm font-black text-gray-900 font-mono">{resetResult.userId}</div>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(resetResult.userId); toast({ title: "User ID copied" }); }} className="p-1.5 rounded-lg hover:bg-gray-200 active:scale-90">
                  <Copy className="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase">New Password</div>
                  <div className="text-sm font-black text-gray-900 font-mono">{resetResult.password}</div>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(resetResult.password); toast({ title: "Password copied" }); }} className="p-1.5 rounded-lg hover:bg-gray-200 active:scale-90">
                  <Copy className="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>
              <Button className="w-full" onClick={() => { navigator.clipboard.writeText(`User ID: ${resetResult.userId}\nPassword: ${resetResult.password}`); toast({ title: "Credentials copied" }); }}>
                <Copy className="h-4 w-4 mr-1" />Copy All
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Credentials modal */}
      {createdCredentials && (
        <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader><DialogTitle>Manager Credentials</DialogTitle></DialogHeader>
            <div className="bg-gray-50 p-4 rounded-lg space-y-1 text-sm">
              <div><strong>User ID:</strong> {createdCredentials.userId}</div>
              <div><strong>Password:</strong> {createdCredentials.password}</div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => { navigator.clipboard.writeText(`User ID: ${createdCredentials.userId}\nPassword: ${createdCredentials.password}`); toast({ title: "Copied" }); }}>
                <Copy className="h-4 w-4 mr-1" />Copy
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ─── Announcements Screen ─── */
function AnnouncementsScreen({ villages, onBack }: { villages: any[]; onBack: () => void }) {
  const { toast } = useToast();
  const { label } = useTerminology(villages?.[0]?.unitType);
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      let photoUrl = null;
      if (photoFile) {
        try {
          const fd = new FormData(); fd.append("file", photoFile);
          const res = await fetchWithCsrf("/api/upload/photo", { method: "POST", body: fd, credentials: "include" });
          if (res.ok) photoUrl = (await res.json()).url;
        } catch { /* skip */ }
      }
      const res = await apiRequest("POST", "/api/moderator/announcements", { message, targetAudience, photoUrl });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Announcement sent", description: data.message });
      setMessage(""); setPhotoFile(null);
    },
    onError: () => toast({ title: "Failed to send", variant: "destructive" }),
  });

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 active:scale-90"><ArrowLeft className="h-5 w-5 text-gray-600" /></button>
        <h3 className="text-sm font-black text-gray-900">Send Announcement</h3>
      </div>

      <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-sm rounded-2xl p-4 space-y-4">
        <div>
          <Label>Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your announcement..." rows={4} />
        </div>
        <div>
          <Label>Target Audience</Label>
          <Select value={targetAudience} onValueChange={setTargetAudience}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="managers">Managers Only</SelectItem>
              <SelectItem value="generators">Generators Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Image (Optional)</Label>
          <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
          {photoFile && <p className="text-xs text-gray-400 mt-1">Selected: {photoFile.name}</p>}
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !message.trim()} className="w-full">
          {mutation.isPending ? "Sending..." : "Send Announcement"}
        </Button>
      </div>
    </div>
  );
}

/* ─── Profile Screen ─── */
function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/profile", { name, currentPassword, newPassword });
      return res.json();
    },
    onSuccess: () => { toast({ title: "Profile updated" }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 active:scale-90"><ArrowLeft className="h-5 w-5 text-gray-600" /></button>
        <h3 className="text-sm font-black text-gray-900">Profile Settings</h3>
      </div>

      <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-sm rounded-2xl p-4 space-y-4">
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>User ID</Label><Input value={user?.userId || ""} disabled className="bg-gray-50" /></div>
        <div className="border-t pt-4">
          <h4 className="text-xs font-black text-gray-700 mb-3">Change Password</h4>
          <div className="space-y-3">
            <div><Label>Current Password</Label><Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
            <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
            <div><Label>Confirm Password</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
          </div>
        </div>
        <Button className="w-full" disabled={mutation.isPending} onClick={() => {
          if (newPassword && newPassword !== confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
          mutation.mutate();
        }}>{mutation.isPending ? "Updating..." : "Save Changes"}</Button>
      </div>
    </div>
  );
}
