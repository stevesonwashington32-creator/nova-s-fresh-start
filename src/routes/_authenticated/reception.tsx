import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listReservations,
  updateReservationStatus,
  rescheduleReservation,
  deleteReservation,
  getMyRole,
  listRestaurantTables,
  assignReservationTable,
} from "@/lib/reservations.functions";
import {
  Users, Trash2, Check, Clock, CalendarClock, Utensils, X, MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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
  table_id: string | null;
};
type RestaurantTable = { id: string; number: number; capacity: number };

const FILTERS = ["Pending", "Confirmed", "Tonight", "Today"] as const;
type Filter = typeof FILTERS[number];

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m === 0 ? "00" : String(m).padStart(2, "0")} ${ampm}`;
}

function ReceptionPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listReservations);
  const role = useServerFn(getMyRole);
  const update = useServerFn(updateReservationStatus);
  const reschedule = useServerFn(rescheduleReservation);
  const del = useServerFn(deleteReservation);
  const listTables = useServerFn(listRestaurantTables);
  const assignTable = useServerFn(assignReservationTable);

  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => role() });
  const isStaff = (roleQ.data?.roles ?? []).some((r) => r === "staff" || r === "admin");

  const resQ = useQuery({
    queryKey: ["reservations"],
    queryFn: () => list(),
    enabled: isStaff,
    refetchInterval: 5000,
  });
  const tablesQ = useQuery({
    queryKey: ["restaurant-tables"],
    queryFn: () => listTables(),
    enabled: isStaff,
  });

  const [toast, setToast] = useState("");
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2500);
  };

  const mut = useMutation({
    mutationFn: (vars: { id: string; status: "pending" | "confirmed" | "arrived" | "late" | "completed" | "cancelled" }) =>
      update({ data: vars }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      showToast(`Status → ${v.status}`);
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      showToast("Reservation deleted");
    },
  });
  const reMut = useMutation({
    mutationFn: (vars: { id: string; reservation_date: string; reservation_time: string }) =>
      reschedule({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      showToast("Rescheduled");
    },
    onError: (e: Error) => showToast(e.message),
  });
  const assignMut = useMutation({
    mutationFn: (vars: { id: string; table_id: string | null }) => assignTable({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      showToast("Table assigned");
    },
    onError: (e: Error) => showToast(e.message),
  });

  const [filter, setFilter] = useState<Filter>("Pending");
  const [search, setSearch] = useState("");

  const reservations: Reservation[] = (resQ.data?.reservations ?? []) as Reservation[];
  const tables: RestaurantTable[] = (tablesQ.data?.tables ?? []) as RestaurantTable[];
  const today = new Date().toISOString().slice(0, 10);

  // Tables occupied by active reservations today
  const occupiedTableIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of reservations) {
      if (r.reservation_date !== today) continue;
      if (!r.table_id) continue;
      if (!["pending", "confirmed", "arrived", "late"].includes(r.status)) continue;
      set.add(r.table_id);
    }
    return set;
  }, [reservations, today]);

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (filter === "Confirmed" && r.status !== "confirmed") return false;
      if (filter === "Pending" && r.status !== "pending") return false;
      if (filter === "Tonight") {
        if (r.reservation_date !== today) return false;
        if (!["confirmed", "arrived"].includes(r.status)) return false;
      }
      if (filter === "Today" && r.reservation_date !== today) return false;
      if (search && !r.guest_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [reservations, filter, search, today]);

  const stats = useMemo(() => {
    const todayList = reservations.filter((r) => r.reservation_date === today);
    const covers = todayList.reduce((s, r) => s + (parseInt(r.party_size) || 0), 0);
    const confirmed = todayList.filter((r) => r.status === "confirmed").length;
    const pending = todayList.filter((r) => r.status === "pending").length;
    const arrived = todayList.filter((r) => r.status === "arrived").length;
    const totalTables = tables.length;
    const taken = occupiedTableIds.size;
    const free = Math.max(0, totalTables - taken);
    return {
      total: reservations.length,
      today: todayList.length,
      covers,
      confirmed,
      pending,
      arrived,
      totalTables,
      taken,
      free,
    };
  }, [reservations, today, tables.length, occupiedTableIds]);

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const handleReschedule = (r: Reservation) => {
    const newDate = window.prompt("New date (YYYY-MM-DD):", r.reservation_date);
    if (!newDate) return;
    const newTime = window.prompt("New time (HH:MM):", r.reservation_time);
    if (!newTime) return;
    reMut.mutate({ id: r.id, reservation_date: newDate, reservation_time: newTime });
  };

  if (roleQ.isLoading) {
    return <DarkShell><p className="text-paper/40 text-xs uppercase tracking-widest">Loading…</p></DarkShell>;
  }

  if (!isStaff) {
    return (
      <DarkShell>
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>Awaiting access</h1>
          <p className="text-paper/60 text-sm">
            Your account is signed in but does not yet have a <span className="text-sand">receptionist</span> role.
          </p>
          <button onClick={handleSignOut} className="text-[10px] uppercase tracking-[0.3em] text-paper/50 hover:text-sand">Sign out</button>
        </div>
      </DarkShell>
    );
  }

  return (
    <div className="min-h-screen bg-night text-paper" style={{ fontFamily: "var(--font-body)" }}>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-paper/5 border border-sand px-5 py-3 text-xs text-paper tracking-wider animate-fade-in">
          {toast}
        </div>
      )}

      <header className="border-b border-paper/10">
        <div className="px-6 lg:px-10 py-6 flex items-center justify-between">
          <div className="text-2xl tracking-[0.3em] text-sand" style={{ fontFamily: "var(--font-display)" }}>NOVA</div>
          <div className="flex items-center gap-6 text-xs">
            <span className="flex items-center gap-2 text-sand/80 uppercase tracking-[0.3em]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
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
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-sand mb-3">Reception</p>
            <h1 className="text-5xl lg:text-6xl" style={{ fontFamily: "var(--font-display)" }}>Reservations</h1>
          </div>
          <p className="text-sand/70 text-sm">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className="border border-paper/10 bg-paper/[0.02] p-8 lg:p-10">
          <p className="text-[10px] uppercase tracking-[0.4em] text-paper/40 mb-4">Total Bookings</p>
          <p className="text-7xl lg:text-8xl" style={{ fontFamily: "var(--font-display)" }}>{stats.total}</p>
          <p className="text-sand/70 text-xs uppercase tracking-[0.25em] mt-3">All time</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Today" big={stats.today} sub="Reservations today" />
          <StatCard label="Guests Expected" big={stats.covers} sub="Today's covers" />
          <StatCard label="Confirmed" big={stats.confirmed} sub={<>Awaiting <span className="text-sand">{stats.pending}</span> pending</>} />
          <StatCard label="Tables" big={`${stats.taken}/${stats.totalTables}`} sub={<>Taken <span className="text-sand">{stats.taken}</span> · Free <span className="text-sand">{stats.free}</span></>} />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 pt-4">
          <p className="text-sand text-xs uppercase tracking-[0.3em]">Reservations</p>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={"px-4 py-1.5 text-[11px] uppercase tracking-widest border transition-colors " +
                  (filter === f ? "border-sand text-sand bg-sand/10" : "border-paper/15 text-paper/60 hover:border-sand hover:text-sand")}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name"
            className="flex-1 bg-paper/[0.03] border border-paper/10 px-5 py-3 text-sm focus:border-sand outline-none placeholder:text-paper/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="border border-paper/15 px-4 text-paper/60 hover:text-sand">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="border border-paper/10">
          {resQ.isLoading && <div className="p-10 text-center text-paper/40 text-sm">Loading reservations…</div>}
          {!resQ.isLoading && filtered.length === 0 && (
            <div className="p-10 text-center text-paper/40 text-sm">No reservations match.</div>
          )}

          <ul className="divide-y divide-paper/5">
            {filtered.map((r) => (
              <ReservationRow
                key={r.id}
                r={r}
                tables={tables}
                occupiedTableIds={occupiedTableIds}
                partySize={parseInt(r.party_size) || 1}
                onStatus={(status) => mut.mutate({ id: r.id, status })}
                onAssign={(table_id) => assignMut.mutate({ id: r.id, table_id })}
                onReschedule={() => handleReschedule(r)}
                onDelete={() => { if (confirm("Delete this reservation?")) delMut.mutate(r.id); }}
              />
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

function ReservationRow({
  r, tables, occupiedTableIds, partySize,
  onStatus, onAssign, onReschedule, onDelete,
}: {
  r: Reservation;
  tables: RestaurantTable[];
  occupiedTableIds: Set<string>;
  partySize: number;
  onStatus: (s: "pending" | "confirmed" | "arrived" | "late" | "completed" | "cancelled") => void;
  onAssign: (table_id: string | null) => void;
  onReschedule: () => void;
  onDelete: () => void;
}) {
  const currentTable = tables.find((t) => t.id === r.table_id);
  // Available: fits capacity AND (not occupied OR is this reservation's current table)
  const available = tables.filter(
    (t) => t.capacity >= partySize && (!occupiedTableIds.has(t.id) || t.id === r.table_id),
  );

  return (
    <li className="p-5 hover:bg-paper/[0.02] transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_0.7fr_1fr_1fr_auto] gap-4 items-start">
        <div>
          <p className="text-paper">{r.guest_name}</p>
          <p className="text-paper/40 text-xs">{r.phone}</p>
          <p className="text-paper/40 text-[10px] tracking-widest mt-1">{r.ref}</p>
        </div>
        <div>
          <span className="border border-sand/40 text-sand px-2 py-0.5 text-xs">{formatDate(r.reservation_date)}</span>
          <p className="text-paper/60 text-xs mt-1.5">{formatTime(r.reservation_time)}</p>
        </div>
        <div className="flex items-center gap-1.5 text-sand text-sm">
          <Users className="h-3.5 w-3.5" /> {r.party_size}
        </div>
        <div className="text-paper/70 text-sm">
          <p>{r.occasion || "—"}</p>
          {r.special_requests && (
            <p className="text-paper/40 text-xs mt-1 line-clamp-2">{r.special_requests}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className={"inline-block border px-2 py-0.5 text-[10px] uppercase tracking-widest self-start " + statusColor(r.status)}>
            {r.status}
          </span>
          {(r.status === "confirmed" || r.status === "arrived" || r.status === "pending") && (
            <Select
              value={r.table_id ?? "none"}
              onValueChange={(v) => onAssign(v === "none" ? null : v)}
            >
              <SelectTrigger className="h-8 bg-paper/[0.03] border-paper/10 text-xs">
                <SelectValue placeholder="Assign table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No table —</SelectItem>
                {available.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    Table {t.number} · {t.capacity} seats
                  </SelectItem>
                ))}
                {currentTable && !available.includes(currentTable) && (
                  <SelectItem value={currentTable.id}>
                    Table {currentTable.number} · {currentTable.capacity} seats (current)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Actions: desktop icon row, mobile dropdown */}
        <div className="flex justify-end">
          {/* Desktop */}
          <div className="hidden md:flex flex-wrap justify-end gap-1.5">
            {r.status === "pending" && (
              <ActBtn title="Confirm" onClick={() => onStatus("confirmed")}><Check className="h-3.5 w-3.5" /></ActBtn>
            )}
            {(r.status === "confirmed" || r.status === "late") && (
              <ActBtn title="Mark arrived" onClick={() => onStatus("arrived")}><Utensils className="h-3.5 w-3.5" /></ActBtn>
            )}
            {r.status === "confirmed" && (
              <ActBtn title="Mark late" onClick={() => onStatus("late")}><Clock className="h-3.5 w-3.5" /></ActBtn>
            )}
            {r.status === "arrived" && (
              <ActBtn title="Free table" onClick={() => onStatus("completed")}><Check className="h-3.5 w-3.5" /></ActBtn>
            )}
            {(r.status === "pending" || r.status === "confirmed") && (
              <ActBtn title="Reschedule" onClick={onReschedule}><CalendarClock className="h-3.5 w-3.5" /></ActBtn>
            )}
            {(r.status === "pending" || r.status === "confirmed" || r.status === "late") && (
              <ActBtn title="Cancel" danger onClick={() => { if (confirm("Cancel this reservation?")) onStatus("cancelled"); }}><X className="h-3.5 w-3.5" /></ActBtn>
            )}
            <ActBtn title="Delete" danger onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></ActBtn>
          </div>

          {/* Mobile dropdown */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex h-9 w-9 items-center justify-center border border-paper/15 hover:border-sand hover:text-sand transition-colors">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                {r.status === "pending" && (
                  <DropdownMenuItem onClick={() => onStatus("confirmed")}>Confirm</DropdownMenuItem>
                )}
                {(r.status === "confirmed" || r.status === "late") && (
                  <DropdownMenuItem onClick={() => onStatus("arrived")}>Mark arrived</DropdownMenuItem>
                )}
                {r.status === "confirmed" && (
                  <DropdownMenuItem onClick={() => onStatus("late")}>Mark late</DropdownMenuItem>
                )}
                {r.status === "arrived" && (
                  <DropdownMenuItem onClick={() => onStatus("completed")}>Free table</DropdownMenuItem>
                )}
                {(r.status === "pending" || r.status === "confirmed") && (
                  <DropdownMenuItem onClick={onReschedule}>Reschedule</DropdownMenuItem>
                )}
                {(r.status === "pending" || r.status === "confirmed" || r.status === "late") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-burnt focus:text-burnt"
                      onClick={() => { if (confirm("Cancel this reservation?")) onStatus("cancelled"); }}
                    >
                      Cancel
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-burnt focus:text-burnt" onClick={onDelete}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </li>
  );
}

function ActBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={"inline-flex h-7 w-7 items-center justify-center border transition-colors " +
        (danger ? "border-paper/15 hover:border-burnt hover:text-burnt" : "border-paper/15 hover:border-sand hover:text-sand")}
    >
      {children}
    </button>
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
    case "arrived": return "border-emerald-400/40 text-emerald-300";
    case "completed": return "border-emerald-400/30 text-emerald-200/80";
    case "late": return "border-amber-400/50 text-amber-300";
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
