import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const ReservationInput = z.object({
  guest_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(40),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reservation_time: z.string().min(1).max(10),
  party_size: z.string().min(1).max(8),
  occasion: z.string().max(80).optional().nullable(),
  special_requests: z.string().max(1000).optional().nullable(),
});

function makeRef() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `NOV-${n}`;
}

export const createReservation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReservationInput.parse(d))
  .handler(async ({ data }) => {
    const supa = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const ref = makeRef();
    const { data: row, error } = await supa
      .from("reservations")
      .insert({ ...data, ref, status: "pending" })
      .select("ref")
      .single();
    if (error) throw new Error(error.message);
    return { ref: row.ref };
  });

export const listReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: staffCheck } = await context.supabase
      .rpc("has_role", { _user_id: context.userId, _role: "staff" });
    const { data: adminCheck } = await context.supabase
      .rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!staffCheck && !adminCheck) throw new Error("Forbidden");

    const { data, error } = await context.supabase
      .from("reservations")
      .select("*")
      .order("reservation_date", { ascending: false })
      .order("reservation_time", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return { reservations: data ?? [] };
  });

export const updateReservationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reservations")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { roles: (data ?? []).map((r) => r.role) as string[] };
  });
