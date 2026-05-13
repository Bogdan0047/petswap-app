import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Loader2, UserPlus, UserMinus, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type AppRole = "admin" | "moderator" | "user";

interface RoleRow {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  email: string | null;
  first_name: string | null;
}

export default function AdminRoles() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("admin");
  const [working, setWorking] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const refresh = async () => {
    setLoading(true);
    // Total admin count (any signed-in user can read this via the count)
    const { count } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    setAdminCount(count ?? 0);

    if (!user) { setLoading(false); return; }
    const { data: roleData } = await supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" });
    const admin = Boolean(roleData);
    setIsAdmin(admin);

    if (admin) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("id,user_id,role,created_at")
        .order("created_at", { ascending: false });
      const userIds = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id,email,first_name").in("id", userIds)
        : { data: [] as Array<{ id: string; email: string | null; first_name: string | null }> };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      setRows(((roles ?? []) as Array<{ id: string; user_id: string; role: AppRole; created_at: string }>).map((r) => ({
        ...r,
        email: byId.get(r.user_id)?.email ?? null,
        first_name: byId.get(r.user_id)?.first_name ?? null,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) void refresh(); }, [authLoading, user?.id]);

  const claim = async () => {
    setClaiming(true);
    const { error } = await supabase.rpc("claim_first_admin");
    setClaiming(false);
    if (error) { toast.error("Could not claim admin", { description: error.message }); return; }
    toast.success("You are now an admin");
    void refresh();
  };

  const submit = async (grant: boolean) => {
    if (!email.trim()) { toast.error("Enter an email"); return; }
    setWorking(true);
    const { error } = await supabase.rpc("set_user_role", {
      _email: email.trim(), _role: role, _grant: grant,
    });
    setWorking(false);
    if (error) { toast.error("Action failed", { description: error.message }); return; }
    toast.success(grant ? `Granted ${role} to ${email}` : `Revoked ${role} from ${email}`);
    setEmail("");
    void refresh();
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <ShieldCheck size={32} className="text-muted-foreground mb-3" />
        <p className="font-semibold mb-2">Sign in required</p>
        <button onClick={() => navigate("/auth")} className="text-primary underline">Go to sign in</button>
      </div>
    );
  }

  // Bootstrap path: no admin exists anywhere → let the signed-in user claim it.
  if (!isAdmin && (adminCount ?? 0) === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header onBack={() => navigate(-1)} title="Become admin" />
        <div className="max-w-md mx-auto px-5 pt-6 space-y-4">
          <div className="card-elevated p-5">
            <ShieldCheck className="text-primary mb-2" size={24} />
            <h2 className="text-[15px] font-semibold mb-1">No admin exists yet</h2>
            <p className="text-[13px] text-muted-foreground mb-4">
              You can claim the first admin role for this project. After this, only existing
              admins can grant the role to others.
            </p>
            <p className="text-[12px] text-muted-foreground mb-4">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </p>
            <button
              onClick={claim}
              disabled={claiming}
              className="btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              {claiming ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              Claim admin role
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="text-destructive mb-3" size={32} />
        <p className="font-semibold mb-1">Admin access required</p>
        <p className="text-[13px] text-muted-foreground mb-4">An existing admin must grant you the role.</p>
        <button onClick={() => navigate("/profile")} className="text-primary underline">Back to profile</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <Header onBack={() => navigate(-1)} title="Role management" />

      <div className="max-w-md mx-auto px-5 pt-5 space-y-5">
        <div className="card-elevated p-4">
          <h2 className="text-[14px] font-semibold mb-3">Grant or revoke role</h2>
          <label className="block text-[12px] text-muted-foreground mb-1">User email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-[14px] mb-3"
          />
          <label className="block text-[12px] text-muted-foreground mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AppRole)}
            className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-[14px] mb-4"
          >
            <option value="admin">admin</option>
            <option value="moderator">moderator</option>
            <option value="user">user</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => submit(true)}
              disabled={working}
              className="flex-1 btn-primary py-2.5 text-[13px] inline-flex items-center justify-center gap-1.5"
            >
              {working ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Grant
            </button>
            <button
              onClick={() => submit(false)}
              disabled={working}
              className="flex-1 btn-outline py-2.5 text-[13px] inline-flex items-center justify-center gap-1.5 text-destructive border-destructive/30"
            >
              <UserMinus size={15} /> Revoke
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
            Current roles ({rows.length})
          </h3>
          <ul className="divide-y divide-border rounded-md border border-border overflow-hidden bg-card">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium truncate">{r.first_name ?? "Unknown"}</p>
                  <p className="text-[12px] text-muted-foreground truncate">{r.email ?? r.user_id}</p>
                </div>
                <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {r.role}
                </span>
              </li>
            ))}
            {rows.length === 0 && (
              <li className="px-4 py-6 text-center text-[13px] text-muted-foreground">No roles yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

const Header = ({ onBack, title }: { onBack: () => void; title: string }) => (
  <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-md border-b border-border px-5 py-3 flex items-center gap-3">
    <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-muted"><ArrowLeft size={20} /></button>
    <h1 className="text-[17px] font-bold">{title}</h1>
  </header>
);
