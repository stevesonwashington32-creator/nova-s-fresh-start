import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listReservations, updateReservationStatus, getMyRole } from "@/lib/reservations.functions";
import { Users, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reception")({
  head: () => ({
    meta: [
      { title: "Reception — Nova" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ReceptionPage,
});

type Reservation = {
  id: string;
  ref: string;
  guest_name: string;
  phone: string;
  reservation_date: string;
  reservation_time: string;
  party_size: string;
  occasion: string | null;
  special_requests: string | null;
  status: string;
  created_at: string;
};

const FILTERS = ["All", "Confirmed", "Pending", "Tonight"] as const;
type Filter = typeof FILTERS[number];

function ReceptionPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listReservations);
  const role = useServerFn(getMyRole);
  const update = useServerFn(updateReservationStatus);

  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => role() });
  const resQ = useQuery({
    queryKey: ["reservations"],
    queryFn: () => list(),
    enabled: (roleQ.data?.roles ?? []).some((r) => r === "staff" || r === "admin"),
  });

  const mut = useMutation({
    mutationFn: (vars: { id: string; status: string }) => update({ data: vars as { id: string; status: "pending" | "confirmed" | "completed" | "cancelled" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations"] }),
  });

  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");

  const reservations: Reservation[] = (resQ.data?.reservations ?? []) as Reservation[];
  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (filter === "Confirmed" && r.status !== "confirmed") return false;
      if (filter === "Pending" && r.status !== "pending") return false;
      if (filter === "Tonight" && r.reservation_date !== today) return false;
      if (search && !r.guest_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [reservations, filter, search, today]);

  const stats = useMemo(() => {
    const tonight = reservations.filter((r) => r.reservation_date === today);
    const covers = tonight.reduce((s, r) => s + (parseInt(r.party_size) || 0), 0);
    const confirmed = tonight.filter((r) => r.status === "confirmed").length;
    const pending = tonight.filter((r) => r.status === "pending").length;
    return { total: reservations.length, tonight: tonight.length, covers, confirmed, pending };
  }, [reservations, today]);

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const isStaff = (roleQ.data?.roles ?? []).some((r) => r === "staff" || r === "admin");

  if (roleQ.isLoading) {
    return <DarkShell><p className="text-paper/40 text-xs uppercase tracking-widest">Loading…</p></DarkShell>;
  }

  if (!isStaff) {
    return (
      <DarkShell>
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>Awaiting access</h1>
          <p className="text-paper/60 text-sm">
            Your account is signed in but does not yet have a <span className="text-sand">staff</span> role.
            An admin must grant access from the Cloud dashboard (user_roles table).
          </p>
          <button onClick={handleSignOut} className="text-[10px] uppercase tracking-[0.3em] text-paper/50 hover:text-sand">Sign out</button>
        </div>
      </DarkShell>
    );
  }

  return (
    <div className="min-h-screen bg-night text-paper" style={{ fontFamily: "var(--font-body)" }}>
      {/* Header */}
      <header className="border-b border-paper/10">
        <div className="px-6 lg:px-10 py-6 flex items-center justify-between">
          <div className="text-2xl tracking-[0.3em] text-sand" style={{ fontFamily: "var(--font-display)" }}>NOVA</div>
          <div className="flex items-center gap-6 text-xs">
            <span className="flex items-center gap-2 text-sand/80 uppercase tracking-[0.3em]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
            <span className="text-paper/50 hidden md:inline">reception@nova.com</span>
            <button onClick={() => navigate({ to: "/" })} className="text-paper/60 hover:text-sand transition-colors hidden md:inline">
              ← Guest Page
            </button>
            <button onClick={handleSignOut} className="border border-paper/30 px-4 py-1.5 hover:bg-paper/5 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 lg:px-10 py-10 space-y-8">
        {/* Title row */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-sand mb-3">Reception</p>
            <h1 className="text-5xl lg:text-6xl" style={{ fontFamily: "var(--font-display)" }}>Reservations</h1>
          </div>
          <p className="text-sand/70 text-sm">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Hero stat */}
        <div className="border border-paper/10 bg-paper/[0.02] p-8 lg:p-10">
          <p className="text-[10px] uppercase tracking-[0.4em] text-paper/40 mb-4">Total Bookings</p>
          <p className="text-7xl lg:text-8xl" style={{ fontFamily: "var(--font-display)" }}>{stats.total}</p>
          <p className="text-sand/70 text-xs uppercase tracking-[0.25em] mt-3">All time</p>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Tonight" big={stats.tonight} sub="Reservations today" />
          <StatCard label="Guests Expected" big={stats.covers} sub="Tonight's covers" />
          <StatCard label="Confirmed" big={stats.confirmed} sub={<>Awaiting <span className="text-sand">{stats.pending}</span> pending</>} />
          <StatCard label="Tables" big={20 - stats.tonight} sub={<>Taken <span className="text-sand">{stats.tonight}</span> · Free <span className="text-sand">{20 - stats.tonight}</span></>} />
        </div>

        {/* Filter + search */}
        <div className="flex items-center justify-between flex-wrap gap-4 pt-4">
          <p className="text-sand text-xs uppercase tracking-[0.3em]">All Reservations</p>
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={"px-4 py-1.5 text-[11px] uppercase tracking-widest border transition-colors " +
                  (filter === f ? "border-sand text-sand bg-sand/10" : "border-paper/15 text-paper/60 hover:border-sand hover:text-sand")}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name"
            className="flex-1 bg-paper/[0.03] border border-paper/10 px-5 py-3 text-sm focus:border-sand outline-none placeholder:text-paper/30"
          />
          <button className="bg-sand text-night px-6 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
          </button>
        </div>

        {/* Table */}
        <div className="border border-paper/10">
          <div className="hidden md:grid grid-cols-[1.5fr_1fr_0.7fr_1fr_1.4fr_1fr_0.8fr_0.7fr] gap-3 px-5 py-3 text-[10px] uppercase tracking-widest text-paper/40 border-b border-paper/10">
            <div>Guest</div><div>Date &amp; Time</div><div>Party</div><div>Occasion</div>
            <div>Special Requests</div><div>Status</div><div>Ref</div><div className="text-right">Actions</div>
          </div>

          {resQ.isLoading && <div className="p-10 text-center text-paper/40 text-sm">Loading reservations…</div>}
          {!resQ.isLoading && filtered.length === 0 && (
            <div className="p-10 text-center text-paper/40 text-sm">No reservations match.</div>
          )}

          {filtered.map((r) => (
            <div key={r.id} className="grid grid-cols-2 md:grid-cols-[1.5fr_1fr_0.7fr_1fr_1.4fr_1fr_0.8fr_0.7fr] gap-3 px-5 py-4 border-b border-paper/5 hover:bg-paper/[0.02] transition-colors text-sm">
              <div>
                <p className="lowercase">{r.guest_name}</p>
                <p className="text-paper/40 text-xs">{r.phone}</p>
              </div>
              <div>
                <span className="border border-sand/40 text-sand px-2 py-0.5 text-xs">
                  {new Date(r.reservation_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <p className="text-paper/60 text-xs mt-1.5 uppercase tracking-wider">{r.reservation_time}</p>
              </div>
              <div className="flex items-center gap-1.5 text-sand">
                <Users className="h-3.5 w-3.5" /> {r.party_size}
              </div>
              <div className="text-paper/70 text-sm">{r.occasion || "—"}</div>
              <div className="text-paper/50 text-xs truncate">{r.special_requests || "—"}</div>
              <div>
                <select
                  value={r.status}
                  onChange={(e) => mut.mutate({ id: r.id, status: e.target.value })}
                  className={"bg-transparent border px-2 py-1 text-[10px] uppercase tracking-widest " +
                    statusColor(r.status)}
                >
                  <option className="bg-night" value="pending">Pending</option>
                  <option className="bg-night" value="confirmed">Confirmed</option>
                  <option className="bg-night" value="completed">Completed</option>
                  <option className="bg-night" value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="text-paper/40 text-xs uppercase tracking-widest">{r.ref}</div>
              <div className="text-right">
                <button
                  onClick={() => mut.mutate({ id: r.id, status: "cancelled" })}
                  aria-label="Cancel reservation"
                  className="inline-flex h-7 w-7 items-center justify-center border border-paper/15 hover:border-burnt hover:text-burnt transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, big, sub }: { label: string; big: number | string; sub: React.ReactNode }) {
  return (
    <div className="border border-paper/10 bg-paper/[0.02] p-6">
      <p className="text-[10px] uppercase tracking-[0.4em] text-paper/40 mb-4">{label}</p>
      <p className="text-5xl" style={{ fontFamily: "var(--font-display)" }}>{big}</p>
      <p className="text-sand/70 text-[11px] uppercase tracking-[0.2em] mt-3">{sub}</p>
    </div>
  );
}

function statusColor(s: string) {
  switch (s) {
    case "confirmed": return "border-cyan-400/40 text-cyan-300";
    case "completed": return "border-emerald-400/40 text-emerald-300";
    case "cancelled": return "border-burnt/50 text-burnt";
    default: return "border-sand/40 text-sand";
  }
}

function DarkShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-night text-paper flex items-center justify-center p-6" style={{ fontFamily: "var(--font-body)" }}>
      {children}
    </div>
  );
}
